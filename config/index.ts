/**
 * Application Configuration
 * Centralized configuration for the TORP platform
 */

export const config = {
  app: {
    name: 'TORP',
    url: process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
    environment: process.env.NODE_ENV || 'development',
  },

  auth: {
    secret: process.env.AUTH0_SECRET || '',
    baseUrl: process.env.AUTH0_BASE_URL || '',
    issuerBaseUrl: process.env.AUTH0_ISSUER_BASE_URL || '',
    clientId: process.env.AUTH0_CLIENT_ID || '',
    clientSecret: process.env.AUTH0_CLIENT_SECRET || '',
  },

  database: {
    url: process.env.DATABASE_URL!,
  },

  aws: {
    region: process.env.AWS_REGION || 'eu-west-3',
    accessKeyId: process.env.AWS_ACCESS_KEY_ID || '',
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || '',
    s3: {
      bucketName: process.env.AWS_S3_BUCKET_NAME || 'torp-documents',
    },
  },

  stripe: {
    publishableKey: process.env.STRIPE_PUBLISHABLE_KEY || '',
    secretKey: process.env.STRIPE_SECRET_KEY || '',
    webhookSecret: process.env.STRIPE_WEBHOOK_SECRET || '',
    plans: {
      free: 'price_free',
      premiumConsumer: process.env.STRIPE_PRICE_PREMIUM_CONSUMER || '',
      pro: process.env.STRIPE_PRICE_PRO || '',
      enterprise: process.env.STRIPE_PRICE_ENTERPRISE || '',
    },
  },

  reefPremium: {
    apiKey: process.env.REEF_PREMIUM_API_KEY || '',
    apiUrl:
      process.env.REEF_PREMIUM_API_URL || 'https://api.reef-premium.fr/v1',
  },

  // APIs externes pour enrichissement de données
  externalApis: {
    // API Recherche d'Entreprises (gratuite, data.gouv.fr)
    rechercheEntreprises: {
      baseUrl: 'https://recherche-entreprises.api.gouv.fr',
      // Pas de clé API requise
      // Documentation: https://www.data.gouv.fr/fr/datasets/api-recherche-entreprises/
    },
    // API Infogreffe (données financières)
    infogreffe: {
      apiKey: process.env.INFOGREFFE_API_KEY || '',
      baseUrl: process.env.INFOGREFFE_API_URL || 'https://api.infogreffe.fr/v1',
    },
    // API Pappers (enrichissement entreprises)
    pappers: {
      apiKey: process.env.PAPPERS_API_KEY || '',
      baseUrl: process.env.PAPPERS_API_URL || 'https://api.pappers.fr/v2',
    },
    // API OpenWeather (météo)
    openWeather: {
      apiKey: process.env.OPENWEATHER_API_KEY || '',
      baseUrl: 'https://api.openweathermap.org/data/2.5',
    },
    // API Météo France (optionnel)
    meteofrance: {
      apiKey: process.env.METEOFRANCE_API_KEY || '',
      baseUrl: 'https://api.meteofrance.fr/v1',
    },
    // API Géoportail IGN (Cadastre)
    geoportail: {
      apiKey: process.env.GEOPORTAIL_API_KEY || '',
      baseUrl: 'https://wxs.ign.fr',
    },
    // API Qualibat (Certifications BTP)
    qualibat: {
      apiKey: process.env.QUALIBAT_API_KEY || '',
      apiUrl: process.env.QUALIBAT_API_URL || 'https://api.qualibat.com/v1',
    },
  },

  redis: {
    url: process.env.REDIS_URL || 'redis://localhost:6379',
  },

  limits: {
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFilesPerUpload: 5,
    ocrTimeoutSeconds: 30,
    scoreCalculationTimeoutSeconds: 10,
  },

  scoring: {
    version: '1.0.0',
    weights: {
      prix: 0.25,
      qualite: 0.3,
      delais: 0.2,
      conformite: 0.25,
    },
    gradeThresholds: {
      A: 850,
      B: 700,
      C: 550,
      D: 400,
      E: 0,
    },
  },

  rateLimit: {
    free: 100, // requests per hour
    premium: 1000,
    pro: 10000,
  },
} as const

// Validate required environment variables
export function validateConfig() {
  const required = [
    'DATABASE_URL',
  ]

  const missing = required.filter((key) => !process.env[key])

  if (missing.length > 0) {
    throw new Error(
      `Missing required environment variables: ${missing.join(', ')}`
    )
  }

  // Warn about missing optional services
  const optional = {
    'AWS S3': ['AWS_ACCESS_KEY_ID', 'AWS_SECRET_ACCESS_KEY'],
    'Auth0': ['AUTH0_SECRET', 'AUTH0_CLIENT_ID'],
    'Stripe': ['STRIPE_SECRET_KEY'],
  }

  for (const [service, vars] of Object.entries(optional)) {
    const missingVars = vars.filter((key) => !process.env[key])
    if (missingVars.length > 0) {
      console.warn(`⚠️  ${service} not configured (${missingVars.join(', ')}). Features will be limited.`)
    }
  }
}
