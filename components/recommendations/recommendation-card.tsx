'use client'

/**
 * Composant pour afficher une recommandation avec possibilité d'ajouter des documents
 * et de donner du feedback
 */

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Paperclip, MessageSquare, Star, CheckCircle2 } from 'lucide-react'

interface Recommendation {
  id?: string
  category: string
  priority: 'high' | 'medium' | 'low'
  message?: string
  suggestion?: string
  actionable?: boolean
}

interface RecommendationCardProps {
  recommendation: Recommendation
  devisId: string
  userId: string
  index: number
}

export function RecommendationCard({ recommendation, devisId, userId, index }: RecommendationCardProps) {
  const [showUpload, setShowUpload] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [rating, setRating] = useState<number | null>(null)
  const [feedbackSent, setFeedbackSent] = useState(false)

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploading(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('devisId', devisId)
      formData.append('userId', userId)
      formData.append('recommendationId', recommendation.id || `rec-${index}`)
      formData.append('recommendationType', recommendation.category)

      const response = await fetch('/api/documents/complementary', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        setShowUpload(false)
        alert('Document ajouté avec succès !')
      }
    } catch (error) {
      console.error('Erreur upload:', error)
      alert('Erreur lors de l\'ajout du document')
    } finally {
      setUploading(false)
    }
  }

  const handleFeedback = async (ratingValue: number, useful: boolean) => {
    try {
      const response = await fetch('/api/recommendations/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId,
          userId,
          recommendationId: recommendation.id || `rec-${index}`,
          rating: ratingValue,
          useful,
        }),
      })

      if (response.ok) {
        setRating(ratingValue)
        setFeedbackSent(true)
      }
    } catch (error) {
      console.error('Erreur feedback:', error)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'bg-red-100 text-red-600 border-red-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-600 border-yellow-200'
      default:
        return 'bg-blue-100 text-blue-600 border-blue-200'
    }
  }

  const message = recommendation.message || recommendation.suggestion || ''

  return (
    <Card className={`border-2 ${getPriorityColor(recommendation.priority)}`}>
      <div className="p-4">
        <div className="mb-2 flex items-center justify-between">
          <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${getPriorityColor(recommendation.priority)}`}>
            {recommendation.priority}
          </span>
          <span className="text-xs capitalize text-muted-foreground">
            {recommendation.category}
          </span>
        </div>

        <p className="mb-3 font-medium">{message}</p>

        {recommendation.actionable && (
          <div className="mt-4 space-y-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowUpload(!showUpload)}
              className="w-full"
            >
              <Paperclip className="mr-2 h-4 w-4" />
              Ajouter un document
            </Button>

            {showUpload && (
              <div className="rounded-md border bg-gray-50 p-3">
                <input
                  type="file"
                  accept=".pdf,.jpg,.jpeg,.png"
                  onChange={handleFileUpload}
                  disabled={uploading}
                  className="mb-2 w-full text-sm"
                />
                {uploading && <p className="text-xs text-gray-500">Upload en cours...</p>}
              </div>
            )}
          </div>
        )}

        {/* Feedback */}
        <div className="mt-3 flex items-center justify-between border-t pt-3">
          <div className="flex items-center gap-2">
            <span className="text-xs text-gray-600">Utile ?</span>
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => handleFeedback(star, true)}
                disabled={feedbackSent}
                className={`${rating && rating >= star ? 'text-yellow-500' : 'text-gray-300'} hover:text-yellow-500`}
              >
                <Star className="h-4 w-4 fill-current" />
              </button>
            ))}
          </div>
          {feedbackSent && (
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          )}
        </div>
      </div>
    </Card>
  )
}

