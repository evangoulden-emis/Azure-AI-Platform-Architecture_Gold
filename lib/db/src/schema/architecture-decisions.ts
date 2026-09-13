import { createInsertSchema } from "drizzle-zod";
import { pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

export const architectureDecisionsTable = pgTable("architecture_decisions", {
  id: text("id").primaryKey(),
  title: text("title").notNull(),
  area: text("area").notNull(),
  recommendation: text("recommendation").notNull(),
  rationale: text("rationale").notNull(),
  status: text("status").notNull(),
  owner: text("owner").notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const insertArchitectureDecisionSchema = createInsertSchema(
  architectureDecisionsTable,
);

export type InsertArchitectureDecision = z.infer<
  typeof insertArchitectureDecisionSchema
>;
export type ArchitectureDecision =
  typeof architectureDecisionsTable.$inferSelect;