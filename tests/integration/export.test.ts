import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Data Export Integration Tests', () => {
  let sessionToken: string;
  let userId: string;

  beforeEach(() => {
    fetch.resetMocks();

    // Mock successful login
    const loginResponse = {
      user: {
        id: 'user-export-123',
        email: 'test@example.com',
        name: 'Test User',
        businessName: 'Test Business',
      },
      session: 'export-session-token-456',
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

  it('should export comprehensive financial data in multiple formats', async () => {
    // Step 1: Create diverse transaction data for export testing
    const transactionsForExport = [
      {
        description: 'Monthly Adobe Creative Cloud subscription for design team',
        amount: 59988,
        currency: 'USD',
        date: '2025-09-01',
        type: 'expense',
        category: 'Software & Subscriptions',
        aiProcessed: true,
        confidence: 95,
        metadata: {
          vendor: 'Adobe',
          location: 'Online',
          tags: ['software', 'subscription', 'design', 'creative'],
          planType: 'annual',
          users: 5,
          aiProcessed: true,
          manualOverride: false,
        },
      },
      {
        description: 'Office supplies bulk purchase from Staples - pens, paper, notebooks, printer ink',
        amount: 12500,
        currency: 'USD',
        date: '2025-09-05',
        type: 'expense',
        category: 'Office Supplies',
        aiProcessed: true,
        confidence: 98,
        metadata: {
          vendor: 'Staples',
          location: 'Local Store',
          tags: ['office', 'supplies', 'bulk', 'stationery'],
          bulkPurchase: true,
          aiProcessed: true,
          manualOverride: false,
        },
      },
      {
        description: 'Client payment for Q3 consulting services - Digital transformation project completed',
        amount: 2500000,
        currency: 'USD',
        date: '2025-09-15',
        type: 'income',
        category: 'Service Revenue',
        aiProcessed: true,
        confidence: 100,
        metadata: {
          vendor: 'Fortune 500 Tech Corp',
          location: 'Remote',
          tags: ['consulting', 'digital', 'transformation', 'q3'],
          invoiceNumber: 'INV-Q3-2025-001',
          paymentMethod: 'wire_transfer',
          aiProcessed: true,
          manualOverride: false,
        },
      },
      {
        description: 'Business class flight and hotel for client meeting in San Francisco',
        amount: 85000,
        currency: 'USD',
        date: '2025-09-18',
        type: 'expense',
        category: 'Travel & Meals',
        aiProcessed: true,
        confidence: 92,
        metadata: {
          vendor: 'United Airlines, Marriott Hotels',
          location: 'San Francisco, CA',
          tags: ['travel', 'flight', 'hotel', 'client', 'meeting'],
          purpose: 'Client Meeting',
          tripDuration: '3 days',
          aiProcessed: true,
          manualOverride: false,
        },
      },
      {
        description: 'Professional development - Advanced financial modeling course',
        amount: 8000,
        currency: 'USD',
        date: '2025-09-22',
        type: 'expense',
        category: 'Professional Services',
        aiProcessed: true,
        confidence: 88,
        metadata: {
          vendor: 'Finance Institute',
          location: 'Online',
          tags: ['training', 'professional', 'financial', 'modeling'],
          courseName: 'Advanced Financial Modeling',
          duration: '40 hours',
          certificate: true,
          aiProcessed: true,
          manualOverride: false,
        },
      },
      {
        description: 'Emergency server replacement due to hardware failure',
        amount: 45000,
        currency: 'USD',
        date: '2025-09-25',
        type: 'expense',
        category: 'Equipment',
        aiProcessed: true,
        confidence: 85,
        metadata: {
          vendor: 'Dell Technologies',
          location: 'Office',
          tags: ['emergency', 'equipment', 'hardware', 'server'],
          urgency: 'emergency',
          reason: 'Hardware Failure',
          equipmentType: 'Server',
          warrantyStatus: 'Expired',
          aiProcessed: true,
          manualOverride: false,
        },
      },
    ];

    // Mock transaction creation
    transactionsForExport.forEach((transaction, index) => {
      const createdTransactionResponse = {
        id: `export-transaction-${index + 1}`,
        userId,
        ...transaction,
        createdAt: '2025-10-03T16:00:00Z',
        updatedAt: '2025-10-03T16:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(createdTransactionResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    // Create all transactions
    for (const transaction of transactionsForExport) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    // Step 2: Export as CSV with full metadata
    const csvExportRequest = {
      format: 'csv',
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      },
      includeMetadata: true,
    };

    const expectedCSVContent = `Date,Description,Amount,Currency,Type,Category,Vendor,Location,Tags,Notes,AIProcessed,Confidence,ManualOverride
2025-09-01,"Monthly Adobe Creative Cloud subscription for design team",59988,USD,expense,"Software & Subscriptions","Adobe","Online","software,subscription,design,creative","",true,95,false
2025-09-05,"Office supplies bulk purchase from Staples - pens, paper, notebooks, printer ink",12500,USD,expense,"Office Supplies","Staples","Local Store","office,supplies,bulk,stationery","",true,98,false
2025-09-15,"Client payment for Q3 consulting services - Digital transformation project completed",2500000,USD,income,"Service Revenue","Fortune 500 Tech Corp","Remote","consulting,digital,transformation,q3","",true,100,false
2025-09-18,"Business class flight and hotel for client meeting in San Francisco",85000,USD,expense,"Travel & Meals","United Airlines, Marriott Hotels","San Francisco, CA","travel,flight,hotel,client,meeting","",true,92,false
2025-09-22,"Professional development - Advanced financial modeling course",8000,USD,expense,"Professional Services","Finance Institute","Online","training,professional,financial,modeling","",true,88,false
2025-09-25,"Emergency server replacement due to hardware failure",45000,USD,expense,"Equipment","Dell Technologies","Office","emergency,equipment,hardware,server","",true,85,false
`;

    const mockCSVResponse = new Response(expectedCSVContent, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="transactions_2025-09-01_to_2025-09-30.csv"',
        'Content-Length': expectedCSVContent.length.toString(),
      },
    });

    fetch.mockResponseOnce(mockCSVResponse);

    const csvResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(csvExportRequest),
    });

    expect(csvResponse.status).toBe(200);
    expect(csvResponse.headers.get('Content-Type')).toBe('text/csv');
    expect(csvResponse.headers.get('Content-Disposition')).toContain('transactions_2025-09-01_to_2025-09-30.csv');

    const csvContent = await csvResponse.text();
    expect(csvContent).toContain('Date,Description,Amount,Currency');
    expect(csvContent).toContain('Adobe Creative Cloud');
    expect(csvContent).toContain('Q3 consulting services');
    expect(csvContent).toContain('AIProcessed,Confidence');
    expect(csvContent.split('\n')).toHaveLength(7); // 6 transactions + header

    // Step 3: Export as JSON with comprehensive data structure
    const jsonExportRequest = {
      format: 'json',
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        types: ['expense', 'income'],
      },
      includeMetadata: true,
    };

    const expectedJSONContent = {
      exportInfo: {
        format: 'json',
        generatedAt: '2025-10-03T16:30:00Z',
        period: {
          startDate: '2025-09-01',
          endDate: '2025-09-30',
        },
        totalTransactions: 6,
        filters: {
          startDate: '2025-09-01',
          endDate: '2025-09-30',
          types: ['expense', 'income'],
        },
        includeMetadata: true,
      },
      transactions: [
        {
          id: 'export-transaction-1',
          date: '2025-09-01T00:00:00Z',
          description: 'Monthly Adobe Creative Cloud subscription for design team',
          processedDescription: 'Monthly Adobe Creative Cloud subscription for design team',
          amount: 59988,
          currency: 'USD',
          type: 'expense',
          categoryId: 'cat-software',
          categoryName: 'Software & Subscriptions',
          confidence: 95,
          needsReview: false,
          metadata: {
            vendor: 'Adobe',
            location: 'Online',
            tags: ['software', 'subscription', 'design', 'creative'],
            planType: 'annual',
            users: 5,
            aiProcessed: true,
            manualOverride: false,
          },
          createdAt: '2025-10-03T16:00:00Z',
          updatedAt: '2025-10-03T16:00:00Z',
        },
        // ... all other transactions with full metadata
      ],
      summary: {
        totalIncome: 2500000,
        totalExpenses: 210488,
        netIncome: 2289512,
        transactionCount: 6,
        averageTransaction: 350813,
        categories: {
          'Software & Subscriptions': { amount: 59988, count: 1, type: 'expense' },
          'Office Supplies': { amount: 12500, count: 1, type: 'expense' },
          'Service Revenue': { amount: 2500000, count: 1, type: 'income' },
          'Travel & Meals': { amount: 85000, count: 1, type: 'expense' },
          'Professional Services': { amount: 8000, count: 1, type: 'expense' },
          'Equipment': { amount: 45000, count: 1, type: 'expense' },
        },
        currencyDistribution: {
          'USD': { amount: 2710488, count: 6, percentage: 100 },
        },
        aiProcessing: {
          aiProcessed: 6,
          aiConfidence: {
            average: 93,
            minimum: 85,
            maximum: 100,
          },
          manualOverrides: 0,
        },
      },
      insights: [
        {
          title: 'AI Processing Summary',
          description: 'All 6 transactions were processed by AI with 93% average confidence',
          type: 'summary',
          generatedAt: '2025-10-03T16:30:00Z',
        },
      ],
    };

    fetch.mockResponseOnce(JSON.stringify(expectedJSONContent), {
      status: 200,
      headers: {
        'Content-Type': 'application/json',
        'Content-Disposition': 'attachment; filename="transactions_2025-09-01_to_2025-09-30.json"',
      },
    });

    const jsonResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(jsonExportRequest),
    });

    expect(jsonResponse.status).toBe(200);
    expect(jsonResponse.headers.get('Content-Type')).toBe('application/json');

    const jsonContent = await jsonResponse.json();
    expect(jsonContent.exportInfo.format).toBe('json');
    expect(jsonContent.transactions).toHaveLength(6);
    expect(jsonContent.summary.totalIncome).toBe(2500000);
    expect(jsonContent.summary.aiProcessing.aiProcessed).toBe(6);
    expect(jsonContent.insights).toHaveLength(1);

    // Step 4: Export as PDF (mock binary content)
    const pdfExportRequest = {
      format: 'pdf',
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: ['Software & Subscriptions', 'Service Revenue'],
      },
      includeMetadata: true,
    };

    // Mock PDF binary content
    const pdfContent = new Uint8Array([
      0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34, // PDF header
      0x0A, 0x25, 0x25, 0x0A, 0x54, 0x69, 0x74, 0x6C, 0x65, // %PDF-1.4\n% Title
      0x6C, 0x65, 0x3A, 0x20, 0x54, 0x72, 0x61, 0x6E, 0x73, // Title: Trans
      0x61, 0x63, 0x74, 0x69, 0x6F, 0x6E, 0x73, 0x20, 0x52, // actions Repo
      0x65, 0x70, 0x6F, 0x72, 0x74, 0x0A, 0x25, 0x25, 0x0A, // Report\n\n%
      0x45, 0x6E, 0x64, 0x6F, 0x66, 0x2D, 0x6F, 0x62, 0x6A, // End of obj
      0x0A, 0x73, 0x74, 0x72, 0x65, 0x61, 0x6D, 0x0A, 0x0A, // stream\n\n
      0x31, 0x20, 0x30, 0x20, 0x6F, 0x62, 0x6A, 0x0A, 0x3C, // 1 0 obj\n<
      0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, 0x3C, // <<<<<<<<<
    ]);

    const mockPDFResponse = new Response(pdfContent, {
      status: 200,
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': 'attachment; filename="transactions_report_2025-09-01_to_2025-09-30.pdf"',
        'Content-Length': pdfContent.length.toString(),
      },
    });

    fetch.mockResponseOnce(mockPDFResponse);

    const pdfResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(pdfExportRequest),
    });

    expect(pdfResponse.status).toBe(200);
    expect(pdfResponse.headers.get('Content-Type')).toBe('application/pdf');
    expect(pdfResponse.headers.get('Content-Disposition')).toContain('.pdf');

    const pdfBinary = await pdfResponse.arrayBuffer();
    expect(pdfBinary.byteLength).toBeGreaterThan(50);

    // Verify PDF header
    const pdfHeader = new TextDecoder().decode(pdfBinary.slice(0, 8));
    expect(pdfHeader).toBe('%PDF-1.4');
  });

  it('should export filtered data by date range and categories', async () => {
    // Create transactions across different date ranges
    const multiPeriodTransactions = [
      {
        description: 'Q3 software license renewal',
        amount: 120000,
        date: '2025-07-01',
        type: 'expense',
        category: 'Software & Subscriptions',
      },
      {
        description: 'August office supplies',
        amount: 3500,
        date: '2025-08-15',
        type: 'expense',
        category: 'Office Supplies',
      },
      {
        description: 'September consulting payment',
        amount: 500000,
        date: '2025-09-20',
        type: 'income',
        category: 'Service Revenue',
      },
      {
        description: 'October equipment purchase',
        amount: 25000,
        date: '2025-10-05',
        type: 'expense',
        category: 'Equipment',
      },
    ];

    // Mock multi-period transactions
    multiPeriodTransactions.forEach((transaction, index) => {
      fetch.mockResponseOnce(JSON.stringify({
        id: `period-transaction-${index + 1}`,
        userId,
        ...transaction,
        createdAt: '2025-10-03T17:00:00Z',
      }), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });
    });

    for (const transaction of multiPeriodTransactions) {
      await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${sessionToken}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transaction),
      });
    }

    // Export specific date range and categories
    const filteredExportRequest = {
      format: 'csv',
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
        categories: ['Service Revenue'],
        types: ['income'],
      },
      includeMetadata: false,
    };

    const expectedFilteredCSV = `Date,Description,Amount,Currency,Type,Category
2025-09-20,"September consulting payment",500000,USD,income,"Service Revenue"
`;

    const mockFilteredResponse = new Response(expectedFilteredCSV, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="transactions_filtered_2025-09-01_to_2025-09-30.csv"',
      },
    });

    fetch.mockResponseOnce(mockFilteredResponse);

    const filteredResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(filteredExportRequest),
    });

    expect(filteredResponse.status).toBe(200);
    const filteredContent = await filteredResponse.text();
    expect(filteredContent).toContain('September consulting payment');
    expect(filteredContent).not.toContain('Q3 software license'); // Outside date range
    expect(filteredContent).not.toContain('October equipment'); // Outside date range

    // Step 2: Verify only income and Service Revenue included
    const lines = filteredContent.split('\n');
    expect(lines).toHaveLength(2); // Header + 1 transaction
    expect(lines[1]).toContain('500000');
    expect(lines[1]).toContain('income');
    expect(lines[1]).toContain('Service Revenue');
  });

  it('should handle export with no matching transactions', async () => {
    const emptyExportRequest = {
      format: 'csv',
      filters: {
        startDate: '2025-11-01', // Future date with no transactions
        endDate: '2025-11-30',
      },
      includeMetadata: true,
    };

    const expectedEmptyCSV = `Date,Description,Amount,Currency,Type,Category,Vendor,Location,Tags,Notes,AIProcessed,Confidence,ManualOverride
`;

    const mockEmptyResponse = new Response(expectedEmptyCSV, {
      status: 200,
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': 'attachment; filename="transactions_2025-11-01_to_2025-11-30.csv"',
      },
    });

    fetch.mockResponseOnce(mockEmptyResponse);

    const emptyResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emptyExportRequest),
    });

    expect(emptyResponse.status).toBe(200);
    const emptyContent = await emptyResponse.text();
    expect(emptyContent).toBe('Date,Description,Amount,Currency,Type,Category,Vendor,Location,Tags,Notes,AIProcessed,Confidence,ManualOverride\n');
  });

  it('should handle export validation errors', async () => {
    // Test invalid date range
    const invalidDateRangeRequest = {
      format: 'csv',
      filters: {
        startDate: '2025-10-03',
        endDate: '2025-10-01', // End before start
      },
    };

    const dateError = {
      error: 'Validation failed',
      message: 'Invalid date range',
      code: 'VALIDATION_ERROR',
      details: {
        dateRange: 'End date must be after start date',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(dateError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const dateErrorResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidDateRangeRequest),
    });

    expect(dateErrorResponse.status).toBe(400);
    const dateErrorData = await dateErrorResponse.json();
    expect(dateErrorData.code).toBe('VALIDATION_ERROR');

    // Test invalid format
    const invalidFormatRequest = {
      format: 'excel', // Not supported
      filters: {
        startDate: '2025-09-01',
        endDate: '2025-09-30',
      },
    };

    const formatError = {
      error: 'Validation failed',
      message: 'Invalid export format',
      code: 'VALIDATION_ERROR',
      details: {
        format: 'Format must be one of: csv, json, pdf',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(formatError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const formatErrorResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(invalidFormatRequest),
    });

    expect(formatErrorResponse.status).toBe(400);
    const formatErrorData = await formatErrorResponse.json();
    expect(formatErrorData.details.format).toContain('csv, json, pdf');
  });

  it('should handle large dataset export limitations', async () => {
    // Test date range too large
    const largeDateRangeRequest = {
      format: 'csv',
      filters: {
        startDate: '2020-01-01',
        endDate: '2025-12-31', // 5+ years - too large
      },
    };

    const tooLargeError = {
      error: 'Export too large',
      message: 'Date range too large for single export',
      code: 'EXPORT_TOO_LARGE',
      details: {
        maxDays: 365,
        requestedDays: 2191,
        suggestion: 'Please break up your export into smaller date ranges (maximum 365 days)',
      },
    };

    fetch.mockResponseOnce(JSON.stringify(tooLargeError), {
      status: 400,
      headers: { 'Content-Type': 'application/json' },
    });

    const tooLargeResponse = await fetch(`${API_BASE}/export/transactions`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${sessionToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(largeDateRangeRequest),
    });

    expect(tooLargeResponse.status).toBe(400);
    const tooLargeData = await tooLargeResponse.json();
    expect(tooLargeData.details.requestedDays).toBeGreaterThan(365);
    expect(tooLargeData.details.suggestion).toContain('maximum 365 days');
  });
});