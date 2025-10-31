'use client'

import { useState, useEffect } from 'react'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Bell, Save, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const DEMO_USER_ID = 'demo-user-id'

interface NotificationPreferences {
  email: {
    devisAnalysis: boolean
    recommendations: boolean
    security: boolean
    marketing: boolean
  }
  push: {
    devisAnalysis: boolean
    recommendations: boolean
    security: boolean
  }
}

export default function NotificationsSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [notifications, setNotifications] = useState<NotificationPreferences>({
    email: {
      devisAnalysis: true,
      recommendations: true,
      security: true,
      marketing: false,
    },
    push: {
      devisAnalysis: true,
      recommendations: true,
      security: true,
    },
  })

  useEffect(() => {
    fetchNotifications()
  }, [])

  const fetchNotifications = async () => {
    try {
      const response = await fetch(`/api/user/profile?userId=${DEMO_USER_ID}`)
      if (response.ok) {
        const data = await response.json()
        if (data.preferences?.notifications) {
          setNotifications(data.preferences.notifications)
        }
      }
    } catch (error) {
      console.error('[Notifications] Erreur chargement:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setSaving(true)

    try {
      const response = await fetch('/api/user/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          preferences: {
            ...notifications,
            notifications,
          },
        }),
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Paramètres de notifications enregistrés',
        })
      } else {
        throw new Error('Erreur lors de la sauvegarde')
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de sauvegarder les paramètres',
        variant: 'destructive',
      })
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <AppHeader />
        <main className="container py-8">
          <div className="flex items-center justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        </main>
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <AppHeader />
      <main className="container py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold">Notifications</h1>
          <p className="text-muted-foreground">
            Gérez vos préférences de notifications
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Notifications par email
                </CardTitle>
                <CardDescription>
                  Choisissez les emails que vous souhaitez recevoir
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analyse de devis</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez un email quand votre devis est analysé
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email.devisAnalysis}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        email: {
                          ...notifications.email,
                          devisAnalysis: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recommandations</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des recommandations personnalisées
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email.recommendations}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        email: {
                          ...notifications.email,
                          recommendations: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes de sécurité</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez des alertes importantes pour votre compte
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email.security}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        email: {
                          ...notifications.email,
                          security: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Marketing</Label>
                    <p className="text-sm text-muted-foreground">
                      Recevez nos dernières actualités et offres
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.email.marketing}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        email: {
                          ...notifications.email,
                          marketing: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Notifications push</CardTitle>
                <CardDescription>
                  Configurez les notifications dans votre navigateur
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Analyse de devis</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications push pour les analyses terminées
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.push.devisAnalysis}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        push: {
                          ...notifications.push,
                          devisAnalysis: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Recommandations</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications pour nouvelles recommandations
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.push.recommendations}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        push: {
                          ...notifications.push,
                          recommendations: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div className="space-y-0.5">
                    <Label>Alertes de sécurité</Label>
                    <p className="text-sm text-muted-foreground">
                      Notifications pour les changements de sécurité
                    </p>
                  </div>
                  <input
                    type="checkbox"
                    checked={notifications.push.security}
                    onChange={(e) =>
                      setNotifications({
                        ...notifications,
                        push: {
                          ...notifications.push,
                          security: e.target.checked,
                        },
                      })
                    }
                    className="h-4 w-4"
                  />
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} onClick={handleSubmit}>
                {saving ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Enregistrement...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Enregistrer
                  </>
                )}
              </Button>
            </div>
          </div>
        </form>
      </main>
    </div>
  )
}

