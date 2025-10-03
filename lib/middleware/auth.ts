import { NextRequest } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';

/**
 * Validate session and return user ID
 * This is a simplified implementation for development
 * In production, use proper JWT verification
 */
export async function validateSession(request: NextRequest): Promise<string | null> {
  try {
    // Get session token from cookie or header
    const sessionToken = request.cookies.get('session-token')?.value ||
                       request.headers.get('authorization')?.replace('Bearer ', '');

    if (!sessionToken) {
      return null;
    }

    // Decode session token (simplified implementation)
    // In production, verify JWT signature and expiration
    const decoded = decodeSessionToken(sessionToken);
    if (!decoded) {
      return null;
    }

    // Check if session is not too old (7 days)
    const sessionAge = Date.now() - decoded.timestamp;
    const maxAge = 7 * 24 * 60 * 60 * 1000; // 7 days in milliseconds

    if (sessionAge > maxAge) {
      return null;
    }

    // Verify user exists and is active
    const user = await userService.getUserById(decoded.userId);
    if (!user) {
      return null;
    }

    // In a real implementation, you might want to:
    // - Check if user is banned/suspended
    // - Check if session was revoked
    // - Update last activity timestamp

    return decoded.userId;

  } catch (error) {
    console.error('Session validation error:', error);
    return null;
  }
}

/**
 * Decode session token (simplified implementation)
 * In production, use proper JWT verification
 */
function decodeSessionToken(token: string): { userId: string; timestamp: number } | null {
  try {
    // This is a simplified decode - in production use JWT verification
    const decoded = Buffer.from(token, 'base64').toString('utf-8');
    const [userId, timestamp, random] = decoded.split(':');

    if (!userId || !timestamp) {
      return null;
    }

    return {
      userId,
      timestamp: parseInt(timestamp),
    };
  } catch (error) {
    return null;
  }
}

/**
 * Generate a secure session token
 * In production, use proper JWT signing
 */
export function generateSessionToken(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  const payload = `${userId}:${timestamp}:${random}`;
  return Buffer.from(payload).toString('base64');
}

/**
 * Middleware to protect API routes
 */
export async function requireAuth(request: NextRequest): Promise<{ userId: string; user: any }> {
  const userId = await validateSession(request);

  if (!userId) {
    throw new Error('Unauthorized');
  }

  const user = await userService.getUserById(userId);
  if (!user) {
    throw new Error('User not found');
  }

  return { userId, user };
}

/**
 * Log API access for audit purposes
 */
export async function logApiAccess(
  request: NextRequest,
  userId: string,
  entityType: string,
  entityId: string,
  action: string,
  success: boolean = true,
  error?: string
): Promise<void> {
  try {
    await auditService.createAuditLog({
      userId,
      entityType: 'api_access',
      entityId: `${entityType}:${entityId}:${action}`,
      action: 'read',
      oldValue: null,
      newValue: {
        method: request.method,
        url: request.url,
        userAgent: request.headers.get('user-agent'),
        ipAddress: request.ip,
        success,
        error,
        timestamp: new Date().toISOString(),
      },
      reason: `API access: ${action} ${entityType}`,
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });
  } catch (error) {
    console.error('Failed to log API access:', error);
    // Don't throw here - logging failures shouldn't break the main flow
  }
}

/**
 * Check if user has permission to access a resource
 */
export function hasPermission(
  user: any,
  resource: string,
  action: string,
  resourceId?: string
): boolean {
  // This is a simplified permission system
  // In production, implement proper RBAC (Role-Based Access Control)

  // Users can access their own resources
  if (resource === 'user' && resourceId === user.id) {
    return true;
  }

  // Users can access their own transactions, categories, assets, insights
  if (['transaction', 'category', 'asset', 'insight'].includes(resource)) {
    return true; // The service layer will verify ownership
  }

  // Admin permissions (if you implement admin roles)
  if (user.role === 'admin') {
    return true;
  }

  return false;
}

/**
 * Rate limiting for API endpoints
 * This is a simple in-memory implementation
 * In production, use Redis or another distributed store
 */
const rateLimitStore = new Map<string, { count: number; resetTime: number }>();

export function checkRateLimit(
  identifier: string,
  limit: number = 100,
  windowMs: number = 60 * 1000 // 1 minute
): { allowed: boolean; remaining: number; resetTime: number } {
  const now = Date.now();
  const key = identifier;

  const existing = rateLimitStore.get(key);

  if (!existing || now > existing.resetTime) {
    // New window or expired window
    const resetTime = now + windowMs;
    rateLimitStore.set(key, { count: 1, resetTime });
    return {
      allowed: true,
      remaining: limit - 1,
      resetTime,
    };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      resetTime: existing.resetTime,
    };
  }

  existing.count++;
  return {
    allowed: true,
    remaining: limit - existing.count,
    resetTime: existing.resetTime,
  };
}

/**
 * Clean up expired rate limit entries
 */
setInterval(() => {
  const now = Date.now();
  for (const [key, data] of rateLimitStore.entries()) {
    if (now > data.resetTime) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000); // Clean up every 5 minutes