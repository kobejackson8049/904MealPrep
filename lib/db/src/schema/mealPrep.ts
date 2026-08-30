import { createInsertSchema } from "drizzle-zod";
import { boolean, date, integer, numeric, pgTable, text, timestamp } from "drizzle-orm/pg-core";
import { z } from "zod/v4";

const timestamps = {
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
};

export const adminUsersTable = pgTable("meal_prep_admin_users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  displayName: text("display_name").notNull(),
  role: text("role").notNull().default("owner"),
  ...timestamps,
});

export const customersTable = pgTable("meal_prep_customers", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  email: text("email").notNull().unique(),
  phone: text("phone").notNull(),
  address: text("address").notNull().default(""),
  ...timestamps,
});

export const weeklyMenusTable = pgTable("meal_prep_weekly_menus", {
  id: text("id").primaryKey(),
  weekLabel: text("week_label").notNull(),
  orderDeadline: timestamp("order_deadline", { withTimezone: true }).notNull(),
  deadlineLabel: text("deadline_label").notNull(),
  announcement: text("announcement").notNull().default(""),
  pickupWindows: text("pickup_windows").array().notNull().default([]),
  status: text("status").notNull().default("draft"),
  publishedAt: timestamp("published_at", { withTimezone: true }),
  ...timestamps,
});

export const mealsTable = pgTable("meal_prep_meals", {
  id: text("id").primaryKey(),
  menuId: text("menu_id").notNull().references(() => weeklyMenusTable.id, { onDelete: "cascade" }),
  mealNumber: integer("meal_number").notNull(),
  name: text("name").notNull(),
  description: text("description").notNull(),
  category: text("category").notNull(),
  price: numeric("price", { precision: 10, scale: 2 }).notNull(),
  premiumCharge: numeric("premium_charge", { precision: 10, scale: 2 }).notNull().default("0"),
  calories: integer("calories").notNull(),
  protein: integer("protein").notNull(),
  carbs: integer("carbs").notNull(),
  image: text("image").notNull().default(""),
  available: boolean("available").notNull().default(true),
  soldOut: boolean("sold_out").notNull().default(false),
  archived: boolean("archived").notNull().default(false),
  ...timestamps,
});

export const ordersTable = pgTable("meal_prep_orders", {
  id: text("id").primaryKey(),
  orderNumber: text("order_number").notNull().unique(),
  customerId: text("customer_id").notNull().references(() => customersTable.id),
  customerName: text("customer_name").notNull(),
  customerEmail: text("customer_email").notNull(),
  customerPhone: text("customer_phone").notNull(),
  menuId: text("menu_id").notNull().references(() => weeklyMenusTable.id),
  fulfillment: text("fulfillment").notNull(),
  pickupWindow: text("pickup_window").notNull().default(""),
  deliveryZone: text("delivery_zone").notNull().default(""),
  deliveryAddress: text("delivery_address").notNull().default(""),
  notes: text("notes").notNull().default(""),
  mealSubtotal: numeric("meal_subtotal", { precision: 10, scale: 2 }).notNull(),
  premiumCharges: numeric("premium_charges", { precision: 10, scale: 2 }).notNull().default("0"),
  deliveryFee: numeric("delivery_fee", { precision: 10, scale: 2 }).notNull().default("0"),
  total: numeric("total", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull().default("square"),
  paymentStatus: text("payment_status").notNull().default("unpaid"),
  expectedSenderName: text("expected_sender_name").notNull().default(""),
  paymentSubmittedAt: timestamp("payment_submitted_at", { withTimezone: true }),
  paymentConfirmedAt: timestamp("payment_confirmed_at", { withTimezone: true }),
  paymentConfirmedBy: text("payment_confirmed_by").notNull().default(""),
  status: text("status").notNull().default("new"),
  squareCheckoutId: text("square_checkout_id"),
  ...timestamps,
});

export const orderItemsTable = pgTable("meal_prep_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  mealId: text("meal_id").notNull().references(() => mealsTable.id),
  mealNameSnapshot: text("meal_name_snapshot").notNull().default(""),
  mealNumberSnapshot: integer("meal_number_snapshot").notNull().default(0),
  categorySnapshot: text("category_snapshot").notNull().default(""),
  unitPriceSnapshot: numeric("unit_price_snapshot", { precision: 10, scale: 2 }).notNull().default("0"),
  premiumChargeSnapshot: numeric("premium_charge_snapshot", { precision: 10, scale: 2 }).notNull().default("0"),
  quantity: integer("quantity").notNull(),
  ...timestamps,
});

export const deliveryZonesTable = pgTable("meal_prep_delivery_zones", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  fee: numeric("fee", { precision: 10, scale: 2 }).notNull(),
  active: boolean("active").notNull().default(true),
  ...timestamps,
});

export const businessSettingsTable = pgTable("meal_prep_business_settings", {
  id: text("id").primaryKey(),
  businessName: text("business_name").notNull().default("904 Meal Prepz"),
  phone: text("phone").notNull().default(""),
  email: text("email").notNull().default(""),
  instagram: text("instagram").notNull().default(""),
  pickupInformation: text("pickup_information").notNull().default(""),
  announcement: text("announcement").notNull().default(""),
  standardPrice: numeric("standard_price", { precision: 10, scale: 2 }).notNull().default("8"),
  premiumCharge: numeric("premium_charge", { precision: 10, scale: 2 }).notNull().default("2"),
  showDemoLabel: boolean("show_demo_label").notNull().default(false),
  cashAppHandle: text("cash_app_handle").notNull().default(""),
  venmoHandle: text("venmo_handle").notNull().default(""),
  zelleContact: text("zelle_contact").notNull().default(""),
  cashAppQrPath: text("cash_app_qr_path").notNull().default(""),
  venmoQrPath: text("venmo_qr_path").notNull().default(""),
  zelleQrPath: text("zelle_qr_path").notNull().default(""),
  cashAppEnabled: boolean("cash_app_enabled").notNull().default(true),
  venmoEnabled: boolean("venmo_enabled").notNull().default(true),
  zelleEnabled: boolean("zelle_enabled").notNull().default(true),
  ...timestamps,
});

export const paymentConfirmationsTable = pgTable("meal_prep_payment_confirmations", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  paymentMethod: text("payment_method").notNull(),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  expectedSenderName: text("expected_sender_name").notNull().default(""),
  submittedAt: timestamp("submitted_at", { withTimezone: true }).notNull(),
  confirmedAt: timestamp("confirmed_at", { withTimezone: true }),
  confirmedBy: text("confirmed_by").notNull().default(""),
  ...timestamps,
});

export const adminNotificationsTable = pgTable("meal_prep_admin_notifications", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  type: text("type").notNull(),
  title: text("title").notNull(),
  message: text("message").notNull(),
  readAt: timestamp("read_at", { withTimezone: true }),
  ...timestamps,
});

export const emailEventsTable = pgTable("meal_prep_email_events", {
  id: text("id").primaryKey(),
  orderId: text("order_id").references(() => ordersTable.id, { onDelete: "cascade" }),
  eventType: text("event_type").notNull(),
  recipient: text("recipient").notNull(),
  subject: text("subject").notNull(),
  body: text("body").notNull(),
  status: text("status").notNull().default("queued"),
  providerMode: text("provider_mode").notNull().default("demo"),
  deliveredAt: timestamp("delivered_at", { withTimezone: true }),
  lastError: text("last_error").notNull().default(""),
  ...timestamps,
});

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({ createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customersTable).omit({ createdAt: true, updatedAt: true });
export const insertWeeklyMenuSchema = createInsertSchema(weeklyMenusTable).omit({ createdAt: true, updatedAt: true });
export const insertMealSchema = createInsertSchema(mealsTable).omit({ createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ createdAt: true, updatedAt: true });
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZonesTable).omit({ createdAt: true, updatedAt: true });
export const insertBusinessSettingsSchema = createInsertSchema(businessSettingsTable).omit({ createdAt: true, updatedAt: true });
export const insertPaymentConfirmationSchema = createInsertSchema(paymentConfirmationsTable).omit({ createdAt: true, updatedAt: true });
export const insertAdminNotificationSchema = createInsertSchema(adminNotificationsTable).omit({ createdAt: true, updatedAt: true });
export const insertEmailEventSchema = createInsertSchema(emailEventsTable).omit({ createdAt: true, updatedAt: true });

export type AdminUser = typeof adminUsersTable.$inferSelect;
export type Customer = typeof customersTable.$inferSelect;
export type WeeklyMenu = typeof weeklyMenusTable.$inferSelect;
export type Meal = typeof mealsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type DeliveryZone = typeof deliveryZonesTable.$inferSelect;
export type BusinessSettings = typeof businessSettingsTable.$inferSelect;
export type PaymentConfirmation = typeof paymentConfirmationsTable.$inferSelect;
export type AdminNotification = typeof adminNotificationsTable.$inferSelect;
export type EmailEvent = typeof emailEventsTable.$inferSelect;
export type CreateOrder = z.infer<typeof insertOrderSchema>;