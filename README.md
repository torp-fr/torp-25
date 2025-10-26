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
- ✅ Algorithme TORP-Score propriétaire (80 critères)
- ✅ Rapport PDF détaillé avec recommandations
- ✅ Comparaison multi-devis (jusqu'à 5)
- ✅ Benchmark régional de prix
- ✅ Dashboard utilisateur B2C et B2B

## 💻 Stack Technologique

### Frontend
- **Framework**: Next.js 16 (App Router)
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
- **OCR**: Tesseract.js + AWS Rekognition
- **NLP**: Custom parsing algorithms
- **Scoring**: Proprietary TORP algorithm

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

- `DATABASE_URL`: PostgreSQL connection string
- `AUTH0_*`: Auth0 credentials
- `AWS_*`: AWS credentials for S3 and Rekognition
- `STRIPE_*`: Stripe payment credentials
- `REDIS_URL`: Redis connection string

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

## 🧮 TORP-Score Algorithm

The proprietary TORP-Score evaluates quotes across **80 criteria** in 4 categories:

### Scoring Categories

1. **PRIX (25% weight)** - 12 criteria
   - Price comparison vs regional market
   - Unit prices vs Reef Premium reference
   - Pricing coherence and transparency

2. **QUALITE (30% weight)** - 20 criteria
   - DTU compliance
   - Materials quality and certifications
   - Technical specifications detail

3. **DELAIS (20% weight)** - 12 criteria
   - Timeline realism
   - Phasing coherence
   - Buffer margins for contingencies

4. **CONFORMITE (25% weight)** - 36 criteria
   - Legal mentions
   - Insurance coverage (RC, Décennale)
   - Regulatory compliance (RE2020, DTU)

### Grade Thresholds

- **A (850-1000)**: Excellent
- **B (700-849)**: Très bien
- **C (550-699)**: Bien
- **D (400-549)**: Passable
- **E (0-399)**: Insuffisant

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
- [ ] Run database migrations
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
