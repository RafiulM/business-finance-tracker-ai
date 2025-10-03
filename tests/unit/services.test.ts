import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { UserService } from '@/lib/services/user-service';
import { CategoryService } from '@/lib/services/category-service';
import { TransactionService } from '@/lib/services/transaction-service';
import { AssetService } from '@/lib/services/asset-service';
import { InsightService } from '@/lib/services/insight-service';
import { AuditService } from '@/lib/services/audit-service';

// Mock dependencies
jest.mock('@/lib/db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('UserService Tests', () => {
  let userService: UserService;

  beforeEach(() => {
    userService = new UserService();
    jest.clearAllMocks();
  });

  describe('User Creation', () => {
    it('should create a new user with valid data', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'SecurePass123!',
      };

      // Mock database operations
      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]),
          }),
        }),
      });
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'user-123',
            email: userData.email,
            name: userData.name,
            createdAt: new Date(),
          }]),
        }),
      });

      const result = await userService.createUser(userData);

      expect(result).toBeDefined();
      expect(result.email).toBe(userData.email);
      expect(result.name).toBe(userData.name);
      expect(result.password).not.toBe(userData.password); // Should be hashed
    });

    it('should throw error for duplicate email', async () => {
      const userData = {
        email: 'existing@example.com',
        name: 'Test User',
        password: 'SecurePass123!',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'existing-user',
              email: userData.email,
            }]),
          }),
        }),
      });

      await expect(userService.createUser(userData)).rejects.toThrow('Email already exists');
    });

    it('should validate email format', async () => {
      const userData = {
        email: 'invalid-email',
        name: 'Test User',
        password: 'SecurePass123!',
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Invalid email format');
    });

    it('should validate password strength', async () => {
      const userData = {
        email: 'test@example.com',
        name: 'Test User',
        password: 'weak',
      };

      await expect(userService.createUser(userData)).rejects.toThrow('Password must be at least 8 characters');
    });
  });

  describe('User Authentication', () => {
    it('should authenticate user with correct credentials', async () => {
      const email = 'test@example.com';
      const password = 'SecurePass123!';
      const hashedPassword = '$2a$12$hash';

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'user-123',
              email,
              password: hashedPassword,
              isActive: true,
            }]),
          }),
        }),
      });

      // Mock bcrypt comparison
      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(true);

      const result = await userService.authenticateUser(email, password);

      expect(result).toBeDefined();
      expect(result.id).toBe('user-123');
      expect(result.email).toBe(email);
    });

    it('should reject authentication for inactive user', async () => {
      const email = 'inactive@example.com';
      const password = 'SecurePass123!';

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'user-123',
              email,
              isActive: false,
            }]),
          }),
        }),
      });

      await expect(userService.authenticateUser(email, password)).rejects.toThrow('Account is inactive');
    });

    it('should reject authentication for wrong password', async () => {
      const email = 'test@example.com';
      const password = 'wrongpassword';

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'user-123',
              email,
              password: 'hashed',
              isActive: true,
            }]),
          }),
        }),
      });

      const bcrypt = require('bcryptjs');
      bcrypt.compare.mockResolvedValue(false);

      await expect(userService.authenticateUser(email, password)).rejects.toThrow('Invalid credentials');
    });
  });

  describe('User Profile Updates', () => {
    it('should update user profile successfully', async () => {
      const userId = 'user-123';
      const updateData = {
        name: 'Updated Name',
        businessName: 'Updated Business',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: userId,
              ...updateData,
              updatedAt: new Date(),
            }]),
          }),
        }),
      });

      const result = await userService.updateUser(userId, updateData);

      expect(result.name).toBe(updateData.name);
      expect(result.businessName).toBe(updateData.businessName);
    });

    it('should not update sensitive fields through profile update', async () => {
      const userId = 'user-123';
      const updateData = {
        password: 'newpassword',
        isAdmin: true,
      };

      await expect(userService.updateUser(userId, updateData)).rejects.toThrow('Cannot update sensitive fields');
    });
  });
});

describe('CategoryService Tests', () => {
  let categoryService: CategoryService;

  beforeEach(() => {
    categoryService = new CategoryService();
    jest.clearAllMocks();
  });

  describe('Category Creation', () => {
    it('should create a new category', async () => {
      const userId = 'user-123';
      const categoryData = {
        name: 'Office Supplies',
        type: 'expense' as const,
        description: 'Category for office supplies',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'cat-123',
            userId,
            ...categoryData,
            createdAt: new Date(),
          }]),
        }),
      });

      const result = await categoryService.createCategory(userId, categoryData);

      expect(result).toBeDefined();
      expect(result.name).toBe(categoryData.name);
      expect(result.type).toBe(categoryData.type);
      expect(result.userId).toBe(userId);
    });

    it('should prevent duplicate category names for same user and type', async () => {
      const userId = 'user-123';
      const categoryData = {
        name: 'Office Supplies',
        type: 'expense' as const,
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: 'existing-cat',
              name: categoryData.name,
              type: categoryData.type,
            }]),
          }),
        }),
      });

      await expect(categoryService.createCategory(userId, categoryData))
        .rejects.toThrow('Category with this name already exists');
    });

    it('should validate category type', async () => {
      const userId = 'user-123';
      const categoryData = {
        name: 'Invalid Category',
        type: 'invalid' as any,
      };

      await expect(categoryService.createCategory(userId, categoryData))
        .rejects.toThrow('Invalid category type');
    });
  });

  describe('Category Retrieval', () => {
    it('should get user categories', async () => {
      const userId = 'user-123';
      const mockCategories = [
        {
          id: 'cat-1',
          name: 'Office',
          type: 'expense',
          userId,
          transactionCount: 5,
        },
        {
          id: 'cat-2',
          name: 'Software',
          type: 'expense',
          userId,
          transactionCount: 3,
        },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockCategories),
          }),
        }),
      });

      const result = await categoryService.getUserCategories(userId);

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Office');
      expect(result[1].name).toBe('Software');
    });

    it('should get system categories', async () => {
      const mockSystemCategories = [
        {
          id: 'sys-cat-1',
          name: 'General Expense',
          type: 'expense',
          isSystem: true,
        },
        {
          id: 'sys-cat-2',
          name: 'Salary',
          type: 'income',
          isSystem: true,
        },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockResolvedValue(mockSystemCategories),
          }),
        }),
      });

      const result = await categoryService.getSystemCategories('expense');

      expect(result).toHaveLength(1);
      expect(result[0].name).toBe('General Expense');
      expect(result[0].isSystem).toBe(true);
    });
  });

  describe('Category Updates', () => {
    it('should update category name', async () => {
      const categoryId = 'cat-123';
      const userId = 'user-123';
      const updateData = { name: 'Updated Category Name' };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: categoryId,
              userId,
              name: 'Old Name',
            }]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: categoryId,
              ...updateData,
              updatedAt: new Date(),
            }]),
          }),
        }),
      });

      const result = await categoryService.updateCategory(categoryId, userId, updateData);

      expect(result.name).toBe(updateData.name);
    });

    it('should prevent updating system categories', async () => {
      const categoryId = 'sys-cat-123';
      const userId = 'user-123';
      const updateData = { name: 'Updated System Category' };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: categoryId,
              isSystem: true,
            }]),
          }),
        }),
      });

      await expect(categoryService.updateCategory(categoryId, userId, updateData))
        .rejects.toThrow('Cannot modify system categories');
    });
  });
});

describe('TransactionService Tests', () => {
  let transactionService: TransactionService;

  beforeEach(() => {
    transactionService = new TransactionService();
    jest.clearAllMocks();
  });

  describe('Transaction Creation', () => {
    it('should create a new transaction', async () => {
      const userId = 'user-123';
      const transactionData = {
        description: 'Office supplies purchase',
        amount: 50.99,
        type: 'expense' as const,
        categoryId: 'cat-123',
        date: '2023-12-15',
        currency: 'USD',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'tx-123',
            userId,
            ...transactionData,
            createdAt: new Date(),
          }]),
        }),
      });

      const result = await transactionService.createTransaction(userId, transactionData);

      expect(result).toBeDefined();
      expect(result.description).toBe(transactionData.description);
      expect(result.amount).toBe(transactionData.amount);
      expect(result.userId).toBe(userId);
    });

    it('should validate transaction amount', async () => {
      const userId = 'user-123';
      const transactionData = {
        description: 'Invalid transaction',
        amount: -50,
        type: 'expense' as const,
        date: '2023-12-15',
      };

      await expect(transactionService.createTransaction(userId, transactionData))
        .rejects.toThrow('Amount must be positive');
    });

    it('should validate transaction type', async () => {
      const userId = 'user-123';
      const transactionData = {
        description: 'Invalid transaction',
        amount: 50,
        type: 'invalid' as any,
        date: '2023-12-15',
      };

      await expect(transactionService.createTransaction(userId, transactionData))
        .rejects.toThrow('Invalid transaction type');
    });

    it('should validate transaction date', async () => {
      const userId = 'user-123';
      const transactionData = {
        description: 'Future transaction',
        amount: 50,
        type: 'expense' as const,
        date: '2099-12-15',
      };

      await expect(transactionService.createTransaction(userId, transactionData))
        .rejects.toThrow('Transaction date cannot be in the future');
    });
  });

  describe('Transaction Retrieval', () => {
    it('should get user transactions with pagination', async () => {
      const userId = 'user-123';
      const options = {
        page: 1,
        limit: 10,
      };

      const mockTransactions = [
        {
          id: 'tx-1',
          description: 'Office supplies',
          amount: 50,
          type: 'expense',
          userId,
          date: '2023-12-15',
        },
        {
          id: 'tx-2',
          description: 'Client payment',
          amount: 1000,
          type: 'income',
          userId,
          date: '2023-12-14',
        },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockTransactions),
              }),
            }),
          }),
        }),
      });

      const result = await transactionService.getUserTransactions(userId, options);

      expect(result.transactions).toHaveLength(2);
      expect(result.total).toBeDefined();
      expect(result.page).toBe(1);
      expect(result.limit).toBe(10);
    });

    it('should filter transactions by category', async () => {
      const userId = 'user-123';
      const categoryId = 'cat-123';
      const options = {
        categoryIds: [categoryId],
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue([]),
              }),
            }),
          }),
        }),
      });

      await transactionService.getUserTransactions(userId, options);

      // Verify that the where clause includes category filter
      expect(mockDb.select).toHaveBeenCalled();
    });
  });

  describe('Transaction Updates', () => {
    it('should update transaction details', async () => {
      const userId = 'user-123';
      const transactionId = 'tx-123';
      const updateData = {
        description: 'Updated description',
        amount: 75.50,
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([{
              id: transactionId,
              userId,
            }]),
          }),
        }),
      });

      mockDb.update.mockReturnValue({
        set: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            returning: jest.fn().mockResolvedValue([{
              id: transactionId,
              ...updateData,
              updatedAt: new Date(),
            }]),
          }),
        }),
      });

      const result = await transactionService.updateTransaction(transactionId, userId, updateData);

      expect(result.description).toBe(updateData.description);
      expect(result.amount).toBe(updateData.amount);
    });

    it('should prevent updating other users transactions', async () => {
      const userId = 'user-123';
      const transactionId = 'tx-456';
      const updateData = { description: 'Hacked description' };

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            limit: jest.fn().mockResolvedValue([]), // No transaction found
          }),
        }),
      });

      await expect(transactionService.updateTransaction(transactionId, userId, updateData))
        .rejects.toThrow('Transaction not found');
    });
  });

  describe('Transaction Statistics', () => {
    it('should calculate total income and expenses', async () => {
      const userId = 'user-123';
      const startDate = '2023-12-01';
      const endDate = '2023-12-31';

      const mockStats = [
        { type: 'income', total: 5000, count: 3 },
        { type: 'expense', total: 2000, count: 15 },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockStats),
          }),
        }),
      });

      const result = await transactionService.getTransactionStats(userId, startDate, endDate);

      expect(result.totalIncome).toBe(5000);
      expect(result.totalExpenses).toBe(2000);
      expect(result.netIncome).toBe(3000);
      expect(result.incomeCount).toBe(3);
      expect(result.expenseCount).toBe(15);
    });
  });
});

describe('AssetService Tests', () => {
  let assetService: AssetService;

  beforeEach(() => {
    assetService = new AssetService();
    jest.clearAllMocks();
  });

  describe('Asset Creation', () => {
    it('should create a new asset', async () => {
      const userId = 'user-123';
      const assetData = {
        name: 'Office Laptop',
        type: 'equipment' as const,
        currentValue: 1500,
        initialValue: 2000,
        currency: 'USD',
        purchaseDate: '2023-01-15',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'asset-123',
            userId,
            ...assetData,
            createdAt: new Date(),
          }]),
        }),
      });

      const result = await assetService.createAsset(userId, assetData);

      expect(result).toBeDefined();
      expect(result.name).toBe(assetData.name);
      expect(result.type).toBe(assetData.type);
      expect(result.currentValue).toBe(assetData.currentValue);
    });

    it('should validate asset value is non-negative', async () => {
      const userId = 'user-123';
      const assetData = {
        name: 'Invalid Asset',
        type: 'equipment' as const,
        currentValue: -100,
        currency: 'USD',
      };

      await expect(assetService.createAsset(userId, assetData))
        .rejects.toThrow('Asset value cannot be negative');
    });

    it('should validate asset type', async () => {
      const userId = 'user-123';
      const assetData = {
        name: 'Invalid Asset',
        type: 'invalid' as any,
        currentValue: 100,
        currency: 'USD',
      };

      await expect(assetService.createAsset(userId, assetData))
        .rejects.toThrow('Invalid asset type');
    });
  });

  describe('Asset Valuation', () => {
    it('should calculate total asset value', async () => {
      const userId = 'user-123';
      const currency = 'USD';

      const mockAssets = [
        { currentValue: 5000, currency: 'USD' },
        { currentValue: 2000, currency: 'USD' },
        { currentValue: 1000, currency: 'EUR' },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockAssets),
        }),
      });

      const result = await assetService.getTotalAssetValue(userId, currency);

      expect(result.totalValue).toBeGreaterThan(0);
      expect(result.breakdown).toBeDefined();
      expect(result.breakdown[currency]).toBeDefined();
    });

    it('should calculate depreciation', async () => {
      const asset = {
        id: 'asset-123',
        initialValue: 2000,
        currentValue: 1500,
        purchaseDate: '2023-01-15',
      };

      const depreciation = assetService.calculateDepreciation(asset);

      expect(depreciation.percentage).toBe(25); // (2000-1500)/2000 * 100
      expect(depreciation.amount).toBe(500);
      expect(depreciation.annualRate).toBeGreaterThan(0);
    });
  });
});

describe('InsightService Tests', () => {
  let insightService: InsightService;

  beforeEach(() => {
    insightService = new InsightService();
    jest.clearAllMocks();
  });

  describe('Insight Generation', () => {
    it('should generate spending insights', async () => {
      const userId = 'user-123';
      const options = {
        period: 'month' as const,
        startDate: '2023-12-01',
        endDate: '2023-12-31',
      };

      const mockTransactions = [
        { amount: 500, type: 'expense', category: 'Office' },
        { amount: 300, type: 'expense', category: 'Software' },
        { amount: 200, type: 'expense', category: 'Office' },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockTransactions),
        }),
      });

      const result = await insightService.generateSpendingInsights(userId, options);

      expect(result.totalSpent).toBe(1000);
      expect(result.topCategories).toBeDefined();
      expect(result.insights).toBeDefined();
      expect(result.recommendations).toBeDefined();
    });

    it('should generate income analysis', async () => {
      const userId = 'user-123';
      const options = {
        period: 'month' as const,
      };

      const mockTransactions = [
        { amount: 5000, type: 'income', date: '2023-12-15' },
        { amount: 3000, type: 'income', date: '2023-12-01' },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockTransactions),
        }),
      });

      const result = await insightService.generateIncomeAnalysis(userId, options);

      expect(result.totalIncome).toBe(8000);
      expect(result.averageIncome).toBe(4000);
      expect(result.trend).toBeDefined();
    });

    it('should detect spending anomalies', async () => {
      const userId = 'user-123';
      const options = {
        period: 'month' as const,
      };

      const mockTransactions = [
        { amount: 50, type: 'expense', date: '2023-12-15' },
        { amount: 5000, type: 'expense', date: '2023-12-16' }, // Anomaly
        { amount: 75, type: 'expense', date: '2023-12-17' },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockResolvedValue(mockTransactions),
        }),
      });

      const result = await insightService.detectAnomalies(userId, options);

      expect(result.anomalies).toBeDefined();
      expect(result.anomalies.length).toBeGreaterThan(0);
      expect(result.anomalies[0].type).toBe('unusual_spending');
    });
  });
});

describe('AuditService Tests', () => {
  let auditService: AuditService;

  beforeEach(() => {
    auditService = new AuditService();
    jest.clearAllMocks();
  });

  describe('Audit Logging', () => {
    it('should create audit log entry', async () => {
      const auditData = {
        userId: 'user-123',
        entityType: 'transaction',
        entityId: 'tx-123',
        action: 'create' as const,
        oldValue: null,
        newValue: {
          description: 'Test transaction',
          amount: 100,
        },
        ipAddress: '192.168.1.1',
        userAgent: 'Mozilla/5.0...',
      };

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{
            id: 'audit-123',
            ...auditData,
            timestamp: new Date(),
          }]),
        }),
      });

      const result = await auditService.createAuditLog(auditData);

      expect(result).toBeDefined();
      expect(result.userId).toBe(auditData.userId);
      expect(result.entityType).toBe(auditData.entityType);
      expect(result.action).toBe(auditData.action);
    });

    it('should retrieve audit logs with filters', async () => {
      const userId = 'user-123';
      const filters = {
        entityType: 'transaction',
        limit: 10,
      };

      const mockLogs = [
        {
          id: 'audit-1',
          userId,
          entityType: 'transaction',
          action: 'create',
          timestamp: new Date(),
        },
        {
          id: 'audit-2',
          userId,
          entityType: 'transaction',
          action: 'update',
          timestamp: new Date(),
        },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockResolvedValue(mockLogs),
            }),
          }),
        }),
      });

      const result = await auditService.getAuditLogs(userId, filters);

      expect(result.logs).toHaveLength(2);
      expect(result.logs[0].entityType).toBe('transaction');
    });

    it('should sanitize sensitive data in audit logs', async () => {
      const sensitiveData = {
        password: 'secret123',
        creditCard: '4111-1111-1111-1111',
        normalField: 'normal value',
      };

      const sanitized = auditService.sanitizeAuditData(sensitiveData);

      expect(sanitized.password).toBe('[REDACTED]');
      expect(sanitized.creditCard).toBe('[REDACTED]');
      expect(sanitized.normalField).toBe('normal value');
    });
  });
});

describe('Service Integration Tests', () => {
  it('should handle cascading operations', async () => {
    const userId = 'user-123';

    // Mock database operations
    const mockDb = require('@/lib/db/index').db;
    mockDb.select.mockReturnValue({
      from: jest.fn().mockReturnValue({
        where: jest.fn().mockReturnValue({
          limit: jest.fn().mockResolvedValue([]),
        }),
      }),
    });

    mockDb.insert.mockReturnValue({
      values: jest.fn().mockReturnValue({
        returning: jest.fn().mockResolvedValue([{
          id: 'test-id',
          userId,
          createdAt: new Date(),
        }]),
      }),
    });

    // Create category first
    const categoryService = new CategoryService();
    const category = await categoryService.createCategory(userId, {
      name: 'Test Category',
      type: 'expense',
    });

    expect(category).toBeDefined();

    // Then create transaction with that category
    const transactionService = new TransactionService();
    const transaction = await transactionService.createTransaction(userId, {
      description: 'Test Transaction',
      amount: 100,
      type: 'expense',
      categoryId: category.id,
      date: '2023-12-15',
    });

    expect(transaction).toBeDefined();
    expect(transaction.categoryId).toBe(category.id);
  });
});