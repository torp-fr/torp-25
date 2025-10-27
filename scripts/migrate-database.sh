#!/bin/bash
# Script pour appliquer les migrations Prisma sur Railway

echo "🗄️  TORP Database Migration Script"
echo "===================================="
echo ""

# Vérifier si DATABASE_URL est défini
if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur : DATABASE_URL n'est pas défini"
    echo ""
    echo "Pour exécuter ce script :"
    echo "  export DATABASE_URL='votre-url-railway-postgresql'"
    echo "  ./scripts/migrate-database.sh"
    echo ""
    exit 1
fi

echo "✅ DATABASE_URL trouvé"
echo ""

# Appliquer les migrations
echo "📦 Application des migrations Prisma..."
npx prisma migrate deploy

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ Migrations appliquées avec succès !"
    echo ""
    echo "📊 Tables créées :"
    echo "  - users"
    echo "  - user_profiles"
    echo "  - company_profiles"
    echo "  - documents"
    echo "  - devis"
    echo "  - torp_scores"
    echo "  - comparisons"
    echo "  - subscriptions"
    echo "  - payments"
    echo "  - analytics_events"
    echo ""
    echo "🎉 Base de données prête !"
else
    echo ""
    echo "❌ Erreur lors de l'application des migrations"
    exit 1
fi
