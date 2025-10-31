# 🏗️ Système d'Indexation Progressive RNB

Ce document décrit le système d'indexation progressive des données RNB (Référentiel National des Bâtiments) dans TORP.

## 📋 Vue d'ensemble

Les fichiers RNB sont volumineux (50-200MB par département). Le système permet de :
- **Indexer progressivement** les fichiers CSV par département
- **Stocker localement** dans PostgreSQL pour recherche rapide
- **Importer à la demande** des bâtiments spécifiques
- **Suivre la progression** des imports avec jobs

## 🏛️ Architecture

### 1. **RNBService** (`services/external-apis/rnb-service.ts`)
- Récupère les métadonnées depuis data.gouv.fr
- Identifie les ressources par département
- Appelle l'indexeur si données disponibles localement

### 2. **RNBIndexer** (`services/external-apis/rnb-indexer.ts`)
- Recherche dans la base de données locale
- Indexe les bâtiments par batch
- Gère les jobs d'import
- Statistiques par département

### 3. **RNBImporter** (`services/external-apis/rnb-importer.ts`)
- Télécharge et parse les fichiers CSV ZIP
- Importe progressivement par batch
- Gère les callbacks de progression

## 💾 Modèles de Base de Données

### `RNBBuilding`
Stocke les données des bâtiments indexés :
- Identifiant RNB original
- Département, code INSEE, commune
- Coordonnées GPS
- Données bâti (année, type, surface)
- Données DPE (classe, consommation, émissions)
- HVD (Haute Valeur Déterminante)

### `RNBImportJob`
Suit les jobs d'import par département :
- Statut (PENDING, IN_PROGRESS, COMPLETED, FAILED, CANCELLED)
- Progression (0-100%)
- Nombre de lignes traitées
- Messages d'erreur

## 🚀 Utilisation

### Recherche dans l'index local

```typescript
import { RNBIndexer } from '@/services/external-apis/rnb-indexer'

const indexer = new RNBIndexer()

// Recherche par code postal
const building = await indexer.searchBuilding(
  '75001',
  undefined,
  undefined
)

// Recherche par adresse
const building2 = await indexer.searchBuilding(
  undefined,
  '1 rue de la Paix, 75001 Paris',
  undefined
)

// Recherche par coordonnées
const building3 = await indexer.searchBuilding(
  undefined,
  undefined,
  { lat: 48.8566, lng: 2.3522 }
)
```

### Import progressif d'un département

```typescript
import { RNBImporter } from '@/services/external-apis/rnb-importer'

const importer = new RNBImporter()

const result = await importer.importDepartment({
  department: '75', // Paris
  maxRows: 10000, // Optionnel : limite pour test
  batchSize: 1000, // Taille des batches
  onProgress: (progress) => {
    console.log(`${progress.percentage}% - ${progress.processed}/${progress.total}`)
  },
})

console.log(`Indexé: ${result.indexed}, Erreurs: ${result.errors}`)
```

### API Routes

#### POST `/api/rnb/import`
Lance l'import d'un département :
```json
{
  "department": "75",
  "maxRows": 10000
}
```

#### GET `/api/rnb/import`
Récupère les jobs actifs et statistiques

#### POST `/api/rnb/search`
Recherche des bâtiments :
```json
{
  "postalCode": "75001",
  "address": "1 rue de la Paix",
  "coordinates": { "lat": 48.8566, "lng": 2.3522 }
}
```

## 📊 Workflow d'Indexation

1. **Lancement** : Appel API `/api/rnb/import` avec département
2. **Job créé** : Status PENDING dans `RNBImportJob`
3. **Téléchargement** : Fichier ZIP depuis data.gouv.fr
4. **Parsing** : Extraction CSV ligne par ligne (streaming)
5. **Indexation** : Batch de 1000 bâtiments dans `RNBBuilding`
6. **Progression** : Mise à jour `progress` et `processedRows`
7. **Completion** : Status COMPLETED ou FAILED

## 🔧 Implémentation Technique

### Parsing CSV (À implémenter)

Le parsing CSV nécessite une bibliothèque comme :
- `csv-parser` : Streaming CSV parser
- `papaparse` : CSV parser avec streaming
- `unzipper` : Décompression ZIP stream

Exemple avec `csv-parser` :
```typescript
import csv from 'csv-parser'
import { createReadStream } from 'fs'
import { pipeline } from 'stream/promises'

const buildings: RNBBuildingData[] = []

await pipeline(
  createReadStream(csvFilePath),
  csv(),
  async function* (source) {
    for await (const row of source) {
      const building = parseCSVRow(row, department)
      if (building) {
        buildings.push(building)
        
        if (buildings.length >= batchSize) {
          await indexer.indexBuildingsBatch(buildings)
          buildings.length = 0
        }
      }
    }
  }
)
```

### Optimisations

- **Index PostgreSQL** : Sur `department`, `codeINSEE`, `postalCode`, `dpeClass`
- **Batch processing** : Traitement par lots de 1000
- **Streaming** : Pas de chargement complet en mémoire
- **Transactions** : Commits par batch pour éviter rollback complet

## 📈 Statistiques

Récupérer les statistiques d'indexation :
```typescript
const stats = await indexer.getIndexingStats()
// { "75": 12345, "92": 6789, ... }
```

## 🎯 Prochaines Étapes

1. **Implémenter le parsing CSV** avec bibliothèque streaming
2. **Ajouter recherche géographique** avec PostGIS (si disponible)
3. **Créer interface admin** pour monitorer les imports
4. **Ajouter filtres avancés** (DPEClass, HVD, année construction)
5. **Optimiser requêtes** avec Full-Text Search PostgreSQL

## 📝 Notes

- Les fichiers CSV sont très volumineux (50-200MB)
- L'import complet d'un département peut prendre plusieurs heures
- Recommandation : Importer progressivement les départements les plus demandés
- Utiliser `maxRows` pour tester avant import complet

