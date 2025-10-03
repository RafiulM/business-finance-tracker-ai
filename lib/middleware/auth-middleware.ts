import { NextRequest, NextResponse } from 'next/server';
import { jwt } from 'jsonwebtoken';
import { db } from '@/db';
import { user, session } from '@/db/schema';
import { eq, and, isNull } from 'drizzle-orm';
import { createId } from '@/db/utils/ids';

// JWT Secret (should be stored in environment variables)
const JWT_SECRET = process.env.JWT_SECRET || 'your-super-secret-jwt-key-change-in-production';
const TOKEN_EXPIRY = 7 * 24 * 60 * 60; // 7 days

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  businessName?: string;
  baseCurrency: string;
  timezone: string;
  preferences: any;
  emailVerified: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export interface SessionData {
  userId: string;
  token: string;
  expiresAt: Date;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthMiddleware {
  /**
   * Create JWT token for user
   */
  static createToken(user: AuthUser): string {
    const payload = {
      userId: user.id,
      email: user.email,
      name: user.name,
    };

    return jwt.sign(payload, JWT_SECRET, {
      expiresIn: `${TOKEN_EXPIRY}s`,
      issuer: 'finance-tracker',
      audience: 'finance-tracker-users',
    });
  }

  /**
   * Verify JWT token
   */
  static verifyToken(token: string): {
    userId: string;
    email: string;
    name: string;
    iat: number;
    exp: number;
  } {
    try {
      const decoded = jwt.verify(token, JWT_SECRET, {
        issuer: 'finance-tracker',
        audience: 'finance-tracker-users',
      }) as any;

      return {
        userId: decoded.userId,
        email: decoded.email,
        name: decoded.name,
        iat: decoded.iat,
        exp: decoded.exp,
      };
    } catch (error) {
      throw new Error('Invalid or expired token');
    }
  }

  /**
   * Extract token from request
   */
  static extractToken(request: NextRequest): string | null {
    // Try to get token from Authorization header
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Try to get token from cookie
    const tokenCookie = request.cookies.get('session-token')?.value;
    if (tokenCookie) {
      return tokenCookie;
    }

    return null;
  }

  /**
   * Validate user session
   */
  static async validateSession(request: NextRequest): Promise<{
    user: AuthUser;
    session: SessionData;
  }> {
    const token = this.extractToken(request);
    if (!token) {
      throw new Error('No authentication token provided');
    }

    // Verify token
    const tokenData = this.verifyToken(token);

    // Check if token is expired
    const now = Math.floor(Date.now() / 1000);
    if (tokenData.exp < now) {
      throw new Error('Token has expired');
    }

    // Get user from database
    const [userData] = await db
      .select()
      .from(user)
      .where(and(
        eq(user.id, tokenData.userId),
        isNull(user.deletedAt)
      ))
      .limit(1);

    if (!userData) {
      throw new Error('User not found');
    }

    // Check if user email is verified (if required)
    if (!userData.emailVerified) {
      throw new Error('Email not verified');
    }

    // Check if session exists and is valid
    const [sessionData] = await db
      .select()
      .from(session)
      .where(
        and(
          eq(session.token, token),
          eq(session.userId, userData.id),
          isNull(session.deletedAt)
        )
      )
      .limit(1);

    if (!sessionData) {
      throw new Error('Invalid session');
    }

    // Check if session has expired
    if (sessionData.expiresAt < new Date()) {
      // Clean up expired session
      await db
        .update(session)
        .set({ deletedAt: new Date() })
        .where(eq(session.token, token));

      throw new Error('Session has expired');
    }

    return {
      user: userData,
      session: {
        userId: sessionData.userId,
        token: sessionData.token,
        expiresAt: sessionData.expiresAt,
        ipAddress: sessionData.ipAddress,
        userAgent: sessionData.userAgent,
      },
    };
  }

  /**
   * Create session for user
   */
  static async createSession(
    user: AuthUser,
    request: NextRequest
  ): Promise<SessionData> {
    const token = this.createToken(user);
    const expiresAt = new Date(Date.now() + TOKEN_EXPIRY * 1000);

    // Clean up old sessions for this user
    await db
      .update(session)
      .set({ deletedAt: new Date() })
      .where(
        and(
          eq(session.userId, user.id),
          isNull(session.deletedAt)
        )
      );

    // Create new session
    const [newSession] = await db
      .insert(session)
      .values({
        id: createId(),
        userId: user.id,
        token,
        expiresAt,
        ipAddress: request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning();

    return {
      userId: newSession.userId,
      token: newSession.token,
      expiresAt: newSession.expiresAt,
      ipAddress: newSession.ipAddress,
      userAgent: newSession.userAgent,
    };
  }

  /**
   * Update session activity
   */
  static async updateSessionActivity(
    token: string,
    request: NextRequest
  ): Promise<void> {
    try {
      await db
        .update(session)
        .set({
          ipAddress: request.ip || undefined,
          userAgent: request.headers.get('user-agent') || undefined,
          updatedAt: new Date(),
        })
        .where(eq(session.token, token));
    } catch (error) {
      console.error('Failed to update session activity:', error);
      // Don't throw error for activity updates
    }
  }

  /**
   * Invalidate session
   */
  static async invalidateSession(token: string): Promise<void> {
    await db
      .update(session)
      .set({ deletedAt: new Date() })
      .where(eq(session.token, token));
  }

  /**
   * Invalidate all sessions for a user
   */
  static async invalidateAllUserSessions(userId: string): Promise<void> {
    await db
      .update(session)
      .set({ deletedAt: new Date() })
      where(eq(session.userId, userId));
  }

  /**
   * Clean up expired sessions
   */
  static async cleanupExpiredSessions(): Promise<number> {
    const result = await db
      .update(session)
      .set({ deletedAt: new Date() })
      .where(and(
        isNull(session.deletedAt),
        // Sessions that have expired
        `(expires_at < NOW())`
      ));

    return result.rowCount || 0;
  }

  /**
   * Get active session count for user
   */
  static async getActiveSessionCount(userId: string): Promise<number> {
    const [result] = await db
      .select({ count: session.id })
      .from(session)
      .where(
        and(
          eq(session.userId, userId),
          isNull(session.deletedAt),
          // Sessions that haven't expired
          `(expires_at >= NOW())`
        )
      );

    return Number(result.count);
  }

  /**
   * Middleware function for Next.js
   */
  static middleware() {
    return async (request: NextRequest) => {
      try {
        // For now, return early to avoid issues
        // In a real implementation, this would validate the request
        const token = this.extractToken(request);
        if (!token) {
          return NextResponse.json(
            { error: 'Authentication required' },
            { status: 401 }
          );
        }

        // Verify token
        const tokenData = this.verifyToken(token);

        // Check if token is expired
        const now = Math.floor(Date.now() / 1000);
        if (tokenData.exp < now) {
          return NextResponse.json(
            { error: 'Token expired' },
            { status: 401 }
          );
        }

        // Update session activity (async, don't wait)
        this.updateSessionActivity(token, request).catch(console.error);

        // Return success - the actual validation will be done in route handlers
        return NextResponse.json({ authenticated: true });

      } catch (error) {
        console.error('Authentication middleware error:', error);
        return NextResponse.json(
          { error: error instanceof Error ? error.message : 'Authentication failed' },
          { status: 401 }
        );
      }
    };
  }

  /**
   * Rate limiting helper
   */
  static async checkRateLimit(
    userId: string,
    action: string,
    maxRequests: number = 100,
    windowMinutes: number = 60
  ): Promise<{ allowed: boolean; remaining: number; resetTime?: number }> {
    const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000);

    // In a real implementation, you would use a proper rate limiting store
    // For now, return allowed (no rate limiting)
    return {
      allowed: true,
      remaining: maxRequests,
    };
  }

  /**
   * Check user permissions
   */
  static hasPermission(
    user: AuthUser,
    resource: string,
    action: string
  ): boolean {
    // Basic permission check
    // In a real implementation, you would check user roles and permissions

    // All authenticated users can access their own data
    if (resource.startsWith('/user/') || resource.startsWith('/dashboard/')) {
      return true;
    }

    // All authenticated users can read most data
    if (action === 'read') {
      return true;
    }

    // Admin permissions (if implemented)
    if (user.email?.includes('admin') || user.email?.includes('support')) {
      return true;
    }

    return false;
  }
}

// Export middleware instance
export const authMiddleware = AuthMiddleware;