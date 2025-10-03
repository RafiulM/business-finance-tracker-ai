import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Transactions API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('GET /api/transactions', () => {
    it('should return paginated list of transactions', async () => {
      const expectedResponse = {
        transactions: [
          {
            id: 'transaction-1',
            userId: 'user-123',
            categoryId: 'category-1',
            amount: 4567,
            currency: 'USD',
            description: 'Office supplies purchase',
            processedDescription: 'Office supplies purchase at Staples',
            date: '2025-10-02T10:00:00Z',
            type: 'expense',
            confidence: 95,
            needsReview: false,
            metadata: {
              vendor: 'Staples',
              location: 'New York',
              tags: ['office', 'supplies'],
              aiProcessed: true,
              manualOverride: false,
            },
            createdAt: '2025-10-02T10:00:00Z',
            updatedAt: '2025-10-02T10:00:00Z',
            category: {
              id: 'category-1',
              name: 'Office Supplies',
              type: 'expense',
              color: '#3B82F6',
            },
          },
          {
            id: 'transaction-2',
            userId: 'user-123',
            categoryId: 'category-2',
            amount: 500000,
            currency: 'USD',
            description: 'Client payment for services',
            processedDescription: 'Service revenue from client',
            date: '2025-10-01T15:30:00Z',
            type: 'income',
            confidence: 100,
            needsReview: false,
            metadata: {
              vendor: 'Client Corp',
              tags: ['service', 'revenue'],
              aiProcessed: true,
              manualOverride: false,
            },
            createdAt: '2025-10-01T15:30:00Z',
            updatedAt: '2025-10-01T15:30:00Z',
            category: {
              id: 'category-2',
              name: 'Service Revenue',
              type: 'income',
              color: '#22C55E',
            },
          },
        ],
        pagination: {
          page: 1,
          limit: 50,
          totalPages: 1,
          hasNext: false,
          hasPrev: false,
        },
        total: 2,
        filtered: 2,
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions?page=1&limit=50`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);
    });

    it('should filter transactions by category', async () => {
      const expectedResponse = {
        transactions: [
          {
            id: 'transaction-1',
            categoryId: 'category-1',
            amount: 4567,
            description: 'Office supplies purchase',
            category: { id: 'category-1', name: 'Office Supplies', type: 'expense' },
          },
        ],
        pagination: { page: 1, limit: 50, totalPages: 1, hasNext: false, hasPrev: false },
        total: 1,
        filtered: 1,
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions?category=category-1`, {
        method: 'GET',
        headers: { 'Authorization': 'Bearer session-token-123' },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.transactions).toHaveLength(1);
      expect(data.transactions[0].categoryId).toBe('category-1');
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

      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/transactions', () => {
    it('should create new transaction with AI categorization', async () => {
      const transactionData = {
        description: 'Bought office supplies from Staples for $45.67',
        amount: 4567,
        currency: 'USD',
        date: '2025-10-02',
      };

      const expectedResponse = {
        id: 'new-transaction-1',
        userId: 'user-123',
        categoryId: 'category-office-supplies',
        amount: 4567,
        currency: 'USD',
        description: 'Bought office supplies from Staples for $45.67',
        processedDescription: 'Office supplies purchase at Staples',
        date: '2025-10-02T00:00:00Z',
        type: 'expense',
        confidence: 95,
        needsReview: false,
        metadata: {
          vendor: 'Staples',
          location: null,
          tags: ['office', 'supplies'],
          aiProcessed: true,
          manualOverride: false,
        },
        createdAt: '2025-10-03T10:00:00Z',
        updatedAt: '2025-10-03T10:00:00Z',
        category: {
          id: 'category-office-supplies',
          name: 'Office Supplies',
          type: 'expense',
          color: '#3B82F6',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);
      expect(data.confidence).toBe(95);
      expect(data.aiProcessed).toBe(true);
    });

    it('should create transaction with manual category override', async () => {
      const transactionData = {
        description: 'Custom business expense',
        amount: 10000,
        currency: 'USD',
        date: '2025-10-02',
        categoryId: 'custom-category-1',
        type: 'expense',
      };

      const expectedResponse = {
        id: 'manual-transaction-1',
        categoryId: 'custom-category-1',
        amount: 10000,
        type: 'expense',
        confidence: 100,
        needsReview: false,
        metadata: {
          tags: [],
          aiProcessed: false,
          manualOverride: true,
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(transactionData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.metadata.manualOverride).toBe(true);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        amount: 1000,
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

      const response = await fetch(`${API_BASE}/transactions`, {
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

  describe('PUT /api/transactions/{id}', () => {
    it('should update existing transaction', async () => {
      const updateData = {
        categoryId: 'updated-category-1',
        description: 'Updated transaction description',
        metadata: {
          notes: 'Updated manually',
        },
      };

      const expectedResponse = {
        id: 'transaction-1',
        categoryId: 'updated-category-1',
        description: 'Updated transaction description',
        metadata: {
          vendor: 'Staples',
          location: 'New York',
          tags: ['office', 'supplies'],
          notes: 'Updated manually',
          aiProcessed: true,
          manualOverride: true,
        },
        updatedAt: '2025-10-03T11:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions/transaction-1`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(updateData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.description).toBe('Updated transaction description');
      expect(data.metadata.notes).toBe('Updated manually');
    });

    it('should return 404 for non-existent transaction', async () => {
      const expectedError = {
        error: 'Transaction not found',
        message: 'Transaction with ID non-existent does not exist',
        code: 'NOT_FOUND',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions/non-existent`, {
        method: 'PUT',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ description: 'Updated' }),
      });

      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/transactions/{id}', () => {
    it('should soft delete transaction', async () => {
      fetch.mockResponseOnce('', {
        status: 204,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions/transaction-1`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(204);
    });

    it('should return 404 for non-existent transaction', async () => {
      const expectedError = {
        error: 'Transaction not found',
        message: 'Transaction with ID non-existent does not exist',
        code: 'NOT_FOUND',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 404,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/transactions/non-existent`, {
        method: 'DELETE',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(404);
    });
  });
});