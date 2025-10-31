# 🏗️ TORP - Plateforme SaaS d'Analyse Intelligente de Devis BTP

> **Plateforme révolutionnaire qui démocratise l'expertise BTP en utilisant l'Intelligence Artificielle**
> Version: 1.0.0 | Dernière mise à jour: Octobre 2025

## 📋 Vue d'Ensemble

TORP est une plateforme SaaS qui analyse et score automatiquement les devis de construction en utilisant l'IA. Notre algorithme propriétaire évalue 80 critères répartis en 4 catégories pour fournir un score objectif de A à E.

### 🎯 Proposition de Valeur

- **Pour les Particuliers (B2C)**: Analyse objective et transparente de devis BTP avec recommandations personnalisées
- **Pour les Professionnels (B2B)**: Audit qualité, amélioration de devis, certification TORP valorisante

### 🚀 Fonctionnalités Principales

- ✅ Upload multi-format (PDF, JPG, PNG, DOCX)
- ✅ OCR intelligent avec >90% de précision
- ✅ Algorithme TORP-Score v2.0 propriétaire (1200 points, 8 axes, 250+ critères)
- ✅ Enrichissement automatique multi-sources (INSEE, Infogreffe, Pappers, etc.)
- ✅ Rapport PDF détaillé avec recommandations
- ✅ Comparaison multi-devis (jusqu'à 5)
- ✅ Benchmark régional de prix
- ✅ Dashboard utilisateur B2C et B2B

## 💻 Stack Technologique

### Frontend
- **Framework**: Next.js 15.2.3 (App Router)
- **Language**: TypeScript (strict mode)
- **Styling**: TailwindCSS 4 + Shadcn/ui
- **State**: Zustand + React Query
- **Forms**: React Hook Form + Zod validation

### Backend
- **Runtime**: Node.js 20 LTS
- **Database**: PostgreSQL 15 (Prisma ORM)
- **Cache**: Redis 7
- **Storage**: AWS S3
- **Auth**: Auth0

### Intelligence Artificielle
- **Analyse LLM**: Claude AI (Anthropic) - Analyse intelligente des devis
- **OCR**: Lecture directe par Claude AI (PDF, images)
- **NLP**: Analyse sémantique avancée des devis
- **Scoring**: Algorithme propriétaire TORP v2.0 (1200 points, 8 axes, 250+ critères)
- **Enrichissement**: Multi-sources via APIs externes (15+ sources)

### Infrastructure
- **Cloud**: AWS (EU-West-3 Paris)
- **CI/CD**: GitHub Actions
- **Monitoring**: Sentry (planned)

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────┐
│              FRONTEND LAYER                         │
│  Web App (Next.js) │ Admin Dashboard │ Mobile PWA  │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│           BUSINESS LOGIC MODULES                    │
│  User Mgmt │ Scoring │ OCR │ Payments │ Analytics  │
└─────────────────────────────────────────────────────┘
                          │
┌─────────────────────────────────────────────────────┐
│              DATA LAYER                             │
│  PostgreSQL │ Redis │ S3 │ Prisma ORM              │
└─────────────────────────────────────────────────────┘
```

## 🚦 Getting Started

### Prerequisites

- Node.js 20+
- PostgreSQL 15+
- Redis 7+
- AWS Account (S3 + Rekognition)
- Auth0 Account

### Installation

1. **Clone the repository**
```bash
git clone https://github.com/your-org/torp-platform.git
cd torp-platform
```

2. **Install dependencies**
```bash
npm install
```

3. **Setup environment variables**
```bash
cp .env.example .env
# Edit .env with your credentials
```

4. **Setup database**
```bash
npm run db:migrate
npm run db:generate
```

5. **Run development server**
```bash
npm run dev
```

Visit [http://localhost:3000](http://localhost:3000)

### Environment Variables

See `.env.example` for all required environment variables:

**Obligatoires :**
- `DATABASE_URL`: PostgreSQL connection string
- `ANTHROPIC_API_KEY`: Claude AI API key (pour analyse LLM)

**Optionnelles - APIs d'Enrichissement :**
- `INSEE_API_KEY`: Clé API INSEE Sirene (officielle) - Pour données complètes d'entreprises
  - **Note** : Sans clé, le système utilise automatiquement l'API Recherche d'Entreprises (data.gouv.fr) gratuite comme fallback
  - Obtenir une clé : https://api.insee.fr/
- `REEF_PREMIUM_API_KEY`: Prix de référence BTP
- `INFOGREFFE_API_KEY`: Données financières entreprises
- `PAPPERS_API_KEY`: Enrichissement entreprises
- `OPENWEATHER_API_KEY`: Données météorologiques
- `METEOFRANCE_API_KEY`: Météo officielle française

**Autres :**
- `AUTH0_*`: Auth0 credentials (optionnel - désactivé en mode demo)
- `AWS_*`: AWS credentials for S3 and Rekognition
- `STRIPE_*`: Stripe payment credentials
- `REDIS_URL`: Redis connection string

Voir [README_ADVANCED_SCORING.md](README_ADVANCED_SCORING.md) pour la documentation complète du système de scoring avancé.

## 📁 Project Structure

```
torp-platform/
├── app/                    # Next.js app directory
│   ├── (auth)/            # Authentication routes
│   ├── dashboard/         # Dashboard pages
│   ├── api/               # API routes
│   └── layout.tsx         # Root layout
├── components/            # React components
│   ├── ui/               # UI primitives (Shadcn)
│   ├── layout/           # Layout components
│   └── features/         # Feature components
├── services/             # Business logic services
│   ├── auth/            # Authentication
│   ├── document/        # Document upload & OCR
│   ├── scoring/         # TORP-Score algorithm
│   ├── payment/         # Stripe integration
│   └── notification/    # Email/SMS notifications
├── lib/                  # Utility libraries
│   ├── db.ts            # Prisma client
│   ├── utils.ts         # Helper functions
│   └── validations/     # Zod schemas
├── types/                # TypeScript type definitions
├── hooks/                # Custom React hooks
├── config/               # Application configuration
├── prisma/               # Database schema
│   └── schema.prisma    # Prisma schema
└── tests/                # Test files
    ├── unit/            # Unit tests
    ├── integration/     # Integration tests
    └── e2e/             # End-to-end tests
```

## 🔧 Development

### Available Scripts

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run start        # Start production server
npm run lint         # Run ESLint
npm run lint:fix     # Fix ESLint errors
npm run format       # Format code with Prettier
npm run typecheck    # Run TypeScript compiler
npm run test         # Run tests
npm run db:migrate   # Run database migrations
npm run db:studio    # Open Prisma Studio
```

### Code Quality

- **Linting**: ESLint with Next.js config
- **Formatting**: Prettier with Tailwind plugin
- **Type Safety**: TypeScript strict mode
- **Testing**: Vitest for unit tests
- **Pre-commit**: Husky (planned)

## 🧮 TORP-Score Algorithm - Architecture Avancée

### Version 2.0 - Système Multi-Niveaux (1200 points)

Le système de scoring TORP v2.0 évalue les devis selon une **architecture hiérarchique multi-niveaux** :

- **Niveau 1** : 8 Axes Principaux (macro-analyse)
- **Niveau 2** : 45 Sous-critères (méso-analyse)
- **Niveau 3** : 250+ Points de contrôle (micro-analyse)
- **Score Total** : 1200 points (évolutivité maximale)

### 🎯 Les 8 Axes Principaux

1. **CONFORMITÉ RÉGLEMENTAIRE & TECHNIQUE (350 pts - 29%)**
   - Respect normes DTU & Standards (140 pts)
   - Qualifications & Certifications Entreprise (110 pts)
   - Sécurité & Accessibilité (100 pts)

2. **ANALYSE PRIX & MARCHÉ (250 pts - 21%)**
   - Positionnement tarifaire (120 pts)
   - Optimisation valeur (80 pts)
   - Intelligence financière (50 pts)

3. **QUALITÉ & RÉPUTATION ENTREPRISE (200 pts - 17%)**
   - Solidité financière (80 pts)
   - Réputation & Références (70 pts)
   - Capital humain & Organisation (50 pts)

4. **FAISABILITÉ & COHÉRENCE TECHNIQUE (150 pts - 12%)**
   - Pertinence solutions (70 pts)
   - Réalisme exécution (50 pts)
   - Gestion risques (30 pts)

5. **TRANSPARENCE & COMMUNICATION (100 pts - 8%)**
   - Qualité documentation (50 pts)
   - Relation client (30 pts)
   - Suivi projet (20 pts)

6. **GARANTIES & ASSURANCES (80 pts - 7%)**
   - Couvertures légales (50 pts)
   - Extensions & garanties commerciales (30 pts)

7. **INNOVATION & DÉVELOPPEMENT DURABLE (50 pts - 4%)**
   - Performance environnementale (30 pts)
   - Innovation technique (20 pts)

8. **GESTION PROJET & DÉLAIS (70 pts - 6%)**
   - Réalisme planning (40 pts)
   - Capacité respect délais (30 pts)

### 📊 Pondération Adaptative

Le système s'adapte automatiquement selon le profil utilisateur :

**Profil B2C (Particuliers)** - Focus Sécurisation :
- Conformité : 35% (+6%)
- Qualité Entreprise : 22% (+5%)
- Transparence : 15% (+7%)
- Garanties : 10% (+3%)

**Profil B2B (Professionnels)** - Focus Optimisation :
- Prix & Marché : 28% (+7%)
- Faisabilité Technique : 18% (+6%)
- Innovation Durable : 8% (+4%)
- Gestion Délais : 10% (+4%)

### 🎖️ Grades Finaux

- **A+ (1080-1200)**: 🏆 Excellence - Validation immédiate recommandée
- **A (960-1079)**: ⭐ Très bien - Négociations mineures possibles
- **B (840-959)**: ✅ Satisfaisant - Vérifications ciblées
- **C (720-839)**: ⚠️ Moyen - Améliorations requises
- **D (600-719)**: 🔍 Problématique - Vigilance renforcée
- **E (<600)**: 🚨 Déconseillé - Recherche alternatives

### 📡 Enrichissement de Données Multi-Sources

Le système enrichit automatiquement les données via **15+ sources** :

**APIs Publiques Officielles** (Gratuites) :
- ✅ **INSEE Sirene** (API officielle + fallback data.gouv.fr) - Informations entreprises, SIRET, certification
  - Service complet avec vérification et certification automatique des données d'entreprise
  - Recherche par SIREN/SIRET, nom, département, code NAF
  - Vérification de correspondance des données (nom, adresse, statut)
  - Dataset ID: 5b7ffc618b4c4169d30727e0
- ✅ **BODACC** (data.gouv.fr) - Procédures collectives
- ✅ **Data.gouv.fr** - Données publiques multiples

**APIs Sectorielles** (Optionnelles) :
- 🔑 **Infogreffe** - Bilans, données financières
- 🔑 **Pappers.fr** - Enrichissement entreprises
- 🔑 **Qualibat** - Certifications métiers
- 🔑 **CSTB** - Base DTU, guides techniques
- 🔑 **Reef Premium** - Prix de référence

**Services Propriétaires** :
- 🧠 **LLM Claude AI** - Analyse intelligente des devis
- 📊 **Base TORP** - Historique analyses, modèles ML
- 🌐 **Scraping légal** - Avis clients, réputation

Voir [services/data-enrichment/README.md](services/data-enrichment/README.md) pour plus de détails.

## 🔒 Security

- **Authentication**: Auth0 with JWT tokens
- **Data Encryption**: AES-256 at rest, TLS 1.3 in transit
- **RGPD Compliance**: Full GDPR compliant
- **Data Hosting**: France (EU-West-3)
- **Security Headers**: CSP, HSTS, X-Frame-Options

## 📊 Database Schema

Key models:
- `User` - User accounts
- `UserProfile` - User profile data
- `CompanyProfile` - Professional company data
- `Document` - Uploaded documents
- `Devis` - Parsed quotes
- `TORPScore` - Generated scores
- `Comparison` - Multi-quote comparisons
- `Subscription` - User subscriptions
- `Payment` - Payment transactions

See `prisma/schema.prisma` for full schema.

## 🚀 Deployment

### Production Checklist

- [ ] Set all environment variables
- [x] Run database migrations (automatique via `db:migrate:deploy` sur Vercel)
- [ ] Configure AWS S3 bucket
- [ ] Setup Auth0 production tenant
- [ ] Configure Stripe webhooks
- [ ] Setup monitoring (Sentry)
- [ ] Configure CDN (CloudFront)
- [ ] Enable SSL/TLS
- [ ] Setup backups

### Deployment Platforms

- **Recommended**: Vercel (Next.js optimized)
- **Alternative**: AWS ECS/Fargate, Railway, Render

## 📈 Roadmap

### Phase 1: MVP (Mois 0-12) ✅
- [x] Core infrastructure
- [x] Document upload & OCR
- [x] TORP-Score algorithm
- [x] User dashboards B2C/B2B
- [x] Payment integration

### Phase 2: Growth (Mois 12-24)
- [ ] Payment workflow integration
- [ ] Project tracking system
- [ ] Marketplace fournisseurs
- [ ] IA conversationnelle chatbot
- [ ] Mobile app React Native

### Phase 3: Scale (Mois 24-36)
- [ ] European expansion
- [ ] Microservices architecture
- [ ] Advanced AI features
- [ ] API marketplace
- [ ] White-label solutions

## 🤝 Contributing

We welcome contributions! Please read our contributing guidelines before submitting PRs.

### Development Workflow

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'feat: add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

### Commit Convention

We follow [Conventional Commits](https://www.conventionalcommits.org/):

- `feat:` New feature
- `fix:` Bug fix
- `docs:` Documentation
- `style:` Formatting
- `refactor:` Code restructure
- `test:` Tests
- `chore:` Maintenance

## 📄 License

Copyright © 2025 TORP SAS. All rights reserved.

Proprietary software - Unauthorized copying, modification, distribution is strictly prohibited.

## 📞 Contact & Support

- **Website**: [https://torp.fr](https://torp.fr)
- **Email**: contact@torp.fr
- **Support**: support@torp.fr
- **GitHub**: [https://github.com/torp](https://github.com/torp)

---

**Made with ❤️ by the TORP Team**
