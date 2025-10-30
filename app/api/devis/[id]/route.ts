import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { getSession } from '@auth0/nextjs-auth0'
import { ensureUserExistsFromAuth0 } from '@/lib/onboarding'

export async function GET(
  _request: Request,
  context: any
) {
  try {
    const session = await getSession()
    if (!session?.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }
    const userId = session.user.sub
    await ensureUserExistsFromAuth0(session.user as any)

    const devis = await prisma.devis.findUnique({
      where: { id: context?.params?.id },
      include: {
        document: true,
        torpScores: true,
      },
    })

    if (!devis || devis.userId !== userId) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    return NextResponse.json({ success: true, data: devis })
  } catch (error) {
    console.error('Devis fetch error:', error)
    return NextResponse.json(
      { error: 'Failed to fetch devis' },
      { status: 500 }
    )
  }
}


