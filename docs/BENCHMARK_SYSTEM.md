# 🎯 Système de Benchmark TORP

## Vue d'Ensemble

Le système de benchmark TORP permet de mesurer, valider et améliorer la performance de l'algorithme de scoring à travers des métriques précises et justifiées.

## 📊 Métriques Mesurées

### 1. Précision (Accuracy)

**Score Prediction Accuracy**
- **Mesure** : Écart moyen entre les scores prédits et les scores validés manuellement
- **Objectif** : ≥ 85%
- **Justification** : Une précision élevée garantit la fiabilité des recommandations

**Grade Prediction Accuracy**
- **Mesure** : Pourcentage de grades correctement prédits (A, B, C, D, E)
- **Objectif** : ≥ 80%
- **Justification** : Les grades sont l'interface principale pour l'utilisateur

**Price Estimation Accuracy**
- **Mesure** : Précision des estimations de prix vs prix réels du marché
- **Objectif** : ≥ 75%
- **Justification** : Important pour la valorisation immobilière

### 2. Cohérence (Consistency)

**Score Stability**
- **Mesure** : Variance des scores pour le même devis évalué plusieurs fois
- **Objectif** : ≥ 90%
- **Justification** : Un algorithme fiable doit donner des résultats reproductibles

**Inter-Rater Reliability**
- **Mesure** : Concordance entre différents évaluateurs manuels
- **Objectif** : ≥ 75%
- **Justification** : Mesure la validité des critères d'évaluation

**Temporal Consistency**
- **Mesure** : Stabilité des scores dans le temps (même devis, différentes périodes)
- **Objectif** : ≥ 85%
- **Justification** : Les critères doivent rester stables sauf changement de données

### 3. Qualité des Données (Data Quality)

**Data Completeness**
- **Mesure** : Pourcentage de champs remplis vs champs requis
- **Objectif** : ≥ 70%
- **Justification** : Des données complètes permettent un scoring précis

**Data Freshness**
- **Mesure** : Âge moyen des données utilisées (en jours)
- **Objectif** : ≤ 30 jours
- **Justification** : Les données récentes sont plus pertinentes pour le scoring

**Source Reliability**
- **Mesure** : Nombre moyen de sources par devis
- **Objectif** : ≥ 3 sources
- **Justification** : Multiplier les sources augmente la fiabilité

**Enrichment Success Rate**
- **Mesure** : Pourcentage de devis avec au moins une source enrichie
- **Objectif** : ≥ 60%
- **Justification** : L'enrichissement améliore significativement la qualité

### 4. Performance Algorithmique

**Scoring Speed**
- **Mesure** : Temps moyen de calcul du score (millisecondes)
- **Objectif** : ≤ 2000ms
- **Justification** : Temps de réponse acceptable pour l'utilisateur

**Criteria Coverage**
- **Mesure** : Pourcentage de critères évalués sur le total disponible
- **Objectif** : ≥ 80%
- **Justification** : Couverture maximale pour scoring complet

**False Positive Rate**
- **Mesure** : Taux de devis marqués comme "mauvais" qui sont en réalité acceptables
- **Objectif** : ≤ 5%
- **Justification** : Minimiser les rejets à tort

**False Negative Rate**
- **Mesure** : Taux de devis marqués comme "bons" qui sont en réalité problématiques
- **Objectif** : ≤ 8%
- **Justification** : Plus critique que les faux positifs (risque utilisateur)

### 5. Impact Business

**User Satisfaction**
- **Mesure** : Score de satisfaction moyen (1-5 ou 1-10)
- **Objectif** : ≥ 4/5 ou ≥ 7/10
- **Justification** : Mesure l'utilité perçue par l'utilisateur

**Recommendation Accuracy**
- **Mesure** : Pourcentage de recommandations suivies et utiles
- **Objectif** : ≥ 70%
- **Justification** : Les recommandations doivent être actionnables

**Alert Precision**
- **Mesure** : Pourcentage d'alertes réellement pertinentes
- **Objectif** : ≥ 80%
- **Justification** : Éviter l'alert fatigue

## 🔧 Utilisation

### Exécution d'un Benchmark

```bash
# Benchmark sur les 100 derniers devis
GET /api/benchmark?sampleSize=100

# Benchmark sur une période spécifique
GET /api/benchmark?sampleSize=50&startDate=2024-01-01&endDate=2024-12-31
```

### Résultat Type

```json
{
  "success": true,
  "data": {
    "timestamp": "2024-01-31T10:00:00Z",
    "version": "1.0.0",
    "metrics": {
      "accuracy": {
        "scorePredictionAccuracy": 87.5,
        "gradePredictionAccuracy": 82.0,
        "priceEstimationAccuracy": 78.3
      },
      "consistency": {
        "scoreStability": 91.2,
        "interRaterReliability": 76.5,
        "temporalConsistency": 88.7
      },
      "dataQuality": {
        "dataCompleteness": 72.5,
        "dataFreshness": 18.5,
        "sourceReliability": 65.0,
        "enrichmentSuccessRate": 68.2
      },
      "algorithmPerformance": {
        "scoringSpeed": 1250,
        "criteriaCoverage": 95,
        "falsePositiveRate": 4.2,
        "falseNegativeRate": 6.8
      },
      "businessImpact": {
        "userSatisfaction": 4.2,
        "recommendationAccuracy": 75.0,
        "alertPrecision": 82.5
      }
    },
    "sampleSize": 100,
    "recommendations": [
      "Améliorer la précision de prédiction des scores (actuellement 87.5%)",
      "Augmenter le nombre de sources de données par devis"
    ]
  }
}
```

## 📈 Stratégie d'Amélioration Continue

### 1. Collecte de Données de Validation

- **Annotation manuelle** : Créer un corpus de devis annotés par des experts
- **Feedback utilisateur** : Collecter les retours sur les scores et recommandations
- **Suivi temporel** : Comparer les prédictions avec les résultats réels

### 2. Amélioration des Sources de Données

**Priorités** :
1. ✅ **API DVF** : Intégration complète pour estimations immobilières
2. ✅ **API Infogreffe** : Données financières entreprises (FAIT)
3. 🔄 **Parsing RNB** : Indexation locale des DPE
4. 🔄 **Parsing PLU** : Traitement des GeoJSON/Shapefiles
5. 📋 **Reef Premium** : Prix de référence (si disponible)

**Sources à Intégrer** :
- API Réseaux (Enedis, GRDF, etc.)
- Base de données DTU complète
- Certifications Qualibat/RGE
- Référentiels prix matériaux (ACERMI, etc.)

### 3. Optimisation de l'Algorithme

**Ajustements Ponderations** :
- Analyse des corrélations entre critères
- Machine learning pour optimisation automatique des poids
- A/B testing des configurations

**Amélioration Critères** :
- Validation des seuils de scoring
- Ajout de critères spécifiques métier
- Adaptation régionale (pondérations par région)

### 4. Monitoring Continu

**Tableau de bord** :
- Métriques en temps réel
- Alertes sur dégradation performance
- Tendances et évolutions

**Rapports Automatiques** :
- Benchmark hebdomadaire
- Rapport mensuel avec recommandations
- Audit trimestriel complet

## 🎯 Objectifs 2024

| Métrique | Actuel | Objectif Q1 | Objectif Q2 | Objectif Q3 |
|----------|--------|-------------|-------------|-------------|
| Score Prediction Accuracy | 75% | 80% | 85% | 90% |
| Data Completeness | 60% | 70% | 75% | 80% |
| Enrichment Success Rate | 50% | 60% | 70% | 75% |
| Scoring Speed | 2500ms | 2000ms | 1500ms | 1000ms |
| User Satisfaction | 3.5/5 | 4.0/5 | 4.2/5 | 4.5/5 |

## 📚 Références

- Documentation TORP Scoring : `services/scoring/`
- Sources de données : `docs/REAL_DATA_SOURCES.md`
- Architecture avancée : `services/scoring/advanced/README.md`

