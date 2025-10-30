/**
 * OCR Service
 * Extract text from documents using Tesseract.js and pdf-parse
 */

import Tesseract from 'tesseract.js'
import pdfParse from 'pdf-parse'
import type { ExtractedData } from '@/types'

interface OCRResult {
  text: string
  confidence: number
}

export class OCRService {
  /**
   * Extract text from image using Tesseract.js
   */
  async extractTextFromImage(imageUrl: string): Promise<OCRResult> {
    try {
      const result = await Tesseract.recognize(imageUrl, 'fra', {
        logger: (m) => console.log(m),
      })

      return {
        text: result.data.text,
        confidence: result.data.confidence,
      }
    } catch (error) {
      console.error('OCR extraction failed:', error)
      throw new Error('Failed to extract text from image')
    }
  }

  /**
   * Extract text from PDF
   */
  async extractTextFromPDF(pdfUrl: string): Promise<OCRResult> {
    try {
      // TEMPORAIRE: Si c'est une URL mockée (mode développement sans S3)
      // On retourne des données de démo au lieu de fetcher
      if (pdfUrl.includes('/uploads/') || pdfUrl.includes('localhost')) {
        console.log('[OCR] Mode développement: utilisation de données démo')
        return {
          text: this.getDemoDevisText(),
          confidence: 95,
        }
      }

      // Fetch PDF file
      const response = await fetch(pdfUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`)
      }

      // Get PDF as ArrayBuffer
      const pdfBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(pdfBuffer)

      // Extract text using pdf-parse
      // @ts-ignore - pdf-parse types are not perfect
      const data = await pdfParse(buffer)

      // pdf-parse doesn't provide confidence, so we estimate based on text length
      const confidence = data.text.length > 100 ? 95 : data.text.length > 10 ? 70 : 30

      return {
        text: data.text,
        confidence,
      }
    } catch (error) {
      console.error('PDF extraction failed:', error)
      throw new Error('Failed to extract text from PDF')
    }
  }

  /**
   * Get demo devis text for development (when S3 is not configured)
   */
  private getDemoDevisText(): string {
    return `
DEVIS N° 2025-001

Entreprise: Constructions MARTIN & Fils
SIRET: 12345678900012
Adresse: 25 rue des Artisans, 75011 Paris
Tél: 01 42 85 96 74
Email: contact@martin-construction.fr

Client: M. Jean DUPONT
Adresse: 15 avenue de la République, 75011 Paris
Tél: 06 12 34 56 78

Projet: Rénovation complète cuisine
Date du devis: 15/01/2025
Validité: 60 jours

DÉTAIL DES TRAVAUX:

1. Dépose ancienne cuisine - Forfait - 850,00 €
2. Meubles bas L 320cm avec plan travail quartz - 1 ensemble - 8 500,00 €
3. Meubles hauts L 240cm - 1 ensemble - 3 200,00 €
4. Crédence carrelage métro blanc - 10 m² x 85,00 € - 850,00 €
5. Évier inox 2 bacs avec mitigeur - 1 unité - 420,00 €
6. Hotte aspirante 90cm inox - 1 unité - 650,00 €
7. Plaque induction 4 feux - 1 unité - 580,00 €
8. Four encastrable multifonctions - 1 unité - 720,00 €
9. Réfection électricité (prises, éclairage) - Forfait - 1 850,00 €
10. Plomberie (eau, évacuation) - Forfait - 1 250,00 €
11. Peinture murs et plafond - 18 m² x 32,00 € - 576,00 €
12. Pose parquet stratifié - 12 m² x 48,00 € - 576,00 €

TOTAL HT: 19 472,00 €
TVA 10%: 1 947,20 €
TOTAL TTC: 21 419,20 €

Acompte à la commande (30%): 6 425,76 €
Solde à la livraison: 14 993,44 €

Délai d'exécution: 4 semaines
Garantie décennale: Allianz Police n° 987654321
`
  }

  /**
   * Parse extracted text into structured data
   */
  async parseDevisData(text: string): Promise<Partial<ExtractedData>> {
    // This is a complex parsing logic that would use NLP and regex
    // to extract structured data from the raw text

    const extractedData: Partial<ExtractedData> = {
      company: this.extractCompanyInfo(text),
      client: this.extractClientInfo(text),
      project: this.extractProjectInfo(text),
      items: this.extractItems(text),
      totals: this.extractTotals(text),
      dates: this.extractDates(text),
    }

    return extractedData
  }

  /**
   * Extract company information
   */
  private extractCompanyInfo(text: string): any {
    // Use regex and NLP to extract company details
    const siretMatch = text.match(/SIRET[:\s]*(\d{14})/i)
    const emailMatch = text.match(/[a-zA-Z0-9._-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g)
    const phoneMatch = text.match(/(?:0|\+33)[1-9](?:[\s.-]?\d{2}){4}/g)
    const companyNameMatch = text.match(/Entreprise[:\s]+(.+)/i)
    const addressMatch = text.match(/Adresse[:\s]+(.+)/i)

    return {
      name: companyNameMatch ? companyNameMatch[1].trim() : 'Entreprise Inconnue',
      siret: siretMatch ? siretMatch[1] : undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      address: addressMatch ? addressMatch[1].trim() : '',
    }
  }

  /**
   * Extract client information
   */
  private extractClientInfo(text: string): any {
    const clientNameMatch = text.match(/Client[:\s]+(.+)/i)
    const lines = text.split('\n')
    const clientIndex = lines.findIndex(line => line.includes('Client'))

    return {
      name: clientNameMatch ? clientNameMatch[1].trim() : 'Client Inconnu',
      address: clientIndex >= 0 && lines[clientIndex + 1] ? lines[clientIndex + 1].replace('Adresse:', '').trim() : '',
      phone: text.match(/Tél[:\s]+(.+)/gi)?.[1]?.split(':')[1]?.trim() || '',
      email: '',
    }
  }

  /**
   * Extract project information
   */
  private extractProjectInfo(text: string): any {
    const projectMatch = text.match(/Projet[:\s]+(.+)/i)
    return {
      title: projectMatch ? projectMatch[1].trim() : 'Projet Non Spécifié',
      description: projectMatch ? projectMatch[1].trim() : '',
      location: '',
    }
  }

  /**
   * Extract line items
   */
  private extractItems(_text: string): any[] {
    // Parse line items with quantities, prices, etc.
    // This would use table detection and parsing
    return []
  }

  /**
   * Extract totals
   */
  private extractTotals(text: string): any {
    // Extract HT, TVA, TTC amounts with flexible regex
    const totalMatch = text.match(/TOTAL\s+TTC[:\s]*([\d\s,]+)/i)
    const tvaMatch = text.match(/TVA[:\s]*([\d\s,]+)/i)
    const htMatch = text.match(/TOTAL\s+HT[:\s]*([\d\s,]+)/i)

    const parseAmount = (str: string | undefined) => {
      if (!str) return 0
      // Remove spaces and replace comma with dot
      return parseFloat(str.replace(/\s/g, '').replace(',', '.'))
    }

    return {
      subtotal: htMatch ? parseAmount(htMatch[1]) : 0,
      tva: tvaMatch ? parseAmount(tvaMatch[1]) : 0,
      tvaRate: 0.1, // 10% for renovation
      total: totalMatch ? parseAmount(totalMatch[1]) : 0,
    }
  }

  /**
   * Extract dates
   */
  private extractDates(text: string): any {
    // Extract dates using regex
    const datePattern = /(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{2,4})/g
    const dates = text.match(datePattern)

    return {
      issueDate: dates && dates[0] ? new Date(dates[0]) : undefined,
      validUntil: dates && dates[1] ? new Date(dates[1]) : undefined,
      startDate: undefined,
      endDate: undefined,
    }
  }

  /**
   * Main OCR processing function
   */
  async processDocument(
    documentUrl: string,
    fileType: string
  ): Promise<Partial<ExtractedData>> {
    let ocrResult: OCRResult

    // Choose extraction method based on file type
    if (fileType === 'pdf') {
      ocrResult = await this.extractTextFromPDF(documentUrl)
    } else {
      ocrResult = await this.extractTextFromImage(documentUrl)
    }

    // Parse the extracted text into structured data
    const extractedData = await this.parseDevisData(ocrResult.text)

    return extractedData
  }
}

export const ocrService = new OCRService()
