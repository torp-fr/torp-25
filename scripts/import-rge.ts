import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour lancer l'import initial du dataset RGE
 * Usage: npx tsx scripts/import-rge.ts [options]
 */

import { RGEImporter } from '../services/external-apis/rge-importer'
import { RGEService } from '../services/external-apis/rge-service'

async function main() {
  log.info('🚀 Démarrage import RGE...\n')

  try {
    const rgeService = new RGEService()
    const importer = new RGEImporter()

    // 1. Récupérer les informations du dataset
    log.info('📋 Récupération des métadonnées du dataset...')
    const dataset = await rgeService.getDatasetInfo()
    
    if (!dataset || !dataset.resources || dataset.resources.length === 0) {
      log.error('❌ Aucune ressource trouvée dans le dataset RGE')
      process.exit(1)
    }

    log.info(`✅ Dataset trouvé: ${dataset.title}`)
    log.info(`📦 ${dataset.resources.length} ressource(s) disponible(s)\n`)

    // 2. Sélectionner la ressource la plus récente (CSV ou JSON)
    const latestResource = dataset.resources
      .filter((r) => r.format === 'csv' || r.format === 'json')
      .sort((a, b) => new Date(b.last_modified).getTime() - new Date(a.last_modified).getTime())[0]

    if (!latestResource) {
      log.error('❌ Aucune ressource CSV/JSON trouvée')
      process.exit(1)
    }

    log.info('📦 Ressource sélectionnée:')
    log.info(`   - Titre: ${latestResource.title}`)
    log.info(`   - Format: ${latestResource.format}`)
    log.info(`   - Taille: ${(latestResource.filesize / 1024 / 1024).toFixed(2)} MB`)
    log.info(`   - Modifiée: ${latestResource.last_modified}`)
    log.info(`   - URL: ${latestResource.url}\n`)

    // 3. Demander confirmation (optionnel pour tests)
    const args = process.argv.slice(2)
    const maxRowsArg = args.find((arg) => arg.startsWith('--max-rows='))
    const maxRows = maxRowsArg ? parseInt(maxRowsArg.split('=')[1]) : undefined

    if (maxRows) {
      log.info(`⚠️  Import limité à ${maxRows} lignes (mode test)\n`)
    } else {
      log.info('⚠️  Import complet du dataset (peut prendre du temps)\n')
      log.info('💡 Pour un import limité, utilisez: npx tsx scripts/import-rge.ts --max-rows=1000\n')
    }

    // 4. Lancer l'import
    log.info('🔄 Démarrage de l\'import...\n')

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
        log.info(
          `📈 Progression: ${progress.percentage.toFixed(1)}% | ` +
          `${progress.processed}/${progress.total || '?'} lignes | ` +
          `${elapsed}s écoulées`
        )
      },
    })

    const duration = ((Date.now() - startTime) / 1000).toFixed(2)

    // 5. Afficher les résultats
    log.info('\n' + '='.repeat(50))
    log.info('✅ Import terminé!')
    log.info('='.repeat(50))
    log.info(`📊 Résultats:`)
    log.info(`   - Certifications indexées: ${result.indexed}`)
    log.info(`   - Erreurs: ${result.errors}`)
    log.info(`   - Durée: ${duration}s`)
    log.info(`   - Statut: ${result.success ? '✅ Succès' : '❌ Échec'}`)
    log.info('='.repeat(50) + '\n')

    if (result.success) {
      log.info('🎉 L\'index RGE est maintenant disponible pour les recherches!')
      log.info('💡 Les prochaines analyses de devis utiliseront automatiquement l\'index local.\n')
    } else {
      log.error('❌ L\'import a échoué. Consultez les logs ci-dessus pour plus de détails.')
      process.exit(1)
    }
  } catch (error) {
    log.error('\n❌ Erreur lors de l\'import:', error)
    process.exit(1)
  }
}

main()

