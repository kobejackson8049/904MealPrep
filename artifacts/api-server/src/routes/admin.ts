import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";

type DbModule = typeof import("@workspace/db");

const router: IRouter = Router();
const orderStatuses = ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed", "cancelled"] as const;
const paymentMethods = ["square", "cash_app", "venmo", "zelle", "other_manual"] as const;
const paymentInstructions: Record<(typeof paymentMethods)[number], string> = {
  square: "Square hosted checkout / Apple Pay",
  cash_app: process.env.PAYMENT_CASH_APP_INSTRUCTIONS || "Cash App instructions will be provided by the owner.",
  venmo: process.env.PAYMENT_VENMO_INSTRUCTIONS || "Venmo instructions will be provided by the owner.",
  zelle: process.env.PAYMENT_ZELLE_INSTRUCTIONS || "Zelle instructions will be provided by the owner.",
  other_manual: process.env.PAYMENT_OTHER_INSTRUCTIONS || "Payment instructions will be provided by the owner.",
};
const orderBody = z.object({
  menuId: z.string().min(1),
  customer: z.object({
    name: z.string().min(1),
    email: z.string().email(),
    phone: z.string().min(1),
    address: z.string().default(""),
  }),
  fulfillment: z.enum(["pickup", "delivery"]),
  pickupWindow: z.string().default(""),
  deliveryZone: z.string().default(""),
  deliveryAddress: z.string().default(""),
  notes: z.string().default(""),
  paymentMethod: z.enum(paymentMethods).default("square"),
  items: z.array(z.object({ mealId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});

async function loadDb(): Promise<DbModule> {
  return import("@workspace/db");
}

function singleParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function hasAdminToken(req: Request) {
  const configured = process.env.ADMIN_API_TOKEN;
  const provided = req.header("authorization")?.replace(/^Bearer\s+/i, "") || req.header("x-admin-token");
  if (!configured || !provided) return false;
  const expected = Buffer.from(configured);
  const actual = Buffer.from(provided);
  return expected.length === actual.length && timingSafeEqual(expected, actual);
}

export function requireAdmin(req: Request, res: Response, next: NextFunction): void {
  if (!hasAdminToken(req)) {
    res.status(401).json({ error: "Admin authentication required" });
    return;
  }
  next();
}

async function withDatabase(res: Response, work: (database: DbModule) => Promise<void>) {
  try {
    await work(await loadDb());
  } catch (error) {
    res.status(503).json({
      error: "Persistent database is not configured or is temporarily unavailable",
      ...(process.env.NODE_ENV === "development" ? { detail: error instanceof Error ? error.message : String(error) } : {}),
    });
  }
}

router.get("/admin/session", requireAdmin, (req, res) => {
  res.json({ authenticated: true, databaseConfigured: Boolean(process.env.DATABASE_URL), actor: req.header("x-admin-email") || "owner" });
});

router.get("/admin/overview", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, ordersTable, customersTable, orderItemsTable }) => {
    const [orders, customers, items] = await Promise.all([
      db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(500),
      db.select().from(customersTable).limit(500),
      db.select().from(orderItemsTable).limit(2000),
    ]);
    const paidOrders = orders.filter((order) => order.paymentStatus === "paid");
    const pendingOrders = orders.filter((order) => order.paymentStatus === "pending" || order.paymentStatus === "unpaid");
    const revenue = paidOrders.reduce((sum, order) => sum + Number(order.total), 0);
    const pendingAmount = pendingOrders.reduce((sum, order) => sum + Number(order.total), 0);
    res.json({
      metrics: {
        orders: orders.length,
        customers: customers.length,
        meals: items.reduce((sum, item) => sum + item.quantity, 0),
        revenue: Number(revenue.toFixed(2)),
        averageOrder: orders.length ? Number((orders.reduce((sum, order) => sum + Number(order.total), 0) / orders.length).toFixed(2)) : 0,
        pendingAmount: Number(pendingAmount.toFixed(2)),
        paidOrders: paidOrders.length,
        unpaidOrders: pendingOrders.length,
      },
      orders: orders.slice(0, 12),
      paymentStatuses: orders.reduce<Record<string, number>>((result, order) => { result[order.paymentStatus] = (result[order.paymentStatus] || 0) + 1; return result; }, {}),
      revenueByPaymentMethod: paidOrders.reduce<Record<string, number>>((result, order) => { result[order.paymentMethod] = Number(((result[order.paymentMethod] || 0) + Number(order.total)).toFixed(2)); return result; }, {}),
      fulfillment: orders.reduce<Record<string, number>>((result, order) => { result[order.fulfillment] = (result[order.fulfillment] || 0) + 1; return result; }, {}),
    });
  });
});

router.get("/admin/orders", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, ordersTable }) => {
    res.json(await db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(500));
  });
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.enum(orderStatuses) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, ordersTable }) => {
    const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, singleParam(req.params.id))).returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    res.json(order);
  });
});

router.patch("/admin/orders/:id/payment", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.literal("paid") }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, ordersTable }) => {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, singleParam(req.params.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (existing.paymentStatus === "refunded") {
      res.status(409).json({ error: "A refunded order cannot be marked paid" });
      return;
    }
    const [order] = await db.update(ordersTable).set({ paymentStatus: parsed.data.status }).where(eq(ordersTable.id, existing.id)).returning();
    res.json({ ...order, paymentMethod: existing.paymentMethod, paymentStatus: "paid" });
  });
});

router.get("/admin/customers", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, customersTable, ordersTable }) => {
    const [customers, orders] = await Promise.all([db.select().from(customersTable).limit(500), db.select().from(ordersTable).limit(2000)]);
    res.json(customers.map((customer) => {
       const customerOrders = orders.filter((order) => order.customerId === customer.id);
       const paidOrders = customerOrders.filter((order) => order.paymentStatus === "paid");
       return { ...customer, orders: customerOrders.length, lifetimeSpend: paidOrders.reduce((sum, order) => sum + Number(order.total), 0), lastOrder: customerOrders[0]?.createdAt || null };
    }));
  });
});

router.get("/admin/menus/current", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable, deliveryZonesTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).orderBy(desc(weeklyMenusTable.orderDeadline)).limit(1);
    if (!menu) {
      res.status(404).json({ error: "No weekly menu found" });
      return;
    }
    const [meals, deliveryZones] = await Promise.all([
      db.select().from(mealsTable).where(eq(mealsTable.menuId, menu.id)).orderBy(mealsTable.mealNumber),
      db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.active, true)),
    ]);
    res.json({ ...menu, meals, deliveryZones });
  });
});

router.patch("/admin/meals/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({
    name: z.string().min(1).optional(),
    description: z.string().optional(),
    category: z.string().min(1).optional(),
    price: z.coerce.number().nonnegative().optional(),
    premiumCharge: z.coerce.number().nonnegative().optional(),
    calories: z.coerce.number().int().nonnegative().optional(),
    protein: z.coerce.number().int().nonnegative().optional(),
    carbs: z.coerce.number().int().nonnegative().optional(),
    available: z.boolean().optional(),
    soldOut: z.boolean().optional(),
    image: z.string().optional(),
  }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, mealsTable }) => {
    const { price, premiumCharge, ...textAndIntegerFields } = parsed.data;
    const updates = {
      ...textAndIntegerFields,
      ...(price === undefined ? {} : { price: price.toFixed(2) }),
      ...(premiumCharge === undefined ? {} : { premiumCharge: premiumCharge.toFixed(2) }),
    };
    const [meal] = await db.update(mealsTable).set(updates).where(eq(mealsTable.id, singleParam(req.params.id))).returning();
    if (!meal) {
      res.status(404).json({ error: "Meal not found" });
      return;
    }
    res.json(meal);
  });
});

router.get("/admin/prep", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, mealsTable, orderItemsTable, ordersTable }) => {
    const [items, orders] = await Promise.all([
      db.select({ mealId: orderItemsTable.mealId, mealName: mealsTable.name, mealNumber: mealsTable.mealNumber, category: mealsTable.category, quantity: orderItemsTable.quantity }).from(orderItemsTable).innerJoin(mealsTable, eq(orderItemsTable.mealId, mealsTable.id)).innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id)).where(inArray(ordersTable.status, ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed"])),
      db.select({ id: ordersTable.id, customerId: ordersTable.customerId, status: ordersTable.status }).from(ordersTable).where(inArray(ordersTable.status, ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed"])),
    ]);
    const prep = Object.values(items.reduce<Record<string, { mealId: string; mealName: string; mealNumber: number; category: string; quantity: number }>>((result, item) => {
      const current = result[item.mealId] || { mealId: item.mealId, mealName: item.mealName, mealNumber: item.mealNumber, category: item.category, quantity: 0 };
      current.quantity += item.quantity;
      result[item.mealId] = current;
      return result;
    }, {})).sort((a, b) => a.mealNumber - b.mealNumber);
    res.json({ totalMeals: prep.reduce((sum, meal) => sum + meal.quantity, 0), meals: prep, orderCount: orders.length });
  });
});

router.get("/admin/export/:kind", requireAdmin, async (req, res): Promise<void> => {
  const kind = Array.isArray(req.params.kind) ? req.params.kind[0] : req.params.kind;
  if (!["orders", "customers", "prep"].includes(kind)) {
    res.status(400).json({ error: "Unsupported export type" });
    return;
  }
  await withDatabase(res, async ({ db, ordersTable, customersTable, mealsTable, orderItemsTable }) => {
    let rows: Array<Record<string, unknown>> = [];
    if (kind === "orders") rows = await db.select().from(ordersTable);
    if (kind === "customers") rows = await db.select().from(customersTable);
    if (kind === "prep") rows = await db.select({ meal: mealsTable.name, category: mealsTable.category, quantity: orderItemsTable.quantity }).from(orderItemsTable).innerJoin(mealsTable, eq(orderItemsTable.mealId, mealsTable.id)).innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id)).where(inArray(ordersTable.status, ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed"]));
    const columns = rows.length ? Object.keys(rows[0]) : ["message"];
    const csv = [columns.join(","), ...rows.map((row) => columns.map((column) => `"${String(row[column] ?? "").replaceAll('"', '""')}"`).join(","))].join("\n");
    res.type("text/csv").setHeader("Content-Disposition", `attachment; filename="904-${kind}.csv"`).send(csv);
  });
});

router.post("/orders", async (req, res): Promise<void> => {
  const parsed = orderBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, customersTable, mealsTable, weeklyMenusTable, ordersTable, orderItemsTable, deliveryZonesTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, parsed.data.menuId)).limit(1);
    if (!menu || menu.orderDeadline.getTime() <= Date.now()) {
      res.status(409).json({ error: "This weekly menu is closed" });
      return;
    }
    const mealIds = [...new Set(parsed.data.items.map((item) => item.mealId))];
    const meals = await db.select().from(mealsTable).where(and(eq(mealsTable.menuId, menu.id), inArray(mealsTable.id, mealIds)));
    if (meals.length !== mealIds.length || meals.some((meal) => !meal.available || meal.soldOut)) {
      res.status(409).json({ error: "One or more selected meals are unavailable" });
      return;
    }
    const [zone] = parsed.data.fulfillment === "delivery" ? await db.select().from(deliveryZonesTable).where(and(eq(deliveryZonesTable.id, parsed.data.deliveryZone), eq(deliveryZonesTable.active, true))).limit(1) : [undefined];
    if (parsed.data.fulfillment === "delivery" && !zone) {
      res.status(400).json({ error: "A valid delivery zone is required" });
      return;
    }
    const customerId = `customer-${parsed.data.customer.email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const [customer] = await db.insert(customersTable).values({ id: customerId, ...parsed.data.customer }).onConflictDoUpdate({ target: customersTable.email, set: { name: parsed.data.customer.name, phone: parsed.data.customer.phone, address: parsed.data.customer.address, updatedAt: new Date() } }).returning();
    const mealSubtotal = parsed.data.items.reduce((sum, item) => sum + Number(meals.find((meal) => meal.id === item.mealId)?.price || 0) * item.quantity, 0);
    const premiumCharges = parsed.data.items.reduce((sum, item) => sum + Number(meals.find((meal) => meal.id === item.mealId)?.premiumCharge || 0) * item.quantity, 0);
    const deliveryFee = Number(zone?.fee || 0);
     const orderTotal = mealSubtotal + premiumCharges + deliveryFee;
     const [order] = await db.insert(ordersTable).values({ id: randomUUID(), orderNumber: `904-${Date.now().toString().slice(-6)}`, customerId: customer.id, customerName: parsed.data.customer.name, customerEmail: parsed.data.customer.email, customerPhone: parsed.data.customer.phone, menuId: menu.id, fulfillment: parsed.data.fulfillment, pickupWindow: parsed.data.pickupWindow, deliveryZone: parsed.data.deliveryZone, deliveryAddress: parsed.data.deliveryAddress, notes: parsed.data.notes, mealSubtotal: mealSubtotal.toFixed(2), premiumCharges: premiumCharges.toFixed(2), deliveryFee: deliveryFee.toFixed(2), total: orderTotal.toFixed(2), paymentMethod: parsed.data.paymentMethod, paymentStatus: "pending", status: "new" }).returning();
    await db.insert(orderItemsTable).values(parsed.data.items.map((item) => ({ id: randomUUID(), orderId: order.id, mealId: item.mealId, quantity: item.quantity })));
     res.status(201).json({ order, payment: { method: parsed.data.paymentMethod, status: "pending", amountDue: orderTotal.toFixed(2), instructions: paymentInstructions[parsed.data.paymentMethod] }, checkout: { provider: parsed.data.paymentMethod === "square" ? "square" : null, status: parsed.data.paymentMethod === "square" ? "not_configured" : "manual_payment" } });
  });
});

export default router;