# 🎯 TORP Advanced Scoring System - Documentation Technique

## 📐 Architecture Générale

### Structure Hiérarchique Multi-Niveaux

```
Score Total : 1200 points
├── Niveau 1 : 8 Axes Principaux (macro-analyse)
├── Niveau 2 : 45 Sous-critères (méso-analyse)
└── Niveau 3 : 250+ Points de contrôle (micro-analyse)
```

### Pondération Adaptative par Profil

- **B2C (Particuliers)** : Sécurisation + Prix + Transparence
- **B2B (Professionnels)** : Conformité + Innovation + Performance

## 🔍 Détail des 8 Axes

### AXE 1 : CONFORMITÉ RÉGLEMENTAIRE & TECHNIQUE (350 points - 29%)

#### 1.1 Respect Normes DTU & Standards (140 points)

**DTU Spécifiques Métier (50 points)**
- Identification automatique DTU applicables (15 pts)
  - Données : Corps d'état détectés, type travaux, localisation
  - Source : Base CSTB, analyse NLP du devis
  - Algorithme : Mapping automatique métier → DTU via IA

- Cohérence matériaux/techniques préconisées (20 pts)
  - Données : Spécifications matériaux, techniques de mise en œuvre
  - Source : Descriptif devis, fiches techniques produits
  - Algorithme : Validation croisée matériaux ↔ DTU ↔ techniques

- Respect clauses techniques obligatoires (15 pts)
  - Données : Clauses DTU, descriptif technique détaillé
  - Source : Base DTU CSTB, analyse sémantique devis
  - Algorithme : Score de conformité par clause critique

**Certifications Produits & Marquages (40 points)**
- Vérification marquage CE automatique (15 pts)
- Conformité normes NF/ACERMI (15 pts)
- Traçabilité certifications (10 pts)

**Performance Énergétique RE2020 (50 points)**
- Seuils réglementaires Bbio/Cep/Cepnr (30 pts)
- Impact carbone Ic énergie/composants (20 pts)

#### 1.2 Qualifications & Certifications Entreprise (110 points)

**Qualifications Métier Obligatoires (45 points)**
- Qualification Qualibat/Qualifelec adaptée (20 pts)
- Niveau qualification suffisant (15 pts)
- Certifications RGE si applicable (10 pts)

**Statut Juridique & Conformité (35 points)**
- SIRET valide et activité correspondante (15 pts)
- Situation fiscale et sociale régulière (10 pts)
- Absence procédures collectives (10 pts)

**Assurances Professionnelles (30 points)**
- RC Décennale valide et couvrante (20 pts)
- RC Professionnelle appropriée (10 pts)

#### 1.3 Sécurité & Accessibilité (100 points)

- Sécurité Incendie (40 pts)
- Accessibilité PMR (30 pts)
- Performance Acoustique (30 pts)

### AXE 2 : ANALYSE PRIX & MARCHÉ (250 points - 21%)

#### 2.1 Positionnement Tarifaire (120 points)

**Benchmarking Multi-Sources (60 points)**
- Position vs médiane régionale (30 pts)
- Cohérence prix unitaires (20 pts)
- Adaptation contexte géographique (10 pts)

**Analyse Ratios Sectoriels (40 points)**
- Répartition matériaux/main d'œuvre (20 pts)
- Marge entreprise estimée (10 pts)
- Évolution temporelle prix (10 pts)

**Détection Anomalies Tarifaires (20 points)**
- Alertes prix aberrants (15 pts)
- Incohérences internes devis (5 pts)

#### 2.2 Optimisation Valeur (80 points)

- Rapport Qualité/Prix (50 pts)
- Potentiel Négociation (30 pts)

#### 2.3 Intelligence Financière (50 points)

- Modalités Paiement (25 pts)
- Optimisation Fiscale (25 pts)

### AXE 3 : QUALITÉ & RÉPUTATION ENTREPRISE (200 points - 17%)

#### 3.1 Solidité Financière (80 points)

- Santé Économique (50 pts)
  - Évolution chiffre d'affaires (20 pts)
  - Résultats financiers (15 pts)
  - Capacité projet (15 pts)

- Prédiction Défaillance (30 pts)
  - Score risque Banque de France (15 pts)
  - Modèle prédictif TORP (15 pts)

#### 3.2 Réputation & Références (70 points)

- Satisfaction Client (40 pts)
- Portfolio & Réalisations (30 pts)

#### 3.3 Capital Humain & Organisation (50 points)

- Moyens Humains (30 pts)
- Moyens Matériels (20 pts)

### AXE 4 : FAISABILITÉ & COHÉRENCE TECHNIQUE (150 points - 12%)

#### 4.1 Pertinence Solutions (70 points)

- Adéquation Technique (40 pts)
- Innovation Maîtrisée (30 pts)

#### 4.2 Réalisme Exécution (50 points)

- Planning & Ressources (30 pts)
- Contraintes Chantier (20 pts)

#### 4.3 Gestion Risques (30 points)

- Identification Risques (20 pts)
- Mesures Préventives (10 pts)

### AXE 5 : TRANSPARENCE & COMMUNICATION (100 points - 8%)

#### 5.1 Qualité Documentation (50 points)

- Clarté Devis (30 pts)
- Plans & Techniques (20 pts)

#### 5.2 Relation Client (30 points)

- Professionnalisme (20 pts)
- Réactivité (10 pts)

#### 5.3 Suivi Projet (20 points)

- Accompagnement (15 pts)
- Service Après-Vente (5 pts)

### AXE 6 : GARANTIES & ASSURANCES (80 points - 7%)

#### 6.1 Couvertures Légales (50 points)

- Garanties Obligatoires (35 pts)
- Assurances Professionnelles (15 pts)

#### 6.2 Extensions & Garanties Commerciales (30 points)

- Garanties Étendues (20 pts)
- Protection Financière (10 pts)

### AXE 7 : INNOVATION & DÉVELOPPEMENT DURABLE (50 points - 4%)

#### 7.1 Performance Environnementale (30 points)

- Solutions Bas Carbone (20 pts)
- Démarche Écologique (10 pts)

#### 7.2 Innovation Technique (20 points)

- Technologies Avancées (15 pts)
- Veille & Formation (5 pts)

### AXE 8 : GESTION PROJET & DÉLAIS (70 points - 6%)

#### 8.1 Réalisme Planning (40 points)

- Cohérence Temporelle (25 pts)
- Coordination Métiers (15 pts)

#### 8.2 Capacité Respect Délais (30 points)

- Historique Performance (20 pts)
- Engagement Contractuel (10 pts)

## 🔗 Sources de Données & APIs

### APIs Publiques Officielles (Gratuites)

✅ **INSEE Sirene** (data.gouv.fr)
- Endpoint : `https://recherche-entreprises.api.gouv.fr`
- Clé API : Non requise
- Données : SIRET, activité, adresse, statut juridique

✅ **BODACC** (data.gouv.fr)
- Procédures collectives
- Avis de procédures judiciaires

✅ **Data.gouv.fr**
- Datasets multiples
- APIs variées selon besoins

### APIs Sectorielles (Optionnelles - Clés API requises)

🔑 **Infogreffe**
- Variables : `INFOGREFFE_API_KEY`, `INFOGREFFE_API_URL`
- Données : Bilans comptables, procédures, dirigeants

🔑 **Pappers.fr**
- Variables : `PAPPERS_API_KEY`, `PAPPERS_API_URL`
- Données : Enrichissement entreprises, scores

🔑 **Qualibat**
- Certifications métiers
- Qualifications professionnelles

🔑 **CSTB Premium**
- Base DTU complète
- Guides techniques

🔑 **Reef Premium**
- Variables : `REEF_PREMIUM_API_KEY`, `REEF_PREMIUM_API_URL`
- Prix de référence matériaux/prestations

### APIs Météo (Optionnelles)

🔑 **OpenWeather**
- Variables : `OPENWEATHER_API_KEY`
- Données météorologiques réelles

🔑 **Météo France**
- Variables : `METEOFRANCE_API_KEY`
- Données officielles françaises

## 🚀 Utilisation

### Enrichissement Automatique

L'enrichissement est **automatiquement appelé** lors de l'upload d'un devis :

```typescript
// Dans app/api/llm/analyze/route.ts
const enrichmentService = new AdvancedEnrichmentService()
const enrichmentData = await enrichmentService.enrichForScoring(
  extractedData,
  'renovation',
  'plomberie',
  'ILE_DE_FRANCE'
)
```

### Scoring Avancé

```typescript
import { AdvancedScoringEngine } from '@/services/scoring/advanced/advanced-scoring-engine'

const engine = new AdvancedScoringEngine()
const score = await engine.calculateScore(
  devis,
  enrichmentData,
  {
    profile: 'B2C',
    projectType: 'renovation',
    projectAmount: 'medium',
    region: 'ILE_DE_FRANCE'
  }
)
```

## ⚙️ Configuration

### Variables d'Environnement

```env
# APIs Enrichissement (Optionnelles)
INFOGREFFE_API_KEY=votre_cle
INFOGREFFE_API_URL=https://api.infogreffe.fr/v1

PAPPERS_API_KEY=votre_cle
PAPPERS_API_URL=https://api.pappers.fr/v2

REEF_PREMIUM_API_KEY=votre_cle
REEF_PREMIUM_API_URL=https://api.reef-premium.fr/v1

OPENWEATHER_API_KEY=votre_cle
METEOFRANCE_API_KEY=votre_cle
```

**Note** : L'API Sirene (data.gouv.fr) fonctionne **sans clé API** - elle est gratuite et directement utilisable.

## 📊 Recommandations Automatiques

Le système génère des recommandations actionnables selon le grade :

- **Grade A+** : Validation rapide, marge négociation 2-5%
- **Grade A** : Négociations mineures, marge 5-10%
- **Grade B** : Vérifications ciblées, marge 10-15%
- **Grade C** : Analyse approfondie, renégociation 15-20%
- **Grade D/E** : Recherche alternatives, due diligence

## 🔄 Roadmap d'Implémentation

### Phase 1 - Core Engine (8 semaines) ✅ EN COURS
- Axes 1-3 : Conformité + Prix + Qualité
- APIs de base : INSEE, Infogreffe (fallback)
- Scoring simple avec seuils fixes

### Phase 2 - Intelligence Avancée (12 semaines)
- Axes 4-5 : Faisabilité + Transparence
- Machine Learning : Modèles prédictifs
- Pondération adaptative B2C/B2B

### Phase 3 - Expertise Complète (16 semaines)
- Axes 6-8 : Garanties + Innovation + Délais
- NLP avancé : Analyse sémantique complète
- Auto-apprentissage : Optimisation continue

### Phase 4 - Écosystème (20 semaines)
- APIs partenaires : Fabricants, distributeurs
- Marketplace : Recommandations entreprises
- IA générative : Conseils personnalisés

