import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour détecter les incohérences entre paramètres préfixés avec _ et leur utilisation
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

function checkFile(filePath: string): string[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors: string[] = []
  
  // Pattern pour trouver les paramètres de fonction avec _
  const paramPattern = /(\w+)\s*\([^)]*_\w+\s*:/g
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    
    // Trouver les déclarations de fonction avec paramètres préfixés
    if (line.match(/^\s*(private|public|async)?\s*(async\s+)?\w+\s*\([^)]*_\w+/)) {
      // Extraire les noms de paramètres préfixés
      const prefixedParams = line.match(/_(\w+)\s*:/g) || []
      
      // Chercher dans les lignes suivantes (corps de la fonction)
      let braceCount = 0
      let inFunction = false
      let functionStart = i
      
      for (let j = i; j < lines.length && j < i + 200; j++) {
        const currentLine = lines[j]
        const openBraces = (currentLine.match(/{/g) || []).length
        const closeBraces = (currentLine.match(/}/g) || []).length
        
        braceCount += openBraces - closeBraces
        
        if (openBraces > 0) inFunction = true
        if (inFunction && braceCount === 0 && closeBraces > 0) {
          // Fin de fonction
          const functionBody = lines.slice(i, j + 1).join('\n')
          
          // Vérifier chaque paramètre préfixé
          for (const paramMatch of prefixedParams) {
            const paramName = paramMatch.replace(/[_:]/g, '')
            const unprefixedName = paramName.replace(/^_/, '')
            
            // Chercher si le paramètre sans _ est utilisé
            if (functionBody.match(new RegExp(`\\b${unprefixedName}\\b`)) && 
                !functionBody.match(new RegExp(`\\b_${unprefixedName}\\b`))) {
              errors.push(`${filePath}:${i + 1} - Paramètre '_${unprefixedName}' déclaré mais '${unprefixedName}' utilisé dans le corps`)
            }
          }
          break
        }
      }
    }
  }
  
  return errors
}

function main() {
  log.info('🔍 Détection des incohérences paramètres/utilisation...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allErrors: string[] = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const errors = checkFile(filePath)
    if (errors.length > 0) {
      allErrors.push(...errors)
    }
  }
  
  if (allErrors.length === 0) {
    log.info('✅ Aucune incohérence détectée!')
  } else {
    log.info(`❌ ${allErrors.length} incohérence(s) détectée(s):\n`)
    allErrors.forEach((err, i) => {
      log.info(`${i + 1}. ${err}`)
    })
  }
}

main()

