import { pgTable, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createId } from "../utils/ids";
import { user } from "./auth";
import { category } from "./categories";

export const transaction = pgTable("transaction", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    categoryId: text("category_id")
        .notNull()
        .references(() => category.id, { onDelete: "restrict" }),
    amount: integer("amount").notNull(), // Amount in cents
    currency: text("currency").default("USD").notNull(),
    originalCurrency: text("original_currency"),
    exchangeRate: integer("exchange_rate"), // Exchange rate multiplied by 10000 for precision
    description: text("description").notNull(),
    processedDescription: text("processed_description").notNull(),
    date: timestamp("date", { withTimezone: true }).notNull(),
    type: text("type").notNull().$type<"expense" | "income" | "asset_purchase" | "asset_sale">(),
    confidence: integer("confidence").default(100).notNull(), // AI categorization confidence (0-100)
    needsReview: boolean("needs_review").default(false).notNull(),
    metadata: jsonb("metadata").$type<{
        vendor?: string;
        location?: string;
        tags: string[];
        aiProcessed: boolean;
        manualOverride: boolean;
        source?: string;
        receiptUrl?: string;
        notes?: string;
    }>().$defaultFn(() => ({
        tags: [],
        aiProcessed: false,
        manualOverride: false,
    })),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
    deletedAt: timestamp("deleted_at"),
});

export type TransactionType = "expense" | "income" | "asset_purchase" | "asset_sale";

// Transaction relationships
export const transactionRelations = {
    user: {
        fields: [transaction.userId],
        references: [user.id],
    },
    category: {
        fields: [transaction.categoryId],
        references: [category.id],
    },
};