import { auth } from '@/http/middlewares/auth';
import { prisma } from '@/lib/prisma';
import type { FastifyInstance } from 'fastify';
import type { ZodTypeProvider } from 'fastify-type-provider-zod';
import z from 'zod';
import { getUserPermissions } from '@/http/utils/get-user-permissions';
import { UnauthorizedError } from '../_errors/unauthorized-error';
import { roleSchema } from '@saas/auth';
import { BadRequestError } from '../_errors/bad-request-error';

export async function createInvite(app: FastifyInstance) {
	app
		.withTypeProvider<ZodTypeProvider>()
		.register(auth)
		.post(
			'/organizations/:slug/invites',
			{
				schema: {
					tags: ['invites'],
					summary: 'Create a new invite',
					security: [{ bearerAuth: [] }],
					body: z.object({
						email: z.string().email(),
						role: roleSchema,
					}),
                    params: z.object({
                        slug: z.string(),
                    }),
					response: {
						201: z.object({
							inviteId: z.string().uuid(),
						}),
					},
				},
			},
			async (request, reply) => {
                const { slug } = request.params;
				const userId = await request.getCurrentUserId();
                const { organization, membership } = await request.getUserMembership(slug);

                const { cannot } = getUserPermissions(userId, membership.role);

                if (cannot('create', 'Invite')) {
                    throw new UnauthorizedError(
                        `You're not allowed to create new invites.`
                    )
                }

                const { email, role } = request.body;

                const [, domain] = email

                if (organization.shouldAttachUsersByDomain && organization.domain === domain) {
                    throw new BadRequestError(
                        `Users with "${domain}" domain will join your organization automatically on login.`,
                    )
                }

                const inviteWithSameEmail = await prisma.invite.findUnique({
                    where: {
                        email_organizationId: {
                            email,
                            organizationId: organization.id
                        }
                    }
                })

                if (inviteWithSameEmail) {
                    throw new BadRequestError('Another invite with same e-mail already exists.')
                }

                const memberWithSameEmail = await prisma.member.findFirst({
                    where: {
                        organizationId: organization.id,
                        user: {
                            email,
                        }
                    }
                })

                if (memberWithSameEmail) {
                    throw new BadRequestError('A member with this e-mail already belongs to your organization.')
                }

                const invite = await prisma.invite.create({
                    data: {
                        organizationId: organization.id,
                        email,
                        role,
                        authorId: userId,
                    }
                })

                return reply.status(201).send({
                    inviteId: invite.id,
                })
			},
		)
}
