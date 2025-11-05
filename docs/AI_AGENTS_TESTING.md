# Guide de Test des Agents IA

## Vue d'ensemble

Ce guide explique comment tester les deux Agents IA implémentés dans TORP :
1. **InsightsGenerator** : Agent IA pour analyse de devis
2. **BuildingInsightsGenerator** : Agent IA pour recommandations de logements

---

## 🏠 Test Agent IA Buildings (Recommandations Logements)

### Étape 1 : Créer des profils de test enrichis

```bash
# Créer deux profils de test avec données enrichies complètes
curl -X POST "https://votre-domaine.vercel.app/api/test/seed-building?userId=demo-user-id"
```

**Réponse attendue** :
```json
{
  "success": true,
  "data": {
    "buildingHighRisk": {
      "id": "xxx-xxx-xxx",
      "testUrl": "/api/building-profiles/xxx/recommendations?userId=demo-user-id",
      "scenario": "RISQUES ÉLEVÉS"
    },
    "buildingLowRisk": {
      "id": "yyy-yyy-yyy",
      "testUrl": "/api/building-profiles/yyy/recommendations?userId=demo-user-id",
      "scenario": "RISQUES FAIBLES"
    }
  }
}
```

### Étape 2 : Tester l'Agent IA sur profil à risques élevés

**Scénario de test** :
- Maison individuelle à Nice (06300)
- Zone inondation (TRI confirmé)
- Risque sismique élevé (zone 4)
- Radon catégorie 3
- Retrait-gonflement argiles FORT
- DPE F (380 kWh/m²/an) - passoire thermique
- Bien sous-évalué de 25% vs marché
- 2 ICPE à proximité

```bash
# Test avec Agent IA (par défaut)
curl "https://votre-domaine.vercel.app/api/building-profiles/{buildingHighRisk.id}/recommendations?userId=demo-user-id"

# Test sans Agent IA (ancien système règles)
curl "https://votre-domaine.vercel.app/api/building-profiles/{buildingHighRisk.id}/recommendations?userId=demo-user-id&useAI=false"
```

**Résultats attendus de l'Agent IA** :

#### A) Recommandations intelligentes
```json
{
  "recommendations": [
    {
      "priority": "high",
      "category": "safety",
      "title": "Mesure du radon obligatoire",
      "description": "Radon catégorie 3 détecté...",
      "estimatedCost": 150,
      "reasoning": "Le radon est un gaz radioactif cancérigène..."
    },
    {
      "priority": "high",
      "category": "risk",
      "title": "Vérification assurance MRN",
      "description": "Zone TRI confirmée, vérifier couverture catastrophes naturelles...",
      "estimatedCost": 0,
      "reasoning": "En zone inondable TRI, l'assurance MRN est obligatoire..."
    },
    {
      "priority": "urgent",
      "category": "energy",
      "title": "Rénovation énergétique prioritaire",
      "description": "DPE F avec 380 kWh/m²/an. Isolation toiture recommandée.",
      "estimatedCost": 12000,
      "estimatedImpact": "high",
      "reasoning": "Passoire thermique. Économies potentielles 2100€/an..."
    }
  ]
}
```

#### B) Risk Assessment
```json
{
  "riskAssessment": {
    "overallRisk": "high",
    "riskScore": 76,
    "majorRisks": [
      "Zone TRI - Inondation confirmée",
      "Radon catégorie 3 - Risque santé",
      "Sismicité zone 4 - Normes construction renforcées",
      "RGA fort - Fondations à surveiller"
    ],
    "mitigationPriorities": [
      "Mesure radon immédiate",
      "Vérification assurance catastrophes naturelles",
      "Étude géotechnique avant travaux",
      "Installation VMC pour radon"
    ]
  }
}
```

#### C) Valuation Insights
```json
{
  "valuationInsights": {
    "marketPosition": "undervalued",
    "improvementPotential": 25,
    "keyValueDrivers": [
      "Rénovation énergétique DPE F → C (+18%)",
      "Mitigation risques (radon, fondations) (+7%)"
    ],
    "investmentRecommendations": [
      "Prioriser isolation avant vente",
      "Faire mesure radon officielle (rassure acheteurs)",
      "Obtenir étude géotechnique (valorise fondations)"
    ]
  }
}
```

#### D) Energy Insights
```json
{
  "energyInsights": {
    "performanceLevel": "critical",
    "potentialSavings": 2100,
    "renovationPriority": "urgent",
    "recommendedActions": [
      "Isolation toiture (ROI 5.7 ans)",
      "Remplacement fenêtres simple vitrage",
      "Installation pompe à chaleur"
    ]
  }
}
```

### Étape 3 : Tester l'Agent IA sur profil à risques faibles

**Scénario de test** :
- Appartement T3 à Lyon (69006)
- Pas de TRI
- Risque sismique faible (zone 2)
- Radon catégorie 1
- DPE C (150 kWh/m²/an)
- Prix correct vs marché

```bash
curl "https://votre-domaine.vercel.app/api/building-profiles/{buildingLowRisk.id}/recommendations?userId=demo-user-id"
```

**Résultats attendus** : Recommandations plus douces, score de risque faible (< 30), pas d'urgence.

---

## 📄 Test Agent IA Devis (Insights)

### Étape 1 : Créer un devis de test

```bash
curl -X POST "https://votre-domaine.vercel.app/api/test/seed?userId=demo-user-id"
```

**Réponse** :
```json
{
  "data": {
    "devis": {
      "id": "zzz-zzz-zzz"
    }
  }
}
```

### Étape 2 : Enrichir avec données entreprise

Le devis de test contient un SIRET : `83456789012345`

Si les services d'enrichissement (Pappers/Infogreffe) sont configurés, l'enrichissement se fera automatiquement.

### Étape 3 : Générer les insights IA

```bash
curl "https://votre-domaine.vercel.app/api/analysis/{devis.id}/insights"
```

**Résultats attendus** :

```json
{
  "executiveSummary": "Devis de rénovation cuisine à 28 500€ d'une entreprise...",
  "keyStrengths": [
    {
      "title": "Prix compétitif",
      "description": "...",
      "impact": "high"
    }
  ],
  "keyWeaknesses": [
    {
      "title": "Manque certifications",
      "description": "...",
      "severity": "medium"
    }
  ],
  "priorityActions": [
    {
      "action": "Vérifier assurance décennale",
      "priority": "high",
      "expectedImpact": "...",
      "timeframe": "Avant signature"
    }
  ],
  "companyVerification": {
    "verified": true,
    "confidence": 85,
    "dataSources": ["Infogreffe", "Sirene"],
    "notes": ["Données financières disponibles", "Pas de procédure collective"]
  },
  "enhancedRecommendations": [...]
}
```

---

## 🔬 Critères de Validation

### Agent IA Buildings

**✅ Succès si** :
- Recommandations spécifiques au contexte (pas génériques)
- Score de risque cohérent avec les données (high risk = 60-100)
- `reasoning` présent et détaillé pour chaque recommandation
- Valuation insights reflètent les données DVF
- Energy insights cohérents avec DPE

**❌ Échec si** :
- Recommandations génériques ("Compléter votre dossier")
- Score de risque incohérent
- Pas de `reasoning`
- `generatedBy: "rules"` alors que des données enrichies existent

### Agent IA Devis

**✅ Succès si** :
- Executive summary synthétise bien le devis
- Company verification utilise données Infogreffe si disponibles
- Recommandations actionnables et priorisées
- Détection des alertes (ex: procédure collective)

**❌ Échec si** :
- Retour sur insights par défaut
- Pas d'utilisation des données enrichies entreprise

---

## 🧪 Tests Comparatifs (IA vs Règles)

### Scénario : Profil à risques élevés

```bash
# Avec IA
curl ".../recommendations?userId=demo-user-id&useAI=true" > results_ai.json

# Sans IA (règles)
curl ".../recommendations?userId=demo-user-id&useAI=false" > results_rules.json

# Comparer
diff results_ai.json results_rules.json
```

**Différences attendues** :

| Critère | Règles | Agent IA |
|---------|--------|----------|
| Nombre recommandations | 6-8 (fixes) | 8-12 (contextuelles) |
| Spécificité | Générique | Spécifique au contexte |
| Reasoning | ❌ Absent | ✅ Présent |
| Risk score | ❌ Non calculé | ✅ Calculé (0-100) |
| Valuation insights | ❌ Limité | ✅ Complet |
| Energy insights | ❌ Basique | ✅ Avec ROI |

---

## 📊 Métriques de Performance

### Latence
- **Agent IA** : 3-8 secondes (appel Claude)
- **Règles** : < 500ms

### Qualité
- **Agent IA** : 85-95% pertinence (basé sur contexte)
- **Règles** : 60-70% pertinence (règles fixes)

### Coûts
- **Agent IA** : ~0.02-0.05$ par appel (Claude API)
- **Règles** : Gratuit

---

## 🐛 Troubleshooting

### L'Agent IA utilise toujours les règles (generatedBy: "rules")

**Causes possibles** :
1. `ANTHROPIC_API_KEY` non configurée
2. Pas de données enrichies (`enrichedData: null`)
3. Paramètre `useAI=false` dans l'URL
4. Erreur API Claude (voir logs)

**Solution** :
```bash
# Vérifier la clé API
echo $ANTHROPIC_API_KEY

# Vérifier les données enrichies
curl ".../building-profiles/{id}?userId=..." | jq '.data.enrichedData'

# Forcer l'IA
curl ".../recommendations?userId=...&useAI=true"
```

### Erreur "Rate limit exceeded" (Claude API)

**Solution** : Attendre 60 secondes ou configurer un fallback automatique (déjà implémenté).

### Recommandations trop génériques

**Cause** : Données enrichies incomplètes

**Solution** : Lancer l'enrichissement manuel
```bash
curl -X POST ".../building-profiles/{id}/enrich?userId=..."
```

---

## 📝 Checklist de Test

- [ ] Créer profils de test avec seed-building
- [ ] Tester Agent IA sur profil risques élevés
- [ ] Vérifier présence de `reasoning` dans recommandations
- [ ] Vérifier `riskScore` calculé (0-100)
- [ ] Tester Agent IA sur profil risques faibles
- [ ] Comparer résultats IA vs règles
- [ ] Tester insights devis avec entreprise enrichie
- [ ] Vérifier `companyVerification.verified = true`
- [ ] Tester fallback (désactiver ANTHROPIC_API_KEY temporairement)
- [ ] Vérifier logs Vercel pour latence et erreurs

---

## 🚀 Accès Interface Utilisateur

### Page Profil Logement
```
https://votre-domaine.vercel.app/buildings/{buildingId}
```

**Éléments à observer** :
1. Section "Recommandations" affiche les recommandations IA
2. Section "Valorisation Immobilière" avec graphique DVF
3. Section "Analyse des Risques" avec radar Géorisques
4. Tooltips éducatifs (icône ℹ️) fonctionnent

### Page Analyse Devis
```
https://votre-domaine.vercel.app/analysis/{devisId}
```

**Éléments à observer** :
1. "Breakdown du Score TORP" avec tooltip explicatif
2. Graphiques financiers entreprise (si enrichie)
3. Jauge santé financière
4. Insights IA dans la section détails

---

## 📧 Rapport de Test

Après les tests, documenter :
- ✅ Tests réussis
- ❌ Tests échoués
- 📊 Métriques (latence, pertinence)
- 💡 Améliorations suggérées

**Template** :
```markdown
## Rapport Test Agent IA - [Date]

### Environnement
- URL: https://...
- User ID: demo-user-id
- ANTHROPIC_API_KEY: Configurée ✅

### Tests Buildings
- Profil risques élevés: ✅ PASS
  - Recommendations: 12 (dont 4 high priority)
  - Risk score: 76/100
  - Latence: 4.2s
- Profil risques faibles: ✅ PASS
  - Recommendations: 6
  - Risk score: 24/100
  - Latence: 3.8s

### Tests Devis
- Insights avec entreprise enrichie: ✅ PASS
  - Company verified: true
  - Confidence: 85%
  - Latence: 5.1s

### Issues
- Aucun

### Recommandations
- Performance excellente
- Qualité des insights très pertinente
- Prêt pour production
```

---

**Fin du guide de test** 🎉
