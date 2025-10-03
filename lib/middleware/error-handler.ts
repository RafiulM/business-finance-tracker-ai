import { NextRequest, NextResponse } from 'next/server';
import { logger } from './logging';

export interface AppError extends Error {
  statusCode?: number;
  code?: string;
  details?: Record<string, any>;
  isOperational?: boolean;
  userMessage?: string;
  context?: Record<string, any>;
}

export class ErrorHandlingService {
  private static instance: ErrorHandlingService;

  private constructor() {}

  static getInstance(): ErrorHandlingService {
    if (!ErrorHandlingService.instance) {
      ErrorHandlingService.instance = new ErrorHandlingService();
    }
    return ErrorHandlingService.instance;
  }

  /**
   * Create application error
   */
  static createError(
    message: string,
    options: {
      statusCode?: number;
      code?: string;
      details?: Record<string, any>;
      isOperational?: boolean;
      userMessage?: string;
      context?: Record<string, any>;
    } = {}
  ): AppError {
    const error = new Error(message) as AppError;
    error.statusCode = options.statusCode || 500;
    error.code = options.code;
    error.details = options.details;
    error.isOperational = options.isOperational ?? false;
    error.userMessage = options.userMessage;
    error.context = options.context;
    return error;
  }

  /**
   * Handle error and format response
   */
  static handleError(error: unknown, request?: NextRequest): NextResponse {
    // Log the error
    logger.error('Application error occurred', error instanceof Error ? error : new Error(String(error)));

    // Determine error type and format response
    if (error instanceof AppError) {
      return this.handleAppError(error, request);
    }

    if (error instanceof Error) {
      return this.handleSystemError(error, request);
    }

    // Unknown error type
    return this.handleUnknownError(error, request);
  }

  /**
   * Handle application-specific errors
   */
  private static handleAppError(error: AppError, request?: NextRequest): NextResponse {
    const { statusCode, code, details, isOperational, userMessage, context } = error;

    // Create error response
    const errorResponse = {
      error: {
        message: userMessage || this.getErrorMessage(statusCode),
        code: code || 'UNKNOWN_ERROR',
        ...(details && { details }),
        ...(isOperational && { operational: true }),
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          context,
          technicalMessage: error.message,
        }),
      },
    };

    // Set appropriate status code
    const response = NextResponse.json(errorResponse, { status });

    // Add CORS headers if needed
    this.addCorsHeaders(response);

    return response;
  }

  /**
   * Handle system errors
   */
  private static handleSystemError(error: Error, request?: NextRequest): NextResponse {
    // Determine if this is a known system error
    const statusCode = this.getSystemErrorStatusCode(error);

    const errorResponse = {
      error: {
        message: this.getErrorMessage(statusCode),
        code: 'SYSTEM_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          stack: error.stack,
          technicalMessage: error.message,
        }),
      },
    };

    const response = NextResponse.json(errorResponse, { status });
    this.addCorsHeaders(response);

    return response;
  }

  /**
   * Handle unknown errors
   */
  private static handleUnknownError(error: unknown, request?: NextRequest): NextResponse {
    const errorMessage = error instanceof Error ? error.message : String(error);

    logger.error('Unknown error type encountered', {
      error,
      errorType: typeof error,
      isArray: Array.isArray(error),
      isError: error instanceof Error,
    });

    const errorResponse = {
      error: {
        message: 'An unexpected error occurred',
        code: 'UNKNOWN_ERROR',
        ...(process.env.NODE_ENV === 'development' && {
          technicalMessage: errorMessage,
          errorData: error,
        }),
      },
    };

    const response = NextResponse.json(errorResponse, { status: 500 });
    this.addCorsHeaders(response);

    return response;
  }

  /**
   * Get user-friendly error message based on status code
   */
  private static getErrorMessage(statusCode: number): string {
    switch (statusCode) {
      case 400:
        return 'Bad request. Please check your input and try again.';
      case 401:
        return 'Authentication required. Please log in to continue.';
      case 403:
        return 'Access denied. You don\'t have permission to perform this action.';
      case 404:
        return 'The requested resource was not found.';
      case 405:
        return 'Method not allowed for this resource.';
      case 408:
        return 'Request timeout. Please try again.';
      case 409:
        return 'Conflict. The request could not be completed.';
      case 410:
        return 'Gone. The requested resource is no longer available.';
      case 422:
        return 'Unprocessable entity. Please check your input data.';
      case 429:
        return 'Too many requests. Please try again later.';
      case 500:
        return 'Internal server error. Something went wrong on our end.';
      case 502:
        return 'Service temporarily unavailable. Please try again later.';
      case 503:
        return 'Service unavailable. Please try again later.';
      case 504:
        return 'Gateway timeout. Please try again later.';
      default:
        return 'An error occurred. Please try again.';
    }
  }

  /**
   * Get appropriate status code for system errors
   */
  private static getSystemErrorStatusCode(error: Error): number {
    const message = error.message.toLowerCase();

    // Database errors
    if (message.includes('database') || message.includes('connection') || message.includes('timeout')) {
      return 503; // Service Unavailable
    }

    // Network errors
    if (message.includes('network') || message.includes('fetch') || message.includes('timeout')) {
      return 503; // Service Unavailable
    }

    // Validation errors
    if (message.includes('validation') || message.includes('invalid') || message.includes('required')) {
      return 400; // Bad Request
    }

    // Permission errors
    if (message.includes('permission') || message.includes('unauthorized') || message.includes('forbidden')) {
      return 403; // Forbidden
    }

    // Not found errors
    if (message.includes('not found') || message.includes('does not exist')) {
      return 404; // Not Found
    }

    // Rate limiting
    if (message.includes('rate limit') || message.includes('too many requests')) {
      return 429; // Too Many Requests
    }

    // Default to internal server error
    return 500;
  }

  /**
   * Add CORS headers to response
   */
  private static addCorsHeaders(response: NextResponse): void {
    response.headers.set('Access-Control-Allow-Origin', '*');
    response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
    response.headers.set('Access-Control-Allow-Headers', 'Content-Type, Authorization');
    response.headers.set('Access-Control-Max-Age', '86400');
  }

  /**
   * Create error handler middleware
   */
  static createErrorHandler() {
    return async (
      request: NextRequest,
      response: NextResponse,
      next: () => Promise<void>
    ) => {
      try {
        await next();
      } catch (error) {
        const errorResponse = this.handleError(error, request);
        return errorResponse;
      }
    };
  }

  /**
   * Wrap async function with error handling
   */
  static async withErrorHandling<T>(
    fn: () => Promise<T>,
    request?: NextRequest
  ): Promise<{ data: T; error?: never }> {
    try {
      const data = await fn();
      return { data };
    } catch (error) {
      // Let the middleware handle the error
      throw error;
    }
  }

  /**
   * Handle API route errors specifically
   */
  static handleRouteError(error: unknown, request: NextRequest): NextResponse {
    // Log the error with request context
    logger.request(request, { error: error instanceof Error ? error : new Error(String(error)) });

    return this.handleError(error, request);
  }

  /**
   * Create operational error (non-fatal)
   */
  static createOperationalError(
    message: string,
    options: {
      code?: string;
      details?: Record<string, any>;
      userMessage?: string;
    } = {}
  ): AppError {
    return this.createError(message, {
      ...options,
      isOperational: true,
      statusCode: 200, // Still return 200 for operational errors
    });
  }

  /**
   * Check if error is operational (non-fatal)
   */
  static isOperationalError(error: unknown): error is AppError {
    return error instanceof AppError && error.isOperational === true;
  }

  /**
   * Get user-friendly error message
   */
  static getUserFriendlyMessage(error: unknown): string {
    if (error instanceof AppError && error.userMessage) {
      return error.userMessage;
    }

    if (error instanceof Error) {
      return this.getErrorMessage(
        error.statusCode || this.getSystemErrorStatusCode(error)
      );
    }

    return 'An unexpected error occurred. Please try again.';
  }

  /**
   * Get technical error details (for debugging)
   */
  static getTechnicalDetails(error: unknown): any {
    if (error instanceof AppError) {
      return {
        message: error.message,
        stack: error.stack,
        code: error.code,
        details: error.details,
        context: error.context,
        statusCode: error.statusCode,
        isOperational: error.isOperational,
      };
    }

    if (error instanceof Error) {
      return {
        message: error.message,
        stack: error.stack,
        name: error.name,
      };
    }

    return {
      error: String(error),
      type: typeof error,
      isArray: Array.isArray(error),
    };
  }
}

// Export singleton instance
export const errorHandlingService = ErrorHandlingService.getInstance();

// Export convenience functions
export const createError = (message: string, options?: any) => ErrorHandlingService.createError(message, options);
export const createOperationalError = (message: string, options?: any) => ErrorHandlingService.createOperationalError(message, options);
export const withErrorHandling = <T>(fn: () => Promise<T>) => ErrorHandlingService.withErrorHandling(fn);
export const handleError = (error: unknown, request?: NextRequest) => ErrorHandlingService.handleError(error, request);