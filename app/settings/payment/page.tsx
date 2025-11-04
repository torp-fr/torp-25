'use client'

import { clientLoggers } from '@/lib/client-logger'
import { useState, useEffect } from 'react'
import { AppHeader } from '@/components/app-header'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { CreditCard, Plus, Loader2 } from 'lucide-react'
import { useToast } from '@/hooks/use-toast'

const log = clientLoggers.page
const DEMO_USER_ID = 'demo-user-id'

interface PaymentMethod {
  id: string
  type: 'card' | 'bank'
  last4?: string
  brand?: string
  expiryMonth?: number
  expiryYear?: number
  isDefault: boolean
}

export default function PaymentSettingsPage() {
  const { toast } = useToast()
  const [loading, setLoading] = useState(true)
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([])

  useEffect(() => {
    fetchPaymentMethods()
  }, [])

  const fetchPaymentMethods = async () => {
    try {
      const response = await fetch(`/api/user/payment-methods?userId=${DEMO_USER_ID}`)
      if (response.ok) {
        const data = await response.json()
        setPaymentMethods(data.data || [])
      }
    } catch (error) {
      log.error({ err: error }, 'Erreur chargement paiement')
    } finally {
      setLoading(false)
    }
  }

  const handleAddPaymentMethod = () => {
    toast({
      title: 'Fonctionnalité à venir',
      description: 'L\'ajout de méthode de paiement sera disponible prochainement',
    })
  }

  const handleSetDefault = async (methodId: string) => {
    try {
      const response = await fetch('/api/user/payment-methods', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          methodId,
          isDefault: true,
        }),
      })

      if (response.ok) {
        toast({
          title: 'Succès',
          description: 'Méthode de paiement par défaut mise à jour',
        })
        fetchPaymentMethods()
      }
    } catch (error) {
      toast({
        title: 'Erreur',
        description: 'Impossible de mettre à jour la méthode de paiement',
        variant: 'destructive',
      })
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
          <h1 className="text-3xl font-bold">Paiement</h1>
          <p className="text-muted-foreground">
            Gérez vos méthodes de paiement
          </p>
        </div>

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  <CreditCard className="h-5 w-5" />
                  Méthodes de paiement
                </CardTitle>
                <CardDescription>
                  Ajoutez et gérez vos cartes bancaires et autres méthodes de paiement
                </CardDescription>
              </div>
              <Button onClick={handleAddPaymentMethod}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            {paymentMethods.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                <CreditCard className="mx-auto mb-4 h-12 w-12 opacity-50" />
                <p className="mb-2">Aucune méthode de paiement</p>
                <p className="text-sm">
                  Ajoutez une méthode de paiement pour faciliter vos transactions
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {paymentMethods.map((method) => (
                  <div
                    key={method.id}
                    className="flex items-center justify-between rounded-lg border p-4"
                  >
                    <div className="flex items-center gap-4">
                      <CreditCard className="h-8 w-8 text-muted-foreground" />
                      <div>
                        <div className="font-medium">
                          {method.type === 'card'
                            ? `${method.brand || 'Carte'} •••• ${method.last4}`
                            : 'Virement bancaire'}
                        </div>
                        {method.type === 'card' && method.expiryMonth && method.expiryYear && (
                          <div className="text-sm text-muted-foreground">
                            Expire le {method.expiryMonth}/{method.expiryYear}
                          </div>
                        )}
                        {method.isDefault && (
                          <span className="text-xs text-primary">Par défaut</span>
                        )}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      {!method.isDefault && (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleSetDefault(method.id)}
                        >
                          Définir par défaut
                        </Button>
                      )}
                      <Button variant="ghost" size="sm">
                        Supprimer
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </main>
    </div>
  )
}

