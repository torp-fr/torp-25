# Correction Automatique Railway - Guide Simple

## 🎯 Solution Automatique en 1 Commande

Si Railway est connecté et que vous avez `DATABASE_URL` configuré, exécutez simplement :

```bash
npm run db:cleanup
```

Ce script va **automatiquement** :
1. ✅ Se connecter à Railway
2. ✅ Supprimer toutes les migrations RNB échouées
3. ✅ Supprimer les tables RNB si elles existent
4. ✅ Supprimer l'enum RNB s'il existe
5. ✅ Vérifier que tout est propre
6. ✅ Vous dire si c'est prêt pour le déploiement

## 📋 Si vous n'avez pas DATABASE_URL configuré localement

### Option 1 : Configurer DATABASE_URL localement

1. **Récupérer DATABASE_URL depuis Railway** :
   - Aller sur [Railway Dashboard](https://railway.app)
   - Sélectionner votre projet PostgreSQL
   - Cliquer sur l'onglet "Variables"
   - Copier la valeur de `DATABASE_URL` (ou `POSTGRES_URL`)

2. **Créer un fichier `.env.local`** à la racine du projet :
   ```bash
   DATABASE_URL="votre-url-railway-postgresql"
   ```

3. **Exécuter le nettoyage** :
   ```bash
   npm run db:cleanup
   ```

### Option 2 : Utiliser Railway CLI

Si vous avez Railway CLI installé :

```bash
railway run npm run db:cleanup
```

### Option 3 : Script SQL Direct (Alternative)

Si les options précédentes ne fonctionnent pas, utilisez le script SQL directement dans Railway :

**Fichier : `scripts/railway-auto-fix.sql`**

Copiez le contenu et exécutez-le dans Railway SQL Editor.

## ✅ Après le Nettoyage

Une fois le script exécuté avec succès :

1. ✅ Vous verrez : "✅ SUCCÈS ! La base Railway est maintenant propre"
2. ✅ Relancez le déploiement sur Vercel
3. ✅ La migration `20250129_add_rnb_models` devrait s'appliquer

## 🆘 Dépannage

### Erreur : "Environment variable not found: DATABASE_URL"

**Solution** : Créez un fichier `.env.local` avec votre DATABASE_URL de Railway.

### Erreur : "Can't reach database server"

**Solution** : Vérifiez que :
- La base Railway est active
- DATABASE_URL est correct
- Votre IP n'est pas bloquée (Railway n'a généralement pas de firewall)

### Le script ne trouve pas certaines migrations

**Solution** : Le script recherche automatiquement toutes les migrations RNB. Si une migration échouée n'est pas trouvée, vérifiez manuellement dans Railway SQL Editor.

