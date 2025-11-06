# DEBUG - ENRICHISSEMENT LOGEMENT

**Date:** 06/11/2025
**Problème:** Profil logement créé mais aucune donnée affichée

---

## 🔍 DIAGNOSTIC

### 1. Vérifier que l'enrichissement a été lancé

Dans les logs de votre serveur Next.js, recherchez :

```
[API Enrich] 🚀 Démarrage enrichissement
[BuildingProfileService] 🏠 ÉTAPE 1: Adresse → Parcelle cadastrale
[BuildingProfileService] 🏗️ ÉTAPE 2 & 3: Bâti et Valorisation (PARALLÈLE)
```

**Si ABSENT** → L'API `/enrich` n'a pas été appelée après création

**Si PRÉSENT** → L'enrichissement a tourné, vérifier les erreurs

### 2. Vérifier les erreurs d'enrichissement

Recherchez dans les logs :

```
[BuildingProfileService] ❌ Erreur
[CadastreService] ❌ Erreur
[RNBService] ❌ Erreur
```

**Erreurs communes :**
- API timeout (> 10s)
- Coordonnées GPS invalides
- Adresse non trouvée

### 3. Vérifier que les données sont en base

**Option A : Via API**
```bash
curl "http://localhost:3000/api/building-profiles/[PROFILE_ID]?userId=demo-user-id" | jq '.data.enrichedData'
```

**Option B : Via Prisma Studio**
```bash
npx prisma studio
```
- Ouvrir BuildingProfile
- Trouver le profil créé
- Vérifier que `enrichedData` n'est PAS null
- Vérifier les clés : `cadastre`, `rnb`, `georisques`, `dvf`

### 4. Vérifier l'extraction des caractéristiques

Dans les logs API, recherchez :

```
[API Characteristics] 📊 Données disponibles
[API Characteristics] ✅ Caractéristiques extraites
```

**Si enrichedData vide** → Problème enrichissement
**Si caractéristiques = 0** → Problème extraction

---

## 🛠️ SOLUTIONS

### Solution 1 : Relancer manuellement l'enrichissement

**Via Interface :**
1. Aller sur la page du profil logement
2. Cliquer sur le bouton "Actualiser" (RefreshCw icon)
3. Attendre 5-10 secondes
4. Recharger la page

**Via API :**
```bash
curl -X POST "http://localhost:3000/api/building-profiles/[PROFILE_ID]/enrich?userId=demo-user-id"
```

### Solution 2 : Lancer le script de diagnostic

```bash
# Installer les dépendances si nécessaire
npm install

# Générer Prisma client
npx prisma generate

# Lancer le script
npx tsx scripts/fix-enrichment.ts
```

Le script va :
- ✅ Trouver le dernier profil créé
- ✅ Lancer l'enrichissement manuellement
- ✅ Afficher toutes les données récupérées
- ✅ Afficher les erreurs éventuelles

### Solution 3 : Vérifier la DATABASE_URL

```bash
# Vérifier que la variable est définie
echo $DATABASE_URL

# Tester la connexion
npx prisma db pull
```

### Solution 4 : Activer les logs détaillés

Dans `.env` ou `.env.local` :
```bash
# Logs Prisma
DEBUG="prisma:*"

# Logs Next.js
NODE_ENV=development
```

Redémarrer le serveur :
```bash
npm run dev
```

---

## 🔄 PROCESSUS D'ENRICHISSEMENT ATTENDU

### Étapes normales

1. **Création profil** (< 1s)
   ```
   POST /api/building-profiles
   → Profil créé avec enrichmentStatus: "pending"
   ```

2. **Appel enrichissement** (fire-and-forget)
   ```
   POST /api/building-profiles/[id]/enrich
   → enrichmentStatus: "in_progress"
   ```

3. **Enrichissement cadastre** (1-2s)
   ```
   CadastreService → APIcarto + cadastre.data.gouv.fr
   → parcelle, section, surface
   ```

4. **Enrichissement parallèle** (3-5s)
   ```
   BuildingService + DVFService en parallèle
   → RNB: année, type, DPE
   → Géorisques: risques naturels
   → DVF: estimation valeur
   ```

5. **Sauvegarde** (< 1s)
   ```
   enrichedData sauvegardé en base
   enrichmentStatus: "completed"
   ```

6. **Affichage** (< 1s)
   ```
   GET /api/building-profiles/[id]/characteristics
   → Extraction + formatage
   → Affichage dans l'interface
   ```

**Durée totale attendue :** 5-10 secondes

---

## 📊 DONNÉES ATTENDUES PAR SOURCE

### Cadastre (APIcarto + data.gouv.fr)
```json
{
  "commune": "Esquelbecq",
  "codeINSEE": "59203",
  "parcelle": {
    "numero": "123",
    "section": "A",
    "surface": 500
  }
}
```

### RNB (API beta.gouv.fr)
```json
{
  "constructionYear": 1985,
  "buildingType": "Maison",
  "surface": 120,
  "dpeClass": "D",
  "energyConsumption": 250,
  "ghgEmissions": 45
}
```

### Géorisques (géorisques.gouv.fr)
```json
{
  "radon": { "zone": 1 },
  "argile": { "niveau": "Moyen" },
  "inondation": { "isInZone": false },
  "seisme": { "zone": 2 }
}
```

### DVF (data.gouv.fr)
```json
{
  "estimation": 250000,
  "pricePerSqm": 2083,
  "confidence": 0.75,
  "comparablesCount": 12
}
```

---

## 🐛 PROBLÈMES CONNUS ET SOLUTIONS

### Problème 1 : Adresse pas trouvée
**Symptôme :** Coordonnées GPS null
**Solution :** Utiliser une adresse précise avec numéro de rue

### Problème 2 : Timeout API
**Symptôme :** Erreur après 10s
**Solution :** Augmenter timeout dans services (ligne `timeout: 10000`)

### Problème 3 : API RNB hors ligne
**Symptôme :** `[RNBService] ❌ Erreur API nationale RNB`
**Solution :** Service dégradé, réessayer plus tard. Données partielles sauvegardées.

### Problème 4 : Données non affichées malgré enrichedData
**Symptôme :** enrichedData rempli mais caractéristiques vides
**Solution :** Vérifier BuildingProfileEnrichmentService.extractCharacteristics()

### Problème 5 : enrichmentStatus bloqué sur "in_progress"
**Symptôme :** Enrichissement ne finit jamais
**Solution :** Relancer manuellement avec Solution 1 ou 2

---

## ✅ CHECKLIST DE VALIDATION

Après avoir créé un profil logement, vérifier :

- [ ] Logs montrent `[API Enrich] 🚀 Démarrage enrichissement`
- [ ] Logs montrent `[BuildingProfileService] ✅ Profil mis à jour en base`
- [ ] `enrichmentStatus` = "completed" (ou "failed" avec errors)
- [ ] `enrichedData` n'est pas null en base
- [ ] `enrichedData` contient au moins `address` et `cadastre`
- [ ] API `/characteristics` retourne > 0 caractéristiques
- [ ] Interface affiche au moins quelques données (même "unknown")

---

## 📝 LOGS À FOURNIR POUR SUPPORT

Si le problème persiste, copier ces logs :

```bash
# Logs création profil
grep "\[New Building\]" logs.txt

# Logs enrichissement
grep "\[API Enrich\]" logs.txt
grep "\[BuildingProfileService\]" logs.txt

# Logs services externes
grep "\[CadastreService\]" logs.txt
grep "\[RNBService\]" logs.txt
grep "\[GéorisquesService\]" logs.txt
grep "\[DVFService\]" logs.txt

# Logs extraction caractéristiques
grep "\[API Characteristics\]" logs.txt
```

---

## 🚀 TEST RAPIDE

Pour tester immédiatement si l'enrichissement fonctionne :

```bash
# 1. Créer un profil de test avec adresse connue
# Via interface ou API :
curl -X POST "http://localhost:3000/api/building-profiles" \
  -H "Content-Type: application/json" \
  -d '{
    "userId": "demo-user-id",
    "address": "1 Place de la République 75003 Paris",
    "coordinates": {"lat": 48.8676, "lng": 2.3634}
  }'

# 2. Récupérer l'ID du profil créé (ex: abc123)

# 3. Lancer enrichissement
curl -X POST "http://localhost:3000/api/building-profiles/abc123/enrich?userId=demo-user-id"

# 4. Attendre 10 secondes

# 5. Vérifier résultat
curl "http://localhost:3000/api/building-profiles/abc123?userId=demo-user-id" | jq '.data.enrichedData'

# 6. Vérifier caractéristiques
curl "http://localhost:3000/api/building-profiles/abc123/characteristics?userId=demo-user-id" | jq '.data.counts'
```

**Résultat attendu :**
```json
{
  "total": 20,
  "known": 5,
  "unknown": 15
}
```

---

## 📞 CONTACT

Si aucune solution ne fonctionne :
1. Copier tous les logs mentionnés ci-dessus
2. Créer une issue GitHub avec les logs
3. Indiquer l'adresse testée et l'ID du profil

---

**Dernière mise à jour :** 06/11/2025
**Version :** Phase 1 (P0) complétée
