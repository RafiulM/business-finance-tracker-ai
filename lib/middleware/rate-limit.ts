import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logging';

export interface RateLimitConfig {
  ai: {
    requestsPerMinute: number;
    requestsPerHour: number;
    requestsPerDay: number;
    tokensPerMinute: number;
    tokensPerHour: number;
  };
  endpoints: {
    '/api/ai/process-transaction': {
      requestsPerMinute: number;
      tokensPerRequest: number;
    };
    '/api/ai/generate-insights': {
      requestsPerMinute: number;
      tokensPerRequest: number;
    };
    '/api/ai/chat': {
      requestsPerMinute: number;
      tokensPerRequest: number;
    };
    '/api/ai/analyze-patterns': {
      requestsPerMinute: number;
      tokensPerRequest: number;
    };
  };
  default: {
    requestsPerMinute: number;
    requestsPerHour: number;
  };
}

export interface RateLimitData {
  // Request counts
  minuteRequests: number;
  hourRequests: number;
  dayRequests: number;

  // Token counts
  minuteTokens: number;
  hourTokens: number;

  // Timestamps for window resets
  minuteWindow: number;
  hourWindow: number;
  dayWindow: number;

  // Metadata
  lastAccess: number;
  userId?: string;
  endpoint?: string;
}

export interface RateLimitResult {
  allowed: boolean;
  limitType?: 'requests' | 'tokens';
  resetTime?: number;
  retryAfter?: number;
  remaining?: {
    minuteRequests: number;
    hourRequests: number;
    dayRequests: number;
    minuteTokens: number;
    hourTokens: number;
  };
}

export class RateLimitMiddleware {
  private static config: RateLimitConfig = {
    ai: {
      requestsPerMinute: 10,
      requestsPerHour: 100,
      requestsPerDay: 1000,
      tokensPerMinute: 15000,
      tokensPerHour: 100000,
    },
    endpoints: {
      '/api/ai/process-transaction': {
        requestsPerMinute: 20,
        tokensPerRequest: 500,
      },
      '/api/ai/generate-insights': {
        requestsPerMinute: 5,
        tokensPerRequest: 2000,
      },
      '/api/ai/chat': {
        requestsPerMinute: 15,
        tokensPerRequest: 1000,
      },
      '/api/ai/analyze-patterns': {
        requestsPerMinute: 3,
        tokensPerRequest: 3000,
      },
    },
    default: {
      requestsPerMinute: 60,
      requestsPerHour: 1000,
    },
  };

  // In-memory store for rate limiting
  // In production, this should be replaced with Redis or similar
  private static store = new Map<string, RateLimitData>();

  // Cleanup interval
  private static cleanupInterval: NodeJS.Timeout | null = null;

  /**
   * Initialize rate limiting middleware
   */
  static initialize(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }

    // Clean up expired entries every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);

    logger.info('Rate limiting middleware initialized');
  }

  /**
   * Main middleware function for AI endpoints
   */
  static async checkRateLimit(
    request: NextRequest,
    options: {
      userId?: string;
      estimatedTokens?: number;
      endpoint?: string;
    } = {}
  ): Promise<RateLimitResult> {
    const key = this.getKey(request, options.userId);
    const now = Date.now();
    const endpoint = options.endpoint || request.nextUrl.pathname;

    // Get or create rate limit data
    let data = this.store.get(key);
    if (!data) {
      data = this.createRateLimitData(now, options.userId, endpoint);
      this.store.set(key, data);
    }

    // Update windows if needed
    this.updateWindows(data, now);

    // Check endpoint-specific limits
    const endpointLimit = this.config.endpoints[endpoint as keyof typeof this.config.endpoints];
    if (endpointLimit) {
      // Check endpoint request limit
      if (data.minuteRequests >= endpointLimit.requestsPerMinute) {
        return {
          allowed: false,
          limitType: 'requests',
          resetTime: data.minuteWindow + 60000,
          retryAfter: Math.ceil((data.minuteWindow + 60000 - now) / 1000),
          remaining: this.getRemaining(data),
        };
      }
    }

    // Check general AI limits
    const result = this.checkAILimits(data, now, options.estimatedTokens);
    if (!result.allowed) {
      return result;
    }

    // Update counters
    data.minuteRequests++;
    data.hourRequests++;
    data.dayRequests++;

    if (options.estimatedTokens) {
      data.minuteTokens += options.estimatedTokens;
      data.hourTokens += options.estimatedTokens;
    }

    data.lastAccess = now;

    return {
      allowed: true,
      remaining: this.getRemaining(data),
    };
  }

  /**
   * Check AI-specific limits
   */
  private static checkAILimits(
    data: RateLimitData,
    now: number,
    estimatedTokens?: number
  ): RateLimitResult {
    const { ai } = this.config;

    // Check request limits
    if (data.minuteRequests >= ai.requestsPerMinute) {
      return {
        allowed: false,
        limitType: 'requests',
        resetTime: data.minuteWindow + 60000,
        retryAfter: Math.ceil((data.minuteWindow + 60000 - now) / 1000),
        remaining: this.getRemaining(data),
      };
    }

    if (data.hourRequests >= ai.requestsPerHour) {
      return {
        allowed: false,
        limitType: 'requests',
        resetTime: data.hourWindow + 3600000,
        retryAfter: Math.ceil((data.hourWindow + 3600000 - now) / 1000),
        remaining: this.getRemaining(data),
      };
    }

    if (data.dayRequests >= ai.requestsPerDay) {
      return {
        allowed: false,
        limitType: 'requests',
        resetTime: data.dayWindow + 86400000,
        retryAfter: Math.ceil((data.dayWindow + 86400000 - now) / 1000),
        remaining: this.getRemaining(data),
      };
    }

    // Check token limits if tokens are estimated
    if (estimatedTokens) {
      if (data.minuteTokens + estimatedTokens > ai.tokensPerMinute) {
        return {
          allowed: false,
          limitType: 'tokens',
          resetTime: data.minuteWindow + 60000,
          retryAfter: Math.ceil((data.minuteWindow + 60000 - now) / 1000),
          remaining: this.getRemaining(data),
        };
      }

      if (data.hourTokens + estimatedTokens > ai.tokensPerHour) {
        return {
          allowed: false,
          limitType: 'tokens',
          resetTime: data.hourWindow + 3600000,
          retryAfter: Math.ceil((data.hourWindow + 3600000 - now) / 1000),
          remaining: this.getRemaining(data),
        };
      }
    }

    return { allowed: true };
  }

  /**
   * Get rate limit key for request
   */
  private static getKey(request: NextRequest, userId?: string): string {
    // Use user ID if available, otherwise IP address
    if (userId) {
      return `user:${userId}`;
    }

    // Get IP address
    const ip = this.getClientIP(request);
    return `ip:${ip}`;
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    return request.ip || 'unknown';
  }

  /**
   * Create new rate limit data
   */
  private static createRateLimitData(
    now: number,
    userId?: string,
    endpoint?: string
  ): RateLimitData {
    return {
      minuteRequests: 0,
      hourRequests: 0,
      dayRequests: 0,
      minuteTokens: 0,
      hourTokens: 0,
      minuteWindow: Math.floor(now / 60000) * 60000,
      hourWindow: Math.floor(now / 3600000) * 3600000,
      dayWindow: Math.floor(now / 86400000) * 86400000,
      lastAccess: now,
      userId,
      endpoint,
    };
  }

  /**
   * Update time windows if needed
   */
  private static updateWindows(data: RateLimitData, now: number): void {
    const currentMinute = Math.floor(now / 60000) * 60000;
    const currentHour = Math.floor(now / 3600000) * 3600000;
    const currentDay = Math.floor(now / 86400000) * 86400000;

    // Reset minute window
    if (now >= data.minuteWindow + 60000) {
      data.minuteRequests = 0;
      data.minuteTokens = 0;
      data.minuteWindow = currentMinute;
    }

    // Reset hour window
    if (now >= data.hourWindow + 3600000) {
      data.hourRequests = 0;
      data.hourTokens = 0;
      data.hourWindow = currentHour;
    }

    // Reset day window
    if (now >= data.dayWindow + 86400000) {
      data.dayRequests = 0;
      data.dayWindow = currentDay;
    }
  }

  /**
   * Get remaining limits
   */
  private static getRemaining(data: RateLimitData): RateLimitResult['remaining'] {
    return {
      minuteRequests: Math.max(0, this.config.ai.requestsPerMinute - data.minuteRequests),
      hourRequests: Math.max(0, this.config.ai.requestsPerHour - data.hourRequests),
      dayRequests: Math.max(0, this.config.ai.requestsPerDay - data.dayRequests),
      minuteTokens: Math.max(0, this.config.ai.tokensPerMinute - data.minuteTokens),
      hourTokens: Math.max(0, this.config.ai.tokensPerHour - data.hourTokens),
    };
  }

  /**
   * Estimate token count for text
   */
  static estimateTokens(text: string): number {
    // Rough estimation: ~4 characters per token
    return Math.ceil(text.length / 4);
  }

  /**
   * Create rate limit response
   */
  static createRateLimitResponse(result: RateLimitResult): NextResponse {
    const headers: Record<string, string> = {
      'X-RateLimit-Limit-Minute': this.config.ai.requestsPerMinute.toString(),
      'X-RateLimit-Limit-Hour': this.config.ai.requestsPerHour.toString(),
      'X-RateLimit-Limit-Day': this.config.ai.requestsPerDay.toString(),
      'X-RateLimit-Limit-Tokens-Minute': this.config.ai.tokensPerMinute.toString(),
      'X-RateLimit-Limit-Tokens-Hour': this.config.ai.tokensPerHour.toString(),
    };

    if (result.remaining) {
      headers['X-RateLimit-Remaining-Minute'] = result.remaining.minuteRequests.toString();
      headers['X-RateLimit-Remaining-Hour'] = result.remaining.hourRequests.toString();
      headers['X-RateLimit-Remaining-Day'] = result.remaining.dayRequests.toString();
      headers['X-RateLimit-Remaining-Tokens-Minute'] = result.remaining.minuteTokens.toString();
      headers['X-RateLimit-Remaining-Tokens-Hour'] = result.remaining.hourTokens.toString();
    }

    if (result.retryAfter) {
      headers['Retry-After'] = result.retryAfter.toString();
      headers['X-RateLimit-Reset'] = (result.resetTime || 0).toString();
    }

    const message = result.limitType === 'tokens'
      ? `Token limit exceeded. Please try again in ${result.retryAfter} seconds.`
      : `Rate limit exceeded. Please try again in ${result.retryAfter} seconds.`;

    return NextResponse.json(
      {
        error: 'Rate Limit Exceeded',
        message,
        limitType: result.limitType,
        retryAfter: result.retryAfter,
        remaining: result.remaining,
      },
      {
        status: 429,
        headers,
      }
    );
  }

  /**
   * Get rate limit status for user
   */
  static getRateLimitStatus(
    request: NextRequest,
    userId?: string
  ): RateLimitResult & { current: RateLimitData } {
    const key = this.getKey(request, userId);
    const data = this.store.get(key);
    const now = Date.now();

    if (!data) {
      const newData = this.createRateLimitData(now, userId);
      return {
        allowed: true,
        remaining: this.getRemaining(newData),
        current: newData,
      };
    }

    this.updateWindows(data, now);

    return {
      allowed: true,
      remaining: this.getRemaining(data),
      current: data,
    };
  }

  /**
   * Reset rate limits for user (admin function)
   */
  static resetRateLimits(userId: string): void {
    const keysToDelete: string[] = [];

    for (const [key, data] of this.store.entries()) {
      if (data.userId === userId || key === `user:${userId}`) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));

    logger.info(`Rate limits reset for user: ${userId}`, {
      deletedKeys: keysToDelete.length,
    });
  }

  /**
   * Clean up expired entries
   */
  private static cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];
    const dayWindow = 86400000; // 24 hours

    for (const [key, data] of this.store.entries()) {
      // Remove entries older than 24 hours since last access
      if (now - data.lastAccess > dayWindow) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.store.delete(key));

    if (keysToDelete.length > 0) {
      logger.debug(`Cleaned up ${keysToDelete.length} expired rate limit entries`);
    }

    // Log current store size for monitoring
    if (this.store.size > 10000) {
      logger.warn(`Rate limit store is large: ${this.store.size} entries`);
    }
  }

  /**
   * Get rate limit statistics
   */
  static getStatistics(): {
    totalEntries: number;
    activeUsers: number;
    activeIPs: number;
    currentLoad: {
      requestsThisMinute: number;
      requestsThisHour: number;
      tokensThisMinute: number;
      tokensThisHour: number;
    };
  } {
    const now = Date.now();
    const users = new Set<string>();
    const ips = new Set<string>();
    let requestsThisMinute = 0;
    let requestsThisHour = 0;
    let tokensThisMinute = 0;
    let tokensThisHour = 0;

    const currentMinute = Math.floor(now / 60000) * 60000;
    const currentHour = Math.floor(now / 3600000) * 3600000;

    for (const [key, data] of this.store.entries()) {
      if (key.startsWith('user:')) {
        users.add(key.substring(5));
      } else if (key.startsWith('ip:')) {
        ips.add(key.substring(3));
      }

      if (data.minuteWindow === currentMinute) {
        requestsThisMinute += data.minuteRequests;
        tokensThisMinute += data.minuteTokens;
      }

      if (data.hourWindow === currentHour) {
        requestsThisHour += data.hourRequests;
        tokensThisHour += data.hourTokens;
      }
    }

    return {
      totalEntries: this.store.size,
      activeUsers: users.size,
      activeIPs: ips.size,
      currentLoad: {
        requestsThisMinute,
        requestsThisHour,
        tokensThisMinute,
        tokensThisHour,
      },
    };
  }

  /**
   * Update configuration
   */
  static updateConfig(newConfig: Partial<RateLimitConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      ai: { ...this.config.ai, ...newConfig.ai },
      endpoints: { ...this.config.endpoints, ...newConfig.endpoints },
      default: { ...this.config.default, ...newConfig.default },
    };

    logger.info('Rate limit configuration updated', { config: this.config });
  }

  /**
   * Get current configuration
   */
  static getConfig(): RateLimitConfig {
    return { ...this.config };
  }

  /**
   * Shutdown middleware
   */
  static shutdown(): void {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
      this.cleanupInterval = null;
    }
    this.store.clear();
    logger.info('Rate limiting middleware shutdown');
  }
}

// Export singleton instance
export const rateLimitMiddleware = RateLimitMiddleware;

// Export convenience functions
export const checkAIRateLimit = (request: NextRequest, options?: {
  userId?: string;
  estimatedTokens?: number;
  endpoint?: string;
}) => RateLimitMiddleware.checkRateLimit(request, options);

export const estimateTokens = (text: string) => RateLimitMiddleware.estimateTokens(text);

export const createRateLimitResponse = (result: RateLimitResult) =>
  RateLimitMiddleware.createRateLimitResponse(result);

// Initialize on module import
if (typeof window === 'undefined') {
  RateLimitMiddleware.initialize();
}

// Process shutdown handling is not available in Edge Runtime
// The middleware will automatically clean up when the process terminates