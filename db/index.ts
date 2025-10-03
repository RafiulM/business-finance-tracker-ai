import 'dotenv/config';
import { drizzle } from 'drizzle-orm/node-postgres';
import * as authSchema from './schema/auth';
import * as financeSchema from './schema/finance';

export const db = drizzle(process.env.DATABASE_URL!, {
  schema: { ...authSchema, ...financeSchema }
});

// Export schemas for easy access
export * from './schema/auth';
export * from './schema/finance';