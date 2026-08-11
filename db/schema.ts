import { sql } from "drizzle-orm";
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core";

export const applications = sqliteTable("applications", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  whatsapp: text("whatsapp").notNull(),
  age: integer("age").notNull(),
  city: text("city").notNull(),
  profession: text("profession").notNull(),
  classLevel: text("class_level").notNull(),
  referrer: text("referrer").notNull(),
  answersJson: text("answers_json").notNull(),
  status: text("status").notNull().default("pending"),
  inviteToken: text("invite_token").unique(),
  emailStatus: text("email_status").notNull().default("pending"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});

export const memberRegistrations = sqliteTable("member_registrations", {
  id: text("id").primaryKey(),
  applicationId: text("application_id").notNull().unique(),
  name: text("name").notNull(),
  email: text("email").notNull(),
  phone: text("phone").notNull(),
  cpfLast4: text("cpf_last4").notNull(),
  asaasCheckoutId: text("asaas_checkout_id"),
  status: text("status").notNull().default("pending_configuration"),
  createdAt: text("created_at").notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: text("updated_at").notNull().default(sql`CURRENT_TIMESTAMP`),
});
