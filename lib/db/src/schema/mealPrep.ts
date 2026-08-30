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
  status: text("status").notNull().default("draft"),
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
  status: text("status").notNull().default("new"),
  squareCheckoutId: text("square_checkout_id"),
  ...timestamps,
});

export const orderItemsTable = pgTable("meal_prep_order_items", {
  id: text("id").primaryKey(),
  orderId: text("order_id").notNull().references(() => ordersTable.id, { onDelete: "cascade" }),
  mealId: text("meal_id").notNull().references(() => mealsTable.id),
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

export const insertAdminUserSchema = createInsertSchema(adminUsersTable).omit({ createdAt: true, updatedAt: true });
export const insertCustomerSchema = createInsertSchema(customersTable).omit({ createdAt: true, updatedAt: true });
export const insertWeeklyMenuSchema = createInsertSchema(weeklyMenusTable).omit({ createdAt: true, updatedAt: true });
export const insertMealSchema = createInsertSchema(mealsTable).omit({ createdAt: true, updatedAt: true });
export const insertOrderSchema = createInsertSchema(ordersTable).omit({ createdAt: true, updatedAt: true });
export const insertOrderItemSchema = createInsertSchema(orderItemsTable).omit({ createdAt: true, updatedAt: true });
export const insertDeliveryZoneSchema = createInsertSchema(deliveryZonesTable).omit({ createdAt: true, updatedAt: true });

export type AdminUser = typeof adminUsersTable.$inferSelect;
export type Customer = typeof customersTable.$inferSelect;
export type WeeklyMenu = typeof weeklyMenusTable.$inferSelect;
export type Meal = typeof mealsTable.$inferSelect;
export type Order = typeof ordersTable.$inferSelect;
export type OrderItem = typeof orderItemsTable.$inferSelect;
export type DeliveryZone = typeof deliveryZonesTable.$inferSelect;
export type CreateOrder = z.infer<typeof insertOrderSchema>;