# Configuration Vercel pour TORP

## Variables d'environnement requises

Pour que l'application fonctionne correctement sur Vercel, vous devez configurer les variables d'environnement suivantes :

### 1. Accéder aux paramètres Vercel

1. Allez sur [Vercel Dashboard](https://vercel.com/dashboard)
2. Sélectionnez votre projet TORP
3. Allez dans **Settings** → **Environment Variables**

### 2. Variables Auth0 (OBLIGATOIRES)

Ces variables sont nécessaires pour l'authentification des utilisateurs :

```env
AUTH0_SECRET=votre-secret-aleatoire-de-32-caracteres
AUTH0_BASE_URL=https://votre-domaine.vercel.app
AUTH0_ISSUER_BASE_URL=https://votre-tenant.auth0.com
AUTH0_CLIENT_ID=votre-client-id
AUTH0_CLIENT_SECRET=votre-client-secret
```

**Comment obtenir ces valeurs :**

1. Connectez-vous à [Auth0 Dashboard](https://manage.auth0.com/)
2. Allez dans **Applications** → **Applications**
3. Sélectionnez ou créez une application de type "Regular Web Application"
4. Copiez les valeurs suivantes :
   - **Domain** → `AUTH0_ISSUER_BASE_URL` (ajoutez `https://` devant)
   - **Client ID** → `AUTH0_CLIENT_ID`
   - **Client Secret** → `AUTH0_CLIENT_SECRET`
5. Pour `AUTH0_SECRET`, générez une chaîne aléatoire de 32 caractères :
   ```bash
   openssl rand -hex 32
   ```
6. Pour `AUTH0_BASE_URL`, utilisez votre URL Vercel (ex: `https://torp.vercel.app`)

7. **Important** : Dans Auth0, configurez les URLs autorisées :
   - **Allowed Callback URLs** : `https://votre-domaine.vercel.app/api/auth/callback`
   - **Allowed Logout URLs** : `https://votre-domaine.vercel.app`
   - **Allowed Web Origins** : `https://votre-domaine.vercel.app`

### 3. Variables de base de données (OBLIGATOIRES)

```env
DATABASE_URL=postgresql://user:password@host:5432/database?schema=public
```

**Options recommandées :**
- [Vercel Postgres](https://vercel.com/docs/storage/vercel-postgres)
- [Supabase](https://supabase.com/)
- [Neon](https://neon.tech/)

### 4. Variables AWS (OPTIONNELLES)

Pour le stockage de fichiers sur S3 :

```env
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=votre-access-key
AWS_SECRET_ACCESS_KEY=votre-secret-key
AWS_S3_BUCKET_NAME=torp-documents-prod
```

**Note** : Si ces variables ne sont pas configurées, l'application utilisera un mode de stockage local (développement uniquement).

### 5. Variables de l'application

```env
NEXT_PUBLIC_APP_URL=https://votre-domaine.vercel.app
NODE_ENV=production
```

## Après la configuration

1. Redéployez votre application pour que les changements prennent effet
2. Testez la connexion en cliquant sur le bouton "Connexion" ou "Commencer"
3. Si vous voyez une erreur JSON avec le message "Auth0 not configured", vérifiez que toutes les variables sont bien configurées

## Vérification

Pour vérifier que Auth0 est correctement configuré, visitez :
- `https://votre-domaine.vercel.app/api/auth-check`
- `https://votre-domaine.vercel.app/api/auth-debug`

Ces routes vous indiqueront quelles variables sont manquantes.

## Déploiement

Après avoir configuré les variables d'environnement :

```bash
# Pousser vers la branche
git push origin votre-branche

# Ou redéployer manuellement depuis Vercel Dashboard
# Deployments → ... → Redeploy
```

## Troubleshooting

### Erreur "Auth0 not configured"
→ Vérifiez que toutes les variables AUTH0_* sont configurées dans Vercel

### Erreur "secret is required"
→ Vérifiez que AUTH0_SECRET est bien configuré (32+ caractères)

### Erreur 404 sur /api/auth/login
→ Redéployez l'application après avoir ajouté les variables

### Erreur "Callback URL mismatch"
→ Vérifiez que les URLs de callback sont correctement configurées dans Auth0

## Support

Pour plus d'informations :
- [Documentation Auth0](https://auth0.com/docs/quickstart/webapp/nextjs)
- [Documentation Vercel](https://vercel.com/docs/concepts/projects/environment-variables)
