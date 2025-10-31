/**
 * Script de détection systématique de toutes les erreurs TypeScript
 * Usage: npx tsx scripts/check-all-errors.ts
 */

import { execSync } from 'child_process'
import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'

interface ErrorReport {
  file: string
  line: number
  message: string
  category: 'unused-param' | 'type-error' | 'other'
}

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

function checkTypeScriptErrors(): ErrorReport[] {
  const errors: ErrorReport[] = []
  
  try {
    const output = execSync('npx tsc --noEmit --pretty false', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    // Si pas d'erreur, output est vide
    if (output.trim()) {
      const lines = output.split('\n').filter(l => l.trim())
      for (const line of lines) {
        // Format: ./path/to/file.ts:123:45 - error TSxxxx: message
        const match = line.match(/\.\/([^:]+):(\d+):\d+\s*-\s*(?:error|warning)\s+TS?\d+:\s*(.+)/)
        if (match) {
          const [, file, lineNum, message] = match
          errors.push({
            file,
            line: parseInt(lineNum, 10),
            message: message.trim(),
            category: message.includes('never read') || message.includes('never used')
              ? 'unused-param'
              : 'type-error',
          })
        }
      }
    }
  } catch (error: any) {
    const output = error.stdout?.toString() || error.message || ''
    const lines = output.split('\n').filter((l: string) => l.trim())
    
    for (const line of lines) {
      const match = line.match(/\.\/([^:]+):(\d+):\d+\s*-\s*(?:error|warning)\s+TS?\d+:\s*(.+)/)
      if (match) {
        const [, file, lineNum, message] = match
        errors.push({
          file,
          line: parseInt(lineNum, 10),
          message: message.trim(),
          category: message.includes('never read') || message.includes('never used')
            ? 'unused-param'
            : 'type-error',
        })
      }
    }
  }
  
  return errors
}

function findUnusedParamsInFile(filePath: string): ErrorReport[] {
  const errors: ErrorReport[] = []
  const content = readFileSync(filePath, 'utf-8')
  
  // Pattern pour trouver les fonctions avec paramètres
  const functionPattern = /(?:private|public|async)\s+(?:async\s+)?(\w+)\s*\(([^)]+)\)/g
  let match
  
  while ((match = functionPattern.exec(content)) !== null) {
    const functionName = match[1]
    const paramsString = match[2]
    const matchLine = content.substring(0, match.index).split('\n').length
    
    // Extraire les noms de paramètres
    const params = paramsString
      .split(',')
      .map(p => p.trim())
      .map(p => {
        const paramMatch = p.match(/(\w+)(?:\s*[:=]|$)/)
        return paramMatch ? paramMatch[1] : null
      })
      .filter((p): p is string => p !== null && !p.startsWith('_'))
    
    // Trouver le corps de la fonction
    const funcBodyStart = content.indexOf(')', match.index) + 1
    let braceCount = 0
    let inBody = false
    let bodyEnd = funcBodyStart
    
    for (let i = funcBodyStart; i < content.length; i++) {
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
    
    const funcBody = content.substring(funcBodyStart, bodyEnd)
    const signature = content.substring(match.index, funcBodyStart)
    
    // Vérifier chaque paramètre
    for (const param of params) {
      // Compter les occurrences dans la signature (déclaration)
      const sigMatches = (signature.match(new RegExp(`\\b${param}\\b`, 'g')) || []).length
      // Compter les occurrences dans le corps (utilisation)
      const bodyMatches = (funcBody.match(new RegExp(`\\b${param}\\b`, 'g')) || []).length
      
      // Si déclaré mais jamais utilisé dans le corps
      if (sigMatches > 0 && bodyMatches === 0) {
        errors.push({
          file: filePath.replace(process.cwd() + '/', ''),
          line: matchLine,
          message: `Parameter '${param}' is declared but its value is never read in ${functionName}()`,
          category: 'unused-param',
        })
      }
    }
  }
  
  return errors
}

function main() {
  console.log('🔍 Détection systématique de toutes les erreurs...\n')
  
  // 1. Vérifier les erreurs TypeScript
  console.log('📋 Vérification des erreurs TypeScript...')
  const tsErrors = checkTypeScriptErrors()
  
  // 2. Vérifier les paramètres non utilisés dans les fichiers d'axes
  console.log('📋 Vérification des paramètres non utilisés...')
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const unusedParamErrors: ErrorReport[] = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const fileErrors = findUnusedParamsInFile(filePath)
    unusedParamErrors.push(...fileErrors)
  }
  
  // Combiner toutes les erreurs
  const allErrors = [...tsErrors, ...unusedParamErrors]
  
  // Regrouper par catégorie
  const byCategory = {
    'unused-param': allErrors.filter(e => e.category === 'unused-param'),
    'type-error': allErrors.filter(e => e.category === 'type-error'),
    'other': allErrors.filter(e => e.category === 'other'),
  }
  
  // Afficher le rapport
  console.log('\n📊 RAPPORT D\'ERREURS\n')
  console.log(`Total: ${allErrors.length} erreurs détectées\n`)
  
  if (byCategory['type-error'].length > 0) {
    console.log(`❌ Erreurs de type (${byCategory['type-error'].length}):`)
    for (const error of byCategory['type-error']) {
      console.log(`   ${error.file}:${error.line} - ${error.message}`)
    }
    console.log()
  }
  
  if (byCategory['unused-param'].length > 0) {
    console.log(`⚠️  Paramètres non utilisés (${byCategory['unused-param'].length}):`)
    for (const error of byCategory['unused-param']) {
      console.log(`   ${error.file}:${error.line} - ${error.message}`)
    }
    console.log()
  }
  
  if (allErrors.length === 0) {
    console.log('✅ Aucune erreur détectée!')
    process.exit(0)
  } else {
    console.log(`\n💡 Actions recommandées:`)
    console.log(`   1. Préfixer les paramètres non utilisés avec '_'`)
    console.log(`   2. Supprimer les variables non utilisées`)
    console.log(`   3. Corriger les erreurs de type`)
    console.log(`   4. Vérifier la cohérence des interfaces`)
    process.exit(1)
  }
}

main()

