import crypto from 'crypto';
import bcrypt from 'bcryptjs';

// Security constants
export const SECURITY_CONSTRAINTS = {
  // Password constraints
  MIN_PASSWORD_LENGTH: 8,
  MAX_PASSWORD_LENGTH: 128,
  PASSWORD_SALT_ROUNDS: 12,

  // Token constraints
  TOKEN_LENGTH: 32,
  TOKEN_EXPIRY: {
    ACCESS: 15 * 60, // 15 minutes
    REFRESH: 7 * 24 * 60 * 60, // 7 days
    RESET: 60 * 60, // 1 hour
    VERIFICATION: 24 * 60 * 60, // 24 hours
  },

  // Rate limiting
  MAX_LOGIN_ATTEMPTS: 5,
  LOCKOUT_DURATION: 15 * 60, // 15 minutes

  // Session constraints
  MAX_SESSIONS_PER_USER: 10,
  SESSION_TIMEOUT: 24 * 60 * 60, // 24 hours

  // File upload constraints
  MAX_FILE_SIZE: 5 * 1024 * 1024, // 5MB
  ALLOWED_FILE_TYPES: ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'],

  // Input constraints
  MAX_INPUT_LENGTH: 10000,
  MAX_URL_LENGTH: 2048,
};

// Hashing utilities
export const hashUtils = {
  // Hash password using bcrypt
  async hashPassword(password: string): Promise<string> {
    if (!password || password.length < SECURITY_CONSTRAINTS.MIN_PASSWORD_LENGTH) {
      throw new Error(`Password must be at least ${SECURITY_CONSTRAINTS.MIN_PASSWORD_LENGTH} characters`);
    }

    if (password.length > SECURITY_CONSTRAINTS.MAX_PASSWORD_LENGTH) {
      throw new Error(`Password cannot exceed ${SECURITY_CONSTRAINTS.MAX_PASSWORD_LENGTH} characters`);
    }

    try {
      return await bcrypt.hash(password, SECURITY_CONSTRAINTS.PASSWORD_SALT_ROUNDS);
    } catch (error) {
      throw new Error('Failed to hash password');
    }
  },

  // Verify password against hash
  async verifyPassword(password: string, hash: string): Promise<boolean> {
    try {
      return await bcrypt.compare(password, hash);
    } catch (error) {
      return false;
    }
  },

  // Generate secure hash for data
  hashData(data: string, algorithm: string = 'sha256'): string {
    return crypto.createHash(algorithm).update(data).digest('hex');
  },

  // Generate HMAC for data integrity
  createHMAC(data: string, secret: string, algorithm: string = 'sha256'): string {
    return crypto.createHmac(algorithm, secret).update(data).digest('hex');
  },

  // Verify HMAC
  verifyHMAC(data: string, hmac: string, secret: string, algorithm: string = 'sha256'): boolean {
    const expectedHMAC = this.createHMAC(data, secret, algorithm);
    return crypto.timingSafeEqual(Buffer.from(hmac, 'hex'), Buffer.from(expectedHMAC, 'hex'));
  },
};

// Token utilities
export const tokenUtils = {
  // Generate secure random token
  generateToken(length: number = SECURITY_CONSTRAINTS.TOKEN_LENGTH): string {
    return crypto.randomBytes(length).toString('hex');
  },

  // Generate UUID v4
  generateUUID(): string {
    return crypto.randomUUID();
  },

  // Generate session token
  generateSessionToken(): string {
    return this.generateToken(32);
  },

  // Generate email verification token
  generateEmailVerificationToken(): string {
    return this.generateToken(32);
  },

  // Generate password reset token
  generatePasswordResetToken(): string {
    return this.generateToken(32);
  },

  // Generate API key
  generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const randomPart = this.generateToken(16);
    return `fp_${timestamp}_${randomPart}`;
  },

  // Validate token format
  validateToken(token: string, expectedLength?: number): boolean {
    if (!token || typeof token !== 'string') {
      return false;
    }

    // Check for valid hex characters
    const hexRegex = /^[0-9a-f]+$/i;
    if (!hexRegex.test(token)) {
      return false;
    }

    // Check length if specified
    if (expectedLength && token.length !== expectedLength) {
      return false;
    }

    return true;
  },

  // Extract token from authorization header
  extractTokenFromHeader(authHeader: string | null): string | null {
    if (!authHeader) {
      return null;
    }

    // Bearer token format
    if (authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // Direct token
    return authHeader;
  },
};

// Input sanitization utilities
export const sanitizeUtils = {
  // Sanitize string input
  sanitizeString(input: any, maxLength?: number): string {
    if (typeof input !== 'string') {
      return '';
    }

    let sanitized = input.trim();

    // Remove potentially dangerous characters
    sanitized = sanitized.replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '');
    sanitized = sanitized.replace(/javascript:/gi, '');
    sanitized = sanitized.replace(/on\w+\s*=/gi, '');

    // Remove HTML tags
    sanitized = sanitized.replace(/<[^>]*>/g, '');

    // Normalize whitespace
    sanitized = sanitized.replace(/\s+/g, ' ');

    // Apply length limit
    if (maxLength && sanitized.length > maxLength) {
      sanitized = sanitized.substring(0, maxLength);
    }

    return sanitized;
  },

  // Sanitize email address
  sanitizeEmail(email: any): string {
    if (typeof email !== 'string') {
      return '';
    }

    const sanitized = email.toLowerCase().trim();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    return emailRegex.test(sanitized) ? sanitized : '';
  },

  // Sanitize phone number
  sanitizePhone(phone: any): string {
    if (typeof phone !== 'string') {
      return '';
    }

    // Remove all non-numeric characters except +, -, (, )
    const sanitized = phone.replace(/[^\d\+\-\(\)\s]/g, '').trim();

    // Basic phone number validation
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(sanitized) ? sanitized : '';
  },

  // Sanitize URL
  sanitizeURL(url: any): string {
    if (typeof url !== 'string') {
      return '';
    }

    const sanitized = url.trim();

    // Check for valid URL protocol
    try {
      const parsed = new URL(sanitized);
      if (!['http:', 'https:'].includes(parsed.protocol)) {
        return '';
      }

      // Limit URL length
      if (sanitized.length > SECURITY_CONSTRAINTS.MAX_URL_LENGTH) {
        return '';
      }

      return sanitized;
    } catch {
      return '';
    }
  },

  // Sanitize numeric input
  sanitizeNumber(input: any, min?: number, max?: number): number | null {
    const num = Number(input);

    if (isNaN(num) || !isFinite(num)) {
      return null;
    }

    if (min !== undefined && num < min) {
      return null;
    }

    if (max !== undefined && num > max) {
      return null;
    }

    return num;
  },

  // Sanitize boolean input
  sanitizeBoolean(input: any): boolean {
    if (typeof input === 'boolean') {
      return input;
    }

    if (typeof input === 'string') {
      const lower = input.toLowerCase();
      return lower === 'true' || lower === '1' || lower === 'yes';
    }

    if (typeof input === 'number') {
      return input === 1;
    }

    return Boolean(input);
  },

  // Sanitize array input
  sanitizeArray(input: any, itemSanitizer?: (item: any) => any): any[] {
    if (!Array.isArray(input)) {
      return [];
    }

    return input
      .filter(item => item !== null && item !== undefined)
      .map(item => itemSanitizer ? itemSanitizer(item) : item)
      .filter(item => item !== null && item !== undefined);
  },

  // Sanitize object input
  sanitizeObject(input: any, allowedKeys?: string[]): Record<string, any> {
    if (!input || typeof input !== 'object' || Array.isArray(input)) {
      return {};
    }

    const sanitized: Record<string, any> = {};

    for (const [key, value] of Object.entries(input)) {
      // Skip if key not in allowed list
      if (allowedKeys && !allowedKeys.includes(key)) {
        continue;
      }

      // Sanitize key name
      const sanitizedKey = this.sanitizeString(key, 100);
      if (!sanitizedKey) {
        continue;
      }

      // Sanitize value based on type
      if (typeof value === 'string') {
        sanitized[sanitizedKey] = this.sanitizeString(value, 1000);
      } else if (typeof value === 'number') {
        sanitized[sanitizedKey] = value;
      } else if (typeof value === 'boolean') {
        sanitized[sanitizedKey] = value;
      } else if (Array.isArray(value)) {
        sanitized[sanitizedKey] = value.slice(0, 100); // Limit array size
      }
    }

    return sanitized;
  },

  // Deep sanitize object
  deepSanitize(input: any, maxDepth: number = 10): any {
    if (maxDepth <= 0) {
      return null;
    }

    if (input === null || input === undefined) {
      return input;
    }

    if (typeof input === 'string') {
      return this.sanitizeString(input, 1000);
    }

    if (typeof input === 'number' || typeof input === 'boolean') {
      return input;
    }

    if (Array.isArray(input)) {
      return input
        .slice(0, 100) // Limit array size
        .map(item => this.deepSanitize(item, maxDepth - 1))
        .filter(item => item !== null);
    }

    if (typeof input === 'object') {
      const sanitized: Record<string, any> = {};
      const entries = Object.entries(input).slice(0, 100); // Limit object size

      for (const [key, value] of entries) {
        const sanitizedKey = this.sanitizeString(key, 100);
        if (sanitizedKey) {
          const sanitizedValue = this.deepSanitize(value, maxDepth - 1);
          if (sanitizedValue !== null) {
            sanitized[sanitizedKey] = sanitizedValue;
          }
        }
      }

      return sanitized;
    }

    return null;
  },
};

// Validation utilities
export const validationUtils = {
  // Validate password strength
  validatePasswordStrength(password: string): {
    isValid: boolean;
    score: number;
    feedback: string[];
  } {
    const feedback: string[] = [];
    let score = 0;

    // Length check
    if (password.length >= 8) {
      score += 1;
    } else {
      feedback.push('Password must be at least 8 characters');
    }

    if (password.length >= 12) {
      score += 1;
    }

    // Character variety checks
    if (/[a-z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include lowercase letters');
    }

    if (/[A-Z]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include uppercase letters');
    }

    if (/[0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include numbers');
    }

    if (/[^A-Za-z0-9]/.test(password)) {
      score += 1;
    } else {
      feedback.push('Include special characters');
    }

    // Common patterns
    if (!/(.)\1{2,}/.test(password)) {
      score += 1;
    } else {
      feedback.push('Avoid repeating characters');
    }

    if (!/0123|1234|2345|3456|4567|5678|6789|7890/.test(password)) {
      score += 1;
    } else {
      feedback.push('Avoid sequential numbers');
    }

    const isValid = score >= 6 && password.length >= SECURITY_CONSTRAINTS.MIN_PASSWORD_LENGTH;

    return { isValid, score, feedback };
  },

  // Validate email format
  isValidEmail(email: string): boolean {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  },

  // Validate phone number format
  isValidPhone(phone: string): boolean {
    const phoneRegex = /^\+?[\d\s\-\(\)]{10,}$/;
    return phoneRegex.test(phone);
  },

  // Validate UUID format
  isValidUUID(uuid: string): boolean {
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    return uuidRegex.test(uuid);
  },

  // Validate URL format
  isValidURL(url: string): boolean {
    try {
      const parsed = new URL(url);
      return ['http:', 'https:'].includes(parsed.protocol);
    } catch {
      return false;
    }
  },

  // Check for SQL injection patterns
  containsSQLInjection(input: string): boolean {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|EXEC|UNION|SCRIPT)\b)/i,
      /(--|\/\*|\*\/|;|'|")/,
      /(\b(OR|AND)\s+\d+\s*=\s*\d+)/i,
      /(\b(OR|AND)\s+['"]?\w+['"]?\s*=\s*['"]?\w+['"]?)/i,
    ];

    return sqlPatterns.some(pattern => pattern.test(input));
  },

  // Check for XSS patterns
  containsXSS(input: string): boolean {
    const xssPatterns = [
      /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
      /javascript:/gi,
      /on\w+\s*=/gi,
      /<iframe\b[^>]*>/gi,
      /<object\b[^>]*>/gi,
      /<embed\b[^>]*>/gi,
      /<link\b[^>]*>/gi,
      /<meta\b[^>]*>/gi,
    ];

    return xssPatterns.some(pattern => pattern.test(input));
  },

  // Validate file type
  isValidFileType(mimeType: string): boolean {
    return SECURITY_CONSTRAINTS.ALLOWED_FILE_TYPES.includes(mimeType);
  },

  // Validate file size
  isValidFileSize(size: number): boolean {
    return size > 0 && size <= SECURITY_CONSTRAINTS.MAX_FILE_SIZE;
  },
};

// Rate limiting utilities
export const rateLimitUtils = {
  // Generate rate limit key
  generateKey(identifier: string, action: string, window: string): string {
    return `rate_limit:${identifier}:${action}:${window}`;
  },

  // Check if rate limit exceeded
  isRateLimitExceeded(
    currentCount: number,
    maxCount: number,
    windowStart: number,
    windowDuration: number
  ): boolean {
    const now = Date.now();
    const windowEnd = windowStart + windowDuration;

    // Reset window if expired
    if (now >= windowEnd) {
      return false;
    }

    return currentCount >= maxCount;
  },

  // Calculate retry after time
  calculateRetryAfter(windowStart: number, windowDuration: number): number {
    const now = Date.now();
    const windowEnd = windowStart + windowDuration;
    return Math.max(0, Math.ceil((windowEnd - now) / 1000));
  },
};

// Encryption utilities
export const encryptionUtils = {
  // Encrypt sensitive data
  encrypt(text: string, key: string): string {
    try {
      const iv = crypto.randomBytes(16);
      const cipher = crypto.createCipher('aes-256-cbc', key);
      let encrypted = cipher.update(text, 'utf8', 'hex');
      encrypted += cipher.final('hex');
      return iv.toString('hex') + ':' + encrypted;
    } catch (error) {
      throw new Error('Encryption failed');
    }
  },

  // Decrypt sensitive data
  decrypt(encryptedText: string, key: string): string {
    try {
      const textParts = encryptedText.split(':');
      const iv = Buffer.from(textParts.shift()!, 'hex');
      const encrypted = textParts.join(':');
      const decipher = crypto.createDecipher('aes-256-cbc', key);
      let decrypted = decipher.update(encrypted, 'hex', 'utf8');
      decrypted += decipher.final('utf8');
      return decrypted;
    } catch (error) {
      throw new Error('Decryption failed');
    }
  },
};

// Audit logging utilities
export const auditUtils = {
  // Generate audit log entry
  createLogEntry(data: {
    userId: string;
    entityType: string;
    entityId: string;
    action: string;
    oldValue?: any;
    newValue?: any;
    ipAddress?: string;
    userAgent?: string;
  }): {
    id: string;
    timestamp: Date;
    ...data;
  } {
    return {
      id: tokenUtils.generateUUID(),
      timestamp: new Date(),
      ...data,
    };
  },

  // Sanitize audit data
  sanitizeAuditData(data: any): any {
    if (typeof data !== 'object' || data === null) {
      return data;
    }

    // Remove sensitive fields
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];
    const sanitized = { ...data };

    for (const field of sensitiveFields) {
      if (field in sanitized) {
        sanitized[field] = '[REDACTED]';
      }
    }

    return sanitized;
  },
};

// Export all security utilities
export const securityUtils = {
  hash: hashUtils,
  token: tokenUtils,
  sanitize: sanitizeUtils,
  validate: validationUtils,
  rateLimit: rateLimitUtils,
  encrypt: encryptionUtils,
  audit: auditUtils,
  SECURITY_CONSTRAINTS,
};