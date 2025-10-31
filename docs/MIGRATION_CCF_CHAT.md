# Migration CCF, Chat et Documents Complémentaires

## Vue d'ensemble

Cette migration ajoute les fonctionnalités suivantes au système TORP :

1. **CCF (Cahier des Charges Fonctionnel)** : Wizard pour définir les besoins du projet
2. **Chat conversationnel** : Assistant pour discuter des analyses
3. **Documents complémentaires** : Upload de documents liés aux recommandations
4. **Feedback sur recommandations** : Système de notation et retour utilisateur
5. **APIs externes** : Intégration avec API Adresse, ONTB, PLU, DPE, Urbanisme

## Nouveaux modèles de données

### `ProjectCCF`
- Stocke les informations du projet (type, localisation, budget, contraintes)
- Lié au devis pour enrichir l'analyse
- Inclut les données bâti récupérées depuis les APIs externes

### `ChatMessage`
- Messages entre l'utilisateur et l'assistant
- Peut être lié à une recommandation ou un document
- Historique complet de la conversation

### `ComplementaryDocument`
- Documents uploadés en réponse aux recommandations
- Liés à une recommandation spécifique
- Statut de validation (pending, validated, rejected)

### `RecommendationFeedback`
- Feedback utilisateur sur les recommandations
- Rating (1-5 étoiles)
- Indicateur d'utilité et d'action prise

### `ExternalDataCache`
- Cache pour les données des APIs externes
- Réduit les appels répétés
- Expiration automatique

## Migration

### 1. Appliquer la migration

```bash
# En développement
npm run db:migrate

# En production (Vercel)
# La migration s'applique automatiquement via db:migrate:deploy
```

### 2. Générer le client Prisma

```bash
npm run db:generate
```

### 3. Vérifier la migration

Les nouvelles tables doivent apparaître dans votre base de données :
- `project_ccf`
- `chat_messages`
- `complementary_documents`
- `recommendation_feedback`
- `external_data_cache`

## Nouvelles fonctionnalités

### Page d'Upload (`/upload`)
- **Wizard CCF** : Bouton optionnel pour définir le projet avant upload
- **Intégration données bâti** : Récupération automatique depuis APIs
- **Enrichissement** : Les données CCF sont utilisées pour l'analyse

### Page d'Analyse (`/analysis/[id]`)
- **Chat intégré** : Bouton pour ouvrir le chat assistant
- **Recommandations interactives** : Upload de documents directement depuis les recommandations
- **Feedback** : Notation des recommandations avec étoiles

### APIs disponibles

- `/api/ccf` : CRUD pour les CCF
- `/api/chat/send` : Envoyer un message
- `/api/chat/messages` : Récupérer les messages d'un devis
- `/api/documents/complementary` : Upload de documents complémentaires
- `/api/recommendations/feedback` : Feedback sur les recommandations
- `/api/external/address` : Recherche d'adresse
- `/api/external/building` : Données bâti agrégées

## Configuration requise

### Variables d'environnement

Aucune nouvelle variable d'environnement requise. Les APIs externes utilisent les endpoints publics :
- API Adresse : `https://api-adresse.data.gouv.fr` (sans clé)
- APIs Urbanisme/Bâti : Placeholders pour intégration future

### Dépendances

Toutes les dépendances sont déjà présentes dans `package.json`.

## Notes

- Les APIs ONTB, PLU, DPE nécessitent des intégrations futures avec les services officiels
- Le chat utilise actuellement des réponses basiques (à améliorer avec Claude)
- Les documents complémentaires sont uploadés vers S3 (configuration AWS requise)

