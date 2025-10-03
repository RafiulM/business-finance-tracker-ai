import { NextRequest } from 'next/server';

export interface LogEntry {
  timestamp: Date;
  level: 'info' | 'warn' | 'error' | 'debug';
  message: string;
  data?: Record<string, any>;
  requestId?: string;
  userId?: string;
  ipAddress?: string;
  userAgent?: string;
  method?: string;
  url?: string;
  statusCode?: number;
  duration?: number;
  error?: {
    name: string;
    message: string;
    stack?: string;
  };
}

export class LoggingService {
  private static instance: LoggingService;
  private logs: LogEntry[] = [];
  private maxLogs: number = 10000;
  private logBuffer: LogEntry[] = [];
  private isDevelopment: boolean;

  private constructor() {
    this.isDevelopment = process.env.NODE_ENV === 'development';
  }

  static getInstance(): LoggingService {
    if (!LoggingService.instance) {
      LoggingService.instance = new LoggingService();
    }
    return LoggingService.instance;
  }

  /**
   * Add log entry
   */
  log(entry: Omit<LogEntry, 'timestamp'>): void {
    const logEntry: LogEntry = {
      timestamp: new Date(),
      ...entry,
    };

    // Add to buffer
    this.logBuffer.push(logEntry);

    // Process buffer
    this.processBuffer();

    // Keep memory usage manageable
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(-this.maxLogs);
    }
  }

  /**
   * Process log buffer
   */
  private processBuffer(): void {
    // Get all logs from buffer
    const logsToProcess = [...this.logBuffer];
    this.logBuffer = [];

    logsToProcess.forEach(log => {
      this.logs.push(log);

      // Log to console in development
      if (this.isDevelopment) {
        this.logToConsole(log);
      }

      // Log to external service in production
      if (!this.isDevelopment) {
        this.logToService(log);
      }
    });
  }

  /**
   * Log to console
   */
  private logToConsole(log: LogEntry): void {
    const timestamp = log.timestamp.toISOString();
    const message = `${timestamp} [${log.level.toUpperCase()}] ${log.message}`;

    switch (log.level) {
      case 'debug':
        console.debug(message, log.data);
        break;
      case 'info':
        console.info(message, log.data);
        break;
      case 'warn':
        console.warn(message, log.data);
        break;
      case 'error':
        console.error(message, log.data, log.error?.stack);
        break;
    }
  }

  /**
   * Log to external service
   */
  private async logToService(log: LogEntry): Promise<void> {
    try {
      // In a real implementation, you would send logs to a service like:
      // - Sentry for errors
      // - LogDNA for structured logs
      // - ELK stack
      // - CloudWatch Logs
      // For now, just log to console
      console.log('External logging:', {
        level: log.level,
        message: log.message,
        data: log.data,
      });
    } catch (error) {
      console.error('Failed to log to external service:', error);
    }
  }

  /**
   * Convenience methods for different log levels
   */
  info(message: string, data?: Record<string, any>): void {
    this.log({ level: 'info', message, data });
  }

  warn(message: string, data?: Record<string, any>): void {
    this.log({ level: 'warn', message, data });
  }

  error(message: string, error?: Error, data?: Record<string, any>): void {
    this.log({
      level: 'error',
      message,
      data,
      error: error ? {
        name: error.name,
        message: error.message,
        stack: error.stack,
      } : undefined,
    });
  }

  debug(message: string, data?: Record<string, any>): void {
    this.log({ level: 'debug', message, data });
  }

  /**
   * Log HTTP request
   */
  logRequest(
    request: NextRequest,
    options: {
      statusCode?: number;
      duration?: number;
      userId?: string;
      error?: Error;
    } = {}
  ): void {
    const { method, url } = request;

    this.log({
      level: options.error ? 'error' : 'info',
      message: `${method} ${url} ${options.statusCode ? `(${options.statusCode})` : ''}`,
      method,
      url,
      statusCode: options.statusCode,
      duration: options.duration,
      userId: options.userId,
      ipAddress: request.ip,
      userAgent: request.headers.get('user-agent'),
      data: options.error ? {
        error: options.error.message,
        stack: options.error.stack,
      } : undefined,
    });
  }

  /**
   * Get recent logs
   */
  getRecentLogs(limit: number = 100): LogEntry[] {
    return this.logs.slice(-limit);
  }

  /**
   * Get logs by level
   */
  getLogsByLevel(level: LogEntry['level'], limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.level === level)
      .slice(-limit);
  }

  /**
   * Get logs by user
   */
  getLogsByUser(userId: string, limit: number = 100): LogEntry[] {
    return this.logs
      .filter(log => log.userId === userId)
      .slice(-limit);
  }

  /**
   * Get logs by time range
   */
  getLogsByTimeRange(
    startTime: Date,
    endTime: Date,
    limit: number = 100
  ): LogEntry[] {
    return this.logs
      .filter(log => log.timestamp >= startTime && log.timestamp <= endTime)
      .slice(-limit);
  }

  /**
   * Search logs
   */
  searchLogs(query: string, limit: number = 100): LogEntry[] {
    const lowerQuery = query.toLowerCase();
    return this.logs
      .filter(log =>
        log.message.toLowerCase().includes(lowerQuery) ||
        JSON.stringify(log.data || {}).toLowerCase().includes(lowerQuery)
      )
      .slice(-limit);
  }

  /**
   * Clear logs
   */
  clearLogs(): void {
    this.logs = [];
    this.logBuffer = [];
  }

  /**
   * Get log statistics
   */
  getStatistics(): {
    totalLogs: number;
    logsByLevel: Record<LogEntry['level'], number>;
    errorCount: number;
    warnCount: number;
    averageLevel: string;
  } {
    const logsByLevel: Record<LogEntry['level'], number> = {
      info: 0,
      warn: 0,
      error: 0,
      debug: 0,
    };

    this.logs.forEach(log => {
      logsByLevel[log.level]++;
    });

    const totalLogs = this.logs.length;
    const errorCount = logsByLevel.error;
    const warnCount = logsByLevel.warn;

    // Calculate average level (simple heuristic)
    let averageLevel = 'info';
    if (errorCount > totalLogs * 0.1) {
      averageLevel = 'error';
    } else if (warnCount > totalLogs * 0.2) {
      averageLevel = 'warn';
    }

    return {
      totalLogs,
      logsByLevel,
      errorCount,
      warnCount,
      averageLevel,
    };
  }

  /**
   * Export logs to JSON
   */
  exportLogs(format: 'json' | 'csv' = 'json'): string {
    if (format === 'json') {
      return JSON.stringify(this.logs, null, 2);
    }

    if (format === 'csv') {
      // Create CSV format
      const headers = [
        'timestamp',
        'level',
        'message',
        'userId',
        'ipAddress',
        'method',
        'url',
        'statusCode',
        'duration',
      ];

      const csvRows = this.logs.map(log => [
        log.timestamp.toISOString(),
        log.level,
        log.message,
        log.userId || '',
        log.ipAddress || '',
        log.method || '',
        log.url || '',
        log.statusCode?.toString() || '',
        log.duration?.toString() || '',
      ]);

      return [headers.join(','), ...csvRows.map(row => row.join(','))].join('\n');
    }

    return '';
  }

  /**
   * Archive old logs
   */
  archiveLogs(olderThanDays: number = 30): number {
    const cutoffDate = new Date(Date.now() - olderThanDays * 24 * 60 * 60 * 1000);
    const initialCount = this.logs.length;

    this.logs = this.logs.filter(log => log.timestamp > cutoffDate);
    this.logBuffer = this.logBuffer.filter(log => log.timestamp > cutoffDate);

    const archivedCount = initialCount - this.logs.length;
    if (archivedCount > 0) {
      this.info(`Archived ${archivedCount} old log entries`);
    }

    return archivedCount;
  }
}

// Export singleton instance
export const loggingService = LoggingService.getInstance();

// Create logger instance for convenience
export const logger = {
  info: (message: string, data?: Record<string, any>) => loggingService.info(message, data),
  warn: (message: string, data?: Record<string, any>) => loggingService.warn(message, data),
  error: (message: string, error?: Error, data?: Record<string, any>) => loggingService.error(message, error, data),
  debug: (message: string, data?: Record<string, any>) => loggingService.debug(message, data),
  request: (request: NextRequest, options?: any) => loggingService.logRequest(request, options),
};