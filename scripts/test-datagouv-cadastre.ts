/**
 * Script de test pour vérifier la structure du dataset Cadastre data.gouv.fr
 */

async function testDataGouvCadastre() {
  const datasetId = '59b0020ec751df07d5f13bcf'
  const apiUrl = `https://www.data.gouv.fr/api/1/datasets/${datasetId}/`

  console.log(`🔍 Test API Cadastre data.gouv.fr: ${apiUrl}\n`)

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
    console.log('📦 Description:', data.description?.substring(0, 200) || 'N/A')
    console.log('\n🔗 Resources:')
    
    if (data.resources && Array.isArray(data.resources)) {
      console.log(`   Nombre de ressources: ${data.resources.length}\n`)
      
      data.resources.slice(0, 10).forEach((r: any, i: number) => {
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
      
      console.log(`\n📊 Ressources API/CSV/JSON trouvées: ${apiResources.length}`)
      if (apiResources.length > 0) {
        apiResources.forEach((r: any) => {
          console.log(`   - ${r.title || r.name}: ${r.url || r.file}`)
        })
      }
    } else {
      console.log('   ⚠️ Pas de ressources ou format inattendu')
    }

    // Structure complète
    console.log('\n💾 Structure complète (premiers 1500 chars):')
    console.log(JSON.stringify(data, null, 2).substring(0, 1500))

  } catch (error) {
    console.error('❌ Erreur:', error)
    if (error instanceof Error) {
      console.error('Message:', error.message)
      console.error('Stack:', error.stack)
    }
  }
}

testDataGouvCadastre()

