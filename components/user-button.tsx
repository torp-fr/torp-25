'use client'

import { useUser } from '@auth0/nextjs-auth0/client'
import { Button } from '@/components/ui/button'
import { LogIn, LogOut, User } from 'lucide-react'

export function UserButton() {
  const { user, isLoading } = useUser()

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Chargement...
      </Button>
    )
  }

  if (!user) {
    return (
      <Button size="sm" asChild>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/login">
          <LogIn className="mr-2 h-4 w-4" />
          Connexion
        </a>
      </Button>
    )
  }

  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 text-sm md:flex">
        <User className="h-4 w-4" />
        <span>{user.name || user.email}</span>
      </div>
      <Button variant="outline" size="sm" asChild>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/api/auth/logout">
          <LogOut className="mr-2 h-4 w-4" />
          Déconnexion
        </a>
      </Button>
    </div>
  )
}
