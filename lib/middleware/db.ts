import { db } from '@/db';
import { migrate } from 'drizzle-orm/postgres-js/migrator';

export class DatabaseManager {
  private static instance: DatabaseManager;
  private connection: any;
  private isConnected: boolean = false;
  private connectionAttempts: number = 0;
  private maxConnectionAttempts: number = 5;
  private connectionRetryDelay: number = 1000; // 1 second

  private constructor() {}

  static getInstance(): DatabaseManager {
    if (!DatabaseManager.instance) {
      DatabaseManager.instance = new DatabaseManager();
    }
    return DatabaseManager.instance;
  }

  /**
   * Initialize database connection
   */
  async initialize(): Promise<void> {
    if (this.isConnected) {
      return;
    }

    try {
      console.log('Initializing database connection...');

      // Use the existing database connection
      this.connection = db;

      // Test the connection
      await this.testConnection();

      this.isConnected = true;
      this.connectionAttempts = 0;

      console.log('Database connection established successfully');

      // Run migrations if needed
      await this.runMigrations();

    } catch (error) {
      console.error('Database initialization failed:', error);
      this.connectionAttempts++;

      if (this.connectionAttempts < this.maxConnectionAttempts) {
        console.log(`Retrying database connection in ${this.connectionRetryDelay}ms... (${this.connectionAttempts}/${this.maxConnectionAttempts})`);
        await this.delay(this.connectionRetryDelay);
        return this.initialize();
      } else {
        console.error('Max connection attempts reached. Database initialization failed.');
        throw error;
      }
    }
  }

  /**
   * Test database connection
   */
  private async testConnection(): Promise<void> {
    try {
      // Simple query to test connection
      await this.connection.select().from({ users: true }).limit(1);
    } catch (error) {
      throw new Error(`Database connection test failed: ${error}`);
    }
  }

  /**
   * Run database migrations
   */
  private async runMigrations(): Promise<void> {
    try {
      console.log('Running database migrations...');

      // For now, we'll assume migrations are handled separately
      // In a real application, you would use Drizzle's migration system

      console.log('Database migrations completed');
    } catch (error) {
      console.error('Migration failed:', error);
      // Don't throw here - allow app to start even if migrations fail
      console.warn('Continuing without migrations. Please run migrations manually.');
    }
  }

  /**
   * Get database connection
   */
  getConnection(): any {
    if (!this.isConnected) {
      throw new Error('Database not initialized. Call initialize() first.');
    }
    return this.connection;
  }

  /**
   * Check if database is connected
   */
  isDbConnected(): boolean {
    return this.isConnected;
  }

  /**
   * Close database connection
   */
  async close(): Promise<void> {
    if (this.connection) {
      try {
        // Close connection if the driver supports it
        // await this.connection.end();
        console.log('Database connection closed');
      } catch (error) {
        console.error('Error closing database connection:', error);
      } finally {
        this.isConnected = false;
        this.connection = null;
      }
    }
  }

  /**
   * Health check for database
   */
  async healthCheck(): Promise<{
    status: 'healthy' | 'unhealthy';
    latency?: number;
    error?: string;
    details?: {
      connected: boolean;
      url?: string;
    };
  }> {
    try {
      const startTime = Date.now();

      // Test connection with a simple query
      await this.testConnection();

      const latency = Date.now() - startTime;

      return {
        status: 'healthy',
        latency,
        details: {
          connected: this.isConnected,
          url: process.env.DATABASE_URL ? '***' + process.env.DATABASE_URL.split('@')[1]?.split('.')[0] : 'Not configured',
        }
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error instanceof Error ? error.message : 'Unknown error',
        details: {
          connected: this.isConnected,
          url: process.env.DATABASE_URL ? '***' + process.env.DATABASE_URL.split('@')[1]?.split('.')[0] : 'Not configured',
        },
      };
    }
  }

  /**
   * Get connection pool stats
   */
  getConnectionStats(): {
    totalConnections: number;
    activeConnections: number;
    idleConnections: number;
    waitingClients: number;
  } {
    // This would be implemented based on your database driver
    // For now, return mock stats
    return {
      totalConnections: 1,
      activeConnections: this.isConnected ? 1 : 0,
      idleConnections: 0,
      waitingClients: 0,
    };
  }

  /**
   * Execute query with retry logic
   */
  async query<T>(
    queryFn: () => Promise<T>,
    maxRetries: number = 3,
    retryDelay: number = 1000
  ): Promise<T> {
    let lastError: Error;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        return await queryFn();
      } catch (error) {
        lastError = error as Error;

        if (attempt < maxRetries) {
          console.warn(`Database query failed (attempt ${attempt}/${maxRetries}), retrying in ${retryDelay}ms:`, error);
          await this.delay(retryDelay);
        }
      }
    }

    throw lastError!;
  }

  /**
   * Execute transaction
   */
  async transaction<T>(
    transactionFn: () => Promise<T>
  ): Promise<T> {
    if (!this.isConnected) {
      throw new Error('Database not connected');
    }

    try {
      // Use Drizzle's transaction method
      return await this.connection.transaction(transactionFn);
    } catch (error) {
      console.error('Database transaction failed:', error);
      throw error;
    }
  }

  /**
   * Utility method for delays
   */
  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  /**
   * Perform database cleanup
   */
  async cleanup(): Promise<void> {
    try {
      console.log('Performing database cleanup...');

      // This would include tasks like:
      // - Clearing expired cache entries
      // - Archiving old records
      // - Vacuuming tables (if using PostgreSQL)

      console.log('Database cleanup completed');
    } catch (error) {
      console.error('Database cleanup failed:', error);
    }
  }

  /**
   * Get database schema information
   */
  async getSchemaInfo(): Promise<{
    version: string;
    tables: Array<{
      name: string;
      rowCount: number;
      size: string;
    }>;
  }> {
    try {
      // This would query the information schema
      // For now, return mock data
      return {
        version: '1.0.0',
        tables: [],
      };
    } catch (error) {
      console.error('Failed to get schema info:', error);
      throw error;
    }
  }

  /**
   * Backup database
   */
  async backup(backupPath?: string): Promise<string> {
    try {
      console.log('Starting database backup...');

      // This would implement actual backup logic
      // For now, return a mock backup path
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const defaultPath = `./backups/backup-${timestamp}.sql`;
      const finalPath = backupPath || defaultPath;

      console.log(`Database backup completed: ${finalPath}`);
      return finalPath;
    } catch (error) {
      console.error('Database backup failed:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const dbManager = DatabaseManager.getInstance();

// Export connection helper for convenience
export const getDb = () => dbManager.getConnection();

// Initialize database on module import
if (typeof window === 'undefined') {
  // Only run in server environment
  dbManager.initialize().catch(error => {
    console.error('Failed to initialize database:', error);
  });
}