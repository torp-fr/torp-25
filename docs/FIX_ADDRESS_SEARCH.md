# 🔧 Correction de la Recherche d'Adresse et Création de Profil

## Problèmes Identifiés

1. **API `/api/addresses/search`** : Retournait `addresses` au lieu de `data`
2. **Fallback manquant** : Si l'index BAN est vide, aucune recherche n'était effectuée
3. **Gestion d'erreurs** : Pas assez robuste côté frontend

## ✅ Corrections Appliquées

### 1. Format de Réponse API

**Avant** :
```typescript
return NextResponse.json({
  success: true,
  count: addresses.length,
  addresses, // ❌ Frontend attend "data"
})
```

**Après** :
```typescript
return NextResponse.json({
  success: true,
  count: addresses.length,
  data: addresses, // ✅ Correspond au format attendu par le frontend
})
```

### 2. Fallback sur API Adresse Externe

**Avant** : Si l'index BAN est vide, retournait un tableau vide.

**Après** :
- Essaie d'abord l'index BAN local
- Si aucun résultat, utilise l'API Adresse externe (data.gouv.fr)
- Garantit que la recherche fonctionne même si l'index n'est pas rempli

```typescript
// 1. Essayer d'abord l'index BAN local
addresses = await indexer.searchAddress(query, limit)

// 2. Si aucun résultat, utiliser l'API Adresse externe
if (addresses.length === 0) {
  console.log('[API Addresses Search] Index BAN vide, utilisation API Adresse externe')
  const addressService = new AddressService()
  addresses = await addressService.searchAddress(query)
}
```

### 3. Amélioration Gestion d'Erreurs Frontend

**Ajout de** :
- Vérification du champ `success` dans la réponse
- Affichage des erreurs à l'utilisateur
- Meilleure gestion des cas d'erreur

```typescript
const data = await response.json()

if (!data.success) {
  throw new Error(data.error || 'Erreur lors de la recherche')
}

setSuggestions(data.data || [])
```

## 🔍 Vérification

### Test de l'API Recherche

```bash
# Test avec requête simple
curl "http://localhost:3000/api/addresses/search?q=Paris&limit=5"

# Réponse attendue :
{
  "success": true,
  "count": 5,
  "data": [
    {
      "formatted": "10 Rue Example, 75001 Paris",
      "city": "Paris",
      "postalCode": "75001",
      "coordinates": { "lat": 48.8566, "lng": 2.3522 },
      ...
    }
  ]
}
```

### Test de la Création de Profil

1. Aller sur `/buildings/new`
2. Taper une adresse (ex: "Paris")
3. Sélectionner une adresse dans les suggestions
4. Cliquer sur "Créer le Profil"
5. Vérifier la redirection vers `/buildings/{id}`

## 📝 Notes

- L'index BAN peut être vide au démarrage (normal)
- Le fallback sur API Adresse garantit le fonctionnement immédiat
- Les données seront enrichies automatiquement après création du profil
- Le format `AddressData` est compatible avec tous les services

## ✅ Statut

- ✅ API `/api/addresses/search` corrigée
- ✅ Fallback API Adresse implémenté
- ✅ Gestion d'erreurs améliorée
- ✅ Frontend synchronisé avec l'API

