# 🚀 Déploiement de l'Intégration GPT

Guide pour déployer l'intégration GPT en production.

## 📋 Prérequis

- Accès à la base de données production
- Variables d'environnement configurées
- Node.js et npm installés

## 🔧 Étapes de déploiement

### 1. Appliquer les migrations Prisma

```bash
# Générer le client Prisma
npx prisma generate

# Appliquer les migrations
npx prisma migrate deploy

# OU en une seule commande
npm run db:migrate:deploy
```

Cela créera les tables suivantes :
- `gpt_api_keys` - Gestion des clés API
- `gpt_analyses` - Stockage des analyses GPT

### 2. Configurer l'intégration

```bash
# Exécuter le script de setup
npm run gpt:setup
```

Ce script :
- ✅ Vérifie que les tables existent
- ✅ Crée une clé API initiale
- ✅ Affiche les instructions de configuration

**Résultat attendu :**
```
🔑 Votre clé API:
torp_gpt_xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx

⚠️  IMPORTANT: Sauvegardez cette clé maintenant !
```

### 3. Vérifier l'installation

```bash
# Lister les clés API
npm run gpt:list-keys

# Résultat attendu:
# 1. GPT Initial Key
#    Clé: torp_gpt_xxxxx***
#    Status: ✓ Active
```

## 🔒 Configuration de sécurité

### Variables d'environnement requises

Assurez-vous que ces variables sont configurées :

```env
# URL de l'application (pour le schéma OpenAPI)
NEXT_PUBLIC_APP_URL=https://votre-domaine.fr

# Base de données
DATABASE_URL=postgresql://...
```

### Limites de sécurité

Par défaut, chaque clé API a :
- **Rate limit** : 100 requêtes/heure
- **Authentification** : Bearer token obligatoire
- **Expiration** : Optionnelle (non définie par défaut)

Pour modifier les limites lors de la création :

```bash
# Créer une clé avec 200 req/h
npm run gpt:create-key "Production GPT" 200
```

## 🧪 Tests post-déploiement

### 1. Tester les endpoints

```bash
# Test avec curl
export API_KEY="torp_gpt_xxxxx"
export BASE_URL="https://votre-domaine.fr"

# Test 1: Schéma OpenAPI
curl -X GET "$BASE_URL/api/gpt/openapi"

# Test 2: Récupérer un devis (remplacer DEVIS_ID)
curl -X GET "$BASE_URL/api/gpt/devis/DEVIS_ID" \
  -H "Authorization: Bearer $API_KEY"

# Test 3: Soumettre une analyse de test
curl -X POST "$BASE_URL/api/gpt/analysis" \
  -H "Authorization: Bearer $API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "devisId": "DEVIS_ID",
    "gptScore": 75,
    "gptGrade": "B",
    "confidence": 85,
    "analysis": {
      "summary": "Test analysis"
    },
    "recommendations": [
      {
        "type": "prix",
        "priority": "medium",
        "title": "Test",
        "description": "Test recommendation"
      }
    ]
  }'
```

### 2. Vérifier les logs

```bash
# Vérifier les logs de l'application
# (adapté selon votre système de logs)
```

### 3. Tester avec ChatGPT

1. Configurer le GPT (voir section suivante)
2. Tester avec un devis réel
3. Vérifier que l'analyse est enregistrée dans la BDD

## 🤖 Configuration du GPT dans ChatGPT

### Étape 1 : Accéder au GPT Builder

1. Aller sur [ChatGPT](https://chat.openai.com)
2. Cliquer sur votre nom → "My GPTs"
3. Créer un nouveau GPT ou modifier un existant
4. Aller dans "Configure"

### Étape 2 : Configurer l'Action

1. Aller dans l'onglet "Actions"
2. Cliquer sur "Create new action"

**Schéma OpenAPI :**
```
https://votre-domaine.fr/api/gpt/openapi
```

**Ou copier manuellement :**
- Ouvrir `/public/gpt-openapi-schema.json`
- Copier tout le contenu
- Coller dans l'éditeur de schéma

### Étape 3 : Configurer l'authentification

1. Cliquer sur "Authentication"
2. Sélectionner **"API Key"**
3. Configuration :
   - **Auth Type** : Bearer
   - **API Key** : `torp_gpt_xxxxxxxx` (votre clé générée)
   - **Custom Header Name** : `Authorization`

### Étape 4 : Configurer les instructions

Copier le contenu de `/docs/GPT_PROMPT_EXAMPLE.md` dans les instructions du GPT.

### Étape 5 : Tester

1. Sauvegarder le GPT
2. Ouvrir une conversation
3. Tester : "Analyse le devis ID: xxx-xxx-xxx"

## 📊 Monitoring

### Surveiller l'usage des clés

```bash
# Lister les clés avec leur usage
npm run gpt:list-keys
```

**Métriques importantes :**
- `usageCount` : Nombre de requêtes
- `lastUsedAt` : Dernière utilisation
- `isActive` : Statut actif/inactif

### Logs applicatifs

Surveiller les logs pour :
- Erreurs d'authentification (401)
- Rate limiting (429)
- Erreurs serveur (500)

```bash
# Exemple avec grep (adaptez selon votre système)
tail -f logs/app.log | grep "gpt"
```

### Base de données

```sql
-- Nombre d'analyses par jour
SELECT
  DATE(created_at) as date,
  COUNT(*) as analyses_count
FROM gpt_analyses
GROUP BY DATE(created_at)
ORDER BY date DESC;

-- Top des devis analysés
SELECT
  devis_id,
  COUNT(*) as analysis_count,
  AVG(gpt_score) as avg_score
FROM gpt_analyses
GROUP BY devis_id
ORDER BY analysis_count DESC
LIMIT 10;
```

## 🔄 Rotation des clés

### Bonnes pratiques

- ✅ Créer des clés séparées pour dev/staging/prod
- ✅ Définir des dates d'expiration
- ✅ Monitorer l'usage régulièrement
- ✅ Désactiver les clés non utilisées

### Processus de rotation

```bash
# 1. Créer une nouvelle clé
npm run gpt:create-key "Production GPT v2"

# 2. Mettre à jour la clé dans ChatGPT

# 3. Tester la nouvelle clé

# 4. Désactiver l'ancienne clé
npm run gpt:deactivate-key "torp_gpt_old_key"

# 5. (Optionnel) Supprimer l'ancienne après quelques jours
npm run gpt:delete-key "torp_gpt_old_key"
```

## 🐛 Dépannage

### Erreur "Tables not found"

**Cause :** Migrations non appliquées

**Solution :**
```bash
npx prisma migrate deploy
npm run gpt:setup
```

### Erreur 401 lors des tests

**Cause :** Clé API invalide

**Solution :**
- Vérifier le format : `Bearer torp_gpt_xxxxx`
- Vérifier que la clé est active : `npm run gpt:list-keys`
- Créer une nouvelle clé si nécessaire

### Le GPT n'appelle pas les actions

**Cause :** Schéma OpenAPI mal configuré

**Solution :**
1. Vérifier l'URL : `https://votre-domaine.fr/api/gpt/openapi`
2. Re-importer le schéma dans ChatGPT
3. Vérifier l'authentification
4. Tester les actions dans le GPT Builder

### Rate limit dépassé

**Cause :** Trop de requêtes

**Solution :**
```bash
# Augmenter le rate limit d'une clé existante
# (nécessite de modifier manuellement dans la BDD ou créer une nouvelle clé)

npm run gpt:create-key "GPT High Volume" 500
```

## 📈 Optimisations

### Performance

- ✅ Les clés API sont cachées en mémoire (validation rapide)
- ✅ Index sur tous les champs de recherche
- ✅ Foreign keys avec CASCADE pour la suppression

### Scalabilité

Si vous dépassez 1000 requêtes/heure :
1. Créer plusieurs clés API avec rate limits plus élevés
2. Implémenter un système de load balancing
3. Considérer Redis pour le cache des clés

## 🆘 Support

En cas de problème :

1. Consulter les logs de l'application
2. Vérifier la base de données
3. Tester les endpoints manuellement avec curl
4. Consulter la documentation : `/docs/GPT_INTEGRATION_GUIDE.md`

---

**Version** : 1.0.0
**Dernière mise à jour** : 2025-11-11
