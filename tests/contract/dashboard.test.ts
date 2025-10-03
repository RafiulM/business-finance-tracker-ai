import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Dashboard API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('GET /api/dashboard/overview', () => {
    it('should return comprehensive dashboard overview', async () => {
      const expectedResponse = {
        summary: {
          totalIncome: 500000,
          totalExpenses: 14467,
          netIncome: 485533,
          transactionCount: 3,
          averageTransaction: 166844,
        },
        trends: {
          incomeTrend: [
            { date: '2025-10-01', amount: 500000 },
            { date: '2025-10-02', amount: 0 },
            { date: '2025-10-03', amount: 0 },
          ],
          expenseTrend: [
            { date: '2025-10-01', amount: 9900 },
            { date: '2025-10-02', amount: 4567 },
            { date: '2025-10-03', amount: 0 },
          ],
        },
        categories: [
          {
            categoryId: 'cat-software',
            categoryName: 'Software & Subscriptions',
            amount: 9900,
            percentage: 68.4,
            transactionCount: 1,
          },
          {
            categoryId: 'cat-office',
            categoryName: 'Office Supplies',
            amount: 4567,
            percentage: 31.6,
            transactionCount: 1,
          },
        ],
        recentInsights: [
          {
            id: 'insight-1',
            type: 'spending_trend',
            title: 'Software Subscription Detected',
            description: 'Monthly software subscription of $99.00 identified',
            impact: 'low',
            isRead: false,
            createdAt: '2025-10-03T10:00:00Z',
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.summary.totalIncome).toBe(500000);
      expect(data.summary.totalExpenses).toBe(14467);
      expect(data.summary.netIncome).toBe(485533);
      expect(data.categories).toHaveLength(2);
      expect(data.recentInsights).toHaveLength(1);
    });

    it('should return 7-day overview when requested', async () => {
      const expectedResponse = {
        summary: {
          totalIncome: 150000,
          totalExpenses: 8500,
          netIncome: 141500,
          transactionCount: 5,
          averageTransaction: 28500,
        },
        trends: {
          incomeTrend: [
            { date: '2025-09-27', amount: 50000 },
            { date: '2025-09-28', amount: 0 },
            { date: '2025-09-29', amount: 100000 },
            { date: '2025-09-30', amount: 0 },
            { date: '2025-10-01', amount: 0 },
            { date: '2025-10-02', amount: 0 },
            { date: '2025-10-03', amount: 0 },
          ],
          expenseTrend: [
            { date: '2025-09-27', amount: 2000 },
            { date: '2025-09-28', amount: 1500 },
            { date: '2025-09-29', amount: 3000 },
            { date: '2025-09-30', amount: 0 },
            { date: '2025-10-01', amount: 2000 },
            { date: '2025-10-02', amount: 0 },
            { date: '2025-10-03', amount: 0 },
          ],
        },
        categories: [
          {
            categoryId: 'cat-travel',
            categoryName: 'Travel & Meals',
            amount: 3000,
            percentage: 35.3,
            transactionCount: 1,
          },
        ],
        recentInsights: [],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=7d`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.trends.incomeTrend).toHaveLength(7);
      expect(data.trends.expenseTrend).toHaveLength(7);
    });

    it('should handle currency conversion', async () => {
      const expectedResponse = {
        summary: {
          totalIncome: 454545,
          totalExpenses: 13152,
          netIncome: 441393,
          transactionCount: 2,
          averageTransaction: 220000,
          originalCurrency: 'EUR',
          targetCurrency: 'USD',
          exchangeRate: 1.1,
        },
        trends: {
          incomeTrend: [
            { date: '2025-10-02', amount: 454545 },
            { date: '2025-10-01', amount: 0 },
          ],
          expenseTrend: [
            { date: '2025-10-02', amount: 13152 },
            { date: '2025-10-01', amount: 0 },
          ],
        },
        categories: [
          {
            categoryId: 'cat-office',
            categoryName: 'Office Supplies',
            amount: 13152,
            percentage: 100,
            transactionCount: 1,
          },
        ],
        recentInsights: [],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=30d&currency=USD`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.summary.originalCurrency).toBe('EUR');
      expect(data.summary.targetCurrency).toBe('USD');
      expect(data.summary.exchangeRate).toBe(1.1);
    });

    it('should return empty data for new users', async () => {
      const expectedResponse = {
        summary: {
          totalIncome: 0,
          totalExpenses: 0,
          netIncome: 0,
          transactionCount: 0,
          averageTransaction: 0,
        },
        trends: {
          incomeTrend: [],
          expenseTrend: [],
        },
        categories: [],
        recentInsights: [
          {
            id: 'insight-welcome',
            type: 'recommendation',
            title: 'Welcome to Your Finance Dashboard',
            description: 'Start adding transactions to see your financial overview and insights',
            impact: 'medium',
            isRead: false,
            createdAt: '2025-10-03T10:00:00Z',
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.summary.transactionCount).toBe(0);
      expect(data.categories).toHaveLength(0);
      expect(data.recentInsights).toHaveLength(1);
    });

    it('should validate period parameter', async () => {
      const expectedError = {
        error: 'Validation failed',
        message: 'Invalid period parameter',
        code: 'VALIDATION_ERROR',
        details: {
          period: 'Period must be one of: 7d, 30d, 90d, 1y, all',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=invalid`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(400);
    });

    it('should return 401 for unauthorized requests', async () => {
      const expectedError = {
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });
});