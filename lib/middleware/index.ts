// Database middleware
export { DatabaseManager, dbManager, getDb } from './db';

// Authentication middleware
export {
  AuthMiddleware,
  authMiddleware,
  type AuthUser,
  type SessionData
} from './auth-middleware';

// Logging middleware
export {
  LoggingService,
  loggingService,
  logger,
  type LogEntry
} from './logging';

// Error handling middleware
export {
  ErrorHandlingService,
  errorHandlingService,
  createError,
  createOperationalError,
  withErrorHandling,
  handleError,
  type AppError
} from './error-handler';

// Security middleware
export {
  SecurityMiddleware,
  securityMiddleware,
  addSecurityHeaders,
  checkRateLimit,
  type SecurityConfig
} from './security';

// Rate limiting middleware
export {
  RateLimitMiddleware,
  rateLimitMiddleware,
  checkAIRateLimit,
  estimateTokens,
  createRateLimitResponse,
  type RateLimitConfig,
  type RateLimitData,
  type RateLimitResult
} from './rate-limit';

// Convenience exports for common usage patterns
export const middleware = {
  // Database
  db: {
    manager: dbManager,
    getConnection: getDb,
    initialize: () => dbManager.initialize(),
    healthCheck: () => dbManager.healthCheck(),
  },

  // Authentication
  auth: {
    validateSession: (request: Request) => authMiddleware.validateSession(request as any),
    createSession: (user: any, request: Request) => authMiddleware.createSession(user, request as any),
    invalidateSession: (token: string) => authMiddleware.invalidateSession(token),
    extractToken: (request: Request) => authMiddleware.extractToken(request as any),
  },

  // Logging
  log: {
    info: (message: string, data?: any) => logger.info(message, data),
    warn: (message: string, data?: any) => logger.warn(message, data),
    error: (message: string, error?: Error, data?: any) => logger.error(message, error, data),
    debug: (message: string, data?: any) => logger.debug(message, data),
    request: (request: Request, options?: any) => logger.request(request as any, options),
  },

  // Error handling
  error: {
    create: (message: string, options?: any) => createError(message, options),
    createOperational: (message: string, options?: any) => createOperationalError(message, options),
    handle: (error: any, request?: Request) => handleError(error, request as any),
    withHandling: <T>(fn: () => Promise<T>) => withErrorHandling(fn),
  },

  // Security
  security: {
    addHeaders: (response: Response, request: Request) =>
      addSecurityHeaders(response as any, request as any),
    checkRateLimit: (request: Request) => checkRateLimit(request as any),
    updateConfig: (config: any) => securityMiddleware.updateConfig(config),
    getConfig: () => securityMiddleware.getConfig(),
  },

  // Rate limiting
  rateLimit: {
    check: (request: Request, options?: any) => checkAIRateLimit(request as any, options),
    estimateTokens: (text: string) => estimateTokens(text),
    createResponse: (result: any) => createRateLimitResponse(result),
    getStatus: (request: Request, userId?: string) =>
      rateLimitMiddleware.getRateLimitStatus(request as any, userId),
    resetUser: (userId: string) => rateLimitMiddleware.resetRateLimits(userId),
    getStatistics: () => rateLimitMiddleware.getStatistics(),
  },
};

// Default export for convenience
export default middleware;