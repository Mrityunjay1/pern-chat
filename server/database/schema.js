import { pgTable, serial, timestamp, uuid, varchar } from "drizzle-orm/pg-core";

export const userSchema = pgTable("users", {
  id: uuid("id").primaryKey(),
  username: varchar("username", { length: 255 }).notNull().unique(),
  password: varchar("password", { length: 255 }).notNull(),
  createdAt: timestamp("created_at", { mode: "string" }).notNull().defaultNow(),
});

export const messageSchema = pgTable("messages", {
  id: uuid("id").primaryKey(),
  text: varchar("text", { length: 500 }).notNull(),
  filePath: varchar("filePath"),
  sender: uuid("sender").references(() => userSchema.id),
  recipient: uuid("recipient").references(() => userSchema.id),
  createdAt: timestamp("created_at").defaultNow().notNull(),
  updatedAt: timestamp("updated_at").defaultNow().notNull(),
});
