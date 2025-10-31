#!/bin/bash
# Script de validation des types TypeScript
# Détecte les erreurs de types avant le build

echo "🔍 Validation des types TypeScript..."
npx tsc --noEmit --skipLibCheck

if [ $? -eq 0 ]; then
  echo "✅ Aucune erreur de type détectée"
  exit 0
else
  echo "❌ Erreurs de types détectées"
  exit 1
fi

