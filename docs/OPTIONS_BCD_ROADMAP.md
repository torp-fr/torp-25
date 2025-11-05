# Options B/C/D - Roadmap Améliorations TORP

## Vue d'ensemble

Suite à la complétion de l'**Option A** (Visualisations + Agent IA), voici les 3 options d'amélioration possibles pour rendre TORP encore plus disruptif.

---

## 🔐 Option B : APIs Premium & Enrichissement Avancé

### Objectif
Obtenir des données entreprise ultra-complètes via APIs premium payantes pour des analyses encore plus précises.

### APIs à Intégrer

#### 1. **Pappers Premium** (actuellement : gratuit limité)
**Coût** : ~50-150€/mois selon volume

**Nouvelles données** :
- ✅ Historique complet des dirigeants (entrées/sorties)
- ✅ Participations croisées et filiales
- ✅ Dépôts de bilans complets (pas seulement CA/résultats)
- ✅ Procédures collectives détaillées
- ✅ Privilèges et nantissements
- ✅ Effectifs par année
- ✅ Ratios financiers calculés
- ✅ Score de solvabilité Pappers

**Impact sur TORP** :
- Détection précoce de difficultés financières (baisse effectifs, nantissements)
- Analyse de la stabilité de la gouvernance (changements dirigeants)
- Identification de groupes d'entreprises (filiales, holdings)

#### 2. **Société.com API**
**Coût** : ~100-200€/mois selon volume

**Nouvelles données** :
- ✅ Scoring crédit professionnel (0-100)
- ✅ Risque de défaillance (%)
- ✅ Historique des impayés
- ✅ Analyse sectorielle comparative
- ✅ Bilan comptable détaillé (actif/passif)
- ✅ Ratios de rentabilité et liquidité

**Impact sur TORP** :
- Alertes précoces sur risque de non-paiement
- Comparaison entreprise vs moyenne sectorielle
- Recommandations sur garanties à demander

#### 3. **Infogreffe Premium**
**Coût** : Actuellement gratuit via OpenData, mais premium = accès temps réel

**Nouvelles données** :
- ✅ Temps réel (vs 24-48h de décalage)
- ✅ Extraits Kbis officiels
- ✅ Statuts complets de l'entreprise
- ✅ Actes et décisions AG

#### 4. **RNCP (France Compétences)**
**Coût** : Gratuit (API publique)

**Nouvelles données** :
- ✅ Certifications professionnelles des dirigeants
- ✅ Qualifications métiers BTP
- ✅ Validité des certifications

### Architecture Technique

```typescript
// Service d'enrichissement unifié
class PremiumEnrichmentService {
  async enrichCompany(siret: string) {
    const [pappers, societe, infogreffe, rncp] = await Promise.all([
      this.pappersPremium.getFullData(siret),
      this.societeAPI.getCreditScore(siret),
      this.infogreffeAPI.getRealTimeData(siret),
      this.rncpAPI.getCertifications(siret),
    ])

    return {
      financialHealth: this.calculateAdvancedScore(pappers, societe),
      creditRisk: societe.creditScore,
      paymentRisk: societe.defaultRisk,
      certifications: rncp.certifications,
      legalStability: this.assessLegalStability(pappers, infogreffe),
    }
  }

  private calculateAdvancedScore(pappers, societe) {
    // Combine multiple sources for ultra-precise scoring
    return {
      solvency: pappers.solvencyScore,
      credit: societe.creditScore,
      payment: societe.paymentScore,
      overall: (pappers.solvencyScore + societe.creditScore + societe.paymentScore) / 3,
      confidence: 95, // High confidence with multiple sources
    }
  }
}
```

### Coût/Bénéfice

**Coût mensuel estimé** : 150-350€/mois
**Bénéfices** :
- 🎯 Précision analyses +25%
- 🚨 Détection risques +40%
- 💰 Valorisation TORP comme outil professionnel
- 🏆 Différenciation concurrence

**ROI** : Si 50 utilisateurs payants à 29€/mois = 1 450€/mois → ROI positif dès 50 users

---

## 📚 Option C : Indexation Locale + RAG (Retrieval Augmented Generation)

### Objectif
Permettre à l'Agent IA de rechercher dans tous les documents et devis historiques pour des recommandations contextuelles ultra-pertinentes.

### Architecture RAG

#### 1. **Vector Database**
**Choix** : Pinecone, Weaviate, ou Qdrant

**Données à indexer** :
- 📄 Contenu textuel des devis PDF (via OCR)
- 📊 Données structurées des analyses TORP
- 📋 Documents bâtiments (DPE, diagnostics, etc.)
- 💬 Historique conversations chat
- 🏢 Profils entreprises enrichis

#### 2. **Pipeline d'Indexation**

```typescript
class DocumentIndexer {
  async indexDocument(doc: Document) {
    // 1. Extraire le texte
    const text = await this.ocrService.extractText(doc.fileUrl)

    // 2. Découper en chunks
    const chunks = this.textSplitter.split(text, {
      chunkSize: 500,
      overlap: 50,
    })

    // 3. Générer embeddings
    const embeddings = await this.openai.createEmbeddings(chunks)

    // 4. Stocker dans vector DB
    await this.vectorDB.upsert({
      id: doc.id,
      vectors: embeddings,
      metadata: {
        userId: doc.userId,
        documentType: doc.type,
        createdAt: doc.createdAt,
        projectType: doc.projectType,
        amount: doc.totalAmount,
      },
    })
  }
}
```

#### 3. **Agent RAG**

```typescript
class RAGAgent {
  async getContextualRecommendations(query: string, userId: string) {
    // 1. Générer embedding de la requête
    const queryEmbedding = await this.openai.createEmbedding(query)

    // 2. Recherche similarité dans vector DB
    const similarDocs = await this.vectorDB.query({
      vector: queryEmbedding,
      filter: { userId },
      topK: 5,
    })

    // 3. Construire contexte enrichi
    const context = similarDocs.map(doc => ({
      content: doc.text,
      metadata: doc.metadata,
      similarity: doc.score,
    }))

    // 4. Prompt augmenté pour Claude
    const prompt = `
Contexte historique de l'utilisateur (5 documents similaires) :
${context.map(c => `- ${c.content} (similarité: ${c.similarity})`).join('\n')}

Question actuelle : ${query}

En te basant sur l'historique ci-dessus, génère des recommandations personnalisées...
`

    return await this.claude.generate(prompt)
  }
}
```

### Cas d'Usage

#### Exemple 1 : Recommandations basées sur historique
```
User: "J'ai un nouveau devis cuisine à 35k€"

Agent RAG:
→ Recherche dans historique user
→ Trouve 2 devis cuisine précédents (28k€ et 31k€)
→ Recommandation: "Attention, ce devis est 15% plus cher que vos 2 précédents devis cuisine (28k€ et 31k€). Voici les différences..."
```

#### Exemple 2 : Alertes contextuelles
```
User: Nouveau devis de "Entreprise Dubois BTP"

Agent RAG:
→ Recherche historique entreprise dans tous les users (anonymisé)
→ Trouve 3 devis similaires avec scores moyens
→ Recommandation: "Cette entreprise a été analysée 3 fois avec un score moyen de 720/1000. Points d'attention récurrents : délais..."
```

### Stack Technique

**Vector Database** : Pinecone (serverless)
**Embeddings** : OpenAI text-embedding-3-small (~0.02$/1M tokens)
**Coût estimé** :
- Pinecone : ~70€/mois (100k vecteurs)
- Embeddings : ~5€/mois (50k documents)
- **Total** : ~75€/mois

### Bénéfices

- 🎯 Recommandations ultra-personnalisées
- 📈 Valeur augmente avec l'usage (effet réseau)
- 🧠 "Mémoire" de TORP = avantage compétitif
- 🚀 Base pour features futures (comparaison devis automatique)

---

## 🎨 Option D : Améliorations UX & Dashboard

### Objectif
Améliorer l'expérience utilisateur avec un dashboard moderne, notifications intelligentes, et workflows optimisés.

### Fonctionnalités

#### 1. **Dashboard Unifié**

**Page d'accueil** : Vue d'ensemble de tous les projets
```
┌─────────────────────────────────────────────┐
│  Mes Projets                         [+ Nouveau]│
├─────────────────────────────────────────────┤
│                                               │
│  🏗️  Rénovation Cuisine                      │
│      3 devis • Score moyen: 750/1000         │
│      ⚠️ 2 alertes • 📅 Deadline: 15 fév      │
│      [Comparer] [Voir détails]               │
│                                               │
│  🏠  Extension Maison                         │
│      1 devis • Score: 820/1000               │
│      ✅ Tout ok • 📅 Deadline: 10 mars       │
│      [Voir détails]                          │
│                                               │
│  📊  Statistiques                             │
│      • 12 devis analysés ce mois             │
│      • Économies estimées: 8 500€            │
│      • Score moyen: 765/1000                 │
└─────────────────────────────────────────────┘
```

#### 2. **Notifications Intelligentes**

**Types de notifications** :
- 🚨 **Urgentes** : Procédure collective détectée sur entreprise
- ⚠️ **Importantes** : Document expirant dans 30 jours
- 💡 **Opportunités** : Prix marché a baissé de 10%
- ✅ **Succès** : Enrichissement terminé

**Architecture** :
```typescript
class NotificationEngine {
  async generateSmartNotifications(userId: string) {
    // Analyse multi-source
    const [devis, buildings, market] = await Promise.all([
      this.getRecentDevis(userId),
      this.getBuildings(userId),
      this.getMarketTrends(),
    ])

    const notifications = []

    // Alertes entreprises
    for (const d of devis) {
      if (d.company.hasCollectiveProcedure) {
        notifications.push({
          type: 'alert',
          title: '🚨 Procédure collective détectée',
          message: `L'entreprise ${d.company.name} fait l'objet d'une procédure...`,
          priority: 'urgent',
          actionUrl: `/analysis/${d.id}`,
        })
      }
    }

    // Opportunités marché
    if (market.trend === 'down' && market.change > 0.1) {
      notifications.push({
        type: 'info',
        title: '💡 Opportunité marché',
        message: `Les prix ${market.sector} ont baissé de ${market.change}%...`,
        priority: 'low',
      })
    }

    return notifications
  }
}
```

#### 3. **Comparateur de Devis**

**Interface side-by-side** :
```
┌──────────────────────┬──────────────────────┐
│  Devis A             │  Devis B             │
│  Entreprise Dupont   │  Entreprise Martin   │
├──────────────────────┼──────────────────────┤
│  Score: 750/1000 🟡  │  Score: 820/1000 🟢  │
│  Prix: 28 500€       │  Prix: 31 200€ (+9%) │
│  Délais: 4 semaines  │  Délais: 6 semaines  │
│                      │                      │
│  Points forts:       │  Points forts:       │
│  • Prix compétitif   │  • Certifications ✅ │
│  • Disponible vite   │  • Réputation 4.5★   │
│                      │                      │
│  Points faibles:     │  Points faibles:     │
│  • Peu de certifs    │  • Prix + élevé      │
│  • Réputation 3.2★   │  • Délais + longs    │
│                      │                      │
│  [Sélectionner]      │  [Sélectionner]      │
└──────────────────────┴──────────────────────┘

💡 Recommandation IA:
Devis B recommandé malgré prix +9%. Différence justifiée par certifications et réputation. ROI estimé sur garanties.
```

#### 4. **Timeline Projet**

Visualisation chronologique du projet :
```
Jan ─────── Fév ─────── Mar ─────── Avr
 │
 ├─ 15/01: Devis A reçu (750pts)
 ├─ 18/01: Devis B reçu (820pts)
 ├─ 22/01: Enrichissement Devis A
 │          ⚠️ Alerte procédure
 ├─ 25/01: Devis C reçu (780pts)
 │
 └─ 01/02: Décision à prendre
```

#### 5. **Export & Rapports**

**Format exports** :
- 📄 PDF : Rapport complet analyse
- 📊 Excel : Comparatif devis
- 📧 Email : Partage avec tiers (architecte, notaire)

**Template rapport** :
```markdown
# Rapport d'Analyse TORP
**Projet**: Rénovation Cuisine
**Date**: 30 janvier 2025

## Synthèse
3 devis analysés • Score moyen: 783/1000

## Recommandation
✅ Devis B (Entreprise Martin) - 820/1000

**Justification**:
- Certifications RGE ✅
- Réputation excellente (4.5/5)
- Prix justifié par qualité

## Détails Entreprise
[Données enrichies Infogreffe/Pappers]

## Analyse Financière
[Graphiques CA/Résultats]

## Risques Identifiés
Aucun risque majeur

---
Rapport généré par TORP • torp.fr
```

### Stack Technique

**Dashboard** :
- React Server Components (Next.js 15+)
- Shadcn/ui pour composants
- Recharts pour visualisations
- React Query pour state management

**Notifications** :
- Server-Sent Events (SSE) pour temps réel
- WebSockets (alternative)
- Push Notifications (PWA)

**Exports** :
- jsPDF pour génération PDF
- ExcelJS pour exports Excel

### Coût

**Développement** : ~3-4 semaines
**Infrastructure** : Négligeable (already in Vercel)
**ROI** : Amélioration engagement +40%, rétention +25%

---

## 📊 Comparaison des Options

| Critère | Option B (APIs) | Option C (RAG) | Option D (UX) |
|---------|----------------|----------------|---------------|
| **Coût mensuel** | 150-350€ | ~75€ | ~0€ |
| **Temps dev** | 2 semaines | 3 semaines | 4 semaines |
| **Impact utilisateur** | Indirect (meilleure analyse) | Moyen (reco personnalisées) | Direct (meilleur UX) |
| **Différenciation** | Haute | Très haute | Moyenne |
| **Complexité tech** | Faible | Moyenne | Moyenne |
| **ROI court terme** | Moyen | Faible | Élevé |
| **ROI long terme** | Élevé | Très élevé | Moyen |

---

## 🎯 Recommandation Stratégique

### Approche Progressive

**Phase 1 (Immédiat)** : Option D - UX
- Impact utilisateur immédiat
- Pas de coûts additionnels
- Améliore engagement et rétention
- Base solide pour monétisation

**Phase 2 (1-2 mois)** : Option B - APIs Premium
- Une fois 50+ utilisateurs actifs
- Coûts API couverts par subscriptions
- Différenciation B2B (pros du BTP)

**Phase 3 (3-4 mois)** : Option C - RAG
- Une fois base de données conséquente (1000+ devis)
- Effet réseau commence à jouer
- Avantage compétitif long terme

### Priorisation Agile

**Sprint 1-2** (Option D) :
- Dashboard unifié
- Notifications intelligentes
- Exports PDF basiques

**Sprint 3-4** (Option D) :
- Comparateur devis
- Timeline projet
- Exports avancés

**Sprint 5** (Option B) :
- Intégration Pappers Premium
- Intégration Société.com

**Sprint 6+** (Option C) :
- Infrastructure RAG
- Indexation documents
- Agent RAG v1

---

## 📋 Next Steps Immédiats

1. **Valider tests Agent IA** (Option A)
2. **Décider de l'option prioritaire** (B, C, ou D)
3. **Créer backlog détaillé** pour option choisie
4. **Estimer ressources** (temps, budget)
5. **Lancer développement**

---

**Quelle option vous intéresse le plus ?** 🚀
