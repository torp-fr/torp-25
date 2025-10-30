import { prisma } from '@/lib/db'

interface Auth0SessionUser {
  sub: string
  email?: string | null
  name?: string | null
}

export async function ensureUserExistsFromAuth0(user: Auth0SessionUser) {
  if (!user?.sub) return

  const existing = await prisma.user.findUnique({ where: { id: user.sub } })
  if (existing) return existing

  // Create minimal user using Auth0 subject as primary key
  return prisma.user.create({
    data: {
      id: user.sub,
      email: user.email || `${user.sub}@placeholder.torp` ,
      role: 'CONSUMER',
    },
  })
}


