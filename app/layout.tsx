import type { Metadata } from 'next'
import './globals.css'
import { Toaster } from '@/components/ui/toaster'
import { AuthProvider } from '@/components/auth-provider'

export const metadata: Metadata = {
  title: 'TORP - Analyse Intelligente de Devis BTP',
  description:
    'Plateforme SaaS révolutionnaire pour analyser et scorer automatiquement vos devis de construction. Intelligence Artificielle au service de votre projet BTP.',
  keywords: [
    'devis BTP',
    'analyse devis',
    'construction',
    'rénovation',
    'IA',
    'score',
  ],
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="fr">
      <body className="min-h-screen bg-background font-sans antialiased">
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  )
}
