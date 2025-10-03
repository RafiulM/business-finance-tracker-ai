import { NextRequest, NextResponse } from 'next/server';
import { securityMiddleware } from '@/lib/middleware/security';
import { rateLimitMiddleware } from '@/lib/middleware/rate-limit';
import { logger } from '@/lib/middleware/logging';
// Note: authMiddleware disabled for Edge Runtime compatibility
// import { authMiddleware } from '@/lib/middleware/auth-middleware';
import { errorHandlingService } from '@/lib/middleware/error-handler';

// AI endpoints that require special rate limiting
const AI_ENDPOINTS = [
  '/api/ai/process-transaction',
  '/api/ai/generate-insights',
  '/api/ai/chat',
  '/api/ai/analyze-patterns',
];

// Public endpoints that don't require authentication
const PUBLIC_ENDPOINTS = [
  '/api/auth/login',
  '/api/auth/register',
  '/api/auth/verify-email',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
  '/api/health',
  '/api/status',
];

// Static assets and Next.js internals
const SKIP_MIDDLEWARE = [
  '/_next',
  '/static',
  '/favicon',
  '/robots.txt',
  '/sitemap.xml',
];

export async function middleware(request: NextRequest) {
  try {
    // Skip middleware for static assets and Next.js internals
    if (SKIP_MIDDLEWARE.some(path => request.nextUrl.pathname.startsWith(path))) {
      return NextResponse.next();
    }

    // Log the incoming request
    logger.request(request);

    // Get response for modification
    let response = NextResponse.next();

    // Add security headers to all responses
    response = securityMiddleware.addSecurityHeaders(response, request);

    // Handle CORS preflight requests
    if (request.method === 'OPTIONS') {
      const corsResponse = securityMiddleware.middleware(request);
      if (corsResponse) {
        return corsResponse;
      }
    }

    // Check rate limiting for AI endpoints
    if (AI_ENDPOINTS.some(path => request.nextUrl.pathname.startsWith(path))) {
      const rateLimitResult = await rateLimitMiddleware.checkRateLimit(
        request,
        {
          endpoint: request.nextUrl.pathname,
          estimatedTokens: estimateRequestTokens(request),
        }
      );

      if (!rateLimitResult.allowed) {
        logger.warn('Rate limit exceeded for AI endpoint', {
          endpoint: request.nextUrl.pathname,
          ip: request.ip,
          userAgent: request.headers.get('user-agent'),
        });

        return rateLimitMiddleware.createRateLimitResponse(rateLimitResult);
      }
    }

    // Skip authentication for public endpoints
    const isPublicEndpoint = PUBLIC_ENDPOINTS.some(path =>
      request.nextUrl.pathname.startsWith(path)
    );

    // Note: Authentication temporarily disabled for Edge Runtime compatibility
    // In production, implement Edge-compatible authentication (e.g., using Clerk, Auth.js Edge)
    // For API routes that require authentication
    /*
    if (request.nextUrl.pathname.startsWith('/api/') && !isPublicEndpoint) {
      try {
        // Validate session and get user info
        const authResult = await authMiddleware.validateSession(request);

        // Add user info to request headers for downstream use
        response.headers.set('X-User-ID', authResult.user.id);
        response.headers.set('X-User-Email', authResult.user.email);

        // Update session activity
        authMiddleware.updateSessionActivity(authResult.session.token, request).catch(console.error);

      } catch (authError) {
        logger.warn('Authentication failed', {
          endpoint: request.nextUrl.pathname,
          error: authError instanceof Error ? authError.message : 'Unknown auth error',
          ip: request.ip,
        });

        return NextResponse.json(
          {
            error: 'Authentication required',
            message: 'Please log in to access this resource.',
          },
          { status: 401 }
        );
      }
    }
    */

    return response;

  } catch (error) {
    logger.error('Middleware error', error instanceof Error ? error : new Error(String(error)));

    // Handle different types of errors
    if (error instanceof Error && 'statusCode' in error) {
      return errorHandlingService.handleError(error, request);
    }

    // For unexpected errors, return a generic error response
    return NextResponse.json(
      {
        error: 'Internal Server Error',
        message: 'An unexpected error occurred. Please try again.',
        ...(process.env.NODE_ENV === 'development' && {
          details: error instanceof Error ? error.message : String(error),
        }),
      },
      { status: 500 }
    );
  }
}

/**
 * Estimate tokens for the incoming request
 */
function estimateRequestTokens(request: NextRequest): number {
  let totalTokens = 0;

  // Estimate tokens from URL
  totalTokens += rateLimitMiddleware.estimateTokens(request.nextUrl.pathname + request.nextUrl.search);

  // Estimate tokens from request body if it's JSON
  const contentType = request.headers.get('content-type');
  if (contentType && contentType.includes('application/json')) {
    try {
      // Clone the request to read its body
      const clonedRequest = request.clone();
      clonedRequest.json().then(body => {
        if (body && typeof body === 'object') {
          totalTokens += rateLimitMiddleware.estimateTokens(JSON.stringify(body));
        }
      }).catch(() => {
        // Ignore JSON parsing errors
      });
    } catch (error) {
      // Ignore cloning errors
    }
  }

  // Add some overhead for headers and metadata
  totalTokens += 100;

  return totalTokens;
}

/**
 * Configure middleware matching
 */
export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public folder
     */
    '/((?!_next/static|_next/image|favicon.ico|public|robots.txt|sitemap.xml).*)',
  ],
};