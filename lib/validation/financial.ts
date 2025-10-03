import { z } from 'zod';

// Financial validation constants
export const FINANCIAL_CONSTRAINTS = {
  // Amount constraints (in cents/minimum currency unit)
  MIN_AMOUNT: 1,
  MAX_AMOUNT: 99999999999, // $999,999,999.99
  MAX_TRANSACTION_AMOUNT: 9999999999, // $99,999,999.99

  // Business constraints
  MAX_DAILY_TRANSACTIONS: 1000,
  MAX_MONTHLY_TRANSACTIONS: 10000,
  MAX_CATEGORIES_PER_USER: 100,
  MAX_ASSETS_PER_USER: 500,

  // Data constraints
  MAX_DESCRIPTION_LENGTH: 500,
  MAX_NOTES_LENGTH: 1000,
  MAX_TAGS_PER_TRANSACTION: 10,
  MAX_TAG_LENGTH: 50,

  // Date constraints
  MIN_TRANSACTION_DATE: new Date('2000-01-01'),
  MAX_FUTURE_DATE: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year from now

  // Budget constraints
  MAX_BUDGET_AMOUNT: 99999999999,
  MIN_BUDGET_AMOUNT: 100, // $1.00
  MAX_BUDGETS_PER_USER: 50,
};

// Currency-specific validation
export const CURRENCY_VALIDATION = {
  // Supported currencies and their constraints
  currencies: {
    USD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    EUR: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    GBP: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    JPY: { minAmount: 1, maxAmount: 99999999999, decimals: 0 },
    CNY: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    INR: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    CAD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    AUD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    CHF: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    SEK: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    NZD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    MXN: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    SGD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    HKD: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    NOK: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    KRW: { minAmount: 1, maxAmount: 99999999999, decimals: 0 },
    TRY: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    RUB: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
    ZAR: { minAmount: 1, maxAmount: 99999999999, decimals: 2 },
  },

  // Get currency validation rules
  getCurrencyRules: (currency: string) => {
    return CURRENCY_VALIDATION.currencies[currency as keyof typeof CURRENCY_VALIDATION.currencies] || CURRENCY_VALIDATION.currencies.USD;
  },
};

// Financial amount validation
export const validateAmount = z.object({
  amount: z.number()
    .min(FINANCIAL_CONSTRAINTS.MIN_AMOUNT, `Amount must be at least ${FINANCIAL_CONSTRAINTS.MIN_AMOUNT}`)
    .max(FINANCIAL_CONSTRAINTS.MAX_TRANSACTION_AMOUNT, `Amount cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_TRANSACTION_AMOUNT}`)
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),

  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters'),
});

// Transaction-specific validation
export const validateTransaction = z.object({
  amount: z.number()
    .positive('Amount must be positive')
    .max(FINANCIAL_CONSTRAINTS.MAX_TRANSACTION_AMOUNT, 'Amount exceeds maximum allowed')
    .multipleOf(0.01, 'Amount must have at most 2 decimal places'),

  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Transaction type must be either income or expense' }),
  }),

  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
    }, 'Invalid date')
    .refine((date) => {
      const d = new Date(date);
      return d >= FINANCIAL_CONSTRAINTS.MIN_TRANSACTION_DATE && d <= FINANCIAL_CONSTRAINTS.MAX_FUTURE_DATE;
    }, `Date must be between ${FINANCIAL_CONSTRAINTS.MIN_TRANSACTION_DATE.toISOString().split('T')[0]} and ${FINANCIAL_CONSTRAINTS.MAX_FUTURE_DATE.toISOString().split('T')[0]}`),

  description: z.string()
    .min(1, 'Description is required')
    .max(FINANCIAL_CONSTRAINTS.MAX_DESCRIPTION_LENGTH, `Description cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_DESCRIPTION_LENGTH} characters`)
    .refine((desc) => desc.trim().length > 0, 'Description cannot be empty')
    .refine((desc) => !/^\s*$/.test(desc), 'Description cannot be only whitespace')
    .refine((desc) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(desc), 'Description contains invalid content'),

  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
    .refine((currency) => currency in CURRENCY_VALIDATION.currencies, 'Unsupported currency'),

  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional(),

  notes: z.string()
    .max(FINANCIAL_CONSTRAINTS.MAX_NOTES_LENGTH, `Notes cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_NOTES_LENGTH} characters`)
    .refine((notes) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(notes || ''), 'Notes contain invalid content')
    .optional(),

  tags: z.array(z.string()
    .min(1, 'Tag cannot be empty')
    .max(FINANCIAL_CONSTRAINTS.MAX_TAG_LENGTH, `Tag cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_TAG_LENGTH} characters`)
    .regex(/^[a-zA-Z0-9\s\-_]+$/, 'Tag can only contain letters, numbers, spaces, hyphens, and underscores')
  )
  .max(FINANCIAL_CONSTRAINTS.MAX_TAGS_PER_TRANSACTION, `Cannot have more than ${FINANCIAL_CONSTRAINTS.MAX_TAGS_PER_TRANSACTION} tags`)
  .refine((tags) => new Set(tags).size === tags.length, 'Tags must be unique')
  .optional(),

  categoryId: z.string().uuid('Invalid category ID format').nullable().optional(),

  metadata: z.record(z.any()).refine((metadata) => {
    if (!metadata) return true;
    const jsonStr = JSON.stringify(metadata);
    return jsonStr.length < 10000; // Max 10KB of metadata
  }, 'Metadata is too large').optional(),
});

// Category validation
export const validateCategory = z.object({
  name: z.string()
    .min(1, 'Category name is required')
    .max(100, 'Category name must be less than 100 characters')
    .refine((name) => name.trim().length > 0, 'Category name cannot be empty')
    .refine((name) => !/^\s*$/.test(name), 'Category name cannot be only whitespace')
    .refine((name) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(name), 'Category name contains invalid content'),

  type: z.enum(['income', 'expense'], {
    errorMap: () => ({ message: 'Category type must be either income or expense' }),
  }),

  description: z.string()
    .max(500, 'Description must be less than 500 characters')
    .refine((desc) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(desc || ''), 'Description contains invalid content')
    .optional(),

  color: z.string()
    .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color (e.g., #FF5733)')
    .optional(),

  icon: z.string()
    .max(50, 'Icon must be less than 50 characters')
    .regex(/^[a-zA-Z0-9\-_]+$/, 'Icon can only contain letters, numbers, hyphens, and underscores')
    .optional(),

  parentId: z.string().uuid('Invalid parent category ID').nullable().optional(),
});

// Asset validation
export const validateAsset = z.object({
  name: z.string()
    .min(1, 'Asset name is required')
    .max(200, 'Asset name must be less than 200 characters')
    .refine((name) => name.trim().length > 0, 'Asset name cannot be empty')
    .refine((name) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(name), 'Asset name contains invalid content'),

  type: z.enum(['cash', 'bank_account', 'investment', 'property', 'vehicle', 'equipment', 'other'], {
    errorMap: () => ({ message: 'Invalid asset type' }),
  }),

  currentValue: z.number()
    .min(0, 'Current value cannot be negative')
    .max(FINANCIAL_CONSTRAINTS.MAX_AMOUNT, 'Current value exceeds maximum allowed')
    .multipleOf(0.01, 'Current value must have at most 2 decimal places'),

  initialValue: z.number()
    .min(0, 'Initial value cannot be negative')
    .max(FINANCIAL_CONSTRAINTS.MAX_AMOUNT, 'Initial value exceeds maximum allowed')
    .multipleOf(0.01, 'Initial value must have at most 2 decimal places')
    .optional(),

  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters')
    .refine((currency) => currency in CURRENCY_VALIDATION.currencies, 'Unsupported currency'),

  purchaseDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Purchase date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
    }, 'Invalid purchase date')
    .refine((date) => {
      const d = new Date(date);
      return d >= FINANCIAL_CONSTRAINTS.MIN_TRANSACTION_DATE;
    }, `Purchase date cannot be before ${FINANCIAL_CONSTRAINTS.MIN_TRANSACTION_DATE.toISOString().split('T')[0]}`)
    .refine((date) => {
      const d = new Date(date);
      return d <= new Date();
    }, 'Purchase date cannot be in the future')
    .optional(),

  location: z.string()
    .max(200, 'Location must be less than 200 characters')
    .optional(),

  notes: z.string()
    .max(FINANCIAL_CONSTRAINTS.MAX_NOTES_LENGTH, `Notes cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_NOTES_LENGTH} characters`)
    .refine((notes) => !/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi.test(notes || ''), 'Notes contain invalid content')
    .optional(),

  metadata: z.record(z.any()).refine((metadata) => {
    if (!metadata) return true;
    const jsonStr = JSON.stringify(metadata);
    return jsonStr.length < 10000; // Max 10KB of metadata
  }, 'Metadata is too large').optional(),
});

// Budget validation
export const validateBudget = z.object({
  categoryId: z.string().uuid('Invalid category ID format'),

  amount: z.number()
    .min(FINANCIAL_CONSTRAINTS.MIN_BUDGET_AMOUNT, `Budget amount must be at least ${FINANCIAL_CONSTRAINTS.MIN_BUDGET_AMOUNT}`)
    .max(FINANCIAL_CONSTRAINTS.MAX_BUDGET_AMOUNT, `Budget amount cannot exceed ${FINANCIAL_CONSTRAINTS.MAX_BUDGET_AMOUNT}`)
    .multipleOf(0.01, 'Budget amount must have at most 2 decimal places'),

  period: z.enum(['week', 'month', 'quarter', 'year'], {
    errorMap: () => ({ message: 'Budget period must be week, month, quarter, or year' }),
  }),

  alertThreshold: z.number()
    .min(0, 'Alert threshold cannot be negative')
    .max(100, 'Alert threshold cannot exceed 100%')
    .multipleOf(1, 'Alert threshold must be a whole number'),

  startDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
    }, 'Invalid start date')
    .optional(),

  endDate: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
    }, 'Invalid end date')
    .optional(),
}).refine((data) => {
  if (data.startDate && data.endDate) {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  }
  return true;
}, 'End date must be after start date');

// Financial calculations validation
export const validateFinancialCalculation = z.object({
  calculationType: z.enum([
    'total_income',
    'total_expenses',
    'net_income',
    'profit_margin',
    'expense_ratio',
    'savings_rate',
    'roi',
    'budget_variance',
    'cash_flow',
  ]),

  period: z.object({
    startDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Start date must be in YYYY-MM-DD format'),
    endDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'End date must be in YYYY-MM-DD format'),
  }).refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    return start < end;
  }, 'End date must be after start date')
  .refine((data) => {
    const start = new Date(data.startDate);
    const end = new Date(data.endDate);
    const daysDiff = (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24);
    return daysDiff <= 365; // Max 1 year period
  }, 'Period cannot exceed 1 year'),

  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters'),

  categories: z.array(z.string().uuid('Invalid category ID format')).optional(),

  filters: z.object({
    minAmount: z.number().min(0, 'Minimum amount cannot be negative').optional(),
    maxAmount: z.number().min(0, 'Maximum amount cannot be negative').optional(),
    tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
  }).optional(),
});

// Business rule validators
export const validateBusinessRules = {
  // Check if user can add more transactions (rate limiting)
  canAddTransaction: (userId: string, transactionCount: number, timeframe: 'daily' | 'monthly'): boolean => {
    const maxTransactions = timeframe === 'daily'
      ? FINANCIAL_CONSTRAINTS.MAX_DAILY_TRANSACTIONS
      : FINANCIAL_CONSTRAINTS.MAX_MONTHLY_TRANSACTIONS;

    return transactionCount < maxTransactions;
  },

  // Check if user can add more categories
  canAddCategory: (categoryCount: number): boolean => {
    return categoryCount < FINANCIAL_CONSTRAINTS.MAX_CATEGORIES_PER_USER;
  },

  // Check if user can add more assets
  canAddAsset: (assetCount: number): boolean => {
    return assetCount < FINANCIAL_CONSTRAINTS.MAX_ASSETS_PER_USER;
  },

  // Check if budget amount is reasonable compared to historical spending
  validateBudgetAmount: (budgetAmount: number, historicalAverage: number, variance: number = 0.5): boolean => {
    const minReasonable = historicalAverage * (1 - variance);
    const maxReasonable = historicalAverage * (1 + variance);
    return budgetAmount >= minReasonable && budgetAmount <= maxReasonable;
  },

  // Check for duplicate transactions within a time window
  isDuplicateTransaction: (
    newTransaction: any,
    existingTransactions: any[],
    timeWindowHours: number = 24
  ): boolean => {
    const newDate = new Date(newTransaction.date);
    const timeWindowMs = timeWindowHours * 60 * 60 * 1000;

    return existingTransactions.some(existing => {
      const existingDate = new Date(existing.date);
      const timeDiff = Math.abs(newDate.getTime() - existingDate.getTime());

      return (
        timeDiff <= timeWindowMs &&
        existing.amount === newTransaction.amount &&
        existing.type === newTransaction.type &&
        existing.description.toLowerCase() === newTransaction.description.toLowerCase()
      );
    });
  },

  // Validate category hierarchy (no circular references)
  validateCategoryHierarchy: (categoryId: string, parentId: string, allCategories: any[]): boolean => {
    if (!parentId) return true;

    const checkCircular = (currentId: string, targetId: string, visited: Set<string>): boolean => {
      if (visited.has(currentId)) return false;
      if (currentId === targetId) return true;

      visited.add(currentId);
      const category = allCategories.find(cat => cat.id === currentId);

      if (!category || !category.parentId) return false;

      return checkCircular(category.parentId, targetId, visited);
    };

    return !checkCircular(parentId, categoryId, new Set());
  },

  // Check for suspicious transaction patterns
  detectSuspiciousPatterns: (transactions: any[]): string[] => {
    const warnings: string[] = [];

    // Check for unusually large transactions
    const amounts = transactions.map(t => t.amount);
    const mean = amounts.reduce((a, b) => a + b, 0) / amounts.length;
    const stdDev = Math.sqrt(amounts.reduce((sq, n) => sq + Math.pow(n - mean, 2), 0) / amounts.length);
    const threshold = mean + (3 * stdDev); // 3 standard deviations

    transactions.forEach(transaction => {
      if (transaction.amount > threshold) {
        warnings.push(`Unusually large transaction detected: ${transaction.description}`);
      }
    });

    // Check for rapid successive transactions
    const sortedTransactions = transactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    for (let i = 1; i < sortedTransactions.length; i++) {
      const timeDiff = new Date(sortedTransactions[i].date).getTime() - new Date(sortedTransactions[i - 1].date).getTime();
      if (timeDiff < 60000) { // Less than 1 minute apart
        warnings.push('Rapid successive transactions detected');
        break;
      }
    }

    return warnings;
  },
};

// Financial data sanitization
export const sanitizeFinancialData = {
  // Sanitize transaction description
  sanitizeDescription: (description: string): string => {
    return description
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .substring(0, FINANCIAL_CONSTRAINTS.MAX_DESCRIPTION_LENGTH);
  },

  // Sanitize notes
  sanitizeNotes: (notes: string): string => {
    return notes
      .trim()
      .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, '')
      .replace(/[<>]/g, '')
      .substring(0, FINANCIAL_CONSTRAINTS.MAX_NOTES_LENGTH);
  },

  // Sanitize tags
  sanitizeTags: (tags: string[]): string[] => {
    return tags
      .map(tag => tag.trim().replace(/[^a-zA-Z0-9\s\-_]/g, ''))
      .filter(tag => tag.length > 0 && tag.length <= FINANCIAL_CONSTRAINTS.MAX_TAG_LENGTH)
      .slice(0, FINANCIAL_CONSTRAINTS.MAX_TAGS_PER_TRANSACTION);
  },

  // Sanitize amount (ensure it's a valid number)
  sanitizeAmount: (amount: any): number => {
    const num = Number(amount);
    if (isNaN(num) || !isFinite(num)) {
      throw new Error('Invalid amount');
    }
    return Math.round(num * 100) / 100; // Round to 2 decimal places
  },

  // Sanitize currency code
  sanitizeCurrency: (currency: string): string => {
    return currency.toUpperCase().trim().substring(0, 3);
  },
};

// Export all validators
export const financialValidators = {
  validateAmount,
  validateTransaction,
  validateCategory,
  validateAsset,
  validateBudget,
  validateFinancialCalculation,
  validateBusinessRules,
  sanitizeFinancialData,
  CURRENCY_VALIDATION,
  FINANCIAL_CONSTRAINTS,
};