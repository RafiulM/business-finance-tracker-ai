# Data Model: Business Finance Tracker

**Date**: 2025-10-03
**Purpose**: Define database schema and entity relationships for financial tracking system

## Core Entities

### User
**Purpose**: User account management and authentication
```typescript
interface User {
  id: string                    // UUID primary key
  email: string                 // Unique email address
  name: string                  // Full name
  businessName?: string         // Optional business name
  baseCurrency: string          // ISO 4217 currency code (USD, EUR, etc.)
  timezone: string              // IANA timezone identifier
  preferences: UserPreferences // JSON configuration
  createdAt: Date              // Account creation timestamp
  updatedAt: Date              // Last update timestamp
  deletedAt?: Date             // Soft-delete timestamp
}

interface UserPreferences {
  defaultCategories: string[]    // Preferred transaction categories
  notificationSettings: object   // Email/push notification preferences
  dashboardLayout: object        // Custom dashboard configuration
  aiAssistanceEnabled: boolean   // Toggle for AI features
}
```

### Category
**Purpose**: Hierarchical categorization system for transactions
```typescript
interface Category {
  id: string                    // UUID primary key
  userId: string                // Foreign key to User
  name: string                  // Category name (e.g., "Office Supplies")
  description?: string          // Category description
  parentId?: string             // Parent category for hierarchy
  type: CategoryType            // EXPENSE, INCOME, ASSET
  color: string                 // Hex color for UI display
  icon?: string                 // Icon identifier
  isActive: boolean             // Whether category can be used
  createdAt: Date
  updatedAt: Date
}

enum CategoryType {
  EXPENSE = 'expense',
  INCOME = 'income',
  ASSET = 'asset'
}
```

### Transaction
**Purpose**: Core financial transaction records
```typescript
interface Transaction {
  id: string                    // UUID primary key
  userId: string                // Foreign key to User
  categoryId: string            // Foreign key to Category
  amount: number                // Amount in cents (integer)
  currency: string              // Transaction currency
  originalCurrency?: string     // Original currency if converted
  exchangeRate?: number         // Exchange rate used if converted
  description: string           // Natural language description
  processedDescription: string  // AI-processed clean description
  date: Date                    // Transaction date
  type: TransactionType         // EXPENSE, INCOME, ASSET_PURCHASE, ASSET_SALE
  confidence: number            // AI categorization confidence (0-100)
  needsReview: boolean          // Flag for manual review
  metadata: TransactionMetadata // Additional structured data
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date              // Soft-delete for audit trail
}

interface TransactionMetadata {
  vendor?: string               // Extracted vendor name
  location?: string             // Geographic location
  tags: string[]               // AI-generated tags
  aiProcessed: boolean         // Whether AI has processed this transaction
  manualOverride: boolean       // Whether user manually categorized
  source?: string              // Data source (manual, import, API)
  receiptUrl?: string          // Link to receipt image
  notes?: string               // User notes
}

enum TransactionType {
  EXPENSE = 'expense',
  INCOME = 'income',
  ASSET_PURCHASE = 'asset_purchase',
  ASSET_SALE = 'asset_sale'
}
```

### Asset
**Purpose**: Track business assets and valuations
```typescript
interface Asset {
  id: string                    // UUID primary key
  userId: string                // Foreign key to User
  name: string                  // Asset name
  description?: string          // Asset description
  type: AssetType               // Equipment, Property, Intangible, etc.
  purchaseDate?: Date           // When asset was acquired
  purchaseValue: number         // Purchase amount in cents
  currentValue: number          // Current estimated value in cents
  currency: string              // Valuation currency
  depreciationMethod?: string   // Depreciation calculation method
  usefulLifeYears?: number      // Expected useful life
  metadata: AssetMetadata       // Additional structured data
  createdAt: Date
  updatedAt: Date
  deletedAt?: Date
}

interface AssetMetadata {
  serialNumber?: string         // Asset serial number
  location?: string             // Physical location
  condition: string             // Current condition
  warrantyExpiry?: Date         // Warranty expiration
  maintenanceSchedule?: object  // Maintenance tracking
  photos: string[]             // URLs to asset photos
}

enum AssetType {
  EQUIPMENT = 'equipment',
  PROPERTY = 'property',
  VEHICLE = 'vehicle',
  INTANGIBLE = 'intangible',
  FINANCIAL = 'financial',
  OTHER = 'other'
}
```

### Insight
**Purpose**: AI-generated financial insights and recommendations
```typescript
interface Insight {
  id: string                    // UUID primary key
  userId: string                // Foreign key to User
  type: InsightType             // Trend, Anomaly, Recommendation, etc.
  title: string                 // Insight headline
  description: string           // Detailed explanation
  confidence: number            // AI confidence score (0-100)
  impact: InsightImpact         // HIGH, MEDIUM, LOW impact assessment
  category?: string             // Related business category
  timePeriod: TimePeriod        // Analysis time period
  data: InsightData             // Supporting data and visualizations
  actions: InsightAction[]      // Recommended actions
  isRead: boolean               // User read status
  isArchived: boolean           // Archive status
  createdAt: Date
  updatedAt: Date
}

interface InsightData {
  metrics: object               // Key metrics and values
  trends: object[]              // Trend data points
  comparisons: object           // Comparative analysis
  visualizations: object        // Chart configurations
}

interface InsightAction {
  id: string                    // Action identifier
  description: string           // Action description
  type: ActionType              // CATEGORIZE, REVIEW, INVESTIGATE, etc.
  targetId?: string             // Target entity ID (transaction, category, etc.)
  targetType?: string           // Target entity type
  completed: boolean            // Completion status
}

enum InsightType {
  SPENDING_TREND = 'spending_trend',
  ANOMALY_DETECTION = 'anomaly_detection',
  CASH_FLOW_ANALYSIS = 'cash_flow_analysis',
  CATEGORY_INSIGHT = 'category_insight',
  RECOMMENDATION = 'recommendation',
  BUDGET_ALERT = 'budget_alert'
}

enum InsightImpact {
  HIGH = 'high',
  MEDIUM = 'medium',
  LOW = 'low'
}

enum ActionType {
  CATEGORIZE = 'categorize',
  REVIEW = 'review',
  INVESTIGATE = 'investigate',
  ADJUST_BUDGET = 'adjust_budget',
  EXPORT_REPORT = 'export_report'
}
```

### AuditLog
**Purpose**: Comprehensive audit trail for compliance and debugging
```typescript
interface AuditLog {
  id: string                    // UUID primary key
  userId: string                // User who performed action
  entityType: string            // Type of entity affected
  entityId: string              // ID of affected entity
  action: AuditAction           // CREATE, UPDATE, DELETE, VIEW
  oldValue?: object             // Previous state (for updates)
  newValue?: object             // New state
  reason?: string               // User-provided reason
  ipAddress?: string            // Source IP address
  userAgent?: string            // Client user agent
  timestamp: Date               // Action timestamp
}

enum AuditAction {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  VIEW = 'view',
  EXPORT = 'export',
  LOGIN = 'login',
  LOGOUT = 'logout'
}
```

## Relationships & Constraints

### Foreign Key Relationships
- `User` 1:N `Category` (user owns categories)
- `User` 1:N `Transaction` (user owns transactions)
- `User` 1:N `Asset` (user owns assets)
- `User` 1:N `Insight` (user receives insights)
- `Category` 1:N `Transaction` (category has transactions)
- `Category` self-referencing N:N (hierarchical categories)
- `User` 1:N `AuditLog` (user has audit entries)

### Database Constraints
- Unique constraints on user emails
- Foreign key constraints with proper cascading
- Check constraints for positive amounts
- Enum constraints for type fields
- Soft-delete patterns for financial data

## Indexing Strategy

### Primary Indexes
- All primary keys (UUID)
- User foreign keys (user-based queries)
- Transaction dates (time-based filtering)
- Transaction amounts (range queries)

### Secondary Indexes
- Transaction category + date combinations
- Insight types + creation dates
- Asset types + values
- Audit log timestamps + user IDs

## Data Validation Rules

### Transaction Validation
- Amount must be positive integer (cents)
- Date cannot be in future (except planned transactions)
- Required fields must be present
- Currency codes must be valid ISO 4217

### Category Validation
- Category names must be unique per user
- Hierarchical relationships cannot create cycles
- At least one root category per type

### User Validation
- Email format validation
- Strong password requirements
- Base currency must be supported

## Privacy & Security Considerations

### Sensitive Data Handling
- Encrypt user PII at rest
- Hash passwords with proper salting
- Mask sensitive audit log entries
- Secure API key storage for AI services

### Data Retention
- Soft-delete for financial records
- Configurable retention policies
- Automated archival processes
- Compliance with tax record requirements

## Performance Considerations

### Query Optimization
- Strategic indexing for common query patterns
- Partitioning for large transaction tables
- Materialized views for complex reporting
- Connection pooling for database access

### Caching Strategy
- User session caching
- Category caching for quick lookup
- Insight generation result caching
- Dashboard data aggregation caching