/**
 * Validation schemas for Devis (Quote) data
 * Using Zod for type-safe runtime validation
 */

import { z } from 'zod'

// Company info validation
export const companyInfoSchema = z.object({
  name: z.string().min(1, 'Company name is required'),
  siret: z.string().length(14, 'SIRET must be 14 digits').optional(),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

// Client info validation
export const clientInfoSchema = z.object({
  name: z.string().min(1, 'Client name is required'),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email().optional(),
})

// Project info validation
export const projectInfoSchema = z.object({
  title: z.string().min(1, 'Project title is required'),
  description: z.string().optional(),
  location: z.string().optional(),
})

// Devis item validation
export const devisItemSchema = z.object({
  description: z.string().min(1, 'Description is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string(),
  unitPrice: z.number().nonnegative('Unit price must be non-negative'),
  totalPrice: z.number().nonnegative('Total price must be non-negative'),
  category: z.string().optional(),
})

// Devis totals validation
export const devisTotalsSchema = z.object({
  subtotal: z.number().nonnegative('Subtotal must be non-negative'),
  tva: z.number().nonnegative('TVA must be non-negative'),
  tvaRate: z.number().min(0).max(1, 'TVA rate must be between 0 and 1'),
  total: z.number().positive('Total must be positive'),
  deposit: z.number().nonnegative('Deposit must be non-negative').optional(),
})

// Devis dates validation
export const devisDatesSchema = z.object({
  issueDate: z.coerce.date().optional(),
  validUntil: z.coerce.date().optional(),
  startDate: z.coerce.date().optional(),
  endDate: z.coerce.date().optional(),
})

// Full extracted data validation
export const extractedDataSchema = z.object({
  company: companyInfoSchema,
  client: clientInfoSchema,
  project: projectInfoSchema,
  items: z.array(devisItemSchema).min(1, 'At least one item is required'),
  totals: devisTotalsSchema,
  dates: devisDatesSchema,
})

// Devis creation validation
export const createDevisSchema = z.object({
  documentId: z.string().uuid(),
  extractedData: extractedDataSchema,
  projectType: z.enum(['renovation', 'construction', 'extension']).optional(),
  tradeType: z
    .enum([
      'plomberie',
      'électricité',
      'maçonnerie',
      'menuiserie',
      'peinture',
      'autres',
    ])
    .optional(),
})

// Devis update validation
export const updateDevisSchema = createDevisSchema.partial()

// Export types
export type CompanyInfo = z.infer<typeof companyInfoSchema>
export type ClientInfo = z.infer<typeof clientInfoSchema>
export type ProjectInfo = z.infer<typeof projectInfoSchema>
export type DevisItem = z.infer<typeof devisItemSchema>
export type DevisTotals = z.infer<typeof devisTotalsSchema>
export type DevisDates = z.infer<typeof devisDatesSchema>
export type ExtractedData = z.infer<typeof extractedDataSchema>
export type CreateDevisInput = z.infer<typeof createDevisSchema>
export type UpdateDevisInput = z.infer<typeof updateDevisSchema>
