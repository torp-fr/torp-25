/**
 * Script pour trouver TOUTES les erreurs TypeScript du projet
 * Utilise directement le compilateur TypeScript pour détecter toutes les erreurs
 */

import { execSync } from 'child_process'
import { readFileSync, writeFileSync } from 'fs'

try {
  console.log('🔍 Analyse TypeScript complète...\n')
  
  // Utiliser Next.js build qui fait la vérification TypeScript
  const output = execSync('npm run build 2>&1', { 
    encoding: 'utf-8',
    maxBuffer: 10 * 1024 * 1024 // 10MB
  })
  
  // Extraire toutes les erreurs "never read"
  const errors = output.match(/Type error:.*never read.*\n.*\n.*\n.*>/g) || []
  
  if (errors.length === 0) {
    console.log('✅ Aucune erreur "never read" détectée!')
    
    // Vérifier s'il y a d'autres erreurs
    if (output.includes('Failed to compile')) {
      console.log('\n⚠️  Il y a des erreurs de compilation, mais pas de type "never read"')
      // Extraire les erreurs
      const allErrors = output.match(/Type error:.*\n.*>/g) || []
      if (allErrors.length > 0) {
        console.log(`\n📋 ${allErrors.length} erreur(s) TypeScript détectée(s):\n`)
        allErrors.forEach((err, i) => {
          console.log(`${i + 1}. ${err}`)
        })
      }
    } else if (output.includes('Compiled successfully')) {
      console.log('\n✅ Build réussi!')
    }
  } else {
    console.log(`❌ ${errors.length} erreur(s) "never read" détectée(s):\n`)
    errors.forEach((err, i) => {
      console.log(`${i + 1}. ${err}`)
    })
    
    // Écrire les erreurs dans un fichier
    writeFileSync('errors-report.txt', errors.join('\n\n'))
    console.log('\n📄 Rapport détaillé sauvegardé dans errors-report.txt')
  }
} catch (error: any) {
  const output = error.stdout || error.message || ''
  
  // Extraire toutes les erreurs
  const neverReadErrors = output.match(/Type error:.*never read[^\n]*\n[^\n]*\n[^\n]*\n[^\n]*>/g) || []
  const allErrors = output.match(/Type error:[^\n]*\n[^\n]*>/g) || []
  
  if (neverReadErrors.length > 0) {
    console.log(`❌ ${neverReadErrors.length} erreur(s) "never read" détectée(s):\n`)
    neverReadErrors.forEach((err, i) => {
      console.log(`${i + 1}.\n${err}\n`)
    })
    
    writeFileSync('errors-report.txt', neverReadErrors.join('\n\n'))
    console.log('\n📄 Rapport sauvegardé dans errors-report.txt')
  } else if (allErrors.length > 0) {
    console.log(`❌ ${allErrors.length} erreur(s) TypeScript détectée(s):\n`)
    allErrors.slice(0, 20).forEach((err, i) => {
      console.log(`${i + 1}. ${err}`)
    })
    if (allErrors.length > 20) {
      console.log(`\n... et ${allErrors.length - 20} autres erreurs`)
    }
  } else {
    console.log('⚠️  Impossible de parser les erreurs. Output:')
    console.log(output.slice(0, 2000))
  }
}

