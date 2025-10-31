/**
 * Script de test pour vérifier la structure de l'API RGE data.gouv.fr
 */

async function testRGEApi() {
  const datasetId = '62bd63b70ff1edf452b83a6b'
  const apiUrl = `https://www.data.gouv.fr/api/1/datasets/${datasetId}/`

  console.log(`🔍 Test API RGE: ${apiUrl}\n`)

  try {
    const response = await fetch(apiUrl, {
      headers: {
        'Accept': 'application/json',
      },
    })

    if (!response.ok) {
      console.error(`❌ Erreur HTTP: ${response.status} ${response.statusText}`)
      const text = await response.text()
      console.error('Réponse:', text.substring(0, 500))
      return
    }

    const data = await response.json()

    console.log('✅ Réponse API reçue')
    console.log('\n📋 Clés principales:', Object.keys(data))
    console.log('\n📦 Dataset ID:', data.id)
    console.log('📦 Dataset Title:', data.title || data.name)
    console.log('\n🔗 Resources:')
    
    if (data.resources && Array.isArray(data.resources)) {
      console.log(`   Nombre de ressources: ${data.resources.length}\n`)
      
      data.resources.slice(0, 5).forEach((r: any, i: number) => {
        console.log(`   Ressource ${i + 1}:`)
        console.log(`     - Clés:`, Object.keys(r))
        console.log(`     - ID:`, r.id || r.uuid || 'N/A')
        console.log(`     - Title:`, r.title || r.name || 'N/A')
        console.log(`     - URL:`, r.url || r.file || 'N/A')
        console.log(`     - Format:`, r.format || r.mime_type || 'N/A')
        console.log(`     - Size:`, r.filesize || r.size || 'N/A')
        console.log(`     - Modified:`, r.last_modified || r.modified || r.created_at || 'N/A')
        console.log('')
      })

      // Ressources CSV/JSON
      const csvJsonResources = data.resources.filter((r: any) => {
        const format = (r.format || r.mime_type || '').toLowerCase()
        return format.includes('csv') || format.includes('json') || 
               r.url?.includes('.csv') || r.url?.includes('.json')
      })
      
      console.log(`\n📊 Ressources CSV/JSON trouvées: ${csvJsonResources.length}`)
      if (csvJsonResources.length > 0) {
        csvJsonResources.forEach((r: any) => {
          console.log(`   - ${r.title || r.name}: ${r.url || r.file}`)
        })
      }
    } else {
      console.log('   ⚠️ Pas de ressources ou format inattendu')
      console.log('   Type:', typeof data.resources)
      if (data.resources) {
        console.log('   Valeur:', JSON.stringify(data.resources).substring(0, 200))
      }
    }

    // Sauvegarder la réponse complète pour analyse
    console.log('\n💾 Structure complète (premiers 1000 chars):')
    console.log(JSON.stringify(data, null, 2).substring(0, 1000))

  } catch (error) {
    console.error('❌ Erreur:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

testRGEApi()

