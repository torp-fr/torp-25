# 🧪 Tests TORP Platform

Documentation complète de l'infrastructure de tests pour la plateforme TORP.

## 📋 Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Structure des tests](#structure-des-tests)
- [Configuration](#configuration)
- [Lancer les tests](#lancer-les-tests)
- [Écrire des tests](#écrire-des-tests)
- [Coverage](#coverage)
- [Bonnes pratiques](#bonnes-pratiques)

---

## 🎯 Vue d'ensemble

La plateforme TORP utilise **Vitest** comme framework de test moderne et performant. Les tests sont organisés en trois catégories principales :

### Types de tests

| Type | Description | Dossier | Coverage Cible |
|------|-------------|---------|----------------|
| **Unitaires** | Tests isolés de fonctions/classes | `tests/unit/` | 80% |
| **Intégration** | Tests de flux complets (API routes) | `tests/integration/` | 60% |
| **E2E** | Tests bout-en-bout (futures) | `tests/e2e/` | 40% |

### Services critiques testés

✅ **DocumentAnalyzer** (`services/llm/document-analyzer.ts`)
- Analyse de devis avec Claude AI
- Extraction de données structurées
- Génération de TORP-Score
- Support multi-formats (PDF, images)

✅ **AdvancedScoringEngine** (`services/scoring/advanced/advanced-scoring-engine.ts`)
- Calcul du score TORP v2.1 (1200 points)
- 8 axes de notation
- Pondération B2C/B2B
- Génération d'alertes et recommandations

✅ **CompanyEnrichmentService** (`services/data-enrichment/company-service.ts`)
- Enrichissement données entreprise via SIRET
- Intégration API Sirene (INSEE)
- Validation et nettoyage données
- Fallback sur sources alternatives

✅ **API /llm/analyze** (`app/api/llm/analyze/route.ts`)
- Workflow complet d'upload → analyse → scoring
- Validation fichiers
- Gestion erreurs
- Intégration CCF (Cahier des Charges Fonctionnel)

---

## 📂 Structure des tests

```
tests/
├── setup.ts                          # Configuration globale
├── unit/                             # Tests unitaires
│   ├── services/
│   │   ├── llm/
│   │   │   └── document-analyzer.test.ts      # Tests DocumentAnalyzer
│   │   ├── scoring/
│   │   │   └── advanced-scoring-engine.test.ts # Tests scoring
│   │   └── data-enrichment/
│   │       └── company-service.test.ts         # Tests enrichissement
│   └── lib/
├── integration/                      # Tests d'intégration
│   └── api/
│       └── llm/
│           └── analyze.test.ts       # Tests API /llm/analyze
└── e2e/                              # Tests E2E (à venir)
```

---

## ⚙️ Configuration

### Fichiers de configuration

**vitest.config.ts**
```typescript
export default defineConfig({
  test: {
    globals: true,              // Variables globales (describe, it, expect)
    environment: 'node',        // Environnement Node.js
    setupFiles: ['./tests/setup.ts'], // Setup avant chaque test
    coverage: {
      provider: 'v8',          // Moteur de coverage
      thresholds: {
        lines: 30,             // Min 30% couverture
        functions: 30,
        branches: 30,
        statements: 30,
      },
    },
  },
})
```

**tests/setup.ts**
```typescript
// Mocks globaux
- Prisma Client (database)
- Environment variables
- Console methods (éviter pollution logs)
```

---

## 🚀 Lancer les tests

### Commandes disponibles

```bash
# Lancer tous les tests
npm test

# Mode watch (relance automatique)
npm run test:watch

# Avec UI interactive
npm run test:ui

# Générer rapport de coverage
npm run test:coverage

# Lancer un fichier spécifique
npm test document-analyzer.test.ts
```

### Exemples de sortie

**Tests réussis :**
```
✓ tests/unit/services/llm/document-analyzer.test.ts (15)
✓ tests/unit/services/scoring/advanced-scoring-engine.test.ts (12)
✓ tests/unit/services/data-enrichment/company-service.test.ts (18)
✓ tests/integration/api/llm/analyze.test.ts (10)

Test Files  4 passed (4)
     Tests  55 passed (55)
  Duration  2.45s
```

---

## ✍️ Écrire des tests

### Structure d'un test

```typescript
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { ServiceToTest } from '@/services/...'

// Mocks (si nécessaire)
vi.mock('@/external-dependency', () => ({
  ExternalService: vi.fn().mockImplementation(() => ({
    method: vi.fn().mockResolvedValue({ data: 'test' }),
  })),
}))

describe('ServiceToTest', () => {
  let service: ServiceToTest

  beforeEach(() => {
    vi.clearAllMocks()
    service = new ServiceToTest()
  })

  describe('methodName', () => {
    it('should do something successfully', async () => {
      const result = await service.methodName('input')

      expect(result).toBeDefined()
      expect(result.data).toBe('expected')
    })

    it('should handle errors gracefully', async () => {
      await expect(service.methodName('invalid')).rejects.toThrow('Error message')
    })
  })
})
```

### Mocking

#### Mock d'une classe/service

```typescript
vi.mock('@/services/external-service', () => ({
  ExternalService: vi.fn().mockImplementation(() => ({
    getData: vi.fn().mockResolvedValue({ result: 'mocked' }),
  })),
}))
```

#### Mock de Prisma

```typescript
vi.mock('@/lib/db', () => ({
  default: {
    user: {
      findUnique: vi.fn().mockResolvedValue({ id: '1', email: 'test@test.com' }),
    },
  },
}))
```

#### Mock d'une API externe

```typescript
vi.mock('@anthropic-ai/sdk', () => ({
  default: vi.fn().mockImplementation(() => ({
    messages: {
      create: vi.fn().mockResolvedValue({
        content: [{ type: 'text', text: 'response' }],
      }),
    },
  })),
}))
```

---

## 📊 Coverage

### Objectifs de couverture

| Composant | Cible | Actuel | Status |
|-----------|-------|--------|--------|
| **Services critiques** | 80% | 35% | 🟡 En cours |
| **API Routes** | 60% | 30% | 🟡 En cours |
| **Utilitaires** | 70% | 0% | 🔴 À faire |
| **Global** | 60% | 30% | 🟡 En cours |

### Générer un rapport

```bash
npm run test:coverage
```

Rapport disponible dans `coverage/index.html`

### Fichiers exclus du coverage

- `node_modules/`
- `tests/`
- `*.config.ts` / `*.config.js`
- `scripts/`
- `.next/`
- `prisma/`

---

## ✅ Bonnes pratiques

### 1. Nommer les tests clairement

```typescript
// ✅ Bon
it('should return null for invalid SIRET format', async () => {})

// ❌ Mauvais
it('test siret', async () => {})
```

### 2. Tester les cas limites

```typescript
describe('SIRET Validation', () => {
  it('should accept valid 14-digit SIRET')
  it('should reject SIRET with less than 14 digits')
  it('should reject SIRET with more than 14 digits')
  it('should reject empty SIRET')
  it('should clean SIRET with spaces')
  it('should reject non-numeric SIRET')
})
```

### 3. Utiliser des assertions précises

```typescript
// ✅ Bon
expect(result.score).toBe(850)
expect(result.grade).toMatch(/^[A-E]$/)
expect(result.items).toHaveLength(5)

// ❌ Mauvais
expect(result).toBeTruthy()
expect(result.score).toBeGreaterThan(0)
```

### 4. Nettoyer les mocks

```typescript
beforeEach(() => {
  vi.clearAllMocks() // Reset tous les mocks
})

afterEach(() => {
  vi.restoreAllMocks() // Restaure les implémentations originales
})
```

### 5. Tests indépendants

```typescript
// ✅ Bon - Chaque test est isolé
it('test A', () => {
  const data = createTestData()
  expect(service.process(data)).toBe('result')
})

it('test B', () => {
  const data = createTestData()
  expect(service.process(data)).toBe('result')
})

// ❌ Mauvais - Tests dépendants
let sharedData
it('test A', () => {
  sharedData = createTestData()
  // ...
})

it('test B', () => {
  // Dépend de test A
  expect(sharedData).toBeDefined()
})
```

### 6. Mocker intelligemment

```typescript
// ✅ Bon - Mock au niveau du module
vi.mock('@/services/external-service')

// ❌ Mauvais - Mock dans chaque test
it('test', () => {
  vi.mock('@/services/external-service') // Trop tard !
})
```

### 7. Tester les erreurs

```typescript
// ✅ Bon
it('should throw error for invalid input', async () => {
  await expect(service.process('invalid')).rejects.toThrow(
    'Invalid input format'
  )
})

// ✅ Bon - Vérifier que ça ne throw pas
it('should handle errors gracefully', async () => {
  await expect(service.process('invalid')).resolves.not.toThrow()
})
```

---

## 🔍 Debugging des tests

### Afficher les logs

```typescript
it('debug test', () => {
  console.log('Debug info:', data) // Visible dans la sortie
})
```

### Mode debug

```bash
# Lancer avec Node inspector
node --inspect-brk node_modules/.bin/vitest

# VS Code: Ajouter breakpoints et F5
```

### Isoler un test

```typescript
// Lancer uniquement ce test
it.only('focused test', () => {})

// Ignorer ce test
it.skip('ignored test', () => {})
```

---

## 📚 Ressources

- [Vitest Documentation](https://vitest.dev/)
- [Testing Library Best Practices](https://testing-library.com/docs/guiding-principles)
- [Mocking Best Practices](https://vitest.dev/guide/mocking.html)

---

## 🎯 Prochaines étapes

### Court terme
- [ ] Ajouter tests pour services d'enrichissement restants
- [ ] Tests pour composants React critiques
- [ ] Tests pour autres API routes

### Moyen terme
- [ ] Configuration Playwright pour E2E
- [ ] Tests de performance
- [ ] Visual regression tests

### Long terme
- [ ] CI/CD integration (GitHub Actions)
- [ ] Coverage badges
- [ ] Mutation testing

---

**Dernière mise à jour** : 4 Novembre 2025
**Coverage actuel** : ~35%
**Objectif** : 60%
