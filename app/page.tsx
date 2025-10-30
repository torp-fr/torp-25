import Link from 'next/link'
import { config } from '@/config'
import { Button } from '@/components/ui/button'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card'
import {
  Upload,
  BarChart3,
  FileText,
  Shield,
  Zap,
  CheckCircle2,
} from 'lucide-react'

export default function HomePage() {
  return (
    <div className="flex min-h-screen flex-col">
      {/* Header */}
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container flex h-16 items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <span className="text-xl font-bold text-primary-foreground">
                T
              </span>
            </div>
            <span className="text-xl font-bold">TORP</span>
          </div>
          <nav className="hidden gap-6 md:flex">
            <Link
              href="#features"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Fonctionnalités
            </Link>
            <Link
              href="#pricing"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              Tarifs
            </Link>
            <Link
              href="#about"
              className="text-sm font-medium transition-colors hover:text-primary"
            >
              À propos
            </Link>
          </nav>
          <div className="flex items-center gap-4">
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={`${config.app.url}/api/auth/login`}
              className="inline-flex h-10 items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Connexion
            </a>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a
              href={`${config.app.url}/api/auth/login`}
              className="inline-flex h-10 items-center justify-center rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              Commencer
            </a>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="container flex flex-col items-center gap-8 py-24 md:py-32">
        <div className="flex max-w-[980px] flex-col items-center gap-4 text-center">
          <h1 className="font-heading text-4xl font-bold leading-tight tracking-tighter md:text-6xl lg:text-7xl">
            Analysez vos devis BTP en toute
            <span className="text-primary"> confiance</span>
          </h1>
          <p className="max-w-[750px] text-lg text-muted-foreground sm:text-xl">
            TORP utilise l&apos;Intelligence Artificielle pour analyser et
            scorer automatiquement vos devis de construction. Obtenez une
            évaluation objective en moins de 30 secondes.
          </p>
          <div className="flex gap-4">
            <Button size="lg" asChild>
              {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
              <a href={`${config.app.url}/api/auth/login`}>
                <Upload className="mr-2 h-4 w-4" />
                Analyser un devis
              </a>
            </Button>
            <Button size="lg" variant="outline" asChild>
              <Link href="#features">En savoir plus</Link>
            </Button>
          </div>
        </div>

        {/* Stats */}
        <div className="grid w-full max-w-5xl grid-cols-1 gap-8 pt-12 md:grid-cols-3">
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-4xl font-bold text-primary">5000+</div>
            <div className="text-sm text-muted-foreground">
              Devis analysés
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-4xl font-bold text-primary">&gt;90%</div>
            <div className="text-sm text-muted-foreground">
              Précision OCR
            </div>
          </div>
          <div className="flex flex-col items-center gap-2 text-center">
            <div className="text-4xl font-bold text-primary">&lt;30s</div>
            <div className="text-sm text-muted-foreground">
              Temps d&apos;analyse
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section
        id="features"
        className="container space-y-12 bg-slate-50 py-24"
      >
        <div className="mx-auto flex max-w-[58rem] flex-col items-center space-y-4 text-center">
          <h2 className="font-heading text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Fonctionnalités
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Tout ce dont vous avez besoin pour évaluer vos devis en toute
            confiance
          </p>
        </div>

        <div className="mx-auto grid justify-center gap-4 sm:grid-cols-2 md:max-w-[64rem] md:grid-cols-3">
          <Card>
            <CardHeader>
              <Upload className="h-10 w-10 text-primary" />
              <CardTitle>Upload Multi-format</CardTitle>
              <CardDescription>
                PDF, JPG, PNG - Tous formats acceptés
              </CardDescription>
            </CardHeader>
            <CardContent>
              Uploadez vos devis en quelques secondes. Notre OCR intelligent
              extrait toutes les informations nécessaires.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <BarChart3 className="h-10 w-10 text-primary" />
              <CardTitle>TORP-Score</CardTitle>
              <CardDescription>
                Score propriétaire de A à E
              </CardDescription>
            </CardHeader>
            <CardContent>
              Algorithme basé sur 80 critères analysant le prix, la qualité,
              les délais et la conformité.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <FileText className="h-10 w-10 text-primary" />
              <CardTitle>Rapport Détaillé</CardTitle>
              <CardDescription>
                Analyse complète en PDF
              </CardDescription>
            </CardHeader>
            <CardContent>
              Recevez un rapport détaillé avec recommandations et points de
              négociation.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Shield className="h-10 w-10 text-primary" />
              <CardTitle>Conformité Légale</CardTitle>
              <CardDescription>
                Vérification réglementaire
              </CardDescription>
            </CardHeader>
            <CardContent>
              Validation automatique des mentions légales, assurances et
              garanties obligatoires.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <Zap className="h-10 w-10 text-primary" />
              <CardTitle>Comparaison Multi-devis</CardTitle>
              <CardDescription>
                Comparez jusqu&apos;à 5 devis
              </CardDescription>
            </CardHeader>
            <CardContent>
              Comparez plusieurs devis côte à côte et identifiez la meilleure
              option.
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CheckCircle2 className="h-10 w-10 text-primary" />
              <CardTitle>Benchmark Régional</CardTitle>
              <CardDescription>
                Prix du marché local
              </CardDescription>
            </CardHeader>
            <CardContent>
              Comparez vos devis aux prix moyens de votre région grâce à notre
              base de données.
            </CardContent>
          </Card>
        </div>
      </section>

      {/* CTA Section */}
      <section className="container py-24">
        <div className="mx-auto flex max-w-[58rem] flex-col items-center justify-center gap-4 text-center">
          <h2 className="font-heading text-3xl font-bold leading-[1.1] sm:text-3xl md:text-5xl">
            Prêt à analyser votre premier devis ?
          </h2>
          <p className="max-w-[85%] leading-normal text-muted-foreground sm:text-lg sm:leading-7">
            Rejoignez des milliers d&apos;utilisateurs qui font confiance à
            TORP pour leurs projets BTP.
          </p>
          <Button size="lg" className="mt-4" asChild>
            {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
            <a href={`${config.app.url}/api/auth/login`}>
              <Upload className="mr-2 h-4 w-4" />
              Commencer gratuitement
            </a>
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t py-12">
        <div className="container">
          <div className="grid grid-cols-1 gap-8 md:grid-cols-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary">
                  <span className="font-bold text-primary-foreground">T</span>
                </div>
                <span className="text-lg font-bold">TORP</span>
              </div>
              <p className="mt-4 text-sm text-muted-foreground">
                Plateforme SaaS d&apos;analyse intelligente de devis BTP
              </p>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Produit</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#features">Fonctionnalités</Link>
                </li>
                <li>
                  <Link href="#pricing">Tarifs</Link>
                </li>
                <li>
                  <Link href="/dashboard">Dashboard</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Entreprise</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="#about">À propos</Link>
                </li>
                <li>
                  <Link href="/contact">Contact</Link>
                </li>
                <li>
                  <Link href="/blog">Blog</Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="mb-4 text-sm font-semibold">Légal</h3>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li>
                  <Link href="/privacy">Confidentialité</Link>
                </li>
                <li>
                  <Link href="/terms">Conditions</Link>
                </li>
                <li>
                  <Link href="/cookies">Cookies</Link>
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 border-t pt-8 text-center text-sm text-muted-foreground">
            <p>&copy; 2025 TORP. Tous droits réservés.</p>
          </div>
        </div>
      </footer>
    </div>
  )
}
