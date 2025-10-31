/**
 * Script pour trouver TOUS les paramètres non utilisés dans les axes de scoring
 * Avant de pousser, exécuter ce script pour corriger toutes les erreurs d'un coup
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

interface UnusedParam {
  file: string
  line: number
  param: string
  function: string
}

function findUnusedParams(filePath: string): UnusedParam[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const unused: UnusedParam[] = []
  
  // Pattern pour trouver les déclarations de fonction
  const funcPattern = /(private|public|async)?\s*(async\s+)?(\w+)\s*\(([^)]+)\)/g
  
  let match
  while ((match = funcPattern.exec(content)) !== null) {
    const funcStart = match.index
    const funcLine = content.substring(0, funcStart).split('\n').length
    
    // Extraire la signature complète de la fonction
    const funcEnd = content.indexOf('{', funcStart)
    if (funcEnd === -1) continue
    
    const signature = content.substring(funcStart, funcEnd)
    const funcName = match[3]
    
    // Trouver tous les paramètres
    const paramsStr = match[4]
    const params = paramsStr.split(',').map(p => {
      const trimmed = p.trim()
      const colonIndex = trimmed.indexOf(':')
      if (colonIndex === -1) return trimmed.trim()
      return trimmed.substring(0, colonIndex).trim()
    }).filter(p => p.length > 0)
    
    // Trouver le corps de la fonction (première accolade jusqu'à la fermeture correspondante)
    let braceCount = 0
    let bodyStart = funcEnd
    let bodyEnd = bodyStart
    
    for (let i = bodyStart; i < content.length; i++) {
      if (content[i] === '{') {
        braceCount++
      }
      if (content[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          bodyEnd = i
          break
        }
      }
    }
    
    const funcBody = content.substring(bodyStart + 1, bodyEnd)
    
    // Vérifier chaque paramètre
    for (const param of params) {
      // Ignorer les paramètres déjà préfixés avec _
      if (param.startsWith('_')) continue
      
      // Ignorer les paramètres qui sont des types (typescript)
      if (param.includes(':') || param.includes('?')) continue
      
      // Chercher si le paramètre est utilisé dans le corps
      // Exclure les déclarations de paramètres (éviter faux positifs)
      const paramPattern = new RegExp(`\\b${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'g')
      const declarations = funcBody.match(new RegExp(`(const|let|var)\\s+${param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\s*[=:]`, 'g'))
      const usages = funcBody.match(paramPattern)
      
      // Si le paramètre n'apparaît qu'une fois (dans une déclaration) ou pas du tout
      if (!usages || (declarations && usages.length === declarations.length)) {
        // Trouver la ligne exacte du paramètre
        const paramIndex = paramsStr.indexOf(param)
        const paramLine = content.substring(0, funcStart + paramIndex).split('\n').length
        
        unused.push({
          file: filePath,
          line: paramLine,
          param,
          function: funcName,
        })
      }
    }
  }
  
  return unused
}

function main() {
  console.log('🔍 Recherche de TOUS les paramètres non utilisés...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allUnused: UnusedParam[] = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const unused = findUnusedParams(filePath)
    if (unused.length > 0) {
      allUnused.push(...unused)
    }
  }
  
  if (allUnused.length === 0) {
    console.log('✅ Aucun paramètre non utilisé détecté!')
    process.exit(0)
  } else {
    console.log(`❌ ${allUnused.length} paramètre(s) non utilisé(s) détecté(s):\n`)
    
    const byFile = new Map<string, UnusedParam[]>()
    for (const item of allUnused) {
      if (!byFile.has(item.file)) {
        byFile.set(item.file, [])
      }
      byFile.get(item.file)!.push(item)
    }
    
    for (const [file, items] of byFile.entries()) {
      console.log(`📄 ${file.replace(process.cwd() + '/', '')}:`)
      for (const item of items) {
        console.log(`   Ligne ${item.line}: '${item.param}' dans ${item.function}()`)
      }
      console.log()
    }
    
    console.log('❌ Corrigez ces erreurs avant de pousser.')
    process.exit(1)
  }
}

main()

