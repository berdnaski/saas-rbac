import { roleSchema } from '@nivo/auth'
import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'

export async function fetchOrganizations(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .get(
      '/organizations',
      {
        schema: {
          tags: ['organizations'],
          summary: 'Fetch organizations where user is a member',
          security: [{ bearerAuth: [] }],
          response: {
            200: z.object({
              organizations: z.array(
                z.object({
                  id: z.string().uuid(),
                  name: z.string(),
                  slug: z.string(),
                  avatarUrl: z.string().url().nullable(),
                  role: roleSchema,
                }),
              ),
            }),
          },
        },
      },
      async (request) => {
        const userId = await request.getCurrentUserId()

        const organizations = await prisma.organization.findMany({
          where: { memberships: { some: { userId } } },
          select: {
            id: true,
            name: true,
            slug: true,
            avatarUrl: true,
            memberships: {
              select: { role: true },
              where: { userId },
            },
          },
        })

        const organizationsWithUserRole = organizations.map(
          ({ memberships, ...org }) => {
            return {
              ...org,
              role: memberships[0].role,
            }
          },
        )

        return {
          organizations: organizationsWithUserRole,
        }
      },
    )
}
