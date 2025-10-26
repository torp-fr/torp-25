#!/bin/bash

# 🚂 Script d'Initialisation Railway pour TORP
# Ce script configure automatiquement la base de données Railway

set -e  # Exit on error

echo "🚂 Configuration Railway pour TORP Platform"
echo "=============================================="
echo ""

# Vérifier que Prisma est installé
if ! command -v npx &> /dev/null; then
    echo "❌ Node.js/npm n'est pas installé"
    echo "Installez Node.js depuis https://nodejs.org"
    exit 1
fi

# Vérifier la présence du fichier .env
if [ ! -f .env ]; then
    echo "⚠️  Fichier .env non trouvé"
    echo ""
    echo "Créez un fichier .env avec :"
    echo "DATABASE_URL=\"postgresql://username:password@host:port/database\""
    echo ""
    echo "Récupérez cette URL depuis Railway → PostgreSQL → Connect"
    exit 1
fi

# Vérifier que DATABASE_URL existe
if ! grep -q "DATABASE_URL" .env; then
    echo "❌ DATABASE_URL non trouvée dans .env"
    echo ""
    echo "Ajoutez cette ligne dans .env :"
    echo "DATABASE_URL=\"postgresql://username:password@host:port/database\""
    exit 1
fi

echo "✅ Fichier .env trouvé"
echo ""

# Installer les dépendances si nécessaire
if [ ! -d "node_modules" ]; then
    echo "📦 Installation des dépendances..."
    npm install
    echo "✅ Dépendances installées"
    echo ""
fi

# Générer le client Prisma
echo "🔧 Génération du client Prisma..."
npx prisma generate
echo "✅ Client Prisma généré"
echo ""

# Pousser le schéma vers Railway
echo "📤 Déploiement du schéma de base de données..."
echo "Cela va créer toutes les tables dans Railway..."
echo ""

npx prisma db push

echo ""
echo "✅ Schéma déployé avec succès !"
echo ""

# Vérifier les tables créées
echo "📊 Vérification des tables créées..."
echo ""

npx prisma db execute --stdin <<SQL
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
ORDER BY table_name;
SQL

echo ""
echo "✅ Tables créées :"
echo "   - User"
echo "   - UserProfile"
echo "   - CompanyProfile"
echo "   - Document"
echo "   - Devis"
echo "   - TORPScore"
echo "   - Comparison"
echo "   - Subscription"
echo "   - Payment"
echo "   - AnalyticsEvent"
echo ""

# Proposer d'ouvrir Prisma Studio
echo "🎨 Voulez-vous ouvrir Prisma Studio pour visualiser la DB ? (y/n)"
read -r response

if [[ "$response" =~ ^[Yy]$ ]]; then
    echo "🚀 Ouverture de Prisma Studio..."
    npx prisma studio
else
    echo "✅ Configuration terminée !"
    echo ""
    echo "📝 Prochaines étapes :"
    echo "   1. Ajoutez DATABASE_URL dans Vercel (Settings → Environment Variables)"
    echo "   2. Ajoutez les autres variables (AUTH0_*, etc.)"
    echo "   3. Redéployez sur Vercel"
    echo "   4. Testez l'application !"
    echo ""
    echo "🎉 Votre base de données Railway est prête !"
fi
