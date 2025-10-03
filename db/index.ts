import { drizzle } from 'drizzle-orm/node-postgres';
import * as schema from './schema';

// Get database URL from environment variables
const databaseUrl = process.env.DATABASE_URL ||
  'postgresql://postgres:postgres@localhost:5433/finance_tracker_db';

export const db = drizzle(databaseUrl, { schema });

// Export all schema entities
export * from './schema/auth';
export * from './schema/categories';
export * from './schema/transactions';
export * from './schema/assets';
export * from './schema/insights';
export * from './schema/audit-log';
export { schema };

// Database types
export type Database = typeof db;