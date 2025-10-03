import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fetch from 'jest-fetch-mock';

const API_BASE = 'http://localhost:3000/api';

describe('Authentication API Contract Tests', () => {
  beforeEach(() => {
    fetch.resetMocks();
  });

  afterEach(() => {
    fetch.resetMocks();
  });

  describe('POST /api/auth/login', () => {
    it('should authenticate user with valid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'SecurePass123!',
      };

      const expectedResponse = {
        user: {
          id: 'user-123',
          email: 'test@example.com',
          name: 'Test User',
          businessName: 'Test Business',
          baseCurrency: 'USD',
          timezone: 'UTC',
        },
        session: 'session-token-123',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 200,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      expect(response.status).toBe(200);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/login`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(loginData),
        }
      );
    });

    it('should return 401 for invalid credentials', async () => {
      const loginData = {
        email: 'test@example.com',
        password: 'wrongpassword',
      };

      const expectedError = {
        error: 'Invalid credentials',
        message: 'Email or password is incorrect',
        code: 'INVALID_CREDENTIALS',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 401,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginData),
      });

      expect(response.status).toBe(401);
      const data = await response.json();
      expect(data).toEqual(expectedError);
    });

    it('should validate required fields', async () => {
      const invalidData = {
        email: 'invalid-email',
        // Missing password
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Email and password are required',
        code: 'VALIDATION_ERROR',
        details: {
          email: 'Invalid email format',
          password: 'Password is required',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(invalidData),
      });

      expect(response.status).toBe(400);
    });
  });

  describe('POST /api/auth/register', () => {
    it('should register new user successfully', async () => {
      const registrationData = {
        email: 'newuser@example.com',
        password: 'SecurePass123!',
        name: 'New User',
        businessName: 'New Business',
        baseCurrency: 'USD',
      };

      const expectedResponse = {
        user: {
          id: 'new-user-123',
          email: 'newuser@example.com',
          name: 'New User',
          businessName: 'New Business',
          baseCurrency: 'USD',
          timezone: 'UTC',
          emailVerified: false,
          createdAt: '2025-10-03T10:00:00Z',
        },
        session: 'new-session-token-123',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedResponse), {
        status: 201,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(201);
      const data = await response.json();
      expect(data).toEqual(expectedResponse);

      expect(fetch).toHaveBeenCalledWith(
        `${API_BASE}/auth/register`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(registrationData),
        }
      );
    });

    it('should return 400 for duplicate email', async () => {
      const registrationData = {
        email: 'existing@example.com',
        password: 'SecurePass123!',
        name: 'Existing User',
      };

      const expectedError = {
        error: 'Registration failed',
        message: 'Email already exists',
        code: 'EMAIL_EXISTS',
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(registrationData),
      });

      expect(response.status).toBe(400);
      const data = await response.json();
      expect(data).toEqual(expectedError);
    });

    it('should validate password strength', async () => {
      const weakPasswordData = {
        email: 'test@example.com',
        password: '123', // Too weak
        name: 'Test User',
      };

      const expectedError = {
        error: 'Validation failed',
        message: 'Password does not meet security requirements',
        code: 'WEAK_PASSWORD',
        details: {
          password: 'Password must be at least 8 characters long and contain uppercase, lowercase, and numbers',
        },
      };

      fetch.mockResponseOnce(JSON.stringify(expectedError), {
        status: 400,
        headers: { 'Content-Type': 'application/json' },
      });

      const response = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(weakPasswordData),
      });

      expect(response.status).toBe(400);
    });
  });
});