import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script pour trouver TOUTES les incohérences entre paramètres et leur utilisation
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

interface Inconsistency {
  file: string
  line: number
  param: string
  usedAs: string
}

function findInconsistencies(filePath: string): Inconsistency[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const inconsistencies: Inconsistency[] = []
  
  // Pattern pour trouver les déclarations de fonction
  const funcPattern = /^\s*(private|public|async)?\s*(async\s+)?(\w+)\s*\([^)]+\)/gm
  
  let match
  while ((match = funcPattern.exec(content)) !== null) {
    const funcStart = match.index
    const funcLine = content.substring(0, funcStart).split('\n').length
    
    // Extraire la signature complète de la fonction
    const funcEnd = content.indexOf('{', funcStart)
    if (funcEnd === -1) continue
    
    const signature = content.substring(funcStart, funcEnd)
    
    // Trouver tous les paramètres avec _
    const prefixedParams = signature.match(/_\w+\s*:/g) || []
    
    // Trouver le corps de la fonction
    let braceCount = 0
    let bodyStart = funcEnd
    let inBody = false
    let bodyEnd = bodyStart
    
    for (let i = bodyStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++
        inBody = true
      }
      if (content[i] === '}') {
        braceCount--
        if (inBody && braceCount === 0) {
          bodyEnd = i
          break
        }
      }
    }
    
    const funcBody = content.substring(bodyStart + 1, bodyEnd)
    
    // Vérifier chaque paramètre préfixé
    for (const paramMatch of prefixedParams) {
      const paramName = paramMatch.replace(/[_\s:]/g, '')
      const unprefixedName = paramName.replace(/^_/, '')
      
      // Chercher si le paramètre sans _ est utilisé (mais pas avec _)
      const usedWithoutPrefix = new RegExp(`\\b${unprefixedName}\\b`).test(funcBody)
      const usedWithPrefix = new RegExp(`\\b_${unprefixedName}\\b`).test(funcBody)
      
      if (usedWithoutPrefix && !usedWithPrefix) {
        inconsistencies.push({
          file: filePath,
          line: funcLine,
          param: `_${unprefixedName}`,
          usedAs: unprefixedName,
        })
      }
    }
    
    // Vérifier aussi les paramètres sans _ qui devraient être utilisés avec _
    const unprefixedParams = signature.match(/\b(\w+)\s*:\s*(?!Devis|ScoringEnrichmentData|any|string|number|boolean)/g) || []
    for (const paramMatch of unprefixedParams) {
      const paramName = paramMatch.replace(/[:\s]/g, '')
      if (['devis', 'context', 'enrichmentData'].includes(paramName)) {
        // Chercher si utilisé avec _
        const usedWithPrefix = new RegExp(`\\b_${paramName}\\b`).test(funcBody)
        const usedWithoutPrefix = new RegExp(`\\b${paramName}\\b`).test(funcBody)
        
        if (usedWithPrefix && !usedWithoutPrefix) {
          inconsistencies.push({
            file: filePath,
            line: funcLine,
            param: paramName,
            usedAs: `_${paramName}`,
          })
        }
      }
    }
  }
  
  return inconsistencies
}

function main() {
  log.info('🔍 Détection de TOUTES les incohérences paramètres/utilisation...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allInconsistencies: Inconsistency[] = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const inconsistencies = findInconsistencies(filePath)
    if (inconsistencies.length > 0) {
      allInconsistencies.push(...inconsistencies)
    }
  }
  
  if (allInconsistencies.length === 0) {
    log.info('✅ Aucune incohérence détectée!')
  } else {
    log.info(`❌ ${allInconsistencies.length} incohérence(s) détectée(s):\n`)
    allInconsistencies.forEach((inc, i) => {
      log.info(`${i + 1}. ${inc.file.replace(process.cwd() + '/', '')}:${inc.line}`)
      log.info(`   Paramètre '${inc.param}' déclaré mais utilisé comme '${inc.usedAs}'\n`)
    })
  }
}

main()

