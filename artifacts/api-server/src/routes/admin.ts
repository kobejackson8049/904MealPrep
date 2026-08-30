import { randomUUID, timingSafeEqual } from "node:crypto";
import { Router, type IRouter, type NextFunction, type Request, type Response } from "express";
import { and, desc, eq, inArray } from "drizzle-orm";
import { z } from "zod";
import { sendTransactionalEmail } from "../lib/email";

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
  expectedSenderName: z.string().max(120).default(""),
  items: z.array(z.object({ mealId: z.string().min(1), quantity: z.number().int().positive() })).min(1),
});
const menuBody = z.object({
  id: z.string().min(1).optional(),
  weekLabel: z.string().min(1),
  orderDeadline: z.coerce.date(),
  deadlineLabel: z.string().min(1),
  announcement: z.string().default(""),
  pickupWindows: z.array(z.string().min(1)).min(1),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
});
const mealBody = z.object({
  id: z.string().min(1).optional(),
  menuId: z.string().min(1),
  mealNumber: z.coerce.number().int().positive(),
  name: z.string().min(1),
  description: z.string().default(""),
  category: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  premiumCharge: z.coerce.number().nonnegative().default(0),
  calories: z.coerce.number().int().nonnegative(),
  protein: z.coerce.number().int().nonnegative(),
  carbs: z.coerce.number().int().nonnegative(),
  image: z.string().default(""),
  available: z.boolean().default(true),
});
const settingsBody = z.object({
  businessName: z.string().min(1),
  phone: z.string().default(""),
  email: z.union([z.string().email(), z.literal("")]).default(""),
  instagram: z.string().default(""),
  pickupInformation: z.string().default(""),
  announcement: z.string().default(""),
  standardPrice: z.coerce.number().nonnegative(),
  premiumCharge: z.coerce.number().nonnegative(),
  showDemoLabel: z.boolean().default(false),
  cashAppHandle: z.string().default(""),
  venmoHandle: z.string().default(""),
  zelleContact: z.string().default(""),
  cashAppQrPath: z.string().default(""),
  venmoQrPath: z.string().default(""),
  zelleQrPath: z.string().default(""),
  cashAppEnabled: z.boolean().default(true),
  venmoEnabled: z.boolean().default(true),
  zelleEnabled: z.boolean().default(true),
});
const galleryBody = z.object({
  title: z.string().min(1).max(140),
  description: z.string().max(1000).default(""),
  mediaType: z.enum(["image", "video"]),
  mediaPath: z.string().min(1),
  posterPath: z.string().default(""),
  linkedMealId: z.string().nullable().default(null),
  category: z.string().max(80).default(""),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  displayOrder: z.coerce.number().int().nonnegative().default(0),
  featured: z.boolean().default(false),
});

async function loadDb(): Promise<DbModule> {
  return import("@workspace/db");
}

function singleParam(value: string | string[]) {
  return Array.isArray(value) ? value[0] : value;
}

function privateObjectLocation(objectId: string) {
  const raw = process.env.PRIVATE_OBJECT_DIR || "";
  const parts = raw.replace(/^\/+/, "").split("/");
  if (parts.length < 2) throw new Error("PRIVATE_OBJECT_DIR is not configured");
  return { bucketName: parts[0], objectName: `${parts.slice(1).join("/")}/gallery/${objectId}` };
}
async function signedObjectUrl(bucketName: string, objectName: string, method: "GET" | "PUT") {
  const response = await fetch("http://127.0.0.1:1106/object-storage/signed-object-url", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ bucket_name: bucketName, object_name: objectName, method, expires_at: new Date(Date.now() + 15 * 60_000).toISOString() }),
    signal: AbortSignal.timeout(30_000),
  });
  if (!response.ok) throw new Error(`Storage signing failed: ${response.status}`);
  return (await response.json() as { signed_url: string }).signed_url;
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

async function queueEmail(db: any, emailEventsTable: any, orderId: string, eventType: string, message: { to: string; subject: string; text: string }) {
  const id = randomUUID();
  await db.insert(emailEventsTable).values({ id, orderId, eventType, recipient: message.to, subject: message.subject, body: message.text, status: "queued" });
  try {
    const delivery = await sendTransactionalEmail(message);
    await db.update(emailEventsTable).set({ status: delivery.delivered ? "delivered" : "preview", providerMode: delivery.mode, deliveredAt: delivery.delivered ? new Date() : null }).where(eq(emailEventsTable.id, id));
  } catch (error) {
    await db.update(emailEventsTable).set({ status: "failed", lastError: error instanceof Error ? error.message.slice(0, 500) : "Provider failure" }).where(eq(emailEventsTable.id, id));
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
  await withDatabase(res, async ({ db, ordersTable, orderItemsTable }) => {
    const [orders, items] = await Promise.all([
      db.select().from(ordersTable).orderBy(desc(ordersTable.createdAt)).limit(500),
      db.select().from(orderItemsTable).limit(5000),
    ]);
    res.json(orders.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id) })));
  });
});

router.patch("/admin/orders/:id/status", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ status: z.enum(orderStatuses) }).safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, ordersTable, emailEventsTable }) => {
    const [order] = await db.update(ordersTable).set({ status: parsed.data.status }).where(eq(ordersTable.id, singleParam(req.params.id))).returning();
    if (!order) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (["ready", "out_for_delivery", "completed"].includes(parsed.data.status)) {
      const label = parsed.data.status === "ready" ? "ready for pickup" : parsed.data.status === "out_for_delivery" ? "out for delivery" : "completed";
      await queueEmail(db, emailEventsTable, order.id, `fulfillment_${parsed.data.status}`, {
        to: order.customerEmail,
        subject: `Your 904 Meal Prepz order is ${label}`,
        text: `Hi ${order.customerName},\n\nOrder ${order.orderNumber} is ${label}.\n${order.fulfillment === "delivery" ? `Delivery address: ${order.deliveryAddress}` : `Pickup window: ${order.pickupWindow}`}`,
      });
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
  await withDatabase(res, async ({ db, ordersTable, orderItemsTable, paymentConfirmationsTable, emailEventsTable }) => {
    const [existing] = await db.select().from(ordersTable).where(eq(ordersTable.id, singleParam(req.params.id))).limit(1);
    if (!existing) {
      res.status(404).json({ error: "Order not found" });
      return;
    }
    if (existing.paymentStatus === "refunded") {
      res.status(409).json({ error: "A refunded order cannot be marked paid" });
      return;
    }
    if (existing.paymentMethod === "square") {
      res.status(409).json({ error: "Square orders cannot be confirmed through the manual-payment flow" });
      return;
    }
    if (existing.paymentStatus === "paid") {
      res.json(existing);
      return;
    }
    const actor = req.header("x-admin-email") || "owner";
    const confirmedAt = new Date();
    const [order] = await db.update(ordersTable).set({ paymentStatus: parsed.data.status, status: "confirmed", paymentConfirmedAt: confirmedAt, paymentConfirmedBy: actor }).where(eq(ordersTable.id, existing.id)).returning();
    await db.update(paymentConfirmationsTable).set({ confirmedAt, confirmedBy: actor }).where(eq(paymentConfirmationsTable.orderId, existing.id));
    const items = await db.select().from(orderItemsTable).where(eq(orderItemsTable.orderId, existing.id));
    await queueEmail(db, emailEventsTable, existing.id, "payment_confirmed", {
      to: existing.customerEmail,
      subject: "Payment confirmed — your 904 Meal Prepz order is confirmed",
      text: `Hi ${existing.customerName},\n\nPAID: $${Number(existing.total).toFixed(2)}\nORDER CONFIRMED: ${existing.orderNumber}\nPayment method: ${existing.paymentMethod}\n\n${items.map((item) => `${item.mealNameSnapshot} x ${item.quantity}`).join("\n")}\n\n${existing.fulfillment === "delivery" ? `Delivery: ${existing.deliveryAddress}` : `Pickup: ${existing.pickupWindow}`}`,
    });
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
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable, deliveryZonesTable, businessSettingsTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).orderBy(desc(weeklyMenusTable.orderDeadline)).limit(1);
    if (!menu) {
      res.status(404).json({ error: "No weekly menu found" });
      return;
    }
    const [meals, deliveryZones, settingsRows] = await Promise.all([
      db.select().from(mealsTable).where(eq(mealsTable.menuId, menu.id)).orderBy(mealsTable.mealNumber),
      db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.active, true)),
      db.select().from(businessSettingsTable).where(eq(businessSettingsTable.id, "default")).limit(1),
    ]);
    const settings = settingsRows[0];
    res.json({ ...menu, meals, deliveryZones, paymentOptions: settings ? {
      cash_app: { enabled: settings.cashAppEnabled, handle: settings.cashAppHandle, qrPath: settings.cashAppQrPath },
      venmo: { enabled: settings.venmoEnabled, handle: settings.venmoHandle, qrPath: settings.venmoQrPath },
      zelle: { enabled: settings.zelleEnabled, handle: settings.zelleContact, qrPath: settings.zelleQrPath },
    } : null });
  });
});

router.get("/admin/menus", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable }) => {
    const menus = await db.select().from(weeklyMenusTable).orderBy(desc(weeklyMenusTable.orderDeadline)).limit(100);
    const meals = await db.select().from(mealsTable);
    res.json(menus.map((menu) => ({ ...menu, meals: meals.filter((meal) => meal.menuId === menu.id) })));
  });
});

router.post("/admin/menus", requireAdmin, async (req, res): Promise<void> => {
  const parsed = menuBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  if (parsed.data.status === "published") {
    res.status(400).json({ error: "Create the menu as a draft, then use the publish endpoint" });
    return;
  }
  await withDatabase(res, async ({ db, weeklyMenusTable }) => {
    const [menu] = await db.insert(weeklyMenusTable).values({ ...parsed.data, id: parsed.data.id || randomUUID(), publishedAt: null }).returning();
    res.status(201).json(menu);
  });
});

router.post("/admin/menus/:id/clone", requireAdmin, async (req, res): Promise<void> => {
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable }) => {
    const sourceId = singleParam(req.params.id);
    const [source] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, sourceId)).limit(1);
    if (!source) {
      res.status(404).json({ error: "Source menu not found" });
      return;
    }
    const sourceMeals = await db.select().from(mealsTable).where(eq(mealsTable.menuId, sourceId));
    const result = await db.transaction(async (transaction) => {
      const menuId = randomUUID();
      const [menu] = await transaction.insert(weeklyMenusTable).values({
        id: menuId, weekLabel: source.weekLabel, orderDeadline: source.orderDeadline, deadlineLabel: source.deadlineLabel,
        announcement: source.announcement, pickupWindows: source.pickupWindows, status: "draft", publishedAt: null,
      }).returning();
      const clonedMeals = sourceMeals.length ? await transaction.insert(mealsTable).values(sourceMeals.map((meal) => ({
        id: randomUUID(), menuId, mealNumber: meal.mealNumber, name: meal.name, description: meal.description,
        category: meal.category, price: meal.price, premiumCharge: meal.premiumCharge, calories: meal.calories,
        protein: meal.protein, carbs: meal.carbs, image: meal.image, available: meal.available, soldOut: meal.soldOut, archived: meal.archived,
      }))).returning() : [];
      return { ...menu, meals: clonedMeals };
    });
    res.status(201).json(result);
  });
});

router.patch("/admin/menus/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = menuBody.partial().safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, weeklyMenusTable }) => {
    const [menu] = await db.update(weeklyMenusTable).set(parsed.data).where(eq(weeklyMenusTable.id, singleParam(req.params.id))).returning();
    if (!menu) {
      res.status(404).json({ error: "Menu not found" });
      return;
    }
    res.json(menu);
  });
});

router.post("/admin/menus/:id/publish", requireAdmin, async (req, res): Promise<void> => {
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable, businessSettingsTable }) => {
    const id = singleParam(req.params.id);
    const [target] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, id)).limit(1);
    if (!target) {
      res.status(404).json({ error: "Menu not found" });
      return;
    }
    await db.transaction(async (transaction) => {
      const [settings] = await transaction.select().from(businessSettingsTable).where(eq(businessSettingsTable.id, "default")).limit(1);
      if (settings) {
        const menuMeals = await transaction.select().from(mealsTable).where(eq(mealsTable.menuId, id));
        await Promise.all(menuMeals.map((meal) => transaction.update(mealsTable).set({
          price: settings.standardPrice,
          premiumCharge: Number(meal.premiumCharge) > 0 ? settings.premiumCharge : "0",
        }).where(eq(mealsTable.id, meal.id))));
      }
      await transaction.update(weeklyMenusTable).set({ status: "archived" }).where(eq(weeklyMenusTable.status, "published"));
      await transaction.update(weeklyMenusTable).set({ status: "published", publishedAt: new Date() }).where(eq(weeklyMenusTable.id, id));
    });
    const [published] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, id)).limit(1);
    res.json(published);
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
    archived: z.boolean().optional(),
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

router.post("/admin/meals", requireAdmin, async (req, res): Promise<void> => {
  const parsed = mealBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, mealsTable, weeklyMenusTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, parsed.data.menuId)).limit(1);
    if (!menu) {
      res.status(404).json({ error: "Menu not found" });
      return;
    }
    const [meal] = await db.insert(mealsTable).values({
      ...parsed.data,
      id: parsed.data.id || randomUUID(),
      price: parsed.data.price.toFixed(2),
      premiumCharge: parsed.data.premiumCharge.toFixed(2),
    }).returning();
    res.status(201).json(meal);
  });
});

router.get("/admin/prep", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, orderItemsTable, ordersTable }) => {
    const [items, orders] = await Promise.all([
      db.select({ mealId: orderItemsTable.mealId, mealName: orderItemsTable.mealNameSnapshot, mealNumber: orderItemsTable.mealNumberSnapshot, category: orderItemsTable.categorySnapshot, quantity: orderItemsTable.quantity }).from(orderItemsTable).innerJoin(ordersTable, eq(orderItemsTable.orderId, ordersTable.id)).where(inArray(ordersTable.status, ["new", "confirmed", "preparing", "ready", "out_for_delivery", "completed"])),
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

router.get("/admin/customers/:id", requireAdmin, async (req, res): Promise<void> => {
  await withDatabase(res, async ({ db, customersTable, ordersTable, orderItemsTable }) => {
    const id = singleParam(req.params.id);
    const [customer] = await db.select().from(customersTable).where(eq(customersTable.id, id)).limit(1);
    if (!customer) {
      res.status(404).json({ error: "Customer not found" });
      return;
    }
    const orders = await db.select().from(ordersTable).where(eq(ordersTable.customerId, id)).orderBy(desc(ordersTable.createdAt));
    const orderIds = orders.map((order) => order.id);
    const items = orderIds.length ? await db.select().from(orderItemsTable).where(inArray(orderItemsTable.orderId, orderIds)) : [];
    res.json({
      ...customer,
      orders: orders.map((order) => ({ ...order, items: items.filter((item) => item.orderId === order.id) })),
      lifetimeSpend: orders.filter((order) => order.paymentStatus === "paid").reduce((sum, order) => sum + Number(order.total), 0),
    });
  });
});

router.get("/admin/fulfillment", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, ordersTable }) => {
    const orders = await db.select().from(ordersTable).where(inArray(ordersTable.status, ["new", "confirmed", "preparing", "ready", "out_for_delivery"])).orderBy(ordersTable.pickupWindow);
    res.json({
      pickup: orders.filter((order) => order.fulfillment === "pickup"),
      delivery: orders.filter((order) => order.fulfillment === "delivery"),
    });
  });
});

router.get("/admin/analytics", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, ordersTable, orderItemsTable }) => {
    const [orders, items] = await Promise.all([db.select().from(ordersTable).limit(5000), db.select().from(orderItemsTable).limit(20000)]);
    const paid = orders.filter((order) => order.paymentStatus === "paid");
    const paidOrderIds = new Set(paid.map((order) => order.id));
    const paidItems = items.filter((item) => paidOrderIds.has(item.orderId));
    const mealPerformance = Object.values(paidItems.reduce<Record<string, { mealId: string; name: string; units: number; revenue: number }>>((result, item) => {
      const current = result[item.mealId] || { mealId: item.mealId, name: item.mealNameSnapshot, units: 0, revenue: 0 };
      current.units += item.quantity;
      current.revenue += (Number(item.unitPriceSnapshot) + Number(item.premiumChargeSnapshot)) * item.quantity;
      result[item.mealId] = current;
      return result;
    }, {})).sort((a, b) => b.units - a.units);
    res.json({
      revenue: paid.reduce((sum, order) => sum + Number(order.total), 0),
      pendingAmount: orders.filter((order) => ["pending", "unpaid"].includes(order.paymentStatus)).reduce((sum, order) => sum + Number(order.total), 0),
      fulfillment: orders.reduce<Record<string, number>>((result, order) => { result[order.fulfillment] = (result[order.fulfillment] || 0) + 1; return result; }, {}),
      revenueByPaymentMethod: paid.reduce<Record<string, number>>((result, order) => { result[order.paymentMethod] = (result[order.paymentMethod] || 0) + Number(order.total); return result; }, {}),
      premiumUnits: paidItems.filter((item) => Number(item.premiumChargeSnapshot) > 0).reduce((sum, item) => sum + item.quantity, 0),
      standardUnits: paidItems.filter((item) => Number(item.premiumChargeSnapshot) === 0).reduce((sum, item) => sum + item.quantity, 0),
      mealPerformance,
    });
  });
});

router.get("/admin/settings", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, businessSettingsTable }) => {
    const [settings] = await db.select().from(businessSettingsTable).where(eq(businessSettingsTable.id, "default")).limit(1);
    res.json(settings || null);
  });
});

router.put("/admin/settings", requireAdmin, async (req, res): Promise<void> => {
  const parsed = settingsBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await withDatabase(res, async ({ db, businessSettingsTable }) => {
    const values = { ...parsed.data, id: "default", standardPrice: parsed.data.standardPrice.toFixed(2), premiumCharge: parsed.data.premiumCharge.toFixed(2) };
    const [settings] = await db.insert(businessSettingsTable).values(values).onConflictDoUpdate({ target: businessSettingsTable.id, set: { ...values, updatedAt: new Date() } }).returning();
    res.json(settings);
  });
});

router.get("/menus/current", async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, weeklyMenusTable, mealsTable, deliveryZonesTable, businessSettingsTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.status, "published")).orderBy(desc(weeklyMenusTable.publishedAt)).limit(1);
    if (!menu) {
      res.status(404).json({ error: "No published weekly menu found" });
      return;
    }
    const [meals, deliveryZones, settingsRows] = await Promise.all([
      db.select().from(mealsTable).where(and(eq(mealsTable.menuId, menu.id), eq(mealsTable.available, true), eq(mealsTable.soldOut, false), eq(mealsTable.archived, false))).orderBy(mealsTable.mealNumber),
      db.select().from(deliveryZonesTable).where(eq(deliveryZonesTable.active, true)),
      db.select().from(businessSettingsTable).where(eq(businessSettingsTable.id, "default")).limit(1),
    ]);
    const settings = settingsRows[0];
    res.json({ ...menu, meals, deliveryZones, paymentOptions: settings ? {
      cash_app: { enabled: settings.cashAppEnabled, handle: settings.cashAppHandle, qrPath: settings.cashAppQrPath },
      venmo: { enabled: settings.venmoEnabled, handle: settings.venmoHandle, qrPath: settings.venmoQrPath },
      zelle: { enabled: settings.zelleEnabled, handle: settings.zelleContact, qrPath: settings.zelleQrPath },
    } : null });
  });
});

router.get("/gallery", async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, galleryMediaTable, mealsTable, weeklyMenusTable }) => {
    const rows = await db.select().from(galleryMediaTable).where(eq(galleryMediaTable.status, "published")).orderBy(galleryMediaTable.displayOrder);
    const [menu] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.status, "published")).orderBy(desc(weeklyMenusTable.publishedAt)).limit(1);
    const meals = menu ? await db.select({ id: mealsTable.id, name: mealsTable.name }).from(mealsTable).where(and(eq(mealsTable.menuId, menu.id), eq(mealsTable.available, true), eq(mealsTable.archived, false))) : [];
    res.json(rows.map((row) => ({ ...row, linkedMeal: row.linkedMealId ? meals.find((meal) => meal.id === row.linkedMealId) || null : null })));
  });
});

router.post("/admin/gallery/upload-url", requireAdmin, async (req, res): Promise<void> => {
  const parsed = z.object({ name: z.string().min(1).max(200), size: z.number().int().positive().max(50 * 1024 * 1024), contentType: z.string().regex(/^(image\/(jpeg|png|webp|gif)|video\/(mp4|webm|quicktime))$/) }).safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: "Use a JPG, PNG, WebP, GIF, MP4, WebM, or MOV file up to 50 MB." }); return; }
  try {
    const objectId = `${randomUUID()}-${parsed.data.name.replace(/[^a-zA-Z0-9._-]/g, "-")}`;
    const location = privateObjectLocation(objectId);
    res.json({ uploadURL: await signedObjectUrl(location.bucketName, location.objectName, "PUT"), objectPath: `/storage/objects/${encodeURIComponent(objectId)}` });
  } catch (error) { res.status(503).json({ error: error instanceof Error ? error.message : "Storage unavailable" }); }
});
router.get("/storage/objects/:id", async (req, res): Promise<void> => {
  try {
    const location = privateObjectLocation(singleParam(req.params.id));
    res.redirect(307, await signedObjectUrl(location.bucketName, location.objectName, "GET"));
  } catch { res.status(404).json({ error: "Media not found" }); }
});

router.get("/admin/gallery", requireAdmin, async (_req, res): Promise<void> => {
  await withDatabase(res, async ({ db, galleryMediaTable }) => {
    res.json(await db.select().from(galleryMediaTable).orderBy(galleryMediaTable.displayOrder));
  });
});
router.post("/admin/gallery", requireAdmin, async (req, res): Promise<void> => {
  const parsed = galleryBody.safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await withDatabase(res, async ({ db, galleryMediaTable }) => {
    const [row] = await db.insert(galleryMediaTable).values({ id: randomUUID(), ...parsed.data }).returning();
    res.status(201).json(row);
  });
});
router.patch("/admin/gallery/:id", requireAdmin, async (req, res): Promise<void> => {
  const parsed = galleryBody.partial().safeParse(req.body);
  if (!parsed.success) { res.status(400).json({ error: parsed.error.message }); return; }
  await withDatabase(res, async ({ db, galleryMediaTable }) => {
    const [row] = await db.update(galleryMediaTable).set({ ...parsed.data, updatedAt: new Date() }).where(eq(galleryMediaTable.id, singleParam(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Gallery item not found" }); return; }
    res.json(row);
  });
});
router.delete("/admin/gallery/:id", requireAdmin, async (req, res): Promise<void> => {
  await withDatabase(res, async ({ db, galleryMediaTable }) => {
    const [row] = await db.delete(galleryMediaTable).where(eq(galleryMediaTable.id, singleParam(req.params.id))).returning();
    if (!row) { res.status(404).json({ error: "Gallery item not found" }); return; }
    res.json({ deleted: true });
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
  await withDatabase(res, async ({ db, customersTable, mealsTable, weeklyMenusTable, ordersTable, orderItemsTable, deliveryZonesTable, paymentConfirmationsTable, adminNotificationsTable, emailEventsTable, businessSettingsTable }) => {
    const [menu] = await db.select().from(weeklyMenusTable).where(eq(weeklyMenusTable.id, parsed.data.menuId)).limit(1);
    if (!menu || menu.status !== "published" || menu.orderDeadline.getTime() <= Date.now()) {
      res.status(409).json({ error: "This weekly menu is not published or is closed" });
      return;
    }
    if (parsed.data.fulfillment === "pickup" && !menu.pickupWindows.includes(parsed.data.pickupWindow)) {
      res.status(400).json({ error: "A valid pickup window is required" });
      return;
    }
    if (parsed.data.fulfillment === "delivery" && !parsed.data.deliveryAddress.trim()) {
      res.status(400).json({ error: "A delivery address is required" });
      return;
    }
    const mealIds = [...new Set(parsed.data.items.map((item) => item.mealId))];
    const meals = await db.select().from(mealsTable).where(and(eq(mealsTable.menuId, menu.id), inArray(mealsTable.id, mealIds)));
    if (meals.length !== mealIds.length || meals.some((meal) => !meal.available || meal.soldOut || meal.archived)) {
      res.status(409).json({ error: "One or more selected meals are unavailable" });
      return;
    }
    const [zone] = parsed.data.fulfillment === "delivery" ? await db.select().from(deliveryZonesTable).where(and(eq(deliveryZonesTable.id, parsed.data.deliveryZone), eq(deliveryZonesTable.active, true))).limit(1) : [undefined];
    if (parsed.data.fulfillment === "delivery" && !zone) {
      res.status(400).json({ error: "A valid delivery zone is required" });
      return;
    }
    const [settings] = await db.select().from(businessSettingsTable).where(eq(businessSettingsTable.id, "default")).limit(1);
    const configuredMethods = settings ? {
      cash_app: { enabled: settings.cashAppEnabled, handle: settings.cashAppHandle },
      venmo: { enabled: settings.venmoEnabled, handle: settings.venmoHandle },
      zelle: { enabled: settings.zelleEnabled, handle: settings.zelleContact },
    } : null;
    const selectedConfig = parsed.data.paymentMethod in (configuredMethods || {}) ? configuredMethods?.[parsed.data.paymentMethod as keyof typeof configuredMethods] : undefined;
    if (selectedConfig && (!selectedConfig.enabled || !selectedConfig.handle.trim())) {
      res.status(409).json({ error: "That manual payment method is not currently available" });
      return;
    }
    const configuredInstruction = selectedConfig ? `Send $AMOUNT to ${selectedConfig.handle}.` : paymentInstructions[parsed.data.paymentMethod];
    const customerId = `customer-${parsed.data.customer.email.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
    const [customer] = await db.insert(customersTable).values({ id: customerId, ...parsed.data.customer }).onConflictDoUpdate({ target: customersTable.email, set: { name: parsed.data.customer.name, phone: parsed.data.customer.phone, address: parsed.data.customer.address, updatedAt: new Date() } }).returning();
    const mealSubtotal = parsed.data.items.reduce((sum, item) => sum + Number(meals.find((meal) => meal.id === item.mealId)?.price || 0) * item.quantity, 0);
    const premiumCharges = parsed.data.items.reduce((sum, item) => sum + Number(meals.find((meal) => meal.id === item.mealId)?.premiumCharge || 0) * item.quantity, 0);
    const deliveryFee = Number(zone?.fee || 0);
     const orderTotal = mealSubtotal + premiumCharges + deliveryFee;
     const manualPayment = parsed.data.paymentMethod !== "square";
     if (manualPayment && !parsed.data.expectedSenderName.trim()) {
       res.status(400).json({ error: "The payment sender name is required for manual payments" });
       return;
     }
     const [order] = await db.insert(ordersTable).values({ id: randomUUID(), orderNumber: `904-${Date.now().toString().slice(-6)}`, customerId: customer.id, customerName: parsed.data.customer.name, customerEmail: parsed.data.customer.email, customerPhone: parsed.data.customer.phone, menuId: menu.id, fulfillment: parsed.data.fulfillment, pickupWindow: parsed.data.pickupWindow, deliveryZone: parsed.data.deliveryZone, deliveryAddress: parsed.data.deliveryAddress, notes: parsed.data.notes, mealSubtotal: mealSubtotal.toFixed(2), premiumCharges: premiumCharges.toFixed(2), deliveryFee: deliveryFee.toFixed(2), total: orderTotal.toFixed(2), paymentMethod: parsed.data.paymentMethod, paymentStatus: "pending", expectedSenderName: parsed.data.expectedSenderName.trim(), paymentSubmittedAt: manualPayment ? new Date() : null, status: manualPayment ? "awaiting_payment_confirmation" : "new" }).returning();
    await db.insert(orderItemsTable).values(parsed.data.items.map((item) => {
      const meal = meals.find((candidate) => candidate.id === item.mealId);
      if (!meal) throw new Error("Validated meal missing during order creation");
      return {
        id: randomUUID(),
        orderId: order.id,
        mealId: item.mealId,
        mealNameSnapshot: meal.name,
        mealNumberSnapshot: meal.mealNumber,
        categorySnapshot: meal.category,
        unitPriceSnapshot: meal.price,
        premiumChargeSnapshot: meal.premiumCharge,
        quantity: item.quantity,
      };
    }));
     if (manualPayment) {
       await db.insert(paymentConfirmationsTable).values({ id: randomUUID(), orderId: order.id, paymentMethod: parsed.data.paymentMethod, amount: orderTotal.toFixed(2), expectedSenderName: order.expectedSenderName, submittedAt: new Date() });
       await db.insert(adminNotificationsTable).values({ id: randomUUID(), orderId: order.id, type: "payment_confirmation_needed", title: "New payment confirmation needed", message: `${order.customerName} submitted ${order.orderNumber} for $${orderTotal.toFixed(2)} using ${parsed.data.paymentMethod}.` });
     }
     const finalInstructions = configuredInstruction.replace("$AMOUNT", `$${orderTotal.toFixed(2)}`);
     await queueEmail(db, emailEventsTable, order.id, "order_received", { to: order.customerEmail, subject: "We received your 904 Meal Prepz order", text: `Hi ${order.customerName},\n\nWe received ${order.orderNumber} for $${orderTotal.toFixed(2)}.\nPayment: ${manualPayment ? "Payment Pending" : "Payment processing"}\n${manualPayment ? `Expected sender: ${order.expectedSenderName}\n${finalInstructions}\nPlease include ${order.orderNumber} in your payment note when possible.` : ""}` });
     res.status(201).json({ order, payment: { method: parsed.data.paymentMethod, status: "pending", amountDue: orderTotal.toFixed(2), instructions: finalInstructions, expectedSenderName: order.expectedSenderName }, checkout: { provider: parsed.data.paymentMethod === "square" ? "square" : null, status: parsed.data.paymentMethod === "square" ? "not_configured" : "manual_payment" } });
  });
});

export default router;