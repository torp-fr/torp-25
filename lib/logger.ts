/**
 * Logger centralisé pour TORP Platform
 * Utilise Pino pour structured logging performant
 */

import pino from 'pino'

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

// Configuration du logger
const logger = pino({
  level: process.env.LOG_LEVEL || (isDevelopment ? 'debug' : 'info'),
  
  // Pretty print en développement
  transport: isDevelopment && !isTest
    ? {
        target: 'pino-pretty',
        options: {
          colorize: true,
          translateTime: 'HH:MM:ss',
          ignore: 'pid,hostname',
          singleLine: false,
        },
      }
    : undefined,
  
  // Désactiver complètement en test
  enabled: !isTest,

  // Formatage des erreurs
  formatters: {
    level: (label) => {
      return { level: label }
    },
  },

  // Redaction de données sensibles
  redact: {
    paths: [
      'password',
      'apiKey',
      'token',
      'secret',
      '*.password',
      '*.apiKey',
      '*.token',
      '*.secret',
    ],
    remove: true,
  },
})

/**
 * Logger spécialisés par module
 */
export const createModuleLogger = (module: string) => {
  return logger.child({ module })
}

// Loggers pré-configurés pour les modules principaux
export const loggers = {
  llm: createModuleLogger('LLM'),
  scoring: createModuleLogger('Scoring'),
  enrichment: createModuleLogger('Enrichment'),
  api: createModuleLogger('API'),
  db: createModuleLogger('Database'),
  auth: createModuleLogger('Auth'),
  upload: createModuleLogger('Upload'),
}

// Export du logger par défaut
export default logger
