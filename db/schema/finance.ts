import {
  pgTable,
  uuid,
  text,
  decimal,
  date,
  timestamp,
  boolean,
  index
} from "drizzle-orm/pg-core";
import { user } from "./auth";

// Accounts table to represent different financial sources (e.g., checking, credit card)
export const accounts = pgTable("accounts", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type").notNull(), // e.g., 'Bank Account', 'Credit Card', 'Cash'
  balance: decimal("balance", { precision: 15, scale: 2 }).notNull().default("0.00"),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("accounts_user_id_idx").on(table.userId),
}));

// Transactions table for all income and expenses
export const transactions = pgTable("transactions", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  accountId: uuid("account_id").notNull().references(() => accounts.id, { onDelete: "cascade" }),
  type: text("type").notNull(), // 'income' or 'expense'
  amount: decimal("amount", { precision: 15, scale: 2 }).notNull(),
  description: text("description"),
  category: text("category").default("Uncategorized"),
  transactionDate: date("transaction_date").notNull().defaultNow(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("transactions_user_id_idx").on(table.userId),
  accountIdIdx: index("transactions_account_id_idx").on(table.accountId),
  transactionDateIdx: index("transactions_transaction_date_idx").on(table.transactionDate),
}));

// Assets table for tracking business assets and investments
export const assets = pgTable("assets", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  type: text("type"), // e.g., 'Equipment', 'Property', 'Investment'
  initialValue: decimal("initial_value", { precision: 15, scale: 2 }).notNull(),
  currentValue: decimal("current_value", { precision: 15, scale: 2 }),
  acquisitionDate: date("acquisition_date").notNull(),
  createdAt: timestamp("created_at").defaultNow().notNull(),
}, (table) => ({
  userIdIdx: index("assets_user_id_idx").on(table.userId),
}));

// AI Insights table to store generated tips and observations
export const insights = pgTable("insights", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: text("user_id").notNull().references(() => user.id, { onDelete: "cascade" }),
  content: text("content").notNull(),
  generatedAt: timestamp("generated_at").defaultNow().notNull(),
  isRead: boolean("is_read").default(false).notNull(),
}, (table) => ({
  userIdIdx: index("insights_user_id_idx").on(table.userId),
}));

// Types for TypeScript
export type Account = typeof accounts.$inferSelect;
export type NewAccount = typeof accounts.$inferInsert;

export type Transaction = typeof transactions.$inferSelect;
export type NewTransaction = typeof transactions.$inferInsert;

export type Asset = typeof assets.$inferSelect;
export type NewAsset = typeof assets.$inferInsert;

export type Insight = typeof insights.$inferSelect;
export type NewInsight = typeof insights.$inferInsert;