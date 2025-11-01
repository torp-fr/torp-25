# Système de Cartes d'Identité du Bâti (Building Profiles)

## 🎯 Vue d'ensemble

Le système de Building Profiles permet de créer des "cartes d'identité" complètes pour chaque bien immobilier, avec deux types de cartes :

1. **Carte PROPRIETAIRE** : Unique par bien, créée et enrichie automatiquement par le propriétaire
2. **Carte LOCATAIRE** : Sous-carte liée à une carte propriétaire, pour la gestion locataire (entretien, maintenance, etc.)

## 📋 Fonctionnalités

### Carte Propriétaire

- ✅ **Unicité garantie** : Une seule carte propriétaire possible par bien (parcelle + section cadastrale + lot)
- ✅ **Enrichissement automatique** : Données cadastrales, DVF, Géorisques, PLU, DPE, RNB, etc.
- ✅ **Données complètes** : Estimation immobilière, comparables, statistiques de marché
- ✅ **Gestion des appartements** : Différenciation par numéro de lot/appartement

### Carte Locataire

- ✅ **Lien hiérarchique** : Toujours liée à une carte propriétaire
- ✅ **Données spécifiques** : Gestion d'entretien, travaux, maintenance
- ✅ **Pas d'enrichissement** : Utilise les données de la carte propriétaire
- ✅ **Multi-locataires** : Plusieurs cartes locataires possibles par bien (un par utilisateur)

## 🗄️ Structure de la Base de Données

### Modèle BuildingProfile

```prisma
model BuildingProfile {
  id     String  @id @default(uuid())
  userId String
  
  // Rôle et hiérarchie
  role            BuildingProfileRole @default(PROPRIETAIRE)
  parentProfileId String?             // ID carte propriétaire (si locataire)
  
  // Identification du bien
  address              Json
  coordinates          Json?
  parcelleNumber       String?
  sectionCadastrale    String?
  lotNumber            String?      // Pour différencier appartements
  codeINSEE            String?
  
  // Données enrichies (uniquement propriétaire)
  enrichedData         Json?        // AggregatedBuildingData
  cadastralData        Json?
  pluData              Json?
  rnbData              Json?
  dpeData              Json?
  urbanismData         Json?
  
  // Métadonnées
  enrichmentStatus     String       // pending, in_progress, completed, failed
  enrichmentSources    String[]
  enrichmentErrors     Json?
  lastEnrichedAt       DateTime?
  
  // Données utilisateur
  customFields       Json?
  notes                 String?
  tenantData           Json?        // Données spécifiques locataire
  
  // Relations
  parentProfile        BuildingProfile?   @relation("BuildingProfileHierarchy")
  tenantProfiles       BuildingProfile[]  @relation("BuildingProfileHierarchy")
  
  @@unique([parcelleNumber, sectionCadastrale, lotNumber, role], name: "unique_proprietaire_per_bien")
}
```

### Enum BuildingProfileRole

```prisma
enum BuildingProfileRole {
  PROPRIETAIRE // Carte propriétaire (unique par bien)
  LOCATAIRE    // Sous-carte locataire (liée à une carte propriétaire)
}
```

## 🔌 API Endpoints

### Créer une carte propriétaire

```http
POST /api/building-profiles
Content-Type: application/json

{
  "userId": "user-id",
  "name": "Maison principale",
  "address": "123 Rue Example, 75001 Paris",
  "coordinates": { "lat": 48.8566, "lng": 2.3522 },
  "role": "PROPRIETAIRE",
  "lotNumber": "A12" // Optionnel, pour appartements
}
```

### Créer une carte locataire

```http
POST /api/building-profiles/{parentProfileId}/tenant
Content-Type: application/json

{
  "userId": "tenant-user-id",
  "name": "Mon appartement" // Optionnel
}
```

### Récupérer les cartes d'un utilisateur

```http
GET /api/building-profiles?userId=user-id
```

### Récupérer une carte spécifique

```http
GET /api/building-profiles/{id}
```

### Récupérer les cartes locataires d'un bien

```http
GET /api/building-profiles/{parentProfileId}/tenant?userId=owner-id
```

### Mettre à jour une carte

```http
PATCH /api/building-profiles/{id}
Content-Type: application/json

{
  "name": "Nouveau nom",
  "notes": "Notes personnelles",
  "tenantData": { // Uniquement pour cartes LOCATAIRE
    "maintenance": [...],
    "work_done": [...]
  }
}
```

## 🔐 Règles de Validation

### Carte Propriétaire

- ✅ `parcelleNumber` et `sectionCadastrale` sont requis pour l'unicité
- ✅ Unicité garantie par : `(parcelleNumber, sectionCadastrale, lotNumber, role)`
- ✅ Si une carte existe déjà pour ce bien, retourne une erreur 409 (Conflict)
- ✅ L'enrichissement est lancé automatiquement en arrière-plan

### Carte Locataire

- ✅ `parentProfileId` est obligatoire
- ✅ La carte propriétaire parent doit exister et avoir `role: PROPRIETAIRE`
- ✅ Un utilisateur ne peut avoir qu'une seule carte locataire par bien
- ✅ Pas d'enrichissement automatique (utilise les données du parent)
- ✅ `enrichmentStatus` est automatiquement mis à `completed`

## 📊 Données Enrichies (Carte Propriétaire)

Les cartes propriétaires sont automatiquement enrichies avec :

1. **Données Cadastrales** : Parcelle, section, surface, contraintes
2. **DVF (Valeurs Foncières)** : Estimation, comparables, statistiques
3. **Géorisques** : Risques d'inondation, mouvements de terrain, radon, etc.
4. **PLU** : Règles d'urbanisme, zonage
5. **DPE** : Diagnostic de performance énergétique
6. **RNB** : Répertoire National des Bâtiments
7. **Urbanisme** : Données IGN, Mérimée, etc.

## 🚀 Migration

Pour activer ce système, appliquez la migration :

```bash
# Via Railway (recommandé)
railway link
railway run npx prisma migrate deploy

# Ou via DATABASE_URL locale
export DATABASE_URL="postgresql://..."
npx prisma migrate deploy

# Puis régénérer le client Prisma
npx prisma generate
```

Voir `scripts/APPLY_MIGRATION_GUIDE.md` pour plus de détails.

## 💡 Cas d'Usage

### Cas 1 : Propriétaire d'une maison

1. Propriétaire crée sa carte avec l'adresse
2. Système enrichit automatiquement avec toutes les données
3. Propriétaire peut voir l'estimation DVF, les risques, etc.

### Cas 2 : Propriétaire d'un appartement en copropriété

1. Propriétaire crée sa carte avec l'adresse + numéro de lot "A12"
2. Système garantit l'unicité (parcelle + section + "A12")
3. Un autre propriétaire peut créer une carte pour "A13" sur la même parcelle

### Cas 3 : Locataire veut gérer l'entretien

1. Locataire crée une carte locataire liée à la carte propriétaire du bien
2. Locataire peut ajouter des informations d'entretien, travaux, etc.
3. Ces données sont stockées dans `tenantData` et ne sont pas partagées avec le propriétaire

## 🔍 Exemples de Code

### Service BuildingProfileService

```typescript
import { BuildingProfileService } from '@/services/building-profile-service'

const service = new BuildingProfileService()

// Créer une carte propriétaire
const ownerProfile = await service.createProfile({
  userId: 'user-123',
  address: '123 Rue Example, 75001 Paris',
  role: 'PROPRIETAIRE',
  lotNumber: 'A12' // Pour un appartement
})

// Créer une carte locataire
const tenantProfile = await service.createTenantProfile(
  ownerProfile.id,
  'tenant-user-456',
  'Mon appartement'
)

// Récupérer les cartes locataires d'un bien
const tenantProfiles = await service.getTenantProfiles(
  ownerProfile.id,
  'user-123'
)
```

## ⚠️ Notes Importantes

- Les cartes propriétaires sont **uniques par bien** (parcelle + section + lot)
- Les cartes locataires peuvent être **multiples** (un par utilisateur)
- L'enrichissement automatique est **uniquement pour les propriétaires**
- Les données locataires (`tenantData`) sont **privées** et non partagées
- La suppression d'une carte propriétaire **supprime automatiquement** toutes les cartes locataires liées (CASCADE)

