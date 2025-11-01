# 🔄 Système de Scraping et Collecte de Données - TORP

## Vue d'Ensemble

Le système de scraping interne permet d'enrichir automatiquement la base de données sans surcharger le flux principal, avec planification horaire et traitement par batch.

## 🔧 Architecture

### 1. Data Scraper Service

**Fichier**: `services/scraping/data-scraper.ts`

**Fonctionnalités**:
- Queue de tâches avec priorités (low, medium, high)
- Traitement par batch (10 tâches max par exécution)
- Intervalle minimum de 15 minutes entre batches
- Retry automatique avec backoff exponentiel
- Cache pour éviter les doublons

**Types de scraping**:
- `price`: Données de prix par catégorie/région
- `cadastre`: Données cadastrales par adresse
- `georisques`: Risques naturels par adresse
- `company`: Données entreprise par SIRET
- `compliance`: Données de conformité (DTU, normes)

### 2. Training Data Collector

**Fichier**: `services/training/data-collector.ts`

**Fonctionnalités**:
- Collecte automatique depuis devis existants
- Extraction de features ML
- Validation et nettoyage des données
- Export en JSON pour entraînement
- Calcul de statistiques

### 3. A/B Testing Engine

**Fichier**: `services/ab-testing/ab-test-engine.ts`

**Fonctionnalités**:
- Configuration de tests A/B
- Distribution déterministe (hash-based)
- Comparaison statistique (t-test)
- Recommandations automatiques

## 🚀 Utilisation

### Scraping

**API Endpoints**:
- `POST /api/scraping/process` - Traiter la queue (à appeler périodiquement)
- `GET /api/scraping/process` - Statistiques de la queue

**Script**:
```bash
# Exécuter le scheduler (toutes les heures)
npx tsx scripts/scraping-scheduler.ts
```

**Planification automatique**:
Le scraping est automatiquement programmé lors de la création d'un nouveau devis :
- Entreprise (SIRET) → priorité haute, immédiat
- Prix → priorité moyenne, délai 5 min
- Cadastre → priorité basse, délai 10 min
- Géorisques → priorité basse, délai 15 min

### Collecte de Données d'Entraînement

**API Endpoint**:
```bash
POST /api/training/collect
{
  "limit": 100,
  "startDate": "2024-01-01T00:00:00Z",
  "endDate": "2024-12-31T23:59:59Z"
}
```

**Résultat**:
- Dataset complet avec features ML
- Statistiques détaillées
- Validation automatique
- Prêt pour entraînement

### A/B Testing

**Créer un test**:
```bash
POST /api/ab-test/create
{
  "testId": "ml_vs_baseline",
  "name": "ML vs Baseline",
  "trafficSplit": 0.5,
  "variants": {
    "control": { "useML": false, "version": "2.0.0" },
    "variant": { "useML": true, "version": "2.1.0" }
  }
}
```

**Comparer les résultats**:
```typescript
const comparison = await abEngine.compareTest('ml_vs_baseline')
console.log(`Amélioration: ${comparison.improvement.scoreAccuracy}%`)
console.log(`Recommandation: ${comparison.recommendation}`)
```

## ⚙️ Configuration Cron

### Vercel Cron Jobs

Dans `vercel.json`:
```json
{
  "crons": [
    {
      "path": "/api/scraping/process",
      "schedule": "0 * * * *"
    }
  ]
}
```

### Alternative: Script Node

```bash
# Cron job local (toutes les heures)
0 * * * * cd /path/to/project && npx tsx scripts/scraping-scheduler.ts
```

## 📊 Monitoring

### Statistiques de Queue

```typescript
const stats = globalScraper.getQueueStats()
// {
//   total: 45,
//   pending: 30,
//   inProgress: 5,
//   completed: 8,
//   failed: 2
// }
```

### Logs

Tous les événements sont loggés avec préfixes :
- `[DataScraper]` - Scraping
- `[TrainingCollector]` - Collecte données
- `[ABTestEngine]` - Tests A/B

## 🎯 Workflow Complet

1. **Création Devis** → Scraping programmé automatiquement
2. **Scheduler** → Traite la queue toutes les heures
3. **Collecte** → Données agrégées pour entraînement
4. **Entraînement ML** → Modèles améliorés
5. **A/B Testing** → Validation des améliorations
6. **Déploiement** → Version optimale mise en production

## 📈 Métriques Attendues

| Métrique | Objectif |
|----------|----------|
| Taux de succès scraping | ≥ 85% |
| Temps moyen traitement | < 5s par batch |
| Complétude données enrichies | ≥ 70% |
| Qualité dataset entraînement | ≥ 80% valides |
| Significativité tests A/B | p < 0.05 |

## 🔄 Améliorations Futures

1. **Scraping intelligent**: Prioriser selon criticité
2. **Cache distribué**: Redis pour cache partagé
3. **ML en temps réel**: Entraînement continu
4. **Dashboard monitoring**: Vue en temps réel des queues
5. **Alertes**: Notifications sur échecs critiques

