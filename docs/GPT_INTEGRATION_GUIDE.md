# Guide d'Intégration GPT - TORP Platform

Ce guide explique comment intégrer votre agent GPT personnalisé avec la plateforme TORP pour analyser automatiquement les devis de construction.

## 📋 Vue d'ensemble

L'intégration GPT permet à votre agent ChatGPT de :
- ✅ Récupérer les données d'un devis depuis la plateforme TORP
- ✅ Analyser le devis de manière autonome
- ✅ Fournir un score et des recommandations
- ✅ Enregistrer l'analyse dans la plateforme

## 🔑 Étape 1 : Générer une clé API

### Option A : Via le script CLI (recommandé)

```bash
# Créer une nouvelle clé API
npm run gpt:create-key "Mon Agent GPT Production"

# La clé sera affichée (format: torp_gpt_xxxxx)
# ⚠️ IMPORTANT : Sauvegardez cette clé, elle ne sera plus affichée !
```

### Option B : Via la base de données (manuel)

```typescript
// Utiliser le service directement
import { createApiKey } from '@/services/gpt/api-key-service';

const apiKey = await createApiKey({
  name: 'Mon Agent GPT',
  rateLimit: 100, // 100 requêtes/heure
  permissions: {},
});

console.log('Clé API:', apiKey.apiKey);
```

## 🤖 Étape 2 : Configurer votre GPT dans ChatGPT

### 1. Accéder au GPT Builder

1. Aller sur [ChatGPT](https://chat.openai.com)
2. Cliquer sur votre nom → "My GPTs"
3. Sélectionner votre GPT ou créer un nouveau
4. Cliquer sur "Configure"

### 2. Configurer l'action

Dans l'onglet "Actions" :

#### a) Importer le schéma OpenAPI

**Option 1 : URL publique (recommandé)**
```
Schéma URL: https://votre-domaine.fr/api/gpt/openapi
```

**Option 2 : Import manuel**
- Copier le contenu de `/public/gpt-openapi-schema.json`
- Coller dans l'éditeur de schéma

#### b) Configurer l'authentification

1. Cliquer sur "Authentication"
2. Sélectionner "API Key"
3. Configuration :
   - **Auth Type** : Bearer
   - **API Key** : `torp_gpt_xxxxxxxx` (votre clé générée)
   - **Header Name** : `Authorization`

### 3. Tester l'intégration

Dans l'éditeur GPT, tester les actions :

```
Test 1 : Récupérer un devis
Action: getDevis
Parameters: { "id": "votre-devis-id" }

Test 2 : Soumettre une analyse
Action: submitAnalysis
Parameters: {
  "devisId": "votre-devis-id",
  "gptScore": 75,
  "analysis": {...},
  "recommendations": [...]
}
```

## 📝 Étape 3 : Configurer les instructions du GPT

Voici un exemple d'instructions pour votre GPT :

```markdown
Tu es un expert en analyse de devis de travaux de construction.

## Ton rôle
Analyser les devis de construction et fournir des recommandations basées sur :
- Le prix par rapport au marché
- La qualité de l'entreprise (certifications, réputation)
- La conformité réglementaire (DTU, normes)
- Les délais proposés

## Processus d'analyse

1. **Récupérer le devis** via l'action `getDevis`
2. **Analyser les données** :
   - Montant total et détails des postes
   - Informations entreprise (SIRET, certifications RGE, santé financière)
   - Score TORP existant (si disponible)
   - Données enrichies

3. **Calculer un score GPT** (0-100)
   - Prix : 25%
   - Qualité : 30%
   - Conformité : 25%
   - Délais : 20%

4. **Identifier** :
   - ✅ Points forts (strengths)
   - ⚠️ Points faibles (weaknesses)
   - 🚨 Alertes critiques (alerts)
   - 💡 Recommandations (recommendations)

5. **Soumettre l'analyse** via l'action `submitAnalysis`

## Format de recommandations

Chaque recommandation doit avoir :
- **type** : prix / qualité / délais / conformité
- **priority** : low / medium / high / critical
- **title** : Titre court
- **description** : Explication détaillée
- **action** : Action recommandée à l'utilisateur

## Exemple de score

Score 85/100 = Grade A
Score 70-84 = Grade B
Score 50-69 = Grade C
Score 30-49 = Grade D
Score < 30 = Grade E
```

## 🧪 Étape 4 : Tester l'intégration complète

### Test complet via ChatGPT

1. Ouvrir une conversation avec votre GPT
2. Demander : "Analyse le devis ID: xxx-xxx-xxx"
3. Le GPT devrait :
   - Récupérer les données du devis
   - Faire son analyse
   - Soumettre le score et recommandations
   - Vous présenter le résultat

### Vérifier dans la base de données

```sql
-- Vérifier que l'analyse a été enregistrée
SELECT * FROM gpt_analyses
WHERE devis_id = 'votre-devis-id'
ORDER BY created_at DESC
LIMIT 1;
```

## 📊 Utiliser les analyses GPT dans l'interface

Les analyses GPT sont automatiquement affichées dans :
- `/analysis/[id]` - Page détails du devis
- Section "Analyse GPT" avec score, grade, recommandations

## 🔒 Sécurité

### Bonnes pratiques

✅ **À faire** :
- Stocker la clé API de manière sécurisée
- Utiliser HTTPS uniquement
- Définir un rate limit approprié
- Monitorer l'usage des clés

❌ **À éviter** :
- Partager la clé API publiquement
- Commit la clé dans Git
- Utiliser la même clé pour dev/prod

### Rotation des clés

```bash
# Désactiver une clé
npm run gpt:deactivate-key "torp_gpt_xxxxx"

# Créer une nouvelle clé
npm run gpt:create-key "Nouvelle clé"

# Lister toutes les clés
npm run gpt:list-keys
```

## 🐛 Dépannage

### Erreur 401 - Authentication failed

**Cause** : Clé API invalide ou expirée
**Solution** :
- Vérifier que la clé est active
- Vérifier le format : `Bearer torp_gpt_xxxxx`
- Régénérer une nouvelle clé si nécessaire

### Erreur 404 - Devis not found

**Cause** : L'ID du devis n'existe pas
**Solution** :
- Vérifier l'ID du devis
- S'assurer que le devis existe dans la base

### Erreur 429 - Rate limit exceeded

**Cause** : Limite de requêtes dépassée
**Solution** :
- Attendre la réinitialisation (1 heure)
- Augmenter le rate limit de la clé

### Le GPT n'appelle pas les actions

**Cause** : Schéma OpenAPI mal configuré
**Solution** :
- Vérifier l'URL du schéma
- Re-importer le schéma manuellement
- Tester les actions dans le GPT Builder

## 📚 Ressources

- **Schéma OpenAPI** : `/public/gpt-openapi-schema.json`
- **Documentation API** : `https://votre-domaine.fr/api/gpt/openapi`
- **Code source** :
  - Services : `/services/gpt/`
  - Endpoints : `/app/api/gpt/`
  - Middleware : `/lib/gpt-auth-middleware.ts`

## 🆘 Support

En cas de problème :
1. Vérifier les logs serveur
2. Tester les endpoints avec Postman/cURL
3. Consulter la documentation OpenAI
4. Contacter l'équipe technique TORP

---

**Dernière mise à jour** : 2025-11-11
**Version de l'API** : 1.0.0
