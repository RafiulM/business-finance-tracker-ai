import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logging';

export interface SecurityConfig {
  cors: {
    allowedOrigins: string[];
    allowedMethods: string[];
    allowedHeaders: string[];
    credentials: boolean;
    maxAge: number;
  };
  csp: {
    directives: Record<string, string[]>;
    reportOnly?: boolean;
  };
  headers: {
    xFrameOptions: string;
    xContentTypeOptions: string;
    xXSSProtection: string;
    referrerPolicy: string;
    permissionsPolicy: Record<string, string[]>;
    strictTransportSecurity?: {
      maxAge: number;
      includeSubDomains?: boolean;
      preload?: boolean;
    };
  };
  rateLimit: {
    enabled: boolean;
    windowMs: number;
    maxRequests: number;
    skipSuccessfulRequests?: boolean;
    skipFailedRequests?: boolean;
  };
}

export class SecurityMiddleware {
  private static config: SecurityConfig = {
    cors: {
      allowedOrigins: [
        process.env.NODE_ENV === 'development'
          ? 'http://localhost:3000'
          : (process.env.ALLOWED_ORIGINS?.split(',') || []),
      ].flat(),
      allowedMethods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
      allowedHeaders: [
        'Content-Type',
        'Authorization',
        'X-Requested-With',
        'Accept',
        'Origin',
        'Cache-Control',
        'X-Client-Version'
      ],
      credentials: true,
      maxAge: 86400, // 24 hours
    },
    csp: {
      directives: {
        'default-src': ["'self'"],
        'script-src': [
          "'self'",
          "'unsafe-eval'", // Required for Next.js development
          "'unsafe-inline'", // Required for some Next.js features
          'https://www.googletagmanager.com',
          'https://vercel.live',
        ],
        'style-src': [
          "'self'",
          "'unsafe-inline'", // Required for CSS-in-JS
          'https://fonts.googleapis.com',
        ],
        'img-src': [
          "'self'",
          'data:',
          'https:',
          'blob:',
        ],
        'font-src': [
          "'self'",
          'https://fonts.gstatic.com',
          'data:',
        ],
        'connect-src': [
          "'self'",
          'https://api.openai.com',
          'https://vercel.live',
        ],
        'frame-src': ["'none'"],
        'object-src': ["'none'"],
        'base-uri': ["'self'"],
        'form-action': ["'self'"],
        'frame-ancestors': ["'none'"],
        'upgrade-insecure-requests': [],
      },
      reportOnly: process.env.NODE_ENV === 'development',
    },
    headers: {
      xFrameOptions: 'DENY',
      xContentTypeOptions: 'nosniff',
      xXSSProtection: '1; mode=block',
      referrerPolicy: 'strict-origin-when-cross-origin',
      permissionsPolicy: {
        'camera': [],
        'microphone': [],
        'geolocation': [],
        'payment': [],
        'usb': [],
        'bluetooth': [],
        'accelerometer': [],
        'gyroscope': [],
        'magnetometer': [],
      },
      ...(process.env.NODE_ENV === 'production' && {
        strictTransportSecurity: {
          maxAge: 31536000, // 1 year
          includeSubDomains: true,
          preload: true,
        },
      }),
    },
    rateLimit: {
      enabled: true,
      windowMs: 15 * 60 * 1000, // 15 minutes
      maxRequests: 100, // Limit each IP to 100 requests per windowMs
      skipSuccessfulRequests: false,
      skipFailedRequests: false,
    },
  };

  private static rateLimitStore = new Map<string, {
    count: number;
    resetTime: number;
    lastAccess: number;
  }>();

  /**
   * Main middleware function
   */
  static middleware(request: NextRequest): NextResponse | null {
    try {
      // Check rate limiting first
      if (this.config.rateLimit.enabled) {
        const rateLimitResponse = this.checkRateLimit(request);
        if (rateLimitResponse) {
          return rateLimitResponse;
        }
      }

      // Handle CORS preflight requests
      if (request.method === 'OPTIONS') {
        return this.handleCORS(request);
      }

      // For non-preflight requests, we'll add headers in the response
      // The actual header addition happens in the addSecurityHeaders method
      return null;

    } catch (error) {
      logger.error('Security middleware error', error instanceof Error ? error : new Error(String(error)));
      // Don't block requests on security middleware errors
      return null;
    }
  }

  /**
   * Add security headers to response
   */
  static addSecurityHeaders(response: NextResponse, request: NextRequest): NextResponse {
    try {
      // Add CORS headers
      this.addCORSHeaders(response, request);

      // Add CSP header
      this.addCSPHeader(response);

      // Add security headers
      this.addSecurityHeadersRaw(response);

      // Add custom headers
      response.headers.set('X-Content-Type-Options', 'nosniff');
      response.headers.set('X-Frame-Options', 'DENY');
      response.headers.set('X-XSS-Protection', '1; mode=block');
      response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');

      // Add rate limit headers if rate limiting is enabled
      if (this.config.rateLimit.enabled) {
        const clientIP = this.getClientIP(request);
        const rateLimitData = this.rateLimitStore.get(clientIP);
        if (rateLimitData) {
          const remaining = Math.max(0, this.config.rateLimit.maxRequests - rateLimitData.count);
          const resetTime = Math.ceil(rateLimitData.resetTime / 1000);

          response.headers.set('X-RateLimit-Limit', this.config.rateLimit.maxRequests.toString());
          response.headers.set('X-RateLimit-Remaining', remaining.toString());
          response.headers.set('X-RateLimit-Reset', resetTime.toString());
        }
      }

      // Remove server information
      response.headers.delete('Server');
      response.headers.delete('X-Powered-By');

      return response;

    } catch (error) {
      logger.error('Failed to add security headers', error instanceof Error ? error : new Error(String(error)));
      return response;
    }
  }

  /**
   * Handle CORS preflight requests
   */
  private static handleCORS(request: NextRequest): NextResponse {
    const origin = request.headers.get('origin');
    const response = new NextResponse(null, { status: 200 });

    this.addCORSHeaders(response, request);

    // If origin is not allowed, return 403
    if (origin && !this.isOriginAllowed(origin)) {
      return new NextResponse(
        { error: 'CORS policy violation' },
        { status: 403 }
      );
    }

    return response;
  }

  /**
   * Add CORS headers to response
   */
  private static addCORSHeaders(response: NextResponse, request: NextRequest): void {
    const origin = request.headers.get('origin');

    if (this.isOriginAllowed(origin)) {
      response.headers.set('Access-Control-Allow-Origin', origin!);
    } else if (this.config.cors.allowedOrigins.includes('*')) {
      response.headers.set('Access-Control-Allow-Origin', '*');
    }

    response.headers.set(
      'Access-Control-Allow-Methods',
      this.config.cors.allowedMethods.join(', ')
    );

    response.headers.set(
      'Access-Control-Allow-Headers',
      this.config.cors.allowedHeaders.join(', ')
    );

    response.headers.set(
      'Access-Control-Max-Age',
      this.config.cors.maxAge.toString()
    );

    if (this.config.cors.credentials) {
      response.headers.set('Access-Control-Allow-Credentials', 'true');
    }

    // Add Vary header for proper caching
    response.headers.set('Vary', 'Origin');
  }

  /**
   * Add CSP header to response
   */
  private static addCSPHeader(response: NextResponse): void {
    const cspDirectives = Object.entries(this.config.csp.directives)
      .map(([directive, values]) => {
        if (values.length === 0) {
          return directive;
        }
        return `${directive} ${values.join(' ')}`;
      })
      .join('; ');

    const headerName = this.config.csp.reportOnly ? 'Content-Security-Policy-Report-Only' : 'Content-Security-Policy';
    response.headers.set(headerName, cspDirectives);
  }

  /**
   * Add raw security headers
   */
  private static addSecurityHeadersRaw(response: NextResponse): void {
    // X-Frame-Options
    response.headers.set('X-Frame-Options', this.config.headers.xFrameOptions);

    // X-Content-Type-Options
    response.headers.set('X-Content-Type-Options', this.config.headers.xContentTypeOptions);

    // X-XSS-Protection
    response.headers.set('X-XSS-Protection', this.config.headers.xXSSProtection);

    // Referrer Policy
    response.headers.set('Referrer-Policy', this.config.headers.referrerPolicy);

    // Permissions Policy
    const permissionsPolicy = Object.entries(this.config.headers.permissionsPolicy)
      .map(([feature, directives]) => `${feature}=(${directives.join(',')})`)
      .join(', ');
    response.headers.set('Permissions-Policy', permissionsPolicy);

    // Strict-Transport-Security (HTTPS only)
    if (this.config.headers.strictTransportSecurity && process.env.NODE_ENV === 'production') {
      const sts = this.config.headers.strictTransportSecurity;
      let stsValue = `max-age=${sts.maxAge}`;
      if (sts.includeSubDomains) stsValue += '; includeSubDomains';
      if (sts.preload) stsValue += '; preload';
      response.headers.set('Strict-Transport-Security', stsValue);
    }
  }

  /**
   * Check if origin is allowed
   */
  private static isOriginAllowed(origin: string | null): boolean {
    if (!origin) return false;

    const allowedOrigins = this.config.cors.allowedOrigins;

    // Check for exact match
    if (allowedOrigins.includes(origin)) {
      return true;
    }

    // Check for wildcard patterns
    return allowedOrigins.some(allowedOrigin => {
      if (allowedOrigin === '*') return true;
      if (allowedOrigin.includes('*')) {
        const regex = new RegExp(
          allowedOrigin.replace(/\*/g, '.*').replace(/\./g, '\\.')
        );
        return regex.test(origin);
      }
      return false;
    });
  }

  /**
   * Rate limiting implementation
   */
  private static checkRateLimit(request: NextRequest): NextResponse | null {
    const clientIP = this.getClientIP(request);
    const now = Date.now();
    const windowMs = this.config.rateLimit.windowMs;
    const maxRequests = this.config.rateLimit.maxRequests;

    // Get or create rate limit data for this IP
    let rateLimitData = this.rateLimitStore.get(clientIP);

    if (!rateLimitData || now > rateLimitData.resetTime) {
      // Create new window
      rateLimitData = {
        count: 0,
        resetTime: now + windowMs,
        lastAccess: now,
      };
      this.rateLimitStore.set(clientIP, rateLimitData);
    }

    // Increment request count
    rateLimitData.count++;
    rateLimitData.lastAccess = now;

    // Check if limit exceeded
    if (rateLimitData.count > maxRequests) {
      logger.warn('Rate limit exceeded', {
        ip: clientIP,
        count: rateLimitData.count,
        limit: maxRequests,
        resetTime: rateLimitData.resetTime,
      });

      return new NextResponse(
        {
          error: 'Too Many Requests',
          message: `Rate limit exceeded. Try again in ${Math.ceil((rateLimitData.resetTime - now) / 1000)} seconds.`,
          retryAfter: Math.ceil((rateLimitData.resetTime - now) / 1000),
        },
        {
          status: 429,
          headers: {
            'Retry-After': Math.ceil((rateLimitData.resetTime - now) / 1000).toString(),
            'X-RateLimit-Limit': maxRequests.toString(),
            'X-RateLimit-Remaining': '0',
            'X-RateLimit-Reset': Math.ceil(rateLimitData.resetTime / 1000).toString(),
          },
        }
      );
    }

    return null;
  }

  /**
   * Get client IP address
   */
  private static getClientIP(request: NextRequest): string {
    // Check various headers for the real IP
    const forwardedFor = request.headers.get('x-forwarded-for');
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }

    const realIP = request.headers.get('x-real-ip');
    if (realIP) {
      return realIP;
    }

    const cfConnectingIP = request.headers.get('cf-connecting-ip');
    if (cfConnectingIP) {
      return cfConnectingIP;
    }

    // Fallback to request IP
    return request.ip || 'unknown';
  }

  /**
   * Clean up expired rate limit entries
   */
  static cleanupRateLimit(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, data] of this.rateLimitStore.entries()) {
      if (now > data.resetTime + this.config.rateLimit.windowMs) {
        expiredKeys.push(key);
      }
    }

    expiredKeys.forEach(key => this.rateLimitStore.delete(key));

    if (expiredKeys.length > 0) {
      logger.debug(`Cleaned up ${expiredKeys.length} expired rate limit entries`);
    }
  }

  /**
   * Get current rate limit status
   */
  static getRateLimitStatus(request: NextRequest): {
    limit: number;
    remaining: number;
    resetTime: number;
    isLimited: boolean;
  } {
    const clientIP = this.getClientIP(request);
    const rateLimitData = this.rateLimitStore.get(clientIP);
    const now = Date.now();

    if (!rateLimitData || now > rateLimitData.resetTime) {
      return {
        limit: this.config.rateLimit.maxRequests,
        remaining: this.config.rateLimit.maxRequests,
        resetTime: now + this.config.rateLimit.windowMs,
        isLimited: false,
      };
    }

    return {
      limit: this.config.rateLimit.maxRequests,
      remaining: Math.max(0, this.config.rateLimit.maxRequests - rateLimitData.count),
      resetTime: rateLimitData.resetTime,
      isLimited: rateLimitData.count > this.config.rateLimit.maxRequests,
    };
  }

  /**
   * Update security configuration
   */
  static updateConfig(newConfig: Partial<SecurityConfig>): void {
    this.config = {
      ...this.config,
      ...newConfig,
      cors: { ...this.config.cors, ...newConfig.cors },
      csp: { ...this.config.csp, ...newConfig.csp },
      headers: { ...this.config.headers, ...newConfig.headers },
      rateLimit: { ...this.config.rateLimit, ...newConfig.rateLimit },
    };

    logger.info('Security configuration updated', { config: this.config });
  }

  /**
   * Get current security configuration
   */
  static getConfig(): SecurityConfig {
    return { ...this.config };
  }
}

// Export singleton instance
export const securityMiddleware = SecurityMiddleware;

// Export convenience functions
export const addSecurityHeaders = (response: NextResponse, request: NextRequest) =>
  SecurityMiddleware.addSecurityHeaders(response, request);

export const checkRateLimit = (request: NextRequest) =>
  SecurityMiddleware.checkRateLimit(request);

// Initialize cleanup interval for rate limiting
if (typeof window === 'undefined') {
  setInterval(() => {
    SecurityMiddleware.cleanupRateLimit();
  }, 5 * 60 * 1000); // Clean up every 5 minutes
}