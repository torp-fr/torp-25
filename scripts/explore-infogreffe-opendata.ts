/**
 * Script d'exploration de l'API OpenData Infogreffe
 * Liste les datasets disponibles et cherche ceux pertinents pour l'enrichissement
 */

async function exploreInfogreffeOpenData() {
  console.log('🔍 Exploration API OpenData Infogreffe\n')

  const baseUrl = 'https://opendata.datainfogreffe.fr/api/explore/v2.1'

  try {
    // Lister tous les datasets disponibles
    console.log('📋 Récupération des datasets disponibles...\n')
    const catalogResponse = await fetch(`${baseUrl}/catalog/datasets?limit=100`)

    if (!catalogResponse.ok) {
      throw new Error(`HTTP ${catalogResponse.status}: ${catalogResponse.statusText}`)
    }

    const catalogData = await catalogResponse.json()

    console.log(`✅ ${catalogData.total_count} datasets trouvés\n`)
    console.log('=' .repeat(80))

    // Filtrer les datasets pertinents pour enrichissement entreprise
    const relevantKeywords = [
      'entreprise', 'societe', 'siren', 'siret', 'rcs',
      'bilan', 'comptes', 'bodacc', 'procedure', 'collective',
      'etablissement', 'immatriculation', 'radiations'
    ]

    const relevantDatasets = catalogData.results.filter((dataset: any) => {
      const title = dataset.metas?.default?.title?.toLowerCase() || ''
      const description = dataset.metas?.default?.description?.toLowerCase() || ''
      const keywords = (dataset.metas?.default?.keyword || []).join(' ').toLowerCase()

      const searchText = `${title} ${description} ${keywords}`

      return relevantKeywords.some(keyword => searchText.includes(keyword))
    })

    console.log(`\n🎯 ${relevantDatasets.length} datasets pertinents pour enrichissement entreprise:\n`)

    relevantDatasets.forEach((dataset: any, index: number) => {
      const meta = dataset.metas?.default || {}
      console.log(`${index + 1}. ${dataset.dataset_id}`)
      console.log(`   📌 Titre: ${meta.title || 'N/A'}`)
      console.log(`   📊 Records: ${meta.records_count?.toLocaleString('fr-FR') || 'N/A'}`)
      console.log(`   📅 Modifié: ${meta.modified || 'N/A'}`)

      if (meta.description) {
        const shortDesc = meta.description.replace(/<[^>]*>/g, '').substring(0, 150)
        console.log(`   📝 Description: ${shortDesc}...`)
      }

      console.log(`   🔗 URL: ${baseUrl}/catalog/datasets/${dataset.dataset_id}/records`)
      console.log('')
    })

    // Tester une requête sur le dataset des entreprises (si disponible)
    console.log('=' .repeat(80))
    console.log('\n🧪 Test de requête sur un dataset entreprise...\n')

    // Chercher un dataset avec "immatriculations" ou "entreprises" dans le titre
    const enterpriseDataset = relevantDatasets.find((d: any) => {
      const title = d.metas?.default?.title?.toLowerCase() || ''
      return title.includes('immatricul') || title.includes('entreprise')
    })

    if (enterpriseDataset) {
      console.log(`📦 Dataset sélectionné: ${enterpriseDataset.dataset_id}`)
      console.log(`   ${enterpriseDataset.metas?.default?.title}\n`)

      // Exemple de recherche par SIREN (Apple France)
      const testSiren = '542051180'
      console.log(`🔎 Test recherche SIREN: ${testSiren}`)

      const searchUrl = `${baseUrl}/catalog/datasets/${enterpriseDataset.dataset_id}/records?where=siren="${testSiren}"&limit=1`
      console.log(`🌐 URL: ${searchUrl}\n`)

      const searchResponse = await fetch(searchUrl)
      if (searchResponse.ok) {
        const searchData = await searchResponse.json()
        console.log(`✅ Résultat:\n`)
        console.log(JSON.stringify(searchData.results[0], null, 2))
      } else {
        console.log(`⚠️  Échec recherche: ${searchResponse.status}`)
      }
    } else {
      console.log('⚠️  Aucun dataset "entreprises" trouvé pour le test')
    }

  } catch (error) {
    console.error('\n❌ Erreur:', error)
  }
}

exploreInfogreffeOpenData().then(() => {
  console.log('\n✅ Exploration terminée')
  process.exit(0)
}).catch((error) => {
  console.error('\n❌ Erreur fatale:', error)
  process.exit(1)
})
