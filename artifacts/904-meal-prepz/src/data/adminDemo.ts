import { weeklyMenu, type WeeklyMeal } from './weeklyMenu';

export type AdminOrderStatus = 'New' | 'Confirmed' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Payment Pending' | 'Unpaid' | 'Refunded';
export type PaymentMethod = 'Square / Apple Pay' | 'Cash App' | 'Venmo' | 'Zelle' | 'Other manual';
export type FulfillmentType = 'Pickup' | 'Delivery';

export type AdminOrderItem = {
  id: string;
  mealId: string;
  mealNumber: number;
  mealName: string;
  category: string;
  quantity: number;
  unitPrice: number;
  premiumCharge: number;
};

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: string;
  phone: string;
  email: string;
  address: string;
  deliveryZone: string;
  notes: string;
  items: AdminOrderItem[];
  meals: string;
  mealCount: number;
  mealSubtotal: number;
  premiumCharges: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  fulfillment: FulfillmentType;
  window: string;
  payment: PaymentStatus;
  status: AdminOrderStatus;
  date: string;
};

export type AdminCustomer = {
  id: string;
  name: string;
  phone: string;
  email: string;
  address: string;
  lifetimeSpend: number;
  orders: number;
  averageOrder: number;
  lastOrder: string;
  favoriteMeals: string[];
  pickupOrders: number;
  deliveryOrders: number;
  returning: boolean;
  orderIds: string[];
};

export type AdminMenuMeal = WeeklyMeal & {
  available: boolean;
  premiumCharge: number;
  archived?: boolean;
};

const mealById = new Map(weeklyMenu.meals.map((meal) => [meal.id, meal]));

function item(mealId: string, quantity: number, id: string): AdminOrderItem {
  const meal = mealById.get(mealId);
  if (!meal) throw new Error(`Unknown demo meal: ${mealId}`);
  return {
    id,
    mealId,
    mealNumber: meal.mealNumber,
    mealName: meal.name,
    category: meal.category,
    quantity,
    unitPrice: meal.price,
    premiumCharge: meal.premium ? 2 : 0,
  };
}

function record(input: Omit<AdminOrder, 'meals' | 'mealCount' | 'mealSubtotal' | 'premiumCharges' | 'total'>): AdminOrder {
  const mealCount = input.items.reduce((sum, orderItem) => sum + orderItem.quantity, 0);
  const mealSubtotal = input.items.reduce((sum, orderItem) => sum + orderItem.unitPrice * orderItem.quantity, 0);
  const premiumCharges = input.items.reduce((sum, orderItem) => sum + orderItem.premiumCharge * orderItem.quantity, 0);
  const total = mealSubtotal + premiumCharges + input.deliveryCharge;
  return {
    ...input,
    meals: input.items.map((orderItem) => `#${orderItem.mealNumber} × ${orderItem.quantity}`).join(', '),
    mealCount,
    mealSubtotal,
    premiumCharges,
    total,
  };
}

export const demoOrders: AdminOrder[] = [
  record({
    id: 'ord-1048',
    orderNumber: '#904-1048',
    customerId: 'cust-01',
    customer: 'Maya Johnson',
    phone: '(904) 555-0108',
    email: 'maya.johnson@example.com',
    address: 'Riverside, Jacksonville',
    deliveryZone: '',
    notes: 'Please have this ready at the start of the pickup window.',
    items: [item('teriyaki-chicken-bowl', 2, '1048-4'), item('jerk-chicken', 2, '1048-5'), item('smoky-salmon-bowl', 1, '1048-10')],
    deliveryCharge: 0,
    paymentMethod: 'Square / Apple Pay',
    fulfillment: 'Pickup',
    window: 'Sunday / 10:00 AM–12:00 PM',
    payment: 'Paid',
    status: 'New',
    date: 'Aug 29, 2026',
  }),
  record({
    id: 'ord-1047',
    orderNumber: '#904-1047',
    customerId: 'cust-02',
    customer: 'Jordan Williams',
    phone: '(904) 555-0142',
    email: 'jordan.w@example.com',
    address: 'Arlington, Jacksonville',
    deliveryZone: 'East Jacksonville',
    notes: 'Leave with the front desk if no answer.',
    items: [item('three-egg-breakfast', 2, '1047-1'), item('tex-mex-beefy-mac', 2, '1047-6'), item('smoky-salmon-bowl', 1, '1047-10')],
    deliveryCharge: 7,
    paymentMethod: 'Venmo',
    fulfillment: 'Delivery',
    window: 'Sunday / 12:00 PM–2:00 PM',
    payment: 'Payment Pending',
    status: 'Confirmed',
    date: 'Aug 29, 2026',
  }),
  record({
    id: 'ord-1046',
    orderNumber: '#904-1046',
    customerId: 'cust-03',
    customer: 'Chris Davis',
    phone: '(904) 555-0167',
    email: 'chris.davis@example.com',
    address: 'Southside, Jacksonville',
    deliveryZone: 'Core 904 zone',
    notes: '',
    items: [item('biscuits-gravy-bowl', 1, '1046-2'), item('buffalo-ranch-home-fries', 2, '1046-7'), item('buttery-garlic-chicken', 1, '1046-8')],
    deliveryCharge: 5,
    paymentMethod: 'Zelle',
    fulfillment: 'Delivery',
    window: 'Sunday / 10:00 AM–12:00 PM',
    payment: 'Payment Pending',
    status: 'New',
    date: 'Aug 28, 2026',
  }),
  record({
    id: 'ord-1045',
    orderNumber: '#904-1045',
    customerId: 'cust-04',
    customer: 'Alyssa Brown',
    phone: '(904) 555-0193',
    email: 'alyssa.brown@example.com',
    address: 'Murray Hill, Jacksonville',
    deliveryZone: '',
    notes: '',
    items: [item('steak-egg-cheese-croissant', 2, '1045-3'), item('teriyaki-chicken-bowl', 1, '1045-4'), item('chicken-caprese-wrap', 2, '1045-9')],
    deliveryCharge: 0,
    paymentMethod: 'Cash App',
    fulfillment: 'Pickup',
    window: 'Sunday / 12:00 PM–2:00 PM',
    payment: 'Paid',
    status: 'Preparing',
    date: 'Aug 28, 2026',
  }),
  record({
    id: 'ord-1044',
    orderNumber: '#904-1044',
    customerId: 'cust-05',
    customer: 'Devin Carter',
    phone: '(904) 555-0124',
    email: 'devin.carter@example.com',
    address: 'Jacksonville Beach',
    deliveryZone: 'Beaches area',
    notes: 'Call when you are on the way.',
    items: [item('jerk-chicken', 3, '1044-5'), item('smoky-salmon-bowl', 2, '1044-10')],
    deliveryCharge: 9,
    paymentMethod: 'Square / Apple Pay',
    fulfillment: 'Delivery',
    window: 'Monday / 4:00 PM–6:00 PM',
    payment: 'Paid',
    status: 'Out for Delivery',
    date: 'Aug 27, 2026',
  }),
  record({
    id: 'ord-1043',
    orderNumber: '#904-1043',
    customerId: 'cust-01',
    customer: 'Maya Johnson',
    phone: '(904) 555-0108',
    email: 'maya.johnson@example.com',
    address: 'Riverside, Jacksonville',
    deliveryZone: '',
    notes: '',
    items: [item('three-egg-breakfast', 2, '1043-1'), item('teriyaki-chicken-bowl', 2, '1043-4')],
    deliveryCharge: 0,
    paymentMethod: 'Square / Apple Pay',
    fulfillment: 'Pickup',
    window: 'Sunday / 10:00 AM–12:00 PM',
    payment: 'Paid',
    status: 'Completed',
    date: 'Aug 21, 2026',
  }),
];

export const demoMeals: AdminMenuMeal[] = weeklyMenu.meals.map((meal) => ({
  ...meal,
  available: true,
  premiumCharge: meal.premium ? 2 : 0,
}));

export function deriveCustomers(orders: AdminOrder[]): AdminCustomer[] {
  const grouped = new Map<string, AdminOrder[]>();
  for (const order of orders) grouped.set(order.customerId, [...(grouped.get(order.customerId) || []), order]);
  return [...grouped.entries()].map(([id, customerOrders]) => {
    const first = customerOrders[0];
    const paidOrders = customerOrders.filter((order) => order.payment === 'Paid');
    const spend = paidOrders.reduce((sum, order) => sum + order.total, 0);
    const mealCounts = new Map<string, number>();
    customerOrders.flatMap((order) => order.items).forEach((orderItem) => mealCounts.set(orderItem.mealName, (mealCounts.get(orderItem.mealName) || 0) + orderItem.quantity));
    const favorites = [...mealCounts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 3).map(([name]) => name);
    return {
      id,
      name: first.customer,
      phone: first.phone,
      email: first.email,
      address: first.address,
      lifetimeSpend: Number(spend.toFixed(2)),
      orders: customerOrders.length,
      averageOrder: Number((spend / Math.max(1, paidOrders.length)).toFixed(2)),
      lastOrder: customerOrders[0].date,
      favoriteMeals: favorites,
      pickupOrders: customerOrders.filter((order) => order.fulfillment === 'Pickup').length,
      deliveryOrders: customerOrders.filter((order) => order.fulfillment === 'Delivery').length,
      returning: customerOrders.length > 1,
      orderIds: customerOrders.map((order) => order.id),
    };
  });
}

export function derivePrepTotals(orders: AdminOrder[]) {
  const prep = new Map<string, { mealNumber: number; name: string; category: string; quantity: number; revenue: number }>();
  orders.filter((order) => order.status !== 'Cancelled').flatMap((order) => order.items).forEach((orderItem) => {
    const current = prep.get(orderItem.mealId) || { mealNumber: orderItem.mealNumber, name: orderItem.mealName, category: orderItem.category, quantity: 0, revenue: 0 };
    current.quantity += orderItem.quantity;
    current.revenue += (orderItem.unitPrice + orderItem.premiumCharge) * orderItem.quantity;
    prep.set(orderItem.mealId, current);
  });
  return [...prep.values()].sort((a, b) => a.mealNumber - b.mealNumber).map((meal) => ({ ...meal, revenue: Number(meal.revenue.toFixed(2)) }));
}

export const demoCustomers = deriveCustomers(demoOrders);
export const prepTotals = derivePrepTotals(demoOrders);

export const weeklyAnalytics = [
  { week: 'Jul 13', revenue: 1890, orders: 34, meals: 142 },
  { week: 'Jul 20', revenue: 2145, orders: 38, meals: 161 },
  { week: 'Jul 27', revenue: 2010, orders: 36, meals: 153 },
  { week: 'Aug 03', revenue: 2320, orders: 41, meals: 179 },
  { week: 'Aug 10', revenue: 2210, orders: 39, meals: 167 },
  { week: 'Aug 17', revenue: 2475, orders: 44, meals: 190 },
  { week: 'Aug 24', revenue: 2348, orders: 42, meals: 267 },
];

export const popularMeals = [
  { name: 'Jerk Chicken Bowl', units: 188, appearances: 9, average: 20.9, revenue: 2585, lastAppeared: 'Aug 24, 2026' },
  { name: 'Teriyaki Chicken Bowl', units: 164, appearances: 8, average: 20.5, revenue: 2091, lastAppeared: 'Aug 24, 2026' },
  { name: 'Smoky Salmon Bowl', units: 96, appearances: 6, average: 16, revenue: 1488, lastAppeared: 'Aug 24, 2026' },
  { name: 'Chicken Caprese Wrap', units: 91, appearances: 7, average: 13, revenue: 1070, lastAppeared: 'Aug 24, 2026' },
  { name: 'Steak Egg & Cheese Croissant', units: 72, appearances: 5, average: 14.4, revenue: 1170, lastAppeared: 'Aug 17, 2026' },
];