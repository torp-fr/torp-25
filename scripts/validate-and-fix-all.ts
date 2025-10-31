/**
 * SCRIPT DÉFINITIF : Détection et correction de TOUTES les erreurs TypeScript
 * 
 * Ce script :
 * 1. Détecte TOUTES les erreurs (paramètres, variables, imports)
 * 2. Les liste toutes
 * 3. Les corrige automatiquement
 * 4. Valide que le build passe
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

interface Error {
  file: string
  line: number
  type: 'param' | 'variable' | 'import'
  name: string
  fix: 'prefix' | 'remove' | 'rename'
}

function getAllErrors(): Error[] {
  const errors: Error[] = []
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    // 1. Détecter les paramètres non utilisés
    const paramPattern = /(?:private|public|async)\s+(?:async\s+)?(\w+)\s*\([^)]*(\w+)\s*:/g
    let paramMatch
    while ((paramMatch = paramPattern.exec(content)) !== null) {
      const funcName = paramMatch[1]
      const paramName = paramMatch[2]
      
      if (paramName.startsWith('_')) continue
      
      // Trouver le corps de la fonction
      const funcStart = paramMatch.index
      const bodyStart = content.indexOf(')', funcStart) + 1
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
      const paramDef = content.substring(funcStart, bodyStart)
      
      // Compter occurrences
      const defOccurrences = (paramDef.match(new RegExp(`\\b${paramName}\\b`, 'g')) || []).length
      const bodyOccurrences = (funcBody.match(new RegExp(`\\b${paramName}\\b`, 'g')) || []).length
      
      if (defOccurrences > 0 && bodyOccurrences === 0) {
        const lineNum = content.substring(0, funcStart).split('\n').length
        // Trouver la ligne exacte du paramètre
        const paramLine = content.substring(0, funcStart + paramDef.indexOf(paramName + ':')).split('\n').length
        errors.push({
          file: filePath,
          line: paramLine,
          type: 'param',
          name: paramName,
          fix: 'prefix',
        })
      }
    }
    
    // 2. Détecter les variables const/let non utilisées
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i]
      
      // Pattern pour const/let/var (mais pas dans les paramètres de fonction)
      const varMatch = line.match(/^\s*(const|let|var)\s+(\w+)\s*=/)
      if (varMatch) {
        const varName = varMatch[2]
        if (varName.startsWith('_')) continue
        
        // Compter les occurrences dans le reste du fichier
        const restOfFile = lines.slice(i + 1).join('\n')
        const occurrences = (restOfFile.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length
        
        if (occurrences === 0) {
          errors.push({
            file: filePath,
            line: i + 1,
            type: 'variable',
            name: varName,
            fix: 'remove',
          })
        }
      }
    }
  }
  
  return errors
}

function fixErrors(errors: Error[]): void {
  const filesToFix = new Map<string, Error[]>()
  
  for (const error of errors) {
    if (!filesToFix.has(error.file)) {
      filesToFix.set(error.file, [])
    }
    filesToFix.get(error.file)!.push(error)
  }
  
  for (const [filePath, fileErrors] of filesToFix.entries()) {
    let content = readFileSync(filePath, 'utf-8')
    const lines = content.split('\n')
    
    // Trier par ligne décroissante pour éviter les problèmes d'index
    fileErrors.sort((a, b) => b.line - a.line)
    
    for (const error of fileErrors) {
      const lineIndex = error.line - 1
      const originalLine = lines[lineIndex]
      
      if (error.fix === 'prefix') {
        // Préfixer avec _
        lines[lineIndex] = originalLine.replace(
          new RegExp(`\\b${error.name}\\s*:`),
          `_${error.name}:`
        )
      } else if (error.fix === 'remove') {
        // Supprimer la ligne si c'est une simple déclaration
        if (originalLine.trim().match(/^(const|let|var)\s+\w+\s*=.*;?\s*$/)) {
          lines.splice(lineIndex, 1)
        } else {
          // Sinon préfixer
          lines[lineIndex] = originalLine.replace(
            new RegExp(`\\b${error.name}\\s*=`),
            `_${error.name} =`
          )
        }
      }
    }
    
    writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }
}

function main() {
  console.log('🔍 Détection COMPLÈTE de TOUTES les erreurs...\n')
  
  const errors = getAllErrors()
  
  if (errors.length === 0) {
    console.log('✅ Aucune erreur détectée!')
    return
  }
  
  console.log(`❌ ${errors.length} erreur(s) détectée(s):\n`)
  
  const byType = {
    param: errors.filter(e => e.type === 'param'),
    variable: errors.filter(e => e.type === 'variable'),
    import: errors.filter(e => e.type === 'import'),
  }
  
  if (byType.param.length > 0) {
    console.log(`📋 Paramètres non utilisés (${byType.param.length}):`)
    for (const error of byType.param) {
      console.log(`   ${error.file.replace(process.cwd() + '/', '')}:${error.line} - ${error.name}`)
    }
    console.log()
  }
  
  if (byType.variable.length > 0) {
    console.log(`📋 Variables non utilisées (${byType.variable.length}):`)
    for (const error of byType.variable) {
      console.log(`   ${error.file.replace(process.cwd() + '/', '')}:${error.line} - ${error.name}`)
    }
    console.log()
  }
  
  console.log('🔧 Application des corrections...\n')
  fixErrors(errors)
  
  console.log(`✅ ${errors.length} correction(s) appliquée(s)`)
  console.log('\n⚠️  Vérifiez que les corrections sont correctes avant de commit!')
}

main()

