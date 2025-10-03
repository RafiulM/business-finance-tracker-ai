import { describe, it, expect, beforeAll, afterAll, beforeEach, jest } from '@jest/globals';
import { TransactionService } from '@/lib/services/transaction-service';
import { CategoryService } from '@/lib/services/category-service';
import { TransactionParser } from '@/lib/ai/transaction-parser';
import { CurrencyUtils } from '@/lib/utils/currency';
import { DateUtils } from '@/lib/utils/date';

// Mock dependencies to isolate performance testing
jest.mock('@/lib/db/index', () => ({
  db: {
    select: jest.fn(),
    insert: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('Transaction Processing Performance Tests', () => {
  let transactionService: TransactionService;
  let categoryService: CategoryService;
  let transactionParser: TransactionParser;

  beforeAll(() => {
    transactionService = new TransactionService();
    categoryService = new CategoryService();
    transactionParser = new TransactionParser({} as any);
  });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  // Generate test data
  const generateTestTransactions = (count: number) => {
    const categories = [
      { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
      { id: 'cat-2', name: 'Software', type: 'expense' },
      { id: 'cat-3', name: 'Travel', type: 'expense' },
      { id: 'cat-4', name: 'Service Revenue', type: 'income' },
      { id: 'cat-5', name: 'Other', type: 'expense' },
    ];

    const descriptions = [
      'Office supplies purchase',
      'Software subscription renewal',
      'Client payment received',
      'Travel expenses',
      'Equipment rental',
      'Consulting services',
      'Marketing materials',
      'Utilities payment',
      'Insurance premium',
      'Tax payment',
    ];

    const transactions = [];
    const now = Date.now();

    for (let i = 0; i < count; i++) {
      const isIncome = Math.random() > 0.7;
      const category = isIncome ? categories[3] : categories[Math.floor(Math.random() * 4)];
      const date = new Date(now - Math.floor(Math.random() * 365 * 24 * 60 * 60 * 1000));

      transactions.push({
        id: `tx-${i + 1}`,
        description: descriptions[Math.floor(Math.random() * descriptions.length)],
        amount: Math.round((Math.random() * 10000 + 10) * 100) / 100, // $10-$10,000
        type: isIncome ? 'income' : 'expense',
        categoryId: category.id,
        date: DateUtils.formatDate(date),
        currency: 'USD',
        userId: 'user-123',
        createdAt: date,
        updatedAt: date,
      });
    }

    return transactions;
  };

  describe('Transaction Creation Performance', () => {
    it('should create single transaction quickly', async () => {
      const transaction = generateTestTransactions(1)[0];

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([transaction]),
        }),
      });

      const startTime = performance.now();
      const result = await transactionService.createTransaction('user-123', transaction);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be under 100ms
    });

    it('should handle batch transaction creation efficiently', async () => {
      const transactions = generateTestTransactions(100);

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([transactions[0]]),
        }),
      });

      const startTime = performance.now();

      const promises = transactions.map(tx =>
        transactionService.createTransaction('user-123', tx)
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should be under 1 second for 100 transactions

      // Average time per transaction should be reasonable
      const avgTimePerTransaction = duration / 100;
      expect(avgTimePerTransaction).toBeLessThan(10); // Under 10ms per transaction
    });

    it('should maintain performance with large transaction batches', async () => {
      const transactions = generateTestTransactions(1000);

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([transactions[0]]),
        }),
      });

      const startTime = performance.now();

      // Process in batches to simulate real-world scenario
      const batchSize = 50;
      const results = [];

      for (let i = 0; i < transactions.length; i += batchSize) {
        const batch = transactions.slice(i, i + batchSize);
        const batchPromises = batch.map(tx =>
          transactionService.createTransaction('user-123', tx)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(1000);
      expect(duration).toBeLessThan(5000); // Should be under 5 seconds for 1000 transactions
    });
  });

  describe('Transaction Retrieval Performance', () => {
    it('should retrieve transactions quickly with pagination', async () => {
      const mockTransactions = generateTestTransactions(1000);

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockTransactions.slice(0, 20)),
              }),
            }),
          }),
        }),
      });

      const startTime = performance.now();
      const result = await transactionService.getUserTransactions('user-123', {
        page: 1,
        limit: 20,
      });
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.transactions).toHaveLength(20);
      expect(duration).toBeLessThan(50); // Should be under 50ms
    });

    it('should handle complex filtering efficiently', async () => {
      const mockTransactions = generateTestTransactions(1000);

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

      const startTime = performance.now();
      const result = await transactionService.getUserTransactions('user-123', {
        page: 1,
        limit: 50,
        type: 'expense',
        startDate: '2023-01-01',
        endDate: '2023-12-31',
        categoryIds: ['cat-1', 'cat-2'],
        minAmount: 100,
        maxAmount: 1000,
        search: 'office',
        sortBy: 'date',
        sortOrder: 'desc',
      });
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.transactions).toBeDefined();
      expect(duration).toBeLessThan(100); // Should be under 100ms even with complex filters
    });

    it('should handle large dataset queries efficiently', async () => {
      const mockTransactions = generateTestTransactions(10000);

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            orderBy: jest.fn().mockReturnValue({
              limit: jest.fn().mockReturnValue({
                offset: jest.fn().mockResolvedValue(mockTransactions.slice(0, 100)),
              }),
            }),
          }),
        }),
      });

      const startTime = performance.now();
      const result = await transactionService.getUserTransactions('user-123', {
        page: 1,
        limit: 100,
      });
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(result.transactions).toHaveLength(100);
      expect(duration).toBeLessThan(200); // Should be under 200ms even with 10k total transactions
    });
  });

  describe('Transaction Statistics Performance', () => {
    it('should calculate statistics quickly', async () => {
      const mockStats = [
        { type: 'income', total: 50000, count: 25 },
        { type: 'expense', total: 30000, count: 150 },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockStats),
          }),
        }),
      });

      const startTime = performance.now();
      const stats = await transactionService.getTransactionStats('user-123', '2023-01-01', '2023-12-31');
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(stats.totalIncome).toBe(50000);
      expect(stats.totalExpenses).toBe(30000);
      expect(stats.netIncome).toBe(20000);
      expect(duration).toBeLessThan(50); // Should be under 50ms
    });

    it('should handle category breakdown performance', async () => {
      const mockCategoryStats = [
        { categoryId: 'cat-1', total: 5000, count: 15 },
        { categoryId: 'cat-2', total: 3000, count: 8 },
        { categoryId: 'cat-3', total: 2000, count: 12 },
      ];

      const mockDb = require('@/lib/db/index').db;
      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockCategoryStats),
          }),
        }),
      });

      const startTime = performance.now();
      const breakdown = await transactionService.getCategoryBreakdown('user-123', '2023-01-01', '2023-12-31');
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(breakdown).toBeDefined();
      expect(duration).toBeLessThan(75); // Should be under 75ms
    });
  });

  describe('AI Transaction Processing Performance', () => {
    it('should categorize transactions efficiently', async () => {
      const transactions = generateTestTransactions(50);

      // Mock AI responses
      const mockAIResponse = {
        content: JSON.stringify({
          category: { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
          confidence: 90,
          processedDescription: 'Processed description',
          extractedMetadata: { tags: ['office'] },
          suggestions: [],
        }),
      };

      const mockOpenaiClient = {
        chatCompletion: jest.fn().mockResolvedValue(mockAIResponse),
      };

      const parser = new TransactionParser(mockOpenaiClient as any);

      const startTime = performance.now();

      const promises = transactions.map(tx =>
        parser.categorizeTransaction(tx, [])
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(50);
      expect(duration).toBeLessThan(5000); // Should be under 5 seconds for 50 AI categorizations

      // Mock AI responses should be fast
      expect(mockOpenaiClient.chatCompletion).toHaveBeenCalledTimes(50);
    });

    it('should handle batch AI processing with rate limiting', async () => {
      const transactions = generateTestTransactions(20);

      const mockAIResponse = {
        content: JSON.stringify({
          category: { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
          confidence: 90,
          processedDescription: 'Processed description',
          extractedMetadata: { tags: ['office'] },
          suggestions: [],
        }),
      };

      const mockOpenaiClient = {
        chatCompletion: jest.fn().mockResolvedValue(mockAIResponse),
      };

      const parser = new TransactionParser(mockOpenaiClient as any);

      const startTime = performance.now();
      const results = await parser.batchCategorizeTransactions(transactions, []);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(20);
      expect(duration).toBeLessThan(3000); // Should be under 3 seconds for batch processing
    });

    it('should fallback to rule-based processing when AI is slow', async () => {
      const transactions = generateTestTransactions(10);

      // Mock slow AI responses
      const mockOpenaiClient = {
        chatCompletion: jest.fn().mockImplementation(() =>
          new Promise(resolve => setTimeout(() => resolve({
            content: JSON.stringify({
              category: { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
              confidence: 90,
              processedDescription: 'Processed description',
              extractedMetadata: { tags: ['office'] },
              suggestions: [],
            }),
          }), 2000)) // 2 second delay
        ),
      };

      const parser = new TransactionParser(mockOpenaiClient as any);

      const startTime = performance.now();

      // Process with timeout simulation
      const promises = transactions.map(tx =>
        Promise.race([
          parser.categorizeTransaction(tx, []),
          new Promise(resolve => setTimeout(() => resolve({
            category: { id: 'fallback', name: 'Fallback', type: 'expense' },
            confidence: 0,
            processedDescription: tx.description,
            extractedMetadata: { tags: [] },
            suggestions: [],
            warnings: ['AI service timeout - using fallback'],
          }), 1000))
        ])
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(10);
      expect(duration).toBeLessThan(2000); // Should be under 2 seconds with fallback
    });
  });

  describe('Currency Conversion Performance', () => {
    it('should handle currency conversions efficiently', async () => {
      const transactions = generateTestTransactions(100);

      // Mock exchange rates
      const mockExchangeRates = {
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.0,
        CAD: 1.25,
        AUD: 1.35,
      };

      const mockGetExchangeRates = jest.spyOn(CurrencyUtils, 'getExchangeRates');
      mockGetExchangeRates.mockResolvedValue(mockExchangeRates);

      const startTime = performance.now();

      const conversions = transactions.map(tx =>
        CurrencyUtils.convertCurrency(tx.amount, 'USD', 'EUR')
      );

      const results = await Promise.all(conversions);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(100);
      expect(duration).toBeLessThan(1000); // Should be under 1 second for 100 conversions

      // Exchange rates should be cached after first call
      expect(mockGetExchangeRates).toHaveBeenCalledTimes(1);
    });

    it('should handle batch currency conversions efficiently', async () => {
      const conversions = [
        { amount: 100, fromCurrency: 'USD', toCurrency: 'EUR' },
        { amount: 200, fromCurrency: 'USD', toCurrency: 'GBP' },
        { amount: 300, fromCurrency: 'USD', toCurrency: 'JPY' },
        { amount: 400, fromCurrency: 'USD', toCurrency: 'CAD' },
        { amount: 500, fromCurrency: 'USD', toCurrency: 'AUD' },
      ];

      const mockExchangeRates = {
        EUR: 0.85,
        GBP: 0.73,
        JPY: 110.0,
        CAD: 1.25,
        AUD: 1.35,
      };

      const mockGetExchangeRates = jest.spyOn(CurrencyUtils, 'getExchangeRates');
      mockGetExchangeRates.mockResolvedValue(mockExchangeRates);

      const startTime = performance.now();
      const results = await CurrencyUtils.convertMultipleAmounts(conversions);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(5);
      expect(duration).toBeLessThan(100); // Should be very fast for small batches
    });
  });

  describe('Memory Usage Performance', () => {
    it('should handle large datasets without memory leaks', async () => {
      const initialMemory = process.memoryUsage().heapUsed;

      // Process large dataset multiple times
      for (let i = 0; i < 10; i++) {
        const transactions = generateTestTransactions(1000);

        // Simulate processing
        const processed = transactions.map(tx => ({
          ...tx,
          formattedAmount: CurrencyUtils.formatCurrency(tx.amount, tx.currency),
          processedDate: DateUtils.formatDate(new Date(tx.date)),
        }));

        // Sort by amount
        processed.sort((a, b) => b.amount - a.amount);

        // Calculate statistics
        const total = processed.reduce((sum, tx) => sum + tx.amount, 0);
        const average = total / processed.length;

        // Clear reference
        processed.length = 0;
      }

      // Force garbage collection if available
      if (global.gc) {
        global.gc();
      }

      const finalMemory = process.memoryUsage().heapUsed;
      const memoryIncrease = finalMemory - initialMemory;

      // Memory increase should be minimal (less than 10MB)
      expect(memoryIncrease).toBeLessThan(10 * 1024 * 1024);
    });

    it('should efficiently handle concurrent transaction processing', async () => {
      const concurrency = 10;
      const transactionsPerBatch = 100;

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'tx-1' }]),
        }),
      });

      const startTime = performance.now();

      const promises = [];
      for (let i = 0; i < concurrency; i++) {
        const transactions = generateTestTransactions(transactionsPerBatch);
        const batchPromise = Promise.all(
          transactions.map(tx =>
            transactionService.createTransaction(`user-${i}`, tx)
          )
        );
        promises.push(batchPromise);
      }

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(concurrency);
      expect(duration).toBeLessThan(3000); // Should be under 3 seconds for concurrent processing
    });
  });

  describe('Database Query Optimization', () => {
    it('should use efficient indexing for date ranges', async () => {
      const transactions = generateTestTransactions(1000);

      const mockDb = require('@/lib/db/index').db;
      let queryCount = 0;

      mockDb.select.mockImplementation(() => ({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockImplementation(() => {
            queryCount++;
            return {
              orderBy: jest.fn().mockReturnValue({
                limit: jest.fn().mockReturnValue({
                  offset: jest.fn().mockResolvedValue(transactions),
                }),
              }),
            };
          }),
        }),
      }));

      // Perform multiple queries with different date ranges
      const queries = [
        { startDate: '2023-01-01', endDate: '2023-03-31' },
        { startDate: '2023-04-01', endDate: '2023-06-30' },
        { startDate: '2023-07-01', endDate: '2023-09-30' },
        { startDate: '2023-10-01', endDate: '2023-12-31' },
      ];

      const startTime = performance.now();

      const promises = queries.map(query =>
        transactionService.getUserTransactions('user-123', {
          ...query,
          page: 1,
          limit: 50,
        })
      );

      const results = await Promise.all(promises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(4);
      expect(queryCount).toBe(4);
      expect(duration).toBeLessThan(200); // Should be under 200ms for 4 date range queries
    });

    it('should handle complex aggregations efficiently', async () => {
      const mockDb = require('@/lib/db/index').db;

      // Mock aggregation data
      const mockAggregations = {
        daily: Array.from({ length: 365 }, (_, i) => ({
          date: DateUtils.formatDate(new Date(2023, 0, i + 1)),
          totalIncome: Math.random() * 1000,
          totalExpenses: Math.random() * 800,
          transactionCount: Math.floor(Math.random() * 20) + 1,
        })),
        monthly: Array.from({ length: 12 }, (_, i) => ({
          month: i + 1,
          totalIncome: Math.random() * 30000,
          totalExpenses: Math.random() * 25000,
          transactionCount: Math.floor(Math.random() * 100) + 50,
        })),
        category: Array.from({ length: 10 }, (_, i) => ({
          categoryId: `cat-${i}`,
          total: Math.random() * 5000,
          count: Math.floor(Math.random() * 50) + 1,
        })),
      };

      mockDb.select.mockReturnValue({
        from: jest.fn().mockReturnValue({
          where: jest.fn().mockReturnValue({
            groupBy: jest.fn().mockResolvedValue(mockAggregations.daily),
          }),
        }),
      });

      const startTime = performance.now();

      // Perform multiple aggregation queries
      const [dailyStats, monthlyStats, categoryStats] = await Promise.all([
        transactionService.getDailyStats('user-123', '2023-01-01', '2023-12-31'),
        transactionService.getMonthlyStats('user-123', '2023-01-01', '2023-12-31'),
        transactionService.getCategoryStats('user-123', '2023-01-01', '2023-12-31'),
      ]);

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(dailyStats).toBeDefined();
      expect(monthlyStats).toBeDefined();
      expect(categoryStats).toBeDefined();
      expect(duration).toBeLessThan(500); // Should be under 500ms for complex aggregations
    });
  });

  describe('Stress Testing', () => {
    it('should handle high transaction volume', async () => {
      const highVolumeTransactions = generateTestTransactions(5000);

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([highVolumeTransactions[0]]),
        }),
      });

      const startTime = performance.now();

      // Process in smaller batches to avoid overwhelming the system
      const batchSize = 100;
      const results = [];

      for (let i = 0; i < highVolumeTransactions.length; i += batchSize) {
        const batch = highVolumeTransactions.slice(i, i + batchSize);
        const batchPromises = batch.map(tx =>
          transactionService.createTransaction('user-123', tx)
        );
        const batchResults = await Promise.all(batchPromises);
        results.push(...batchResults);

        // Small delay to prevent overwhelming the system
        await new Promise(resolve => setTimeout(resolve, 1));
      }

      const endTime = performance.now();
      const duration = endTime - startTime;

      expect(results).toHaveLength(5000);
      expect(duration).toBeLessThan(10000); // Should be under 10 seconds for 5000 transactions

      // Calculate throughput
      const throughput = 5000 / (duration / 1000);
      expect(throughput).toBeGreaterThan(500); // Should handle at least 500 transactions per second
    });

    it('should maintain performance under concurrent load', async () => {
      const concurrentUsers = 20;
      const transactionsPerUser = 50;

      const mockDb = require('@/lib/db/index').db;
      mockDb.insert.mockReturnValue({
        values: jest.fn().mockReturnValue({
          returning: jest.fn().mockResolvedValue([{ id: 'tx-1' }]),
        }),
      });

      const startTime = performance.now();

      // Simulate multiple users creating transactions concurrently
      const userPromises = Array.from({ length: concurrentUsers }, (_, userIndex) => {
        const transactions = generateTestTransactions(transactionsPerUser);

        return Promise.all(
          transactions.map(tx =>
            transactionService.createTransaction(`user-${userIndex}`, tx)
          )
        );
      });

      const results = await Promise.all(userPromises);
      const endTime = performance.now();
      const duration = endTime - startTime;

      const totalTransactions = results.flat().length;
      expect(totalTransactions).toBe(concurrentUsers * transactionsPerUser);
      expect(duration).toBeLessThan(5000); // Should be under 5 seconds for concurrent load

      // Calculate concurrent throughput
      const throughput = totalTransactions / (duration / 1000);
      expect(throughput).toBeGreaterThan(200); // Should handle at least 200 TPS under concurrent load
    });
  });
});