# COMMENT TESTER L'ENRICHISSEMENT LOGEMENT

**Date:** 06/11/2025
**Correction:** Polling automatique activé

---

## 🎯 CE QUI A ÉTÉ CORRIGÉ

Le problème était que **le polling automatique ne se déclenchait pas** si l'enrichissement initial échouait silencieusement.

**AVANT :**
- ❌ Polling uniquement si status = "in_progress"
- ❌ Si appel /enrich échoue → status reste à "pending"
- ❌ Page vide indéfiniment

**APRÈS :**
- ✅ Polling activé dès que status = "pending" OU "in_progress"
- ✅ Auto-lancement après 9s si toujours "pending"
- ✅ Logs détaillés dans console navigateur
- ✅ Données chargées automatiquement

---

## 🧪 TEST RAPIDE (2 MINUTES)

### Option 1 : Créer un NOUVEAU Logement

1. **Redémarrer Next.js** (si nécessaire)
   ```bash
   npm run dev
   ```

2. **Ouvrir la console navigateur** (F12)
   - Onglet "Console"
   - Filtrer par "Building Detail" pour voir les logs

3. **Créer un nouveau logement**
   - Aller sur http://localhost:3000/buildings/new
   - Saisir adresse : `2 Rue de Pitgam 59470 Esquelbecq`
   - Ou autre adresse précise avec numéro de rue
   - Cliquer "Créer le Profil"

4. **Observer la console**
   Vous devriez voir :
   ```
   [Building Detail] 🔄 Enrichissement pending - démarrage polling automatique...
   [Building Detail] 🔄 Polling automatique: 1/40 - vérification statut...
   [Building Detail] 📊 Statut actuel: pending
   [Building Detail] 🔄 Polling automatique: 2/40 - vérification statut...
   [Building Detail] 📊 Statut actuel: pending
   [Building Detail] 🔄 Polling automatique: 3/40 - vérification statut...
   [Building Detail] ⚠️ Status toujours pending après 9s, lancement manuel enrichissement...
   [Building Detail] ✅ Enrichissement lancé manuellement
   [Building Detail] 📊 Statut actuel: in_progress
   [Building Detail] 🔄 Polling automatique: 4/40 - vérification statut...
   ...
   [Building Detail] 📊 Statut actuel: completed
   [Building Detail] ✅ Enrichissement terminé (statut: completed), arrêt polling
   [Frontend] 🔄 Chargement caractéristiques...
   [Frontend] ✅ Caractéristiques traitées: {total: 20, known: 5, unknown: 15}
   ```

5. **Voir les données apparaître**
   - Les champs se remplissent automatiquement
   - DPE, surface, année construction, etc.
   - Si données partielles : certains champs "Non renseigné"

**Durée totale attendue :** 15-30 secondes maximum

---

### Option 2 : Tester avec Profil EXISTANT

1. **Ouvrir un profil existant vide**
   - http://localhost:3000/buildings/[ID]
   - Remplacer [ID] par l'ID du profil vide

2. **Ouvrir la console** (F12)

3. **Cliquer sur "Actualiser" (🔄)**
   - Le bouton RefreshCw en haut de la page
   - Observe la console

4. **Attendre 10-20 secondes**
   - Le polling démarre automatiquement
   - Les données apparaissent progressivement

---

## 📊 LOGS ATTENDUS PAR ÉTAPE

### Étape 1 : Démarrage Polling (immédiat)
```
[Building Detail] 🔄 Enrichissement pending - démarrage polling automatique...
```
✅ **Si vous voyez ça** → Le polling fonctionne !

### Étape 2 : Tentatives Polling (toutes les 3s)
```
[Building Detail] 🔄 Polling automatique: 1/40 - vérification statut...
[Building Detail] 📊 Statut actuel: pending
```
✅ **Si vous voyez ça** → La vérification fonctionne !

### Étape 3 : Lancement Manuel (après 9s)
```
[Building Detail] ⚠️ Status toujours pending après 9s, lancement manuel enrichissement...
[Building Detail] ✅ Enrichissement lancé manuellement
```
✅ **Si vous voyez ça** → L'auto-correction fonctionne !

### Étape 4 : Enrichissement en Cours (côté serveur)
```
[API Enrich] 🚀 Démarrage enrichissement
[BuildingProfileService] 🏠 ÉTAPE 1: Adresse → Parcelle cadastrale
[CadastreService] 🔍 Tentative identification parcelle via API PCI...
[BuildingProfileService] 🏗️ ÉTAPE 2 & 3: Bâti et Valorisation (PARALLÈLE)
[RNBService] 🔄 Fallback API nationale RNB...
```
✅ **Si vous voyez ça dans les logs serveur** → L'enrichissement tourne !

### Étape 5 : Enrichissement Terminé
```
[Building Detail] 📊 Statut actuel: completed
[Building Detail] ✅ Enrichissement terminé (statut: completed), arrêt polling
```
✅ **Si vous voyez ça** → Tout fonctionne parfaitement !

### Étape 6 : Chargement Caractéristiques
```
[Frontend] 🔄 Chargement caractéristiques pour: abc123
[API Characteristics] 📊 Données disponibles
[API Characteristics] ✅ Caractéristiques extraites: {total: 20, known: 5}
[Frontend] ✅ Caractéristiques traitées
```
✅ **Si vous voyez ça** → Les données s'affichent !

---

## ❌ QUE FAIRE SI ÇA NE MARCHE TOUJOURS PAS

### Problème 1 : Aucun log dans la console

**Cause :** Filtre console trop strict ou logs désactivés

**Solution :**
```javascript
// Dans la console navigateur, taper :
localStorage.debug = '*'
location.reload()
```

### Problème 2 : Polling démarre mais timeout après 2 min

**Cause :** API /enrich échoue côté serveur

**Solution :**
```bash
# Vérifier logs serveur Next.js
# Rechercher :
grep "API Enrich" logs
grep "BuildingProfileService" logs

# Si erreurs, les partager pour diagnostic
```

### Problème 3 : Status reste "in_progress" indéfiniment

**Cause :** Enrichissement bloqué ou base de données non mise à jour

**Solution :**
```bash
# Relancer manuellement via API
curl -X POST "http://localhost:3000/api/building-profiles/[ID]/enrich?userId=demo-user-id"

# Vérifier en base
npx prisma studio
# → Ouvrir BuildingProfile
# → Vérifier enrichmentStatus
```

### Problème 4 : Données enrichedData NULL en base

**Cause :** Services externes échouent (réseau, APIs indisponibles)

**Solution :**
```bash
# Tester APIs publiques manuellement
curl "https://recherche-entreprises.api.gouv.fr/search?q=paris&per_page=1"
curl "https://rnb.beta.gouv.fr/api/v0/buildings?limit=1"

# Si erreurs réseau, vérifier firewall/proxy
```

---

## 🎉 RÉSULTAT ATTENDU

Après avoir suivi les étapes, vous devriez voir dans l'interface :

### Performance Énergétique
- ✅ **Classe DPE :** D (ou autre lettre)
- ✅ **Consommation :** 250 kWh/m²/an
- ✅ **Émissions GES :** 45 kg CO₂/m²/an

### Valorisation
- ✅ **Estimation :** 250 000 €
- ✅ **Prix m² :** 2 083 €/m²

### Risques
- ✅ **Radon :** Zone 1 (faible)
- ✅ **Argile :** Moyen
- ✅ **Zone inondable :** Non
- ✅ **Zone sismique :** Zone 2

### Caractéristiques Bâti
- ✅ **Année construction :** 1985
- ✅ **Type :** Maison
- ✅ **Surface :** 120 m²

### Cadastre
- ✅ **Parcelle :** 123
- ✅ **Section :** A
- ✅ **Surface parcelle :** 500 m²

---

## 📞 BESOIN D'AIDE ?

Si après ces tests ça ne fonctionne toujours pas :

1. **Copier TOUS les logs console**
   - Console navigateur (F12)
   - Logs serveur Next.js

2. **Vérifier la base de données**
   ```bash
   npx prisma studio
   ```
   - Ouvrir BuildingProfile
   - Trouver votre profil
   - Faire capture d'écran de :
     - enrichmentStatus
     - enrichedData (JSON)
     - enrichmentErrors

3. **Partager :**
   - Logs console
   - Logs serveur
   - Captures Prisma Studio
   - Adresse utilisée pour test

---

**Bon test ! 🚀**
