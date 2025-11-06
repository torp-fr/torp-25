# SERVICES D'ENRICHISSEMENT DISPONIBLES

**Date:** 06/11/2025
**Version:** 1.0 (Phase 1 - P0 Opérationnelle)

---

## 📋 RÉSUMÉ

Suite à l'implémentation de la Phase 1 (P0), **tous les enrichissements fonctionnent maintenant sans clé API** grâce aux services publics gratuits. Voici ce qui est disponible.

---

## 🏢 ENRICHISSEMENT ENTREPRISE (DEVIS)

### ✅ Données Disponibles GRATUITEMENT

Lorsqu'un SIRET est détecté par OCR dans un devis, les données suivantes sont récupérées automatiquement :

#### Informations de Base (API Recherche d'Entreprises - data.gouv.fr)
- ✅ **SIRET** (14 chiffres)
- ✅ **SIREN** (9 premiers chiffres)
- ✅ **Nom complet** (raison sociale)
- ✅ **Nom commercial** (si différent)
- ✅ **Forme juridique** (SARL, SAS, EURL, etc.)
- ✅ **Activité principale** (code NAF + libellé)
- ✅ **Adresse complète** (rue, code postal, ville, région, département)
- ✅ **Statut** (Active, Fermée, Inconnue)
- ✅ **Siège social** (oui/non)
- ✅ **Tranche d'effectifs** (0-9, 10-19, 20-49, etc.)
- ✅ **Date de création**
- ✅ **Date dernière mise à jour**

#### Certifications RGE (API data.gouv.fr + API RGE nationale)
- ✅ **Certification RGE** (Reconnu Garant de l'Environnement)
- ✅ **Domaines d'activité** couverts (chauffage, isolation, etc.)
- ✅ **Numéro de certification**
- ✅ **Validité** et date d'expiration

### ⚠️ Données NON Disponibles (Nécessitent Clés API Payantes)

Ces données nécessitent des abonnements aux services suivants :

#### Infogreffe (Payant - à partir de 50€/mois)
- ❌ **Données financières** (Chiffre d'affaires, résultat, EBITDA, dette)
- ❌ **Procédures collectives** (liquidation, redressement, sauvegarde)
- ❌ **Score Banque de France**

#### Pappers (Payant - à partir de 29€/mois)
- ❌ **Données enrichies** supplémentaires
- ❌ **Réputation** (avis, notes, NPS)
- ❌ **Portfolio** projets récents

#### Qualibat (Payant - sur devis)
- ❌ **Certifications Qualibat** détaillées
- ❌ **Niveau de qualification**
- ❌ **Domaines BTP certifiés**

#### Autres
- ❌ **Assurances** (décennale, RC professionnelle, montants)

### 🔄 Flux d'Enrichissement Entreprise

```
Upload Devis → OCR (Tesseract.js) → Détection SIRET
    ↓
CompanyEnrichmentService
    ↓
[Retry 3x avec backoff]
    ↓
1. SireneService (API INSEE si clé disponible)
    ↓ (si échec ou pas de clé)
2. Fallback: API Recherche d'Entreprises (GRATUITE)
    ↓
3. RGEService (API nationale RGE + data.gouv.fr)
    ↓
4. InfogreffeService (si clé disponible, sinon skip)
    ↓
✅ Données sauvegardées dans Devis.enrichedData.company
```

**Temps d'exécution :** ~2-4 secondes

---

## 🏠 ENRICHISSEMENT LOGEMENT (PROFIL BÂTIMENT)

### ✅ Données Disponibles GRATUITEMENT

Lorsqu'une adresse est saisie pour créer un profil logement :

#### Cadastre (APIcarto IGN + cadastre.data.gouv.fr)
- ✅ **Parcelle cadastrale** (numéro)
- ✅ **Section cadastrale**
- ✅ **Surface de la parcelle** (m²)
- ✅ **Contenance** (hectares)
- ✅ **Code INSEE** de la commune
- ✅ **Coordonnées GPS** (latitude, longitude)
- ✅ **Nature** de la parcelle

#### RNB - Référentiel National des Bâtiments (API beta.gouv.fr)
- ✅ **Année de construction**
- ✅ **Type de bâtiment** (Maison, Appartement, etc.)
- ✅ **Surface totale** (m²)
- ✅ **Classe DPE** (A, B, C, D, E, F, G)
- ✅ **Consommation énergétique** (kWh/m²/an)
- ✅ **Émissions GES** (kg CO₂/m²/an)
- ✅ **Date du DPE**

#### Géorisques (géorisques.gouv.fr - API publique)
- ✅ **Zone inondable** (TRI, AZI, PAPI)
- ✅ **Exposition au radon** (Zone 1, 2, 3)
- ✅ **Mouvements de terrain**
- ✅ **Retrait-gonflement des argiles** (Faible, Moyen, Fort)
- ✅ **Zone sismique** (niveau)
- ✅ **Installations classées** à proximité (ICPE)

#### DVF - Demandes de Valeurs Foncières (data.gouv.fr)
- ✅ **Estimation valeur** du bien (basée sur transactions récentes)
- ✅ **Prix au m²** estimé
- ✅ **Transactions comparables** (5 ans, rayon 1km)
- ✅ **Statistiques** par quartier
- ✅ **Confiance** de l'estimation (%)

#### PLU/Urbanisme (APIs communales - couverture variable)
- ⚠️ **Zone PLU** (si disponible via API locale)
- ⚠️ **Règles d'urbanisme** (couverture variable)

### ⚠️ Données NON Disponibles (Nécessitent Clés API ou Imports)

#### Géoportail IGN (Gratuit mais nécessite clé API)
- ⚠️ **Cadastre détaillé** avec géométrie complète (si APIcarto insuffisant)
- ⚠️ **Cartes topographiques** haute résolution

#### Autres Services Optionnels
- ⚠️ **Météo** (OpenWeather - freemium, nécessite clé)
- ⚠️ **Plans d'urbanisme** détaillés (variable selon commune)

### 🔄 Flux d'Enrichissement Logement

```
Saisie Adresse → AddressService (BAN API)
    ↓
    Résolution coordonnées GPS
    ↓
BuildingProfileService.enrichProfile()
    ↓
[ÉTAPE 1] CadastreService
    ├─ APIcarto (gratuit)
    ├─ cadastre.data.gouv.fr (gratuit)
    └─ Géoportail (si clé disponible)
    ↓
[ÉTAPE 2 & 3 - PARALLÈLE]
    ├─ BuildingService
    │   ├─ RNBService (API nationale)
    │   ├─ GéorisquesService
    │   └─ PLUService (si disponible)
    │
    └─ DVFService (data.gouv.fr)
    ↓
✅ Données sauvegardées dans BuildingProfile.enrichedData
```

**Temps d'exécution :** ~5-7 secondes (parallélisé)

---

## 🚀 APIS GRATUITES UTILISÉES

### Sans Clé API Requise
1. **API Recherche d'Entreprises** (data.gouv.fr)
   - Données entreprises temps réel
   - Quota : Illimité
   - URL : https://recherche-entreprises.api.gouv.fr

2. **API RGE nationale** (beta.gouv.fr)
   - Certifications RGE
   - Quota : Illimité
   - URL : https://rnb.beta.gouv.fr/api/v0

3. **APIcarto Cadastre** (IGN)
   - Données cadastrales
   - Quota : Illimité
   - URL : https://apicarto.ign.fr/api/cadastre

4. **Cadastre data.gouv.fr** (Etalab)
   - Plan Cadastral Informatisé (PCI)
   - Quota : Illimité
   - URL : https://cadastre.data.gouv.fr/api

5. **Géorisques** (géorisques.gouv.fr)
   - Risques naturels et technologiques
   - Quota : Illimité
   - URL : https://georisques.gouv.fr/api

6. **DVF data.gouv.fr** (Etalab)
   - Valeurs foncières
   - Quota : Illimité
   - URL : https://app.dvf.etalab.gouv.fr/api

7. **BAN - Base Adresse Nationale** (adresse.data.gouv.fr)
   - Géocodage adresses
   - Quota : Illimité
   - URL : https://api-adresse.data.gouv.fr

### Avec Clé API Gratuite (Inscription Requise)
8. **API INSEE Sirene** (api.insee.fr)
   - Données entreprises officielles
   - Quota : 30 req/min
   - 🔑 Clé requise : INSEE_API_KEY

9. **Géoportail IGN** (geoservices.ign.fr)
   - Cadastre complet, cartographie
   - Quota : 2M req/jour
   - 🔑 Clé requise : GEOPORTAIL_API_KEY

### Payantes (Optionnelles)
10. **Infogreffe** (infogreffe.fr)
    - Données financières et juridiques
    - 💰 À partir de 50€/mois
    - 🔑 Clé requise : INFOGREFFE_API_KEY

11. **Pappers** (pappers.fr)
    - Enrichissement entreprises
    - 💰 À partir de 29€/mois
    - 🔑 Clé requise : PAPPERS_API_KEY

12. **Qualibat** (qualibat.com)
    - Certifications BTP
    - 💰 Sur devis
    - 🔑 Clé requise : QUALIBAT_API_KEY

---

## 📊 RÉSUMÉ PAR CATÉGORIE

### Données Entreprise
| Catégorie | Gratuit | Payant | Nécessite Clé |
|-----------|---------|--------|---------------|
| Identité (SIRET, nom, adresse) | ✅ | - | Non |
| Activité (NAF, forme juridique) | ✅ | - | Non |
| Certifications RGE | ✅ | - | Non |
| Données financières | - | ❌ Infogreffe | Oui |
| Procédures collectives | - | ❌ Infogreffe | Oui |
| Réputation/Avis | - | ❌ Pappers | Oui |
| Qualibat | - | ❌ Qualibat | Oui |

### Données Logement
| Catégorie | Gratuit | Payant | Nécessite Clé |
|-----------|---------|--------|---------------|
| Cadastre (parcelle, surface) | ✅ | - | Non |
| Bâti (année, type, surface) | ✅ | - | Non |
| DPE (classe, consommation, GES) | ✅ | - | Non |
| Risques (inondation, radon, argile) | ✅ | - | Non |
| Valorisation (prix, m²) | ✅ | - | Non |
| Urbanisme (PLU) | ⚠️ Partiel | - | Variable |

**Légende :**
- ✅ Disponible gratuitement sans clé
- ⚠️ Disponible partiellement ou selon disponibilité
- ❌ Nécessite abonnement payant
- 🔑 Nécessite clé API (gratuite ou payante)

---

## 🔧 CONFIGURATION RECOMMANDÉE

### Configuration Minimale (100% Gratuit)
```bash
# Aucune clé API requise
# Toutes les fonctionnalités d'enrichissement de base fonctionnent
DATABASE_URL=postgresql://...
```

### Configuration Optimale (Gratuite avec Inscription)
```bash
DATABASE_URL=postgresql://...

# APIs Gratuites (améliorent les données)
INSEE_API_KEY=xxx  # api.insee.fr (30 req/min)
GEOPORTAIL_API_KEY=xxx  # geoservices.ign.fr (2M req/jour)
```

### Configuration Avancée (Avec Services Payants)
```bash
DATABASE_URL=postgresql://...

# APIs Gratuites
INSEE_API_KEY=xxx
GEOPORTAIL_API_KEY=xxx

# APIs Payantes (enrichissement avancé)
INFOGREFFE_API_KEY=xxx  # Données financières
PAPPERS_API_KEY=xxx  # Enrichissement entreprises
QUALIBAT_API_KEY=xxx  # Certifications BTP
```

---

## 📝 LIMITATIONS CONNUES

### Entreprise
1. **Données financières** : Non disponibles sans Infogreffe (CA, résultat, dette)
2. **Assurances** : Non vérifiables automatiquement (décennale, RC)
3. **Qualibat** : Limité aux certifications RGE (Qualibat nécessite API payante)

### Logement
1. **PLU/Urbanisme** : Couverture variable selon communes (pas d'API unifiée)
2. **Historique permis** : Non disponible via APIs publiques
3. **Photos/Plans** : Non inclus (nécessite scraping ou APIs payantes)

### Performance
1. **RNB** : Plus rapide avec index local (import recommandé pour production)
2. **RGE** : Plus rapide avec index local (import recommandé pour production)
3. **Rate limiting** : APIs publiques peuvent avoir des limites non documentées

---

## 🎯 RECOMMANDATIONS

### Pour Production
1. ✅ **Configurer INSEE_API_KEY** (gratuit, améliore fiabilité Sirene)
2. ✅ **Configurer GEOPORTAIL_API_KEY** (gratuit, améliore données cadastre)
3. ⚠️ **Indexer RNB localement** (améliore performances, optionnel)
4. ⚠️ **Indexer RGE localement** (améliore performances, optionnel)
5. ⚠️ **Activer cache Redis** (réduit appels API, améliore performances)

### Pour Fonctionnalités Avancées
1. 💰 **Infogreffe** si analyse financière requise
2. 💰 **Pappers** si enrichissement entreprises avancé requis
3. 💰 **Qualibat** si certifications BTP détaillées requises

---

## ✅ STATUT ACTUEL

**Phase 1 (P0) - TERMINÉE ✅**
- ✅ Enrichissement entreprise opérationnel (API gratuite)
- ✅ Enrichissement logement opérationnel (RNB, Cadastre, DVF, Géorisques)
- ✅ Services robustes avec retry et fallbacks
- ✅ Performances optimisées (appels parallèles)
- ✅ Gestion d'erreurs complète
- ✅ Logging détaillé pour debugging

**Résultat :** La plateforme TORP fonctionne maintenant **entièrement sans clés API** pour les fonctionnalités de base. L'ajout de clés API gratuites (INSEE, Géoportail) améliore la qualité des données, mais n'est pas obligatoire.

---

**Pour toute question :** Consulter AUDIT_COMPLET_INTEGRATIONS_API.md
