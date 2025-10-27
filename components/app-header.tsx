import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Home, Upload } from 'lucide-react'
import { UserButton } from '@/components/user-button'

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

          <nav className="hidden gap-6 md:flex">
            <Link
              href="/dashboard"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <Home className="h-4 w-4" />
              Dashboard
            </Link>
            <Link
              href="/upload"
              className="flex items-center gap-2 text-sm font-medium transition-colors hover:text-primary"
            >
              <Upload className="h-4 w-4" />
              Upload
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild className="hidden sm:inline-flex">
            <Link href="/">Accueil</Link>
          </Button>
          <UserButton />
        </div>
      </div>
    </header>
  )
}
