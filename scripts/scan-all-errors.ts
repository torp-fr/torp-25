/**
 * Script pour scanner TOUS les fichiers TypeScript et détecter TOUTES les erreurs
 * Simule le processus de build Next.js
 */

import { readFileSync, readdirSync, statSync } from 'fs'
import { join } from 'path'

interface ErrorInfo {
  file: string
  line: number
  column: number
  variable: string
  type: 'variable' | 'parameter' | 'import'
}

function getAllTsFiles(dir: string, excludeDirs: string[] = []): string[] {
  const files: string[] = []
  
  try {
    const entries = readdirSync(dir)
    
    for (const entry of entries) {
      const fullPath = join(dir, entry)
      
      // Ignorer les dossiers exclus
      if (excludeDirs.some(excluded => fullPath.includes(excluded))) {
        continue
      }
      
      const stat = statSync(fullPath)
      
      if (stat.isDirectory()) {
        // Récursivement scanner les sous-dossiers
        files.push(...getAllTsFiles(fullPath, excludeDirs))
      } else if (entry.endsWith('.ts') || entry.endsWith('.tsx')) {
        // Ignorer les fichiers de définition .d.ts
        if (!entry.endsWith('.d.ts')) {
          files.push(fullPath)
        }
      }
    }
  } catch (error) {
    // Ignorer les erreurs de permission
  }
  
  return files
}

function findUnusedVariables(content: string, filePath: string): ErrorInfo[] {
  const errors: ErrorInfo[] = []
  const lines = content.split('\n')
  
  // Pattern pour les déclarations const/let/var
  const varPattern = /(const|let|var)\s+(\w+)\s*=/g
  
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i]
    let match
    
    while ((match = varPattern.exec(line)) !== null) {
      const varName = match[2]
      
      // Ignorer les variables préfixées par _
      if (varName.startsWith('_')) continue
      
      // Trouver toutes les occurrences de cette variable APRÈS la déclaration
      const codeAfterDeclaration = lines.slice(i + 1).join('\n')
      
      // Ignorer les commentaires et strings pour compter uniquement les utilisations réelles
      const cleanCode = codeAfterDeclaration
        .replace(/\/\/.*$/gm, '') // Commentaires ligne
        .replace(/\/\*[\s\S]*?\*\//g, '') // Commentaires bloc
        .replace(/"[^"]*"/g, '') // Strings doubles
        .replace(/'[^']*'/g, '') // Strings simples
        .replace(/`[^`]*`/g, '') // Template strings
      
      const occurrences = (cleanCode.match(new RegExp(`\\b${varName}\\b`, 'g')) || []).length
      
      if (occurrences === 0) {
        const column = match.index! + 1
        errors.push({
          file: filePath,
          line: i + 1,
          column,
          variable: varName,
          type: 'variable',
        })
      }
    }
  }
  
  return errors
}

function findUnusedParameters(content: string, filePath: string): ErrorInfo[] {
  const errors: ErrorInfo[] = []
  const lines = content.split('\n')
  
  // Pattern pour les paramètres de fonction
  const funcPattern = /(?:^|\s)(?:private|public|async|static)?\s*(?:async\s+)?(\w+)\s*\([^)]*\)/gm
  let funcMatch
  
  while ((funcMatch = funcPattern.exec(content)) !== null) {
    const funcStart = funcMatch.index
    const funcLineNum = content.substring(0, funcStart).split('\n').length
    
    // Trouver la signature complète de la fonction
    let bracePos = content.indexOf(')', funcStart) + 1
    let braceCount = 0
    let bodyStart = bracePos
    let bodyEnd = bodyStart
    
    // Trouver le début du corps de la fonction
    while (bodyStart < content.length && (content[bodyStart] === ' ' || content[bodyStart] === '\n')) {
      bodyStart++
    }
    
    if (content[bodyStart] === '{') {
      braceCount = 1
      bodyEnd = bodyStart + 1
      
      while (bodyEnd < content.length && braceCount > 0) {
        if (content[bodyEnd] === '{') braceCount++
        if (content[bodyEnd] === '}') braceCount--
        bodyEnd++
      }
    }
    
    // Extraire les paramètres
    const signature = content.substring(funcStart, bracePos)
    const paramMatches = signature.matchAll(/(\w+)\s*:/g)
    
    for (const paramMatch of paramMatches) {
      const paramName = paramMatch[1]
      
      // Ignorer les paramètres préfixés par _
      if (paramName.startsWith('_')) continue
      
      // Vérifier si le paramètre est utilisé dans le corps de la fonction
      const funcBody = content.substring(bodyStart, bodyEnd)
      const cleanBody = funcBody
        .replace(/\/\/.*$/gm, '')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/"[^"]*"/g, '')
        .replace(/'[^']*'/g, '')
      
      // Exclure la déclaration du paramètre lui-même
      const occurrences = (cleanBody.match(new RegExp(`\\b${paramName}\\b`, 'g')) || []).length
      
      if (occurrences === 0) {
        const paramLineNum = content.substring(0, funcStart + paramMatch.index!).split('\n').length
        errors.push({
          file: filePath,
          line: paramLineNum,
          column: 1,
          variable: paramName,
          type: 'parameter',
        })
      }
    }
  }
  
  return errors
}

function main() {
  console.log('🔍 Scanner TOUS les fichiers TypeScript du projet...\n')
  
  const projectRoot = process.cwd()
  const excludeDirs = [
    'node_modules',
    '.next',
    '.git',
    'scripts',
    'dist',
    'build',
  ]
  
  const allFiles = getAllTsFiles(projectRoot, excludeDirs)
  console.log(`📁 ${allFiles.length} fichier(s) TypeScript trouvé(s)\n`)
  
  const allErrors: ErrorInfo[] = []
  
  for (const file of allFiles) {
    try {
      const content = readFileSync(file, 'utf-8')
      
      // Vérifier les variables non utilisées
      const varErrors = findUnusedVariables(content, file)
      
      // Vérifier les paramètres non utilisés
      const paramErrors = findUnusedParameters(content, file)
      
      const fileErrors = [...varErrors, ...paramErrors]
      
      if (fileErrors.length > 0) {
        allErrors.push(...fileErrors)
        console.log(`❌ ${file.replace(projectRoot + '/', '')}:`)
        for (const error of fileErrors) {
          console.log(`   Ligne ${error.line}:${error.column} - ${error.variable} (${error.type})`)
        }
        console.log()
      }
    } catch (error) {
      console.error(`⚠️  Erreur lors de la lecture de ${file}:`, error)
    }
  }
  
  if (allErrors.length === 0) {
    console.log('✅ Aucune erreur détectée!')
    process.exit(0)
  }
  
  console.log(`\n❌ Total: ${allErrors.length} erreur(s) détectée(s)\n`)
  
  // Grouper par fichier
  const errorsByFile = new Map<string, ErrorInfo[]>()
  for (const error of allErrors) {
    if (!errorsByFile.has(error.file)) {
      errorsByFile.set(error.file, [])
    }
    errorsByFile.get(error.file)!.push(error)
  }
  
  console.log('📋 Résumé par fichier:')
  for (const [file, errors] of errorsByFile.entries()) {
    console.log(`   ${file.replace(projectRoot + '/', '')}: ${errors.length} erreur(s)`)
  }
  
  process.exit(1)
}

main()

