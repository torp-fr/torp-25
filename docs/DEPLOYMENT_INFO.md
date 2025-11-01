# 🚀 Information de Déploiement

## ✅ Déploiement Automatique

Un nouveau commit a été poussé sur `main` :
- **Commit**: `3e50880` - Système propriétaire/locataire complet avec migration appliquée
- **Date**: $(Get-Date -Format "yyyy-MM-dd HH:mm")

### Changements Déployés

- ✅ **Nouvelle route API** : `/api/building-profiles/[id]/tenant` pour créer des cartes locataires
- ✅ **Documentation complète** : `docs/BUILDING_PROFILE_SYSTEM.md`
- ✅ **Scripts de migration** : Pour application et vérification
- ✅ **Migration appliquée** : Base de données Railway synchronisée

## 📋 Vérification du Déploiement

### Option 1 : Via Vercel Dashboard

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet
3. Vérifiez l'onglet **Deployments**
4. Le nouveau déploiement devrait apparaître avec le commit `3e50880`

### Option 2 : Via GitHub

1. Allez sur votre repository GitHub
2. Vérifiez l'onglet **Actions** (si GitHub Actions est configuré)
3. Ou allez dans **Settings → Webhooks** pour voir les webhooks Vercel

### Option 3 : Via l'Application

Une fois le déploiement terminé, testez :

1. **Création d'une carte propriétaire** :
   ```
   POST /api/building-profiles
   {
     "userId": "...",
     "address": "...",
     "role": "PROPRIETAIRE"
   }
   ```

2. **Création d'une carte locataire** :
   ```
   POST /api/building-profiles/{parentId}/tenant
   {
     "userId": "...",
     "name": "..."
   }
   ```

## 🔍 Statut de la Migration

La migration a été appliquée avec succès sur Railway :

- ✅ Enum `building_profile_role` créé
- ✅ Colonnes `role`, `parent_profile_id`, `lot_number`, `tenant_data` ajoutées
- ✅ Index unique pour garantir l'unicité des cartes propriétaire
- ✅ Relations parent/enfant configurées
- ✅ Client Prisma régénéré

## ⚠️ Important

Si le déploiement échoue, vérifiez :

1. **Variables d'environnement Vercel** :
   - `DATABASE_URL` doit être configurée (Railway)
   - Toutes les variables Auth0 doivent être présentes

2. **Build Logs** :
   - Vérifiez les logs de build dans Vercel
   - Recherchez les erreurs liées à Prisma ou TypeScript

3. **Base de données** :
   - La migration doit être appliquée (✅ déjà fait)
   - Vérifiez la connexion : `DATABASE_URL` correcte

## 📊 Après Déploiement

Une fois le déploiement terminé :

1. ✅ Les nouvelles routes API seront disponibles
2. ✅ Le système propriétaire/locataire sera opérationnel
3. ✅ L'enrichissement DVF sera actif pour les nouvelles cartes

---

**Statut** : Déploiement en cours... ⏳

