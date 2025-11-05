import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * REFONTE COMPLÈTE : Correction automatique de TOUTES les erreurs
 * 
 * NOUVELLE STRATÉGIE :
 * 1. Scanner TOUS les fichiers d'axes
 * 2. Analyser CHAQUE fonction pour paramètres non utilisés
 * 3. Corriger TOUT en une seule passe
 * 4. Valider AVANT de committer
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface FunctionInfo {
  file: string
  name: string
  startLine: number
  params: Array<{ name: string; used: boolean; line: number }>
}

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

function analyzeFile(filePath: string): FunctionInfo[] {
  const content = readFileSync(filePath, 'utf-8')
  const functions: FunctionInfo[] = []
  
  // Pattern pour trouver les fonctions
  const functionRegex = /(?:private|public|async)\s+(?:async\s+)?(\w+)\s*\(([^)]*)\)/g
  let match
  
  while ((match = functionRegex.exec(content)) !== null) {
    const funcName = match[1]
    const paramsString = match[2]
    const matchLine = content.substring(0, match.index).split('\n').length
    
    // Extraire les paramètres
    const params: Array<{ name: string; used: boolean; line: number }> = []
    if (paramsString.trim()) {
      const paramRegex = /(\w+)\s*:\s*[^,)]+/g
      let paramMatch
      while ((paramMatch = paramRegex.exec(paramsString)) !== null) {
        const paramName = paramMatch[1]
        if (!paramName.startsWith('_')) {
          params.push({
            name: paramName,
            used: false,
            line: matchLine,
          })
        }
      }
    }
    
    // Trouver le corps de la fonction
    const bodyStart = content.indexOf(')', match.index) + 1
    let braceCount = 0
    let bodyEnd = bodyStart
    let inBody = false
    
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
    
    const funcBody = content.substring(bodyStart, bodyEnd)
    const signature = content.substring(match.index, bodyStart)
    
    // Vérifier l'utilisation de chaque paramètre
    for (const param of params) {
      // Compter les occurrences dans la signature (déclarations)
      const sigOccurrences = (signature.match(new RegExp(`\\b${param.name}\\b`, 'g')) || []).length
      // Compter les occurrences dans le corps (utilisations réelles)
      const bodyOccurrences = (funcBody.match(new RegExp(`\\b${param.name}\\b`, 'g')) || []).length
      
      // Si déclaré mais jamais utilisé
      param.used = sigOccurrences > 0 && bodyOccurrences > 0
    }
    
    functions.push({
      file: filePath,
      name: funcName,
      startLine: matchLine,
      params,
    })
  }
  
  return functions
}

function fixFile(filePath: string, functions: FunctionInfo[]): boolean {
  let content = readFileSync(filePath, 'utf-8')
  let modified = false
  
  for (const func of functions) {
    const unusedParams = func.params.filter(p => !p.used)
    
    if (unusedParams.length === 0) continue
    
    // Trouver et corriger chaque paramètre non utilisé
    for (const param of unusedParams) {
      // Remplacer dans la signature de la fonction
      const paramPattern = new RegExp(`\\b${param.name}\\s*:`, 'g')
      const replacement = `_${param.name}:`
      
      if (content.includes(`${param.name}:`)) {
        content = content.replace(paramPattern, replacement)
        modified = true
      }
    }
  }
  
  if (modified) {
    writeFileSync(filePath, content, 'utf-8')
  }
  
  return modified
}

function main() {
  log.info('🔧 REFONTE COMPLÈTE : Correction automatique de TOUTES les erreurs\n')
  log.info('📋 Étape 1: Analyse de tous les fichiers d\'axes...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allFunctions: FunctionInfo[] = []
  const filesToFix: Array<{ file: string; functions: FunctionInfo[] }> = []
  
  // Analyser tous les fichiers
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const functions = analyzeFile(filePath)
    
    const unusedParams = functions.flatMap(f => f.params.filter(p => !p.used))
    
    if (unusedParams.length > 0) {
      log.info(`📄 ${file}`)
      for (const func of functions) {
        const unused = func.params.filter(p => !p.used)
        if (unused.length > 0) {
          log.info(`   ${func.name}(): ${unused.length} paramètre(s) non utilisé(s)`)
          for (const param of unused) {
            log.info(`      - ${param.name} (ligne ${param.line})`)
          }
        }
      }
      log.info()
      
      filesToFix.push({ file: filePath, functions })
    }
    
    allFunctions.push(...functions)
  }
  
  const totalUnused = allFunctions.flatMap(f => f.params.filter(p => !p.used)).length
  
  if (totalUnused === 0) {
    log.info('✅ Aucun paramètre non utilisé détecté!')
    process.exit(0)
  }
  
  log.info(`\n🔧 Étape 2: Correction de ${totalUnused} paramètre(s) non utilisé(s)...\n`)
  
  // Corriger tous les fichiers
  let fixedCount = 0
  for (const { file, functions } of filesToFix) {
    if (fixFile(file, functions)) {
      fixedCount++
      log.info(`  ✓ ${file.replace(process.cwd() + '/', '')}`)
    }
  }
  
  log.info(`\n✅ ${fixedCount} fichier(s) corrigé(s)`)
  log.info('\n📋 Étape 3: Vérification finale...\n')
  
  // Vérifier avec TypeScript
  try {
    const { execSync } = require('child_process')
    execSync('npx tsc --noEmit', { stdio: 'inherit' })
    log.info('\n✅ Toutes les erreurs ont été corrigées!')
  } catch (error) {
    log.info('\n⚠️  Il reste des erreurs à corriger manuellement')
    log.info('   Exécutez: npx tsc --noEmit pour voir les détails')
  }
}

main()

