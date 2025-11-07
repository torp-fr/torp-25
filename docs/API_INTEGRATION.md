# Intégration des APIs Externes

Ce document décrit l'intégration des APIs externes utilisées pour l'enrichissement des données entreprises dans la plateforme TORP.

## 📋 Table des matières

1. [APIs d'Avis Clients](#apis-davis-clients)
2. [APIs de Données Entreprises](#apis-de-données-entreprises)
3. [Configuration](#configuration)
4. [Tests](#tests)
5. [Troubleshooting](#troubleshooting)

---

## 🌟 APIs d'Avis Clients

### Google Places API

**Status:** ✅ Configuré
**Authentification:** Clé API requise
**Poids dans l'agrégation:** 40%

#### Configuration

```bash
GOOGLE_PLACES_API_KEY=votre_clé_api
```

#### Documentation
- URL: https://developers.google.com/maps/documentation/places/web-service
- Console: https://console.cloud.google.com/apis/credentials

#### Utilisation

```typescript
import { ReviewsAggregator } from '@/services/external-apis/reviews-aggregator'

const aggregator = new ReviewsAggregator()
const reviews = await aggregator.aggregateReviews(
  'Nom Entreprise',
  '12345678901234', // SIRET (optionnel)
  'Ville'
)
```

#### Limites
- Quota quotidien selon votre plan Google Cloud
- Maximum 5 avis récents par établissement (limitation API)

---

### Trustpilot API

**Status:** ⚠️ Non configuré
**Authentification:** Clé API requise
**Poids dans l'agrégation:** 35%

#### Configuration

```bash
TRUSTPILOT_API_KEY=votre_clé_api
```

#### Documentation
- URL: https://developers.trustpilot.com/

---

### Avis Eldo

**Status:** ⚠️ Non configuré
**Authentification:** Clé API requise
**Poids dans l'agrégation:** 25%

#### Configuration

```bash
ELDO_API_KEY=votre_clé_api
```

#### Documentation
- URL: https://www.eldo.fr
- Service spécialisé dans les avis certifiés pour le secteur BTP en France

---

## 🏢 APIs de Données Entreprises

### API Annuaire des Entreprises (data.gouv.fr)

**Status:** ✅ Fonctionnel
**Authentification:** ❌ Aucune clé requise
**Base URL:** `https://recherche-entreprises.api.gouv.fr`

#### Données fournies
- SIRET / SIREN
- Dénomination sociale
- Adresse complète
- Code APE/NAF et libellé activité
- Forme juridique
- Date de création
- État administratif

#### Utilisation

```typescript
import { AnnuaireEntreprisesService } from '@/services/external-apis/annuaire-entreprises-service'

const service = new AnnuaireEntreprisesService()
const company = await service.searchBySiret('12345678901234')
```

#### Avantages
- API publique gratuite
- Données officielles et à jour
- Aucune limite de requêtes
- Pas d'authentification nécessaire

---

### API INSEE Sirene

**Status:** ⚠️ Requiert authentification (401 Unauthorized)
**Authentification:** Clé API requise
**Base URL:** `https://api.insee.fr/api-sirene/3.11`

#### Configuration

```bash
INSEE_API_KEY=votre_clé_api
```

#### Documentation
- URL: https://api.insee.fr/catalogue/
- Inscription: https://api.insee.fr/

#### Note importante
⚠️ L'API Annuaire des Entreprises est utilisée en fallback et fournit les mêmes données sans authentification.

---

### API Infogreffe (OpenDataSoft)

**Status:** ✅ Implémenté
**Authentification:** ⚪ Optionnelle
**Base URL:** `https://opendata.datainfogreffe.fr/api/explore/v2.1`

#### Configuration (optionnel)

```bash
INFOGREFFE_API_KEY=votre_clé_api
```

#### Documentation
- Swagger: https://opendata.datainfogreffe.fr/api/explore/v2.1/swagger.json
- Format: OpenDataSoft Explore API v2.1

#### Datasets disponibles

L'API tente de récupérer les données depuis plusieurs datasets :
1. `comptes-annuels` - Comptes annuels des entreprises
2. `entreprises` - Informations générales
3. `bilans` - Bilans comptables

#### Données fournies
- **Financières:**
  - Chiffre d'affaires (historique)
  - Résultat net (historique)
  - EBITDA
  - Capital social
  - Dettes (court et long terme)
  - Évolution des indicateurs

- **Juridiques:**
  - Statut juridique
  - Procédures collectives (sauvegarde, redressement, liquidation)
  - Mandataires sociaux
  - Modifications récentes

#### Utilisation

```typescript
import { InfogreffeService } from '@/services/external-apis/infogreffe-service'

const service = new InfogreffeService()
const data = await service.getCompanyData('123456789') // SIREN (9 chiffres)
```

#### Exemple de réponse

```typescript
{
  siren: '123456789',
  financial: {
    turnover: {
      lastYear: 1500000,
      previousYear: 1200000,
      evolution: 25, // +25%
      years: [
        { year: 2023, amount: 1500000 },
        { year: 2022, amount: 1200000 }
      ]
    },
    netResult: {
      lastYear: 150000,
      previousYear: 100000,
      evolution: 50
    },
    capital: 50000
  },
  legal: {
    collectiveProcedures: [], // Aucune procédure
    representatives: [
      {
        role: 'Président',
        firstName: 'Jean',
        lastName: 'Dupont'
      }
    ]
  },
  sources: ['Infogreffe OpenDataSoft (comptes-annuels)'],
  lastUpdated: '2024-11-07T...',
  available: true
}
```

---

### API BODACC (Bulletin Officiel)

**Status:** ✅ Fonctionnel
**Authentification:** ❌ Aucune clé requise
**Base URL:** `https://public.opendatasoft.com/api/explore/v2.1`

#### Données fournies
- Procédures collectives officielles
- Radiations d'entreprises
- Créations d'entreprises
- Publications légales

#### Utilisation

```typescript
import { BodaccService } from '@/services/external-apis/bodacc-service'

const service = new BodaccService()
const procedures = await service.searchCollectiveProcedures('123456789')
```

---

### API RGE (Certifications environnementales)

**Status:** ✅ Fonctionnel
**Authentification:** ❌ Aucune clé requise
**Base URL:** `https://data.ademe.fr/data-fair/api/v1`

#### Données fournies
- Certifications RGE actives
- Qualifications professionnelles BTP
- Domaines de travaux certifiés
- Dates de validité

---

## ⚙️ Configuration

### Fichier .env

Créer un fichier `.env` à la racine du projet :

```bash
# ============================================================================
# Configuration des clés API pour l'enrichissement des données entreprises
# ============================================================================

# AVIS CLIENTS
GOOGLE_PLACES_API_KEY=AIzaSy...
# TRUSTPILOT_API_KEY=
# ELDO_API_KEY=

# DONNÉES ENTREPRISES
# INSEE_API_KEY=
# INFOGREFFE_API_KEY=
```

**Note:** Le fichier `.env` est automatiquement ignoré par Git (`.gitignore`)

### Chargement des variables

#### Dans Next.js (côté serveur)
Les variables sont automatiquement chargées par Next.js.

#### Dans les scripts de test
```typescript
import { config } from 'dotenv'
config()
```

---

## 🧪 Tests

### Test Google Reviews

```bash
npx tsx scripts/test-google-reviews.ts "Nom Entreprise" "Ville"
```

**Exemple:**
```bash
npx tsx scripts/test-google-reviews.ts "Leroy Merlin" "Lille"
```

### Test Infogreffe

```bash
npx tsx scripts/test-infogreffe-api.ts [SIREN]
```

**Exemple:**
```bash
npx tsx scripts/test-infogreffe-api.ts 917899833
```

### Test Enrichissement Complet

```bash
npx tsx scripts/test-intelligent-enrichment.ts [SIRET]
```

**Exemple:**
```bash
npx tsx scripts/test-intelligent-enrichment.ts 91789983300029
```

---

## 🔧 Troubleshooting

### Erreur 401 Unauthorized

**Cause:** Clé API manquante ou invalide

**Solution:**
1. Vérifier que la clé API est bien configurée dans `.env`
2. Vérifier que le fichier `.env` est à la racine du projet
3. Pour les scripts, vérifier que `dotenv` est importé et appelé

### Erreur de réseau (EAI_AGAIN)

**Cause:** Impossibilité de résoudre le DNS

**Solutions:**
1. Vérifier la connexion Internet
2. Vérifier que l'URL de l'API est correcte
3. Certains environnements (Docker, CI/CD) peuvent avoir des restrictions réseau

### Aucune donnée retournée

**Cause:** L'entreprise n'existe pas dans la base de données de l'API

**Solutions:**
1. Vérifier que le SIREN/SIRET est valide (9 ou 14 chiffres)
2. Essayer avec un SIREN d'une grande entreprise connue
3. Certaines APIs n'ont pas toutes les entreprises

### Quotas dépassés

**Cause:** Limite de requêtes atteinte

**Solutions:**
1. Vérifier votre plan API (Google Cloud Console)
2. Implémenter un cache pour réduire les appels
3. Ajouter des délais entre les requêtes

---

## 📊 Agrégation des Avis

L'agrégation des avis utilise une pondération intelligente :

- **Google Reviews:** 40% (source la plus utilisée par le grand public)
- **Trustpilot:** 35% (avis certifiés, plateforme reconnue)
- **Avis Eldo:** 25% (spécialisé BTP français)

### Calcul de la note globale

```typescript
note_globale = (google_rating * 0.40) + (trustpilot_rating * 0.35) + (eldo_rating * 0.25)
```

### Insights calculés

- **Taux de recommandation:** % d'avis >= 4 étoiles
- **Taux de réponse:** % d'avis avec réponse de l'entreprise
- **Tendance:** Amélioration, stable, ou déclin (basé sur les 6 derniers mois)

---

## 🔗 Liens Utiles

### Documentation officielle
- [Google Places API](https://developers.google.com/maps/documentation/places/web-service)
- [API Annuaire Entreprises](https://annuaire-entreprises.data.gouv.fr/lp/api)
- [API INSEE Sirene](https://api.insee.fr/catalogue/)
- [OpenDataSoft API](https://help.opendatasoft.com/apis/ods-explore-v2/)

### Console développeur
- [Google Cloud Console](https://console.cloud.google.com/)
- [Trustpilot Developers](https://developers.trustpilot.com/)

---

**Dernière mise à jour:** 2024-11-07
