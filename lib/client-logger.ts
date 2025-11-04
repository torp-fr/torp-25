/**
 * Client-side Logger for Browser/React Components
 * Provides structured logging interface similar to Pino for client-side code
 * Uses console methods under the hood but with structured format
 */

type LogLevel = 'debug' | 'info' | 'warn' | 'error'

interface LogContext {
  [key: string]: any
}

interface Logger {
  debug(context: LogContext, message: string): void
  debug(message: string): void
  info(context: LogContext, message: string): void
  info(message: string): void
  warn(context: LogContext, message: string): void
  warn(message: string): void
  error(context: LogContext, message: string): void
  error(message: string): void
}

const isDevelopment = process.env.NODE_ENV === 'development'
const isTest = process.env.NODE_ENV === 'test'

/**
 * Create a logger function for a specific level
 */
function createLogFn(level: LogLevel, module?: string) {
  return function(contextOrMessage: LogContext | string, message?: string) {
    // Skip logging in test environment
    if (isTest) return

    let ctx: LogContext = {}
    let msg: string

    // Handle both signatures: (context, message) and (message)
    if (typeof contextOrMessage === 'string') {
      msg = contextOrMessage
    } else {
      ctx = contextOrMessage
      msg = message || ''
    }

    // Add module if provided
    if (module) {
      ctx = { ...ctx, module }
    }

    // Format the log output
    const timestamp = new Date().toISOString()
    const prefix = isDevelopment ? `[${level.toUpperCase()}]` : ''

    // Use appropriate console method
    const consoleFn = console[level] || console.log

    // In development, log with expanded context
    if (isDevelopment && Object.keys(ctx).length > 0) {
      consoleFn(prefix, msg, ctx)
    } else if (Object.keys(ctx).length > 0) {
      // In production, use structured format
      consoleFn(JSON.stringify({ level, msg, ...ctx, timestamp }))
    } else {
      consoleFn(prefix, msg)
    }
  }
}

/**
 * Create a module-specific logger
 */
export function createClientLogger(module: string): Logger {
  return {
    debug: createLogFn('debug', module) as any,
    info: createLogFn('info', module) as any,
    warn: createLogFn('warn', module) as any,
    error: createLogFn('error', module) as any,
  }
}

/**
 * Pre-configured client loggers for common modules
 */
export const clientLoggers = {
  ui: createClientLogger('UI'),
  page: createClientLogger('Page'),
  component: createClientLogger('Component'),
  form: createClientLogger('Form'),
  api: createClientLogger('ClientAPI'),
}

/**
 * Default client logger
 */
const defaultLogger: Logger = {
  debug: createLogFn('debug') as any,
  info: createLogFn('info') as any,
  warn: createLogFn('warn') as any,
  error: createLogFn('error') as any,
}

export default defaultLogger
