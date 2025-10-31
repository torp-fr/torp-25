'use client'

/**
 * Composant de chat conversationnel pour enrichir l'analyse d'un devis
 * Permet de discuter avec l'assistant pour clarifier des points, ajouter des documents, etc.
 */

import { useState, useEffect, useRef } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Card } from '@/components/ui/card'
import { Send, Paperclip, Loader2 } from 'lucide-react'

interface Message {
  id: string
  role: 'user' | 'assistant' | 'system'
  content: string
  timestamp: Date
  recommendationId?: string
  documentId?: string
}

interface DevisChatProps {
  devisId: string
  userId: string
  recommendations?: any[]
}

export function DevisChat({ devisId, userId, recommendations = [] }: DevisChatProps) {
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // Charger les messages existants
  useEffect(() => {
    loadMessages()
  }, [devisId])

  // Scroll automatique vers le bas
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  const loadMessages = async () => {
    try {
      const response = await fetch(`/api/chat/messages?devisId=${devisId}`)
      if (response.ok) {
        const data = await response.json()
        setMessages(data.messages || [])
      }
    } catch (error) {
      console.error('Erreur chargement messages:', error)
    }
  }

  const sendMessage = async () => {
    if (!input.trim() || loading) return

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: input,
      timestamp: new Date(),
    }

    setMessages((prev) => [...prev, userMessage])
    setInput('')
    setLoading(true)

    try {
      const response = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          devisId,
          userId,
          content: input,
          role: 'user',
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Ajouter la réponse de l'assistant
        const assistantMessage: Message = {
          id: data.messageId,
          role: 'assistant',
          content: data.response,
          timestamp: new Date(),
        }
        setMessages((prev) => [...prev, assistantMessage])
      }
    } catch (error) {
      console.error('Erreur envoi message:', error)
      const errorMessage: Message = {
        id: Date.now().toString(),
        role: 'system',
        content: 'Erreur lors de l\'envoi du message. Veuillez réessayer.',
        timestamp: new Date(),
      }
      setMessages((prev) => [...prev, errorMessage])
    } finally {
      setLoading(false)
    }
  }

  const handleFileUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    setUploadingFile(true)

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('devisId', devisId)
      formData.append('userId', userId)

      const response = await fetch('/api/documents/complementary', {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const data = await response.json()
        
        // Ajouter un message système
        const systemMessage: Message = {
          id: Date.now().toString(),
          role: 'system',
          content: `Document "${file.name}" ajouté avec succès. Il sera analysé pour enrichir l'évaluation du devis.`,
          timestamp: new Date(),
          documentId: data.documentId,
        }
        setMessages((prev) => [...prev, systemMessage])
      }
    } catch (error) {
      console.error('Erreur upload document:', error)
    } finally {
      setUploadingFile(false)
    }
  }

  const handleRecommendationClick = (recommendation: any) => {
    const message = `Pouvez-vous m'en dire plus sur cette recommandation : "${recommendation.message}" ?`
    setInput(message)
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header avec recommandations rapides */}
      {recommendations.length > 0 && (
        <div className="p-4 border-b bg-gray-50">
          <p className="text-sm font-semibold mb-2">Recommandations importantes :</p>
          <div className="flex flex-wrap gap-2">
            {recommendations.slice(0, 3).map((rec, idx) => (
              <Button
                key={idx}
                variant="outline"
                size="sm"
                onClick={() => handleRecommendationClick(rec)}
                className="text-xs"
              >
                {rec.message.substring(0, 50)}...
              </Button>
            ))}
          </div>
        </div>
      )}

      {/* Messages */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.length === 0 ? (
          <div className="text-center text-gray-500 mt-8">
            <p>Commencez la conversation pour obtenir de l'aide sur votre devis</p>
            <p className="text-sm mt-2">
              Vous pouvez poser des questions, demander des clarifications, ou ajouter des documents
            </p>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${
                message.role === 'user' ? 'justify-end' : 'justify-start'
              }`}
            >
              <Card
                className={`max-w-[80%] p-3 ${
                  message.role === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.role === 'system'
                    ? 'bg-yellow-50 border-yellow-200'
                    : 'bg-gray-100'
                }`}
              >
                <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                <p className="text-xs mt-2 opacity-70">
                  {message.timestamp.toLocaleTimeString()}
                </p>
              </Card>
            </div>
          ))
        )}
        {loading && (
          <div className="flex justify-start">
            <Card className="bg-gray-100 p-3">
              <Loader2 className="w-4 h-4 animate-spin" />
            </Card>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input */}
      <div className="border-t p-4">
        <div className="flex gap-2">
          <label className="cursor-pointer">
            <input
              type="file"
              className="hidden"
              onChange={handleFileUpload}
              accept=".pdf,.jpg,.jpeg,.png"
            />
            <Button
              type="button"
              variant="outline"
              size="icon"
              disabled={uploadingFile}
            >
              {uploadingFile ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Paperclip className="w-4 h-4" />
              )}
            </Button>
          </label>
          <Input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyPress={(e) => {
              if (e.key === 'Enter' && !e.shiftKey) {
                e.preventDefault()
                sendMessage()
              }
            }}
            placeholder="Posez une question ou ajoutez un commentaire..."
            disabled={loading}
          />
          <Button onClick={sendMessage} disabled={loading || !input.trim()}>
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Send className="w-4 h-4" />
            )}
          </Button>
        </div>
        <p className="text-xs text-gray-500 mt-2">
          Appuyez sur Entrée pour envoyer, Shift+Entrée pour un saut de ligne
        </p>
      </div>
    </div>
  )
}

