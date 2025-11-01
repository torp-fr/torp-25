# Script PowerShell pour appliquer la migration Building Profile Role via Railway

Write-Host "🗄️  Migration Building Profile Role" -ForegroundColor Cyan
Write-Host "====================================" -ForegroundColor Cyan
Write-Host ""

# Vérifier si Railway CLI est disponible
if (-not (Get-Command railway -ErrorAction SilentlyContinue)) {
    Write-Host "❌ Railway CLI n'est pas installé" -ForegroundColor Red
    Write-Host "   Installez-le avec: npm install -g @railway/cli" -ForegroundColor Yellow
    exit 1
}

Write-Host "✅ Railway CLI trouvé" -ForegroundColor Green
Write-Host ""

# Appliquer la migration via Prisma
Write-Host "📦 Application de la migration via Prisma migrate deploy..." -ForegroundColor Cyan
railway run npx prisma migrate deploy

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✅ Migration appliquée avec succès !" -ForegroundColor Green
    Write-Host ""
    Write-Host "📊 Modifications effectuées :" -ForegroundColor Cyan
    Write-Host "  - Enum 'building_profile_role' créé (PROPRIETAIRE, LOCATAIRE)"
    Write-Host "  - Colonnes ajoutées : role, parent_profile_id, lot_number, tenant_data"
    Write-Host "  - Index unique créé pour garantir l'unicité des cartes propriétaire"
    Write-Host "  - Relations parent/enfant configurées"
    Write-Host ""
    Write-Host "🎉 Migration terminée !" -ForegroundColor Green
    Write-Host ""
    Write-Host "💡 Vérification :" -ForegroundColor Cyan
    Write-Host "   railway run npx prisma migrate status"
} else {
    Write-Host ""
    Write-Host "❌ Erreur lors de l'application de la migration" -ForegroundColor Red
    exit 1
}


