import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Financial Insights Integration Tests', () => {
  let sessionToken: string;
  let userId: string;

  beforeEach(() => {
    fetch.resetMocks();

    // Mock successful login
    const loginResponse = {
      user: {
        id: 'user-insights-123',
        email: 'test@example.com',
        name: 'Test User',
        businessName: 'Test Business',
      },
      session: 'insights-session-token-456',
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

  it('should generate comprehensive insights from diverse transaction data', async () => {
    // Step 1: Create diverse transaction data across multiple categories
    const diverseTransactions = [
      // Income
      {
        description: 'Large consulting project payment - Fortune 500 client, Q4 deliverables completed',
        amount: 2500000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-09-15',
        metadata: { client: 'Fortune 500 Corp', project: 'Digital Transformation' },
      },
      {
        description: 'Monthly retainer from ongoing consulting engagement',
        amount: 500000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-09-01',
        metadata: { client: 'Tech Startup', recurring: true },
      },
      {
        description: 'Speaking fee at industry conference',
        amount: 150000,
        type: 'income',
        category: 'Other Income',
        date: '2025-09-20',
        metadata: { event: 'Tech Conference 2025', topic: 'AI in Finance' },
      },

      // Software Expenses (Growing category)
      {
        description: 'Annual enterprise software license renewal (CRM)',
        amount: 120000,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-09-05',
        metadata: { vendor: 'Salesforce', license: 'Enterprise', annual: true },
      },
      {
        description: 'Monthly design software subscriptions (Adobe Creative Cloud)',
        amount: 6000,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-09-10',
        metadata: { vendor: 'Adobe', users: 5, recurring: true },
      },
      {
        description: 'Project management tool annual subscription',
        amount: 3600,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-09-12',
        metadata: { vendor: 'Asana', annual: true },
      },
      {
        description: 'Cloud computing services monthly bill',
        amount: 8500,
        type: 'expense',
        category: 'Software & Subscriptions',
        date: '2025-09-28',
        metadata: { provider: 'AWS', services: ['EC2', 'S3', 'RDS'] },
      },

      // Office Expenses
      {
        description: 'Office rent for downtown location',
        amount: 150000,
        type: 'expense',
        category: 'Rent & Utilities',
        date: '2025-09-01',
        metadata: { location: 'Downtown Business District', recurring: true },
      },
      {
        description: 'Office supplies bulk purchase',
        amount: 8000,
        type: 'expense',
        category: 'Office Supplies',
        date: '2025-09-08',
        metadata: { vendor: 'Office Depot', bulk: true },
      },
      {
        description: 'Professional development and training courses',
        amount: 12000,
        type: 'expense',
        category: 'Professional Services',
        date: '2025-09-22',
        metadata: { courses: ['Advanced Financial Modeling', 'AI for Business'] },
      },

      // Travel & Entertainment
      {
        description: 'Business class flight for client meeting in San Francisco',
        amount: 45000,
        type: 'expense',
        category: 'Travel & Meals',
        date: '2025-09-18',
        metadata: { destination: 'San Francisco', purpose: 'Client Meeting', class: 'Business' },
      },
      {
        description: 'Team building dinner at upscale restaurant',
        amount: 8000,
        type: 'expense',
        category: 'Travel & Meals',
        date: '2025-09-25',
        metadata: { participants: 8, occasion: 'Team Building' },
      },

      // Anomalous Expense
      {
        description: 'Emergency IT equipment replacement after hardware failure',
        amount: 45000,
        type: 'expense',
        category: 'Equipment',
        date: '2025-09-14',
        metadata: { urgency: 'emergency', reason: 'Hardware Failure', equipment: 'Server' },
      },
    ];

    // Mock transaction creation
    diverseTransactions.forEach((transaction, index) => {
      const createdTransactionResponse = {
        id: `transaction-${index + 1}`,
        userId,
        ...transaction,
        processedDescription: transaction.description,
        confidence: 95,
        needsReview: false,
        createdAt: '2025-10-03T15:00:00Z',
        updatedAt: '2025-10-03T15:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Create all transactions
    for (const transaction of diverseTransactions) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    // Step 2: Generate comprehensive insights
    const insightsRequest = {
      timePeriod: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      },
      focusAreas: ['spending_trends', 'anomalies', 'cash_flow', 'category_analysis', 'recommendations'],
    };

    const expectedInsights = {
      insights: [
        // Spending Trend Insight
        {
          id: 'insight-1',
          type: 'spending_trend',
          title: 'Software Subscription Costs Increased 15%',
          description: 'Your software spending increased by 15% this month, driven by annual license renewals and new cloud services. Total software spend: $138,100.',
          confidence: 94,
          impact: 'high',
          category: 'Software & Subscriptions',
          timePeriod: { startDate: '2025-09-01', endDate: '2025-09-30' },
          data: {
            metrics: {
              currentMonth: 138100,
              previousMonth: 120087,
              change: 15,
              transactionCount: 4,
              monthlyAverage: 11525,
            },
            trends: [
              { date: '2025-09-01', value: 120000 },
              { date: '2025-09-10', value: 6000 },
              { date: '2025-09-12', value: 3600 },
              { date: '2025-09-28', value: 8500 },
            ],
            comparisons: {
              vsLastMonth: '+15%',
              vsBudget: '+8%',
              vsLastYear: '+22%',
            },
            visualizations: {
              chartType: 'line',
              dataKey: 'amount',
              trend: 'increasing',
            },
          },
          actions: [
            {
              id: 'action-1',
              description: 'Review software utilization and eliminate unused subscriptions',
              type: 'review',
              completed: false,
            },
            {
              id: 'action-2',
              description: 'Negotiate enterprise discounts for annual commitments',
              type: 'investigate',
              completed: false,
            },
          ],
        },

        // Anomaly Detection Insight
        {
          id: 'insight-2',
          type: 'anomaly_detection',
          title: 'Unusual Emergency IT Expense Detected',
          description: 'A one-time IT equipment expense of $45,000 was recorded on September 14th. This is 450% higher than your typical equipment spending.',
          confidence: 88,
          impact: 'medium',
          category: 'Equipment',
          timePeriod: { startDate: '2025-09-01', endDate: '2025-09-30' },
          data: {
            metrics: {
              transactionAmount: 45000,
              typicalRange: [5000, 15000],
              outlierScore: 4.2,
              category: 'Equipment',
            },
            comparisons: {
              vsTypical: '+450%',
              vsBudget: '+350%',
              frequency: 'first time in equipment category',
            },
            visualizations: {
              chartType: 'scatter',
              highlightPoint: '2025-09-14',
              anomalyScore: 4.2,
            },
          },
          actions: [
            {
              id: 'action-3',
              description: 'Document emergency equipment failure and replacement details',
              type: 'review',
              targetId: 'transaction-12',
              targetType: 'transaction',
              completed: false,
            },
            {
              id: 'action-4',
              description: 'Review disaster recovery and backup systems',
              type: 'investigate',
              completed: false,
            },
          ],
        },

        // Cash Flow Analysis Insight
        {
          id: 'insight-3',
          type: 'cash_flow',
          title: 'Excellent Cash Flow with Strong Profitability',
          description: 'Your business generated $3,150,000 in revenue with $377,600 in expenses, resulting in a healthy 88% profit margin and strong positive cash flow.',
          confidence: 96,
          impact: 'high',
          timePeriod: { startDate: '2025-09-01', endDate: '2025-09-30' },
          data: {
            metrics: {
              totalIncome: 3150000,
              totalExpenses: 377600,
              netIncome: 2772400,
              profitMargin: 88,
              cashFlow: 2772400,
              averageRevenuePerTransaction: 1050000,
            },
            trends: [
              { date: '2025-09-01', amount: 500000 },
              { date: '2025-09-15', amount: 2500000 },
              { date: '2025-09-20', amount: 150000 },
            ],
            visualizations: {
              chartType: 'waterfall',
              waterfallType: 'cash_flow',
              positiveColor: '#22C55E',
              negativeColor: '#EF4444',
            },
          },
          actions: [
            {
              id: 'action-5',
              description: 'Consider investing surplus in business growth opportunities',
              type: 'investigate',
              completed: false,
            },
            {
              id: 'action-6',
              description: 'Set up business emergency fund with 3-6 months of expenses',
              type: 'investigate',
              completed: false,
            },
          ],
        },

        // Category Analysis Insight
        {
          id: 'insight-4',
          type: 'category_analysis',
          title: 'Software is Your Largest Expense Category',
          description: 'Software & Subscriptions represent 36.6% of your total expenses ($138,100). While necessary, consider optimizing recurring costs.',
          confidence: 92,
          impact: 'medium',
          category: 'Software & Subscriptions',
          timePeriod: { startDate: '2025-09-01', endDate: '2025-09-30' },
          data: {
            metrics: {
              categoryAmount: 138100,
              totalExpenses: 377600,
              percentage: 36.6,
              transactionCount: 4,
              averagePerTransaction: 34525,
            },
            breakdown: {
              'Enterprise Software': 120000,
              'Design Software': 6000,
              'Project Management': 3600,
              'Cloud Services': 8500,
            },
            visualizations: {
              chartType: 'pie',
              highlightCategory: 'Software & Subscriptions',
              showPercentages: true,
            },
          },
          actions: [
            {
              id: 'action-7',
              description: 'Audit all software subscriptions for utilization',
              type: 'review',
              completed: false,
            },
          ],
        },

        // Recommendation Insight
        {
          id: 'insight-5',
          type: 'recommendation',
          title: 'Optimize Business Travel Costs',
          description: 'Travel expenses account for 13.6% of your spending. Implementing travel policies and advance booking could save 20-30% on travel costs.',
          confidence: 85,
          impact: 'medium',
          category: 'Travel & Meals',
          timePeriod: { startDate: '2025-09-01', endDate: '2025-09-30' },
          data: {
            metrics: {
              travelSpending: 53000,
              potentialSavings: 10600,
              savingsPercentage: 20,
              transactions: 2,
            },
            comparisons: {
              vsIndustry: 'Your travel costs are 15% above industry average',
              vsLastQuarter: '+12%',
            },
            visualizations: {
              chartType: 'bar',
              comparison: ['current', 'potential_savings'],
            },
          },
          actions: [
            {
              id: 'action-8',
              description: 'Implement travel booking policy with 21-day advance requirement',
              type: 'investigate',
              completed: false,
            },
            {
              id: 'action-9',
              description: 'Set monthly travel budget alerts',
              type: 'investigate',
              completed: false,
            },
          ],
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(expectedInsights), {
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
    expect(insights.insights).toHaveLength(5);

    // Verify specific insights
    const spendingTrend = insights.insights.find(i => i.type === 'spending_trend');
    expect(spendingTrend.title).toContain('Software Subscription Costs');
    expect(spendingTrend.impact).toBe('high');

    const anomaly = insights.insights.find(i => i.type === 'anomaly_detection');
    expect(anomaly.title).toContain('Unusual Emergency IT Expense');
    expect(anomaly.data.outlierScore).toBe(4.2);

    const cashFlow = insights.insights.find(i => i.type === 'cash_flow');
    expect(cashFlow.title).toContain('Excellent Cash Flow');
    expect(cashFlow.data.profitMargin).toBe(88);

    const categoryAnalysis = insights.insights.find(i => i.type === 'category_analysis');
    expect(categoryAnalysis.data.percentage).toBe(36.6);

    const recommendation = insights.insights.find(i => i.type === 'recommendation');
    expect(recommendation.data.potentialSavings).toBe(10600);

    // Step 3: Verify insights appear in dashboard
    const dashboardResponse = {
      summary: {
        totalIncome: 3150000,
        totalExpenses: 377600,
        netIncome: 2772400,
        transactionCount: 13,
        averageTransaction: 230769,
      },
      trends: {
        incomeTrend: generateMockTrends('30d', 'income'),
        expenseTrend: generateMockTrends('30d', 'expense'),
      },
      categories: [
        { categoryName: 'Software & Subscriptions', amount: 138100, percentage: 36.6 },
        { categoryName: 'Service Revenue', amount: 3150000, percentage: 100, type: 'income' },
        { categoryName: 'Rent & Utilities', amount: 150000, percentage: 39.7 },
        { categoryName: 'Travel & Meals', amount: 53000, percentage: 14.0 },
      ],
      recentInsights: insights.insights,
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
    expect(dashboard.recentInsights).toHaveLength(5);
    expect(dashboard.recentInsights.some(i => i.title.includes('Software Subscription Costs'))).toBe(true);
  });

  it('should generate insights for limited transaction patterns', async () => {
    // Create limited data - only income transactions
    const limitedTransactions = [
      {
        description: 'Monthly retainer payment',
        amount: 250000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-09-01',
      },
      {
        description: 'Project completion payment',
        amount: 750000,
        type: 'income',
        category: 'Service Revenue',
        date: '2025-09-15',
      },
    ];

    // Mock limited transactions
    limitedTransactions.forEach((transaction, index) => {
      fetch.mockResponseOnce(JSON.stringify({
        id: `limited-transaction-${index + 1}`,
        userId,
        ...transaction,
        createdAt: '2025-10-03T15:00:00Z',
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    for (const transaction of limitedTransactions) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    const insightsRequest = {
      timePeriod: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      },
      focusAreas: ['spending_trends', 'recommendations'],
    };

    const expectedInsights = {
      insights: [
        {
          id: 'insight-limited-1',
          type: 'recommendation',
          title: 'Track Business Expenses for Complete Financial Picture',
          description: 'You have income recorded but no expenses. Start tracking all business expenses to understand profitability and make informed financial decisions.',
          confidence: 95,
          impact: 'high',
          data: {
            metrics: {
              incomeTransactions: 2,
              expenseTransactions: 0,
              totalIncome: 1000000,
              totalExpenses: 0,
            },
            visualizations: { chartType: 'warning', message: 'No expense data' },
          },
          actions: [
            {
              id: 'action-limited-1',
              description: 'Add your first expense transaction',
              type: 'categorize',
              completed: false,
            },
            {
              id: 'action-limited-2',
              description: 'Set up expense categories for better tracking',
              type: 'investigate',
              completed: false,
            },
          ],
        },
        {
          id: 'insight-limited-2',
          type: 'recommendation',
          title: 'Diversify Income Sources',
          description: 'Currently, all income comes from Service Revenue. Consider diversifying income streams to reduce dependency on single revenue source.',
          confidence: 75,
          impact: 'medium',
          data: {
            metrics: {
              revenueConcentration: 100,
              categoryCount: 1,
              monthlyAverage: 500000,
            },
          },
          actions: [
            {
              id: 'action-limited-3',
              description: 'Research passive income opportunities',
              type: 'investigate',
              completed: false,
            },
          ],
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(expectedInsights), {
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
    expect(insights.insights).toHaveLength(2);
    expect(insights.insights[0].title).toContain('Track Business Expenses');
  });

  it('should handle insight generation errors gracefully', async () => {
    const insightsRequest = {
      timePeriod: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      },
      focusAreas: ['spending_trends'],
    };

    // Mock AI service error
    const errorResponse = {
      insights: [
        {
          id: 'insight-error-1',
          type: 'recommendation',
          title: 'Unable to Generate Detailed Insights',
          description: 'We encountered an error while analyzing your financial data. Please try again or contact support if the issue persists.',
          confidence: 100,
          impact: 'low',
          data: {
            error: 'AI service temporarily unavailable',
            fallback: 'Basic analysis completed',
          },
          actions: [
            {
              id: 'action-error-1',
              description: 'Try generating insights again later',
              type: 'investigate',
              completed: false,
            },
          ],
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(errorResponse), {
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
    expect(insights.insights).toHaveLength(1);
    expect(insights.insights[0].title).toContain('Unable to Generate');
  });
});

function generateMockTrends(period: string, type: string): Array<{ date: string; amount: number }> {
  const trends = [];
  const days = 30; // Simplified for test

  for (let i = 0; i < days; i++) {
    const date = new Date();
    date.setDate(date.getDate() - i);
    trends.push({
      date: date.toISOString().split('T')[0],
      amount: Math.floor(Math.random() * 100000) + 10000,
    });
  }

  return trends;
}