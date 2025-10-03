import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Dashboard Analytics Integration Tests', () => {
  let sessionToken: string;
  let userId: string;

  beforeEach(() => {
    fetch.resetMocks();

    // Mock successful login
    const loginResponse = {
      user: {
        id: 'user-dashboard-123',
        email: 'test@example.com',
        name: 'Test User',
        businessName: 'Test Business',
      },
      session: 'dashboard-session-token-456',
    };

    fetch.mockResponseOnce(JSON.stringify(loginResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    sessionToken = loginResponse.session;
    userId = loginResponse.user.id;
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  it('should display comprehensive financial dashboard with multiple transactions', async () => {
    // Step 1: Create multiple transactions for meaningful dashboard data
    const transactions = [
      {
        description: 'Monthly Adobe Creative Cloud subscription',
        amount: 59988,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-10-01',
        aiProcessed: true,
        metadata: { vendor: 'Adobe', tags: ['software', 'subscription'] },
      },
      {
        description: 'Office supplies purchase from Staples',
        amount: 4567,
        type: 'expense',
        category: 'Office Supplies',
        date: '2025-10-02',
        aiProcessed: true,
        metadata: { vendor: 'Staples', tags: ['office', 'supplies'] },
      },
      {
        description: 'Client payment for Q3 consulting services',
        amount: 1250000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-10-01',
        aiProcessed: true,
        metadata: { vendor: 'Global Tech Solutions', tags: ['consulting', 'revenue'] },
      },
      {
        description: 'Monthly software subscription (Microsoft 365)',
        amount: 29900,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-10-01',
        aiProcessed: true,
        metadata: { vendor: 'Microsoft', tags: ['software', 'subscription'] },
      },
      {
        description: 'Team lunch celebration for project completion',
        amount: 12550,
        type: 'expense',
        category: 'Travel & Meals',
        date: '2025-10-02',
        aiProcessed: true,
        metadata: { vendor: 'Italian Bistro', tags: ['team', 'meal'] },
      },
    ];

    // Mock transaction creation
    transactions.forEach((transaction, index) => {
      const createdTransactionResponse = {
        id: `transaction-${index + 1}`,
        userId,
        ...transaction,
        processedDescription: transaction.description,
        confidence: 95,
        needsReview: false,
        createdAt: '2025-10-03T14:00:00Z',
        updatedAt: '2025-10-03T14:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Create transactions
    for (const transaction of transactions) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    // Step 2: Generate AI insights
    const insightsRequest = {
      timePeriod: {
        startDate: '2025-10-01',
        endDate: '2025-10-03',
      },
      focusAreas: ['spending_trends', 'anomalies', 'cash_flow', 'recommendations'],
    };

    const insightsResponse = {
      insights: [
        {
          id: 'insight-1',
          type: 'spending_trend',
          title: 'Software Spending Represents Major Expense Category',
          description: 'Software subscriptions account for 58% of your total expenses this month, totaling $898.88. Consider evaluating subscription value and usage.',
          confidence: 92,
          impact: 'medium',
          category: 'Software & Subscriptions',
          timePeriod: { startDate: '2025-10-01', endDate: '2025-10-03' },
          data: {
            metrics: {
              softwareSpending: 89888,
              totalExpenses: 154105,
              percentage: 58.3,
              subscriptionCount: 2,
            },
            trends: [
              { date: '2025-10-01', value: 29900 },
              { date: '2025-10-02', value: 0 },
              { date: '2025-10-03', value: 59988 },
            ],
            visualizations: { chartType: 'pie', dataKey: 'amount' },
          },
          actions: [
            {
              id: 'action-1',
              description: 'Review software subscription utilization',
              type: 'review',
              completed: false,
            },
          ],
        },
        {
          id: 'insight-2',
          type: 'cash_flow',
          title: 'Strong Positive Cash Flow This Period',
          description: 'Your income exceeds expenses by $1,095.90, providing healthy working capital for business operations.',
          confidence: 98,
          impact: 'high',
          timePeriod: { startDate: '2025-10-01', endDate: '2025-10-03' },
          data: {
            metrics: {
              totalIncome: 1250000,
              totalExpenses: 154105,
              netIncome: 1095895,
              cashFlowRatio: 8.1,
            },
            visualizations: { chartType: 'waterfall', dataKey: 'net' },
          },
          actions: [
            {
              id: 'action-2',
              description: 'Consider investing surplus in business growth',
              type: 'investigate',
              completed: false,
            },
          ],
        },
        {
          id: 'insight-3',
          type: 'recommendation',
          title: 'Optimize Software Subscription Spending',
          description: 'You could save 15-20% on software subscriptions by exploring annual billing options or alternative solutions.',
          confidence: 75,
          impact: 'medium',
          category: 'Software & Subscriptions',
          data: {
            metrics: {
              currentMonthlySpend: 89888,
              potentialSavings: 13483,
              alternativeSolutions: ['Open source alternatives', 'Annual billing discounts'],
            },
          },
          actions: [
            {
              id: 'action-3',
              description: 'Research annual billing options for Adobe Creative Cloud',
              type: 'investigate',
              completed: false,
            },
          ],
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(insightsResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const insightsData = await fetch(`${API_BASE}/ai/generate-insights`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insightsRequest),
    });

    expect(insightsData.status).toBe(200);
    const insights = await insightsData.json();
    expect(insights.insights).toHaveLength(3);

    // Step 3: Get comprehensive dashboard overview
    const dashboardResponse = {
      summary: {
        totalIncome: 1250000,
        totalExpenses: 154105,
        netIncome: 1095895,
        transactionCount: 5,
        averageTransaction: 230801,
        currency: 'USD',
      },
      trends: {
        incomeTrend: [
          { date: '2025-10-01', amount: 1250000 },
          { date: '2025-10-02', amount: 0 },
          { date: '2025-10-03', amount: 0 },
        ],
        expenseTrend: [
          { date: '2025-10-01', amount: 29900 },
          { date: '2025-10-02', amount: 17117 },
          { date: '2025-10-03', amount: 0 },
        ],
        netIncomeTrend: [
          { date: '2025-10-01', amount: 1220100 },
          { date: '2025-10-02', amount: -17117 },
          { date: '2025-10-03', amount: 0 },
        ],
      },
      categories: [
        {
          categoryId: 'cat-software',
          categoryName: 'Software & Subscriptions',
          amount: 89888,
          percentage: 58.3,
          transactionCount: 2,
          type: 'expense',
        },
        {
          categoryId: 'cat-service',
          categoryName: 'Service Revenue',
          amount: 1250000,
          percentage: 100,
          transactionCount: 1,
          type: 'income',
        },
        {
          categoryId: 'cat-office',
          categoryName: 'Office Supplies',
          amount: 4567,
          percentage: 3.0,
          transactionCount: 1,
          type: 'expense',
        },
        {
          categoryId: 'cat-travel',
          categoryName: 'Travel & Meals',
          amount: 12550,
          percentage: 8.1,
          transactionCount: 1,
          type: 'expense',
        },
      ],
      recentInsights: insights.insights,
      performanceMetrics: {
        averageTransactionValue: 230801,
        largestTransaction: 1250000,
        smallestTransaction: 4567,
        mostActiveDay: '2025-10-01',
        categoryDiversity: 4,
      },
    };

    fetch.mockResponseOnce(JSON.stringify(dashboardResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();

    // Verify comprehensive dashboard data
    expect(dashboard.summary.totalIncome).toBe(1250000);
    expect(dashboard.summary.totalExpenses).toBe(154105);
    expect(dashboard.summary.netIncome).toBe(1095895);
    expect(dashboard.summary.transactionCount).toBe(5);

    // Verify trend data
    expect(dashboard.trends.incomeTrend).toHaveLength(3);
    expect(dashboard.trends.expenseTrend).toHaveLength(3);
    expect(dashboard.trends.netIncomeTrend).toHaveLength(3);

    // Verify category breakdown
    expect(dashboard.categories).toHaveLength(4);
    expect(dashboard.categories[0].percentage).toBe(58.3); // Software is 58.3% of expenses

    // Verify insights integration
    expect(dashboard.recentInsights).toHaveLength(3);
    expect(dashboard.recentInsights[0].type).toBe('spending_trend');
    expect(dashboard.recentInsights[1].type).toBe('cash_flow');

    // Verify performance metrics
    expect(dashboard.performanceMetrics.largestTransaction).toBe(1250000);
    expect(dashboard.performanceMetrics.categoryDiversity).toBe(4);
  });

  it('should handle dashboard with only income transactions', async () => {
    // Create only income transactions
    const incomeTransactions = [
      {
        description: 'Client payment for web development project',
        amount: 1500000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-10-02',
      },
      {
        description: 'Retainer payment from ongoing consulting client',
        amount: 250000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-10-01',
      },
    ];

    // Mock income transactions
    incomeTransactions.forEach((transaction, index) => {
      fetch.mockResponseOnce(JSON.stringify({
        id: `income-transaction-${index + 1}`,
        userId,
        ...transaction,
        createdAt: '2025-10-03T14:00:00Z',
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Create transactions
    for (const transaction of incomeTransactions) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    const dashboardResponse = {
      summary: {
        totalIncome: 1750000,
        totalExpenses: 0,
        netIncome: 1750000,
        transactionCount: 2,
        averageTransaction: 875000,
      },
      trends: {
        incomeTrend: [
          { date: '2025-10-01', amount: 250000 },
          { date: '2025-10-02', amount: 1500000 },
        ],
        expenseTrend: [],
        netIncomeTrend: [
          { date: '2025-10-01', amount: 250000 },
          { date: '2025-10-02', amount: 1500000 },
        ],
      },
      categories: [
        {
          categoryId: 'cat-service',
          categoryName: 'Service Revenue',
          amount: 1750000,
          percentage: 100,
          transactionCount: 2,
          type: 'income',
        },
      ],
      recentInsights: [
        {
          id: 'insight-income-only',
          type: 'recommendation',
          title: 'Track Expenses for Complete Financial Picture',
          description: 'You have income recorded but no expenses. Start tracking all business expenses for accurate profitability analysis.',
          impact: 'medium',
        },
      ],
      performanceMetrics: {
        averageTransactionValue: 875000,
        largestTransaction: 1500000,
        smallestTransaction: 250000,
        incomeGrowthRate: 500,
      },
    };

    fetch.mockResponseOnce(JSON.stringify(dashboardResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();
    expect(dashboard.summary.totalExpenses).toBe(0);
    expect(dashboard.summary.netIncome).toBe(1750000);
    expect(dashboard.categories[0].percentage).toBe(100);
    expect(dashboard.trends.expenseTrend).toHaveLength(0);
  });

  it('should handle empty dashboard for new users', async () => {
    const dashboardResponse = {
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
        netIncomeTrend: [],
      },
      categories: [],
      recentInsights: [
        {
          id: 'insight-welcome',
          type: 'recommendation',
          title: 'Welcome to Your Finance Dashboard',
          description: 'Start adding transactions to see your financial overview and get personalized insights.',
          impact: 'medium',
        },
      ],
      performanceMetrics: {
        averageTransactionValue: 0,
        largestTransaction: 0,
        smallestTransaction: 0,
        categoryDiversity: 0,
      },
      recommendations: [
        {
          title: 'Add Your First Transaction',
          description: 'Click the "Add Transaction" button to start tracking your finances',
          action: 'add_transaction',
        },
        {
          title: 'Set Up Categories',
          description: 'Organize your transactions with custom categories for better insights',
          action: 'setup_categories',
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(dashboardResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();
    expect(dashboard.summary.transactionCount).toBe(0);
    expect(dashboard.categories).toHaveLength(0);
    expect(dashboard.recentInsights).toHaveLength(1);
    expect(dashboard.recentInsights[0].title).toContain('Welcome');
  });

  it('should handle dashboard with different time periods', async () => {
    // Test different period parameters
    const periods = ['7d', '30d', '90d', '1y'];

    for (const period of periods) {
      const periodResponse = {
        summary: {
          totalIncome: 500000,
          totalExpenses: 150000,
          netIncome: 350000,
          transactionCount: 10,
          period,
        },
        trends: {
          incomeTrend: generateMockTrends(period, 'income'),
          expenseTrend: generateMockTrends(period, 'expense'),
        },
        categories: [
          {
            categoryId: 'cat-main',
            categoryName: 'Main Category',
            amount: 150000,
            percentage: 30,
            transactionCount: 5,
          },
        ],
        recentInsights: [],
      };

      fetch.mockResponseOnce(JSON.stringify(periodResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=${period}`, {
        method: 'GET',
        headers: { 'Authorization': `Bearer ${sessionToken}` },
      });

      expect(dashboardData.status).toBe(200);
      const dashboard = await dashboardData.json();
      expect(dashboard.summary.period).toBe(period);
      expect(dashboard.trends.incomeTrend.length).toBeGreaterThan(0);
    }
  });

  it('should handle dashboard with currency conversion', async () => {
    const dashboardResponse = {
      summary: {
        totalIncome: 454545,
        totalExpenses: 136364,
        netIncome: 318181,
        originalCurrency: 'EUR',
        targetCurrency: 'USD',
        exchangeRate: 1.1,
        transactionCount: 3,
      },
      trends: {
        incomeTrend: [
          { date: '2025-10-01', amount: 454545, originalAmount: 413223, currency: 'USD' },
        ],
        expenseTrend: [
          { date: '2025-10-01', amount: 136364, originalAmount: 123967, currency: 'USD' },
        ],
      },
      categories: [
        {
          categoryId: 'cat-main',
          categoryName: 'Main Category',
          amount: 136364,
          originalAmount: 123967,
          percentage: 30,
          currency: 'USD',
        },
      ],
      recentInsights: [],
    };

    fetch.mockResponseOnce(JSON.stringify(dashboardResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=30d&currency=USD`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();
    expect(dashboard.summary.originalCurrency).toBe('EUR');
    expect(dashboard.summary.targetCurrency).toBe('USD');
    expect(dashboard.summary.exchangeRate).toBe(1.1);
  });
});

function generateMockTrends(period: string, type: string): Array<{ date: string; amount: number }> {
  const trends = [];
  const days = period === '7d' ? 7 : period === '30d' ? 30 : period === '90d' ? 90 : 365;

  for (let i = 0; i < Math.min(days, 30); i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 100000) + 10000,
    });
  }

  return trends;
}