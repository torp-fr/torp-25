# 🔧 Sentry - Configuration Rapide

## ✅ Status Actuel

**DSN Configuré**: ✅  
**GitHub Integration**: ⚠️ À activer dans Sentry Dashboard

---

## 🚀 Démarrage Rapide

### 1. Configuration Locale

Le DSN est déjà configuré dans le code comme fallback. Pour la production, ajoutez dans `.env.local` :

```env
NEXT_PUBLIC_SENTRY_DSN=https://500276df8605b31faf438668d5d366bc@o4510290746146816.ingest.de.sentry.io/4510290759581776
SENTRY_ORG=o4510290746146816
SENTRY_PROJECT=torp-platform
```

### 2. Activer l'Intégration GitHub

1. Aller sur [sentry.io](https://sentry.io)
2. Settings → Integrations → GitHub
3. Installer et autoriser l'accès
4. Sélectionner le repository `torp-fr/torp-25`

### 3. Tester

Visitez: **`http://localhost:3000/test-sentry`**

---

## 📚 Documentation Complète

- [Guide de Configuration](docs/SENTRY_SETUP.md)
- [Intégration GitHub](docs/SENTRY_GITHUB_INTEGRATION.md)
- [Statut de Connexion](docs/SENTRY_CONNECTED.md)

---

**Dashboard**: https://sentry.io/organizations/o4510290746146816/projects/torp-platform/
