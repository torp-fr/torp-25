/**
 * SCRIPT DE VALIDATION COMPLÈTE AVANT PUSH
 * Détecte TOUTES les erreurs TypeScript avant de pousser
 */

import { execSync } from 'child_process'
import { readFileSync, readdirSync } from 'fs'
import { join } from 'path'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

interface Error {
  file: string
  line: number
  message: string
}

function checkUnusedParameters(filePath: string): Error[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors: Error[] = []
  
  // Trouver toutes les fonctions avec paramètres
  const funcPattern = /^\s*(private|public|async)?\s*(async\s+)?(\w+)\s*\(([^)]+)\)/gm
  
  let match
  while ((match = funcPattern.exec(content)) !== null) {
    const funcStart = match.index
    const funcLine = content.substring(0, funcStart).split('\n').length
    const paramsStr = match[4]
    
    // Extraire les paramètres
    const params = paramsStr.split(',').map(p => {
      const parts = p.trim().split(':')
      return parts[0].trim()
    })
    
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
    
    const funcBody = content.substring(bodyStart + 1, bodyEnd)
    
    // Vérifier chaque paramètre
    for (const param of params) {
      if (param.startsWith('_')) continue // Déjà marqué comme non utilisé
      
      // Chercher si utilisé dans le corps (échapper les caractères spéciaux)
      const escapedParam = param.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const usedWithPrefix = new RegExp(`\\b_${escapedParam}\\b`).test(funcBody)
      const usedWithoutPrefix = new RegExp(`\\b${escapedParam}\\b`).test(funcBody)
      
      if (!usedWithPrefix && !usedWithoutPrefix) {
        // Trouver la ligne exacte du paramètre
        const paramLine = content.substring(0, funcStart + paramsStr.indexOf(param)).split('\n').length
        errors.push({
          file: filePath,
          line: paramLine,
          message: `Paramètre '${param}' déclaré mais jamais utilisé`,
        })
      } else if (param.startsWith('_') && usedWithoutPrefix && !usedWithPrefix) {
        // Paramètre préfixé mais utilisé sans préfixe
        const paramLine = content.substring(0, funcStart + paramsStr.indexOf(param)).split('\n').length
        errors.push({
          file: filePath,
          line: paramLine,
          message: `Paramètre '_${param.replace(/^_/, '')}' déclaré mais utilisé comme '${param.replace(/^_/, '')}'`,
        })
      }
    }
  }
  
  return errors
}

function checkUnusedVariables(filePath: string): Error[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const errors: Error[] = []
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    const varMatch = line.match(/^\s*(const|let|var)\s+(\w+)\s*=/)
    
    if (varMatch) {
      const varName = varMatch[2]
      if (varName.startsWith('_')) continue
      
      // Vérifier si utilisé dans le reste du fichier
      const restOfFile = lines.slice(i + 1).join('\n')
      // Ignorer commentaires et strings
      const codeOnly = restOfFile
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"[^"]*"/g, '')
        .replace(/'[^']*'/g, '')
      
      const escapedVarName = varName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const occurrences = (codeOnly.match(new RegExp(`\\b${escapedVarName}\\b`, 'g')) || []).length
      
      if (occurrences === 0) {
        errors.push({
          file: filePath,
          line: i + 1,
          message: `Variable '${varName}' déclarée mais jamais utilisée`,
        })
      }
    }
  }
  
  return errors
}

function main() {
  console.log('🔍 Validation complète avant push...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allErrors: Error[] = []
  
  // 1. Vérifier paramètres non utilisés
  console.log('1️⃣  Vérification paramètres non utilisés...')
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const errors = checkUnusedParameters(filePath)
    allErrors.push(...errors)
  }
  
  // 2. Vérifier variables non utilisées
  console.log('2️⃣  Vérification variables non utilisées...')
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const errors = checkUnusedVariables(filePath)
    allErrors.push(...errors)
  }
  
  if (allErrors.length === 0) {
    console.log('\n✅ Aucune erreur détectée! Vous pouvez pusher en toute sécurité.')
    process.exit(0)
  } else {
    console.log(`\n❌ ${allErrors.length} erreur(s) détectée(s):\n`)
    
    const byFile = new Map<string, Error[]>()
    for (const error of allErrors) {
      if (!byFile.has(error.file)) {
        byFile.set(error.file, [])
      }
      byFile.get(error.file)!.push(error)
    }
    
    for (const [file, errors] of byFile.entries()) {
      console.log(`📄 ${file.replace(process.cwd() + '/', '')}:`)
      for (const error of errors) {
        console.log(`   Ligne ${error.line}: ${error.message}`)
      }
      console.log()
    }
    
    console.log('❌ Ne poussez PAS ! Corrigez ces erreurs d\'abord.')
    process.exit(1)
  }
}

main()

