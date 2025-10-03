import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { OpenAIClient } from '@/lib/ai/openai-client';
import { TransactionParser } from '@/lib/ai/transaction-parser';
import { InsightGenerator } from '@/lib/ai/insight-generator';

// Mock OpenAI
jest.mock('openai', () => {
  return {
    OpenAI: jest.fn().mockImplementation(() => ({
      chat: {
        completions: {
          create: jest.fn(),
        },
      },
    })),
  };
});

describe('OpenAI Client Tests', () => {
  let openaiClient: OpenAIClient;

  beforeEach(() => {
    openaiClient = new OpenAIClient();
    jest.clearAllMocks();
  });

  describe('Health Check', () => {
    it('should pass health check when API is available', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: { content: 'OK' },
        }],
      });

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const result = await openaiClient.healthCheck();

      expect(result.healthy).toBe(true);
      expect(result.responseTime).toBeGreaterThan(0);
    });

    it('should fail health check when API is unavailable', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockCreate = jest.fn().mockRejectedValue(new Error('API Error'));

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const result = await openaiClient.healthCheck();

      expect(result.healthy).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('should cache health check results', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockCreate = jest.fn().mockResolvedValue({
        choices: [{
          message: { content: 'OK' },
        }],
      });

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      // First call
      const result1 = await openaiClient.healthCheck();
      // Second call within cache period
      const result2 = await openaiClient.healthCheck();

      expect(result1.healthy).toBe(true);
      expect(result2.healthy).toBe(true);
      expect(mockCreate).toHaveBeenCalledTimes(1); // Should be cached
    });
  });

  describe('Chat Completion', () => {
    it('should send chat completion request', async () => {
      const mockResponse = {
        choices: [{
          message: {
            content: 'This is a test response',
            role: 'assistant',
          },
        }],
        usage: {
          prompt_tokens: 10,
          completion_tokens: 5,
          total_tokens: 15,
        },
      };

      const mockOpenAI = require('openai').OpenAI;
      const mockCreate = jest.fn().mockResolvedValue(mockResponse);

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const messages = [
        { role: 'system', content: 'You are a helpful assistant.' },
        { role: 'user', content: 'Hello, world!' },
      ];

      const result = await openaiClient.chatCompletion(messages);

      expect(result.content).toBe('This is a test response');
      expect(result.usage.promptTokens).toBe(10);
      expect(result.usage.completionTokens).toBe(5);
      expect(result.usage.totalTokens).toBe(15);

      expect(mockCreate).toHaveBeenCalledWith({
        model: 'gpt-4',
        messages,
        temperature: 0.7,
        max_tokens: 1000,
      });
    });

    it('should handle API errors gracefully', async () => {
      const mockOpenAI = require('openai').OpenAI;
      const mockCreate = jest.fn().mockRejectedValue(new Error('Rate limit exceeded'));

      mockOpenAI.mockImplementation(() => ({
        chat: {
          completions: {
            create: mockCreate,
          },
        },
      }));

      const messages = [{ role: 'user', content: 'Test' }];

      await expect(openaiClient.chatCompletion(messages))
        .rejects.toThrow('AI service temporarily unavailable');
    });

    it('should validate messages format', async () => {
      const invalidMessages = [
        { role: 'invalid', content: 'Test' },
      ];

      await expect(openaiClient.chatCompletion(invalidMessages))
        .rejects.toThrow('Invalid message format');
    });
  });
});

describe('Transaction Parser Tests', () => {
  let transactionParser: TransactionParser;
  let mockOpenaiClient: jest.Mocked<OpenAIClient>;

  beforeEach(() => {
    mockOpenaiClient = {
      chatCompletion: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    transactionParser = new TransactionParser(mockOpenaiClient);
    jest.clearAllMocks();
  });

  describe('Transaction Categorization', () => {
    it('should categorize simple expense transaction', async () => {
      const transactionData = {
        description: 'Office supplies from Staples',
        amount: 45.99,
        type: 'expense' as const,
        currency: 'USD',
        date: '2023-12-15',
      };

      const mockAIResponse = {
        content: JSON.stringify({
          category: {
            id: 'office-supplies',
            name: 'Office Supplies',
            type: 'expense',
          },
          confidence: 95,
          processedDescription: 'Office supplies from Staples',
          extractedMetadata: {
            vendor: 'Staples',
            tags: ['office', 'supplies'],
          },
          suggestions: [],
        }),
      };

      mockOpenaiClient.chatCompletion.mockResolvedValue(mockAIResponse);

      const result = await transactionParser.categorizeTransaction(transactionData, []);

      expect(result.category.name).toBe('Office Supplies');
      expect(result.confidence).toBe(95);
      expect(result.extractedMetadata.vendor).toBe('Staples');
      expect(result.suggestions).toBeDefined();
    });

    it('should categorize income transaction', async () => {
      const transactionData = {
        description: 'Client payment for website design',
        amount: 2500,
        type: 'income' as const,
        currency: 'USD',
        date: '2023-12-15',
      };

      const mockAIResponse = {
        content: JSON.stringify({
          category: {
            id: 'service-revenue',
            name: 'Service Revenue',
            type: 'income',
          },
          confidence: 90,
          processedDescription: 'Client payment for website design',
          extractedMetadata: {
            client: 'Website design client',
            tags: ['client', 'payment', 'design'],
          },
          suggestions: [],
        }),
      };

      mockOpenaiClient.chatCompletion.mockResolvedValue(mockAIResponse);

      const result = await transactionParser.categorizeTransaction(transactionData, []);

      expect(result.category.type).toBe('income');
      expect(result.category.name).toBe('Service Revenue');
      expect(result.confidence).toBe(90);
    });

    it('should handle AI service failures gracefully', async () => {
      const transactionData = {
        description: 'Test transaction',
        amount: 50,
        type: 'expense' as const,
        currency: 'USD',
        date: '2023-12-15',
      };

      mockOpenaiClient.chatCompletion.mockRejectedValue(new Error('AI service down'));

      const result = await transactionParser.categorizeTransaction(transactionData, []);

      // Should return fallback category
      expect(result.category.name).toBe('Uncategorized Expense');
      expect(result.confidence).toBe(0);
      expect(result.warnings).toContain('AI service unavailable - using fallback categorization');
    });
  });
});

describe('Insight Generator Tests', () => {
  let insightGenerator: InsightGenerator;
  let mockOpenaiClient: jest.Mocked<OpenAIClient>;

  beforeEach(() => {
    mockOpenaiClient = {
      chatCompletion: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    insightGenerator = new InsightGenerator(mockOpenaiClient);
    jest.clearAllMocks();
  });

  describe('Spending Insights', () => {
    it('should generate spending pattern insights', async () => {
      const transactionData = [
        {
          description: 'Office supplies',
          amount: 50,
          type: 'expense',
          category: 'Office Supplies',
          date: '2023-12-15',
        },
        {
          description: 'Software subscription',
          amount: 29.99,
          type: 'expense',
          category: 'Software',
          date: '2023-12-16',
        },
      ];

      const mockAIResponse = {
        content: JSON.stringify({
          insights: [
            {
              type: 'spending_pattern',
              title: 'Consistent Office Expenses',
              description: 'You regularly spend on office supplies and software.',
              impact: 'medium',
              confidence: 85,
              data: {
                categories: ['Office Supplies', 'Software'],
                averageMonthly: 79.99,
              },
            },
          ],
          recommendations: [
            {
              type: 'cost_optimization',
              title: 'Review Software Subscriptions',
              description: 'Consider reviewing your software subscriptions for potential savings.',
              priority: 'medium',
              potentialSavings: 15,
              actionItems: ['Audit current subscriptions', 'Identify unused software'],
            },
          ],
          summary: {
            totalSpent: 79.99,
            topCategory: 'Office Supplies',
            transactionCount: 2,
            averageTransaction: 40,
          },
        }),
      };

      mockOpenaiClient.chatCompletion.mockResolvedValue(mockAIResponse);

      const result = await insightGenerator.generateSpendingInsights(transactionData, {
        period: 'month',
        startDate: '2023-12-01',
        endDate: '2023-12-31',
      });

      expect(result.insights).toHaveLength(1);
      expect(result.recommendations).toHaveLength(1);
      expect(result.summary.totalSpent).toBe(79.99);
      expect(result.insights[0].type).toBe('spending_pattern');
    });

    it('should detect unusual spending patterns', async () => {
      const transactionData = [
        { amount: 50, type: 'expense', category: 'Office', date: '2023-12-15' },
        { amount: 75, type: 'expense', category: 'Software', date: '2023-12-16' },
        { amount: 5000, type: 'expense', category: 'Travel', date: '2023-12-17' }, // Anomaly
      ];

      const mockAIResponse = {
        content: JSON.stringify({
          insights: [
            {
              type: 'anomaly',
              title: 'Unusual Travel Expense',
              description: 'A significant travel expense was detected that deviates from your normal spending pattern.',
              impact: 'high',
              confidence: 95,
              data: {
                amount: 5000,
                normalRange: [50, 100],
                deviation: '4900% above average',
              },
            },
          ],
          recommendations: [
            {
              type: 'review',
              title: 'Review Large Expense',
              description: 'Please verify this large travel expense for accuracy.',
              priority: 'high',
              actionItems: ['Check receipt', 'Verify business purpose'],
            },
          ],
        }),
      };

      mockOpenaiClient.chatCompletion.mockResolvedValue(mockAIResponse);

      const result = await insightGenerator.generateSpendingInsights(transactionData, {
        period: 'month',
      });

      expect(result.insights[0].type).toBe('anomaly');
      expect(result.insights[0].impact).toBe('high');
      expect(result.recommendations[0].priority).toBe('high');
    });
  });

  describe('Error Handling', () => {
    it('should handle AI service failures gracefully', async () => {
      const transactionData = [
        { amount: 50, type: 'expense', category: 'Office', date: '2023-12-15' },
      ];

      mockOpenaiClient.chatCompletion.mockRejectedValue(new Error('AI service down'));

      const result = await insightGenerator.generateSpendingInsights(transactionData, {
        period: 'month',
      });

      expect(result.insights).toHaveLength(0);
      expect(result.recommendations).toHaveLength(0);
      expect(result.warnings).toContain('AI service temporarily unavailable');
    });

    it('should handle malformed AI responses', async () => {
      const transactionData = [
        { amount: 50, type: 'expense', category: 'Office', date: '2023-12-15' },
      ];

      mockOpenaiClient.chatCompletion.mockResolvedValue({
        content: 'Invalid JSON response',
      });

      const result = await insightGenerator.generateSpendingInsights(transactionData, {
        period: 'month',
      });

      expect(result.insights).toHaveLength(0);
      expect(result.warnings).toContain('Failed to parse AI response');
    });

    it('should validate input data', async () => {
      const invalidData = 'not an array';

      await expect(insightGenerator.generateSpendingInsights(invalidData, { period: 'month' }))
        .rejects.toThrow('Invalid transaction data');
    });
  });
});

describe('AI Integration Tests', () => {
  it('should integrate transaction parser with insight generator', async () => {
    const mockOpenaiClient = {
      chatCompletion: jest.fn(),
      healthCheck: jest.fn(),
    } as any;

    const transactionParser = new TransactionParser(mockOpenaiClient);
    const insightGenerator = new InsightGenerator(mockOpenaiClient);

    // Mock transaction parsing
    const mockParseResponse = {
      content: JSON.stringify({
        category: { id: 'office', name: 'Office Supplies', type: 'expense' },
        confidence: 90,
        processedDescription: 'Office supplies',
        extractedMetadata: { tags: ['office'] },
        suggestions: [],
      }),
    };

    // Mock insight generation
    const mockInsightResponse = {
      content: JSON.stringify({
        insights: [
          {
            type: 'spending_pattern',
            title: 'Office Expenses',
            description: 'Regular office supply purchases',
            confidence: 85,
          },
        ],
        recommendations: [],
        summary: { totalSpent: 100, transactionCount: 2 },
      }),
    };

    mockOpenaiClient.chatCompletion
      .mockResolvedValueOnce(mockParseResponse)
      .mockResolvedValueOnce(mockInsightResponse);

    const transactions = [
      {
        description: 'Office supplies',
        amount: 50,
        type: 'expense' as const,
        currency: 'USD',
        date: '2023-12-15',
      },
      {
        description: 'More office supplies',
        amount: 50,
        type: 'expense' as const,
        currency: 'USD',
        date: '2023-12-16',
      },
    ];

    // Parse transactions
    const parsedTransactions = await transactionParser.batchCategorizeTransactions(transactions, []);

    // Generate insights
    const insights = await insightGenerator.generateSpendingInsights(transactions, {
      period: 'month',
    });

    expect(parsedTransactions).toHaveLength(2);
    expect(parsedTransactions[0].category.name).toBe('Office Supplies');
    expect(insights.insights).toHaveLength(1);
    expect(insights.insights[0].title).toBe('Office Expenses');
  });
});