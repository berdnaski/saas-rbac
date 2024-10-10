import { FastifyInstance } from 'fastify'
import { ZodTypeProvider } from 'fastify-type-provider-zod'
import { z } from 'zod'

import { auth } from '@/http/middlewares/auth'
import { prisma } from '@/lib/prisma'
import { getUserPermissions } from '@/utils/get-user-permissions'

import { UnauthorizedError } from '../_errors/unauthorized-error'

export async function removeMembership(app: FastifyInstance) {
  app
    .withTypeProvider<ZodTypeProvider>()
    .register(auth)
    .delete(
      '/organizations/:slug/memberships/:membershipId',
      {
        schema: {
          tags: ['memberships'],
          summary: 'Remove a membership from the organization',
          security: [{ bearerAuth: [] }],
          params: z.object({
            slug: z.string(),
            membershipId: z.string().uuid(),
          }),
          response: {
            204: z.null(),
          },
        },
      },
      async (request, reply) => {
        const { slug, membershipId } = request.params

        const userId = await request.getCurrentUserId()
        const { organization, membership } =
          await request.getUserMembership(slug)

        const { cannot } = getUserPermissions(userId, membership.role)

        if (cannot('delete', 'User')) {
          throw new UnauthorizedError(
            `You're not allowed to remove this membership from the organization`,
          )
        }

        await prisma.membership.delete({
          where: {
            id: membershipId,
            organizationId: organization.id,
          },
        })

        return reply.status(204).send()
      },
    )
}
