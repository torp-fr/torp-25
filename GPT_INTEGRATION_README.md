# 🤖 Intégration GPT - TORP Platform

L'intégration GPT est maintenant configurée ! Votre agent ChatGPT peut analyser automatiquement les devis.

## 🚀 Démarrage rapide (3 étapes)

### 1️⃣ Générer une clé API
```bash
npm run gpt:create-key "Mon Agent GPT"
```
Sauvegardez la clé affichée (format: `torp_gpt_xxxxx`)

### 2️⃣ Configurer votre GPT dans ChatGPT

1. Aller sur [ChatGPT](https://chat.openai.com) → "My GPTs"
2. Sélectionner votre GPT → "Configure" → "Actions"
3. **Importer le schéma** :
   - URL: `https://votre-domaine.fr/api/gpt/openapi`
   - Ou copier `/public/gpt-openapi-schema.json`
4. **Authentification** :
   - Type: Bearer
   - API Key: `torp_gpt_xxxxx`

### 3️⃣ Tester

```
Demander au GPT: "Analyse le devis ID: xxx-xxx-xxx"
```

## 📚 Documentation complète

Voir le guide détaillé : [`/docs/GPT_INTEGRATION_GUIDE.md`](/docs/GPT_INTEGRATION_GUIDE.md)

## 🔧 Commandes utiles

```bash
# Lister toutes les clés API
npm run gpt:list-keys

# Désactiver une clé
npm run gpt:deactivate-key "torp_gpt_xxxxx"

# Réactiver une clé
npm run gpt:activate-key "torp_gpt_xxxxx"

# Supprimer une clé (irréversible)
npm run gpt:delete-key "torp_gpt_xxxxx"
```

## 🔌 Endpoints API

- **GET** `/api/gpt/devis/[id]` - Récupérer un devis
- **POST** `/api/gpt/analysis` - Soumettre une analyse
- **GET** `/api/gpt/analysis?devisId=xxx` - Récupérer les analyses
- **GET** `/api/gpt/openapi` - Schéma OpenAPI

## 🗄️ Base de données

Deux nouvelles tables ont été ajoutées :
- `gpt_api_keys` - Clés API pour l'authentification
- `gpt_analyses` - Analyses GPT stockées

Exécuter la migration :
```bash
npm run db:generate
npm run db:push
```

## 📊 Structure d'une analyse GPT

```json
{
  "devisId": "uuid",
  "gptScore": 75,
  "gptGrade": "B",
  "confidence": 85,
  "analysis": {
    "summary": "...",
    "details": {...}
  },
  "recommendations": [
    {
      "type": "prix",
      "priority": "high",
      "title": "Prix élevé",
      "description": "Le prix est 15% au-dessus du marché",
      "action": "Négocier une réduction"
    }
  ],
  "alerts": [...],
  "strengths": [...],
  "weaknesses": [...]
}
```

## 🔒 Sécurité

- ✅ Authentification par clé API Bearer
- ✅ Rate limiting (100 requêtes/heure par défaut)
- ✅ Validation des données
- ✅ Support expiration des clés

## 🆘 Besoin d'aide ?

- Documentation complète : `/docs/GPT_INTEGRATION_GUIDE.md`
- Schéma OpenAPI : `/public/gpt-openapi-schema.json`
- Code source : `/services/gpt/` et `/app/api/gpt/`

---

**Version** : 1.0.0 | **Date** : 2025-11-11
