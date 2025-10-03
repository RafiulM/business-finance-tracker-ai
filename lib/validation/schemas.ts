import { z } from 'zod';

// Common validation patterns
export const commonSchemas = {
  // ID validation
  id: z.string().uuid('Invalid ID format'),

  // Email validation
  email: z.string().email('Invalid email format'),

  // Password validation
  password: z.string()
    .min(8, 'Password must be at least 8 characters')
    .regex(/[A-Z]/, 'Password must contain at least one uppercase letter')
    .regex(/[a-z]/, 'Password must contain at least one lowercase letter')
    .regex(/[0-9]/, 'Password must contain at least one number')
    .regex(/[^A-Za-z0-9]/, 'Password must contain at least one special character'),

  // Name validation
  name: z.string()
    .min(1, 'Name is required')
    .max(100, 'Name must be less than 100 characters')
    .regex(/^[a-zA-Z\s'-]+$/, 'Name can only contain letters, spaces, hyphens, and apostrophes'),

  // Currency validation (ISO 4217)
  currency: z.string()
    .length(3, 'Currency code must be exactly 3 characters')
    .regex(/^[A-Z]{3}$/, 'Currency code must be uppercase letters'),

  // Date validation
  date: z.string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format')
    .refine((date) => {
      const d = new Date(date);
      return !isNaN(d.getTime()) && d.toISOString().split('T')[0] === date;
    }, 'Invalid date'),

  // DateTime validation
  datetime: z.string()
    .datetime('Invalid datetime format'),

  // URL validation
  url: z.string().url('Invalid URL format'),

  // Phone number validation
  phone: z.string()
    .regex(/^\+?[\d\s\-\(\)]+$/, 'Invalid phone number format')
    .min(10, 'Phone number must be at least 10 digits'),

  // Pagination
  page: z.coerce.number().int().min(1, 'Page must be at least 1').default(1),
  limit: z.coerce.number().int().min(1, 'Limit must be at least 1').max(100, 'Limit cannot exceed 100').default(20),

  // Sort validation
  sort: z.enum(['asc', 'desc']).default('desc'),

  // Boolean validation
  boolean: z.coerce.boolean(),
};

// User-related schemas
export const userSchemas = {
  // Registration schema
  register: z.object({
    email: commonSchemas.email,
    password: commonSchemas.password,
    name: commonSchemas.name,
    businessName: z.string()
      .min(1, 'Business name is required')
      .max(200, 'Business name must be less than 200 characters')
      .optional(),
    baseCurrency: commonSchemas.currency.default('USD'),
    timezone: z.string()
      .min(1, 'Timezone is required')
      .default('UTC'),
  }),

  // Login schema
  login: z.object({
    email: commonSchemas.email,
    password: z.string().min(1, 'Password is required'),
    rememberMe: commonSchemas.boolean.optional(),
  }),

  // Profile update schema
  updateProfile: z.object({
    name: commonSchemas.name.optional(),
    businessName: z.string()
      .min(1, 'Business name is required')
      .max(200, 'Business name must be less than 200 characters')
      .optional(),
    baseCurrency: commonSchemas.currency.optional(),
    timezone: z.string()
      .min(1, 'Timezone is required')
      .optional(),
  }),

  // Password change schema
  changePassword: z.object({
    currentPassword: z.string().min(1, 'Current password is required'),
    newPassword: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.newPassword === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),

  // Email verification schema
  verifyEmail: z.object({
    token: z.string().min(1, 'Verification token is required'),
  }),

  // Password reset request schema
  forgotPassword: z.object({
    email: commonSchemas.email,
  }),

  // Password reset schema
  resetPassword: z.object({
    token: z.string().min(1, 'Reset token is required'),
    password: commonSchemas.password,
    confirmPassword: z.string().min(1, 'Password confirmation is required'),
  }).refine((data) => data.password === data.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  }),
};

// Transaction-related schemas
export const transactionSchemas = {
  // Create transaction schema
  create: z.object({
    description: z.string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters'),
    amount: z.number()
      .positive('Amount must be positive')
      .max(999999999.99, 'Amount is too large'),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Type must be either income or expense' }),
    }),
    categoryId: commonSchemas.id.optional(),
    date: commonSchemas.date,
    currency: commonSchemas.currency.default('USD'),
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Update transaction schema
  update: z.object({
    description: z.string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters')
      .optional(),
    amount: z.number()
      .positive('Amount must be positive')
      .max(999999999.99, 'Amount is too large')
      .optional(),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Type must be either income or expense' }),
    }).optional(),
    categoryId: commonSchemas.id.nullable().optional(),
    date: commonSchemas.date.optional(),
    currency: commonSchemas.currency.optional(),
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Transaction query schema
  query: z.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
    categoryIds: z.array(commonSchemas.id).max(20, 'Maximum 20 categories allowed').optional(),
    type: z.enum(['income', 'expense']).optional(),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    minAmount: z.number().positive('Minimum amount must be positive').optional(),
    maxAmount: z.number().positive('Maximum amount must be positive').optional(),
    currency: commonSchemas.currency.optional(),
    tags: z.array(z.string().max(50, 'Tag must be less than 50 characters')).max(10, 'Maximum 10 tags allowed').optional(),
    sortBy: z.enum(['date', 'amount', 'description', 'createdAt']).default('date'),
    sortOrder: commonSchemas.sort,
  }),

  // Bulk transaction operations
  bulkCreate: z.object({
    transactions: z.array(transactionSchemas.create)
      .min(1, 'At least one transaction is required')
      .max(100, 'Maximum 100 transactions allowed per request'),
  }),

  bulkDelete: z.object({
    transactionIds: z.array(commonSchemas.id)
      .min(1, 'At least one transaction ID is required')
      .max(100, 'Maximum 100 transactions allowed per request'),
  }),
};

// Category-related schemas
export const categorySchemas = {
  // Create category schema
  create: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(100, 'Category name must be less than 100 characters'),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Type must be either income or expense' }),
    }),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    color: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
      .optional(),
    icon: z.string().max(50, 'Icon must be less than 50 characters').optional(),
    parentId: commonSchemas.id.nullable().optional(),
    isSystem: commonSchemas.boolean.default(false),
  }),

  // Update category schema
  update: z.object({
    name: z.string()
      .min(1, 'Category name is required')
      .max(100, 'Category name must be less than 100 characters')
      .optional(),
    description: z.string().max(500, 'Description must be less than 500 characters').optional(),
    color: z.string()
      .regex(/^#[0-9A-F]{6}$/i, 'Color must be a valid hex color')
      .optional(),
    icon: z.string().max(50, 'Icon must be less than 50 characters').optional(),
    parentId: commonSchemas.id.nullable().optional(),
  }),

  // Category query schema
  query: z.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
    type: z.enum(['income', 'expense']).optional(),
    isSystem: commonSchemas.boolean.optional(),
    parentId: commonSchemas.id.nullable().optional(),
    sortBy: z.enum(['name', 'createdAt', 'transactionCount']).default('name'),
    sortOrder: commonSchemas.sort,
  }),
};

// Asset-related schemas
export const assetSchemas = {
  // Create asset schema
  create: z.object({
    name: z.string()
      .min(1, 'Asset name is required')
      .max(200, 'Asset name must be less than 200 characters'),
    type: z.enum(['cash', 'bank_account', 'investment', 'property', 'vehicle', 'equipment', 'other'], {
      errorMap: () => ({ message: 'Invalid asset type' }),
    }),
    currentValue: z.number()
      .min(0, 'Current value cannot be negative')
      .max(999999999999.99, 'Value is too large'),
    initialValue: z.number()
      .min(0, 'Initial value cannot be negative')
      .max(999999999999.99, 'Value is too large')
      .optional(),
    currency: commonSchemas.currency.default('USD'),
    purchaseDate: commonSchemas.date.optional(),
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Update asset schema
  update: z.object({
    name: z.string()
      .min(1, 'Asset name is required')
      .max(200, 'Asset name must be less than 200 characters')
      .optional(),
    currentValue: z.number()
      .min(0, 'Current value cannot be negative')
      .max(999999999999.99, 'Value is too large')
      .optional(),
    currency: commonSchemas.currency.optional(),
    location: z.string().max(200, 'Location must be less than 200 characters').optional(),
    notes: z.string().max(1000, 'Notes must be less than 1000 characters').optional(),
    metadata: z.record(z.any()).optional(),
  }),

  // Asset query schema
  query: z.object({
    page: commonSchemas.page,
    limit: commonSchemas.limit,
    search: z.string().max(100, 'Search term must be less than 100 characters').optional(),
    type: z.enum(['cash', 'bank_account', 'investment', 'property', 'vehicle', 'equipment', 'other']).optional(),
    currency: commonSchemas.currency.optional(),
    minCurrentValue: z.number().min(0, 'Minimum value cannot be negative').optional(),
    maxCurrentValue: z.number().min(0, 'Maximum value cannot be negative').optional(),
    sortBy: z.enum(['name', 'currentValue', 'createdAt', 'type']).default('name'),
    sortOrder: commonSchemas.sort,
  }),
};

// AI-related schemas
export const aiSchemas = {
  // Transaction processing schema
  processTransaction: z.object({
    description: z.string()
      .min(1, 'Description is required')
      .max(500, 'Description must be less than 500 characters'),
    amount: z.number()
      .positive('Amount must be positive')
      .max(999999999.99, 'Amount is too large'),
    type: z.enum(['income', 'expense'], {
      errorMap: () => ({ message: 'Type must be either income or expense' }),
    }),
    currency: commonSchemas.currency.default('USD'),
    date: commonSchemas.date,
    context: z.object({
      recentTransactions: z.array(z.any()).optional(),
      userPreferences: z.record(z.any()).optional(),
    }).optional(),
  }),

  // Insight generation schema
  generateInsights: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year'], {
      errorMap: () => ({ message: 'Period must be week, month, quarter, or year' }),
    }).default('month'),
    categories: z.array(commonSchemas.id).max(20, 'Maximum 20 categories allowed').optional(),
    includeRecommendations: commonSchemas.boolean.default(true),
    insightTypes: z.array(z.enum(['spending_patterns', 'income_trends', 'budget_analysis', 'anomalies', 'forecast'])).optional(),
  }),

  // Chat schema
  chat: z.object({
    message: z.string()
      .min(1, 'Message is required')
      .max(1000, 'Message must be less than 1000 characters'),
    context: z.object({
      currentTransactions: z.array(z.any()).optional(),
      currentAssets: z.array(z.any()).optional(),
      selectedPeriod: z.object({
        startDate: commonSchemas.date,
        endDate: commonSchemas.date,
      }).optional(),
    }).optional(),
    conversationHistory: z.array(z.object({
      role: z.enum(['user', 'assistant']),
      message: z.string(),
      timestamp: commonSchemas.datetime,
    })).max(20, 'Conversation history is too long').optional(),
  }),

  // Pattern analysis schema
  analyzePatterns: z.object({
    analysisType: z.enum(['spending', 'income', 'savings', 'investment'], {
      errorMap: () => ({ message: 'Invalid analysis type' }),
    }),
    period: z.enum(['week', 'month', 'quarter', 'year'], {
      errorMap: () => ({ message: 'Period must be week, month, quarter, or year' }),
    }).default('month'),
    categories: z.array(commonSchemas.id).max(20, 'Maximum 20 categories allowed').optional(),
    includeForecast: commonSchemas.boolean.default(true),
  }),
};

// Export-related schemas
export const exportSchemas = {
  // Export request schema
  request: z.object({
    format: z.enum(['csv', 'xlsx', 'json', 'pdf'], {
      errorMap: () => ({ message: 'Format must be csv, xlsx, json, or pdf' }),
    }),
    dataType: z.enum(['transactions', 'categories', 'assets', 'insights', 'all'], {
      errorMap: () => ({ message: 'Invalid data type' }),
    }),
    filters: z.object({
      startDate: commonSchemas.date.optional(),
      endDate: commonSchemas.date.optional(),
      categoryIds: z.array(commonSchemas.id).max(20, 'Maximum 20 categories allowed').optional(),
      includeDeleted: commonSchemas.boolean.default(false),
    }).optional(),
    options: z.object({
      includeMetadata: commonSchemas.boolean.default(true),
      includeHeaders: commonSchemas.boolean.default(true),
      dateFormat: z.enum(['ISO', 'US', 'EU']).default('ISO'),
      currencyFormat: z.enum(['symbol', 'code', 'both']).default('symbol'),
    }).optional(),
  }),

  // Export download schema
  download: z.object({
    exportId: commonSchemas.id,
  }),
};

// Dashboard-related schemas
export const dashboardSchemas = {
  // Dashboard query schema
  query: z.object({
    period: z.enum(['week', 'month', 'quarter', 'year'], {
      errorMap: () => ({ message: 'Period must be week, month, quarter, or year' }),
    }).default('month'),
    startDate: commonSchemas.date.optional(),
    endDate: commonSchemas.date.optional(),
    currency: commonSchemas.currency.optional(),
    includeComparisons: commonSchemas.boolean.default(true),
    categories: z.array(commonSchemas.id).max(20, 'Maximum 20 categories allowed').optional(),
  }),

  // Metrics request schema
  metrics: z.object({
    types: z.array(z.enum([
      'total_income',
      'total_expenses',
      'net_income',
      'transaction_count',
      'average_transaction',
      'top_categories',
      'monthly_trend',
      'category_breakdown',
      'asset_summary',
    ])).max(10, 'Maximum 10 metrics allowed'),
    period: z.enum(['week', 'month', 'quarter', 'year']).default('month'),
    currency: commonSchemas.currency.optional(),
  }),
};

// Settings-related schemas
export const settingsSchemas = {
  // User preferences schema
  preferences: z.object({
    theme: z.enum(['light', 'dark', 'system']).default('system'),
    language: z.string().length(2, 'Language code must be exactly 2 characters').default('en'),
    timezone: z.string().min(1, 'Timezone is required').default('UTC'),
    dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']).default('MM/DD/YYYY'),
    currency: commonSchemas.currency.default('USD'),
    currencyDisplay: z.enum(['symbol', 'code', 'both']).default('symbol'),
    notifications: z.object({
      email: commonSchemas.boolean.default(true),
      push: commonSchemas.boolean.default(true),
      budgetAlerts: commonSchemas.boolean.default(true),
      weeklyReports: commonSchemas.boolean.default(true),
      monthlyReports: commonSchemas.boolean.default(true),
    }).default({}),
    privacy: z.object({
      shareAnalytics: commonSchemas.boolean.default(false),
      publicProfile: commonSchemas.boolean.default(false),
      dataRetention: z.enum(['30', '90', '365', 'forever']).default('365'),
    }).default({}),
  }),

  // Budget schema
  budget: z.object({
    categoryId: commonSchemas.id,
    amount: z.number()
      .positive('Budget amount must be positive')
      .max(999999999.99, 'Budget amount is too large'),
    period: z.enum(['week', 'month', 'quarter', 'year'], {
      errorMap: () => ({ message: 'Period must be week, month, quarter, or year' }),
    }).default('month'),
    alertThreshold: z.number()
      .min(0, 'Alert threshold cannot be negative')
      .max(100, 'Alert threshold cannot exceed 100%')
      .default(80),
  }),
};

// Validation error formatter
export const formatValidationError = (error: z.ZodError): {
  field: string;
  message: string;
  code: string;
}[] => {
  return error.errors.map(err => ({
    field: err.path.join('.'),
    message: err.message,
    code: err.code,
  }));
};

// Validation middleware helper
export const validateBody = <T>(schema: z.ZodSchema<T>) => {
  return async (data: unknown): Promise<{ data: T; error?: null }> => {
    try {
      const validatedData = await schema.parseAsync(data);
      return { data: validatedData };
    } catch (error) {
      if (error instanceof z.ZodError) {
        throw new Error(`Validation failed: ${formatValidationError(error).map(e => e.message).join(', ')}`);
      }
      throw error;
    }
  };
};

// Export all schemas
export const schemas = {
  common: commonSchemas,
  user: userSchemas,
  transaction: transactionSchemas,
  category: categorySchemas,
  asset: assetSchemas,
  ai: aiSchemas,
  export: exportSchemas,
  dashboard: dashboardSchemas,
  settings: settingsSchemas,
};