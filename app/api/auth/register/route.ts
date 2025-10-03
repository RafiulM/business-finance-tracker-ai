import { NextRequest, NextResponse } from 'next/server';
import { userService } from '@/lib/services/user-service';
import { auditService } from '@/lib/services/audit-service';
import { categoryService } from '@/lib/services/category-service';

export async function POST(request: NextRequest) {
  try {
    const {
      email,
      password,
      name,
      businessName,
      baseCurrency,
      timezone,
    } = await request.json();

    // Validate required fields
    if (!email || !password || !name) {
      return NextResponse.json(
        { error: 'Email, password, and name are required' },
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

    // Password validation
    if (password.length < 8) {
      return NextResponse.json(
        { error: 'Password must be at least 8 characters long' },
        { status: 400 }
      );
    }

    if (!/(?=.*[a-z])/.test(password) ||
        !/(?=.*[A-Z])/.test(password) ||
        !/(?=.*\d)/.test(password)) {
      return NextResponse.json(
        { error: 'Password must contain uppercase, lowercase, and numbers' },
        { status: 400 }
      );
    }

    // Name validation
    if (name.trim().length < 2) {
      return NextResponse.json(
        { error: 'Name must be at least 2 characters long' },
        { status: 400 }
      );
    }

    // Currency validation (if provided)
    if (baseCurrency && !/^[A-Z]{3}$/.test(baseCurrency)) {
      return NextResponse.json(
        { error: 'Base currency must be a valid 3-letter currency code' },
        { status: 400 }
      );
    }

    // Check if user already exists
    const existingUser = await userService.getUserByEmail(email);
    if (existingUser) {
      await auditService.createAuditLog({
        userId: 'anonymous',
        entityType: 'user',
        entityId: 'unknown',
        action: 'create',
        oldValue: null,
        newValue: { email, attempt: 'failed', reason: 'user_exists' },
        reason: 'Failed registration attempt - user already exists',
        ipAddress: request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
      });

      return NextResponse.json(
        { error: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // Hash password (in a real implementation)
    // const hashedPassword = await bcrypt.hash(password, 12);
    // For now, we'll store the password as-is (NOT RECOMMENDED FOR PRODUCTION)
    const hashedPassword = password; // TODO: Implement proper password hashing

    // Create user
    const user = await userService.createUserWithValidation({
      email,
      password: hashedPassword,
      name: name.trim(),
      businessName: businessName?.trim() || undefined,
      baseCurrency: baseCurrency || 'USD',
      timezone: timezone || 'UTC',
    });

    // Create default system categories for the new user
    await categoryService.createSystemCategories();

    // Log successful registration
    await auditService.createAuditLog({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'create',
      oldValue: null,
      newValue: {
        email: user.email,
        name: user.name,
        businessName: user.businessName,
        registrationTime: new Date().toISOString(),
      },
      reason: 'User registration successful',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
    });

    // Create session token
    const sessionToken = generateSessionToken(user.id);

    // Log login
    await auditService.createAuditLog({
      userId: user.id,
      entityType: 'user',
      entityId: user.id,
      action: 'login',
      oldValue: null,
      newValue: {
        email,
        loginTime: new Date().toISOString(),
        autoLoginAfterRegistration: true
      },
      reason: 'Automatic login after registration',
      ipAddress: request.ip || undefined,
      userAgent: request.headers.get('user-agent') || undefined,
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
        emailVerified: user.emailVerified,
      },
      session: sessionToken,
      message: 'Registration successful',
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
    console.error('Registration error:', error);

    // Handle specific validation errors from userService
    if (error instanceof Error) {
      if (error.message.includes('already exists')) {
        return NextResponse.json(
          { error: error.message },
          { status: 409 }
        );
      }

      if (error.message.includes('Invalid') ||
          error.message.includes('required') ||
          error.message.includes('must be')) {
        return NextResponse.json(
          { error: error.message },
          { status: 400 }
        );
      }
    }

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