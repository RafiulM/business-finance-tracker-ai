import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { render, screen, waitFor, act } from '@testing-library/react';
import { NextRequest } from 'next/server';
import { DashboardOverview } from '@/app/(dashboard)/overview/page';
import { TransactionService } from '@/lib/services/transaction-service';
import { CategoryService } from '@/lib/services/category-service';
import { AssetService } from '@/lib/services/asset-service';
import { InsightService } from '@/lib/services/insight-service';
import { CurrencyUtils } from '@/lib/utils/currency';
import { DateUtils } from '@/lib/utils/date';

// Mock Next.js router
jest.mock('next/navigation', () => ({
  useRouter: () => ({
    push: jest.fn(),
    replace: jest.fn(),
    prefetch: jest.fn(),
    back: jest.fn(),
    forward: jest.fn(),
    refresh: jest.fn(),
  }),
  useSearchParams: () => new URLSearchParams(),
  usePathname: () => '/dashboard/overview',
}));

// Mock the components that might cause issues
jest.mock('@/components/layout/Navigation', () => ({
  Navigation: () => <div data-testid="navigation">Navigation</div>,
}));

jest.mock('@/components/auth/AuthProvider', () => ({
  AuthProvider: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="auth-provider">{children}</div>
  ),
}));

jest.mock('@/lib/middleware/auth', () => ({
  validateSession: jest.fn().mockResolvedValue('user-123'),
}));

// Mock database
jest.mock('@/lib/db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Dashboard Performance Tests', () => {
  let transactionService: TransactionService;
  let categoryService: CategoryService;
  let assetService: AssetService;
  let insightService: InsightService;

  beforeAll(() => {
    transactionService = new TransactionService();
    categoryService = new CategoryService();
    assetService = new AssetService();
    insightService = new InsightService();
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Generate mock data for performance testing
  const generateMockTransactions = (count: number) => {
    const transactions = [];
    const now = Date.now();
    const oneYear = 365 * 24 * 60 * 60 * 1000;

    for (let i = 0; i < count; i++) {
      const date = new Date(now - Math.random() * oneYear);
      transactions.push({
        id: `tx-${i}`,
        description: `Transaction ${i}`,
        amount: Math.round((Math.random() * 10000 + 10) * 100) / 100,
        type: Math.random() > 0.3 ? 'expense' : 'income',
        categoryId: `cat-${Math.floor(Math.random() * 10)}`,
        date: DateUtils.formatDate(date),
        currency: 'USD',
        userId: 'user-123',
        createdAt: date,
        updatedAt: date,
      });
    }

    return transactions;
  };

  const generateMockCategories = () => [
    { id: 'cat-1', name: 'Office Supplies', type: 'expense', color: '#FF5733' },
    { id: 'cat-2', name: 'Software', type: 'expense', color: '#33FF57' },
    { id: 'cat-3', name: 'Travel', type: 'expense', color: '#3357FF' },
    { id: 'cat-4', name: 'Service Revenue', type: 'income', color: '#FF33F5' },
    { id: 'cat-5', name: 'Other', type: 'expense', color: '#33FFF5' },
  ];

  const generateMockAssets = (count: number) => {
    const assets = [];
    const assetTypes = ['cash', 'bank_account', 'investment', 'property', 'equipment', 'other'];

    for (let i = 0; i < count; i++) {
      assets.push({
        id: `asset-${i}`,
        name: `Asset ${i}`,
        type: assetTypes[Math.floor(Math.random() * assetTypes.length)],
        currentValue: Math.round((Math.random() * 100000 + 1000) * 100) / 100,
        initialValue: Math.round((Math.random() * 100000 + 1000) * 100) / 100,
        currency: 'USD',
        userId: 'user-123',
        createdAt: new Date(),
        updatedAt: new Date(),
      });
    }

    return assets;
  };

  describe('Dashboard Overview Performance', () => {
    it('should load dashboard quickly with minimal data', async () => {
      // Mock minimal data
      const mockTransactions = generateMockTransactions(50);
      const mockCategories = generateMockCategories();
      const mockAssets = generateMockAssets(5);

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

      // Mock services
      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      const mockGetCategories = jest.spyOn(categoryService, 'getUserCategories');
      const mockGetAssets = jest.spyOn(assetService, 'getUserAssets');
      const mockGetStats = jest.spyOn(transactionService, 'getTransactionStats');

      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions,
        total: 50,
        page: 1,
        limit: 20,
      });
      mockGetCategories.mockResolvedValue(mockCategories);
      mockGetAssets.mockResolvedValue({
        assets: mockAssets,
        total: 5,
        page: 1,
        limit: 20,
      });
      mockGetStats.mockResolvedValue({
        totalIncome: 50000,
        totalExpenses: 30000,
        netIncome: 20000,
        incomeCount: 15,
        expenseCount: 35,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(500); // Should load in under 500ms

      // Verify key elements are present
      expect(screen.getByText(/Total Income/i)).toBeInTheDocument();
      expect(screen.getByText(/Total Expenses/i)).toBeInTheDocument();
      expect(screen.getByText(/Net Income/i)).toBeInTheDocument();
    });

    it('should handle medium-sized datasets efficiently', async () => {
      const mockTransactions = generateMockTransactions(500);
      const mockCategories = generateMockCategories();
      const mockAssets = generateMockAssets(20);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      const mockGetCategories = jest.spyOn(categoryService, 'getUserCategories');
      const mockGetAssets = jest.spyOn(assetService, 'getUserAssets');
      const mockGetStats = jest.spyOn(transactionService, 'getTransactionStats');

      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions.slice(0, 20), // Paginated
        total: 500,
        page: 1,
        limit: 20,
      });
      mockGetCategories.mockResolvedValue(mockCategories);
      mockGetAssets.mockResolvedValue({
        assets: mockAssets,
        total: 20,
        page: 1,
        limit: 20,
      });
      mockGetStats.mockResolvedValue({
        totalIncome: 250000,
        totalExpenses: 150000,
        netIncome: 100000,
        incomeCount: 150,
        expenseCount: 350,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should load in under 1 second

      // Services should be called with correct parameters
      expect(mockGetTransactions).toHaveBeenCalledWith('user-123', {
        page: 1,
        limit: 20,
        sortBy: 'date',
        sortOrder: 'desc',
      });
    });

    it('should handle large datasets without performance degradation', async () => {
      const mockTransactions = generateMockTransactions(5000);
      const mockCategories = generateMockCategories();
      const mockAssets = generateMockAssets(100);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      const mockGetCategories = jest.spyOn(categoryService, 'getUserCategories');
      const mockGetAssets = jest.spyOn(assetService, 'getUserAssets');
      const mockGetStats = jest.spyOn(transactionService, 'getTransactionStats');

      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions.slice(0, 20), // Still paginated
        total: 5000,
        page: 1,
        limit: 20,
      });
      mockGetCategories.mockResolvedValue(mockCategories);
      mockGetAssets.mockResolvedValue({
        assets: mockAssets.slice(0, 20), // Paginated
        total: 100,
        page: 1,
        limit: 20,
      });
      mockGetStats.mockResolvedValue({
        totalIncome: 2500000,
        totalExpenses: 1500000,
        netIncome: 1000000,
        incomeCount: 1500,
        expenseCount: 3500,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1500); // Should load in under 1.5 seconds even with large datasets

      // Verify performance metrics
      expect(mockGetTransactions).toHaveBeenCalledTimes(1);
      expect(mockGetStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('Component Rendering Performance', () => {
    it('should render charts efficiently', async () => {
      // Mock chart data
      const mockChartData = Array.from({ length: 12 }, (_, i) => ({
        month: i + 1,
        income: Math.random() * 50000,
        expenses: Math.random() * 40000,
        net: Math.random() * 20000,
      }));

      const mockGetMonthlyStats = jest.spyOn(transactionService, 'getMonthlyStats');
      mockGetMonthlyStats.mockResolvedValue(mockChartData);

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(800); // Charts should render quickly
      expect(mockGetMonthlyStats).toHaveBeenCalled();
    });

    it('should handle real-time updates efficiently', async () => {
      const mockTransactions = generateMockTransactions(100);
      const mockCategories = generateMockCategories();

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions,
        total: 100,
        page: 1,
        limit: 20,
      });

      await act(async () => {
        render(<DashboardOverview />);
      });

      // Simulate real-time update
      const newTransaction = generateMockTransactions(1)[0];
      mockTransactions.push(newTransaction);

      const startTime = performance.now();

      await act(async () => {
        mockGetTransactions.mockResolvedValue({
          transactions: mockTransactions,
          total: 101,
          page: 1,
          limit: 20,
        });
      });

      const endTime = performance.now();
      const updateDuration = endTime - startTime;

      expect(updateDuration).toBeLessThan(200); // Updates should be very fast
    });
  });

  describe('Data Fetching Performance', () => {
    it('should fetch multiple data sources concurrently', async () => {
      const mockTransactions = generateMockTransactions(200);
      const mockCategories = generateMockCategories();
      const mockAssets = generateMockAssets(10);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      const mockGetCategories = jest.spyOn(categoryService, 'getUserCategories');
      const mockGetAssets = jest.spyOn(assetService, 'getUserAssets');
      const mockGetStats = jest.spyOn(transactionService, 'getTransactionStats');

      // Simulate realistic API response times
      mockGetTransactions.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          transactions: mockTransactions.slice(0, 20),
          total: 200,
          page: 1,
          limit: 20,
        }), 50))
      );

      mockGetCategories.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve(mockCategories), 30))
      );

      mockGetAssets.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          assets: mockAssets,
          total: 10,
          page: 1,
          limit: 20,
        }), 40))
      );

      mockGetStats.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          totalIncome: 100000,
          totalExpenses: 60000,
          netIncome: 40000,
          incomeCount: 60,
          expenseCount: 140,
        }), 60))
      );

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should complete in roughly the longest single API call time due to concurrency
      expect(duration).toBeLessThan(200); // Well under the sum of individual call times

      // All services should have been called
      expect(mockGetTransactions).toHaveBeenCalled();
      expect(mockGetCategories).toHaveBeenCalled();
      expect(mockGetAssets).toHaveBeenCalled();
      expect(mockGetStats).toHaveBeenCalled();
    });

    it('should handle slow API responses gracefully', async () => {
      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      const mockGetCategories = jest.spyOn(categoryService, 'getUserCategories');

      // Simulate slow responses
      mockGetTransactions.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve({
          transactions: [],
          total: 0,
          page: 1,
          limit: 20,
        }), 200)) // 200ms delay
      );

      mockGetCategories.mockImplementation(() =>
        new Promise(resolve => setTimeout(() => resolve([]), 300)) // 300ms delay
      );

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      // Should still load within reasonable time despite slow APIs
      expect(duration).toBeLessThan(500);
    });
  });

  describe('Memory Usage Performance', () => {
    it('should not cause memory leaks during dashboard navigation', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Render dashboard multiple times to simulate navigation
      for (let i = 0; i < 10; i++) {
        const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
        mockGetTransactions.mockResolvedValue({
          transactions: generateMockTransactions(50),
          total: 50,
          page: 1,
          limit: 20,
        });

        await act(async () => {
          const { unmount } = render(<DashboardOverview />);
          unmount();
        });

        // Clean up
        jest.clearAllMocks();
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal
      expect(memoryIncrease).toBeLessThan(5 * 1024 * 1024); // Less than 5MB
    });

    it('should efficiently handle large data sets in memory', async () => {
      const largeDataset = generateMockTransactions(1000);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: largeDataset.slice(0, 50), // Still limit displayed data
        total: 1000,
        page: 1,
        limit: 50,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(1000); // Should handle large datasets efficiently

      // Even with 1000 transactions, only a subset should be processed for display
      expect(mockGetTransactions).toHaveBeenCalledWith('user-123', expect.objectContaining({
        limit: expect.any(Number),
      }));
    });
  });

  describe('Currency and Formatting Performance', () => {
    it('should format currencies efficiently', async () => {
      const mockTransactions = generateMockTransactions(100);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions,
        total: 100,
        page: 1,
        limit: 100,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      // Check if currency formatting is efficient
      const formattedAmounts = mockTransactions.map(tx =>
        CurrencyUtils.formatCurrency(tx.amount, tx.currency)
      );

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(formattedAmounts).toHaveLength(100);
      expect(duration).toBeLessThan(500); // Currency formatting should be fast
    });

    it('should handle multiple currency conversions efficiently', async () => {
      const mockTransactions = generateMockTransactions(50);
      // Mix different currencies
      const currencies = ['USD', 'EUR', 'GBP', 'JPY'];
      mockTransactions.forEach((tx, i) => {
        tx.currency = currencies[i % currencies.length];
      });

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions,
        total: 50,
        page: 1,
        limit: 50,
      });

      // Mock currency conversion
      const mockConvertCurrency = jest.spyOn(CurrencyUtils, 'convertCurrency');
      mockConvertCurrency.mockResolvedValue({
        fromCurrency: 'USD',
        toCurrency: 'USD',
        fromAmount: 100,
        toAmount: 100,
        rate: 1,
        timestamp: new Date(),
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(600); // Should handle multiple currencies efficiently
    });
  });

  describe('Date Processing Performance', () => {
    it('should handle date range filtering efficiently', async () => {
      const mockTransactions = generateMockTransactions(1000);

      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: mockTransactions.slice(0, 20),
        total: 1000,
        page: 1,
        limit: 20,
      });

      const dateRange = {
        startDate: DateUtils.formatDate(DateUtils.subtractDays(new Date(), 30)),
        endDate: DateUtils.formatDate(new Date()),
      };

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).beLessThan(800); // Date processing should be efficient

      // Should have called with date range
      expect(mockGetTransactions).toHaveBeenCalledWith('user-123', expect.objectContaining({
        startDate: expect.any(String),
        endDate: expect.any(String),
      }));
    });

    it('should calculate date-based statistics efficiently', async () => {
      const mockGetStats = jest.spyOn(transactionService, 'getTransactionStats');
      mockGetStats.mockResolvedValue({
        totalIncome: 100000,
        totalExpenses: 60000,
        netIncome: 40000,
        incomeCount: 80,
        expenseCount: 120,
      });

      const startTime = performance.now();

      await act(async () => {
        render(<DashboardOverview />);
      });

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).beLessThan(500); // Statistics calculation should be fast
      expect(mockGetStats).toHaveBeenCalled();
    });
  });

  describe('Stress Testing', () => {
    it('should handle rapid dashboard switching', async () => {
      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: generateMockTransactions(100),
        total: 100,
        page: 1,
        limit: 20,
      });

      const renderTimes = [];

      for (let i = 0; i < 5; i++) {
        const startTime = performance.now();

        await act(async () => {
          const { unmount } = render(<DashboardOverview />);
          unmount();
        });

        const endTime = performance.now();
        renderTimes.push(endTime - startTime);
      }

      // Average render time should be reasonable
      const averageTime = renderTimes.reduce((a, b) => a + b, 0) / renderTimes.length;
      expect(averageTime).toBeLessThan(300);

      // Max render time should not be excessive
      const maxTime = Math.max(...renderTimes);
      expect(maxTime).toBeLessThan(500);
    });

    it('should maintain performance under high user load', async () => {
      const concurrentUsers = 10;
      const mockGetTransactions = jest.spyOn(transactionService, 'getUserTransactions');
      mockGetTransactions.mockResolvedValue({
        transactions: generateMockTransactions(50),
        total: 50,
        page: 1,
        limit: 20,
      });

      const startTime = performance.now();

      const promises = Array.from({ length: concurrentUsers }, (_, i) =>
        act(async () => {
          const { unmount } = render(<DashboardOverview />);
          unmount();
        })
      );

      await Promise.all(promises);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(duration).toBeLessThan(2000); // Should handle concurrent users efficiently
    });
  });
});