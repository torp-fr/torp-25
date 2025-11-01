#!/bin/bash
# Script pour appliquer la migration Building Profile Role via Railway

echo "🗄️  Migration Building Profile Role"
echo "===================================="
echo ""

# Vérifier si Railway CLI est disponible
if ! command -v railway &> /dev/null; then
    echo "❌ Railway CLI n'est pas installé"
    echo "   Installez-le avec: npm install -g @railway/cli"
    exit 1
fi

echo "✅ Railway CLI trouvé"
echo ""

# Appliquer la migration via Prisma
echo "📦 Application de la migration via Prisma migrate deploy..."
railway run npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migration appliquée avec succès !"
    echo ""
    echo "📊 Modifications effectuées :"
    echo "  - Enum 'building_profile_role' créé (PROPRIETAIRE, LOCATAIRE)"
    echo "  - Colonnes ajoutées : role, parent_profile_id, lot_number, tenant_data"
    echo "  - Index unique créé pour garantir l'unicité des cartes propriétaire"
    echo "  - Relations parent/enfant configurées"
    echo ""
    echo "🎉 Migration terminée !"
    echo ""
    echo "💡 Vérification :"
    echo "   railway run npx prisma migrate status"
else
    echo ""
    echo "❌ Erreur lors de l'application de la migration"
    exit 1
fi


