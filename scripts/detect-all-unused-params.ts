import { loggers } from '@/lib/logger'
const log = loggers.enrichment

/**
 * Script de détection systématique de TOUS les paramètres non utilisés
 * À exécuter avant chaque push pour éviter les erreurs Vercel
 */

import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

interface Error {
  file: string
  line: number
  param: string
  type: 'parameter' | 'variable'
}

function detectUnusedParameters(filePath: string): Error[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors: Error[] = []
  
  // Pattern pour trouver les déclarations de fonction
  const funcPattern = /^\s*(private|public|async)?\s*(async\s+)?(\w+)\s*\(([^)]+)\)/gm
  
  let match
  while ((match = funcPattern.exec(content)) !== null) {
    const funcStart = match.index
    const funcLine = content.substring(0, funcStart).split('\n').length
    const paramsStr = match[4]
    
    // Extraire les paramètres (gérer les types et valeurs par défaut)
    const params = paramsStr.split(',').map(p => {
      const trimmed = p.trim()
      // Extraire le nom du paramètre (avant :)
      const nameMatch = trimmed.match(/^[_a-zA-Z][_a-zA-Z0-9]*/)
      return nameMatch ? nameMatch[0] : null
    }).filter((p): p is string => p !== null && !p.startsWith('_'))
    
    // Trouver le corps de la fonction
    let braceCount = 0
    let bodyStart = content.indexOf('{', funcStart)
    let bodyEnd = bodyStart
    
    if (bodyStart === -1) continue
    
    for (let i = bodyStart; i < content.length; i++) {
      if (content[i] === '{') braceCount++
      if (content[i] === '}') {
        braceCount--
        if (braceCount === 0) {
          bodyEnd = i
          break
        }
      }
    }
    
    if (bodyEnd === bodyStart) continue
    
    const funcBody = content.substring(bodyStart + 1, bodyEnd)
    
      // Vérifier chaque paramètre
    for (const param of params) {
      // Échapper les caractères spéciaux pour la regex
      const escapedParam = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Chercher si utilisé (avec ou sans préfixe _)
      // IMPORTANT: Ne compte que les utilisations réelles, pas les déclarations
      const usedWithPrefix = new RegExp(`\\b_${escapedParam}\\b`).test(funcBody)
      
      // Chercher utilisation sans préfixe (mais pas dans une déclaration)
      const declarationPattern = new RegExp(`(const|let|var|function|async|private|public)\\s+${escapedParam}\\b`)
      const usagePattern = new RegExp(`\\b${escapedParam}\\b(?!\\s*[:=])`) // Pas suivi de : ou =
      
      // Vérifier si utilisé dans une condition, assignation, ou appel de fonction
      const usedInCondition = new RegExp(`(if|while|for|switch|catch)\\s*\\([^)]*\\b${escapedParam}\\b`).test(funcBody)
      const usedInExpression = new RegExp(`\\b${escapedParam}\\b\\s*([.=]|\\[|\\()|\\b${escapedParam}\\.|\\[${escapedParam}\\]`).test(funcBody)
      const usedInReturn = new RegExp(`return[^;]*\\b${escapedParam}\\b`).test(funcBody)
      const usedWithoutPrefix = (usagePattern.test(funcBody) || usedInCondition || usedInExpression || usedInReturn) && !declarationPattern.test(funcBody)
      
      // Si pas utilisé, trouver la ligne exacte
      if (!usedWithPrefix && !usedWithoutPrefix) {
        // Trouver la ligne du paramètre dans la signature
        const paramIndex = paramsStr.indexOf(param)
        if (paramIndex !== -1) {
          const lineBeforeParam = content.substring(0, funcStart + paramIndex).split('\n').length
          errors.push({
            file: filePath,
            line: lineBeforeParam,
            param,
            type: 'parameter',
          })
        }
      }
    }
  }
  
  // Détecter aussi les variables déclarées mais non utilisées
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    // Pattern pour const/let/var sans _ au début
    const varMatch = line.match(/^\s*(const|let|var)\s+([a-zA-Z][_a-zA-Z0-9]*)\s*=/)
    
    if (varMatch && !varMatch[2].startsWith('_')) {
      const varName = varMatch[2]
      const restOfFile = lines.slice(i + 1).join('\n')
      
      // Échapper pour regex
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      
      // Vérifier si utilisé (mais pas dans les conditions if/while qui utilisent la valeur)
      // Pour simplifier, on cherche juste le nom
      const occurrences = (restOfFile.match(new RegExp(`\\b${escapedVarName}\\b`, 'g')) || []).length
      
      // Ignorer si utilisé dans un if juste après (peut être utilisé indirectement)
      const nextLines = lines.slice(i + 1, Math.min(i + 5, lines.length)).join('\n')
      const usedInCondition = new RegExp(`if\\s*\\([^)]*\\b${escapedVarName}\\b`).test(nextLines) ||
                               new RegExp(`\\b${escapedVarName}\\s*[!=<>]`).test(nextLines)
      
      // Vérifier aussi si utilisé dans une expression plus complexe
      const usedInExpression = new RegExp(`\\b${escapedVarName}\\b\\s*([.=]|\\[|\\()|\\b${escapedVarName}\\.|\\[${escapedVarName}\\]`).test(restOfFile)
      const usedInReturn = new RegExp(`return[^;]*\\b${escapedVarName}\\b`).test(restOfFile)
      const usedInTemplate = new RegExp(`\$\{[^}]*\\b${escapedVarName}\\b`).test(restOfFile)
      
      if (occurrences === 0 && !usedInCondition && !usedInExpression && !usedInReturn && !usedInTemplate) {
        errors.push({
          file: filePath,
          line: i + 1,
          param: varName,
          type: 'variable',
        })
      }
    }
  }
  
  return errors
}

function main() {
  log.info('🔍 Détection systématique de paramètres/variables non utilisés...\n')
  
  const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  
  const allErrors: Error[] = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const errors = detectUnusedParameters(filePath)
    if (errors.length > 0) {
      allErrors.push(...errors)
    }
  }
  
  if (allErrors.length === 0) {
    log.info('✅ Aucune erreur détectée! Vous pouvez pusher en toute sécurité.')
    process.exit(0)
  } else {
    log.info(`❌ ${allErrors.length} erreur(s) détectée(s):\n`)
    
    const byFile = new Map<string, Error[]>()
    for (const error of allErrors) {
      if (!byFile.has(error.file)) {
        byFile.set(error.file, [])
      }
      byFile.get(error.file)!.push(error)
    }
    
    for (const [file, errors] of byFile.entries()) {
      log.info(`📄 ${file.replace(process.cwd() + '/', '')}:`)
      for (const error of errors) {
        log.info(`   Ligne ${error.line}: ${error.type === 'parameter' ? 'Paramètre' : 'Variable'} '${error.param}' déclaré mais jamais utilisé`)
      }
      log.info()
    }
    
    log.info('❌ Ne poussez PAS ! Corrigez ces erreurs d\'abord.')
    log.info('\n💡 Astuce: Préfixez les paramètres non utilisés avec _ (ex: _devis, _context)')
    process.exit(1)
  }
}

main()

