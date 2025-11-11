# 🤖 Comment connecter ChatGPT à votre plateforme TORP

## 🎯 Ce que ça fait (simple)

Votre GPT dans ChatGPT pourra **automatiquement** :
1. Récupérer les informations d'un devis depuis votre base de données
2. L'analyser (prix, qualité, conformité)
3. Donner un score et des recommandations
4. Enregistrer son analyse dans votre base

**C'est comme si le GPT avait accès à votre plateforme !**

---

## 🔄 Comment ça marche (schéma)

```
┌─────────────────┐
│  1. Utilisateur │  "Analyse le devis ID: abc-123"
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  2. Votre GPT   │  Je vais chercher ce devis...
│   (ChatGPT)     │
└────────┬────────┘
         │
         │ APPELLE L'API AVEC LA CLÉ API
         │ GET https://torp.fr/api/gpt/devis/abc-123
         ▼
┌─────────────────┐
│ 3. Votre        │  Voici les données du devis
│    Plateforme   │  (montant, entreprise, etc.)
│    TORP         │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  4. Votre GPT   │  [Analyse les données]
│   analyse       │  Score: 75/100, Grade B
└────────┬────────┘
         │
         │ POST https://torp.fr/api/gpt/analysis
         │ {score: 75, recommendations: [...]}
         ▼
┌─────────────────┐
│ 5. Votre        │  ✅ Analyse enregistrée dans la BDD
│    Plateforme   │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  6. Votre GPT   │  Présente le résultat à l'utilisateur
│   répond        │  "Score: 75/100 - Voici mes recommandations..."
└─────────────────┘
```

---

## 📝 Étapes à suivre (APRÈS le déploiement réussi)

### ✅ ÉTAPE 1 : Attendre le déploiement

Le déploiement devrait réussir maintenant (j'ai corrigé l'erreur).

Vérifiez que c'est vert ici : https://vercel.com/votre-projet

### ✅ ÉTAPE 2 : Créer votre clé API

Une fois déployé, connectez-vous à votre serveur et lancez :

```bash
npm run gpt:setup
```

**RÉSULTAT :** Vous verrez quelque chose comme :
```
🔑 Votre clé API:
torp_gpt_a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0

⚠️  IMPORTANT: Sauvegardez cette clé maintenant !
```

**👉 COPIEZ cette clé quelque part (bloc-notes, gestionnaire de mots de passe)**

---

### ✅ ÉTAPE 3 : Créer votre GPT dans ChatGPT

#### A. Aller sur ChatGPT

1. Ouvrez https://chat.openai.com
2. Cliquez sur votre nom (en haut à droite)
3. Cliquez sur **"My GPTs"**
4. Cliquez sur **"Create a GPT"** ou **"+ Create"**

#### B. Configurer les instructions

1. Dans l'onglet **"Configure"** (en haut)
2. Dans le champ **"Instructions"**, copiez ce texte :

```
Tu es un expert en analyse de devis de travaux de construction.

Quand on te demande d'analyser un devis :

1. Utilise l'action "getDevis" pour récupérer les données
2. Analyse selon 4 critères :
   - Prix (25%) : comparaison au marché
   - Qualité (30%) : certifications, santé financière
   - Conformité (25%) : normes, garanties
   - Délais (20%) : réalisme
3. Calcule un score sur 100
4. Soumets ton analyse avec l'action "submitAnalysis"
5. Présente les résultats à l'utilisateur :
   - Score et grade (A-E)
   - Points forts
   - Points faibles
   - Recommandations prioritaires

Sois clair, factuel et actionnable.
```

---

### ✅ ÉTAPE 4 : Ajouter l'action API

#### A. Dans l'onglet "Actions"

1. Cliquez sur **"Actions"** (en haut)
2. Cliquez sur **"Create new action"**

#### B. Importer le schéma

Dans le champ **"Schema"**, mettez cette URL :

```
https://votre-domaine.vercel.app/api/gpt/openapi
```

**OU** si ça ne marche pas, copiez manuellement le contenu de `/public/gpt-openapi-schema.json`

#### C. Configurer l'authentification

1. En bas, dans **"Authentication"**, cliquez dessus
2. Sélectionnez **"API Key"**
3. Remplissez :
   - **Auth Type** : `Bearer`
   - **API Key** : `torp_gpt_votre_clé_copiée_à_l_étape_2`
   - **Custom Header Name** : `Authorization`

4. Cliquez sur **"Save"**

---

### ✅ ÉTAPE 5 : Tester !

1. Sauvegardez votre GPT
2. Ouvrez une nouvelle conversation avec ce GPT
3. Tapez : **"Analyse le devis ID: [un-vrai-id-de-devis]"**

**Le GPT devrait :**
- ✅ Appeler l'API pour récupérer le devis
- ✅ L'analyser
- ✅ Enregistrer son analyse
- ✅ Vous présenter le résultat

---

## 🔍 Comment trouver un ID de devis pour tester ?

Dans votre base de données :

```sql
SELECT id, total_amount, created_at
FROM devis
ORDER BY created_at DESC
LIMIT 5;
```

Prenez un des IDs et testez avec le GPT !

---

## ❓ Questions fréquentes

### Q1 : Où trouver mon URL de domaine ?

Sur Vercel, après le déploiement, vous voyez :
```
✅ Deployment ready at: https://votre-projet.vercel.app
```

C'est votre URL ! Utilisez-la pour le schéma OpenAPI.

### Q2 : Comment vérifier que ça marche ?

Après qu'un GPT ait analysé un devis, vérifiez dans votre base de données :

```sql
SELECT * FROM gpt_analyses ORDER BY created_at DESC LIMIT 1;
```

Vous devriez voir l'analyse enregistrée !

### Q3 : Mon GPT n'appelle pas l'API

Vérifiez :
1. ✅ L'URL du schéma est correcte
2. ✅ La clé API est bien configurée dans "Authentication"
3. ✅ Le déploiement a réussi (vérifier Vercel)

### Q4 : Erreur 401 Unauthorized

➡️ La clé API est invalide. Créez-en une nouvelle :

```bash
npm run gpt:create-key "Ma nouvelle clé"
```

Et mettez-la à jour dans ChatGPT (Actions → Authentication)

---

## 📊 Voir les résultats

### Dans ChatGPT
Le GPT présente l'analyse directement dans la conversation

### Dans votre plateforme
L'analyse est enregistrée et peut être affichée sur la page du devis

### Dans la base de données
```sql
-- Toutes les analyses
SELECT
  d.id as devis_id,
  d.total_amount,
  g.gpt_score,
  g.gpt_grade,
  g.created_at
FROM gpt_analyses g
JOIN devis d ON g.devis_id = d.id
ORDER BY g.created_at DESC;
```

---

## 🆘 Besoin d'aide ?

1. Le déploiement a échoué ? → Regardez les logs Vercel
2. Le GPT n'appelle pas l'API ? → Vérifiez la configuration dans ChatGPT
3. Erreur 401 ? → Vérifiez la clé API
4. Autre problème ? → Regardez `docs/GPT_INTEGRATION_GUIDE.md`

---

## 🎉 C'est tout !

Une fois configuré, votre GPT peut analyser autant de devis que vous voulez, automatiquement !

**Résumé ultra-simple :**
1. ✅ Déploiement réussi
2. ✅ `npm run gpt:setup` → copier la clé
3. ✅ ChatGPT → My GPTs → Create → Configure
4. ✅ Ajouter l'action avec la clé API
5. ✅ Tester avec un ID de devis

**Temps estimé : 10 minutes**
