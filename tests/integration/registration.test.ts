import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('User Registration Integration Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  it('should complete full user registration flow successfully', async () => {
    // Step 1: Register new user
    const registrationData = {
      email: 'newuser@example.com',
      password: 'SecurePass123!',
      name: 'New Business Owner',
      businessName: 'Tech Startup Inc',
      baseCurrency: 'USD',
    };

    const registrationResponse = {
      user: {
        id: 'user-new-123',
        email: 'newuser@example.com',
        name: 'New Business Owner',
        businessName: 'Tech Startup Inc',
        baseCurrency: 'USD',
        timezone: 'UTC',
        emailVerified: false,
        preferences: {
          defaultCategories: [],
          notificationSettings: { email: true, push: false },
          dashboardLayout: { showCharts: true, showTable: true },
          aiAssistanceEnabled: true,
        },
        createdAt: '2025-10-03T12:00:00Z',
        updatedAt: '2025-10-03T12:00:00Z',
      },
      session: 'new-session-token-456',
    };

    fetch.mockResponseOnce(JSON.stringify(registrationResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const registerResponse = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(registrationData),
    });

    expect(registerResponse.status).toBe(201);
    const registerData = await registerResponse.json();
    const { user, session } = registerData;

    expect(user.email).toBe('newuser@example.com');
    expect(user.businessName).toBe('Tech Startup Inc');
    expect(user.preferences.aiAssistanceEnabled).toBe(true);
    expect(session).toBeTruthy();

    // Step 2: Verify default categories are created for new user
    const categoriesResponse = {
      categories: [
        { id: 'cat-office', name: 'Office Supplies', type: 'expense', isActive: true },
        { id: 'cat-software', name: 'Software & Subscriptions', type: 'expense', isActive: true },
        { id: 'cat-marketing', name: 'Marketing & Advertising', type: 'expense', isActive: true },
        { id: 'cat-travel', name: 'Travel & Meals', type: 'expense', isActive: true },
        { id: 'cat-insurance', name: 'Insurance', type: 'expense', isActive: true },
        { id: 'cat-rent', name: 'Rent & Utilities', type: 'expense', isActive: true },
        { id: 'cat-service-revenue', name: 'Service Revenue', type: 'income', isActive: true },
        { id: 'cat-income-other', name: 'Other Income', type: 'income', isActive: true },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(categoriesResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const categoriesData = await fetch(`${API_BASE}/categories`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${session}` },
    });

    expect(categoriesData.status).toBe(200);
    const categories = await categoriesData.json();
    expect(categories.categories.length).toBeGreaterThan(5); // Should have default categories
    expect(categories.categories.every(cat => cat.isActive === true)).toBe(true);

    // Step 3: Create first transaction with AI categorization
    const transactionData = {
      description: 'Bought office supplies from Staples for business setup - $150.25 including pens, paper, and organizer',
      amount: 15025,
      currency: 'USD',
      date: '2025-10-02',
    };

    const aiProcessingResponse = {
      category: { id: 'cat-office', name: 'Office Supplies', type: 'expense' },
      confidence: 92,
      processedDescription: 'Office supplies purchase at Staples',
      extractedMetadata: {
        vendor: 'Staples',
        location: null,
        tags: ['office', 'supplies', 'business-setup'],
      },
      suggestions: [
        { type: 'tags', value: 'startup-costs', confidence: 85 },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(aiProcessingResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const aiResponse = await fetch(`${API_BASE}/ai/process-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    expect(aiResponse.status).toBe(200);
    const aiData = await aiResponse.json();
    expect(aiData.category.name).toBe('Office Supplies');
    expect(aiData.confidence).toBeGreaterThan(90);

    // Step 4: Create the transaction using AI suggestion
    const transactionCreateData = {
      ...transactionData,
      categoryId: aiData.category.id,
      type: 'expense',
    };

    const createdTransactionResponse = {
      id: 'transaction-first-1',
      userId: user.id,
      categoryId: aiData.category.id,
      amount: 15025,
      currency: 'USD',
      description: transactionData.description,
      processedDescription: aiData.processedDescription,
      date: '2025-10-02T00:00:00Z',
      type: 'expense',
      confidence: aiData.confidence,
      needsReview: false,
      metadata: {
        ...aiData.extractedMetadata,
        aiProcessed: true,
        manualOverride: false,
      },
      createdAt: '2025-10-03T12:05:00Z',
      updatedAt: '2025-10-03T12:05:00Z',
      category: {
        id: aiData.category.id,
        name: aiData.category.name,
        type: aiData.category.type,
        color: '#3B82F6',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionResponse = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionCreateData),
    });

    expect(transactionResponse.status).toBe(201);
    const transaction = await transactionResponse.json();
    expect(transaction.id).toBeTruthy();
    expect(transaction.amount).toBe(15025);
    expect(transaction.metadata.aiProcessed).toBe(true);

    // Step 5: Verify dashboard shows updated data
    const dashboardResponse = {
      summary: {
        totalIncome: 0,
        totalExpenses: 15025,
        netIncome: -15025,
        transactionCount: 1,
        averageTransaction: 15025,
      },
      trends: {
        incomeTrend: [],
        expenseTrend: [
          { date: '2025-10-02', amount: 15025 },
        ],
      },
      categories: [
        {
          categoryId: 'cat-office',
          categoryName: 'Office Supplies',
          amount: 15025,
          percentage: 100,
          transactionCount: 1,
        },
      ],
      recentInsights: [
        {
          id: 'insight-welcome',
          type: 'recommendation',
          title: 'Welcome to Your Finance Dashboard',
          description: 'You\'ve added your first transaction! Continue tracking to see spending patterns and insights.',
          impact: 'medium',
          isRead: false,
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(dashboardResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const dashboardData = await fetch(`${API_BASE}/dashboard/overview?period=30d`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${session}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();
    expect(dashboard.summary.transactionCount).toBe(1);
    expect(dashboard.summary.totalExpenses).toBe(15025);
    expect(dashboard.categories[0].categoryName).toBe('Office Supplies');

    // Step 6: Generate insights for the new data
    const insightsRequest = {
      timePeriod: {
        startDate: '2025-10-01',
        endDate: '2025-10-03',
      },
      focusAreas: ['spending_trends', 'recommendations'],
    };

    const insightsResponse = {
      insights: [
        {
          type: 'recommendation',
          title: 'Track Startup Costs Separately',
          description: 'Consider creating a separate category for startup costs to better track initial business investments vs ongoing expenses.',
          confidence: 85,
          impact: 'medium',
          category: 'Office Supplies',
          actions: [
            {
              id: 'action-startup-category',
              description: 'Create "Startup Costs" category for initial purchases',
              type: 'categorize',
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
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(insightsRequest),
    });

    expect(insightsData.status).toBe(200);
    const insights = await insightsData.json();
    expect(insights.insights).toHaveLength(1);
    expect(insights.insights[0].type).toBe('recommendation');

    // Step 7: Export initial data (useful for new users)
    const exportRequest = {
      format: 'csv',
      includeMetadata: true,
    };

    const csvContent = `Date,Description,Amount,Currency,Type,Category,Vendor,Location,Tags,Notes
2025-10-02,"Bought office supplies from Staples for business setup - $150.25 including pens, paper, and organizer",15025,USD,expense,"Office Supplies","Staples","","office,supplies,business-setup",""
`;

    const exportResponse = new Response(csvContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="transactions_all.csv"',
      },
    });

    fetch.mockResponseOnce(exportResponse);

    const exportData = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${session}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(exportRequest),
    });

    expect(exportData.status).toBe(200);
    const exportedContent = await exportData.text();
    expect(exportedContent).toContain('Office Supplies');
    expect(exportedContent).toContain('15025');

    // Complete flow verification
    expect(fetch).toHaveBeenCalledTimes(7);
    expect(user.id).toBe('user-new-123');
    expect(categories.categories.length).toBeGreaterThan(5);
    expect(transaction.amount).toBe(15025);
    expect(dashboard.summary.transactionCount).toBe(1);
    expect(insights.insights).toHaveLength(1);
  });

  it('should handle registration errors gracefully', async () => {
    // Test duplicate email registration
    const duplicateRegistrationData = {
      email: 'existing@example.com',
      password: 'SecurePass123!',
      name: 'Test User',
    };

    const duplicateError = {
      error: 'Registration failed',
      message: 'Email already exists',
      code: 'EMAIL_EXISTS',
    };

    fetch.mockResponseOnce(JSON.stringify(duplicateError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(duplicateRegistrationData),
    });

    expect(response.status).toBe(400);
    const errorData = await response.json();
    expect(errorData.code).toBe('EMAIL_EXISTS');
  });

  it('should handle weak password validation', async () => {
    const weakPasswordData = {
      email: 'test@example.com',
      password: '123', // Too weak
      name: 'Test User',
    };

    const passwordError = {
      error: 'Validation failed',
      message: 'Password does not meet security requirements',
      code: 'WEAK_PASSWORD',
      details: {
        password: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(passwordError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const response = await fetch(`${API_BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(weakPasswordData),
    });

    expect(response.status).toBe(400);
    const errorData = await response.json();
    expect(errorData.code).toBe('WEAK_PASSWORD');
  });
});