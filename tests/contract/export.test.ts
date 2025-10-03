import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Export API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('POST /api/export/transactions', () => {
    it('should export transactions as CSV', async () => {
      const exportRequest = {
        format: 'csv',
        filters: {
          startDate: '2025-10-01',
          endDate: '2025-10-03',
          categories: ['category-1', 'category-2'],
          types: ['expense', 'income'],
        },
        includeMetadata: true,
      };

      const csvContent = `Date,Description,Amount,Currency,Type,Category,Vendor,Location,Tags,Notes
2025-10-01,"Software subscription",9900,USD,expense,"Software & Subscriptions","Adobe","Online","software,subscription","Monthly subscription"
2025-10-02,"Office supplies purchase",4567,USD,expense,"Office Supplies","Staples","New York","office,supplies","Office supplies for Q4"
2025-10-01,"Client payment for services",500000,USD,income,"Service Revenue","Acme Corp","Remote","service,revenue","Invoice #INV-2025-001"
`;

      const mockResponse = new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions_2025-10-01_to_2025-10-03.csv"',
          'Content-Length': csvContent.length.toString(),
        },
      });

      fetch.mockResponseOnce(mockResponse);

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('text/csv');
      expect(response.headers.get('Content-Disposition')).toContain('transactions_2025-10-01_to_2025-10-03.csv');

      const content = await response.text();
      expect(content).toContain('Date,Description,Amount,Currency');
      expect(content).toContain('Software subscription');
      expect(content).toContain('Client payment for services');
    });

    it('should export transactions as JSON', async () => {
      const exportRequest = {
        format: 'json',
        filters: {
          startDate: '2025-10-01',
          endDate: '2025-10-03',
        },
        includeMetadata: false,
      };

      const expectedJsonContent = {
        exportInfo: {
          format: 'json',
          generatedAt: '2025-10-03T12:00:00Z',
          period: {
            startDate: '2025-10-01',
            endDate: '2025-10-03',
          },
          totalTransactions: 3,
          filters: {
            startDate: '2025-10-01',
            endDate: '2025-10-03',
          },
        },
        transactions: [
          {
            id: 'transaction-1',
            date: '2025-10-01T00:00:00Z',
            description: 'Software subscription',
            processedDescription: 'Monthly software subscription',
            amount: 9900,
            currency: 'USD',
            type: 'expense',
            categoryId: 'category-software',
            categoryName: 'Software & Subscriptions',
            confidence: 100,
            needsReview: false,
          },
          {
            id: 'transaction-2',
            date: '2025-10-02T00:00:00Z',
            description: 'Office supplies purchase',
            processedDescription: 'Office supplies purchase at Staples',
            amount: 4567,
            currency: 'USD',
            type: 'expense',
            categoryId: 'category-office',
            categoryName: 'Office Supplies',
            confidence: 95,
            needsReview: false,
          },
          {
            id: 'transaction-3',
            date: '2025-10-01T00:00:00Z',
            description: 'Client payment for services',
            processedDescription: 'Service revenue from client',
            amount: 500000,
            currency: 'USD',
            type: 'income',
            categoryId: 'category-service',
            categoryName: 'Service Revenue',
            confidence: 100,
            needsReview: false,
          },
        ],
        summary: {
          totalIncome: 500000,
          totalExpenses: 14467,
          netIncome: 485533,
          transactionCount: 3,
          categories: {
            'Software & Subscriptions': { amount: 9900, count: 1, type: 'expense' },
            'Office Supplies': { amount: 4567, count: 1, type: 'expense' },
            'Service Revenue': { amount: 500000, count: 1, type: 'income' },
          },
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedJsonContent), {
        status: 200,
        headers: {
          'Content-Type': 'application/json',
          'Content-Disposition': 'attachment; filename="transactions_2025-10-01_to_2025-10-03.json"',
        },
      });

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/json');

      const content = await response.json();
      expect(content.exportInfo.format).toBe('json');
      expect(content.transactions).toHaveLength(3);
      expect(content.summary.totalIncome).toBe(500000);
    });

    it('should export transactions as PDF', async () => {
      const exportRequest = {
        format: 'pdf',
        filters: {
          startDate: '2025-10-01',
          endDate: '2025-10-03',
        },
        includeMetadata: true,
      };

      // Mock PDF binary content
      const pdfContent = new Uint8Array([0x25, 0x50, 0x44, 0x46, 0x2D, 0x31, 0x2E, 0x34]); // PDF header

      const mockResponse = new Response(pdfContent, {
        status: 200,
        headers: {
          'Content-Type': 'application/pdf',
          'Content-Disposition': 'attachment; filename="transactions_2025-10-01_to_2025-10-03.pdf"',
          'Content-Length': pdfContent.length.toString(),
        },
      });

      fetch.mockResponseOnce(mockResponse);

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(200);
      expect(response.headers.get('Content-Type')).toBe('application/pdf');
      expect(response.headers.get('Content-Disposition')).toContain('.pdf');
    });

    it('should export without filters (all transactions)', async () => {
      const exportRequest = {
        format: 'csv',
        includeMetadata: false,
        // No filters specified - should export all
      };

      const csvContent = `Date,Description,Amount,Currency,Type,Category
2025-09-15,"Old transaction",5000,USD,expense,"Miscellaneous"
2025-09-20,"Another transaction",7500,USD,expense,"Office Supplies"
2025-10-01,"Software subscription",9900,USD,expense,"Software & Subscriptions"
2025-10-02,"Office supplies purchase",4567,USD,expense,"Office Supplies"
2025-10-01,"Client payment for services",500000,USD,income,"Service Revenue"
`;

      const mockResponse = new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions_all.csv"',
        },
      });

      fetch.mockResponseOnce(mockResponse);

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(200);
      const content = await response.text();
      expect(content.split('\n')).toHaveLength(6); // 5 transactions + header
    });

    it('should handle empty dataset gracefully', async () => {
      const exportRequest = {
        format: 'csv',
        filters: {
          startDate: '2025-12-01',
          endDate: '2025-12-31', // Future date - no transactions
        },
        includeMetadata: false,
      };

      const csvContent = `Date,Description,Amount,Currency,Type,Category
`;

      const mockResponse = new Response(csvContent, {
        status: 200,
        headers: {
          'Content-Type': 'text/csv',
          'Content-Disposition': 'attachment; filename="transactions_2025-12-01_to_2025-12-31.csv"',
        },
      });

      fetch.mockResponseOnce(mockResponse);

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(200);
      const content = await response.text();
      expect(content).toBe('Date,Description,Amount,Currency,Type,Category\n');
    });

    it('should validate export format', async () => {
      const exportRequest = {
        format: 'invalid-format', // Not csv, json, or pdf
        filters: {
          startDate: '2025-10-01',
          endDate: '2025-10-03',
        },
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Invalid export format',
        code: 'VALIDATION_ERROR',
        details: {
          format: 'Format must be one of: csv, json, pdf',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details.format).toContain('Format must be one of: csv, json, pdf');
    });

    it('should validate date range', async () => {
      const exportRequest = {
        format: 'csv',
        filters: {
          startDate: '2025-10-03',
          endDate: '2025-10-01', // End date before start date
        },
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Invalid date range',
        code: 'VALIDATION_ERROR',
        details: {
          dateRange: 'End date must be after start date',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(400);
    });

    it('should limit export size for large datasets', async () => {
      const exportRequest = {
        format: 'csv',
        filters: {
          startDate: '2020-01-01', // Very large date range
          endDate: '2025-12-31',
        },
      };

      const expectedError = {
        error: 'Export too large',
        message: 'Date range too large for single export',
        code: 'EXPORT_TOO_LARGE',
        details: {
          maxDays: 365,
          requestedDays: 2191,
          suggestion: 'Please break up your export into smaller date ranges',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data.details.requestedDays).toBeGreaterThan(365);
    });

    it('should return 401 for unauthorized requests', async () => {
      const exportRequest = {
        format: 'csv',
        filters: {
          startDate: '2025-10-01',
          endDate: '2025-10-03',
        },
      };

      const expectedError = {
        error: 'Unauthorized',
        message: 'Authentication required',
        code: 'UNAUTHORIZED',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/export/transactions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(exportRequest),
      });

      expect(response.status).toBe(401);
    });
  });
});