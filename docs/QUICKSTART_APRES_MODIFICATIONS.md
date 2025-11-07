# Démarrage rapide après les modifications d'enrichissement

## 🎯 Objectif

Vous venez de récupérer les modifications qui ajoutent l'enrichissement intelligent des profils entreprises. Ce guide vous explique comment tester que tout fonctionne.

---

## ⚡ Démarrage en 3 étapes

### 1. Installer les dépendances (si pas déjà fait)

```bash
npm install
```

### 2. Configurer les clés API (optionnel)

Créer un fichier `.env` à la racine :

```bash
# Avis Google (optionnel mais recommandé)
GOOGLE_PLACES_API_KEY=votre_clé_ici

# Autres APIs (tous optionnels)
# TRUSTPILOT_API_KEY=
# ELDO_API_KEY=
# INFOGREFFE_API_KEY=
# INSEE_API_KEY=
```

**Note :** Sans ces clés, le système fonctionne quand même avec les APIs publiques gratuites !

### 3. Démarrer le serveur

```bash
npm run dev
```

---

## 🧪 Tester l'enrichissement

### Test 1: Upload un devis

1. Aller sur http://localhost:3000
2. Uploader un devis PDF contenant un SIRET
3. Attendre la fin de l'analyse
4. Cliquer sur "Voir l'analyse"

**Vous devriez voir :**

✅ **Section "Informations Administratives"** avec :
- Date de création (ex: "01/01/2021 (4 ans)")
- Badge "🆕 Récente" (< 2 ans) ou "⭐ Établie" (>= 10 ans)
- Message informatif pour entreprises récentes

✅ **Section "Mots-clés d'activité"** :
- Badges avec mots-clés extraits du nom et activité

✅ **Section "Score de complétude des données"** :
- Pourcentage avec barre de progression
- Liste des sources utilisées (Annuaire Entreprises, BODACC, etc.)

⚪ **Section "Avis clients"** (si disponibles) :
- Note globale pondérée
- Répartition par source (Google, Trustpilot, Eldo)

### Test 2: Script de test manuel

```bash
# Tester l'enrichissement pour un SIRET spécifique
npx tsx scripts/test-intelligent-enrichment.ts 91789983300029
```

Vous devriez voir toutes les données enrichies dans le terminal.

### Test 3: Tester les avis Google (si clé API configurée)

```bash
npx tsx scripts/test-google-reviews.ts "Leroy Merlin" "Lille"
```

---

## 🔍 Vérifier que ça fonctionne

### Dans les logs serveur

Quand vous accédez à une page d'analyse, vous devez voir :

```
[AnalysisPage] 🔄 Enrichissement nécessaire, déclenchement...
[API Enrich Company] 🔍 Enrichissement complet avec IntelligentCompanySearch + Reviews
[IntelligentSearch] 🔍 Début recherche intelligente: { siret: '...', ... }
[IntelligentSearch] 📌 Stratégie 1: Recherche par SIRET
[IntelligentSearch] ✅ Recherche terminée
[API Enrich Company] ✅ Enrichissement complet réussi
[API Enrich Company] 📊 Données disponibles: {
  siret: '...',
  hasCreationDate: true,
  companyAge: 4,
  isRecent: false,
  hasActivityKeywords: true,
  dataCompleteness: 85,
  ...
}
```

### Dans le navigateur (DevTools Network)

Vous devez voir une requête :

```
GET /api/analysis/[id]/enrich-company
Status: 200 OK
Response: { "success": true, "data": { ... } }
```

---

## ❌ Problèmes courants

### "Les nouvelles sections ne s'affichent pas"

**Solution :**
1. Redémarrer le serveur (`Ctrl+C` puis `npm run dev`)
2. Vider le cache du navigateur (`Ctrl+Shift+R`)
3. Refaire une nouvelle analyse

Voir le guide complet : [TROUBLESHOOTING_UI.md](./TROUBLESHOOTING_UI.md)

### "TypeError: fetch failed"

**Cause :** Pas d'accès Internet ou firewall

**Solution :**
- Vérifier connexion Internet
- Tester : `curl https://recherche-entreprises.api.gouv.fr/search`
- Configurer proxy si nécessaire

### "Aucune donnée enrichie"

**Cause :** L'entreprise n'existe pas dans les bases de données publiques

**Solution :**
- Tester avec un SIRET d'une grande entreprise connue
- Exemple : `npx tsx scripts/test-intelligent-enrichment.ts 35228969400016` (Leroy Merlin)

---

## 📚 Nouvelles fonctionnalités ajoutées

### 🔍 Recherche intelligente multi-stratégies

Le système essaie 3 stratégies pour trouver l'entreprise :

1. **Stratégie 1** : SIRET exact (confiance 95%)
2. **Stratégie 2** : SIREN si SIRET échoue (confiance 85%)
3. **Stratégie 3** : Recherche fuzzy nom+adresse (confiance 70%)

### 📅 Date de création et âge

- Extraction depuis le préfixe SIRET
- Calcul automatique de l'âge
- Badge "🆕 Récente" (< 2 ans) ou "⭐ Établie" (>= 10 ans)
- Message informatif pour entreprises récentes

### 🏷️ Mots-clés d'activité

Extraction automatique depuis :
- Nom de l'entreprise
- Activités déclarées (code APE/NAF)
- Libellés d'activité

Exemple : "toiture", "isolation", "rénovation"

### ⭐ Avis clients agrégés

Agrégation pondérée depuis :
- Google Reviews (40%)
- Trustpilot (35%)
- Avis Eldo (25%)

Calculs :
- Note globale pondérée
- Taux de recommandation (% >= 4 étoiles)
- Tendance (amélioration/stable/déclin)

### 📊 Score de complétude

Score 0-100% basé sur :
- Présence SIRET/SIREN (30%)
- Adresse complète (30%)
- Activités (15%)
- Données financières (15%)
- Certifications (10%)

---

## 📖 Documentation

- **Configuration APIs** : [API_INTEGRATION.md](./API_INTEGRATION.md)
- **Troubleshooting UI** : [TROUBLESHOOTING_UI.md](./TROUBLESHOOTING_UI.md)
- **Scripts de test** : `/scripts/`
  - `test-intelligent-enrichment.ts`
  - `test-google-reviews.ts`
  - `test-infogreffe-api.ts`
  - `debug-enrichment-ui.ts`

---

## 🚀 Prêt pour la production

Une fois que tout fonctionne en développement :

### 1. Configurer les variables d'environnement

Sur votre serveur de production, définir :

```bash
# Obligatoire pour Google Reviews (recommandé)
GOOGLE_PLACES_API_KEY=...

# Optionnels
TRUSTPILOT_API_KEY=...
ELDO_API_KEY=...
INFOGREFFE_API_KEY=...
```

### 2. Vérifier l'accès aux APIs

Le serveur doit pouvoir accéder à :
- `https://recherche-entreprises.api.gouv.fr`
- `https://maps.googleapis.com` (si Google API configurée)
- `https://public.opendatasoft.com`
- `https://data.ademe.fr`

### 3. Build et déployer

```bash
npm run build
npm start
```

---

## 💡 Conseils

### Performance

- Les données enrichies sont mises en cache dans la base de données
- L'enrichissement ne se fait qu'une seule fois par analyse
- Les APIs publiques n'ont pas de limite de requêtes

### Quotas Google

Si vous utilisez Google Places API :
- Surveiller votre quota dans Google Cloud Console
- Quotas gratuits : 28 000 requêtes/mois
- Au-delà : facturation selon usage

### Logs

Pour déboguer, activer les logs détaillés :
```bash
# Voir tous les logs d'enrichissement
npm run dev | grep -E "\[(IntelligentSearch|CompanyService|API Enrich)\]"
```

---

## ✅ Checklist de démarrage

- [ ] Dépendances installées (`npm install`)
- [ ] Clé API Google configurée dans `.env` (optionnel)
- [ ] Serveur démarré (`npm run dev`)
- [ ] Test upload devis OK
- [ ] Nouvelles sections visibles dans l'UI
- [ ] Logs d'enrichissement visibles dans le terminal
- [ ] Scripts de test fonctionnels

Si toutes les cases sont cochées → **Vous êtes prêt !** 🎉

---

**Besoin d'aide ?** Consultez [TROUBLESHOOTING_UI.md](./TROUBLESHOOTING_UI.md)
