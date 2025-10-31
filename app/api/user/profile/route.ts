import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

/**
 * GET /api/user/profile
 * Récupère le profil utilisateur
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const userId = searchParams.get('userId') || DEMO_USER_ID

    // Récupérer l'utilisateur
    const user = await prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
      },
    })

    if (!user) {
      // Créer l'utilisateur demo s'il n'existe pas
      const newUser = await prisma.user.create({
        data: {
          id: userId,
          email: 'demo@torp.fr',
          role: 'CONSUMER',
          profile: {
            create: {},
          },
        },
        include: {
          profile: true,
        },
      })

      return NextResponse.json({
        success: true,
        email: newUser.email,
        firstName: null,
        lastName: null,
        displayName: null,
        phone: null,
        address: null,
        preferences: null,
      })
    }

    const profile = user.profile

    return NextResponse.json({
      success: true,
      email: user.email,
      firstName: profile?.firstName || null,
      lastName: profile?.lastName || null,
      displayName:
        profile?.firstName && profile?.lastName
          ? `${profile.firstName} ${profile.lastName}`
          : profile?.firstName || null,
      phone: profile?.phone || null,
      address: profile?.address || null,
      preferences: profile?.preferences || null,
    })
  } catch (error) {
    console.error('[API User Profile GET] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la récupération du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * PATCH /api/user/profile
 * Met à jour le profil utilisateur
 */
export async function PATCH(request: NextRequest) {
  try {
    const body = await request.json()
    const {
      userId = DEMO_USER_ID,
      firstName,
      lastName,
      displayName,
      phone,
      address,
      preferences,
    } = body

    // S'assurer que l'utilisateur existe
    let user = await prisma.user.findUnique({
      where: { id: userId },
      include: { profile: true },
    })

    if (!user) {
      user = await prisma.user.create({
        data: {
          id: userId,
          email: 'demo@torp.fr',
          role: 'CONSUMER',
          profile: {
            create: {},
          },
        },
        include: { profile: true },
      })
    }

    // Traiter displayName : extraire firstName et lastName si possible
    let finalFirstName = firstName
    let finalLastName = lastName

    if (displayName && !firstName && !lastName) {
      const parts = displayName.trim().split(' ')
      finalFirstName = parts[0] || null
      finalLastName = parts.slice(1).join(' ') || null
    }

    // Mettre à jour ou créer le profil
    const profile = await prisma.userProfile.upsert({
      where: { userId },
      update: {
        ...(finalFirstName !== undefined && { firstName: finalFirstName }),
        ...(finalLastName !== undefined && { lastName: finalLastName }),
        ...(phone !== undefined && { phone }),
        ...(address !== undefined && { address: address as any }),
        ...(preferences !== undefined && { preferences: preferences as any }),
      },
      create: {
        userId,
        firstName: finalFirstName,
        lastName: finalLastName,
        phone,
        address: address ? (address as any) : undefined,
        preferences: preferences ? (preferences as any) : undefined,
      },
    })

    return NextResponse.json({
      success: true,
      data: {
        email: user.email,
        firstName: profile.firstName,
        lastName: profile.lastName,
        displayName:
          profile.firstName && profile.lastName
            ? `${profile.firstName} ${profile.lastName}`
            : profile.firstName || displayName || null,
        phone: profile.phone,
        address: profile.address,
        preferences: profile.preferences,
      },
    })
  } catch (error) {
    console.error('[API User Profile PATCH] Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de la mise à jour du profil',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

