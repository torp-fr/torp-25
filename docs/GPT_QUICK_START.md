# ⚡ Démarrage Rapide - Intégration GPT

Configuration en 5 minutes ! 🚀

## 🎯 Objectif

Permettre à votre agent GPT ChatGPT d'analyser automatiquement les devis sur la plateforme TORP.

## 📦 Ce qui a été fait

✅ **API complète** avec 4 endpoints sécurisés
✅ **Authentification** par clé API Bearer
✅ **Base de données** avec 2 nouvelles tables
✅ **Scripts CLI** pour gérer les clés
✅ **Documentation** complète
✅ **Schéma OpenAPI** prêt pour ChatGPT

## 🚀 3 étapes pour démarrer

### 1️⃣ Déployer les changements (2 min)

```bash
# Appliquer les migrations en production
npx prisma generate
npx prisma migrate deploy

# Configurer l'intégration
npm run gpt:setup
```

**Résultat :** Vous recevez votre clé API
```
🔑 Votre clé API:
torp_gpt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx
```

⚠️ **Sauvegardez cette clé maintenant !**

### 2️⃣ Configurer ChatGPT (2 min)

1. Aller sur [ChatGPT](https://chat.openai.com) → **"My GPTs"**
2. Sélectionner votre GPT → **"Configure"** → **"Actions"**
3. **Schéma OpenAPI** :
   ```
   https://votre-domaine.fr/api/gpt/openapi
   ```
4. **Authentification** :
   - Type : **Bearer**
   - API Key : `torp_gpt_xxxxx`

### 3️⃣ Tester (1 min)

Dans ChatGPT :
```
Analyse le devis ID: xxx-xxx-xxx
```

Le GPT va :
1. 🔍 Récupérer les données du devis
2. 🧠 Analyser (prix, qualité, conformité, délais)
3. 📊 Calculer un score
4. 💡 Fournir des recommandations
5. 💾 Enregistrer l'analyse

## 📁 Fichiers importants

| Fichier | Description |
|---------|-------------|
| `GPT_INTEGRATION_README.md` | Vue d'ensemble rapide |
| `docs/GPT_INTEGRATION_GUIDE.md` | **Guide complet** |
| `docs/GPT_DEPLOYMENT.md` | Guide de déploiement production |
| `docs/GPT_PROMPT_EXAMPLE.md` | **Prompt prêt à copier** |
| `public/gpt-openapi-schema.json` | Schéma OpenAPI |

## 🔧 Commandes utiles

```bash
# Setup initial
npm run gpt:setup

# Gérer les clés
npm run gpt:create-key "Nom"
npm run gpt:list-keys
npm run gpt:deactivate-key "clé"

# Migrations
npx prisma generate
npx prisma migrate deploy
```

## 🎨 Personnaliser le GPT

Copier le prompt de `/docs/GPT_PROMPT_EXAMPLE.md` et le coller dans les **instructions** de votre GPT.

Ce prompt contient :
- Le rôle du GPT
- Les critères d'analyse (4 axes)
- Le format de réponse
- Des exemples concrets

## 📊 Vérifier que ça fonctionne

### Dans la base de données

```sql
-- Voir les analyses GPT
SELECT * FROM gpt_analyses ORDER BY created_at DESC LIMIT 10;

-- Voir l'usage des clés
SELECT name, usage_count, last_used_at FROM gpt_api_keys;
```

### Dans l'interface TORP

Les analyses GPT apparaîtront automatiquement dans :
- `/analysis/[id]` - Page détails du devis
- Section "Analyse GPT"

## 🐛 Problèmes ?

| Erreur | Solution |
|--------|----------|
| Tables not found | Exécuter `npx prisma migrate deploy` |
| 401 Unauthorized | Vérifier la clé API dans ChatGPT |
| GPT n'appelle pas | Re-importer le schéma OpenAPI |
| Rate limit | Créer une clé avec limite plus haute |

## 📚 Documentation complète

Pour plus de détails :
- **Guide complet** : `docs/GPT_INTEGRATION_GUIDE.md`
- **Déploiement** : `docs/GPT_DEPLOYMENT.md`
- **Schéma API** : `public/gpt-openapi-schema.json`

## 🎯 Structure de l'API

```
GET  /api/gpt/devis/[id]        → Récupérer un devis
POST /api/gpt/analysis          → Soumettre une analyse
GET  /api/gpt/analysis?devisId  → Récupérer les analyses
GET  /api/gpt/openapi           → Schéma OpenAPI
```

## 💡 Exemple d'analyse GPT

```json
{
  "devisId": "abc-123",
  "gptScore": 75,
  "gptGrade": "B",
  "confidence": 85,
  "analysis": {
    "summary": "Devis globalement correct avec quelques points d'attention"
  },
  "recommendations": [
    {
      "type": "prix",
      "priority": "high",
      "title": "Prix 15% au-dessus du marché",
      "description": "...",
      "action": "Négocier une réduction"
    }
  ],
  "alerts": [...],
  "strengths": [...],
  "weaknesses": [...]
}
```

## 🚀 C'est prêt !

Vous avez maintenant une intégration complète entre votre plateforme TORP et ChatGPT !

**Questions ?** Consultez `docs/GPT_INTEGRATION_GUIDE.md` pour tous les détails.

---

**Version** : 1.0.0 | **Date** : 2025-11-11
