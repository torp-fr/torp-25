import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de test pour vérifier la structure du dataset Cadastre data.gouv.fr
 */

async function testDataGouvCadastre() {
  const datasetId = '59b0020ec751df07d5f13bcf'
  const apiUrl = `https://www.data.gouv.fr/api/1/datasets/${datasetId}/`

  log.info(`🔍 Test API Cadastre data.gouv.fr: ${apiUrl}\n`)

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      log.error(`❌ Erreur HTTP: ${response.status} ${response.statusText}`)
      const text = await response.text()
      log.error('Réponse:', text.substring(0, 500))
      return
    }

    const data = await response.json()

    log.info('✅ Réponse API reçue')
    log.info('\n📋 Clés principales:', Object.keys(data))
    log.info('\n📦 Dataset ID:', data.id)
    log.info('📦 Dataset Title:', data.title || data.name)
    log.info('📦 Description:', data.description?.substring(0, 200) || 'N/A')
    log.info('\n🔗 Resources:')
    
    if (data.resources && Array.isArray(data.resources)) {
      log.info(`   Nombre de ressources: ${data.resources.length}\n`)
      
      data.resources.slice(0, 10).forEach((r: any, i: number) => {
        log.info(`   Ressource ${i + 1}:`)
        log.info(`     - Clés:`, Object.keys(r))
        log.info(`     - ID:`, r.id || r.uuid || 'N/A')
        log.info(`     - Title:`, r.title || r.name || 'N/A')
        log.info(`     - URL:`, r.url || r.file || 'N/A')
        log.info(`     - Format:`, r.format || r.mime_type || 'N/A')
        log.info(`     - Size:`, r.filesize || r.size || 'N/A')
        log.info(`     - Modified:`, r.last_modified || r.modified || r.created_at || 'N/A')
        log.info('')
      })

      // Ressources API/CSV/JSON
      const apiResources = data.resources.filter((r: any) => {
        const format = (r.format || r.mime_type || '').toLowerCase()
        const url = (r.url || '').toLowerCase()
        return format.includes('api') || 
               format.includes('json') || 
               format.includes('csv') ||
               url.includes('api') ||
               url.includes('json')
      })
      
      log.info(`\n📊 Ressources API/CSV/JSON trouvées: ${apiResources.length}`)
      if (apiResources.length > 0) {
        apiResources.forEach((r: any) => {
          log.info(`   - ${r.title || r.name}: ${r.url || r.file}`)
        })
      }
    } else {
      log.info('   ⚠️ Pas de ressources ou format inattendu')
    }

    // Structure complète
    log.info('\n💾 Structure complète (premiers 1500 chars):')
    log.info(JSON.stringify(data, null, 2).substring(0, 1500))

  } catch (error) {
    log.error('❌ Erreur:', error)
    if (error instanceof Error) {
      log.error('Message:', error.message)
      log.error('Stack:', error.stack)
    }
  }
}

testDataGouvCadastre()

