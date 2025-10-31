import { NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export async function GET(
  _request: Request,
  context: any
) {
  try {
    // Auth0 désactivé - accès libre au devis
    const devis = await prisma.devis.findUnique({
      where: { id: context?.params?.id },
      include: {
        document: true,
        torpScores: true,
      },
    })

    if (!devis) {
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


