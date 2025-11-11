# 🤖 Intégration GPT - Analyse Automatique depuis la Plateforme

## 🎯 Comment ça marche

Quand un utilisateur upload un devis sur votre plateforme TORP :
1. La plateforme appelle automatiquement votre GPT via l'API OpenAI
2. Le GPT analyse le devis (prix, qualité, conformité, délais)
3. Le GPT renvoie un score + des recommandations
4. L'analyse est enregistrée dans la base de données
5. L'utilisateur voit l'analyse sur la page du devis

```
Utilisateur → Upload devis sur TORP
                   ↓
         Plateforme TORP appelle GPT (via OpenAI API)
                   ↓
              GPT analyse
                   ↓
         Résultat stocké en BDD
                   ↓
     Utilisateur voit l'analyse
```

---

## ⚙️ Configuration (5 minutes)

### 1️⃣ Configurer l'API OpenAI

Ajoutez dans vos variables d'environnement (`.env` ou Vercel) :

```env
# Clé API OpenAI (obligatoire)
OPENAI_API_KEY=sk-xxxxxxxxxxxxxxxxxxxxxxxxxxxxx

# Modèle GPT à utiliser (optionnel, par défaut gpt-4-turbo-preview)
GPT_MODEL=gpt-4-turbo-preview
```

**Où trouver votre clé API OpenAI ?**
1. Aller sur https://platform.openai.com/api-keys
2. Cliquer sur "Create new secret key"
3. Copier la clé (commence par `sk-`)

### 2️⃣ Déployer les changements

```bash
# Appliquer la migration Prisma
npx prisma generate
npx prisma migrate deploy

# Déployer sur Vercel
git push
```

---

## 🚀 Utilisation

### Option A : Appel manuel (pour tester)

```bash
# Analyser un devis spécifique
curl -X POST https://votre-domaine.vercel.app/api/devis/DEVIS_ID/analyze-gpt
```

**Réponse :**
```json
{
  "success": true,
  "message": "Devis analysé avec succès par le GPT",
  "data": {
    "score": 75,
    "grade": "B",
    "confidence": 85,
    "analysis": {
      "summary": "Devis globalement correct...",
      "details": {...}
    },
    "recommendations": [...]
  }
}
```

### Option B : Intégration automatique

Dans votre code, après qu'un devis soit uploadé :

```typescript
// Dans votre endpoint de création de devis
import { analyzeDevisWithGPT } from '@/services/gpt/gpt-analyzer-service';

// Après avoir créé le devis
const devis = await prisma.devis.create({...});

// Lancer l'analyse GPT en arrière-plan (non-bloquant)
analyzeDevisWithGPT(devis.id).catch(error => {
  console.error('GPT analysis failed:', error);
  // L'erreur ne bloque pas la création du devis
});
```

### Option C : Bouton "Analyser avec IA" dans l'interface

Dans votre composant React :

```typescript
async function handleAnalyzeWithGPT(devisId: string) {
  setLoading(true);

  try {
    const response = await fetch(`/api/devis/${devisId}/analyze-gpt`, {
      method: 'POST',
    });

    const data = await response.json();

    if (data.success) {
      alert('Analyse terminée !');
      // Recharger les données pour afficher l'analyse
      refetch();
    }
  } catch (error) {
    console.error(error);
    alert('Erreur lors de l\'analyse');
  } finally {
    setLoading(false);
  }
}
```

---

## 📊 Récupérer l'analyse GPT

### API

```bash
# Récupérer la dernière analyse GPT d'un devis
curl https://votre-domaine.vercel.app/api/devis/DEVIS_ID/gpt-analysis
```

### Dans votre code

```typescript
import { getLatestGPTAnalysis } from '@/services/gpt/gpt-analyzer-service';

const analysis = await getLatestGPTAnalysis(devisId);

if (analysis) {
  console.log('Score GPT:', analysis.gptScore);
  console.log('Grade:', analysis.gptGrade);
  console.log('Recommandations:', analysis.recommendations);
}
```

---

## 🎨 Afficher l'analyse dans votre interface

Exemple de composant React :

```tsx
export function GPTAnalysisCard({ devisId }: { devisId: string }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/devis/${devisId}/gpt-analysis`)
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setAnalysis(data.data);
        }
      })
      .finally(() => setLoading(false));
  }, [devisId]);

  if (loading) return <div>Chargement...</div>;
  if (!analysis) return <div>Pas encore d'analyse IA</div>;

  return (
    <div className="border rounded-lg p-6">
      <h3 className="text-xl font-bold mb-4">Analyse IA</h3>

      {/* Score */}
      <div className="mb-4">
        <div className="text-3xl font-bold">
          {analysis.gptScore}/100
        </div>
        <div className="text-sm text-gray-500">
          Grade {analysis.gptGrade}
        </div>
      </div>

      {/* Résumé */}
      <p className="mb-4">{analysis.analysis.summary}</p>

      {/* Recommandations */}
      <div className="space-y-2">
        <h4 className="font-semibold">Recommandations :</h4>
        {analysis.recommendations.map((rec, i) => (
          <div key={i} className="border-l-4 border-blue-500 pl-3">
            <div className="font-medium">{rec.title}</div>
            <div className="text-sm text-gray-600">{rec.description}</div>
            {rec.action && (
              <div className="text-sm text-blue-600 mt-1">
                → {rec.action}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
```

---

## 🔧 Configuration avancée

### Personnaliser le prompt du GPT

Éditez le fichier `/services/gpt/gpt-analyzer-service.ts` :

```typescript
{
  role: 'system',
  content: `Tu es un expert en analyse de devis...

  // Ajoutez vos instructions personnalisées ici

  Réponds UNIQUEMENT avec un objet JSON...`
}
```

### Changer le modèle GPT

Dans `.env` :

```env
# Modèles disponibles :
# - gpt-4-turbo-preview (recommandé, bon équilibre prix/qualité)
# - gpt-4 (plus cher, plus précis)
# - gpt-3.5-turbo (moins cher, moins précis)

GPT_MODEL=gpt-4-turbo-preview
```

### Ajouter un timeout

```typescript
const controller = new AbortController();
const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 secondes

const response = await fetch('https://api.openai.com/v1/chat/completions', {
  ...options,
  signal: controller.signal,
});

clearTimeout(timeoutId);
```

---

## 💰 Coûts

**Estimation des coûts OpenAI (modèle gpt-4-turbo-preview) :**
- Input : ~$0.01 par 1000 tokens (~750 mots)
- Output : ~$0.03 par 1000 tokens

**Pour un devis moyen :**
- Input : ~500 tokens (données du devis) = $0.005
- Output : ~1000 tokens (analyse) = $0.03
- **Total par analyse : ~$0.035 (3.5 centimes)**

Avec 1000 analyses/mois : ~$35/mois

---

## 🐛 Dépannage

### Erreur "OPENAI_API_KEY not found"

➡️ Ajoutez la clé dans vos variables d'environnement Vercel

### Le GPT ne répond pas

➡️ Vérifiez les logs : `console.log` dans `gpt-analyzer-service.ts`

### Erreur "Invalid JSON response"

➡️ Le GPT n'a pas renvoyé du JSON valide. Améliorez le prompt système.

### Timeout

➡️ Augmentez le `max_tokens` ou utilisez un modèle plus rapide (gpt-3.5-turbo)

---

## 📈 Monitoring

### Logs

Toutes les erreurs sont loggées dans la console :

```typescript
console.error('Error analyzing devis with GPT:', error);
```

### Base de données

```sql
-- Voir toutes les analyses GPT
SELECT
  id,
  devis_id,
  gpt_score,
  gpt_grade,
  confidence,
  created_at
FROM gpt_analyses
ORDER BY created_at DESC
LIMIT 10;

-- Statistiques
SELECT
  COUNT(*) as total_analyses,
  AVG(gpt_score) as score_moyen,
  MAX(gpt_score) as score_max,
  MIN(gpt_score) as score_min
FROM gpt_analyses;
```

---

## 🎯 Résumé

**Ce qui a été créé :**
- ✅ Service `/services/gpt/gpt-analyzer-service.ts` - Appelle OpenAI
- ✅ Endpoint `POST /api/devis/[id]/analyze-gpt` - Déclenche l'analyse
- ✅ Endpoint `GET /api/devis/[id]/gpt-analysis` - Récupère l'analyse
- ✅ Migration Prisma - apiKeyId optionnel

**Ce qu'il faut faire :**
1. Ajouter `OPENAI_API_KEY` dans les variables d'environnement
2. Déployer (`git push`)
3. Tester avec un devis
4. Intégrer dans votre interface

**Temps estimé : 5 minutes de configuration**

---

## 🆘 Besoin d'aide ?

- Voir le code : `/services/gpt/gpt-analyzer-service.ts`
- API OpenAI : https://platform.openai.com/docs
- Documentation Prisma : https://www.prisma.io/docs

---

**Version** : 1.0.0 | **Date** : 2025-11-11
