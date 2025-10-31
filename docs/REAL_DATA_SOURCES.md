# 📊 Sources de Données Réelles - TORP

Ce document liste toutes les sources de données réelles utilisées par TORP pour générer des études de faisabilité basées sur des données officielles.

## 🔗 APIs Gouvernementales Utilisées

### 1. API Adresse (data.gouv.fr)
- **URL**: `https://api-adresse.data.gouv.fr`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Géocodage d'adresses, recherche d'adresses
- **Données**: Coordonnées GPS, code postal, ville, département, région
- **Clé API**: Non requise (gratuite)

### 2. API Communes (geo.api.gouv.fr)
- **URL**: `https://geo.api.gouv.fr`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Identification des communes, code INSEE
- **Données**: Code INSEE, nom commune, département, région
- **Clé API**: Non requise (gratuite)

### 3. API Carto IGN - Module Cadastre
- **URL**: `https://apicarto.ign.fr/api/cadastre`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Données cadastrales parcellaires
- **Données**: 
  - Identification de parcelle depuis coordonnées GPS
  - Numéro de parcelle, section
  - Surface (m²)
  - Nature de la parcelle
- **Clé API**: Non requise pour usage basique (gratuite)

### 4. API Géoportail IGN (Optionnelle)
- **URL**: `https://wxs.ign.fr`
- **Statut**: ⚠️ Nécessite clé API
- **Usage**: Données cadastrales avancées (fallback)
- **Clé API**: `GEOPORTAIL_API_KEY` (optionnel)
- **Obtention**: https://geoservices.ign.fr/documentation/geoservices/acces.html

### 5. API Géorisques (géorisques.gouv.fr)
- **URL**: `https://www.georisques.gouv.fr/api/v1`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Zones inondables, risques naturels
- **Données**: 
  - Zones inondables (PPRI, TRI)
  - Risques naturels par commune
- **Clé API**: Non requise (gratuite)

### 6. API Mérimée (Culture.gouv.fr)
- **URL**: `https://api.culture.gouv.fr/open-data/memoire`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Monuments historiques, sites protégés
- **Données**: 
  - Monuments historiques
  - Zones protégées
  - Patrimoine
- **Clé API**: Non requise (gratuite)

### 7. API data.gouv.fr
- **URL**: `https://www.data.gouv.fr/api/1`
- **Statut**: ✅ Réelle et opérationnelle
- **Usage**: Datasets PLU, référentiels publics
- **Données**: 
  - Datasets PLU par commune
  - Référentiels d'entreprises (RGE)
  - Données publiques diverses
- **Clé API**: Non requise (gratuite)

## 📋 Données Récupérées

### Données Cadastrales Réelles
- ✅ Numéro de parcelle (API Carto IGN)
- ✅ Section cadastrale (API Carto IGN)
- ✅ Surface en m² (API Carto IGN)
- ✅ Nature de la parcelle (API Carto IGN)
- ✅ Code INSEE réel (API Communes)

### Contraintes Réelles
- ✅ Zones inondables (API Géorisques)
- ✅ Monuments historiques (API Mérimée)
- ✅ Zones protégées (API Mérimée)
- ⚠️ Sites archéologiques (à enrichir avec source spécifique)

### Données d'Urbanisme
- ✅ PLU depuis data.gouv.fr (datasets réels)
- ✅ Code INSEE pour identification commune
- ⚠️ Parsing fichiers PLU (GeoJSON/Shapefile) - à améliorer

### Connectivité
- ✅ Analyse basée sur type d'adresse (API Adresse)
- ✅ Distance à la route depuis coordonnées
- ✅ Probabilité de disponibilité réseaux (électricité, eau, gaz, égout)

## 🚀 Déploiement

### Variables d'Environnement Requises

```env
# Optionnel - Pour données Géoportail avancées
GEOPORTAIL_API_KEY=votre_cle_geoportail

# Optionnel - Pour certifications Qualibat
QUALIBAT_API_KEY=votre_cle_qualibat
```

### Configuration Minimale

**Aucune clé API requise** pour l'utilisation de base :
- ✅ Géocodage d'adresses
- ✅ Données cadastrales (API Carto IGN)
- ✅ Zones inondables
- ✅ Monuments historiques
- ✅ Données PLU (data.gouv.fr)

### Clés API Recommandées (Optionnelles)

1. **Géoportail IGN** : Pour données cadastrales avancées
   - Lien : https://geoservices.ign.fr/documentation/geoservices/acces.html
   - Avantages : Données plus complètes, historique

2. **Qualibat** : Pour certifications entreprises
   - Contact : https://www.qualibat.com
   - Avantages : Vérification certifications RGE, Qualibat

## ✅ Validation des Données Réelles

Tous les services utilisent maintenant des **APIs réelles du gouvernement français** :

- ❌ **Simulations supprimées**
- ✅ **Données cadastrales réelles** (API Carto IGN)
- ✅ **Données PLU réelles** (data.gouv.fr)
- ✅ **Zones inondables réelles** (API Géorisques)
- ✅ **Monuments historiques réels** (API Mérimée)
- ✅ **Coordonnées GPS réelles** (API Adresse)

## 📈 Améliorations Futures

1. **Parsing fichiers PLU** : Parser les fichiers GeoJSON/Shapefile des datasets PLU
2. **API Sites archéologiques** : Intégrer une source spécifique pour sites archéologiques
3. **API DPE** : Intégrer l'API DPE officielle pour données énergétiques réelles
4. **API Réseaux** : Intégrer les données des gestionnaires de réseaux (Enedis, GRDF, etc.)

