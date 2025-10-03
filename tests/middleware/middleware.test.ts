import { describe, it, expect, beforeEach, afterEach, jest } from '@jest/globals';
import { NextRequest, NextResponse } from 'next/server';
import { SecurityMiddleware } from '@/lib/middleware/security';
import { RateLimitMiddleware } from '@/lib/middleware/rate-limit';
import { LoggingService } from '@/lib/middleware/logging';
import { ErrorHandlingService } from '@/lib/middleware/error-handler';

describe('Middleware Integration Tests', () => {
  beforeEach(() => {
    // Clear rate limit store before each test
    RateLimitMiddleware['store'].clear();

    // Clear logs before each test
    const logger = LoggingService.getInstance();
    logger.clearLogs();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('Security Middleware', () => {
    it('should add security headers to response', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'GET',
        headers: {
          'origin': 'http://localhost:3000',
        },
      });

      const response = new NextResponse(JSON.stringify({ test: true }));
      const enhancedResponse = SecurityMiddleware.addSecurityHeaders(response, request);

      expect(enhancedResponse.headers.get('X-Content-Type-Options')).toBe('nosniff');
      expect(enhancedResponse.headers.get('X-Frame-Options')).toBe('DENY');
      expect(enhancedResponse.headers.get('X-XSS-Protection')).toBe('1; mode=block');
      expect(enhancedResponse.headers.get('Referrer-Policy')).toBe('strict-origin-when-cross-origin');
      expect(enhancedResponse.headers.get('Content-Security-Policy')).toBeTruthy();
    });

    it('should handle CORS preflight requests', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://localhost:3000',
          'Access-Control-Request-Method': 'POST',
          'Access-Control-Request-Headers': 'Content-Type',
        },
      });

      const response = SecurityMiddleware.middleware(request);

      expect(response).toBeInstanceOf(NextResponse);
      if (response) {
        expect(response.headers.get('Access-Control-Allow-Origin')).toBe('http://localhost:3000');
        expect(response.headers.get('Access-Control-Allow-Methods')).toContain('POST');
        expect(response.headers.get('Access-Control-Allow-Headers')).toContain('Content-Type');
      }
    });

    it('should reject requests from unauthorized origins', () => {
      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'OPTIONS',
        headers: {
          'origin': 'http://malicious-site.com',
          'Access-Control-Request-Method': 'POST',
        },
      });

      const response = SecurityMiddleware.middleware(request);

      expect(response?.status).toBe(403);
    });
  });

  describe('Rate Limit Middleware', () => {
    it('should allow requests within limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
        },
      });

      const result = await RateLimitMiddleware.checkRateLimit(request, {
        userId: 'test-user',
        estimatedTokens: 100,
      });

      expect(result.allowed).toBe(true);
      expect(result.remaining).toBeDefined();
      expect(result.remaining!.minuteRequests).toBeGreaterThan(0);
    });

    it('should block requests exceeding limits', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
      });

      // Exceed the minute limit
      const userId = 'test-user-limit';
      for (let i = 0; i < 15; i++) {
        await RateLimitMiddleware.checkRateLimit(request, { userId });
      }

      const result = await RateLimitMiddleware.checkRateLimit(request, { userId });

      expect(result.allowed).toBe(false);
      expect(result.limitType).toBe('requests');
      expect(result.retryAfter).toBeGreaterThan(0);
    });

    it('should create proper rate limit response', () => {
      const rateLimitResult = {
        allowed: false,
        limitType: 'requests' as const,
        retryAfter: 60,
        remaining: {
          minuteRequests: 0,
          hourRequests: 50,
          dayRequests: 950,
          minuteTokens: 0,
          hourTokens: 50000,
        },
      };

      const response = RateLimitMiddleware.createRateLimitResponse(rateLimitResult);

      expect(response.status).toBe(429);
      expect(response.headers.get('Retry-After')).toBe('60');
      expect(response.headers.get('X-RateLimit-Remaining-Minute')).toBe('0');
    });

    it('should estimate tokens correctly', () => {
      const text = 'This is a test message for token estimation';
      const tokens = RateLimitMiddleware.estimateTokens(text);

      expect(tokens).toBeGreaterThan(0);
      expect(tokens).toBe(Math.ceil(text.length / 4));
    });

    it('should provide rate limit statistics', () => {
      const stats = RateLimitMiddleware.getStatistics();

      expect(stats).toHaveProperty('totalEntries');
      expect(stats).toHaveProperty('activeUsers');
      expect(stats).toHaveProperty('activeIPs');
      expect(stats).toHaveProperty('currentLoad');
    });
  });

  describe('Logging Middleware', () => {
    it('should log messages correctly', () => {
      const logger = LoggingService.getInstance();
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.info('Test message', { key: 'value' });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] Test message'),
        { key: 'value' }
      );

      consoleSpy.mockRestore();
    });

    it('should log HTTP requests', () => {
      const logger = LoggingService.getInstance();
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      const request = new NextRequest('http://localhost:3000/api/test', {
        method: 'POST',
        headers: { 'user-agent': 'test-agent' },
      });

      logger.logRequest(request, {
        statusCode: 200,
        duration: 150,
        userId: 'test-user',
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('[INFO] POST /api/test (200)'),
        expect.objectContaining({
          statusCode: 200,
          duration: 150,
          userId: 'test-user',
        })
      );

      consoleSpy.mockRestore();
    });

    it('should retrieve recent logs', () => {
      const logger = LoggingService.getInstance();

      logger.info('Test message 1');
      logger.warn('Test warning');
      logger.error('Test error');

      const recentLogs = logger.getRecentLogs(10);

      expect(recentLogs.length).toBe(3);
      expect(recentLogs[0].message).toBe('Test message 1');
      expect(recentLogs[1].level).toBe('warn');
      expect(recentLogs[2].level).toBe('error');
    });

    it('should filter logs by level', () => {
      const logger = LoggingService.getInstance();

      logger.info('Info message');
      logger.warn('Warning message');
      logger.error('Error message');

      const errorLogs = logger.getLogsByLevel('error', 10);
      const warnLogs = logger.getLogsByLevel('warn', 10);

      expect(errorLogs.length).toBe(1);
      expect(errorLogs[0].level).toBe('error');
      expect(warnLogs.length).toBe(1);
      expect(warnLogs[0].level).toBe('warn');
    });
  });

  describe('Error Handling Middleware', () => {
    it('should handle application errors', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const appError = ErrorHandlingService.createError('Test error', {
        statusCode: 400,
        code: 'TEST_ERROR',
        userMessage: 'A user-friendly error message',
      });

      const response = ErrorHandlingService.handleError(appError, request);

      expect(response.status).toBe(400);

      return response.json().then(data => {
        expect(data.error.message).toBe('A user-friendly error message');
        expect(data.error.code).toBe('TEST_ERROR');
      });
    });

    it('should handle system errors', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const systemError = new Error('Database connection failed');

      const response = ErrorHandlingService.handleError(systemError, request);

      expect(response.status).toBe(503);

      return response.json().then(data => {
        expect(data.error.message).toBe('Service temporarily unavailable. Please try again later.');
        expect(data.error.code).toBe('SYSTEM_ERROR');
      });
    });

    it('should handle unknown errors', () => {
      const request = new NextRequest('http://localhost:3000/api/test');
      const unknownError = 'Something went wrong';

      const response = ErrorHandlingService.handleError(unknownError, request);

      expect(response.status).toBe(500);

      return response.json().then(data => {
        expect(data.error.message).toBe('An unexpected error occurred');
        expect(data.error.code).toBe('UNKNOWN_ERROR');
      });
    });

    it('should create operational errors', () => {
      const operationalError = ErrorHandlingService.createOperationalError(
        'Something went wrong but it\'s not critical',
        {
          code: 'OPERATIONAL_WARNING',
          details: { field: 'value' },
        }
      );

      expect(operationalError.isOperational).toBe(true);
      expect(operationalError.statusCode).toBe(200);
      expect(operationalError.code).toBe('OPERATIONAL_WARNING');
      expect(operationalError.details).toEqual({ field: 'value' });
    });

    it('should check if error is operational', () => {
      const operationalError = ErrorHandlingService.createOperationalError('Non-critical error');
      const systemError = new Error('Critical system error');

      expect(ErrorHandlingService.isOperationalError(operationalError)).toBe(true);
      expect(ErrorHandlingService.isOperationalError(systemError)).toBe(false);
    });
  });

  describe('Middleware Integration', () => {
    it('should work together for complete request handling', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/test', {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'origin': 'http://localhost:3000',
        },
      });

      // 1. Security headers are added
      let response = new NextResponse();
      response = SecurityMiddleware.addSecurityHeaders(response, request);

      expect(response.headers.get('X-Content-Type-Options')).toBe('nosniff');

      // 2. Rate limiting is checked
      const rateLimitResult = await RateLimitMiddleware.checkRateLimit(request, {
        userId: 'integration-test-user',
        estimatedTokens: 200,
      });

      expect(rateLimitResult.allowed).toBe(true);

      // 3. Logging captures the request
      const logger = LoggingService.getInstance();
      const consoleSpy = jest.spyOn(console, 'info').mockImplementation();

      logger.logRequest(request, {
        statusCode: 200,
        duration: 100,
        userId: 'integration-test-user',
      });

      expect(consoleSpy).toHaveBeenCalled();
      consoleSpy.mockRestore();

      // 4. Error handling is available if needed
      const errorResponse = ErrorHandlingService.handleError(
        new Error('Test integration error'),
        request
      );

      expect(errorResponse.status).toBe(500);
    });

    it('should handle rate limiting before processing', async () => {
      const request = new NextRequest('http://localhost:3000/api/ai/process-transaction', {
        method: 'POST',
      });

      const userId = 'rate-limit-test-user';

      // Exceed rate limit
      for (let i = 0; i < 25; i++) {
        await RateLimitMiddleware.checkRateLimit(request, {
          userId,
          endpoint: '/api/ai/process-transaction',
        });
      }

      const result = await RateLimitMiddleware.checkRateLimit(request, {
        userId,
        endpoint: '/api/ai/process-transaction',
      });

      expect(result.allowed).toBe(false);

      const response = RateLimitMiddleware.createRateLimitResponse(result);
      expect(response.status).toBe(429);
    });
  });

  describe('Configuration Management', () => {
    it('should update security configuration', () => {
      const originalConfig = SecurityMiddleware.getConfig();

      const newConfig = {
        cors: {
          ...originalConfig.cors,
          allowedOrigins: ['https://new-domain.com'],
        },
      };

      SecurityMiddleware.updateConfig(newConfig);
      const updatedConfig = SecurityMiddleware.getConfig();

      expect(updatedConfig.cors.allowedOrigins).toContain('https://new-domain.com');
    });

    it('should update rate limit configuration', () => {
      const originalConfig = RateLimitMiddleware.getConfig();

      const newConfig = {
        ai: {
          ...originalConfig.ai,
          requestsPerMinute: 5,
        },
      };

      RateLimitMiddleware.updateConfig(newConfig);
      const updatedConfig = RateLimitMiddleware.getConfig();

      expect(updatedConfig.ai.requestsPerMinute).toBe(5);
    });
  });
});