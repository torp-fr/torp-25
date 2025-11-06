import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'

export const dynamic = 'force-dynamic'
export const maxDuration = 300 // 5 minutes max

/**
 * POST /api/admin/import-dpe-sql
 * Upload et import d'un fichier SQL DPE dans Railway
 */
export async function POST(request: NextRequest) {
  try {
    console.log('[Import DPE SQL] 🚀 Démarrage import...')

    const formData = await request.formData()
    const file = formData.get('file') as File

    if (!file) {
      return NextResponse.json({ error: 'Fichier SQL requis' }, { status: 400 })
    }

    console.log('[Import DPE SQL] 📄 Fichier reçu:', {
      name: file.name,
      size: file.size,
      type: file.type,
    })

    // Lire le contenu du fichier
    const content = await file.text()
    const lines = content.split('\n')

    console.log('[Import DPE SQL] 📊 Analyse:', {
      totalLines: lines.length,
      sampleFirstLines: lines.slice(0, 10).join('\n'),
    })

    // Analyser la structure
    const createTableMatch = content.match(/CREATE TABLE\s+(\w+)/i)
    const tableName = createTableMatch ? createTableMatch[1] : null

    console.log('[Import DPE SQL] 🔍 Table détectée:', tableName)

    // Si c'est un fichier CREATE TABLE + INSERT
    if (tableName) {
      console.log('[Import DPE SQL] 📝 Exécution du SQL directement...')

      let processed = 0
      let errors = 0

      // Exécuter le SQL directement via Prisma
      try {
        // Note: En production, il faudrait parser et valider le SQL
        // Pour l'instant, on exécute directement
        await prisma.$executeRawUnsafe(content)
        processed = lines.length

        console.log('[Import DPE SQL] ✅ Import réussi')
      } catch (error: any) {
        console.error('[Import DPE SQL] ❌ Erreur SQL:', error)
        errors++

        return NextResponse.json({
          error: 'Erreur lors de l\'exécution SQL',
          details: error.message,
          sqlPreview: content.substring(0, 500),
        }, { status: 500 })
      }

      return NextResponse.json({
        success: true,
        tableName,
        stats: {
          totalLines: lines.length,
          processed,
          errors,
        },
        message: `Table ${tableName} créée et données importées avec succès`,
      })
    }

    // Si c'est juste des INSERT
    const insertMatches = content.match(/INSERT INTO\s+(\w+)/gi)
    if (insertMatches && insertMatches.length > 0) {
      const tableFromInsert = insertMatches[0].match(/INSERT INTO\s+(\w+)/i)?.[1]

      console.log('[Import DPE SQL] 📝 INSERTs détectés pour table:', tableFromInsert)
      console.log('[Import DPE SQL] 📊 Nombre d\'INSERT statements:', insertMatches.length)

      // Exécuter les INSERT en chunks
      try {
        await prisma.$executeRawUnsafe(content)

        return NextResponse.json({
          success: true,
          tableName: tableFromInsert,
          stats: {
            totalLines: lines.length,
            insertStatements: insertMatches.length,
          },
          message: `Données importées dans ${tableFromInsert}`,
        })
      } catch (error: any) {
        console.error('[Import DPE SQL] ❌ Erreur INSERT:', error)

        return NextResponse.json({
          error: 'Erreur lors de l\'exécution des INSERT',
          details: error.message,
          sqlPreview: content.substring(0, 500),
        }, { status: 500 })
      }
    }

    return NextResponse.json({
      error: 'Format SQL non reconnu',
      info: 'Le fichier doit contenir CREATE TABLE ou INSERT INTO',
      preview: lines.slice(0, 20).join('\n'),
    }, { status: 400 })

  } catch (error) {
    console.error('[Import DPE SQL] ❌ Erreur:', error)
    return NextResponse.json(
      {
        error: 'Erreur lors de l\'import SQL',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    )
  }
}

/**
 * GET /api/admin/import-dpe-sql
 * Affiche un formulaire d'upload simple
 */
export async function GET() {
  const html = `
<!DOCTYPE html>
<html>
<head>
  <title>Import DPE SQL</title>
  <style>
    body { font-family: system-ui; max-width: 800px; margin: 50px auto; padding: 20px; }
    .container { background: #f5f5f5; padding: 30px; border-radius: 8px; }
    h1 { color: #333; }
    input[type="file"] { margin: 20px 0; }
    button {
      background: #0070f3;
      color: white;
      border: none;
      padding: 12px 24px;
      border-radius: 6px;
      cursor: pointer;
      font-size: 16px;
    }
    button:hover { background: #0051cc; }
    button:disabled { background: #ccc; cursor: not-allowed; }
    .result { margin-top: 20px; padding: 15px; border-radius: 6px; }
    .success { background: #d4edda; color: #155724; }
    .error { background: #f8d7da; color: #721c24; }
    .loading { color: #666; }
    pre { background: #fff; padding: 10px; border-radius: 4px; overflow-x: auto; }
  </style>
</head>
<body>
  <div class="container">
    <h1>📊 Import DPE SQL</h1>
    <p>Upload le fichier <code>dpe_logement_202103.sql</code></p>

    <form id="uploadForm">
      <input type="file" id="sqlFile" accept=".sql" required>
      <br>
      <button type="submit">Importer</button>
    </form>

    <div id="result"></div>
  </div>

  <script>
    const form = document.getElementById('uploadForm');
    const resultDiv = document.getElementById('result');

    form.addEventListener('submit', async (e) => {
      e.preventDefault();

      const fileInput = document.getElementById('sqlFile');
      const file = fileInput.files[0];

      if (!file) {
        alert('Sélectionne un fichier SQL');
        return;
      }

      const formData = new FormData();
      formData.append('file', file);

      resultDiv.innerHTML = '<div class="loading">⏳ Import en cours... (peut prendre plusieurs minutes)</div>';

      try {
        const response = await fetch('/api/admin/import-dpe-sql', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (response.ok) {
          resultDiv.innerHTML = \`
            <div class="result success">
              <h3>✅ Import réussi!</h3>
              <p><strong>Table:</strong> \${data.tableName}</p>
              <p><strong>Lignes traitées:</strong> \${data.stats.totalLines || data.stats.processed}</p>
              <p>\${data.message}</p>
            </div>
          \`;
        } else {
          resultDiv.innerHTML = \`
            <div class="result error">
              <h3>❌ Erreur</h3>
              <p>\${data.error}</p>
              <p>\${data.details || ''}</p>
              \${data.preview ? '<pre>' + data.preview + '</pre>' : ''}
            </div>
          \`;
        }
      } catch (error) {
        resultDiv.innerHTML = \`
          <div class="result error">
            <h3>❌ Erreur réseau</h3>
            <p>\${error.message}</p>
          </div>
        \`;
      }
    });
  </script>
</body>
</html>
  `

  return new Response(html, {
    headers: { 'Content-Type': 'text/html' },
  })
}
