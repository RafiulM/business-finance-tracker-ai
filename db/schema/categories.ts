import { pgTable, text, timestamp, boolean, integer } from "drizzle-orm/pg-core";
import { createId } from "../utils/ids";
import { user } from "./auth";

export const category = pgTable("category", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    parentId: text("parent_id").references(() => category.id, { onDelete: "set null" }),
    type: text("type").notNull().$type<"expense" | "income" | "asset">(),
    color: text("color").default("#6B7280").notNull(),
    icon: text("icon"),
    isActive: boolean("is_active").default(true).notNull(),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
    deletedAt: timestamp("deleted_at"),
});

export type CategoryType = "expense" | "income" | "asset";

// Default categories for new users
export const DEFAULT_CATEGORIES = {
    expense: [
        { name: "Office Supplies", color: "#3B82F6", icon: "package" },
        { name: "Software & Subscriptions", color: "#10B981", icon: "monitor" },
        { name: "Marketing & Advertising", color: "#F59E0B", icon: "megaphone" },
        { name: "Professional Services", color: "#8B5CF6", icon: "briefcase" },
        { name: "Travel & Meals", color: "#EF4444", icon: "plane" },
        { name: "Insurance", color: "#EC4899", icon: "shield" },
        { name: "Rent & Utilities", color: "#14B8A6", icon: "home" },
        { name: "Taxes & Licenses", color: "#F97316", icon: "file-text" },
        { name: "Bank Fees", color: "#6B7280", icon: "credit-card" },
        { name: "Other Expenses", color: "#84CC16", icon: "more-horizontal" },
    ],
    income: [
        { name: "Sales Revenue", color: "#22C55E", icon: "trending-up" },
        { name: "Service Revenue", color: "#06B6D4", icon: "wrench" },
        { name: "Consulting Fees", color: "#A855F7", icon: "user-check" },
        { name: "Interest Income", color: "#0EA5E9", icon: "percent" },
        { name: "Other Income", color: "#65A30D", icon: "plus-circle" },
    ],
    asset: [
        { name: "Equipment", color: "#DC2626", icon: "settings" },
        { name: "Vehicles", color: "#7C3AED", icon: "car" },
        { name: "Property", color: "#0891B2", icon: "building" },
        { name: "Intangible Assets", color: "#B91C1C", icon: "zap" },
        { name: "Financial Assets", color: "#0F766E", icon: "dollar-sign" },
        { name: "Other Assets", color: "#A16207", icon: "package-2" },
    ],
} as const;