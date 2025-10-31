/**
 * Script de détection et correction de TOUTES les variables non utilisées
 * dans tous les fichiers d'axes
 */

import { readFileSync, writeFileSync, readdirSync } from 'fs'
import { join } from 'path'

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

interface Issue {
  file: string
  line: number
  variable: string
  type: 'const' | 'let' | 'var'
}

function findUnusedVariables(filePath: string): Issue[] {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  const issues: Issue[] = []
  
  // Pattern pour trouver les déclarations de variables
  const varPattern = /(const|let|var)\s+(\w+)\s*=/g
  let match
  
  while ((match = varPattern.exec(content)) !== null) {
    const varType = match[1] as 'const' | 'let' | 'var'
    const varName = match[2]
    const lineNum = content.substring(0, match.index).split('\n').length
    
    // Ignorer les variables qui commencent par _
    if (varName.startsWith('_')) continue
    
    // Trouver toutes les occurrences de cette variable dans le fichier
    const allOccurrences = [...content.matchAll(new RegExp(`\\b${varName}\\b`, 'g'))]
    
    // Compter les occurrences (déclaration + utilisations)
    // Si seulement 1 occurrence = jamais utilisé
    if (allOccurrences.length === 1) {
      issues.push({
        file: filePath,
        line: lineNum,
        variable: varName,
        type: varType,
      })
    }
  }
  
  return issues
}

function fixFile(filePath: string, issues: Issue[]): boolean {
  if (issues.length === 0) return false
  
  let content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  let modified = false
  
  // Trier par numéro de ligne décroissant pour éviter les problèmes d'index
  issues.sort((a, b) => b.line - a.line)
  
  for (const issue of issues) {
    const lineIndex = issue.line - 1
    const originalLine = lines[lineIndex]
    
    // Si c'est une déclaration de variable seule sur la ligne, la supprimer
    if (originalLine.trim().match(/^(const|let|var)\s+\w+\s*=\s*[^;]+;?\s*$/)) {
      lines.splice(lineIndex, 1)
      modified = true
    } else {
      // Sinon, préfixer avec _
      const prefixedName = `_${issue.variable}`
      lines[lineIndex] = originalLine.replace(
        new RegExp(`\\b${issue.variable}\\s*=`, 'g'),
        `${prefixedName} =`
      )
      modified = true
    }
  }
  
  if (modified) {
    writeFileSync(filePath, lines.join('\n'), 'utf-8')
  }
  
  return modified
}

function main() {
  console.log('🔍 Détection de TOUTES les variables non utilisées...\n')
  
  const axesFiles = readdirSync(axesDir).filter(f => f.endsWith('.ts'))
  const allIssues: Issue[] = []
  const filesToFix: Array<{ file: string; issues: Issue[] }> = []
  
  for (const file of axesFiles) {
    const filePath = join(axesDir, file)
    const issues = findUnusedVariables(filePath)
    
    if (issues.length > 0) {
      console.log(`📄 ${file}: ${issues.length} variable(s) non utilisée(s)`)
      for (const issue of issues) {
        console.log(`   - ${issue.variable} (ligne ${issue.line}, type: ${issue.type})`)
      }
      console.log()
      
      filesToFix.push({ file: filePath, issues })
      allIssues.push(...issues)
    }
  }
  
  if (allIssues.length === 0) {
    console.log('✅ Aucune variable non utilisée détectée!')
    process.exit(0)
  }
  
  console.log(`\n🔧 Correction de ${allIssues.length} variable(s)...\n`)
  
  let fixedCount = 0
  for (const { file, issues } of filesToFix) {
    if (fixFile(file, issues)) {
      fixedCount++
      console.log(`  ✓ ${file.replace(process.cwd() + '/', '')}`)
    }
  }
  
  console.log(`\n✅ ${fixedCount} fichier(s) corrigé(s)`)
}

main()

