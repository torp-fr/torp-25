# 🎯 TORP Advanced Scoring System - Documentation Technique

## Vue d'Ensemble

Le système de scoring avancé TORP v2.2 implémente une architecture hiérarchique multi-niveaux complète :

- **9 Axes Principaux** (macro-analyse)
- **48 Sous-critères** (méso-analyse)
- **250+ Points de contrôle** (micro-analyse)
- **Score Total** : 1350 points

## Structure des Axes

### Axe 1 : Conformité Réglementaire & Technique (350 pts)
**Fichier** : `axes/axe1-conformite.ts`

- **1.1 Respect Normes DTU & Standards** (140 pts)
  - DTU Spécifiques Métier (50 pts)
  - Certifications Produits & Marquages (40 pts)
  - Performance Énergétique RE2020 (50 pts)

- **1.2 Qualifications & Certifications** (110 pts)
  - Qualifications Métier Obligatoires (45 pts)
  - Statut Juridique & Conformité (35 pts)
  - Assurances Professionnelles (30 pts)

- **1.3 Sécurité & Accessibilité** (100 pts)
  - Sécurité Incendie (40 pts)
  - Accessibilité PMR (30 pts)
  - Performance Acoustique (30 pts)

### Axe 2 : Analyse Prix & Marché (250 pts)
**Fichier** : `axes/axe2-prix.ts`

- **2.1 Positionnement Tarifaire** (120 pts)
  - Benchmarking Multi-Sources (60 pts)
  - Analyse Ratios Sectoriels (40 pts)
  - Détection Anomalies Tarifaires (20 pts)

- **2.2 Optimisation Valeur** (80 pts)
  - Rapport Qualité/Prix (50 pts)
  - Potentiel Négociation (30 pts)

- **2.3 Intelligence Financière** (50 pts)
  - Modalités Paiement (25 pts)
  - Optimisation Fiscale (25 pts)

### Axe 3 : Qualité & Réputation Entreprise (200 pts)
**Fichier** : `axes/axe3-qualite.ts`

- **3.1 Solidité Financière** (80 pts)
  - Santé Économique (50 pts)
  - Prédiction Défaillance (30 pts)

- **3.2 Réputation & Références** (70 pts)
  - Satisfaction Client (40 pts)
  - Portfolio & Réalisations (30 pts)

- **3.3 Capital Humain & Organisation** (50 pts)
  - Moyens Humains (30 pts)
  - Moyens Matériels (20 pts)

### Axe 4 : Faisabilité & Cohérence Technique (150 pts)
**Fichier** : `axes/axe4-faisabilite.ts`

- **4.1 Pertinence Solutions** (70 pts)
  - Adéquation Technique (40 pts)
  - Innovation Maîtrisée (30 pts)

- **4.2 Réalisme Exécution** (50 pts)
  - Planning & Ressources (30 pts)
  - Contraintes Chantier (20 pts)

- **4.3 Gestion Risques** (30 pts)
  - Identification Risques (20 pts)
  - Mesures Préventives (10 pts)

### Axe 5 : Transparence & Communication (100 pts)
**Fichier** : `axes/axe5-transparence.ts`

- **5.1 Qualité Documentation** (50 pts)
  - Clarté Devis (30 pts)
  - Plans & Techniques (20 pts)

- **5.2 Relation Client** (30 pts)
  - Professionnalisme (20 pts)
  - Réactivité (10 pts)

- **5.3 Suivi Projet** (20 pts)
  - Accompagnement (15 pts)
  - Service Après-Vente (5 pts)

### Axe 6 : Garanties & Assurances (80 pts)
**Fichier** : `axes/axe6-garanties.ts`

- **6.1 Couvertures Légales** (50 pts)
  - Garanties Obligatoires (35 pts)
  - Assurances Professionnelles (15 pts)

- **6.2 Extensions & Garanties Commerciales** (30 pts)
  - Garanties Étendues (20 pts)
  - Protection Financière (10 pts)

### Axe 7 : Innovation & Développement Durable (50 pts)
**Fichier** : `axes/axe7-innovation.ts`

- **7.1 Performance Environnementale** (30 pts)
  - Solutions Bas Carbone (20 pts)
  - Démarche Écologique (10 pts)

- **7.2 Innovation Technique** (20 pts)
  - Technologies Avancées (15 pts)
  - Veille & Formation (5 pts)

### Axe 8 : Gestion Projet & Délais (70 pts)
**Fichier** : `axes/axe8-delais.ts`

- **8.1 Réalisme Planning** (40 pts)
  - Cohérence Temporelle (25 pts)
  - Coordination Métiers (15 pts)

- **8.2 Capacité Respect Délais** (30 pts)
  - Historique Performance (20 pts)
  - Engagement Contractuel (10 pts)

### Axe 9 : Cohérence Demande/Devis (150 pts) 🆕
**Fichier** : `axes/axe9-coherence.ts`

- **9.1 Adéquation à la Demande** (70 pts)
  - Travaux demandés présents dans devis (40 pts)
  - Solutions proposées répondent au besoin (20 pts)
  - Respect contraintes exprimées (10 pts)

- **9.2 Analyse des Écarts** (50 pts)
  - Détection éléments manquants (25 pts)
  - Détection éléments superflus (25 pts)

- **9.3 Compréhension du Besoin** (30 pts)
  - Pertinence de la solution vs problème (15 pts)
  - Justification des choix techniques (10 pts)
  - Clarté de la réponse au besoin (5 pts)

**Note**: L'Axe 9 nécessite les données du wizard de cohérence (CCF). Si ces données ne sont pas fournies, le score sera de 0/150 avec des recommandations pour utiliser le wizard lors du prochain upload.

## Utilisation

```typescript
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'
import { AdvancedEnrichmentService } from '@/services/data-enrichment/advanced-enrichment-service'

// 1. Enrichir les données
const enrichmentService = new AdvancedEnrichmentService()
const enrichmentData = await enrichmentService.enrichForScoring(
  extractedData,
  'renovation',
  'plomberie',
  'ILE_DE_FRANCE'
)

// 2. Calculer le score
const scoringEngine = new AdvancedScoringEngine()
const score = await scoringEngine.calculateScore(
  devis,
  enrichmentData,
  {
    profile: 'B2C', // ou 'B2B'
    projectType: 'renovation',
    projectAmount: 'medium', // 'low', 'medium', 'high'
    region: 'ILE_DE_FRANCE',
    tradeType: 'plomberie'
  }
)

// 3. Utiliser les résultats
console.log(`Score: ${score.totalScore}/1350 (${score.grade})`)
console.log(`Confiance: ${score.confidenceLevel}%`)
console.log(`Alertes: ${score.overallAlerts.length}`)
console.log(`Recommandations: ${score.overallRecommendations.length}`)
```

## Pondération Adaptative

Le système applique automatiquement une pondération différente selon le profil :

### Profil B2C (Particuliers)
- Conformité : 35% (+6%)
- Qualité Entreprise : 22% (+5%)
- Transparence : 15% (+7%)
- Garanties : 10% (+3%)
- Prix : 18% (-3%)

### Profil B2B (Professionnels)
- Prix & Marché : 28% (+7%)
- Faisabilité Technique : 18% (+6%)
- Innovation Durable : 8% (+4%)
- Gestion Délais : 10% (+4%)
- Conformité : 26% (-3%)

## Grades

- **A+** (1215-1350) : 🏆 Excellence (≥90%)
- **A** (1080-1214) : ⭐ Très bien (≥80%)
- **B** (945-1079) : ✅ Satisfaisant (≥70%)
- **C** (810-944) : ⚠️ Moyen (≥60%)
- **D** (675-809) : 🔍 Problématique (≥50%)
- **E** (<675) : 🚨 Déconseillé (<50%)

## Données Requises

Chaque axe nécessite des données spécifiques depuis `ScoringEnrichmentData` :

- **Company** : Données entreprise (SIRET, financières, réputation)
- **PriceReferences** : Prix de référence marché
- **RegionalData** : Données régionales (médiane prix, etc.)
- **ComplianceData** : Normes, DTU, certifications
- **WeatherData** : Données météo (délais réalistes)
- **DTUs** : Liste des DTU applicables
- **Certifications** : Certifications entreprise

## Extension

Pour ajouter un nouveau critère ou point de contrôle :

1. Ajouter le calcul dans l'axe approprié
2. Mettre à jour les types dans `types.ts` si nécessaire
3. Documenter dans ce README
4. Tester avec des devis réels

## Performance

- **Temps de calcul** : ~500-1000ms par devis (avec enrichissement)
- **Cache recommandé** : Résultats scoring pour devis identiques
- **Parallélisation** : Possible sur plusieurs axes simultanément

