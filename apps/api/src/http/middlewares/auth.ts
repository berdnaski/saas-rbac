import { FastifyInstance } from 'fastify'
import { fastifyPlugin } from 'fastify-plugin'

import { prisma } from '@/lib/prisma'

import { UnauthorizedError } from '../routes/_errors/unauthorized-error'

export const auth = fastifyPlugin(async (app: FastifyInstance) => {
  app.addHook('preHandler', async (request) => {
    request.getCurrentUserId = async () => {
      try {
        const { sub } = await request.jwtVerify<{ sub: string }>()

        return sub
      } catch {
        throw new UnauthorizedError('Invalid auth token')
      }
    }

    request.getUserMembership = async (slug: string) => {
      const userId = await request.getCurrentUserId()

      const membershipFound = await prisma.membership.findFirst({
        where: { userId, organization: { slug } },
        include: { organization: true },
      })

      if (!membershipFound) {
        throw new UnauthorizedError(`You're not a member of this organization`)
      }

      const { organization, ...membership } = membershipFound

      return {
        organization,
        membership,
      }
    }
  })
})
