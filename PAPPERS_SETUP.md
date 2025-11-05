# Configuration API Pappers

## ✅ Configuration Complète

L'API Pappers est maintenant configurée pour enrichir les données entreprise avec des informations détaillées.

## 📋 Variables d'Environnement

### Développement Local

Le fichier `.env.local` contient :
```env
PAPPERS_API_KEY=b02fe90a049bef5a160c7f4abc5d67f0c7ffcd71f4d11bbe
PAPPERS_API_URL=https://api.pappers.fr/v2
```

⚠️ **Note**: Ce fichier est déjà dans `.gitignore` et ne sera pas commité.

### Production (Vercel)

Pour activer Pappers en production, ajoutez ces variables dans les **Environment Variables** de Vercel :

1. Allez sur : https://vercel.com/your-project/settings/environment-variables

2. Ajoutez les variables suivantes :

| Variable | Valeur | Environnement |
|----------|--------|---------------|
| `PAPPERS_API_KEY` | `b02fe90a049bef5a160c7f4abc5d67f0c7ffcd71f4d11bbe` | Production |
| `PAPPERS_API_URL` | `https://api.pappers.fr/v2` | Production |

3. Cliquez sur **Save** puis **Redeploy** pour appliquer les changements.

## 🔄 Flux d'Enrichissement

### Avant (Sans Pappers)
```
Devis → Extraction SIRET → API Sirene (gratuite) → Données de base uniquement
```

### Après (Avec Pappers)
```
Devis → Extraction SIRET →
  ├─ API Sirene (gratuite) → Données légales de base
  ├─ API Infogreffe (si configurée) → Données financières
  └─ API Pappers ✅ → Données enrichies complètes
      ├─ Informations détaillées entreprise
      ├─ Données financières additionnelles
      ├─ Score de santé financière
      ├─ Effectifs et ressources humaines
      └─ Plus de détails sur les activités
```

## 📊 Données Enrichies par Pappers

Pappers apporte les données suivantes :

- ✅ **Informations légales complètes** (forme juridique, statut)
- ✅ **Données financières** (CA, résultats, dettes)
- ✅ **Score financier** (santé de l'entreprise)
- ✅ **Effectifs** (nombre d'employés)
- ✅ **Activités détaillées** (codes NAF et descriptions)
- ✅ **Adresse complète** (avec région)

## 🧪 Test de Fonctionnement

Pour tester si Pappers fonctionne (en local) :

```bash
npx tsx scripts/test-pappers.ts
```

Résultat attendu :
```
✅ Données récupérées avec succès!
📊 Résultat: { siret: "...", name: "...", ... }
```

## 📈 Impact sur l'Analyse de Devis

Avec Pappers activé, l'analyse des devis affichera :

1. **Section "Company Verification"** complète avec :
   - Données légales et financières
   - Score de santé financière
   - Effectifs de l'entreprise
   - Activités détaillées

2. **Score TORP amélioré** grâce à :
   - Meilleure évaluation de la qualité (basée sur les effectifs)
   - Analyse financière plus précise
   - Confiance accrue dans les recommandations

3. **Insights IA enrichis** :
   - Analyse contextuelle basée sur les données réelles
   - Recommandations plus pertinentes
   - Alertes sur les risques financiers

## 🔒 Sécurité

- ✅ La clé API est stockée dans les variables d'environnement (jamais dans le code)
- ✅ Le fichier `.env.local` est exclu du versioning Git
- ✅ Les appels API incluent retry automatique et timeout
- ✅ Les erreurs sont loggées mais n'empêchent pas le fonctionnement (graceful degradation)

## 💰 Coûts

Référez-vous à la documentation Pappers pour les coûts :
- https://www.pappers.fr/api/documentation

Plan gratuit limité disponible pour les tests.

## 📞 Support

- Documentation API: https://www.pappers.fr/api/documentation
- Support Pappers: support@pappers.fr
