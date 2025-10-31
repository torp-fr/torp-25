/**
 * Script pour détecter TOUTES les erreurs TypeScript en utilisant le compilateur
 */

import { execSync } from 'child_process'
import { readFileSync } from 'fs'
import { join } from 'path'

try {
  console.log('🔍 Exécution de tsc --noEmit pour détecter TOUTES les erreurs...\n')
  
  // Utiliser npx pour exécuter tsc depuis node_modules
  const output = execSync('npx tsc --noEmit --pretty false 2>&1', {
    encoding: 'utf-8',
    cwd: process.cwd(),
    stdio: 'pipe'
  })
  
  if (output.trim() === '') {
    console.log('✅ Aucune erreur TypeScript détectée!')
    process.exit(0)
  }
  
  console.log('❌ Erreurs TypeScript détectées:\n')
  console.log(output)
  
  // Extraire les erreurs "never read"
  const lines = output.split('\n')
  const neverReadErrors = lines.filter(line => 
    line.includes('is declared but its value is never read') ||
    line.includes('never read')
  )
  
  if (neverReadErrors.length > 0) {
    console.log('\n📋 Erreurs "never read" détectées:\n')
    neverReadErrors.forEach((error, index) => {
      console.log(`${index + 1}. ${error.trim()}`)
    })
  }
  
  process.exit(1)
} catch (error: any) {
  if (error.status === 0 || error.stdout) {
    // Pas d'erreur
    console.log('✅ Aucune erreur TypeScript détectée!')
    process.exit(0)
  } else {
    // Il y a des erreurs dans stderr
    const errors = error.stderr?.toString() || error.stdout?.toString() || error.message
    console.log('❌ Erreurs TypeScript détectées:\n')
    console.log(errors)
    
    // Extraire les erreurs "never read"
    const lines = errors.split('\n')
    const neverReadErrors = lines.filter(line => 
      line.includes('is declared but its value is never read') ||
      line.includes('never read')
    )
    
    if (neverReadErrors.length > 0) {
      console.log('\n📋 Erreurs "never read" détectées:\n')
      neverReadErrors.forEach((error, index) => {
        console.log(`${index + 1}. ${error.trim()}`)
      })
    }
    
    process.exit(1)
  }
}

