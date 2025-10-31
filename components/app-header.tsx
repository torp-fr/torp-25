import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { UserProfileMenu } from '@/components/user-profile-menu'

export function AppHeader() {
  return (
    <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <div className="flex items-center gap-6">
          <Link href="/" className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">
                T
              </span>
            </div>
            <span className="text-xl font-bold">TORP</span>
          </Link>

          <Button variant="ghost" size="sm" asChild>
            <Link href="/">Accueil</Link>
          </Button>
        </div>

        <div className="flex items-center gap-4">
          <UserProfileMenu />
        </div>
      </div>
    </header>
  )
}
