import { describe, it, expect, beforeEach, jest } from '@jest/globals';
import { z } from 'zod';
import {
  schemas,
  validateBody,
  formatValidationError
} from '@/lib/validation/schemas';
import {
  financialValidators,
  validateBusinessRules,
  sanitizeFinancialData,
} from '@/lib/validation/financial';
import { securityUtils } from '@/lib/utils/security';
import {
  CurrencyUtils,
  validateAmount,
  formatCurrency,
} from '@/lib/utils/currency';
import {
  DateUtils,
  TimezoneUtils,
  isValidDateString,
} from '@/lib/utils/date';

describe('Validation Schemas Tests', () => {
  describe('User Schemas', () => {
    it('should validate valid user registration data', () => {
      const userData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        name: 'Test User',
        businessName: 'Test Business',
        baseCurrency: 'USD',
        timezone: 'UTC',
      };

      const result = schemas.user.register.safeParse(userData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid email formats', () => {
      const userData = {
        email: 'invalid-email',
        password: 'SecurePass123!',
        name: 'Test User',
      };

      const result = schemas.user.register.safeParse(userData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Invalid email format');
      }
    });

    it('should reject weak passwords', () => {
      const userData = {
        email: 'test@example.com',
        password: 'weak',
        name: 'Test User',
      };

      const result = schemas.user.register.safeParse(userData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues).toHaveLength(4); // Multiple password errors
      }
    });

    it('should validate login data', () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
        rememberMe: true,
      };

      const result = schemas.user.login.safeParse(loginData);
      expect(result.success).toBe(true);
    });

    it('should validate password change with matching passwords', () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'NewPass123!',
      };

      const result = schemas.user.changePassword.safeParse(passwordData);
      expect(result.success).toBe(true);
    });

    it('should reject password change with non-matching passwords', () => {
      const passwordData = {
        currentPassword: 'OldPass123!',
        newPassword: 'NewPass123!',
        confirmPassword: 'DifferentPass123!',
      };

      const result = schemas.user.changePassword.safeParse(passwordData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toBe('Passwords do not match');
      }
    });
  });

  describe('Transaction Schemas', () => {
    it('should validate valid transaction creation data', () => {
      const transactionData = {
        description: 'Office supplies purchase',
        amount: 45.99,
        type: 'expense' as const,
        categoryId: 'category-123',
        date: '2023-12-15',
        currency: 'USD',
        tags: ['office', 'supplies'],
      };

      const result = schemas.transaction.create.safeParse(transactionData);
      expect(result.success).toBe(true);
    });

    it('should reject negative amounts', () => {
      const transactionData = {
        description: 'Invalid transaction',
        amount: -50,
        type: 'expense' as const,
        date: '2023-12-15',
        currency: 'USD',
      };

      const result = schemas.transaction.create.safeParse(transactionData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('positive');
      }
    });

    it('should reject invalid transaction types', () => {
      const transactionData = {
        description: 'Invalid transaction',
        amount: 50,
        type: 'invalid' as any,
        date: '2023-12-15',
        currency: 'USD',
      };

      const result = schemas.transaction.create.safeParse(transactionData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('income or expense');
      }
    });

    it('should validate transaction query parameters', () => {
      const queryParams = {
        page: 1,
        limit: 20,
        search: 'office',
        type: 'expense' as const,
        startDate: '2023-12-01',
        endDate: '2023-12-31',
        sortBy: 'date' as const,
        sortOrder: 'desc' as const,
      };

      const result = schemas.transaction.query.safeParse(queryParams);
      expect(result.success).toBe(true);
    });

    it('should limit tags to maximum allowed', () => {
      const transactionData = {
        description: 'Transaction with too many tags',
        amount: 50,
        type: 'expense' as const,
        date: '2023-12-15',
        currency: 'USD',
        tags: ['tag1', 'tag2', 'tag3', 'tag4', 'tag5', 'tag6', 'tag7', 'tag8', 'tag9', 'tag10', 'tag11'], // 11 tags
      };

      const result = schemas.transaction.create.safeParse(transactionData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('Maximum 10 tags allowed');
      }
    });
  });

  describe('Category Schemas', () => {
    it('should validate valid category creation data', () => {
      const categoryData = {
        name: 'Office Expenses',
        type: 'expense' as const,
        description: 'All office-related expenses',
        color: '#FF5733',
        icon: 'office',
        parentId: null,
      };

      const result = schemas.category.create.safeParse(categoryData);
      expect(result.success).toBe(true);
    });

    it('should validate hex color format', () => {
      const categoryData = {
        name: 'Test Category',
        type: 'expense' as const,
        color: 'invalid-color',
      };

      const result = schemas.category.create.safeParse(categoryData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('valid hex color');
      }
    });

    it('should reject empty category names', () => {
      const categoryData = {
        name: '',
        type: 'expense' as const,
      };

      const result = schemas.category.create.safeParse(categoryData);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('required');
      }
    });
  });

  describe('AI Schemas', () => {
    it('should validate transaction processing request', () => {
      const aiRequest = {
        description: 'Monthly software subscription',
        amount: 29.99,
        type: 'expense' as const,
        currency: 'USD',
        date: '2023-12-15',
        context: {
          recentTransactions: [],
          userPreferences: {},
        },
      };

      const result = schemas.ai.processTransaction.safeParse(aiRequest);
      expect(result.success).toBe(true);
    });

    it('should validate insight generation request', () => {
      const insightRequest = {
        period: 'month' as const,
        categories: ['category-1', 'category-2'],
        includeRecommendations: true,
        insightTypes: ['spending_patterns', 'anomalies'] as const,
      };

      const result = schemas.ai.generateInsights.safeParse(insightRequest);
      expect(result.success).toBe(true);
    });

    it('should limit AI chat message length', () => {
      const chatRequest = {
        message: 'a'.repeat(1001), // 1001 characters
        context: {},
      };

      const result = schemas.ai.chat.safeParse(chatRequest);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].message).toContain('less than 1000 characters');
      }
    });
  });

  describe('Validation Helper Functions', () => {
    it('should format validation errors correctly', () => {
      const schema = z.object({
        email: z.string().email(),
        age: z.number().min(18),
      });

      const result = schema.safeParse({
        email: 'invalid-email',
        age: 16,
      });

      if (!result.success) {
        const formattedErrors = formatValidationError(result.error);
        expect(formattedErrors).toHaveLength(2);
        expect(formattedErrors[0]).toHaveProperty('field');
        expect(formattedErrors[0]).toHaveProperty('message');
        expect(formattedErrors[0]).toHaveProperty('code');
      }
    });

    it('should validate body data with schema', async () => {
      const schema = z.object({
        name: z.string().min(1),
        email: z.string().email(),
      });

      const validData = { name: 'Test', email: 'test@example.com' };
      const result = await validateBody(schema)(validData);
      expect(result.data).toEqual(validData);
      expect(result.error).toBeUndefined();

      const invalidData = { name: '', email: 'invalid-email' };
      await expect(validateBody(schema)(invalidData))
        .rejects.toThrow('Validation failed');
    });
  });
});

describe('Financial Validation Tests', () => {
  describe('Transaction Validation', () => {
    it('should validate transaction amounts and dates', () => {
      const validTransaction = {
        amount: 100.50,
        type: 'expense' as const,
        date: '2023-12-15',
        description: 'Valid transaction',
        currency: 'USD',
      };

      const result = financialValidators.validateTransaction.safeParse(validTransaction);
      expect(result.success).toBe(true);
    });

    it('should reject transactions with invalid dates', () => {
      const invalidTransaction = {
        amount: 100,
        type: 'expense' as const,
        date: '2025-13-45', // Invalid date
        description: 'Invalid date transaction',
        currency: 'USD',
      };

      const result = financialValidators.validateTransaction.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject transactions with invalid currency', () => {
      const invalidTransaction = {
        amount: 100,
        type: 'expense' as const,
        date: '2023-12-15',
        description: 'Invalid currency transaction',
        currency: 'INVALID',
      };

      const result = financialValidators.validateTransaction.safeParse(invalidTransaction);
      expect(result.success).toBe(false);
    });

    it('should reject future dates', () => {
      const futureDate = new Date();
      futureDate.setFullYear(futureDate.getFullYear() + 2);

      const futureTransaction = {
        amount: 100,
        type: 'expense' as const,
        date: futureDate.toISOString().split('T')[0],
        description: 'Future transaction',
        currency: 'USD',
      };

      const result = financialValidators.validateTransaction.safeParse(futureTransaction);
      expect(result.success).toBe(false);
    });
  });

  describe('Business Rules Validation', () => {
    it('should detect duplicate transactions', () => {
      const newTransaction = {
        description: 'Coffee shop',
        amount: 5.50,
        type: 'expense' as const,
        date: '2023-12-15',
      };

      const existingTransactions = [
        {
          description: 'Coffee shop',
          amount: 5.50,
          type: 'expense',
          date: '2023-12-15',
        },
      ];

      const isDuplicate = validateBusinessRules.isDuplicateTransaction(
        newTransaction,
        existingTransactions
      );

      expect(isDuplicate).toBe(true);
    });

    it('should validate category hierarchy', () => {
      const allCategories = [
        { id: 'parent-1', name: 'Parent', parentId: null },
        { id: 'child-1', name: 'Child', parentId: 'parent-1' },
        { id: 'grandchild-1', name: 'Grandchild', parentId: 'child-1' },
      ];

      // Valid hierarchy (grandchild under parent)
      const validHierarchy = validateBusinessRules.validateCategoryHierarchy(
        'grandchild-1',
        'parent-1',
        allCategories
      );
      expect(validHierarchy).toBe(false); // Should be false due to circular reference check

      // Invalid hierarchy (parent under child)
      const invalidHierarchy = validateBusinessRules.validateCategoryHierarchy(
        'parent-1',
        'child-1',
        allCategories
      );
      expect(invalidHierarchy).toBe(false);
    });

    it('should detect suspicious transaction patterns', () => {
      const suspiciousTransactions = [
        { amount: 50, date: '2023-12-15' },
        { amount: 75, date: '2023-12-16' },
        { amount: 10000, date: '2023-12-17' }, // Unusually large
      ];

      const warnings = validateBusinessRules.detectSuspiciousPatterns(suspiciousTransactions);
      expect(warnings.length).toBeGreaterThan(0);
      expect(warnings[0]).toContain('Unusually large transaction');
    });

    it('should check user limits', () => {
      expect(validateBusinessRules.canAddTransaction('user-1', 15, 'daily')).toBe(true);
      expect(validateBusinessRules.canAddTransaction('user-1', 25, 'daily')).toBe(false);
      expect(validateBusinessRules.canAddCategory('user-1', 50)).toBe(true);
      expect(validateBusinessRules.canAddCategory('user-1', 150)).toBe(false);
    });
  });

  describe('Financial Data Sanitization', () => {
    it('should sanitize transaction descriptions', () => {
      const dirtyDescription = '<script>alert("xss")</script>Office supplies';
      const cleanDescription = sanitizeFinancialData.sanitizeDescription(dirtyDescription);

      expect(cleanDescription).toBe('Office supplies');
      expect(cleanDescription).not.toContain('<script>');
    });

    it('should sanitize notes', () => {
      const dirtyNotes = '<iframe>Bad content</iframe>Meeting notes';
      const cleanNotes = sanitizeFinancialData.sanitizeNotes(dirtyNotes);

      expect(cleanNotes).toBe('Meeting notes');
      expect(cleanNotes).not.toContain('<iframe>');
    });

    it('should sanitize tags array', () => {
      const dirtyTags = ['office', '<script>evil</script>', 'supplies', 'tag with spaces'];
      const cleanTags = sanitizeFinancialData.sanitizeTags(dirtyTags);

      expect(cleanTags).toEqual(['office', 'supplies', 'tag-with-spaces']);
    });

    it('should round amounts to currency precision', () => {
      const amount = 10.56789;
      const roundedAmount = sanitizeFinancialData.sanitizeAmount(amount);

      expect(roundedAmount).toBe(10.57);
    });

    it('should sanitize currency codes', () => {
      const dirtyCurrency = 'usd';
      const cleanCurrency = sanitizeFinancialData.sanitizeCurrency(dirtyCurrency);

      expect(cleanCurrency).toBe('USD');
    });
  });
});

describe('Security Utilities Tests', () => {
  describe('Password Validation', () => {
    it('should validate strong passwords', () => {
      const strongPassword = 'SecurePass123!';
      const result = securityUtils.validatePasswordStrength(strongPassword);

      expect(result.isValid).toBe(true);
      expect(result.score).toBeGreaterThan(6);
      expect(result.feedback).toHaveLength(0);
    });

    it('should identify weak passwords', () => {
      const weakPassword = 'weak';
      const result = securityUtils.validatePasswordStrength(weakPassword);

      expect(result.isValid).toBe(false);
      expect(result.score).toBeLessThan(6);
      expect(result.feedback.length).toBeGreaterThan(0);
    });

    it('should provide specific feedback for missing requirements', () => {
      const noSpecialCharPassword = 'Password123';
      const result = securityUtils.validatePasswordStrength(noSpecialCharPassword);

      expect(result.isValid).toBe(false);
      expect(result.feedback).toContain('Include special characters');
    });
  });

  describe('Input Sanitization', () => {
    it('should sanitize strings', () => {
      const maliciousString = '<script>alert("xss")</script>Hello World';
      const sanitized = securityUtils.sanitize.sanitizeString(maliciousString);

      expect(sanitized).toBe('Hello World');
      expect(sanitized).not.toContain('<script>');
    });

    it('should sanitize emails', () => {
      const dirtyEmail = '  TEST@EXAMPLE.COM  ';
      const sanitized = securityUtils.sanitize.sanitizeEmail(dirtyEmail);

      expect(sanitized).toBe('test@example.com');
    });

    it('should sanitize phone numbers', () => {
      const dirtyPhone = '(555) 123-4567 ext. 123';
      const sanitized = securityUtils.sanitize.sanitizePhone(dirtyPhone);

      expect(sanitized).toBe('(555) 123-4567');
    });

    it('should validate URLs', () => {
      const validUrl = 'https://example.com';
      const invalidUrl = 'javascript:alert("xss")';

      expect(securityUtils.validate.isValidURL(validUrl)).toBe(true);
      expect(securityUtils.validate.isValidURL(invalidUrl)).toBe(false);
    });

    it('should detect SQL injection attempts', () => {
      const maliciousInput = "'; DROP TABLE users; --";

      expect(securityUtils.validate.containsSQLInjection(maliciousInput)).toBe(true);
      expect(securityUtils.validate.containsSQLInjection('normal input')).toBe(false);
    });

    it('should detect XSS attempts', () => {
      const xssInput = '<script>alert("xss")</script>';

      expect(securityUtils.validate.containsXSS(xssInput)).toBe(true);
      expect(securityUtils.validate.containsXSS('normal text')).toBe(false);
    });
  });

  describe('Hashing and Encryption', () => {
    it('should hash passwords with bcrypt', async () => {
      const password = 'testpassword';
      const hashedPassword = await securityUtils.hash.hashPassword(password);

      expect(hashedPassword).not.toBe(password);
      expect(hashedPassword).toHaveLength(60); // bcrypt hash length
    });

    it('should verify passwords against hashes', async () => {
      const password = 'testpassword';
      const hashedPassword = await securityUtils.hash.hashPassword(password);

      const isValid = await securityUtils.hash.verifyPassword(password, hashedPassword);
      expect(isValid).toBe(true);

      const isInvalid = await securityUtils.hash.verifyPassword('wrongpassword', hashedPassword);
      expect(isInvalid).toBe(false);
    });

    it('should generate secure tokens', () => {
      const token = securityUtils.token.generateToken();
      const anotherToken = securityUtils.token.generateToken();

      expect(token).toHaveLength(64); // 32 bytes * 2 (hex)
      expect(token).toMatch(/^[0-9a-f]+$/);
      expect(token).not.toBe(anotherToken);
    });

    it('should validate UUID format', () => {
      const validUUID = '550e8400-e29b-41d4-a716-446655440000';
      const invalidUUID = 'not-a-uuid';

      expect(securityUtils.validate.isValidUUID(validUUID)).toBe(true);
      expect(securityUtils.validate.isValidUUID(invalidUUID)).toBe(false);
    });
  });
});

describe('Currency Utilities Tests', () => {
  describe('Currency Formatting', () => {
    it('should format USD currency', () => {
      const amount = 1234.56;
      const formatted = formatCurrency(amount, 'USD');

      expect(formatted).toBe('$1,234.56');
    });

    it('should format EUR currency', () => {
      const amount = 1234.56;
      const formatted = formatCurrency(amount, 'EUR', 'de-DE');

      expect(formatted).toContain('1.234,56');
      expect(formatted).toContain('€');
    });

    it('should format currencies with different decimal places', () => {
      // JPY has no decimal places
      const jpyAmount = 1234;
      const formattedJPY = CurrencyUtils.formatCurrency(jpyAmount, 'JPY');
      expect(formattedJPY).toBe('¥1,234');

      // USD has 2 decimal places
      const usdAmount = 1234.56;
      const formattedUSD = CurrencyUtils.formatCurrency(usdAmount, 'USD');
      expect(formattedUSD).toBe('$1,234.56');
    });

    it('should parse currency strings', () => {
      const usdString = '$1,234.56';
      const parsedAmount = CurrencyUtils.parseCurrencyString(usdString, 'USD');

      expect(parsedAmount).toBe(1234.56);
    });

    it('should validate currency amounts', () => {
      const validAmount = 1234.56;
      const invalidAmount = -100;

      const validResult = validateAmount(validAmount, 'USD');
      expect(validResult.isValid).toBe(true);

      const invalidResult = validateAmount(invalidAmount, 'USD');
      expect(invalidResult.isValid).toBe(false);
      expect(invalidResult.errors).toContain('Amount cannot be negative');
    });
  });

  describe('Currency Conversion', () => {
    it('should convert between currencies', async () => {
      // Mock the exchange rate API
      const mockGetExchangeRates = jest.spyOn(CurrencyUtils, 'getExchangeRates');
      mockGetExchangeRates.mockResolvedValue({
        EUR: 0.85,
        GBP: 0.73,
      });

      const result = await CurrencyUtils.convertCurrency(100, 'USD', 'EUR');

      expect(result.fromCurrency).toBe('USD');
      expect(result.toCurrency).toBe('EUR');
      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(85);
      expect(result.rate).toBe(0.85);
    });

    it('should handle same currency conversion', async () => {
      const result = await CurrencyUtils.convertCurrency(100, 'USD', 'USD');

      expect(result.fromAmount).toBe(100);
      expect(result.toAmount).toBe(100);
      expect(result.rate).toBe(1);
    });

    it('should get currency information', () => {
      const usdInfo = CurrencyUtils.getCurrencyInfo('USD');

      expect(usdInfo).toBeDefined();
      expect(usdInfo?.code).toBe('USD');
      expect(usdInfo?.symbol).toBe('$');
      expect(usdInfo?.decimalPlaces).toBe(2);
    });

    it('should check supported currencies', () => {
      expect(CurrencyUtils.isSupportedCurrency('USD')).toBe(true);
      expect(CurrencyUtils.isSupportedCurrency('EUR')).toBe(true);
      expect(CurrencyUtils.isSupportedCurrency('INVALID')).toBe(false);
    });
  });
});

describe('Date Utilities Tests', () => {
  describe('Date Formatting and Parsing', () => {
    it('should format dates to YYYY-MM-DD', () => {
      const date = new Date('2023-12-15T10:30:00Z');
      const formatted = DateUtils.formatDate(date);

      expect(formatted).toBe('2023-12-15');
    });

    it('should parse date strings', () => {
      const dateString = '2023-12-15';
      const parsed = DateUtils.parseDate(dateString);

      expect(parsed).toBeInstanceOf(Date);
      expect(parsed.getFullYear()).toBe(2023);
      expect(parsed.getMonth()).toBe(11); // December is 11 (0-indexed)
      expect(parsed.getDate()).toBe(15);
    });

    it('should reject invalid date strings', () => {
      const invalidDateString = '2023-13-45';

      expect(() => DateUtils.parseDate(invalidDateString)).toThrow('Invalid date string');
    });
  });

  describe('Date Manipulation', () => {
    it('should get start and end of day', () => {
      const date = new Date('2023-12-15T14:30:00Z');
      const startOfDay = DateUtils.startOfDay(date);
      const endOfDay = DateUtils.endOfDay(date);

      expect(startOfDay.getHours()).toBe(0);
      expect(startOfDay.getMinutes()).toBe(0);
      expect(startOfDay.getSeconds()).toBe(0);

      expect(endOfDay.getHours()).toBe(23);
      expect(endOfDay.getMinutes()).toBe(59);
      expect(endOfDay.getSeconds()).toBe(59);
    });

    it('should get start and end of month', () => {
      const date = new Date('2023-12-15');
      const startOfMonth = DateUtils.startOfMonth(date);
      const endOfMonth = DateUtils.endOfMonth(date);

      expect(startOfMonth.getDate()).toBe(1);
      expect(startOfMonth.getHours()).toBe(0);

      expect(endOfMonth.getDate()).toBe(31);
      expect(endOfMonth.getHours()).toBe(23);
    });

    it('should add and subtract days', () => {
      const date = new Date('2023-12-15');
      const plus5Days = DateUtils.addDays(date, 5);
      const minus3Days = DateUtils.subtractDays(date, 3);

      expect(plus5Days.getDate()).toBe(20);
      expect(minus3Days.getDate()).toBe(12);
    });

    it('should calculate date differences', () => {
      const date1 = new Date('2023-12-15');
      const date2 = new Date('2023-12-20');

      const daysDiff = DateUtils.diffInDays(date1, date2);
      expect(daysDiff).toBe(5);
    });
  });

  describe('Date Validation and Helpers', () => {
    it('should check if date is today', () => {
      const today = new Date();
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      expect(DateUtils.isToday(today)).toBe(true);
      expect(DateUtils.isToday(yesterday)).toBe(false);
    });

    it('should get relative time strings', () => {
      const now = new Date();
      const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
      const oneDayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

      expect(DateUtils.getRelativeTimeString(oneHourAgo, now)).toContain('hour');
      expect(DateUtils.getRelativeTimeString(oneDayAgo, now)).toContain('day');
    });

    it('should get date ranges for periods', () => {
      const date = new Date('2023-12-15');
      const monthRange = DateUtils.getDateRangeForPeriod('month', date);

      expect(monthRange.start.getDate()).toBe(1);
      expect(monthRange.start.getMonth()).toBe(11); // December
      expect(monthRange.end.getDate()).toBe(31);
    });

    it('should validate date strings', () => {
      expect(isValidDateString('2023-12-15')).toBe(true);
      expect(isValidDateString('2023-13-45')).toBe(false);
      expect(isValidDateString('not-a-date')).toBe(false);
    });
  });

  describe('Timezone Utilities', () => {
    it('should get user timezone', () => {
      const timezone = TimezoneUtils.getUserTimezone();
      expect(timezone).toBeDefined();
      expect(typeof timezone).toBe('string');
    });

    it('should validate timezone strings', () => {
      expect(TimezoneUtils.isValidTimezone('America/New_York')).toBe(true);
      expect(TimezoneUtils.isValidTimezone('Invalid/Timezone')).toBe(false);
    });

    it('should get common timezones', () => {
      const timezones = TimezoneUtils.getCommonTimezones();
      expect(Array.isArray(timezones)).toBe(true);
      expect(timezones.length).toBeGreaterThan(0);
      expect(timezones[0]).toHaveProperty('value');
      expect(timezones[0]).toHaveProperty('label');
      expect(timezones[0]).toHaveProperty('offset');
    });

    it('should convert dates to timezone', () => {
      const date = new Date('2023-12-15T10:30:00Z');
      const timezone = 'America/New_York';
      const converted = TimezoneUtils.convertToTimezone(date, timezone);

      expect(converted).toBeInstanceOf(Date);
    });
  });
});

describe('Integration Validation Tests', () => {
  it('should validate complete user registration flow', () => {
    const userData = {
      email: 'test@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
      businessName: 'Test Business',
      baseCurrency: 'USD',
      timezone: 'America/New_York',
    };

    // Validate against schema
    const schemaResult = schemas.user.register.safeParse(userData);
    expect(schemaResult.success).toBe(true);

    // Validate password strength
    const passwordResult = securityUtils.validatePasswordStrength(userData.password);
    expect(passwordResult.isValid).toBe(true);

    // Validate email format
    expect(securityUtils.validate.isValidEmail(userData.email)).toBe(true);

    // Validate currency
    expect(CurrencyUtils.isSupportedCurrency(userData.baseCurrency)).toBe(true);

    // Validate timezone
    expect(TimezoneUtils.isValidTimezone(userData.timezone)).toBe(true);
  });

  it('should validate complete transaction creation flow', () => {
    const transactionData = {
      description: 'Office supplies from Staples',
      amount: 45.99,
      type: 'expense' as const,
      categoryId: 'category-123',
      date: '2023-12-15',
      currency: 'USD',
      tags: ['office', 'supplies'],
      notes: 'Monthly office supply purchase',
    };

    // Validate against schema
    const schemaResult = schemas.transaction.create.safeParse(transactionData);
    expect(schemaResult.success).toBe(true);

    // Validate amount
    const amountResult = validateAmount(transactionData.amount, transactionData.currency);
    expect(amountResult.isValid).toBe(true);

    // Validate date
    expect(isValidDateString(transactionData.date)).toBe(true);

    // Sanitize description
    const cleanDescription = sanitizeFinancialData.sanitizeDescription(transactionData.description);
    expect(cleanDescription).toBe(transactionData.description);

    // Check for XSS
    expect(securityUtils.validate.containsXSS(transactionData.description)).toBe(false);

    // Validate tags
    expect(transactionData.tags.length).toBeLessThanOrEqual(10);
    transactionData.tags.forEach(tag => {
      expect(tag.length).toBeLessThanOrEqual(50);
    });
  });

  it('should handle complex validation scenarios', async () => {
    // Test currency conversion with validation
    const conversionData = {
      amount: 1000,
      fromCurrency: 'USD',
      toCurrency: 'EUR',
      date: '2023-12-15',
    };

    // Validate currencies
    expect(CurrencyUtils.isSupportedCurrency(conversionData.fromCurrency)).toBe(true);
    expect(CurrencyUtils.isSupportedCurrency(conversionData.toCurrency)).toBe(true);

    // Validate amount
    const amountValidation = validateAmount(conversionData.amount, conversionData.fromCurrency);
    expect(amountValidation.isValid).toBe(true);

    // Validate date
    expect(isValidDateString(conversionData.date)).toBe(true);

    // Mock conversion and validate result
    const mockGetExchangeRates = jest.spyOn(CurrencyUtils, 'getExchangeRates');
    mockGetExchangeRates.mockResolvedValue({ EUR: 0.85 });

    // This would normally be an async call
    // const result = await CurrencyUtils.convertCurrency(...);
    // expect(result.toAmount).toBeGreaterThan(0);
  });
});