import { NextResponse } from 'next/server'
import { handleAuth } from '@auth0/nextjs-auth0'

export const dynamic = 'force-dynamic'

export async function GET() {
  try {
    const auth = handleAuth()

    return NextResponse.json({
      type: typeof auth,
      keys: Object.keys(auth),
      hasGET: 'GET' in auth,
      hasPOST: 'POST' in auth,
      GETtype: typeof auth.GET,
      POSTtype: typeof auth.POST,
    })
  } catch (error) {
    return NextResponse.json({
      error: error instanceof Error ? error.message : 'Unknown error',
    }, { status: 500 })
  }
}
