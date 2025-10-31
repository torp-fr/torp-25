/**
 * Script pour lancer l'import initial du dataset RGE
 * Usage: npx tsx scripts/import-rge.ts [options]
 */

import { RGEImporter } from '../services/external-apis/rge-importer'
import { RGEService } from '../services/external-apis/rge-service'

async function main() {
  console.log('🚀 Démarrage import RGE...\n')

  try {
    const rgeService = new RGEService()
    const importer = new RGEImporter()

    // 1. Récupérer les informations du dataset
    console.log('📋 Récupération des métadonnées du dataset...')
    const dataset = await rgeService.getDatasetInfo()
    
    if (!dataset || !dataset.resources || dataset.resources.length === 0) {
      console.error('❌ Aucune ressource trouvée dans le dataset RGE')
      process.exit(1)
    }

    console.log(`✅ Dataset trouvé: ${dataset.title}`)
    console.log(`📦 ${dataset.resources.length} ressource(s) disponible(s)\n`)

    // 2. Sélectionner la ressource la plus récente (CSV ou JSON)
    const latestResource = dataset.resources
      .filter((r) => r.format === 'csv' || r.format === 'json')
      .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

    if (!latestResource) {
      console.error('❌ Aucune ressource CSV/JSON trouvée')
      process.exit(1)
    }

    console.log('📦 Ressource sélectionnée:')
    console.log(`   - Titre: ${latestResource.title}`)
    console.log(`   - Format: ${latestResource.format}`)
    console.log(`   - Taille: ${(latestResource.filesize / 1024 / 1024).toFixed(2)} MB`)
    console.log(`   - Modifiée: ${latestResource.last_modified}`)
    console.log(`   - URL: ${latestResource.url}\n`)

    // 3. Demander confirmation (optionnel pour tests)
    const args = process.argv.slice(2)
    const maxRowsArg = args.find((arg) => arg.startsWith('--max-rows='))
    const maxRows = maxRowsArg ? parseInt(maxRowsArg.split('=')[1]) : undefined

    if (maxRows) {
      console.log(`⚠️  Import limité à ${maxRows} lignes (mode test)\n`)
    } else {
      console.log('⚠️  Import complet du dataset (peut prendre du temps)\n')
      console.log('💡 Pour un import limité, utilisez: npx tsx scripts/import-rge.ts --max-rows=1000\n')
    }

    // 4. Lancer l'import
    console.log('🔄 Démarrage de l\'import...\n')

    const startTime = Date.now()
    const result = await importer.importResource({
      resourceUrl: latestResource.url,
      resourceId: latestResource.id,
      resourceTitle: latestResource.title,
      resourceFormat: latestResource.format,
      maxRows,
      batchSize: 1000,
      onProgress: (progress) => {
        const elapsed = ((Date.now() - startTime) / 1000).toFixed(0)
        console.log(
          `📈 Progression: ${progress.percentage.toFixed(1)}% | ` +
          `${progress.processed}/${progress.total || '?'} lignes | ` +
          `${elapsed}s écoulées`
        )
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    // 5. Afficher les résultats
    console.log('\n' + '='.repeat(50))
    console.log('✅ Import terminé!')
    console.log('='.repeat(50))
    console.log(`📊 Résultats:`)
    console.log(`   - Certifications indexées: ${result.indexed}`)
    console.log(`   - Erreurs: ${result.errors}`)
    console.log(`   - Durée: ${duration}s`)
    console.log(`   - Statut: ${result.success ? '✅ Succès' : '❌ Échec'}`)
    console.log('='.repeat(50) + '\n')

    if (result.success) {
      console.log('🎉 L\'index RGE est maintenant disponible pour les recherches!')
      console.log('💡 Les prochaines analyses de devis utiliseront automatiquement l\'index local.\n')
    } else {
      console.error('❌ L\'import a échoué. Consultez les logs ci-dessus pour plus de détails.')
      process.exit(1)
    }
  } catch (error) {
    console.error('\n❌ Erreur lors de l\'import:', error)
    process.exit(1)
  }
}

main()

