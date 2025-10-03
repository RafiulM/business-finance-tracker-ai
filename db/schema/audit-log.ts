import { pgTable, text, timestamp, jsonb } from "drizzle-orm/pg-core";
import { createId } from "../utils/ids";
import { user } from "./auth";

export const auditLog = pgTable("audit_log", {
    id: text("id").$defaultFn(() => createId()).primaryKey(),
    userId: text("user_id")
        .notNull()
        .references(() => user.id, { onDelete: "cascade" }),
    entityType: text("entity_type").notNull(), // Type of entity affected
    entityId: text("entity_id").notNull(), // ID of affected entity
    action: text("action").notNull().$type<"create" | "update" | "delete" | "view" | "export" | "login" | "logout">(),
    oldValue: jsonb("old_value"), // Previous state (for updates)
    newValue: jsonb("new_value"), // New state
    reason: text("reason"), // User-provided reason
    ipAddress: text("ip_address"),
    userAgent: text("user_agent"),
    timestamp: timestamp("timestamp", { withTimezone: true })
        .$defaultFn(() => new Date())
        .notNull(),
});

export type AuditAction = "create" | "update" | "delete" | "view" | "export" | "login" | "logout";

// Audit log relationships
export const auditLogRelations = {
    user: {
        fields: [auditLog.userId],
        references: [user.id],
    },
};