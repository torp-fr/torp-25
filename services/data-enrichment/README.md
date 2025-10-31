# 🔍 Service d'Enrichissement de Données

Ce service enrichit automatiquement les données extraites des devis avec des informations provenant d'APIs externes pour améliorer la précision du scoring TORP.

## 📡 APIs Utilisées

### 1. API Recherche d'Entreprises (Gratuite)
- **Source**: [data.gouv.fr](https://www.data.gouv.fr/fr/datasets/api-recherche-entreprises/)
- **Endpoint**: `https://recherche-entreprises.api.gouv.fr`
- **Clé API**: Non requise (gratuite)
- **Documentation**: https://www.data.gouv.fr/fr/datasets/api-recherche-entreprises/
- **Données**:
  - Informations entreprise (nom, SIRET, adresse)
  - Activités professionnelles
  - Statut juridique

### 2. API Reef Premium (Optionnelle)
- **Source**: Service de prix de référence BTP
- **Endpoint**: `https://api.reef-premium.fr/v1`
- **Clé API**: `REEF_PREMIUM_API_KEY` (optionnel)
- **Données**:
  - Prix de référence matériaux
  - Prix de référence prestations

### 3. API OpenWeather (Optionnelle)
- **Source**: [OpenWeatherMap](https://openweathermap.org/api)
- **Endpoint**: `https://api.openweathermap.org/data/2.5`
- **Clé API**: `OPENWEATHER_API_KEY` (optionnel)
- **Données**:
  - Données météorologiques régionales
  - Impact sur les délais de construction

### 4. API Météo France (Optionnelle)
- **Source**: [Météo France](https://portail-api.meteofrance.fr/)
- **Endpoint**: `https://api.meteofrance.fr/v1`
- **Clé API**: `METEOFRANCE_API_KEY` (optionnel)
- **Données**:
  - Données météorologiques officielles françaises

## 🚀 Utilisation

### Via le service principal

```typescript
import { DataEnrichmentService } from '@/services/data-enrichment/enrichment-service'

const service = new DataEnrichmentService()
const enrichment = await service.enrichDevis(
  extractedData,
  'renovation',
  'plomberie',
  'ILE_DE_FRANCE'
)
```

### Via les routes API

#### Enrichir un devis complet
```bash
POST /api/enrichment/devis
{
  "extractedData": { ... },
  "projectType": "renovation",
  "tradeType": "plomberie",
  "region": "ILE_DE_FRANCE"
}
```

#### Enrichir une entreprise
```bash
GET /api/enrichment/company?siret=12345678901234
GET /api/enrichment/company?name=Entreprise%20BTP
```

#### Récupérer les prix de référence
```bash
GET /api/enrichment/prices?category=renovation&region=ILE_DE_FRANCE&item=plomberie
```

## ⚙️ Configuration

### Variables d'environnement

Ajoutez dans votre `.env` :

```env
# API Reef Premium (optionnel)
REEF_PREMIUM_API_KEY=votre_cle_reef_premium
REEF_PREMIUM_API_URL=https://api.reef-premium.fr/v1

# API OpenWeather (optionnel)
OPENWEATHER_API_KEY=votre_cle_openweather

# API Météo France (optionnel)
METEOFRANCE_API_KEY=votre_cle_meteofrance
```

### Obtention des clés API

1. **Reef Premium**:
   - Contactez Reef Premium pour obtenir une clé API
   - Documentation: [https://reef-premium.fr/api](https://reef-premium.fr/api)

2. **OpenWeather**:
   - Créez un compte sur [OpenWeatherMap](https://openweathermap.org/api)
   - Génère une clé API gratuite (limite: 1000 appels/jour)

3. **Météo France**:
   - Créez un compte sur [Portail API Météo France](https://portail-api.meteofrance.fr/)
   - Génère une clé API (gratuite avec limitations)

## 🔄 Intégration Automatique

L'enrichissement est **automatiquement appelé** lors de l'analyse d'un devis via `/api/llm/analyze`:

1. Analyse initiale du document avec Claude AI
2. Enrichissement des données via les APIs externes
3. Analyse finale avec les données enrichies pour un scoring plus précis

## 📊 Données Enrichies

- ✅ **Entreprise**: Vérification SIRET, informations légales
- ✅ **Prix**: Comparaison avec les prix de référence du marché
- ✅ **Régional**: Benchmark par rapport aux prix régionaux
- ✅ **Conformité**: Vérification des normes et réglementations
- ✅ **Météo**: Impact météorologique sur les délais

## 🛡️ Gestion d'Erreurs

Le système continue de fonctionner même si certaines APIs échouent:
- Les données enrichies sont optionnelles
- En cas d'erreur, le système utilise des données de fallback
- Les analyses continuent avec les données disponibles

## 🔧 Fallback

Si les APIs externes ne sont pas disponibles, le système utilise:
- **Prix**: Prix moyens régionaux estimés
- **Météo**: Statistiques moyennes par région
- **Conformité**: Base de données locale des normes

