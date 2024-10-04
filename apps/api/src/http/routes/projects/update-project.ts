import { auth } from '@/http/middlewares/auth';
import { prisma } from '@/lib/prisma';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { getUserPermissions } from '@/http/utils/get-user-permissions';
import { UnauthorizedError } from '../_errors/unauthorized-error';
import { projectSchema } from '@saas/auth';
import { BadRequestError } from '../_errors/bad-request-error';

export async function updateProject(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.put(
			'/organizations/:slug/projects/:projectId',
			{
				schema: {
					tags: ['projects'],
					summary: 'Update a project',
					security: [{ bearerAuth: [] }],
                    params: z.object({
                        slug: z.string(),
                        projectId: z.string().uuid(),
                    }),
                    body: z.object({
                        name: z.string(),
                        description: z.string(),
                    }),
					response: {
						204: z.null(),
					},
				},
			},
			async (request, reply) => {
                const { slug, projectId } = request.params;
				const userId = await request.getCurrentUserId();
                const { organization, membership } = await request.getUserMembership(slug);

                const project = await prisma.project.findUnique({
                    where: {
                        id: projectId,
                        organizationId: organization.id,
                    }
                })

                if (!project) {
                    throw new BadRequestError('Project not found');
                }

                const { cannot } = getUserPermissions(userId, membership.role);
                const authProject = projectSchema.parse(project);

                if (cannot('update', authProject)) {
                    throw new UnauthorizedError(
                        `You're not allowed to update this project.`
                    )
                }

                const { name, description } = request.body;

                await prisma.project.update({
                    where: {
                        id: projectId,
                    },
                    data: {
                        name,
                        description,
                    }
                });
                
                return reply.status(201).send();
			}
		)
}
