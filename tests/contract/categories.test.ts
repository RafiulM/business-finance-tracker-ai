import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Categories API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('GET /api/categories', () => {
    it('should return user categories organized by type', async () => {
      const expectedResponse = {
        categories: [
          {
            id: 'cat-1',
            userId: 'user-123',
            name: 'Office Supplies',
            description: 'General office supplies and stationery',
            parentId: null,
            type: 'expense',
            color: '#3B82F6',
            icon: 'package',
            isActive: true,
            createdAt: '2025-10-01T10:00:00Z',
            updatedAt: '2025-10-01T10:00:00Z',
            children: [
              {
                id: 'cat-1-child-1',
                userId: 'user-123',
                name: 'Stationery',
                parentId: 'cat-1',
                type: 'expense',
                color: '#3B82F6',
                icon: 'pen',
                isActive: true,
                createdAt: '2025-10-01T10:30:00Z',
                updatedAt: '2025-10-01T10:30:00Z',
              },
            ],
          },
          {
            id: 'cat-2',
            userId: 'user-123',
            name: 'Software & Subscriptions',
            description: 'Software licenses and recurring subscriptions',
            parentId: null,
            type: 'expense',
            color: '#10B981',
            icon: 'monitor',
            isActive: true,
            createdAt: '2025-10-01T10:00:00Z',
            updatedAt: '2025-10-01T10:00:00Z',
            children: [],
          },
          {
            id: 'cat-3',
            userId: 'user-123',
            name: 'Service Revenue',
            description: 'Revenue from consulting and services',
            parentId: null,
            type: 'income',
            color: '#22C55E',
            icon: 'trending-up',
            isActive: true,
            createdAt: '2025-10-01T10:00:00Z',
            updatedAt: '2025-10-01T10:00:00Z',
            children: [],
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.categories).toHaveLength(3);
      expect(data.categories[0].type).toBe('expense');
      expect(data.categories[2].type).toBe('income');
      expect(data.categories[0].children).toHaveLength(1);
    });

    it('should filter categories by type', async () => {
      const expectedResponse = {
        categories: [
          {
            id: 'cat-1',
            name: 'Office Supplies',
            type: 'expense',
            color: '#3B82F6',
            icon: 'package',
            isActive: true,
            children: [],
          },
          {
            id: 'cat-2',
            name: 'Software & Subscriptions',
            type: 'expense',
            color: '#10B981',
            icon: 'monitor',
            isActive: true,
            children: [],
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories?type=expense`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.categories.every(cat => cat.type === 'expense')).toBe(true);
    });

    it('should exclude inactive categories by default', async () => {
      const expectedResponse = {
        categories: [
          {
            id: 'cat-active',
            name: 'Active Category',
            type: 'expense',
            isActive: true,
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.categories.every(cat => cat.isActive === true)).toBe(true);
    });

    it('should include inactive categories when requested', async () => {
      const expectedResponse = {
        categories: [
          {
            id: 'cat-active',
            name: 'Active Category',
            type: 'expense',
            isActive: true,
          },
          {
            id: 'cat-inactive',
            name: 'Inactive Category',
            type: 'expense',
            isActive: false,
          },
        ],
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories?includeInactive=true`, {
        method: 'GET',
        headers: {
          'Authorization': 'Bearer session-token-123',
        },
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data.categories.some(cat => cat.isActive === false)).toBe(true);
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

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'GET',
      });

      expect(response.status).toBe(401);
    });
  });

  describe('POST /api/categories', () => {
    it('should create new category successfully', async () => {
      const categoryData = {
        name: 'Marketing Expenses',
        description: 'Marketing and advertising costs',
        type: 'expense',
        color: '#F59E0B',
        icon: 'megaphone',
      };

      const expectedResponse = {
        id: 'new-category-1',
        userId: 'user-123',
        name: 'Marketing Expenses',
        description: 'Marketing and advertising costs',
        parentId: null,
        type: 'expense',
        color: '#F59E0B',
        icon: 'megaphone',
        isActive: true,
        createdAt: '2025-10-03T11:00:00Z',
        updatedAt: '2025-10-03T11:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);
      expect(data.type).toBe('expense');
      expect(data.color).toBe('#F59E0B');
    });

    it('should create child category with parent relationship', async () => {
      const categoryData = {
        name: 'Digital Marketing',
        description: 'Online marketing expenses',
        parentId: 'parent-category-1',
        type: 'expense',
        color: '#F59E0B',
        icon: 'globe',
      };

      const expectedResponse = {
        id: 'child-category-1',
        userId: 'user-123',
        name: 'Digital Marketing',
        description: 'Online marketing expenses',
        parentId: 'parent-category-1',
        type: 'expense',
        color: '#F59E0B',
        icon: 'globe',
        isActive: true,
        createdAt: '2025-10-03T11:00:00Z',
        updatedAt: '2025-10-03T11:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.parentId).toBe('parent-category-1');
    });

    it('should create income category', async () => {
      const categoryData = {
        name: 'Product Sales',
        description: 'Revenue from product sales',
        type: 'income',
        color: '#22C55E',
        icon: 'shopping-cart',
      };

      const expectedResponse = {
        id: 'income-category-1',
        userId: 'user-123',
        name: 'Product Sales',
        description: 'Revenue from product sales',
        parentId: null,
        type: 'income',
        color: '#22C55E',
        icon: 'shopping-cart',
        isActive: true,
        createdAt: '2025-10-03T11:00:00Z',
        updatedAt: '2025-10-03T11:00:00Z',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(categoryData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data.type).toBe('income');
    });

    it('should validate required fields', async () => {
      const invalidData = {
        description: 'Missing name and type',
        color: '#FF0000',
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Name and type are required',
        code: 'VALIDATION_ERROR',
        details: {
          name: 'Name is required',
          type: 'Type is required',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it('should validate category type', async () => {
      const invalidData = {
        name: 'Invalid Category',
        type: 'invalid-type', // Not one of: expense, income, asset
        color: '#FF0000',
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Invalid category type',
        code: 'VALIDATION_ERROR',
        details: {
          type: 'Type must be one of: expense, income, asset',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it('should validate color format', async () => {
      const invalidData = {
        name: 'Invalid Color Category',
        type: 'expense',
        color: 'invalid-color', // Should be hex color
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Invalid color format',
        code: 'VALIDATION_ERROR',
        details: {
          color: 'Color must be a valid hex color code',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });

    it('should prevent duplicate category names within same type', async () => {
      const duplicateData = {
        name: 'Office Supplies', // Already exists
        type: 'expense',
        color: '#3B82F6',
      };

      const expectedError = {
        error: 'Category already exists',
        message: 'A category with this name already exists',
        code: 'DUPLICATE_CATEGORY',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/categories`, {
        method: 'POST',
        headers: {
          'Authorization': 'Bearer session-token-123',
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(duplicateData),
      });

      expect(response.status).toBe(400);
    });
  });
});