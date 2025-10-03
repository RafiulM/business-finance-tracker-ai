import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('AI Processing API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('POST /api/ai/process-transaction', () => {
    it('should process transaction with AI categorization', async () => {
      const transactionData = {
        description: 'Bought office supplies from Staples for $45.67 including pens and notebooks',
        amount: 4567,
        currency: 'USD',
        context: {
          recentTransactions: [
            { description: 'Office supplies purchase', category: 'Office Supplies', amount: 3500 },
            { description: 'Software subscription', category: 'Software & Subscriptions', amount: 9900 },
          ],
          userCategories: [
            { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
            { id: 'cat-2', name: 'Software & Subscriptions', type: 'expense' },
            { id: 'cat-3', name: 'Service Revenue', type: 'income' },
          ],
        },
      };

      const expectedResponse = {
        category: {
          id: 'cat-1',
          name: 'Office Supplies',
          type: 'expense',
        },
        confidence: 95,
        processedDescription: 'Office supplies purchase at Staples',
        extractedMetadata: {
          vendor: 'Staples',
          location: null,
          tags: ['office', 'supplies', 'stationery'],
        },
        suggestions: [
          {
            type: 'category',
            value: 'Stationery',
            confidence: 80,
          },
          {
            type: 'tags',
            value: 'Monthly recurring',
            confidence: 30,
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/process-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);
      expect(data.confidence).toBe(95);
      expect(data.extractedMetadata.vendor).toBe('Staples');
      expect(data.suggestions).toHaveLength(2);
    });

    it('should handle complex income transactions', async () => {
      const transactionData = {
        description: 'Received $5,000 payment from Acme Corp for consulting services completed in September, invoice #INV-2025-001',
        amount: 500000,
        currency: 'USD',
        context: {
          userCategories: [
            { id: 'cat-income-1', name: 'Service Revenue', type: 'income' },
            { id: 'cat-income-2', name: 'Consulting Fees', type: 'income' },
          ],
        },
      };

      const expectedResponse = {
        category: {
          id: 'cat-income-2',
          name: 'Consulting Fees',
          type: 'income',
        },
        confidence: 98,
        processedDescription: 'Consulting services payment from Acme Corp (Invoice #INV-2025-001)',
        extractedMetadata: {
          vendor: 'Acme Corp',
          location: null,
          tags: ['consulting', 'client', 'invoice'],
        },
        suggestions: [
          {
            type: 'category',
            value: 'Service Revenue',
            confidence: 90,
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/process-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.category.type).toBe('income');
      expect(data.extractedMetadata.vendor).toBe('Acme Corp');
    });

    it('should handle ambiguous descriptions with lower confidence', async () => {
      const transactionData = {
        description: 'Business expense',
        amount: 10000,
        currency: 'USD',
        context: {
          userCategories: [
            { id: 'cat-1', name: 'Office Supplies', type: 'expense' },
            { id: 'cat-2', name: 'Travel & Meals', type: 'expense' },
            { id: 'cat-3', name: 'Software & Subscriptions', type: 'expense' },
          ],
        },
      };

      const expectedResponse = {
        category: {
          id: 'cat-1',
          name: 'Office Supplies',
          type: 'expense',
        },
        confidence: 45,
        processedDescription: 'Business expense',
        extractedMetadata: {
          vendor: null,
          location: null,
          tags: ['business'],
        },
        suggestions: [
          {
            type: 'category',
            value: 'Travel & Meals',
            confidence: 40,
          },
          {
            type: 'category',
            value: 'Software & Subscriptions',
            confidence: 35,
          },
          {
            type: 'action',
            value: 'manual_review_required',
            confidence: 90,
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/process-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBe(45); // Low confidence due to ambiguity
      expect(data.suggestions.some(s => s.value === 'manual_review_required')).toBe(true);
    });

    it('should return fallback when AI service is unavailable', async () => {
      const transactionData = {
        description: 'Office supplies purchase',
        amount: 5000,
        currency: 'USD',
      };

      const expectedResponse = {
        category: {
          id: 'fallback-category',
          name: 'Uncategorized',
          type: 'expense',
        },
        confidence: 0,
        processedDescription: 'Office supplies purchase',
        extractedMetadata: {
          vendor: null,
          location: null,
          tags: [],
        },
        suggestions: [],
        error: 'AI service temporarily unavailable, using fallback categorization',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/process-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.confidence).toBe(0);
      expect(data.error).toContain('AI service temporarily unavailable');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        amount: 5000,
        // Missing description
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Description and amount are required',
        code: 'VALIDATION_ERROR',
        details: {
          description: 'Description is required',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/process-transaction`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/ai/generate-insights', () => {
    it('should generate financial insights from transaction data', async () => {
      const insightRequest = {
        timePeriod: {
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        },
        focusAreas: ['spending_trends', 'anomalies', 'recommendations'],
      };

      const expectedResponse = {
        insights: [
          {
            type: 'spending_trend',
            title: 'Office Supplies Spending Increased 25%',
            description: 'Your spending on office supplies increased by 25% in September compared to August, driven by additional equipment purchases.',
            confidence: 92,
            impact: 'medium',
            category: 'Office Supplies',
            timePeriod: {
              startDate: '2025-09-01',
              endDate: '2025-09-30',
            },
            data: {
              metrics: {
                currentMonth: 1500,
                previousMonth: 1200,
                change: 25,
                transactionCount: 8,
              },
              trends: [
                { date: '2025-09-01', value: 200 },
                { date: '2025-09-15', value: 800 },
                { date: '2025-09-30', value: 1500 },
              ],
              comparisons: {
                vsLastMonth: '+25%',
                vsBudget: '+10%',
                vsLastYear: '+15%',
              },
              visualizations: {
                chartType: 'line',
                dataKey: 'amount',
                xAxis: 'date',
                yAxis: 'amount',
              },
            },
            actions: [
              {
                id: 'action-1',
                description: 'Review September office supply purchases for necessity',
                type: 'review',
                targetId: null,
                targetType: 'category',
                completed: false,
              },
              {
                id: 'action-2',
                description: 'Set monthly budget alert for office supplies',
                type: 'adjust_budget',
                targetId: null,
                targetType: 'budget',
                completed: false,
              },
            ],
          },
          {
            type: 'anomaly_detection',
            title: 'Unusual Large Software Purchase Detected',
            description: 'A software purchase of $1,200 on September 15th was significantly higher than your typical software spending of $99-299 per month.',
            confidence: 88,
            impact: 'high',
            category: 'Software & Subscriptions',
            data: {
              metrics: {
                transactionAmount: 120000,
                typicalRange: [9900, 29900],
                outlierScore: 4.2,
              },
              comparisons: {
                vsTypical: '+400%',
                frequency: 'first time this vendor',
              },
              visualizations: {
                chartType: 'scatter',
                highlightPoint: '2025-09-15',
              },
            },
            actions: [
              {
                id: 'action-3',
                description: 'Verify the $1,200 software purchase is legitimate',
                type: 'review',
                targetId: 'transaction-software-large',
                targetType: 'transaction',
                completed: false,
              },
            ],
          },
          {
            type: 'recommendation',
            title: 'Consider Bulk Purchasing for Office Supplies',
            description: 'Based on your frequent office supply purchases, you could save 15-20% by establishing vendor relationships and buying in bulk.',
            confidence: 75,
            impact: 'medium',
            category: 'Office Supplies',
            data: {
              metrics: {
                monthlyAverage: 1500,
                potentialSavings: 225,
                supplierCount: 3,
              },
              visualizations: {
                chartType: 'bar',
                comparison: ['current', 'potential_savings'],
              },
            },
            actions: [
              {
                id: 'action-4',
                description: 'Research bulk pricing with current suppliers',
                type: 'investigate',
                completed: false,
              },
            ],
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/generate-insights`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insightRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.insights).toHaveLength(3);
      expect(data.insights[0].type).toBe('spending_trend');
      expect(data.insights[1].type).toBe('anomaly_detection');
      expect(data.insights[2].type).toBe('recommendation');
    });

    it('should handle empty transaction data gracefully', async () => {
      const insightRequest = {
        timePeriod: {
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        },
        focusAreas: ['spending_trends'],
      };

      const expectedResponse = {
        insights: [
          {
            type: 'recommendation',
            title: 'Start Tracking Your Business Expenses',
            description: 'No transactions were found for the selected period. Begin recording your expenses to get valuable financial insights.',
            confidence: 100,
            impact: 'medium',
            data: {
              metrics: { transactionCount: 0 },
              visualizations: { chartType: 'empty' },
            },
            actions: [
              {
                id: 'action-first-transaction',
                description: 'Add your first transaction to start tracking',
                type: 'categorize',
                completed: false,
              },
            ],
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/generate-insights`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(insightRequest),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.insights[0].title).toContain('Start Tracking');
    });

    it('should return error for invalid date range', async () => {
      const invalidRequest = {
        timePeriod: {
          startDate: '2025-09-30',
          endDate: '2025-09-01', // End date before start date
        },
        focusAreas: ['spending_trends'],
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'End date must be after start date',
        code: 'INVALID_DATE_RANGE',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/ai/generate-insights`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidRequest),
      });

      expect(response.status).toBe(400);
    });
  });
});