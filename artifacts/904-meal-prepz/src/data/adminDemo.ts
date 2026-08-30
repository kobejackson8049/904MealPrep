export type AdminOrderStatus = 'New' | 'Confirmed' | 'Preparing' | 'Ready' | 'Out for Delivery' | 'Completed' | 'Cancelled';
export type PaymentStatus = 'Paid' | 'Payment Pending' | 'Unpaid' | 'Refunded';
export type PaymentMethod = 'Square / Apple Pay' | 'Cash App' | 'Venmo' | 'Zelle' | 'Other manual';

export type AdminOrder = {
  id: string;
  orderNumber: string;
  customerId: string;
  customer: string;
  phone: string;
  email: string;
  meals: string;
  mealCount: number;
  mealSubtotal: number;
  premiumCharges: number;
  deliveryCharge: number;
  total: number;
  paymentMethod: PaymentMethod;
  fulfillment: 'Pickup' | 'Delivery';
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
};

export const demoOrders: AdminOrder[] = [
  { id: 'ord-1048', orderNumber: '#904-1048', customerId: 'cust-01', customer: 'Maya Johnson', phone: '(904) 555-0108', email: 'maya.johnson@example.com', meals: '#4 × 2, #5 × 2, #10 × 1', mealCount: 5, mealSubtotal: 66.5, premiumCharges: 2, deliveryCharge: 0, total: 68.5, paymentMethod: 'Square / Apple Pay', fulfillment: 'Pickup', window: 'Sunday / 10:00 AM–12:00 PM', payment: 'Paid', status: 'New', date: 'Aug 29, 2026' },
  { id: 'ord-1047', orderNumber: '#904-1047', customerId: 'cust-02', customer: 'Jordan Williams', phone: '(904) 555-0142', email: 'jordan.w@example.com', meals: '#1 × 2, #6 × 2, #11 × 1', mealCount: 5, mealSubtotal: 66.5, premiumCharges: 2, deliveryCharge: 7, total: 75.5, paymentMethod: 'Venmo', fulfillment: 'Delivery', window: 'Sunday / 12:00 PM–2:00 PM', payment: 'Payment Pending', status: 'Confirmed', date: 'Aug 29, 2026' },
  { id: 'ord-1046', orderNumber: '#904-1046', customerId: 'cust-03', customer: 'Chris Davis', phone: '(904) 555-0167', email: 'chris.davis@example.com', meals: '#2 × 1, #7 × 2, #8 × 1', mealCount: 4, mealSubtotal: 51.5, premiumCharges: 0, deliveryCharge: 5, total: 56.5, paymentMethod: 'Zelle', fulfillment: 'Delivery', window: 'Sunday / 10:00 AM–12:00 PM', payment: 'Payment Pending', status: 'New', date: 'Aug 28, 2026' },
  { id: 'ord-1045', orderNumber: '#904-1045', customerId: 'cust-04', customer: 'Alyssa Brown', phone: '(904) 555-0193', email: 'alyssa.brown@example.com', meals: '#3 × 2, #4 × 1, #9 × 2', mealCount: 5, mealSubtotal: 56.25, premiumCharges: 0, deliveryCharge: 0, total: 56.25, paymentMethod: 'Cash App', fulfillment: 'Pickup', window: 'Sunday / 12:00 PM–2:00 PM', payment: 'Paid', status: 'Preparing', date: 'Aug 28, 2026' },
  { id: 'ord-1044', orderNumber: '#904-1044', customerId: 'cust-05', customer: 'Devin Carter', phone: '(904) 555-0124', email: 'devin.carter@example.com', meals: '#5 × 3, #10 × 2', mealCount: 5, mealSubtotal: 72.25, premiumCharges: 4, deliveryCharge: 9, total: 85.25, paymentMethod: 'Square / Apple Pay', fulfillment: 'Delivery', window: 'Monday / 4:00 PM–6:00 PM', payment: 'Paid', status: 'Out for Delivery', date: 'Aug 27, 2026' },
  { id: 'ord-1043', orderNumber: '#904-1043', customerId: 'cust-01', customer: 'Maya Johnson', phone: '(904) 555-0108', email: 'maya.johnson@example.com', meals: '#1 × 2, #4 × 2', mealCount: 4, mealSubtotal: 41.5, premiumCharges: 0, deliveryCharge: 0, total: 41.5, paymentMethod: 'Square / Apple Pay', fulfillment: 'Pickup', window: 'Sunday / 10:00 AM–12:00 PM', payment: 'Paid', status: 'Completed', date: 'Aug 21, 2026' },
];

export const demoCustomers: AdminCustomer[] = [
  { id: 'cust-01', name: 'Maya Johnson', phone: '(904) 555-0108', email: 'maya.johnson@example.com', address: 'Riverside, Jacksonville', lifetimeSpend: 384.5, orders: 8, averageOrder: 48.06, lastOrder: 'Aug 29, 2026', favoriteMeals: ['Jerk Chicken Bowl', 'Teriyaki Chicken Bowl'], pickupOrders: 7, deliveryOrders: 1, returning: true },
  { id: 'cust-02', name: 'Jordan Williams', phone: '(904) 555-0142', email: 'jordan.w@example.com', address: 'Arlington, Jacksonville', lifetimeSpend: 220.75, orders: 4, averageOrder: 55.19, lastOrder: 'Aug 29, 2026', favoriteMeals: ['Steak Chimichurri', 'Tex-Mex Beefy Mac'], pickupOrders: 1, deliveryOrders: 3, returning: true },
  { id: 'cust-03', name: 'Chris Davis', phone: '(904) 555-0167', email: 'chris.davis@example.com', address: 'Southside, Jacksonville', lifetimeSpend: 56.5, orders: 1, averageOrder: 56.5, lastOrder: 'Aug 28, 2026', favoriteMeals: ['Buffalo Ranch Chicken'], pickupOrders: 0, deliveryOrders: 1, returning: false },
  { id: 'cust-04', name: 'Alyssa Brown', phone: '(904) 555-0193', email: 'alyssa.brown@example.com', address: 'Murray Hill, Jacksonville', lifetimeSpend: 171.25, orders: 3, averageOrder: 57.08, lastOrder: 'Aug 28, 2026', favoriteMeals: ['Chicken Caprese Wrap', 'Steak Egg & Cheese'], pickupOrders: 3, deliveryOrders: 0, returning: true },
  { id: 'cust-05', name: 'Devin Carter', phone: '(904) 555-0124', email: 'devin.carter@example.com', address: 'Jacksonville Beach', lifetimeSpend: 85.25, orders: 1, averageOrder: 85.25, lastOrder: 'Aug 27, 2026', favoriteMeals: ['Smoky Salmon Bowl'], pickupOrders: 0, deliveryOrders: 1, returning: false },
];

export const prepTotals = [
  { mealNumber: 1, name: '3 Egg Breakfast', category: 'Breakfast', quantity: 24, revenue: 192 },
  { mealNumber: 2, name: 'Biscuits & Gravy Bowl', category: 'Breakfast', quantity: 18, revenue: 171 },
  { mealNumber: 3, name: 'Steak Egg & Cheese Croissant', category: 'Breakfast', quantity: 16, revenue: 168 },
  { mealNumber: 4, name: 'Teriyaki Chicken Bowl', category: 'Entrées', quantity: 36, revenue: 459 },
  { mealNumber: 5, name: 'Jerk Chicken Bowl', category: 'Entrées', quantity: 42, revenue: 577.5 },
  { mealNumber: 6, name: 'Tex-Mex Beefy Mac', category: 'Entrées', quantity: 29, revenue: 384.25 },
  { mealNumber: 7, name: 'Buffalo Ranch Home Fries', category: 'Entrées', quantity: 21, revenue: 299.25 },
  { mealNumber: 8, name: 'Buttery Garlic Chicken', category: 'Healthier Entrées', quantity: 27, revenue: 357.75 },
  { mealNumber: 9, name: 'Chicken Caprese Wrap', category: 'Healthier Entrées', quantity: 22, revenue: 258.5 },
  { mealNumber: 10, name: 'Smoky Salmon Bowl', category: 'Premium Meals', quantity: 19, revenue: 294.5 },
  { mealNumber: 11, name: 'Steak Chimichurri', category: 'Premium Meals', quantity: 13, revenue: 211.25 },
];

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
  { name: 'Steak Chimichurri', units: 72, appearances: 5, average: 14.4, revenue: 1170, lastAppeared: 'Aug 17, 2026' },
];