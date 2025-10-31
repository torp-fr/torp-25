import { handleLogin } from '@auth0/nextjs-auth0'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function GET(request: Request) {
  const origin = new URL(request.url).origin
  return handleLogin(request, {
    returnTo: '/dashboard',
    // @ts-ignore - baseURL supported at runtime
    baseURL: origin,
  })
}


