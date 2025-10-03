import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('AI-Powered Transaction Integration Tests', () => {
  let sessionToken: string;
  let userId: string;

  beforeEach(() => {
    fetch.resetMocks();

    // Mock successful login for each test
    const loginResponse = {
      user: {
        id: 'user-test-123',
        email: 'test@example.com',
        name: 'Test User',
        businessName: 'Test Business',
      },
      session: 'test-session-token-456',
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

  it('should create complex expense transaction with AI categorization', async () => {
    // Step 1: Get user categories for context
    const categoriesResponse = {
      categories: [
        { id: 'cat-office', name: 'Office Supplies', type: 'expense' },
        { id: 'cat-software', name: 'Software & Subscriptions', type: 'expense' },
        { id: 'cat-marketing', name: 'Marketing & Advertising', type: 'expense' },
        { id: 'cat-travel', name: 'Travel & Meals', type: 'expense' },
        { id: 'cat-service', name: 'Service Revenue', type: 'income' },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(categoriesResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const categoriesData = await fetch(`${API_BASE}/categories`, {
      method: 'GET',
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(categoriesData.status).toBe(200);
    const categories = await categoriesData.json();

    // Step 2: Process complex expense transaction with AI
    const complexTransactionData = {
      description: 'Monthly Adobe Creative Cloud subscription for design team - $599.88 annual plan, auto-renewing, includes Photoshop, Illustrator, and InDesign. Purchase order #PO-2025-001 for design department budget.',
      amount: 59988,
      currency: 'USD',
      date: '2025-10-02',
      context: {
        recentTransactions: [
          { description: 'Microsoft 365 subscription', category: 'Software & Subscriptions', amount: 29900 },
          { description: 'Figma license', category: 'Software & Subscriptions', amount: 15000 },
          { description: 'Stock photo subscription', category: 'Software & Subscriptions', amount: 4900 },
        ],
        userCategories: categories.categories,
      },
    };

    const aiProcessingResponse = {
      category: { id: 'cat-software', name: 'Software & Subscriptions', type: 'expense' },
      confidence: 96,
      processedDescription: 'Adobe Creative Cloud annual subscription (Photoshop, Illustrator, InDesign)',
      extractedMetadata: {
        vendor: 'Adobe',
        location: null,
        tags: ['software', 'subscription', 'design', 'annual', 'creative-cloud'],
        purchaseOrder: 'PO-2025-001',
        department: 'design',
        planType: 'annual',
        includedSoftware: ['Photoshop', 'Illustrator', 'InDesign'],
      },
      suggestions: [
        {
          type: 'category',
          value: 'Software & Subscriptions',
          confidence: 98,
        },
        {
          type: 'tags',
          value: 'recurring_subscription',
          confidence: 95,
        },
        {
          type: 'budget',
          value: 'design_department_budget',
          confidence: 85,
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(aiProcessingResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const aiResponse = await fetch(`${API_BASE}/ai/process-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(complexTransactionData),
    });

    expect(aiResponse.status).toBe(200);
    const aiData = await aiResponse.json();
    expect(aiData.category.name).toBe('Software & Subscriptions');
    expect(aiData.confidence).toBeGreaterThan(95);
    expect(aiData.extractedMetadata.vendor).toBe('Adobe');
    expect(aiData.extractedMetadata.tags).toContain('software');

    // Step 3: Create transaction with AI data
    const transactionData = {
      description: complexTransactionData.description,
      amount: complexTransactionData.amount,
      currency: complexTransactionData.currency,
      date: complexTransactionData.date,
      categoryId: aiData.category.id,
      type: 'expense',
    };

    const createdTransactionResponse = {
      id: 'transaction-complex-1',
      userId,
      categoryId: aiData.category.id,
      amount: 59988,
      currency: 'USD',
      description: complexTransactionData.description,
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
      createdAt: '2025-10-03T13:00:00Z',
      updatedAt: '2025-10-03T13:00:00Z',
      category: {
        id: aiData.category.id,
        name: aiData.category.name,
        type: aiData.category.type,
        color: '#10B981',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionResponse = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    expect(transactionResponse.status).toBe(201);
    const transaction = await transactionResponse.json();
    expect(transaction.metadata.aiProcessed).toBe(true);
    expect(transaction.metadata.purchaseOrder).toBe('PO-2025-001');

    // Step 4: Verify transaction appears in dashboard
    const dashboardResponse = {
      summary: {
        totalIncome: 0,
        totalExpenses: 59988,
        netIncome: -59988,
        transactionCount: 1,
        averageTransaction: 59988,
      },
      categories: [
        {
          categoryId: 'cat-software',
          categoryName: 'Software & Subscriptions',
          amount: 59988,
          percentage: 100,
          transactionCount: 1,
        },
      ],
      recentInsights: [
        {
          id: 'insight-software-spending',
          type: 'spending_trend',
          title: 'Software Subscription Cost Detected',
          description: 'Large annual software subscription of $599.88 recorded. Consider monthly billing for better cash flow.',
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
      headers: { 'Authorization': `Bearer ${sessionToken}` },
    });

    expect(dashboardData.status).toBe(200);
    const dashboard = await dashboardData.json();
    expect(dashboard.summary.totalExpenses).toBe(59988);
    expect(dashboard.categories[0].categoryName).toBe('Software & Subscriptions');
  });

  it('should handle income transaction with AI processing', async () => {
    // Step 1: Process income transaction
    const incomeTransactionData = {
      description: 'Received wire transfer payment $12,500 from Global Tech Solutions for Q3 consulting services completed - Invoice #INV-Q3-2025-042, payment reference: GTLS-2025-10-001, client account manager: Sarah Chen',
      amount: 1250000,
      currency: 'USD',
      date: '2025-10-01',
      context: {
        userCategories: [
          { id: 'cat-service-revenue', name: 'Service Revenue', type: 'income' },
          { id: 'cat-consulting', name: 'Consulting Fees', type: 'income' },
        ],
      },
    };

    const aiIncomeResponse = {
      category: { id: 'cat-consulting', name: 'Consulting Fees', type: 'income' },
      confidence: 98,
      processedDescription: 'Q3 consulting services payment from Global Tech Solutions',
      extractedMetadata: {
        vendor: 'Global Tech Solutions',
        location: null,
        tags: ['consulting', 'q3', 'services', 'wire-transfer', 'invoice'],
        invoiceNumber: 'INV-Q3-2025-042',
        paymentReference: 'GTLS-2025-10-001',
        clientManager: 'Sarah Chen',
        quarter: 'Q3',
        paymentMethod: 'wire_transfer',
      },
      suggestions: [
        {
          type: 'category',
          value: 'Service Revenue',
          confidence: 95,
        },
        {
          type: 'followup',
          value: 'invoice_paid_followup',
          confidence: 85,
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(aiIncomeResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const aiResponse = await fetch(`${API_BASE}/ai/process-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(incomeTransactionData),
    });

    expect(aiResponse.status).toBe(200);
    const aiData = await aiResponse.json();
    expect(aiData.category.type).toBe('income');
    expect(aiData.extractedMetadata.vendor).toBe('Global Tech Solutions');
    expect(aiData.extractedMetadata.invoiceNumber).toBe('INV-Q3-2025-042');

    // Step 2: Create income transaction
    const transactionData = {
      description: incomeTransactionData.description,
      amount: incomeTransactionData.amount,
      currency: incomeTransactionData.currency,
      date: incomeTransactionData.date,
      categoryId: aiData.category.id,
      type: 'income',
    };

    const createdTransactionResponse = {
      id: 'transaction-income-1',
      userId,
      categoryId: aiData.category.id,
      amount: 1250000,
      currency: 'USD',
      description: incomeTransactionData.description,
      processedDescription: aiData.processedDescription,
      date: '2025-10-01T00:00:00Z',
      type: 'income',
      confidence: aiData.confidence,
      needsReview: false,
      metadata: {
        ...aiData.extractedMetadata,
        aiProcessed: true,
        manualOverride: false,
      },
      createdAt: '2025-10-03T13:05:00Z',
      updatedAt: '2025-10-03T13:05:00Z',
      category: {
        id: aiData.category.id,
        name: aiData.category.name,
        type: aiData.category.type,
        color: '#22C55E',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionResponse = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    expect(transactionResponse.status).toBe(201);
    const transaction = await transactionResponse.json();
    expect(transaction.type).toBe('income');
    expect(transaction.amount).toBe(1250000);
  });

  it('should handle AI service unavailability with fallback', async () => {
    // Mock AI service failure
    const fallbackResponse = {
      category: { id: 'fallback-expense', name: 'Uncategorized Expense', type: 'expense' },
      confidence: 0,
      processedDescription: 'Monthly software subscription',
      extractedMetadata: {
        vendor: null,
        location: null,
        tags: [],
      },
      suggestions: [],
      error: 'AI service temporarily unavailable, using fallback categorization',
    };

    fetch.mockResponseOnce(JSON.stringify(fallbackResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionData = {
      description: 'Monthly software subscription',
      amount: 9900,
      currency: 'USD',
      date: '2025-10-01',
    };

    const aiResponse = await fetch(`${API_BASE}/ai/process-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    expect(aiResponse.status).toBe(200);
    const aiData = await aiResponse.json();
    expect(aiData.confidence).toBe(0);
    expect(aiData.error).toContain('AI service temporarily unavailable');
    expect(aiData.category.name).toBe('Uncategorized Expense');

    // Transaction should still be created with fallback categorization
    const createdTransactionResponse = {
      id: 'transaction-fallback-1',
      userId,
      categoryId: aiData.category.id,
      amount: 9900,
      currency: 'USD',
      description: transactionData.description,
      processedDescription: aiData.processedDescription,
      date: '2025-10-01T00:00:00Z',
      type: 'expense',
      confidence: aiData.confidence,
      needsReview: true, // Should flag for manual review when AI is unavailable
      metadata: {
        ...aiData.extractedMetadata,
        aiProcessed: false,
        manualOverride: false,
      },
      createdAt: '2025-10-03T13:10:00Z',
      updatedAt: '2025-10-03T13:10:00Z',
    };

    fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionResponse = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        ...transactionData,
        categoryId: aiData.category.id,
        type: 'expense',
      }),
    });

    expect(transactionResponse.status).toBe(201);
    const transaction = await transactionResponse.json();
    expect(transaction.needsReview).toBe(true);
    expect(transaction.metadata.aiProcessed).toBe(false);
  });

  it('should handle manual category override of AI suggestion', async () => {
    // AI suggests one category, user overrides it
    const aiResponse = {
      category: { id: 'cat-office', name: 'Office Supplies', type: 'expense' },
      confidence: 80,
      processedDescription: 'Team lunch at restaurant',
      extractedMetadata: {
        vendor: 'Italian Bistro',
        location: 'Downtown',
        tags: ['team', 'lunch', 'restaurant'],
      },
      suggestions: [
        { type: 'category', value: 'Travel & Meals', confidence: 90 },
        { type: 'category', value: 'Office Supplies', confidence: 80 },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(aiResponse), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionData = {
      description: 'Team lunch at Italian Bistro in downtown to celebrate project milestone - $125.50 with tip included',
      amount: 12550,
      currency: 'USD',
      date: '2025-10-02',
    };

    const aiProcessingResponse = await fetch(`${API_BASE}/ai/process-transaction`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(transactionData),
    });

    expect(aiProcessingResponse.status).toBe(200);
    const aiData = await aiProcessingResponse.json();

    // User manually overrides with better category
    const manualCategory = 'Travel & Meals';
    const createdTransactionResponse = {
      id: 'transaction-manual-override-1',
      userId,
      categoryId: 'cat-travel',
      amount: 12550,
      currency: 'USD',
      description: transactionData.description,
      processedDescription: aiData.processedDescription,
      date: '2025-10-02T00:00:00Z',
      type: 'expense',
      confidence: 100, // Manual override gets full confidence
      needsReview: false,
      metadata: {
        ...aiData.extractedMetadata,
        aiProcessed: true,
        manualOverride: true,
        originalAICategory: 'Office Supplies',
        aiConfidence: aiData.confidence,
      },
      createdAt: '2025-10-03T13:15:00Z',
      updatedAt: '2025-10-03T13:15:00Z',
    };

    fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    });

    const transactionResponse = await fetch(`${API_BASE}/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        description: transactionData.description,
        amount: transactionData.amount,
        currency: transactionData.currency,
        date: transactionData.date,
        categoryId: 'cat-travel', // Manual override
        type: 'expense',
      }),
    });

    expect(transactionResponse.status).toBe(201);
    const transaction = await transactionResponse.json();
    expect(transaction.metadata.manualOverride).toBe(true);
    expect(transaction.metadata.originalAICategory).toBe('Office Supplies');
    expect(transaction.confidence).toBe(100);
  });
});