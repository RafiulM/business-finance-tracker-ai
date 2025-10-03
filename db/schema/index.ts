// Re-export all schema entities
export * from './auth';
export * from './categories';
export * from './transactions';
export * from './assets';
export * from './insights';
export * from './audit-log';

// Import all for drizzle schema export
import { user, session, account, verification } from './auth';
import { category } from './categories';
import { transaction } from './transactions';
import { asset } from './assets';
import { insight } from './insights';
import { auditLog } from './audit-log';

export const schema = {
    user,
    session,
    account,
    verification,
    category,
    transaction,
    asset,
    insight,
    auditLog,
};