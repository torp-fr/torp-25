# 🔧 Structure Opérationnelle de Résolution des Erreurs

## Vue d'Ensemble

Cette documentation décrit la structure opérationnelle mise en place pour détecter, analyser et résoudre **définitivement** toutes les erreurs TypeScript dans le projet TORP.

## 🎯 Objectifs

1. **Détection automatique** de toutes les erreurs avant le build
2. **Classification systématique** des erreurs par catégorie
3. **Résolution définitive** avec validation complète
4. **Prévention** des erreurs futures

## 📋 Types d'Erreurs

### 1. Paramètres Non Utilisés (`unused-param`)

**Détection:**
```bash
npx tsx scripts/check-all-errors.ts
```

**Résolution:**
- Préfixer avec `_` si le paramètre doit être conservé pour compatibilité d'interface
- Supprimer si le paramètre n'est pas nécessaire

**Exemple:**
```typescript
// ❌ Avant
private async function(devis: Devis, enrichmentData: ScoringEnrichmentData) {
  // enrichmentData n'est pas utilisé
}

// ✅ Après
private async function(devis: Devis, _enrichmentData: ScoringEnrichmentData) {
  // _enrichmentData préfixé pour indiquer non-utilisation
}
```

### 2. Erreurs de Type (`type-error`)

**Causes courantes:**
- Propriété manquante dans une interface
- Incohérence entre types d'enrichissement et types de scoring
- Accès à des propriétés optionnelles sans vérification

**Résolution:**
1. Identifier le type manquant
2. Ajouter la propriété à l'interface appropriée
3. Vérifier la cohérence avec les autres fichiers de types

**Exemple:**
```typescript
// ❌ Erreur: Property 'insurances' does not exist on type 'EnrichedCompanyData'
enrichmentData.company?.insurances?.hasRC

// ✅ Correction: Ajouter insurances à EnrichedCompanyData
export interface EnrichedCompanyData {
  // ... autres propriétés
  insurances?: {
    hasDecennale?: boolean
    hasRC?: boolean
    decennaleAmount?: number
    rcAmount?: number
    expirationDate?: string
  }
}
```

## 🔄 Processus de Résolution

### Étape 1: Détection
```bash
# Vérifier toutes les erreurs
npx tsx scripts/check-all-errors.ts

# Ou validation TypeScript directe
npx tsc --noEmit
```

### Étape 2: Classification
Les erreurs sont automatiquement classées par catégorie:
- `unused-param`: Paramètres/variables non utilisés
- `type-error`: Erreurs de type TypeScript
- `other`: Autres erreurs

### Étape 3: Résolution

#### Pour les paramètres non utilisés:
1. Identifier la fonction concernée
2. Déterminer si le paramètre doit être conservé (préfixe `_`) ou supprimé
3. Appliquer la correction

#### Pour les erreurs de type:
1. Identifier le fichier de types concerné
2. Vérifier la cohérence avec les autres types
3. Ajouter/modifier les propriétés nécessaires
4. Vérifier que toutes les utilisations sont compatibles

### Étape 4: Validation
```bash
# Vérifier qu'il n'y a plus d'erreurs
npx tsc --noEmit
npx tsx scripts/check-all-errors.ts

# Vérifier le linter
npm run lint
```

### Étape 5: Commit et Push
```bash
git add .
git commit -m "fix: Description de la correction"
git push origin main
```

## 🔗 Connexions entre Fichiers

### Types d'Enrichissement
- `services/data-enrichment/types.ts`: Types pour l'enrichissement de données
- `services/scoring/advanced/types.ts`: Types pour le scoring avancé

**Lien important:** `EnrichedCompanyData` dans `types.ts` doit être compatible avec `CompanyEnrichment` dans `data-enrichment/types.ts`.

### Utilisation dans les Axes
- `services/scoring/advanced/axes/*.ts`: Utilisation des types enrichis
- Doivent respecter les interfaces définies dans `types.ts`

## 📝 Checklist de Résolution

- [ ] Exécuter `check-all-errors.ts` pour détecter toutes les erreurs
- [ ] Classifier chaque erreur par catégorie
- [ ] Résoudre les paramètres non utilisés (préfixe `_` ou suppression)
- [ ] Corriger les erreurs de type (ajout/modification d'interfaces)
- [ ] Vérifier la cohérence entre `data-enrichment/types.ts` et `scoring/advanced/types.ts`
- [ ] Valider avec `tsc --noEmit`
- [ ] Vérifier le linter
- [ ] Commit et push

## 🛡️ Prévention

1. **Avant chaque commit:** Exécuter `check-all-errors.ts`
2. **Avant chaque push:** Vérifier que `tsc --noEmit` passe
3. **Lors de l'ajout de nouvelles propriétés:** Vérifier la cohérence avec tous les types
4. **Lors de la modification d'interfaces:** Chercher toutes les utilisations

## 📚 Ressources

- **Script de détection:** `scripts/check-all-errors.ts`
- **Validation TypeScript:** `npx tsc --noEmit`
- **Types d'enrichissement:** `services/data-enrichment/types.ts`
- **Types de scoring:** `services/scoring/advanced/types.ts`

