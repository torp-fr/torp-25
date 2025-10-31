# 🏅 Système d'Indexation Progressive RGE

Ce document décrit le système d'indexation progressive des données RGE (Reconnu Garant de l'Environnement) dans TORP.

## 📋 Vue d'ensemble

Le dataset RGE contient des milliers d'entreprises certifiées. Le système permet de :
- **Indexer progressivement** les fichiers CSV/JSON depuis data.gouv.fr
- **Stocker localement** dans PostgreSQL pour recherche rapide
- **Importer à la demande** des certifications spécifiques
- **Suivre la progression** des imports avec jobs

## 🏛️ Architecture

### 1. **RGEService** (`services/external-apis/rge-service.ts`)
- Récupère les métadonnées depuis data.gouv.fr
- Identifie les ressources disponibles (CSV/JSON)
- Appelle l'indexeur si données disponibles localement
- Fallback sur recherche API si non indexé

### 2. **RGEIndexer** (`services/external-apis/rge-indexer.ts`)
- Recherche dans la base de données locale par SIRET/SIREN
- Indexe les certifications par batch
- Gère les jobs d'import
- Statistiques par département et validité

### 3. **RGEImporter** (`services/external-apis/rge-importer.ts`)
- Télécharge et parse les fichiers CSV/JSON
- Importe progressivement par batch (1000 par défaut)
- Gère les callbacks de progression
- Détection automatique du format

## 💾 Modèles de Base de Données

### `RGECertification`
Stocke les certifications indexées :
- SIRET/SIREN (unique)
- Nom de l'entreprise
- Adresse complète (rue, code postal, ville, département, région)
- Numéro de certification
- Dates (certification, expiration)
- Statut de validité
- Domaines d'activité (JSON array)
- Métadonnées (source, dates d'indexation)

**Index:** siret, siren, department, postalCode, isValid

### `RGEImportJob`
Suit les jobs d'import :
- Statut (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- Progression (0-100%)
- Nombre de lignes traitées
- Messages d'erreur
- Métadonnées de la ressource (URL, format, titre)

## 🚀 Utilisation

### Lancer un import

**Import complet (production) :**
```bash
npm run import-rge
```

**Import limité (test) :**
```bash
npm run import-rge:test
# ou
npm run import-rge -- --max-rows=5000
```

**Via l'API :**
```bash
POST /api/rge/import
{
  "autoDetect": true,
  "maxRows": 1000,  // Optionnel
  "batchSize": 1000 // Optionnel
}
```

### Consulter les statistiques

**Via l'API :**
```bash
GET /api/rge/import
```

**Réponse :**
```json
{
  "success": true,
  "data": {
    "stats": {
      "total": 15000,
      "valid": 14500,
      "expired": 500,
      "byDepartment": {
        "75": 1200,
        "13": 800,
        ...
      }
    },
    "activeJobs": [
      {
        "status": "in_progress",
        "progress": 45.5,
        "totalRows": 10000,
        "processedRows": 4550
      }
    ]
  }
}
```

### Recherche automatique

Lors de l'analyse d'un devis, le système recherche automatiquement dans l'index local :

```typescript
const certification = await rgeService.getRGECertification(siret)
```

**Workflow :**
1. ✅ Recherche dans l'index local (rapide)
2. 🔄 Si non trouvé, recherche via API data.gouv.fr
3. 💾 Si trouvé via API, indexation automatique pour usage futur

## 📊 Format des Données

### Structure RGECertification
```typescript
{
  siret: string           // 14 chiffres
  siren: string          // 9 premiers chiffres
  companyName?: string
  address?: {
    street?: string
    postalCode?: string
    city?: string
    department?: string
    region?: string
    formatted?: string
  }
  certificationNumber?: string
  certificationDate?: string  // ISO 8601
  expiryDate?: string         // ISO 8601
  isValid: boolean
  activities: Array<{
    code: string
    label: string
    validUntil?: string
  }>
  source: string
  verifiedAt: string     // ISO 8601
}
```

### Format CSV/JSON supporté
- **CSV** : Colonnes SIRET, raison sociale, adresse, activités, dates
- **JSON** : Array ou GeoJSON avec propriétés
- **Détection automatique** du format et des colonnes

## 🔍 Recherche Multi-Critères

Le `RGEIndexer` supporte plusieurs critères de recherche :

```typescript
const results = await indexer.searchCertifications({
  siret: '12345678901234',
  siren: '123456789',
  department: '75',
  postalCode: '75001',
  city: 'Paris',
  activity: 'chauffage',
  isValid: true
})
```

## ⚙️ Configuration

### Batch Size
Par défaut, l'import traite **1000 certifications par batch** pour optimiser les performances. Ajustable via `batchSize` dans les options.

### Limites
- Pour les tests : `maxRows` pour limiter le nombre de lignes
- Pour la production : omettre `maxRows` pour importer tout le dataset

### Progression
Les callbacks `onProgress` fournissent :
- `processed` : Nombre de lignes traitées
- `total` : Nombre total de lignes (si connu)
- `percentage` : Pourcentage de progression

## 🐛 Dépannage

### Import échoué
1. Vérifier les logs dans la console
2. Consulter `RGEImportJob` pour le message d'erreur
3. Vérifier la connexion à data.gouv.fr
4. Vérifier l'espace disque et la connexion DB

### Recherche ne trouve rien
1. Vérifier que l'import a été effectué : `GET /api/rge/import`
2. Vérifier que le SIRET est correct (14 chiffres)
3. Essayer une recherche par SIREN (9 chiffres)

### Performance lente
1. Vérifier les index sur `RGECertification`
2. Augmenter le `batchSize` si beaucoup de données
3. Vérifier les statistiques d'indexation

## 📈 Statistiques et Monitoring

### Métriques disponibles
- Total de certifications indexées
- Nombre de certifications valides/expirées
- Répartition par département
- Jobs d'import actifs/inactifs
- Progression en temps réel

### Logs
Tous les logs sont préfixés avec `[RGEService]`, `[RGEIndexer]`, `[RGEImporter]` pour faciliter le debugging.

## 🔄 Mise à jour

Le dataset RGE est mis à jour régulièrement sur data.gouv.fr. Pour mettre à jour l'index :

1. Vérifier les nouvelles ressources : `GET /api/rge/import`
2. Lancer un nouvel import : `POST /api/rge/import`
3. Les nouvelles données écrasent les anciennes (upsert par SIRET)

## 🎯 Cas d'usage

### Analyse de devis
Lors de l'analyse d'un devis, TORP vérifie automatiquement si l'entreprise est certifiée RGE :

1. Extraction du SIRET depuis le devis
2. Recherche dans l'index local (millisecondes)
3. Validation des domaines d'activité requis
4. Impact sur le score TORP (axe Conformité)

### Recherche d'entreprises
L'utilisateur peut rechercher des entreprises certifiées RGE :
- Par localisation (département, ville)
- Par domaine d'activité
- Par statut de certification

## 🔐 Sécurité et Performance

- **Index unique** sur SIRET pour éviter les doublons
- **Upsert** pour les mises à jour sans doublon
- **Batch processing** pour éviter la surcharge DB
- **Lazy loading** pour éviter les dépendances circulaires
- **Gestion d'erreurs** robuste avec fallback API

---

**Dataset source :** [data.gouv.fr - Liste des entreprises RGE](https://www.data.gouv.fr/fr/datasets/liste-des-entreprises-rge/)  
**Dataset ID :** `62bd63b70ff1edf452b83a6b`

