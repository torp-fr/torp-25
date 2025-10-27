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
      // Fetch PDF file
      const response = await fetch(pdfUrl)
      if (!response.ok) {
        throw new Error(`Failed to fetch PDF: ${response.statusText}`)
      }

      // Get PDF as ArrayBuffer
      const pdfBuffer = await response.arrayBuffer()
      const buffer = Buffer.from(pdfBuffer)

      // Extract text using pdf-parse
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

    return {
      name: '', // Extract from first lines
      siret: siretMatch ? siretMatch[1] : undefined,
      email: emailMatch ? emailMatch[0] : undefined,
      phone: phoneMatch ? phoneMatch[0] : undefined,
      address: '', // Extract address
    }
  }

  /**
   * Extract client information
   */
  private extractClientInfo(_text: string): any {
    // Similar extraction logic for client
    return {
      name: '',
      address: '',
      phone: '',
      email: '',
    }
  }

  /**
   * Extract project information
   */
  private extractProjectInfo(_text: string): any {
    return {
      title: '',
      description: '',
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
    // Extract HT, TVA, TTC amounts
    const totalMatch = text.match(/Total\s+TTC[:\s]*(\d+(?:[.,]\d{2})?)/i)
    const tvaMatch = text.match(/TVA[:\s]*(\d+(?:[.,]\d{2})?)/i)
    const htMatch = text.match(/Total\s+HT[:\s]*(\d+(?:[.,]\d{2})?)/i)

    return {
      subtotal: htMatch ? parseFloat(htMatch[1].replace(',', '.')) : 0,
      tva: tvaMatch ? parseFloat(tvaMatch[1].replace(',', '.')) : 0,
      tvaRate: 0.2, // Default 20%
      total: totalMatch ? parseFloat(totalMatch[1].replace(',', '.')) : 0,
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
