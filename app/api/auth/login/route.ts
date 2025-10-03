import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    // Validate input
    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password are required' },
        { status: 400 }
      );
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return NextResponse.json(
        { error: 'Invalid email format' },
        { status: 400 }
      );
    }

    // Get user by email
    const user = await userService.getUserByEmail(email);
    if (!user) {
      // Log failed login attempt
      await auditService.createAuditLog({
        userId: 'anonymous',
        entityType: 'user',
        entityId: 'unknown',
        action: 'login',
        oldValue: null,
        newValue: { email, attempt: 'failed', reason: 'user_not_found' },
        reason: 'Failed login attempt - user not found',
        ipAddress: request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        { error: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // In a real implementation, you would verify the password hash
    // For now, we'll assume password validation is handled elsewhere
    // TODO: Implement proper password verification with bcrypt

    // Check if user email is verified
    if (!user.emailVerified) {
      await auditService.createAuditLog({
        userId: user.id,
        entityType: 'user',
        entityId: user.id,
        action: 'login',
        oldValue: null,
        newValue: { email, attempt: 'failed', reason: 'email_not_verified' },
        reason: 'Failed login attempt - email not verified',
        ipAddress: request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        { error: 'Please verify your email before logging in' },
        { status: 403 }
      );
    }

    // Create session token (in a real app, use JWT or session management)
    const sessionToken = generateSessionToken(user.id);

    // Log successful login
    await auditService.createAuditLog({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      oldValue: null,
      newValue: { email, loginTime: new Date().toISOString() },
      reason: 'Successful login',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Update user with last login time
    await userService.updateUser(user.id, {
      // This would need to be added to the user schema
      // lastLoginAt: new Date(),
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        baseCurrency: user.baseCurrency,
        timezone: user.timezone,
        preferences: user.preferences,
      },
      session: sessionToken,
      message: 'Login successful',
    });

    // Set HTTP-only cookie for session token
    response.cookies.set('session-token', sessionToken, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'strict',
      maxAge: 60 * 60 * 24 * 7, // 7 days
      path: '/',
    });

    return response;

  } catch (error) {
    console.error('Login error:', error);

    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Generate a session token (simplified implementation)
 * In a real application, use proper JWT signing
 */
function generateSessionToken(userId: string): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2);
  return Buffer.from(`${userId}:${timestamp}:${random}`).toString('base64');
}