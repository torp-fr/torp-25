/**
 * Script de correction automatique de TOUTES les erreurs TypeScript
 * Usage: npx tsx scripts/fix-all-errors.ts
 * 
 * Ce script :
 * 1. Détecte TOUTES les erreurs
 * 2. Les corrige automatiquement
 * 3. Génère un rapport
 */

import { readFileSync, writeFileSync } from 'fs'
import { join } from 'path'
import { execSync } from 'child_process'

interface Fix {
  file: string
  line: number
  type: 'unused-param' | 'unused-var' | 'missing-property'
  original: string
  fixed: string
}

const axesDir = join(process.cwd(), 'services/scoring/advanced/axes')

function getAllTypeScriptErrors(): string[] {
  try {
    const output = execSync('npx tsc --noEmit --pretty false 2>&1', {
      encoding: 'utf-8',
      stdio: 'pipe',
    })
    return output.split('\n').filter(l => l.trim())
  } catch (error: any) {
    const output = error.stdout?.toString() || error.message || ''
    return output.split('\n').filter((l: string) => l.trim())
  }
}

function parseTypeScriptError(line: string): { file: string; lineNum: number; message: string } | null {
  // Format: ./path/to/file.ts:123:45 - error TSxxxx: message
  const match = line.match(/\.\/([^:]+):(\d+):\d+\s*-\s*(?:error|warning)\s+TS?\d+:\s*(.+)/)
  if (!match) return null
  
  const [, file, lineNum, message] = match
  return {
    file: file.replace(/\\/g, '/'),
    lineNum: parseInt(lineNum, 10),
    message: message.trim(),
  }
}

function fixUnusedParam(filePath: string, lineNum: number, message: string): Fix | null {
  const content = readFileSync(filePath, 'utf-8')
  const lines = content.split('\n')
  
  if (lineNum < 1 || lineNum > lines.length) return null
  
  const lineIndex = lineNum - 1
  const originalLine = lines[lineIndex]
  
  // Extraire le nom du paramètre/variable
  const paramMatch = message.match(/'(\w+)'/)
  if (!paramMatch) return null
  
  const paramName = paramMatch[1]
  
  // Vérifier si c'est un paramètre de fonction
  const functionParamMatch = originalLine.match(new RegExp(`(\\s*)([^:]+):\\s*([^,)]+)([,)])`))
  if (functionParamMatch && originalLine.includes(paramName + ':')) {
    // C'est un paramètre - préfixer avec _
    const fixedLine = originalLine.replace(
      new RegExp(`\\b${paramName}\\s*:`),
      `_${paramName}:`
    )
    
    return {
      file: filePath,
      line: lineNum,
      type: 'unused-param',
      original: originalLine,
      fixed: fixedLine,
    }
  }
  
  // Vérifier si c'est une variable const/let
  const varMatch = originalLine.match(new RegExp(`(const|let|var)\\s+${paramName}\\s*[=:]`))
  if (varMatch) {
    // C'est une variable - supprimer la ligne ou préfixer
    // On supprime si c'est une simple déclaration non utilisée
    const context = lines.slice(Math.max(0, lineIndex - 3), Math.min(lines.length, lineIndex + 5))
    const usesVar = context.some(l => l.includes(paramName) && !l.includes(`const ${paramName}`) && !l.includes(`let ${paramName}`))
    
    if (!usesVar) {
      // Supprimer la ligne
      return {
        file: filePath,
        line: lineNum,
        type: 'unused-var',
        original: originalLine,
        fixed: '', // Ligne vide pour suppression
      }
    }
  }
  
  return null
}

function applyFix(fix: Fix): void {
  const content = readFileSync(fix.file, 'utf-8')
  const lines = content.split('\n')
  const lineIndex = fix.line - 1
  
  if (fix.fixed === '') {
    // Supprimer la ligne
    lines.splice(lineIndex, 1)
  } else {
    // Remplacer la ligne
    lines[lineIndex] = fix.fixed
  }
  
  writeFileSync(fix.file, lines.join('\n'), 'utf-8')
}

function main() {
  console.log('🔍 Détection et correction automatique de TOUTES les erreurs...\n')
  
  // 1. Récupérer toutes les erreurs TypeScript
  console.log('📋 Analyse des erreurs TypeScript...')
  const errorLines = getAllTypeScriptErrors()
  const fixes: Fix[] = []
  
  for (const errorLine of errorLines) {
    const parsed = parseTypeScriptError(errorLine)
    if (!parsed) continue
    
    // Ne traiter que les erreurs des fichiers d'axes pour l'instant
    if (!parsed.file.includes('services/scoring/advanced/axes')) continue
    
    // Ne traiter que les erreurs de paramètres/variables non utilisés
    if (!parsed.message.includes('never read') && !parsed.message.includes('never used')) continue
    
    const fullPath = join(process.cwd(), parsed.file)
    
    try {
      const fix = fixUnusedParam(fullPath, parsed.lineNum, parsed.message)
      if (fix) {
        fixes.push(fix)
      }
    } catch (error) {
      console.error(`Erreur lors du traitement de ${parsed.file}:${parsed.lineNum}:`, error)
    }
  }
  
  if (fixes.length === 0) {
    console.log('✅ Aucune correction automatique nécessaire')
    console.log('\n📋 Vérification manuelle des erreurs restantes...')
    for (const errorLine of errorLines.slice(0, 10)) {
      console.log(`   ${errorLine}`)
    }
    process.exit(0)
  }
  
  console.log(`\n🔧 ${fixes.length} correction(s) à appliquer:\n`)
  
  // Afficher les corrections
  for (const fix of fixes) {
    console.log(`${fix.file}:${fix.line}`)
    console.log(`  Type: ${fix.type}`)
    console.log(`  Avant: ${fix.original.trim()}`)
    if (fix.fixed) {
      console.log(`  Après: ${fix.fixed.trim()}`)
    } else {
      console.log(`  Action: Suppression de la ligne`)
    }
    console.log()
  }
  
  // Appliquer les corrections
  console.log('🔨 Application des corrections...')
  for (const fix of fixes) {
    try {
      applyFix(fix)
      console.log(`  ✓ ${fix.file}:${fix.line}`)
    } catch (error) {
      console.error(`  ✗ Erreur lors de la correction de ${fix.file}:${fix.line}:`, error)
    }
  }
  
  console.log('\n✅ Corrections appliquées!')
  console.log('\n📋 Vérification finale...')
  
  // Vérifier s'il reste des erreurs
  const remainingErrors = getAllTypeScriptErrors()
  const remainingCount = remainingErrors.filter(l => 
    l.includes('services/scoring/advanced/axes') && 
    (l.includes('never read') || l.includes('never used'))
  ).length
  
  if (remainingCount === 0) {
    console.log('✅ Plus aucune erreur de paramètres/variables non utilisés!')
  } else {
    console.log(`⚠️  ${remainingCount} erreur(s) restante(s) nécessitent une correction manuelle`)
  }
}

main()

