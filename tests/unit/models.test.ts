import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import { db } from '@/db';
import { user, category, transaction, asset, insight, auditLog } from '@/db/schema';
import { eq } from 'drizzle-orm';

describe('Database Models', () => {
  let testUserId: string;
  let testCategoryId: string;

  beforeAll(async () => {
    // This will fail initially since we haven't implemented the models yet
    // Following TDD principles
  });

  afterAll(async () => {
    // Cleanup
  });

  describe('User Model', () => {
    it('should create a user with required fields', async () => {
      const userData = {
        id: 'test-user-1',
        name: 'Test User',
        email: 'test@example.com',
        baseCurrency: 'USD',
        timezone: 'UTC',
      };

      // This test should fail initially - models not implemented
      const [newUser] = await db.insert(user).values(userData).returning();
      testUserId = newUser.id;

      expect(newUser.id).toBe(userData.id);
      expect(newUser.name).toBe(userData.name);
      expect(newUser.email).toBe(userData.email);
      expect(newUser.baseCurrency).toBe(userData.baseCurrency);
      expect(newUser.emailVerified).toBe(false);
    });

    it('should create a user with business information', async () => {
      const userData = {
        id: 'test-user-2',
        name: 'Business Owner',
        email: 'business@example.com',
        businessName: 'Test Business',
        baseCurrency: 'USD',
        timezone: 'America/New_York',
        preferences: {
          defaultCategories: ['office-supplies', 'software'],
          notificationSettings: { email: true, push: false },
          dashboardLayout: { showCharts: true, showTable: true },
          aiAssistanceEnabled: true,
        },
      };

      const [newUser] = await db.insert(user).values(userData).returning();

      expect(newUser.businessName).toBe(userData.businessName);
      expect(newUser.preferences).toEqual(userData.preferences);
    });

    it('should enforce unique email constraint', async () => {
      const userData = {
        id: 'test-user-3',
        name: 'Another User',
        email: 'test@example.com', // Same email as first user
        baseCurrency: 'USD',
        timezone: 'UTC',
      };

      // This should fail due to unique constraint
      await expect(db.insert(user).values(userData)).rejects.toThrow();
    });

    it('should support soft delete', async () => {
      const now = new Date();
      await db.update(user).set({ deletedAt: now }).where(eq(user.id, testUserId));

      const [deletedUser] = await db.select().from(user).where(eq(user.id, testUserId));
      expect(deletedUser.deletedAt).toEqual(now);
    });
  });

  describe('Category Model', () => {
    it('should create a category with hierarchy', async () => {
      const parentCategoryData = {
        id: 'parent-category-1',
        userId: testUserId,
        name: 'Operating Expenses',
        type: 'expense' as const,
        color: '#3B82F6',
        icon: 'folder',
      };

      const [parentCategory] = await db.insert(category).values(parentCategoryData).returning();
      testCategoryId = parentCategory.id;

      expect(parentCategory.name).toBe(parentCategoryData.name);
      expect(parentCategory.isActive).toBe(true);

      // Create child category
      const childCategoryData = {
        id: 'child-category-1',
        userId: testUserId,
        name: 'Office Supplies',
        parentId: parentCategory.id,
        type: 'expense' as const,
        color: '#10B981',
        icon: 'package',
      };

      const [childCategory] = await db.insert(category).values(childCategoryData).returning();
      expect(childCategory.parentId).toBe(parentCategory.id);
    });

    it('should enforce category types', async () => {
      const invalidCategoryData = {
        id: 'invalid-category-1',
        userId: testUserId,
        name: 'Invalid Category',
        type: 'invalid-type' as any, // This should fail
        color: '#FF0000',
      };

      await expect(db.insert(category).values(invalidCategoryData)).rejects.toThrow();
    });
  });

  describe('Transaction Model', () => {
    it('should create a transaction with required fields', async () => {
      const transactionData = {
        id: 'test-transaction-1',
        userId: testUserId,
        categoryId: testCategoryId,
        amount: 4567, // $45.67 in cents
        currency: 'USD',
        description: 'Office supplies purchase',
        processedDescription: 'Office supplies purchase at Staples',
        date: new Date(),
        type: 'expense' as const,
        confidence: 95,
        needsReview: false,
        metadata: {
          vendor: 'Staples',
          location: 'New York',
          tags: ['office', 'supplies'],
          aiProcessed: true,
          manualOverride: false,
        },
      };

      const [newTransaction] = await db.insert(transaction).values(transactionData).returning();

      expect(newTransaction.amount).toBe(4567);
      expect(newTransaction.type).toBe('expense');
      expect(newTransaction.confidence).toBe(95);
      expect(newTransaction.metadata.vendor).toBe('Staples');
    });

    it('should handle different transaction types', async () => {
      const incomeTransactionData = {
        id: 'test-income-1',
        userId: testUserId,
        categoryId: testCategoryId,
        amount: 500000, // $5,000.00
        currency: 'USD',
        description: 'Client payment for services',
        processedDescription: 'Service revenue from client',
        date: new Date(),
        type: 'income' as const,
        confidence: 100,
        needsReview: false,
        metadata: {
          vendor: 'Client Corp',
          tags: ['service', 'revenue'],
          aiProcessed: true,
          manualOverride: false,
        },
      };

      const [incomeTransaction] = await db.insert(transaction).values(incomeTransactionData).returning();
      expect(incomeTransaction.type).toBe('income');
      expect(incomeTransaction.amount).toBe(500000);
    });
  });

  describe('Asset Model', () => {
    it('should create an asset with depreciation tracking', async () => {
      const assetData = {
        id: 'test-asset-1',
        userId: testUserId,
        name: 'Office Laptop',
        description: 'MacBook Pro for development work',
        type: 'equipment' as const,
        purchaseDate: new Date('2025-01-01'),
        purchaseValue: 250000, // $2,500.00
        currentValue: 200000, // $2,000.00 (depreciated)
        currency: 'USD',
        depreciationMethod: 'straight_line' as const,
        usefulLifeYears: 5,
        metadata: {
          serialNumber: 'MBP2025ABC123',
          location: 'Main Office',
          condition: 'good',
          warrantyExpiry: new Date('2027-01-01'),
          photos: [],
        },
      };

      const [newAsset] = await db.insert(asset).values(assetData).returning();

      expect(newAsset.name).toBe(assetData.name);
      expect(newAsset.type).toBe('equipment');
      expect(newAsset.purchaseValue).toBe(250000);
      expect(newAsset.currentValue).toBe(200000);
      expect(newAsset.metadata.serialNumber).toBe('MBP2025ABC123');
    });
  });

  describe('Insight Model', () => {
    it('should create an AI-generated insight', async () => {
      const insightData = {
        id: 'test-insight-1',
        userId: testUserId,
        type: 'spending_trend' as const,
        title: 'Office Supplies Spending Increased',
        description: 'Your spending on office supplies has increased by 25% this month compared to the previous month.',
        confidence: 88,
        impact: 'medium' as const,
        category: 'Office Supplies',
        timePeriod: {
          startDate: new Date('2025-09-01'),
          endDate: new Date('2025-09-30'),
        },
        data: {
          metrics: { currentMonth: 1500, previousMonth: 1200, change: 25 },
          trends: [
            { date: '2025-09-01', value: 100 },
            { date: '2025-09-15', value: 800 },
            { date: '2025-09-30', value: 1500 },
          ],
          comparisons: { vsLastMonth: '+25%', vsBudget: '+10%' },
          visualizations: { chartType: 'line', dataKey: 'amount' },
        },
        actions: [
          {
            id: 'action-1',
            description: 'Review office supply purchases for necessity',
            type: 'review' as const,
            completed: false,
          },
        ],
      };

      const [newInsight] = await db.insert(insight).values(insightData).returning();

      expect(newInsight.title).toBe(insightData.title);
      expect(newInsight.type).toBe('spending_trend');
      expect(newInsight.confidence).toBe(88);
      expect(newInsight.impact).toBe('medium');
      expect(newInsight.actions).toHaveLength(1);
    });
  });

  describe('Audit Log Model', () => {
    it('should create an audit log entry', async () => {
      const auditLogData = {
        id: 'test-audit-1',
        userId: testUserId,
        entityType: 'transaction',
        entityId: 'test-transaction-1',
        action: 'create' as const,
        newValue: {
          amount: 4567,
          description: 'Office supplies purchase',
          categoryId: testCategoryId,
        },
        ipAddress: '192.168.1.100',
        userAgent: 'Mozilla/5.0 (Test Browser)',
        timestamp: new Date(),
      };

      const [newAuditLog] = await db.insert(auditLog).values(auditLogData).returning();

      expect(newAuditLog.entityType).toBe('transaction');
      expect(newAuditLog.action).toBe('create');
      expect(newAuditLog.newValue).toEqual(auditLogData.newValue);
      expect(newAuditLog.timestamp).toBeInstanceOf(Date);
    });
  });
});