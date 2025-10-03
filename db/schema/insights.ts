import { pgTable, text, timestamp, integer, jsonb, boolean } from "drizzle-orm/pg-core";
import { createId } from "../utils/ids";
import { user } from "./auth";

export const insight = pgTable("insight", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    type: text("type").notNull().$type<"spending_trend" | "anomaly_detection" | "cash_flow_analysis" | "category_insight" | "recommendation" | "budget_alert">(),
    title: text("title").notNull(),
    description: text("description").notNull(),
    confidence: integer("confidence").notNull(), // AI confidence score (0-100)
    impact: text("impact").notNull().$type<"high" | "medium" | "low">(),
    category: text("category"), // Related business category
    timePeriod: jsonb("timePeriod").$type<{
        startDate: Date;
        endDate: Date;
    }>(),
    data: jsonb("data").$type<{
        metrics: object;
        trends: object[];
        comparisons: object;
        visualizations: object;
    }>(),
    actions: jsonb("actions").$type<Array<{
        id: string;
        description: string;
        type: "categorize" | "review" | "investigate" | "adjust_budget" | "export_report";
        targetId?: string;
        targetType?: string;
        completed: boolean;
    }>>().$defaultFn(() => []),
    isRead: boolean("is_read").default(false).notNull(),
    isArchived: boolean("is_archived").default(false).notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
});

export type InsightType = "spending_trend" | "anomaly_detection" | "cash_flow_analysis" | "category_insight" | "recommendation" | "budget_alert";
export type InsightImpact = "high" | "medium" | "low";
export type ActionType = "categorize" | "review" | "investigate" | "adjust_budget" | "export_report";

// Insight relationships
export const insightRelations = {
    user: {
        fields: [insight.userId],
        references: [user.id],
    },
};