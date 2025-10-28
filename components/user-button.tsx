'use client'

import { useAuth } from '@/hooks/use-auth'
import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'
import Link from 'next/link'

export function UserButton() {
  const { user, isLoading } = useAuth(false)

  if (isLoading) {
    return (
      <Button variant="ghost" size="sm" disabled>
        Chargement...
      </Button>
    )
  }

  // Mode démo - toujours connecté
  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 text-sm md:flex">
        <User className="h-4 w-4" />
        <span>{user.name || user.email}</span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard">
          Tableau de bord
        </Link>
      </Button>
    </div>
  )
}
