'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { clientLoggers } from '@/lib/client-logger'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import {
  User,
  Settings,
  KeyRound,
  Bell,
  CreditCard,
  Home,
  Upload,
  Building2,
  LogOut,
  Edit2,
  Check,
  X,
} from 'lucide-react'

const log = clientLoggers.component

const DEMO_USER_ID = 'demo-user-id'

interface UserProfileData {
  firstName?: string | null
  lastName?: string | null
  email: string
  displayName?: string
}

export function UserProfileMenu() {
  const router = useRouter()
  const [profile, setProfile] = useState<UserProfileData>({
    email: 'demo@torp.fr',
    displayName: 'Utilisateur',
  })
  const [_loading, setLoading] = useState(true)
  const [isEditing, setIsEditing] = useState(false)
  const [editValue, setEditValue] = useState('')

  useEffect(() => {
    fetchProfile()
  }, [])

  const fetchProfile = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${DEMO_USER_ID}`)
      if (response.ok) {
        const data = await response.json()
        setProfile({
          ...data,
          displayName:
            data.displayName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            data.email.split('@')[0] ||
            'Utilisateur',
        })
        setEditValue(
          data.displayName ||
            `${data.firstName || ''} ${data.lastName || ''}`.trim() ||
            data.email.split('@')[0] ||
            'Utilisateur'
        )
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur chargement profil')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveName = async () => {
    try {
      const response = await fetch(`/api/user/profile`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          displayName: editValue,
        }),
      })

      if (response.ok) {
        setProfile((prev) => ({ ...prev, displayName: editValue }))
        setIsEditing(false)
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur sauvegarde nom')
    }
  }

  const handleCancelEdit = () => {
    setEditValue(profile.displayName || 'Utilisateur')
    setIsEditing(false)
  }

  const displayText = profile.displayName || profile.email.split('@')[0] || 'Utilisateur'

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="flex items-center gap-2 px-3">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-primary-foreground">
            <User className="h-4 w-4" />
          </div>
          <span className="hidden text-sm font-medium md:block">
            {displayText}
          </span>
          <Button
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              setIsEditing(true)
            }}
            title="Modifier le nom"
          >
            <Edit2 className="h-3 w-3" />
          </Button>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        {isEditing ? (
          <div className="p-2" onClick={(e) => e.stopPropagation()}>
            <Input
              value={editValue}
              onChange={(e) => setEditValue(e.target.value)}
              className="mb-2"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault()
                  handleSaveName()
                } else if (e.key === 'Escape') {
                  handleCancelEdit()
                }
              }}
              autoFocus
            />
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleSaveName}
              >
                <Check className="mr-1 h-3 w-3" />
                Valider
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="flex-1"
                onClick={handleCancelEdit}
              >
                <X className="mr-1 h-3 w-3" />
                Annuler
              </Button>
            </div>
          </div>
        ) : (
          <>
            <DropdownMenuLabel>
              <div className="flex flex-col space-y-1">
                <p className="text-sm font-medium leading-none">{displayText}</p>
                <p className="text-xs leading-none text-muted-foreground">{profile.email}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
          </>
        )}

        {/* Navigation principale */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Navigation
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/dashboard" className="flex items-center gap-2">
            <Home className="h-4 w-4" />
            <span>Tableau de bord</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/buildings" className="flex items-center gap-2">
            <Building2 className="h-4 w-4" />
            <span>Mes Logements</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            <span>Upload</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        {/* Paramètres */}
        <DropdownMenuLabel className="text-xs text-muted-foreground">
          Paramètres
        </DropdownMenuLabel>
        <DropdownMenuItem asChild>
          <Link href="/settings/profile" className="flex items-center gap-2">
            <User className="h-4 w-4" />
            <span>Mon Profil</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/account" className="flex items-center gap-2">
            <KeyRound className="h-4 w-4" />
            <span>Sécurité</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/preferences" className="flex items-center gap-2">
            <Settings className="h-4 w-4" />
            <span>Préférences</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            <span>Notifications</span>
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild>
          <Link href="/settings/payment" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            <span>Paiement</span>
          </Link>
        </DropdownMenuItem>

        <DropdownMenuSeparator />
        <DropdownMenuItem
          onClick={() => {
            // TODO: Implémenter déconnexion quand Auth0 sera réactivé
            router.push('/')
          }}
        >
          <LogOut className="mr-2 h-4 w-4" />
          <span>Déconnexion</span>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

