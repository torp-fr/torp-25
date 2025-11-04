# 📝 Guide de Logging - TORP Platform

## 📊 Vue d'ensemble

TORP utilise **Pino** pour le structured logging performant avec :
- Logs structurés JSON (production)
- Pretty print colorisé (développement)
- Niveaux configurables
- Redaction automatique de données sensibles
- Loggers spécialisés par module

---

## 🚀 Installation

```bash
# Dépendances à ajouter
npm install pino
npm install -D pino-pretty
```

---

## 💡 Utilisation

### Import du logger

```typescript
import logger, { loggers, createModuleLogger } from '@/lib/logger'

// Logger général
logger.info('Message général')

// Logger spécialisé (recommandé)
const log = loggers.llm
log.info({ devisId: '123' }, 'Analyse démarrée')

// Logger custom pour nouveau module
const customLog = createModuleLogger('Payment')
customLog.debug('Transaction initiée')
```

### Niveaux de logs

```typescript
// TRACE - Très détaillé (pas en production)
log.trace({ data }, 'Détails complets')

// DEBUG - Développement
log.debug({ params }, 'Debug info')

// INFO - Informations importantes
log.info({ userId: '123' }, 'Utilisateur connecté')

// WARN - Avertissements
log.warn({ error: err.message }, 'Opération lente')

// ERROR - Erreurs
log.error({ err }, 'Erreur critique')

// FATAL - Erreurs fatales (arrêt application)
log.fatal({ err }, 'Application crash')
```

### Structured logging (recommandé)

```typescript
// ✅ BON - Structured
log.info({
  devisId: '123',
  siret: '12345678900001',
  scoreValue: 850,
  duration: 1234,
}, 'Analyse complétée')

// ❌ MAUVAIS - String only
log.info(`Analyse complétée pour ${devisId}`)
```

### Gestion des erreurs

```typescript
try {
  await dangerousOperation()
} catch (err) {
  // ✅ BON - Erreur complète
  log.error({ 
    err,
    context: { userId, devisId },
  }, 'Échec opération')
  
  // Optionnel: Sentry
  // Sentry.captureException(err)
}

// ❌ MAUVAIS
catch (err) {
  console.error('Erreur:', err)
}
```

---

## 🎯 Migration console.log → logger

### Avant (console.log)

```typescript
console.log(`[CompanyService] 🔍 Enrichissement pour SIRET: ${cleanSiret}`)
console.log('[CompanyService] ✅ Données récupérées')
console.warn('[CompanyService] ⚠️ Erreur:', error)
console.error('Erreur critique:', error)
```

### Après (Pino)

```typescript
import { loggers } from '@/lib/logger'
const log = loggers.enrichment

log.info({ siret: cleanSiret }, 'Enrichissement démarré')
log.info('Données récupérées avec succès')
log.warn({ error: error.message }, 'Erreur enrichissement')
log.error({ err: error }, 'Erreur critique')
```

---

## ⚙️ Configuration

### Variables d'environnement

```bash
# .env.local

# Niveau de log (trace, debug, info, warn, error, fatal)
LOG_LEVEL=debug  # dev
LOG_LEVEL=info   # prod
LOG_LEVEL=error  # test
```

### Pretty Print (développement)

```json
// package.json
{
  "scripts": {
    "dev": "LOG_LEVEL=debug next dev --turbo"
  }
}
```

---

## 📦 Loggers pré-configurés

| Logger | Module | Usage |
|--------|--------|-------|
| `loggers.llm` | LLM | Analyse Claude AI |
| `loggers.scoring` | Scoring | Calcul TORP-Score |
| `loggers.enrichment` | Enrichment | Enrichissement données |
| `loggers.api` | API | Routes API |
| `loggers.db` | Database | Prisma/PostgreSQL |
| `loggers.auth` | Auth | Authentification |
| `loggers.upload` | Upload | Upload fichiers |

---

## 🔒 Redaction automatique

Les champs sensibles sont automatiquement supprimés :
- `password`
- `apiKey`
- `token`
- `secret`
- Et tous les nested paths `*.password`, etc.

```typescript
log.info({
  user: {
    email: 'test@test.com',
    password: 'secret123', // ← Automatiquement supprimé
  },
}, 'User created')

// Output: { user: { email: 'test@test.com' } }
```

---

## 🎨 Output exemples

### Développement (Pretty)

```
[09:30:15] INFO (LLM): Analyse démarrée
    devisId: "abc-123"
    siret: "12345678900001"
    
[09:30:16] INFO (LLM): Analyse complétée
    scoreValue: 850
    duration: 1234ms
```

### Production (JSON)

```json
{
  "level": "info",
  "time": 1699012345678,
  "module": "LLM",
  "devisId": "abc-123",
  "siret": "12345678900001",
  "msg": "Analyse démarrée"
}
```

---

## 🔗 Intégration Sentry (optionnel)

```typescript
import logger from '@/lib/logger'
import * as Sentry from '@sentry/nextjs'

// Log les erreurs dans Sentry également
logger.error({ err, context }, 'Erreur critique')
Sentry.captureException(err, {
  extra: context,
})
```

---

## ✅ Bonnes pratiques

1. **Toujours utiliser structured logging**
   ```typescript
   // ✅ BON
   log.info({ userId, action }, 'User action')
   
   // ❌ MAUVAIS
   log.info(`User ${userId} did ${action}`)
   ```

2. **Utiliser le bon niveau**
   - `debug` : Informations de développement
   - `info` : Événements importants
   - `warn` : Situations anormales mais récupérables
   - `error` : Erreurs nécessitant attention
   - `fatal` : Erreurs critiques

3. **Inclure le contexte**
   ```typescript
   log.error({
     err,
     userId,
     devisId,
     operation: 'analyzeDevis',
   }, 'Opération échouée')
   ```

4. **Ne pas logger de données sensibles**
   - Pas de mots de passe
   - Pas de tokens
   - Pas de clés API
   - Pas de données personnelles si pas nécessaire

5. **Performance : éviter les logs excessifs**
   ```typescript
   // ❌ MAUVAIS - Dans une boucle
   items.forEach(item => {
     log.debug({ item }, 'Processing item')
   })
   
   // ✅ BON - Agrégé
   log.debug({ itemCount: items.length }, 'Processing items')
   ```

---

## 📊 Statistiques actuelles

**Avant migration** :
- 1582 console.log/warn/error
- Logs non structurés
- Pas de niveaux
- Pas de filtrage

**Après migration** :
- Logs structurés JSON
- Niveaux configurables
- Filtrage par module
- Performance optimale
- Redaction automatique

---

## 🎯 TODO Migration

Services à migrer par priorité :

### P0 - Critique
- [x] `/lib/logger.ts` créé
- [ ] `services/llm/document-analyzer.ts` (5 logs)
- [ ] `services/scoring/advanced/` (2 logs)
- [ ] `services/data-enrichment/company-service.ts` (17 logs)

### P1 - Haute
- [ ] `app/api/llm/analyze/route.ts` (27 logs)
- [ ] `services/external-apis/*.ts` (100+ logs)
- [ ] `app/api/enrichment/*.ts` (15 logs)

### P2 - Moyenne
- [ ] Autres API routes
- [ ] Services secondaires
- [ ] Scripts (optionnel)

---

**Date**: 4 Novembre 2025  
**Status**: Infrastructure créée, migration en cours
