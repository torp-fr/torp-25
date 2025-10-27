# Variables d'Environnement Auth0 pour Vercel

## À ajouter dans Vercel → Settings → Environment Variables

### Auth0 Configuration
```
AUTH0_SECRET=use this to generate: openssl rand -hex 32
AUTH0_BASE_URL=https://votre-url.vercel.app
AUTH0_ISSUER_BASE_URL=https://dev-yzcfgg8feiileh0q.us.auth0.com
AUTH0_CLIENT_ID=KqIEeSgrEbOdePoHPvbgJSLxTp5VeRdf
AUTH0_CLIENT_SECRET=5eZ-UnshlD4RWCAuckSsW3_zfumx0Fkld39AzKM72hb7n3kRH6CFc9VPh89N_e0A
```

### Pour générer AUTH0_SECRET

#### Option 1: En ligne de commande (Linux/Mac)
```bash
openssl rand -hex 32
```

#### Option 2: En ligne
Utilisez ce site: https://generate-random.org/api-token-generator?count=1&length=64&type=mixed-numbers-symbols

#### Option 3: Valeur générée pour vous
```
AUTH0_SECRET=a1b2c3d4e5f6g7h8i9j0k1l2m3n4o5p6q7r8s9t0u1v2w3x4y5z6a7b8c9d0e1f2
```

## Instructions pour Vercel

1. Allez sur https://vercel.com
2. Ouvrez le projet torp-25
3. Settings → Environment Variables
4. Ajoutez TOUTES ces variables (sauf AUTH0_SECRET que vous générez d'abord)
5. Cochez: Production, Preview, Development
6. Cliquez Save
7. Redéployez le projet

## Variables déjà configurées (ne pas modifier)
- DATABASE_URL (Railway PostgreSQL)
- AWS_ACCESS_KEY_ID (si configuré)
- AWS_SECRET_ACCESS_KEY (si configuré)
