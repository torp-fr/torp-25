'use client'

import { Button } from '@/components/ui/button'
import { User } from 'lucide-react'
import Link from 'next/link'

export function UserButton() {
  // Auth0 désactivé temporairement - accès libre
  return (
    <div className="flex items-center gap-3">
      <div className="hidden items-center gap-2 text-sm md:flex">
        <User className="h-4 w-4" />
        <span>Utilisateur</span>
      </div>
      <Button variant="outline" size="sm" asChild>
        <Link href="/dashboard">
          Tableau de bord
        </Link>
      </Button>
    </div>
  )
}
