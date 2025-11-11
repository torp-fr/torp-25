# 🤖 Intégration GPT - Guide Simple

## ✅ Ce qui est fait

Votre plateforme TORP peut maintenant **appeler automatiquement votre GPT** pour analyser les devis.

**Flux :**
```
Utilisateur upload devis → TORP appelle GPT → GPT analyse → Résultat stocké en BDD
```

---

## 🚀 Configuration (3 minutes)

### 1️⃣ Ajouter la clé API OpenAI

Dans Vercel (Settings → Environment Variables) :

```
OPENAI_API_KEY=sk-votre-cle-openai
```

**Où trouver votre clé ?**
👉 https://platform.openai.com/api-keys

### 2️⃣ Déployer

```bash
git push
```

Le déploiement appliquera automatiquement la migration Prisma.

### 3️⃣ Tester

Appelez l'endpoint pour analyser un devis :

```bash
curl -X POST https://torp-25.vercel.app/api/devis/VOTRE_DEVIS_ID/analyze-gpt
```

**C'est tout ! ✨**

---

## 📝 Comment l'utiliser

### Option A : Automatique (recommandé)

Dans votre code, après la création d'un devis :

```typescript
import { analyzeDevisWithGPT } from '@/services/gpt/gpt-analyzer-service';

// Après avoir créé le devis
const devis = await prisma.devis.create({...});

// Lancer l'analyse en arrière-plan
analyzeDevisWithGPT(devis.id);
```

### Option B : Bouton manuel

Ajoutez un bouton "Analyser avec IA" dans votre interface :

```typescript
async function handleAnalyze(devisId: string) {
  const response = await fetch(`/api/devis/${devisId}/analyze-gpt`, {
    method: 'POST'
  });

  const data = await response.json();
  alert(data.message);
}
```

### Option C : Afficher l'analyse

```typescript
// Récupérer l'analyse GPT
const response = await fetch(`/api/devis/${devisId}/gpt-analysis`);
const { data: analysis } = await response.json();

// Afficher
console.log('Score:', analysis.gptScore);
console.log('Grade:', analysis.gptGrade);
console.log('Recommandations:', analysis.recommendations);
```

---

## 📊 Ce que le GPT analyse

Le GPT analyse le devis selon 4 critères :
- **Prix (25%)** : Comparaison au marché
- **Qualité (30%)** : Certifications, santé financière
- **Conformité (25%)** : Normes, garanties
- **Délais (20%)** : Réalisme

**Résultat :**
```json
{
  "score": 75,
  "grade": "B",
  "confidence": 85,
  "analysis": {
    "summary": "Résumé de l'analyse",
    "details": {...}
  },
  "recommendations": [...],
  "alerts": [...],
  "strengths": [...],
  "weaknesses": [...]
}
```

---

## 💰 Coût

Environ **3.5 centimes par analyse** (modèle gpt-4-turbo-preview)

1000 analyses/mois = ~35€/mois

---

## 🔧 API Endpoints

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/api/devis/[id]/analyze-gpt` | POST | Déclenche l'analyse GPT |
| `/api/devis/[id]/gpt-analysis` | GET | Récupère l'analyse existante |

---

## 📚 Documentation complète

👉 Voir `GUIDE_INTEGRATION_GPT_PLATEFORME.md` pour :
- Exemples de code détaillés
- Configuration avancée
- Personnalisation du prompt
- Dépannage

---

## 🎯 Résumé

**Fichiers créés :**
- `/services/gpt/gpt-analyzer-service.ts` - Service principal
- `/app/api/devis/[id]/analyze-gpt/route.ts` - Endpoint POST
- `/app/api/devis/[id]/gpt-analysis/route.ts` - Endpoint GET

**Ce qu'il faut faire :**
1. ✅ Ajouter `OPENAI_API_KEY` dans Vercel
2. ✅ Déployer
3. ✅ Appeler l'endpoint pour tester
4. ✅ Intégrer dans votre code

**Temps : 3 minutes**

---

## ❓ FAQ

**Q : C'est différent de ChatGPT ?**
A : Oui ! Ici, c'est votre plateforme qui appelle directement l'API OpenAI. Pas besoin de configurer ChatGPT.

**Q : Mon GPT personnalisé est utilisé ?**
A : Non, on utilise directement l'API OpenAI avec un prompt personnalisé dans le code.

**Q : Je veux utiliser mon GPT de ChatGPT ?**
A : C'est possible mais plus complexe. L'API OpenAI ne supporte pas encore les GPTs personnalisés via API.

**Q : Le déploiement a échoué ?**
A : Vérifiez les logs Vercel. L'erreur devrait être corrigée maintenant.

---

**Version** : 2.0.0 | **Date** : 2025-11-11
