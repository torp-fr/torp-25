# Troubleshooting: Les données enrichies ne s'affichent pas dans l'UI

## 🔍 Symptômes

Après avoir fait une analyse de devis, la page d'analyse n'affiche que les données basiques :
- SIRET/SIREN
- Nom et adresse
- Activité (code APE)

**Manquant :**
- ❌ Date de création et âge de l'entreprise
- ❌ Badge "Récente" ou "Établie"
- ❌ Mots-clés d'activité
- ❌ Avis clients
- ❌ Score de complétude des données

## 📋 Checklist de résolution

### 1. ✅ Redémarrer le serveur Next.js

**C'est la cause la plus fréquente !**

Les modifications du code ne sont pas chargées tant que le serveur n'est pas redémarré.

```bash
# Arrêter le serveur (Ctrl+C dans le terminal)
# Puis relancer :
npm run dev
```

### 2. ✅ Vider le cache du navigateur

Le navigateur peut avoir mis en cache l'ancienne version de la page.

**Chrome/Edge/Firefox:**
- Windows/Linux: `Ctrl + Shift + R`
- Mac: `Cmd + Shift + R`

Ou ouvrir les DevTools (F12) et cliquer avec le clic droit sur le bouton recharger → "Vider le cache et recharger"

### 3. ✅ Refaire une nouvelle analyse

L'ancienne analyse a peut-être été faite avant les modifications du code.

**Comment refaire une analyse :**
1. Aller sur la page d'accueil
2. Upload un nouveau PDF de devis
3. OU Re-uploader le même PDF (il créera une nouvelle analyse)

### 4. ✅ Vérifier les logs du serveur

Quand vous faites une analyse, vous devriez voir ces logs dans le terminal du serveur Next.js :

```
[AnalysisPage] 🔄 Enrichissement nécessaire, déclenchement...
[API Enrich Company] 🔍 Enrichissement complet avec IntelligentCompanySearch + Reviews
[IntelligentSearch] 🔍 Début recherche intelligente: { siret: '...', ... }
[API Enrich Company] ✅ Enrichissement complet réussi
[API Enrich Company] 📊 Données disponibles: { hasCreationDate: true, hasActivityKeywords: true, ... }
```

**Si vous ne voyez PAS ces logs :**
→ L'enrichissement ne s'est pas déclenché → Refaire l'analyse

**Si vous voyez des erreurs réseau :**
→ Problème de connexion aux APIs externes (voir section 5)

### 5. ✅ Vérifier la connexion aux APIs externes

Les APIs suivantes doivent être accessibles depuis votre serveur :

- ✅ `https://recherche-entreprises.api.gouv.fr` - Annuaire Entreprises
- ✅ `https://public.opendatasoft.com` - BODACC
- ✅ `https://data.ademe.fr` - RGE
- ✅ `https://maps.googleapis.com` - Google Places (si clé API configurée)

**Test rapide :**
```bash
curl https://recherche-entreprises.api.gouv.fr/search
```

Si ça ne fonctionne pas → problème de firewall ou proxy

### 6. ✅ Vérifier que l'API d'enrichissement est bien appelée

Ouvrir les DevTools du navigateur (F12) → Onglet "Network"

Lors de l'accès à la page d'analyse, vous devriez voir une requête :

```
GET /api/analysis/[id]/enrich-company
Status: 200 OK
```

**Clic droit sur la requête → "Copy as cURL"** et testez dans le terminal :

```bash
curl 'http://localhost:3000/api/analysis/VOTRE_ID/enrich-company' | jq .
```

Vous devriez voir la réponse avec :
```json
{
  "success": true,
  "data": {
    "siret": "...",
    "name": "...",
    "creationDate": "01/01/2021",  ← Doit être présent
    "companyAge": 4,               ← Doit être présent
    "isRecent": false,             ← Doit être présent
    "activityKeywords": [...],     ← Doit être présent
    "dataCompleteness": 85,        ← Doit être présent
    ...
  }
}
```

### 7. ✅ Inspecter les props du composant

Dans la page d'analyse, ouvrir les DevTools (F12) → Console

Taper :
```javascript
document.querySelector('[data-component="CompanyAuditCard"]')
```

Ou ajouter temporairement dans le code de `CompanyAuditCard` :
```typescript
console.log('[CompanyAuditCard] Props reçues:', companyData)
```

Vérifier que `companyData` contient bien :
- ✓ `creationDate`
- ✓ `companyAge`
- ✓ `isRecent`
- ✓ `activityKeywords`
- ✓ `dataCompleteness`

---

## 🔧 Solutions par cause

### Cause A: Serveur pas redémarré

**Solution :**
```bash
# Terminal où tourne le serveur
Ctrl+C
npm run dev
```

Puis refaire l'analyse.

---

### Cause B: Cache navigateur

**Solution :**
1. Vider le cache (Ctrl+Shift+R)
2. Ou ouvrir en navigation privée

---

### Cause C: Analyse faite avant les modifications

**Solution :**
1. Re-uploader le PDF de devis
2. Créer une nouvelle analyse

---

### Cause D: Erreur réseau

**Symptôme dans les logs :**
```
TypeError: fetch failed
EAI_AGAIN recherche-entreprises.api.gouv.fr
```

**Solutions :**

1. **Firewall/Proxy :**
   - Vérifier que le serveur peut accéder à Internet
   - Configurer les variables proxy si nécessaire

2. **DNS :**
   ```bash
   # Tester résolution DNS
   nslookup recherche-entreprises.api.gouv.fr
   ```

3. **Temporaire/Test :**
   Si les APIs sont bloquées, les données de base (SIRET/adresse) s'affichent quand même, mais sans enrichissement.

---

### Cause E: Données manquantes dans l'API

**Vérification :**
```bash
curl 'http://localhost:3000/api/analysis/VOTRE_ID/enrich-company' | jq '.data | keys'
```

Devrait afficher :
```json
[
  "siret",
  "name",
  "creationDate",
  "companyAge",
  "isRecent",
  "activityKeywords",
  "dataCompleteness",
  "dataSources",
  "confidenceScore",
  ...
]
```

Si ces clés manquent → problème dans le service d'enrichissement

---

## 📝 Checklist rapide

Cochez au fur et à mesure :

- [ ] Serveur Next.js redémarré
- [ ] Cache navigateur vidé
- [ ] Nouvelle analyse créée (pas ancienne)
- [ ] Logs serveur montrent enrichissement réussi
- [ ] Requête `/api/analysis/[id]/enrich-company` retourne 200 OK
- [ ] Réponse API contient `creationDate`, `companyAge`, etc.
- [ ] APIs externes accessibles depuis le serveur

Si **TOUTES** les cases sont cochées mais l'UI ne montre toujours rien :

→ Problème dans le composant `CompanyAuditCard`
→ Inspecter les props dans la console
→ Vérifier les conditions d'affichage dans le code

---

## 🎯 Test de bout-en-bout

Pour vérifier que tout fonctionne :

### 1. Préparer

```bash
# Terminal 1: Démarrer le serveur
npm run dev

# Terminal 2: Vérifier APIs accessibles
curl https://recherche-entreprises.api.gouv.fr/search?q=paris | jq '.results | length'
# Devrait retourner un nombre (ex: 10)
```

### 2. Analyser

1. Aller sur http://localhost:3000
2. Uploader un devis avec un SIRET valide
3. Attendre la fin de l'analyse
4. Cliquer sur "Voir l'analyse"

### 3. Vérifier

**Dans les logs serveur (Terminal 1), vous devriez voir :**

```
[AnalysisPage] 🔄 Enrichissement nécessaire, déclenchement...
[API Enrich Company] 🔍 Enrichissement complet avec IntelligentCompanySearch + Reviews
[IntelligentSearch] 🔍 Début recherche intelligente
[IntelligentSearch] ✅ Recherche terminée
[API Enrich Company] ✅ Enrichissement complet réussi
```

**Dans la page d'analyse, vous devriez voir :**

- ✅ Section "Date de création" avec badge 🆕 Récente ou ⭐ Établie
- ✅ Section "Mots-clés d'activité" avec des badges
- ✅ Section "Score de complétude des données" avec barre de progression
- ⚪ Section "Avis clients" (seulement si l'entreprise a des avis Google)

### 4. Si ça ne marche toujours pas

Créer un rapport de débogage :

```bash
# Capturer les logs
npx tsx scripts/debug-enrichment-ui.ts > debug-report.txt 2>&1

# Envoyer debug-report.txt pour analyse
```

---

## 📞 Support

Si le problème persiste après avoir suivi toutes ces étapes :

1. Capturer les logs serveur pendant une analyse
2. Capturer la réponse de `/api/analysis/[id]/enrich-company`
3. Capturer une capture d'écran de la page d'analyse
4. Créer une issue GitHub avec ces informations

---

**Dernière mise à jour :** 2024-11-07
