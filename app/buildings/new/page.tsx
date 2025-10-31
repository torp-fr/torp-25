'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Home,
  MapPin,
  Loader2,
  AlertCircle,
  CheckCircle2,
} from 'lucide-react'
import { AppHeader } from '@/components/app-header'

export const dynamic = 'force-dynamic'

const DEMO_USER_ID = 'demo-user-id'

interface AddressSuggestion {
  formatted: string
  city: string
  postalCode: string
  coordinates?: { lat: number; lng: number }
}

export default function NewBuildingPage() {
  const router = useRouter()
  const [name, setName] = useState('')
  const [address, setAddress] = useState('')
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([])
  const [selectedAddress, setSelectedAddress] = useState<AddressSuggestion | null>(null)
  const [loading, setLoading] = useState(false)
  const [searching, setSearching] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const searchAddress = async (query: string) => {
    if (query.length < 3) {
      setSuggestions([])
      return
    }

    try {
      setSearching(true)
      const response = await fetch(`/api/addresses/search?q=${encodeURIComponent(query)}&limit=5`)

      if (!response.ok) {
        throw new Error('Erreur lors de la recherche')
      }

      const data = await response.json()
      setSuggestions(data.data || [])
    } catch (err) {
      console.error('Erreur recherche adresse:', err)
      setSuggestions([])
    } finally {
      setSearching(false)
    }
  }

  const handleAddressChange = (value: string) => {
    setAddress(value)
    setSelectedAddress(null)
    searchAddress(value)
  }

  const handleSelectAddress = (suggestion: AddressSuggestion) => {
    setSelectedAddress(suggestion)
    setAddress(suggestion.formatted)
    setSuggestions([])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!selectedAddress) {
      setError('Veuillez sélectionner une adresse dans la liste')
      return
    }

    try {
      setLoading(true)
      setError(null)

      const response = await fetch('/api/building-profiles', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          userId: DEMO_USER_ID,
          name: name || undefined,
          address: selectedAddress.formatted,
          coordinates: selectedAddress.coordinates,
        }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Erreur lors de la création')
      }

      const data = await response.json()
      
      // Rediriger vers la page de détail du profil créé
      router.push(`/buildings/${data.data.id}`)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Erreur lors de la création')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <AppHeader />

      <main className="container mx-auto px-4 py-8">
        <div className="mx-auto max-w-2xl">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Nouveau Logement</h1>
            <p className="text-muted-foreground">
              Créez une carte d'identité pour votre logement
            </p>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Home className="h-5 w-5" />
                Informations du Logement
              </CardTitle>
              <CardDescription>
                Renseignez l'adresse pour créer automatiquement la carte d'identité enrichie
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Nom personnalisé */}
                <div>
                  <Label htmlFor="name">Nom du logement (optionnel)</Label>
                  <Input
                    id="name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ex: Maison principale, Résidence secondaire..."
                    className="mt-1"
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    Vous pourrez modifier ce nom plus tard
                  </p>
                </div>

                {/* Recherche d'adresse */}
                <div>
                  <Label htmlFor="address">Adresse *</Label>
                  <div className="relative mt-1">
                    <MapPin className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                    <Input
                      id="address"
                      value={address}
                      onChange={(e) => handleAddressChange(e.target.value)}
                      placeholder="Recherchez une adresse..."
                      className="pl-10"
                      required
                    />
                    {searching && (
                      <Loader2 className="absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>

                  {/* Suggestions */}
                  {suggestions.length > 0 && !selectedAddress && (
                    <div className="mt-2 rounded-lg border bg-white shadow-lg">
                      {suggestions.map((suggestion, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => handleSelectAddress(suggestion)}
                          className="w-full px-4 py-3 text-left hover:bg-gray-50 first:rounded-t-lg last:rounded-b-lg"
                        >
                          <div className="flex items-center gap-2">
                            <MapPin className="h-4 w-4 text-primary" />
                            <div>
                              <div className="font-medium">{suggestion.formatted}</div>
                              <div className="text-xs text-muted-foreground">
                                {suggestion.postalCode} {suggestion.city}
                              </div>
                            </div>
                          </div>
                        </button>
                      ))}
                    </div>
                  )}

                  {/* Adresse sélectionnée */}
                  {selectedAddress && (
                    <div className="mt-2 flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-3">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <div className="flex-1">
                        <div className="font-medium text-green-900">
                          {selectedAddress.formatted}
                        </div>
                        <div className="text-xs text-green-700">
                          {selectedAddress.postalCode} {selectedAddress.city}
                        </div>
                      </div>
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setSelectedAddress(null)
                          setAddress('')
                        }}
                      >
                        Modifier
                      </Button>
                    </div>
                  )}

                  <p className="mt-1 text-xs text-muted-foreground">
                    Les données seront enrichies automatiquement après création (cadastre, PLU, DPE, etc.)
                  </p>
                </div>

                {/* Error Message */}
                {error && (
                  <div className="rounded-lg border border-red-200 bg-red-50 p-3">
                    <div className="flex items-center gap-2 text-red-600">
                      <AlertCircle className="h-4 w-4" />
                      <span className="text-sm font-medium">{error}</span>
                    </div>
                  </div>
                )}

                {/* Submit Button */}
                <div className="flex gap-3">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => router.back()}
                    className="flex-1"
                  >
                    Annuler
                  </Button>
                  <Button
                    type="submit"
                    disabled={loading || !selectedAddress}
                    className="flex-1"
                  >
                    {loading ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Création...
                      </>
                    ) : (
                      <>
                        <Home className="mr-2 h-4 w-4" />
                        Créer le Profil
                      </>
                    )}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>

          {/* Info Card */}
          <Card className="mt-6 border-blue-200 bg-blue-50">
            <CardContent className="pt-6">
              <div className="flex items-start gap-3">
                <AlertCircle className="h-5 w-5 text-blue-600" />
                <div className="flex-1">
                  <h3 className="font-semibold text-blue-900">Enrichissement automatique</h3>
                  <p className="mt-1 text-sm text-blue-700">
                    Après création, TORP récupère automatiquement :
                    <br />
                    • Données cadastrales (parcelle, section)
                    <br />
                    • Plan Local d&apos;Urbanisme (PLU)
                    <br />
                    • Diagnostic de Performance Energétique (DPE)
                    <br />
                    • Référentiel National des Bâtiments (RNB)
                    <br />
                    • Données d&apos;urbanisme
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
    </div>
  )
}

