import { pgTable, text, timestamp, integer, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils/ids";
import { user } from "./auth";

export const asset = pgTable("asset", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: text("type").notNull().$type<"equipment" | "property" | "vehicle" | "intangible" | "financial" | "other">(),
    purchaseDate: timestamp("purchase_date", { withTimezone: true }),
    purchaseValue: integer("purchase_value").notNull(), // In cents
    currentValue: integer("current_value").notNull(), // In cents
    currency: text("currency").default("USD").notNull(),
    depreciationMethod: text("depreciation_method").$type<"straight_line" | "declining_balance" | "sum_of_years">(),
    usefulLifeYears: integer("useful_life_years"),
    metadata: jsonb("metadata").$type<{
        serialNumber?: string;
        location?: string;
        condition: string;
        warrantyExpiry?: Date;
        maintenanceSchedule?: object;
        photos: string[];
    }>().$defaultFn(() => ({
        condition: "good",
        photos: [],
    })),
    createdAt: timestamp("created_at")
        .$defaultFn(() => new Date())
        .notNull(),
    updatedAt: timestamp("updated_at")
        .$defaultFn(() => new Date())
        .notNull(),
    deletedAt: timestamp("deleted_at"),
});

export type AssetType = "equipment" | "property" | "vehicle" | "intangible" | "financial" | "other";
export type DepreciationMethod = "straight_line" | "declining_balance" | "sum_of_years";

// Asset relationships
export const assetRelations = {
    user: {
        fields: [asset.userId],
        references: [user.id],
    },
};