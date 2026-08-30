import { useEffect, useMemo, useState, type FormEvent, type ReactNode } from 'react';
import { BarChart3, CalendarDays, Check, CheckCircle2, ChefHat, ClipboardList, Clock3, Download, Eye, FileText, LayoutDashboard, LogOut, MapPin, Menu as MenuIcon, Pencil, Printer, Search, Settings2, ShieldCheck, Truck, Users, UtensilsCrossed, X } from 'lucide-react';
import { useLocation } from 'wouter';
import { demoMeals, demoOrders, deriveCustomers, derivePrepTotals, popularMeals, weeklyAnalytics, type AdminCustomer, type AdminMenuMeal, type AdminOrder, type AdminOrderStatus, type PaymentMethod, type PaymentStatus } from '@/data/adminDemo';
import { weeklyMenu, type MenuCategory } from '@/data/weeklyMenu';

type AdminTab = 'Overview' | 'Orders' | 'Kitchen prep' | 'Customers' | 'Weekly menu' | 'Analytics' | 'Fulfillment' | 'Payments' | 'Settings' | 'Meal library' | 'Gallery';
type Pricing = { standardPrice: number; premiumCharge: number };
type MenuDraft = {
  weekLabel: string;
  orderDeadline: string;
  deadlineLabel: string;
  announcement: string;
  pickupWindows: string[];
  deliveryZones: typeof weeklyMenu.deliveryZones;
  activeMealIds: string[];
  savedAt: string;
};
type Settings = {
  businessName: string;
  phone: string;
  email: string;
  instagram: string;
  pickupInformation: string;
  announcement: string;
  pricing: Pricing;
  showDemoLabel: boolean;
  cashAppHandle: string; applePayHandle: string; venmoHandle: string; zelleContact: string;
  cashAppEnabled: boolean; applePayEnabled: boolean; venmoEnabled: boolean; zelleEnabled: boolean;
  applePayQrPath: string; cashAppQrPath: string; venmoQrPath: string; zelleQrPath: string;
};

const tabs: Array<{ id: AdminTab; route: string; icon: typeof LayoutDashboard }> = [
  { id: 'Overview', route: '/admin/dashboard', icon: LayoutDashboard },
  { id: 'Orders', route: '/admin/orders', icon: ClipboardList },
  { id: 'Kitchen prep', route: '/admin/kitchen-prep', icon: ChefHat },
  { id: 'Meal library', route: '/admin/meals', icon: UtensilsCrossed },
  { id: 'Gallery', route: '/admin/gallery', icon: Eye },
  { id: 'Weekly menu', route: '/admin/weekly-menu', icon: CalendarDays },
  { id: 'Customers', route: '/admin/customers', icon: Users },
  { id: 'Analytics', route: '/admin/analytics', icon: BarChart3 },
  { id: 'Fulfillment', route: '/admin/fulfillment', icon: Truck },
  { id: 'Payments', route: '/admin/payments', icon: ShieldCheck },
  { id: 'Settings', route: '/admin/settings', icon: Settings2 },
];
const statuses: AdminOrderStatus[] = ['New', 'Confirmed', 'Preparing', 'Ready', 'Out for Delivery', 'Completed', 'Cancelled'];
const statusNext: Partial<Record<AdminOrderStatus, AdminOrderStatus>> = { New: 'Confirmed', Confirmed: 'Preparing', Preparing: 'Ready', Ready: 'Out for Delivery', 'Out for Delivery': 'Completed' };
const paymentMethods: PaymentMethod[] = ['Square', 'Apple Pay', 'Cash App', 'Venmo', 'Zelle', 'Other manual'];
const categories: MenuCategory[] = ['Breakfast', 'Entrées', 'Healthier Entrées', 'Premium Meals'];
const defaultSettings: Settings = {
  businessName: '904 Meal Prepz',
  phone: '',
  email: '',
  instagram: '',
  pickupInformation: 'Pickup details are configured by the owner.',
  announcement: 'Preorder by Saturday at noon for Sunday pickup or local delivery.',
  pricing: { standardPrice: 8, premiumCharge: 2 },
  showDemoLabel: true,
  cashAppHandle: '$904mealprepz', applePayHandle: '', venmoHandle: '', zelleContact: '',
  cashAppEnabled: true, applePayEnabled: true, venmoEnabled: true, zelleEnabled: true,
  applePayQrPath: '', cashAppQrPath: '', venmoQrPath: '', zelleQrPath: '',
};

function tabForRoute(path: string): AdminTab {
  return tabs.find((tab) => path === tab.route)?.id || 'Overview';
}
function routeForTab(tab: AdminTab) {
  return tabs.find((item) => item.id === tab)?.route || '/admin/dashboard';
}
function money(value: number) { return `$${value.toFixed(2)}`; }
function csvCell(value: string | number) { return `"${String(value).replaceAll('"', '""')}"`; }
function downloadCsv(filename: string, rows: Array<Array<string | number>>) {
  const content = rows.map((row) => row.map(csvCell).join(',')).join('\n');
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}
function readStorage<T>(key: string, fallback: T): T {
  try {
    const value = localStorage.getItem(key);
    return value ? JSON.parse(value) as T : fallback;
  } catch {
    return fallback;
  }
}
function apiBase() {
  return (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
}
function normalizeApiOrder(raw: Record<string, any>): AdminOrder {
  const status = String(raw.status).split('_').map((part) => part[0].toUpperCase() + part.slice(1)).join(' ') as AdminOrderStatus;
  const items = (raw.items || []).map((item: Record<string, any>) => ({
    id: item.id,
    mealId: item.mealId,
    mealNumber: item.mealNumberSnapshot,
    mealName: item.mealNameSnapshot,
    category: item.categorySnapshot,
    quantity: item.quantity,
    unitPrice: Number(item.unitPriceSnapshot),
    premiumCharge: Number(item.premiumChargeSnapshot),
  }));
  const paymentMap: Record<string, PaymentStatus> = { paid: 'Paid', pending: 'Payment Pending', unpaid: 'Unpaid', refunded: 'Refunded' };
  const methodMap: Record<string, PaymentMethod> = { square: 'Square', apple_pay: 'Apple Pay', cash_app: 'Cash App', venmo: 'Venmo', zelle: 'Zelle', other_manual: 'Other manual' };
  return {
    id: raw.id, orderNumber: raw.orderNumber, customerId: raw.customerId, customer: raw.customerName, phone: raw.customerPhone, email: raw.customerEmail,
    address: raw.deliveryAddress || '', deliveryZone: raw.deliveryZone || '', notes: raw.notes || '', items,
    meals: items.map((item: any) => `#${item.mealNumber} × ${item.quantity}`).join(', '), mealCount: items.reduce((sum: number, item: any) => sum + item.quantity, 0),
    mealSubtotal: Number(raw.mealSubtotal), premiumCharges: Number(raw.premiumCharges), deliveryCharge: Number(raw.deliveryFee), total: Number(raw.total),
    paymentMethod: methodMap[raw.paymentMethod] || 'Other manual', fulfillment: raw.fulfillment === 'delivery' ? 'Delivery' : 'Pickup',
    window: raw.pickupWindow || raw.deliveryZone || '', payment: paymentMap[raw.paymentStatus] || 'Unpaid', status,
    expectedSenderName: raw.expectedSenderName || '', paymentSubmittedAt: raw.paymentSubmittedAt || '', paymentConfirmedAt: raw.paymentConfirmedAt || '', paymentConfirmedBy: raw.paymentConfirmedBy || '',
    date: new Date(raw.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
  };
}
function readPreviewOrders(): AdminOrder[] {
  const overrides = readStorage<Record<string, Partial<AdminOrder>>>('904-preview-order-overrides', {});
  return [...readStorage<Array<Record<string, any>>>('904-preview-api-orders', []).map(normalizeApiOrder), ...demoOrders]
    .map((order) => ({ ...order, ...overrides[order.id] }));
}
function persistPreviewOrderOverride(id: string, changes: Partial<AdminOrder>) {
  const overrides = readStorage<Record<string, Partial<AdminOrder>>>('904-preview-order-overrides', {});
  localStorage.setItem('904-preview-order-overrides', JSON.stringify({ ...overrides, [id]: { ...overrides[id], ...changes } }));
}
function createDraft(meals: AdminMenuMeal[]): MenuDraft {
  return {
    weekLabel: 'Week of August 24–30',
    orderDeadline: weeklyMenu.orderDeadline.slice(0, 16),
    deadlineLabel: 'Saturday at noon',
    announcement: defaultSettings.announcement,
    pickupWindows: ['Sunday / 10:00 AM–12:00 PM', 'Sunday / 12:00 PM–2:00 PM'],
    deliveryZones: weeklyMenu.deliveryZones,
    activeMealIds: meals.filter((meal) => !meal.archived).map((meal) => meal.id),
    savedAt: 'Not saved yet',
  };
}
function publishToPublicMenu(draft: MenuDraft, meals: AdminMenuMeal[], pricing: Pricing) {
  const publicMeals = meals.filter((meal) => draft.activeMealIds.includes(meal.id) && !meal.archived).map((meal) => ({
    id: meal.id,
    mealNumber: meal.mealNumber,
    name: meal.name,
    description: meal.description,
    category: meal.category,
    price: pricing.standardPrice,
    premium: meal.premium,
    premiumCharge: meal.premium ? pricing.premiumCharge : 0,
    calories: meal.calories,
    protein: meal.protein,
    carbs: meal.carbs,
    image: meal.image,
    tag: meal.premium ? `Premium / ${money(pricing.standardPrice + pricing.premiumCharge)}` : `Standard / ${money(pricing.standardPrice)}`,
  }));
  localStorage.setItem('904-published-menu', JSON.stringify({ ...weeklyMenu, ...draft, meals: publicMeals, publishedAt: new Date().toISOString() }));
}

export default function AdminApp() {
  const previewAllowed = import.meta.env.DEV || import.meta.env.VITE_ADMIN_PREVIEW === 'true';
  const previewMode = previewAllowed && (new URLSearchParams(window.location.search).get('preview') === '1' || sessionStorage.getItem('904-admin-preview') === '1');
  const [apiSession, setApiSession] = useState(false);
  const [activeMenuId, setActiveMenuId] = useState(weeklyMenu.id);
  const [authenticated, setAuthenticated] = useState(previewMode);
  const [location, setLocation] = useLocation();
  const tab = tabForRoute(location);
  const [mobileNav, setMobileNav] = useState(false);
  const [orders, setOrders] = useState<AdminOrder[]>(readPreviewOrders);
  const [meals, setMeals] = useState<AdminMenuMeal[]>(demoMeals);
  const [menuDraft, setMenuDraft] = useState<MenuDraft>(() => readStorage('904-menu-draft', createDraft(demoMeals)));
  const [publishedMealIds, setPublishedMealIds] = useState<string[]>(() => readStorage<string[]>('904-published-meal-ids', demoMeals.map((meal) => meal.id)));
  const [menuHistory, setMenuHistory] = useState<Array<{ label: string; publishedAt: string; mealCount: number }>>([]);
  const [settings, setSettings] = useState<Settings>(() => readStorage('904-admin-settings', defaultSettings));
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedCustomerId, setSelectedCustomerId] = useState<string | null>(null);
  const [selectedPrepMeal, setSelectedPrepMeal] = useState<string | null>(null);
  const [mealEditor, setMealEditor] = useState<'new' | string | null>(null);
  const [toast, setToast] = useState('');
  const customers = useMemo(() => deriveCustomers(orders), [orders]);
  const prep = useMemo(() => derivePrepTotals(orders), [orders]);
  const selectedOrder = orders.find((order) => order.id === selectedOrderId) || null;
  const selectedCustomer = customers.find((customer) => customer.id === selectedCustomerId) || null;

  useEffect(() => {
    if (previewAllowed && new URLSearchParams(window.location.search).get('preview') === '1') {
      sessionStorage.setItem('904-admin-preview', '1');
    }
  }, [previewAllowed]);

  useEffect(() => {
    if (previewMode || authenticated) return;
    fetch(`${apiBase()}/admin/session`, { credentials: 'include' }).then((response) => {
      if (response.ok) {
        setApiSession(true);
        setAuthenticated(true);
      }
    }).catch(() => undefined);
  }, [authenticated, previewMode]);

  useEffect(() => {
    if (!authenticated || !apiSession || previewMode) return;
    Promise.all([
      fetch(`${apiBase()}/admin/orders`, { credentials: 'include' }).then((response) => response.ok ? response.json() : Promise.reject(new Error('orders'))),
      fetch(`${apiBase()}/admin/settings`, { credentials: 'include' }).then((response) => response.ok ? response.json() : null),
      fetch(`${apiBase()}/admin/menus`, { credentials: 'include' }).then((response) => response.ok ? response.json() : Promise.reject(new Error('menus'))),
    ]).then(([apiOrders, apiSettings, apiMenus]) => {
      setOrders(apiOrders.map(normalizeApiOrder));
      if (apiSettings) setSettings({ ...defaultSettings, ...apiSettings, cashAppHandle: apiSettings.cashAppHandle || '$904mealprepz', pricing: { standardPrice: Number(apiSettings.standardPrice), premiumCharge: Number(apiSettings.premiumCharge) } });
      const activeMenu = apiMenus.find((menu: Record<string, any>) => menu.status === 'draft');
      if (activeMenu) {
        setActiveMenuId(activeMenu.id);
        const apiMeals: AdminMenuMeal[] = activeMenu.meals.map((meal: Record<string, any>) => ({
          id: meal.id, mealNumber: meal.mealNumber, name: meal.name, description: meal.description, category: meal.category,
          image: meal.image, calories: meal.calories, protein: meal.protein, carbs: meal.carbs,
          price: Number(meal.price), premiumCharge: Number(meal.premiumCharge), premium: Number(meal.premiumCharge) > 0, available: meal.available, soldOut: meal.soldOut, archived: meal.archived,
        }));
        setMeals(apiMeals);
        setMenuDraft({ weekLabel: activeMenu.weekLabel, orderDeadline: new Date(activeMenu.orderDeadline).toISOString().slice(0, 16), deadlineLabel: activeMenu.deadlineLabel, announcement: activeMenu.announcement || '', pickupWindows: activeMenu.pickupWindows || [], deliveryZones: weeklyMenu.deliveryZones, activeMealIds: apiMeals.filter((meal) => meal.available && !meal.archived).map((meal) => meal.id), savedAt: activeMenu.updatedAt ? new Date(activeMenu.updatedAt).toLocaleString() : 'Loaded from API' });
        if (activeMenu.status === 'published') setPublishedMealIds(apiMeals.filter((meal) => meal.available && !meal.archived).map((meal) => meal.id));
      } else if (apiSession) {
        const published = apiMenus.find((menu: Record<string, any>) => menu.status === 'published');
        const endpoint = published ? `${apiBase()}/admin/menus/${published.id}/clone` : `${apiBase()}/admin/menus`;
        const body = published ? undefined : JSON.stringify({ id: weeklyMenu.id, weekLabel: weeklyMenu.weekLabel, orderDeadline: weeklyMenu.orderDeadline, deadlineLabel: weeklyMenu.deadlineLabel, announcement: '', pickupWindows: weeklyMenu.pickupWindows, status: 'draft' });
        fetch(endpoint, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body }).then(async (response) => {
          if (!response.ok) throw new Error('menu initialization');
          const created = await response.json();
          setActiveMenuId(created.id);
          if (published && Array.isArray(created.meals)) {
            const clonedMeals: AdminMenuMeal[] = created.meals.map((meal: Record<string, any>) => ({
              id: meal.id, mealNumber: meal.mealNumber, name: meal.name, description: meal.description, category: meal.category,
              image: meal.image, calories: meal.calories, protein: meal.protein, carbs: meal.carbs, price: Number(meal.price),
              premiumCharge: Number(meal.premiumCharge), premium: Number(meal.premiumCharge) > 0,
              available: meal.available, soldOut: meal.soldOut, archived: meal.archived,
            }));
            setMeals(clonedMeals);
            setMenuDraft(createDraft(clonedMeals));
          } else if (!published) {
            const responses = await Promise.all(demoMeals.map((meal) => fetch(`${apiBase()}/admin/meals`, {
              method: 'POST',
              credentials: 'include',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ ...meal, menuId: created.id }),
            })));
            if (!responses.every((response) => response.ok)) throw new Error('meal initialization');
          }
        }).catch(() => setToast('The first menu could not be initialized.'));
      }
    }).catch(() => setToast('The protected API could not hydrate this workspace.'));
  }, [apiSession, authenticated, previewMode]);

  if (!authenticated) return <AdminAuthGate previewAllowed={previewAllowed} onPreview={() => { sessionStorage.setItem('904-admin-preview', '1'); setAuthenticated(true); }} onAuthenticate={async (password) => {
    const response = await fetch(`${apiBase()}/admin/login`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ password }) });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (response.status === 401) return { ok: false, error: 'Incorrect password.' };
      if (response.status === 503) return { ok: false, error: 'Owner login is temporarily unavailable while the secure database connection is restored.' };
      return { ok: false, error: payload.error || 'Owner login could not be completed. Please try again.' };
    }
    setApiSession(true);
    setAuthenticated(true);
    return { ok: true };
  }} />;

  function notify(message: string) {
    setToast(message);
    window.setTimeout(() => setToast(''), 2800);
  }
  async function changeStatus(id: string, status: AdminOrderStatus) {
    if (apiSession) {
      const apiStatus = status.toLowerCase().replaceAll(' ', '_');
      const response = await fetch(`${apiBase()}/admin/orders/${id}/status`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: apiStatus }) });
      if (!response.ok) { notify('Order status could not be saved.'); return; }
    } else {
      persistPreviewOrderOverride(id, { status });
    }
    setOrders((current) => current.map((order) => order.id === id ? { ...order, status } : order));
    const changedOrder = orders.find((order) => order.id === id);
    notify(status === 'Confirmed' && changedOrder?.payment !== 'Paid'
      ? `Order ${changedOrder?.orderNumber || ''} is confirmed. Use “Confirm payment received” after verifying the transfer.`
      : `Order ${changedOrder?.orderNumber || ''} marked ${status.toLowerCase()}.`);
  }
  async function markPaid(id: string) {
    const target = orders.find((order) => order.id === id);
    if (!target || !window.confirm(`Confirm receipt of ${money(target.total)} for ${target.orderNumber} from ${target.expectedSenderName || target.customer}? This will mark the payment paid and email the customer.`)) return;
    if (apiSession) {
      const response = await fetch(`${apiBase()}/admin/orders/${id}/payment`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status: 'paid' }) });
      if (!response.ok) { notify('Payment status could not be saved.'); return; }
    } else {
      persistPreviewOrderOverride(id, { payment: 'Paid', status: 'Confirmed', paymentConfirmedAt: new Date().toISOString(), paymentConfirmedBy: 'owner' });
    }
    setOrders((current) => current.map((order) => order.id === id && order.payment !== 'Refunded' ? { ...order, payment: 'Paid', status: 'Confirmed', paymentConfirmedAt: new Date().toISOString(), paymentConfirmedBy: 'owner' } : order));
    notify('Payment status updated. Revenue, customer spend, and analytics recalculated.');
  }
  async function updateMeal(id: string, changes: Partial<AdminMenuMeal>) {
    if (apiSession) {
      const response = await fetch(`${apiBase()}/admin/meals/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) });
      if (!response.ok) { notify('Meal update could not be saved.'); return; }
    }
    setMeals((current) => current.map((meal) => meal.id === id ? { ...meal, ...changes } : meal));
    setMenuDraft((current) => ({ ...current, activeMealIds: changes.archived ? current.activeMealIds.filter((mealId) => mealId !== id) : current.activeMealIds }));
  }
  async function saveDraft() {
    const useApi = apiSession;
    if (useApi) {
      const response = await fetch(`${apiBase()}/admin/menus/${activeMenuId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekLabel: menuDraft.weekLabel, orderDeadline: menuDraft.orderDeadline, deadlineLabel: menuDraft.deadlineLabel, announcement: menuDraft.announcement, pickupWindows: menuDraft.pickupWindows }),
      });
      if (!response.ok) {
        notify('Draft could not be saved to the protected API.');
        return;
      }
    }
    setMenuDraft((current) => ({ ...current, savedAt: new Date().toLocaleString() }));
    localStorage.setItem('904-menu-draft', JSON.stringify({ ...menuDraft, savedAt: new Date().toLocaleString() }));
    notify('Weekly menu draft saved. It is not public until you publish it.');
  }
  async function publishMenu() {
    const useApi = apiSession;
    if (useApi) {
      const menuResponse = await fetch(`${apiBase()}/admin/menus/${activeMenuId}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ weekLabel: menuDraft.weekLabel, orderDeadline: menuDraft.orderDeadline, deadlineLabel: menuDraft.deadlineLabel, announcement: menuDraft.announcement, pickupWindows: menuDraft.pickupWindows }),
      });
      const mealResponses = await Promise.all(meals.map((meal) => fetch(`${apiBase()}/admin/meals/${meal.id}`, {
        method: 'PATCH',
        credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ available: menuDraft.activeMealIds.includes(meal.id) && !meal.archived }),
      })));
      const publishResponse = menuResponse.ok && mealResponses.every((response) => response.ok) ? await fetch(`${apiBase()}/admin/menus/${activeMenuId}/publish`, { method: 'POST', credentials: 'include' }) : null;
      if (!publishResponse?.ok) {
        notify('Menu could not be published through the protected API.');
        return;
      }
    }
    const currentPublished = meals.filter((meal) => publishedMealIds.includes(meal.id) && !meal.archived);
    setMenuHistory((history) => [{ label: menuDraft.weekLabel, publishedAt: new Date().toLocaleString(), mealCount: currentPublished.length }, ...history]);
    setPublishedMealIds(menuDraft.activeMealIds);
    localStorage.setItem('904-published-meal-ids', JSON.stringify(menuDraft.activeMealIds));
    publishToPublicMenu(menuDraft, meals, settings.pricing);
    notify('Menu published. The public menu and order builder now use this selection.');
  }
  function exportOrders() {
    downloadCsv('904-weekly-orders.csv', [['Order number', 'Customer', 'Phone', 'Email', 'Meals', 'Total meals', 'Meal subtotal', 'Premium charges', 'Delivery charge', 'Final total', 'Payment method', 'Payment status', 'Fulfillment', 'Window', 'Order status', 'Order date'], ...orders.map((order) => [order.orderNumber, order.customer, order.phone, order.email, order.meals, order.mealCount, order.mealSubtotal, order.premiumCharges, order.deliveryCharge, order.total, order.paymentMethod, order.payment, order.fulfillment, order.window, order.status, order.date])]);
  }
  function exportCustomers() {
    downloadCsv('904-customers.csv', [['Name', 'Phone', 'Email', 'Address', 'Lifetime spend', 'Orders', 'Average order', 'Last order', 'Favorite meals', 'Pickup orders', 'Delivery orders'], ...customers.map((customer) => [customer.name, customer.phone, customer.email, customer.address, customer.lifetimeSpend, customer.orders, customer.averageOrder, customer.lastOrder, customer.favoriteMeals.join('; '), customer.pickupOrders, customer.deliveryOrders])]);
  }
  function exportPrep() {
    downloadCsv('904-kitchen-prep.csv', [['Meal number', 'Meal', 'Category', 'Quantity', 'Revenue'], ...prep.map((meal) => [meal.mealNumber, meal.name, meal.category, meal.quantity, meal.revenue])]);
  }
  async function saveSettings(next: Settings) {
    if (apiSession) {
      const response = await fetch(`${apiBase()}/admin/settings`, { method: 'PUT', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ...next, standardPrice: next.pricing.standardPrice, premiumCharge: next.pricing.premiumCharge }) });
      if (!response.ok) { notify('Settings could not be saved.'); return; }
    }
    setSettings(next);
    localStorage.setItem('904-admin-settings', JSON.stringify(next));
    notify('Business settings saved in this preview.');
  }

  return (
    <div className="admin-shell min-h-[100dvh] bg-[#f3f5f2] text-[#173c3a]">
      <aside className={`fixed inset-y-0 left-0 z-40 w-[260px] bg-[#102d2b] px-5 py-6 text-[#f1eee6] transition-transform lg:translate-x-0 ${mobileNav ? 'translate-x-0' : '-translate-x-full'}`}>
        <div className="flex items-center justify-between"><a href="/" className="flex items-center gap-3" data-testid="link-admin-brand"><span className="h-12 w-9 overflow-hidden rounded-sm border border-[#e7bd32]/50 bg-[#f1eee6]"><img src="/images/brand/904-meal-prepz-logo.jpeg" alt="904 Meal Prepz logo" className="h-full w-full object-cover object-top" /></span><span className="text-sm font-extrabold leading-tight">904<br /><span className="text-[9px] tracking-[.2em]">OPS</span></span></a><button type="button" onClick={() => setMobileNav(false)} className="lg:hidden" aria-label="Close admin navigation"><X size={20} /></button></div>
        <div className="mt-12"><p className="px-3 text-[10px] font-bold uppercase tracking-[.18em] text-[#e7bd32]">Owner workspace</p><nav className="mt-4 space-y-1" aria-label="Admin navigation">{tabs.map(({ id, route, icon: Icon }) => <button key={id} type="button" onClick={() => { setLocation(route); setMobileNav(false); }} className={`flex w-full items-center gap-3 px-3 py-3 text-left text-sm font-semibold transition-colors ${tab === id ? 'bg-[#e7bd32] text-[#102d2b]' : 'text-[#f1eee6]/65 hover:bg-[#174d49] hover:text-[#f1eee6]'}`} data-testid={`admin-nav-${id.toLowerCase().replace(/\s/g, '-')}`}><Icon size={17} strokeWidth={1.8} />{id}</button>)}</nav></div>
        <div className="absolute inset-x-5 bottom-6 border-t border-[#f1eee6]/15 pt-5"><p className="text-xs text-[#f1eee6]/50">{settings.showDemoLabel ? 'Demo workspace' : 'Owner workspace'}</p><button type="button" onClick={() => { sessionStorage.removeItem('904-admin-preview'); void fetch(`${apiBase()}/admin/logout`, { method: 'POST', credentials: 'include' }).finally(() => { setApiSession(false); setAuthenticated(false); }); }} className="mt-3 flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#f1eee6]/70 hover:text-[#e7bd32]" data-testid="button-admin-logout"><LogOut size={15} /> Sign out</button></div>
      </aside>
      <div className="lg:pl-[260px]">
        <header className="sticky top-0 z-30 border-b border-[#173c3a]/10 bg-[#f3f5f2]/95 px-5 py-4 backdrop-blur lg:px-8"><div className="flex items-center justify-between gap-4"><button type="button" onClick={() => setMobileNav(true)} className="lg:hidden" aria-label="Open admin navigation"><MenuIcon size={22} /></button><div><p className="hidden text-[10px] font-bold uppercase tracking-[.18em] text-[#6d817e] sm:block">Sunday, August 30, 2026</p><h1 className="text-xl font-extrabold tracking-[-.03em]">{tab}</h1></div><div className="ml-auto flex items-center gap-3"><span className="hidden items-center gap-2 rounded-full bg-[#e4eee9] px-3 py-2 text-xs font-bold text-[#27625a] sm:flex"><span className="h-2 w-2 rounded-full bg-[#35a579]" /> {settings.showDemoLabel ? 'Live demo data' : 'Live operations'}</span><span className="grid h-9 w-9 place-items-center rounded-full bg-[#e7bd32] text-sm font-black">CJ</span></div></div></header>
        <main className="mx-auto max-w-[1500px] p-5 lg:p-8" data-testid="admin-dashboard">
          <div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#173c3a]/10 pb-6 sm:flex-row sm:items-end"><div><p className="text-[11px] font-bold uppercase tracking-[.18em] text-[#b28b17]">Week of August 24–30</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.05em] sm:text-4xl">{tab === 'Overview' ? 'Good morning, Christian.' : tab}</h2></div><div className="flex flex-wrap gap-2"><button type="button" onClick={exportOrders} className="inline-flex items-center gap-2 border border-[#173c3a]/20 px-3 py-2 text-xs font-bold uppercase tracking-[.1em] hover:bg-white" data-testid="button-export-orders"><Download size={15} /> Export orders</button>{tab === 'Kitchen prep' && <button type="button" onClick={() => window.print()} className="inline-flex items-center gap-2 bg-[#173c3a] px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-white hover:bg-[#27625a]" data-testid="button-print-prep"><Printer size={15} /> Print prep sheet</button>}</div></div>
          <div className="mb-6 flex items-start gap-3 border border-[#d8e3dc] bg-[#edf7f1] px-4 py-3 text-sm text-[#27625a]"><ShieldCheck size={17} className="mt-0.5 shrink-0" /><span><strong>Owner-only workspace.</strong> {settings.showDemoLabel ? 'This preview uses one normalized seeded order ledger. Production data is served only through the protected API.' : 'Production access and customer records remain behind the configured owner boundary.'}</span></div>
          {toast && <div className="mb-6 flex items-center gap-2 border border-[#5cc2a0] bg-[#e8f7ef] px-4 py-3 text-sm font-semibold text-[#27625a]" role="status"><CheckCircle2 size={17} />{toast}</div>}
          {tab === 'Overview' && <Overview orders={orders} customers={customers} onOrderClick={(order) => setSelectedOrderId(order.id)} onTab={(nextTab) => setLocation(routeForTab(nextTab))} />}
          {tab === 'Orders' && <Orders orders={orders} onOrderClick={(order) => setSelectedOrderId(order.id)} onStatusChange={changeStatus} onMarkPaid={markPaid} />}
          {tab === 'Kitchen prep' && <KitchenPrep orders={orders} prep={prep} selectedMeal={selectedPrepMeal} setSelectedMeal={setSelectedPrepMeal} onExport={exportPrep} />}
          {tab === 'Customers' && <Customers customers={customers} orders={orders} selected={selectedCustomer} setSelected={(customer) => setSelectedCustomerId(customer?.id || null)} onExport={exportCustomers} onOrderClick={(order) => setSelectedOrderId(order.id)} />}
          {tab === 'Weekly menu' && <MenuManager draft={menuDraft} meals={meals} publishedMealIds={publishedMealIds} history={menuHistory} onDraftChange={setMenuDraft} onSave={saveDraft} onPreview={() => notify(`${menuDraft.activeMealIds.length} meals are selected for the customer preview.`)} onPublish={publishMenu} onEditMeal={setMealEditor} />}
          {tab === 'Meal library' && <MealLibrary meals={meals} onEdit={setMealEditor} onArchive={(meal) => updateMeal(meal.id, { archived: !meal.archived, available: Boolean(meal.archived) })} />}
          {tab === 'Analytics' && <Analytics orders={orders} meals={meals} />}
          {tab === 'Fulfillment' && <Fulfillment orders={orders} onStatusChange={changeStatus} />}
          {tab === 'Payments' && <Payments orders={orders} onMarkPaid={markPaid} />}
          {tab === 'Settings' && <SettingsPage settings={settings} onSave={saveSettings} />}
          {tab === 'Gallery' && <GalleryManager apiSession={apiSession} meals={meals} />}
        </main>
      </div>
      {selectedOrder && <OrderDetail order={selectedOrder} onClose={() => setSelectedOrderId(null)} onStatusChange={changeStatus} onMarkPaid={markPaid} />}
      {mealEditor && <MealEditor meal={mealEditor === 'new' ? null : meals.find((meal) => meal.id === mealEditor) || null} pricing={settings.pricing} onClose={() => setMealEditor(null)} onSave={async (meal) => { const adding = mealEditor === 'new'; if (apiSession) { const response = await fetch(`${apiBase()}/admin/meals${adding ? '' : `/${meal.id}`}`, { method: adding ? 'POST' : 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(adding ? { ...meal, menuId: activeMenuId } : meal) }); if (!response.ok) { notify('Meal could not be saved.'); return; } } setMeals((current) => adding ? [...current, meal] : current.map((item) => item.id === meal.id ? meal : item)); setMealEditor(null); notify(adding ? 'Meal added to the library. Add it to a draft menu when ready.' : 'Meal details updated.'); }} />}
    </div>
  );
}

function AdminAuthGate({ previewAllowed, onPreview, onAuthenticate }: { previewAllowed: boolean; onPreview: () => void; onAuthenticate: (password: string) => Promise<{ ok: boolean; error?: string }> }) {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  async function submit(event: FormEvent) {
    event.preventDefault();
    setError('');
    const result = await onAuthenticate(password);
    if (!result.ok) setError(result.error || 'Owner login could not be completed. Please try again.');
  }
  return <div className="grid min-h-[100dvh] place-items-center bg-[#073d45] p-5 text-[#f7f4eb]"><div className="w-full max-w-[430px] border border-[#f7f4eb]/15 bg-[#0b6470] p-7 shadow-2xl sm:p-10"><a href="/" className="flex items-center gap-3" data-testid="link-admin-return"><span className="h-16 w-12 overflow-hidden rounded-sm border border-[#efb22d]/60 bg-[#f7f4eb]"><img src="/images/brand/904-meal-prepz-logo.jpeg" alt="904 Meal Prepz logo" className="h-full w-full object-cover object-top" /></span><span className="text-sm font-extrabold leading-tight">904<br /><span className="text-[9px] tracking-[.2em]">MEAL PREPZ OPS</span></span></a><p className="mt-12 text-[10px] font-bold uppercase tracking-[.18em] text-[#efb22d]">Private owner area</p><h1 className="mt-3 text-4xl font-extrabold tracking-[-.05em]">Welcome back.</h1><p className="mt-4 text-sm leading-6 text-[#f7f4eb]/65">Enter your owner password. Your authenticated session is kept in a secure HttpOnly cookie and the password is never stored in this browser.</p><form onSubmit={submit} className="mt-7"><label className="text-[10px] font-bold uppercase tracking-[.14em]">Password<input type="password" required value={password} onChange={(event) => setPassword(event.target.value)} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#073d45] px-3 py-3 text-sm text-white outline-none focus:border-[#efb22d]" autoComplete="current-password" /></label>{error && <p className="mt-2 text-xs text-[#ffd0c5]">{error}</p>}<button type="submit" className="mt-4 flex w-full items-center justify-center gap-2 bg-[#efb22d] px-5 py-4 text-xs font-extrabold uppercase tracking-[.14em] text-[#073d45]">Sign in securely <ArrowRightIcon /></button></form>{previewAllowed && <button type="button" onClick={onPreview} className="mt-3 w-full border border-[#f7f4eb]/25 px-5 py-3 text-xs font-extrabold uppercase tracking-[.12em]" data-testid="button-admin-preview">Open seeded preview</button>}<p className="mt-8 flex items-center gap-2 text-xs text-[#f7f4eb]/45"><ShieldCheck size={15} /> Secure access boundary / owner only</p></div></div>;
}

function Overview({ orders, customers, onOrderClick, onTab }: { orders: AdminOrder[]; customers: AdminCustomer[]; onOrderClick: (order: AdminOrder) => void; onTab: (tab: AdminTab) => void }) {
  const paidOrders = orders.filter((order) => order.payment === 'Paid');
  const pendingOrders = orders.filter((order) => order.payment !== 'Paid' && order.payment !== 'Refunded');
  const paidRevenue = paidOrders.reduce((sum, order) => sum + order.total, 0);
  const pendingAmount = pendingOrders.reduce((sum, order) => sum + order.total, 0);
  const pickupCount = orders.filter((order) => order.fulfillment === 'Pickup').length;
  const deliveryCount = orders.filter((order) => order.fulfillment === 'Delivery').length;
  const stats = [['Weekly orders', String(orders.length), 'All payment methods', ClipboardList], ['Meals sold', String(orders.reduce((sum, order) => sum + order.mealCount, 0)), 'Active order items', UtensilsCrossed], ['Paid revenue', money(paidRevenue), 'Across all methods', BarChart3], ['Average order', money(orders.length ? orders.reduce((sum, order) => sum + order.total, 0) / orders.length : 0), 'Order value', FileText], ['Pickup orders', String(pickupCount), `${orders.length ? Math.round((pickupCount / orders.length) * 100) : 0}%`, ChefHat], ['Delivery orders', String(deliveryCount), `${orders.length ? Math.round((deliveryCount / orders.length) * 100) : 0}%`, Truck], ['Pending payment', money(pendingAmount), `${pendingOrders.length} orders to confirm`, ShieldCheck], ['Customers', String(customers.length), 'Derived from orders', Users]] as const;
  const methodTotals = orders.reduce<Record<string, number>>((result, order) => { if (order.payment === 'Paid') result[order.paymentMethod] = (result[order.paymentMethod] || 0) + order.total; return result; }, {});
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{stats.map(([label, value, detail, Icon]) => <div key={label} className="border border-[#173c3a]/10 bg-white p-5" data-testid={`metric-${label.toLowerCase().replaceAll(' ', '-')}`}><div className="flex items-start justify-between"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#738681]">{label}</p><Icon size={17} className="text-[#b28b17]" /></div><p className="mt-6 text-3xl font-extrabold tracking-[-.05em]">{value}</p><p className="mt-2 text-xs font-semibold text-[#35a579]">{detail}</p></div>)}</div><div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Panel title="Revenue and order pace" eyebrow="Last 7 weeks"><div className="mt-6"><MiniBarChart data={weeklyAnalytics} /></div></Panel><Panel title="Money by payment method" eyebrow="Paid revenue"><div className="mt-6 space-y-4">{paymentMethods.map((method) => <div key={method}><div className="mb-2 flex justify-between gap-3 text-xs font-bold"><span>{method}</span><span>{money(methodTotals[method] || 0)}</span></div><Progress label="" value={paidRevenue ? Math.round(((methodTotals[method] || 0) / paidRevenue) * 100) : 0} color={method === 'Square / Apple Pay' ? 'bg-[#174d49]' : method === 'Cash App' ? 'bg-[#35a579]' : method === 'Venmo' ? 'bg-[#5a8fc4]' : 'bg-[#e7bd32]'} /></div>)}</div><div className="mt-6 grid grid-cols-2 gap-3 border-t border-[#173c3a]/10 pt-5 text-sm"><div><p className="text-xs text-[#738681]">Pending amount</p><strong className="mt-1 block text-lg">{money(pendingAmount)}</strong></div><div><p className="text-xs text-[#738681]">Delivery revenue</p><strong className="mt-1 block text-lg">{money(orders.filter((order) => order.payment === 'Paid' && order.fulfillment === 'Delivery').reduce((sum, order) => sum + order.deliveryCharge, 0))}</strong></div></div></Panel></div><Panel title="Recent orders" eyebrow="One order system / every payment method"><div className="mt-4 overflow-x-auto"><OrderTable orders={orders.slice(0, 5)} onOrderClick={onOrderClick} compact /></div><button type="button" onClick={() => onTab('Orders')} className="mt-5 inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.12em] text-[#27625a] hover:text-[#b28b17]" data-testid="button-view-all-orders">View all orders <ArrowRightIcon /></button></Panel></div>;
}

function Orders({ orders, onOrderClick, onStatusChange, onMarkPaid }: { orders: AdminOrder[]; onOrderClick: (order: AdminOrder) => void; onStatusChange: (id: string, status: AdminOrderStatus) => void; onMarkPaid: (id: string) => void }) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<'All' | AdminOrderStatus>('All');
  const filtered = orders.filter((order) => (filter === 'All' || order.status === filter) && `${order.orderNumber} ${order.customer} ${order.email} ${order.paymentMethod}`.toLowerCase().includes(query.toLowerCase()));
  return <Panel title="Weekly orders" eyebrow={`${filtered.length} of ${orders.length} orders / all channels`} action={<div className="flex flex-wrap gap-2"><select value={filter} onChange={(event) => setFilter(event.target.value as 'All' | AdminOrderStatus)} className="border border-[#173c3a]/15 bg-transparent px-2 py-2 text-xs font-semibold" aria-label="Filter orders by status"><option>All</option>{statuses.map((status) => <option key={status}>{status}</option>)}</select><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-[#738681]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-48 border border-[#173c3a]/15 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-[#27625a]" placeholder="Search orders" aria-label="Search orders" data-testid="input-search-orders" /></div></div>}><div className="mt-5 overflow-x-auto"><OrderTable orders={filtered} onOrderClick={onOrderClick} onStatusChange={onStatusChange} onMarkPaid={onMarkPaid} /></div>{!filtered.length && <EmptyState title="No matching orders" copy="Try a different search or status filter." />}</Panel>;
}

function OrderTable({ orders, onOrderClick, onStatusChange, onMarkPaid, compact = false }: { orders: AdminOrder[]; onOrderClick: (order: AdminOrder) => void; onStatusChange?: (id: string, status: AdminOrderStatus) => void; onMarkPaid?: (id: string) => void; compact?: boolean }) {
  return <table className="w-full min-w-[900px] text-left text-sm"><thead><tr className="border-b border-[#173c3a]/10 text-[10px] font-bold uppercase tracking-[.12em] text-[#738681]"><th className="pb-3 pr-4">Order</th><th className="pb-3 pr-4">Customer</th><th className="pb-3 pr-4">Meals</th><th className="pb-3 pr-4">Total</th><th className="pb-3 pr-4">Fulfillment</th><th className="pb-3 pr-4">Payment</th><th className="pb-3">Fulfillment status</th></tr></thead><tbody>{orders.map((order) => <tr key={order.id} className="border-b border-[#173c3a]/8 last:border-0"><td className="py-4 pr-4"><button type="button" onClick={() => onOrderClick(order)} className="font-bold text-[#27625a] hover:text-[#b28b17]">{order.orderNumber}</button><span className="mt-1 block text-xs text-[#738681]">{order.date}</span></td><td className="py-4 pr-4"><p className="font-semibold">{order.customer}</p><p className="mt-1 text-xs text-[#738681]">{order.phone}</p></td><td className="max-w-[210px] py-4 pr-4 text-xs text-[#526863]">{order.meals}<span className="mt-1 block font-bold text-[#173c3a]">{order.mealCount} meals</span></td><td className="py-4 pr-4 font-bold">{money(order.total)}</td><td className="py-4 pr-4"><span className="inline-flex items-center gap-1.5 text-xs font-semibold"><span className={`h-2 w-2 rounded-full ${order.fulfillment === 'Pickup' ? 'bg-[#27625a]' : 'bg-[#e2af23]'}`} />{order.fulfillment}</span><span className="mt-1 block text-xs text-[#738681]">{order.window}</span></td><td className="py-4 pr-4"><StatusPill label={order.payment} kind={order.payment === 'Paid' ? 'green' : order.payment === 'Refunded' ? 'gray' : 'yellow'} /><span className="mt-1 block text-[10px] font-semibold text-[#738681]">{order.paymentMethod}</span>{onMarkPaid && order.payment !== 'Paid' && order.payment !== 'Refunded' && <button type="button" onClick={() => onMarkPaid(order.id)} className="mt-2 text-[10px] font-bold uppercase tracking-[.08em] text-[#27625a] hover:text-[#b28b17]" data-testid={`button-mark-paid-${order.id}`}>Confirm payment received</button>}</td><td className="py-4">{onStatusChange && !compact ? <select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as AdminOrderStatus)} className="border border-[#173c3a]/15 bg-transparent px-2 py-1.5 text-xs font-semibold outline-none" aria-label={`Update fulfillment status for ${order.orderNumber}`} data-testid={`select-status-${order.id}`}>{statuses.map((status) => <option key={status}>{status}</option>)}</select> : <StatusPill label={order.status} kind={order.status === 'Completed' ? 'green' : order.status === 'New' ? 'yellow' : order.status === 'Cancelled' ? 'red' : 'gray'} />}</td></tr>)}</tbody></table>;
}

function KitchenPrep({ orders, prep, selectedMeal, setSelectedMeal, onExport }: { orders: AdminOrder[]; prep: ReturnType<typeof derivePrepTotals>; selectedMeal: string | null; setSelectedMeal: (value: string | null) => void; onExport: () => void }) {
  const selected = prep.find((meal) => meal.name === selectedMeal);
  const customers = selected ? orders.filter((order) => order.status !== 'Cancelled').flatMap((order) => order.items.filter((item) => item.mealName === selected.name).map((item) => ({ name: order.customer, quantity: item.quantity, order: order.orderNumber }))) : [];
  const totalMeals = prep.reduce((sum, meal) => sum + meal.quantity, 0);
  return <div className="admin-print-sheet grid gap-6 xl:grid-cols-[1fr_330px]"><Panel title="Kitchen prep summary" eyebrow="Exact quantities from active order items" action={<button type="button" onClick={onExport} className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-[.1em] text-[#27625a]" data-testid="button-export-prep"><Download size={15} /> CSV</button>}><div className="mt-5 border border-[#d8e3dc] bg-[#edf7f1] p-4 text-sm text-[#27625a]"><ChefHat size={17} className="mb-2" /><strong>{totalMeals} total meals to prep</strong><p className="mt-1 text-xs text-[#27625a]/70">Cancelled orders are excluded. Click any meal to see the customer breakdown.</p></div><div className="mt-5 grid gap-2 sm:grid-cols-2">{prep.map((meal) => <button type="button" key={meal.name} onClick={() => setSelectedMeal(meal.name)} className={`flex items-center gap-3 border p-4 text-left transition-colors ${selectedMeal === meal.name ? 'border-[#27625a] bg-[#edf7f1]' : 'border-[#173c3a]/10 bg-white hover:border-[#27625a]'}`} data-testid={`prep-meal-${meal.mealNumber}`}><span className="grid h-9 w-9 shrink-0 place-items-center bg-[#e7bd32] text-xs font-black">#{meal.mealNumber}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{meal.name}</strong><small className="text-xs text-[#738681]">{meal.category}</small></span><strong className="text-xl">{meal.quantity}</strong></button>)}</div></Panel><Panel title={selected ? selected.name : 'Meal breakdown'} eyebrow={selected ? 'Customers who ordered it' : 'Select a meal'}>{selected ? <div className="mt-5 space-y-3">{customers.map((customer) => <div key={`${customer.order}-${customer.name}`} className="flex justify-between border-b border-[#173c3a]/10 pb-3 text-sm"><span>{customer.name}<small className="mt-1 block text-xs text-[#738681]">{customer.order}</small></span><strong>× {customer.quantity}</strong></div>)}<div className="border-t border-[#173c3a]/10 pt-4 text-sm"><div className="flex justify-between"><span>Total required</span><strong>{selected.quantity}</strong></div><div className="mt-2 flex justify-between text-[#738681]"><span>Projected revenue</span><strong>{money(selected.revenue)}</strong></div></div></div> : <EmptyState title="Select a meal" copy="Choose a prep line to see the customer order breakdown." />}</Panel></div>;
}

function Customers({ customers, orders, selected, setSelected, onExport, onOrderClick }: { customers: AdminCustomer[]; orders: AdminOrder[]; selected: AdminCustomer | null; setSelected: (customer: AdminCustomer | null) => void; onExport: () => void; onOrderClick: (order: AdminOrder) => void }) {
  const [query, setQuery] = useState('');
  const filtered = customers.filter((customer) => `${customer.name} ${customer.email} ${customer.phone} ${customer.address}`.toLowerCase().includes(query.toLowerCase()));
  const customerOrders = selected ? orders.filter((order) => selected.orderIds.includes(order.id)) : [];
  return <Panel title="Customer directory" eyebrow={`${filtered.length} searchable profiles / order-derived`} action={<div className="flex flex-wrap gap-2"><div className="relative"><Search size={15} className="absolute left-3 top-2.5 text-[#738681]" /><input value={query} onChange={(event) => setQuery(event.target.value)} className="w-48 border border-[#173c3a]/15 bg-transparent py-2 pl-9 pr-3 text-sm outline-none focus:border-[#27625a]" placeholder="Search customers" aria-label="Search customers" /></div><button type="button" onClick={onExport} className="inline-flex items-center gap-2 border border-[#173c3a]/15 px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#27625a]" data-testid="button-export-customers"><Download size={15} /> CSV</button></div>}><div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-3">{filtered.map((customer) => <button key={customer.id} type="button" onClick={() => setSelected(customer)} className="border border-[#173c3a]/10 bg-white p-5 text-left transition-colors hover:border-[#27625a]" data-testid={`customer-${customer.id}`}><div className="flex items-start justify-between"><span className="grid h-10 w-10 place-items-center rounded-full bg-[#dbe9e2] text-sm font-black text-[#27625a]">{customer.name.split(' ').map((part) => part[0]).join('')}</span>{customer.returning && <StatusPill label="Returning" kind="green" />}</div><h3 className="mt-5 font-bold">{customer.name}</h3><p className="mt-1 text-xs text-[#738681]">{customer.email}</p><div className="mt-5 grid grid-cols-2 gap-3 border-t border-[#173c3a]/10 pt-4 text-xs"><span><small className="block text-[#738681]">Paid lifetime spend</small><strong className="mt-1 block text-sm">{money(customer.lifetimeSpend)}</strong></span><span><small className="block text-[#738681]">Orders</small><strong className="mt-1 block text-sm">{customer.orders}</strong></span></div></button>)}</div>{!filtered.length && <EmptyState title="No customers found" copy="Try a name, email, phone, or neighborhood." />}{selected && <div className="mt-6 border-2 border-[#27625a] bg-[#edf7f1] p-5" data-testid="customer-detail"><div className="flex justify-between"><div><p className="text-xs font-bold uppercase tracking-[.12em] text-[#27625a]">Customer profile</p><h3 className="mt-2 text-2xl font-extrabold">{selected.name}</h3></div><button type="button" onClick={() => setSelected(null)} aria-label="Close customer detail"><X size={19} /></button></div><div className="mt-5 grid gap-4 text-sm sm:grid-cols-2 lg:grid-cols-4"><Info label="Phone" value={selected.phone} /><Info label="Email" value={selected.email} /><Info label="Address" value={selected.address} /><Info label="Pickup / delivery" value={`${selected.pickupOrders} / ${selected.deliveryOrders}`} /><Info label="Average paid order" value={money(selected.averageOrder)} /><Info label="Favorite meals" value={selected.favoriteMeals.join(', ') || 'No preference yet'} /></div><div className="mt-6 border-t border-[#27625a]/20 pt-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#27625a]">Complete order history</p><div className="mt-3 space-y-2">{customerOrders.map((order) => <button key={order.id} type="button" onClick={() => onOrderClick(order)} className="flex w-full items-center justify-between border border-[#173c3a]/10 bg-white p-3 text-left text-sm hover:border-[#27625a]"><span><strong>{order.orderNumber}</strong><small className="mt-1 block text-xs text-[#738681]">{order.date} / {order.mealCount} meals / {order.payment}</small></span><strong>{money(order.total)}</strong></button>)}</div></div></div>}</Panel>;
}

function MenuManager({ draft, meals, publishedMealIds, history, onDraftChange, onSave, onPreview, onPublish, onEditMeal }: { draft: MenuDraft; meals: AdminMenuMeal[]; publishedMealIds: string[]; history: Array<{ label: string; publishedAt: string; mealCount: number }>; onDraftChange: (draft: MenuDraft) => void; onSave: () => void; onPreview: () => void; onPublish: () => void; onEditMeal: (id: 'new' | string) => void }) {
  const [showConfirm, setShowConfirm] = useState(false);
  const activeMeals = meals.filter((meal) => draft.activeMealIds.includes(meal.id) && !meal.archived);
  function toggleMeal(id: string) {
    onDraftChange({ ...draft, activeMealIds: draft.activeMealIds.includes(id) ? draft.activeMealIds.filter((mealId) => mealId !== id) : [...draft.activeMealIds, id] });
  }
  return <div className="space-y-6"><Panel title="Weekly menu management" eyebrow="Draft → preview → publish" action={<div className="flex flex-wrap gap-2"><button type="button" onClick={onPreview} className="inline-flex items-center gap-2 border border-[#173c3a]/20 px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#27625a]" data-testid="button-preview-menu"><Eye size={15} /> Preview customer view</button><button type="button" onClick={onSave} className="inline-flex items-center gap-2 bg-[#173c3a] px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-white" data-testid="button-save-menu"><Download size={15} /> Save draft</button><button type="button" onClick={() => setShowConfirm(true)} className="inline-flex items-center gap-2 bg-[#e7bd32] px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#173c3a]" data-testid="button-publish-menu"><Check size={15} /> Publish menu</button></div>}><div className="grid gap-3 border border-[#e7d58d] bg-[#fff9df] p-4 text-sm text-[#7b6414] sm:grid-cols-[1fr_auto]"><div><p className="font-bold">Draft changes are private until published.</p><p className="mt-1 text-xs">Last saved: {draft.savedAt}. Published now: {publishedMealIds.length} meals.</p></div><strong className="self-center">{activeMeals.length} selected</strong></div><div className="mt-5 grid gap-4 md:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.12em]">Menu title<input value={draft.weekLabel} onChange={(event) => onDraftChange({ ...draft, weekLabel: event.target.value })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.12em]">Order cutoff<input type="datetime-local" value={draft.orderDeadline} onChange={(event) => onDraftChange({ ...draft, orderDeadline: event.target.value })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.12em]">Cutoff label<input value={draft.deadlineLabel} onChange={(event) => onDraftChange({ ...draft, deadlineLabel: event.target.value })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.12em] md:col-span-2">Customer announcement<textarea value={draft.announcement} onChange={(event) => onDraftChange({ ...draft, announcement: event.target.value })} className="mt-2 block min-h-24 w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label></div><div className="mt-7 overflow-x-auto"><table className="w-full min-w-[850px] text-left text-sm"><thead><tr className="border-b border-[#173c3a]/10 text-[10px] font-bold uppercase tracking-[.12em] text-[#738681]"><th className="pb-3">Menu</th><th className="pb-3">Meal</th><th className="pb-3">Category</th><th className="pb-3">Macros</th><th className="pb-3">Price</th><th className="pb-3">Draft state</th><th className="pb-3">Edit</th></tr></thead><tbody>{meals.filter((meal) => !meal.archived).map((meal) => <tr key={meal.id} className="border-b border-[#173c3a]/8 last:border-0"><td className="py-4"><button type="button" onClick={() => toggleMeal(meal.id)} className={`h-6 w-6 border ${draft.activeMealIds.includes(meal.id) ? 'border-[#27625a] bg-[#27625a] text-white' : 'border-[#173c3a]/25'}`} aria-label={`${draft.activeMealIds.includes(meal.id) ? 'Remove' : 'Add'} ${meal.name}`}>{draft.activeMealIds.includes(meal.id) && <Check size={15} />}</button></td><td className="py-4"><div className="flex items-center gap-3"><img src={meal.image} alt="" className="h-10 w-10 object-cover" /><span><strong className="block">{meal.name}</strong><small className="text-xs text-[#738681]">#{meal.mealNumber} / {meal.premium ? 'Premium' : 'Standard'}</small></span></div></td><td className="py-4 text-xs">{meal.category}</td><td className="py-4 text-xs text-[#738681]">{meal.calories} cal / {meal.protein}g protein / {meal.carbs}g carbs</td><td className="py-4 font-bold">{money(meal.price + meal.premiumCharge)}</td><td className="py-4"><StatusPill label={draft.activeMealIds.includes(meal.id) ? 'In draft' : 'Not selected'} kind={draft.activeMealIds.includes(meal.id) ? 'green' : 'gray'} /></td><td className="py-4"><button type="button" onClick={() => onEditMeal(meal.id)} className="inline-flex items-center gap-1 text-xs font-bold uppercase tracking-[.1em] text-[#27625a]"><Pencil size={14} /> Edit</button></td></tr>)}</tbody></table></div></Panel><Panel title="Published history" eyebrow="Previous menu states are preserved">{history.length ? <div className="space-y-3">{history.map((entry, index) => <div key={`${entry.publishedAt}-${index}`} className="flex items-center justify-between border-b border-[#173c3a]/10 pb-3 text-sm"><span><strong>{entry.label}</strong><small className="mt-1 block text-xs text-[#738681]">Published {entry.publishedAt}</small></span><span className="text-xs font-bold text-[#738681]">{entry.mealCount} meals</span></div>)}</div> : <EmptyState title="No changes published yet" copy="The current seeded menu is the starting published version." />}</Panel>{showConfirm && <ConfirmDialog title="Publish this weekly menu?" copy={`This will replace the public selection with ${activeMeals.length} meals and preserve the current version in history.`} onCancel={() => setShowConfirm(false)} onConfirm={() => { setShowConfirm(false); onPublish(); }} />}</div>;
}

function MealLibrary({ meals, onEdit, onArchive }: { meals: AdminMenuMeal[]; onEdit: (id: 'new' | string) => void; onArchive: (meal: AdminMenuMeal) => void }) {
  const [showArchived, setShowArchived] = useState(false);
  const visibleMeals = meals.filter((meal) => showArchived || !meal.archived);
  return <Panel title="Meal library" eyebrow="Permanent catalog / reusable meals" action={<div className="flex gap-2"><button type="button" onClick={() => setShowArchived((value) => !value)} className="border border-[#173c3a]/15 px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-[#27625a]">{showArchived ? 'Hide archived' : 'Show archived'}</button><button type="button" onClick={() => onEdit('new')} className="inline-flex items-center gap-2 bg-[#173c3a] px-3 py-2 text-xs font-bold uppercase tracking-[.1em] text-white" data-testid="button-add-library-meal"><PlusIcon /> Add meal</button></div>}><div className="mb-5 border border-[#d8e3dc] bg-[#edf7f1] p-4 text-sm text-[#27625a]"><strong>Build once, publish weekly.</strong><p className="mt-1 text-xs text-[#27625a]/70">Archive removes a meal from future menu drafts without changing historical order snapshots.</p></div><div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">{visibleMeals.map((meal) => <article key={meal.id} className={`border border-[#173c3a]/10 bg-white p-4 ${meal.archived ? 'opacity-60' : ''}`}><div className="flex gap-3"><img src={meal.image} alt="" className="h-16 w-16 object-cover" /><div className="min-w-0 flex-1"><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#b28b17]">#{meal.mealNumber} / {meal.category}</p><h3 className="mt-1 truncate text-sm font-extrabold">{meal.name}</h3><p className="mt-1 text-xs text-[#738681]">{meal.calories} cal / {meal.protein}g protein / {meal.carbs}g carbs</p></div></div><div className="mt-4 flex items-center justify-between border-t border-[#173c3a]/10 pt-3"><strong>{money(meal.price + meal.premiumCharge)}</strong>{meal.archived && <StatusPill label="Archived" kind="gray" />}<div className="flex gap-3"><button type="button" onClick={() => onArchive(meal)} className="text-[10px] font-bold uppercase tracking-[.1em] text-[#27625a]">{meal.archived ? 'Restore' : 'Archive'}</button><button type="button" onClick={() => onEdit(meal.id)} className="text-[10px] font-bold uppercase tracking-[.1em] text-[#27625a]">Edit</button></div></div></article>)}</div></Panel>;
}

function Analytics({ orders, meals }: { orders: AdminOrder[]; meals: AdminMenuMeal[] }) {
  const paid = orders.filter((order) => order.payment === 'Paid');
  const paidRevenue = paid.reduce((sum, order) => sum + order.total, 0);
  const pending = orders.filter((order) => order.payment !== 'Paid' && order.payment !== 'Refunded');
  const mealPerformance = meals.map((meal) => {
    const items = orders.flatMap((order) => order.payment === 'Paid' ? order.items.filter((item) => item.mealId === meal.id) : []);
    const units = items.reduce((sum, item) => sum + item.quantity, 0);
    return { name: meal.name, units, revenue: items.reduce((sum, item) => sum + (item.unitPrice + item.premiumCharge) * item.quantity, 0), offered: meal.archived ? 0 : 1 };
  }).sort((a, b) => b.units - a.units);
  const premiumUnits = paid.flatMap((order) => order.items.filter((item) => item.premiumCharge > 0)).reduce((sum, item) => sum + item.quantity, 0);
  const standardUnits = paid.flatMap((order) => order.items.filter((item) => item.premiumCharge === 0)).reduce((sum, item) => sum + item.quantity, 0);
  const repeatRate = new Set(paid.map((order) => order.customerId)).size ? Math.round((new Set(paid.filter((order) => paid.filter((candidate) => candidate.customerId === order.customerId).length > 1).map((order) => order.customerId)).size / new Set(paid.map((order) => order.customerId)).size) * 100) : 0;
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4"><Metric label="Paid revenue" value={money(paidRevenue)} detail="Recalculates from paid orders" /><Metric label="Pending amount" value={money(pending.reduce((sum, order) => sum + order.total, 0))} detail={`${pending.length} orders need confirmation`} /><Metric label="Premium mix" value={`${premiumUnits} / ${standardUnits}`} detail="Premium vs standard units" /><Metric label="Repeat customer rate" value={`${repeatRate}%`} detail="Paid order customers" /></div><div className="grid gap-6 xl:grid-cols-[1.35fr_.65fr]"><Panel title="Revenue by week" eyebrow="Historical performance"><div className="mt-6"><MiniBarChart data={weeklyAnalytics} showRevenue /></div></Panel><Panel title="Pickup / delivery mix" eyebrow="Current order ledger"><div className="mt-6 space-y-6"><Progress label="Pickup" value={orders.length ? Math.round((orders.filter((order) => order.fulfillment === 'Pickup').length / orders.length) * 100) : 0} color="bg-[#174d49]" /><Progress label="Delivery" value={orders.length ? Math.round((orders.filter((order) => order.fulfillment === 'Delivery').length / orders.length) * 100) : 0} color="bg-[#e7bd32]" /><Progress label="Paid" value={orders.length ? Math.round((paid.length / orders.length) * 100) : 0} color="bg-[#35a579]" /></div></Panel></div><div className="grid gap-6 xl:grid-cols-2"><Panel title="Top-selling meals" eyebrow="Paid units / revenue"><div className="mt-5 space-y-3">{mealPerformance.slice(0, 5).map((meal, index) => <div key={meal.name} className="flex items-center gap-3 border-b border-[#173c3a]/10 pb-3 last:border-0"><span className="grid h-7 w-7 place-items-center bg-[#e7bd32] text-xs font-black">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{meal.name}</strong><small className="text-xs text-[#738681]">{money(meal.revenue)} generated</small></span><strong>{meal.units} units</strong></div>)}</div></Panel><Panel title="Lowest-selling / rotation watch" eyebrow="Useful menu decisions">{mealPerformance.slice(-3).reverse().map((meal) => <div key={meal.name} className="flex justify-between border-b border-[#173c3a]/10 py-3 text-sm last:border-0"><span>{meal.name}</span><strong>{meal.units} units</strong></div>)}</Panel></div><Panel title="Meal performance detail" eyebrow="Units, revenue, availability, and current rotation"><div className="mt-5 overflow-x-auto"><table className="w-full min-w-[650px] text-left text-sm"><thead><tr className="border-b border-[#173c3a]/10 text-[10px] uppercase tracking-[.12em] text-[#738681]"><th className="pb-3">Meal</th><th className="pb-3">Units sold</th><th className="pb-3">Revenue</th><th className="pb-3">Weeks offered</th><th className="pb-3">Avg / offered week</th></tr></thead><tbody>{mealPerformance.map((meal) => <tr key={meal.name} className="border-b border-[#173c3a]/8 last:border-0"><td className="py-4 font-bold">{meal.name}</td><td className="py-4">{meal.units}</td><td className="py-4 font-bold">{money(meal.revenue)}</td><td className="py-4">{meal.offered}</td><td className="py-4">{meal.offered ? meal.units : '—'}</td></tr>)}</tbody></table></div></Panel><Panel title="Historical popular meals" eyebrow="Longer-term rotation intelligence"><PerformanceTable rows={popularMeals.slice(0, 5)} /></Panel></div>;
}

function Fulfillment({ orders, onStatusChange }: { orders: AdminOrder[]; onStatusChange: (id: string, status: AdminOrderStatus) => void }) {
  const pickup = orders.filter((order) => order.fulfillment === 'Pickup' && order.status !== 'Completed' && order.status !== 'Cancelled');
  const delivery = orders.filter((order) => order.fulfillment === 'Delivery' && order.status !== 'Completed' && order.status !== 'Cancelled');
  return <div className="grid gap-6 xl:grid-cols-2"><Panel title="Pickup board" eyebrow={`${pickup.length} active orders / window-ready`}><FulfillmentList orders={pickup} type="Pickup" onStatusChange={onStatusChange} /></Panel><Panel title="Delivery board" eyebrow={`${delivery.length} active orders / route-ready`}><FulfillmentList orders={delivery} type="Delivery" onStatusChange={onStatusChange} /></Panel><Panel title="Delivery zones" eyebrow="Configurable fees"><div className="mt-5 space-y-3">{weeklyMenu.deliveryZones.map((zone) => <div key={zone.id} className="flex items-center justify-between border-b border-[#173c3a]/10 pb-3 text-sm"><span>{zone.name}</span><strong>{money(zone.fee)}</strong></div>)}</div><p className="mt-5 text-xs leading-5 text-[#738681]">Group delivery orders by zone and window for Sunday/Monday runs. GPS routing is intentionally not enabled.</p></Panel><Panel title="Queue health" eyebrow="Next action by fulfillment"><div className="mt-5 grid gap-3 sm:grid-cols-3">{(['New', 'Preparing', 'Ready'] as AdminOrderStatus[]).map((status) => <div key={status} className="border border-[#173c3a]/10 p-4"><p className="text-xs font-bold uppercase tracking-[.1em] text-[#738681]">{status}</p><strong className="mt-3 block text-2xl">{orders.filter((order) => order.status === status).length}</strong><small className="mt-1 block text-xs text-[#738681]">orders in queue</small></div>)}</div></Panel></div>;
}

function FulfillmentList({ orders, type, onStatusChange }: { orders: AdminOrder[]; type: 'Pickup' | 'Delivery'; onStatusChange: (id: string, status: AdminOrderStatus) => void }) {
  return <div className="mt-5 space-y-2">{orders.map((order) => <div key={order.id} className="border border-[#173c3a]/10 bg-white p-4"><div className="flex justify-between gap-3"><div><p className="text-xs font-bold text-[#27625a]">{order.orderNumber}</p><p className="mt-1 font-bold">{order.customer}</p></div><strong>{money(order.total)}</strong></div><div className="mt-3 flex items-start gap-2 text-xs text-[#738681]"><Clock3 size={14} className="mt-0.5 shrink-0" />{order.window}</div>{type === 'Delivery' && <div className="mt-2 flex items-start gap-2 text-xs text-[#738681]"><MapPin size={14} />{order.deliveryZone || order.address}</div>}<div className="mt-3 flex flex-wrap items-center justify-between gap-3 border-t border-[#173c3a]/10 pt-3"><span className="text-xs text-[#738681]">{order.mealCount} meals / {order.payment}</span>{statusNext[order.status] ? <button type="button" onClick={() => onStatusChange(order.id, statusNext[order.status] as AdminOrderStatus)} className="bg-[#173c3a] px-3 py-2 text-[10px] font-bold uppercase tracking-[.1em] text-white hover:bg-[#27625a]">Mark {statusNext[order.status]}</button> : <StatusPill label={order.status} kind={order.status === 'Completed' ? 'green' : 'gray'} />}</div></div>)}</div>;
}

function Payments({ orders, onMarkPaid }: { orders: AdminOrder[]; onMarkPaid: (id: string) => void }) {
  const paid = orders.filter((order) => order.payment === 'Paid');
  const pending = orders.filter((order) => !['Square', 'Square / Apple Pay'].includes(order.paymentMethod) && (order.payment === 'Payment Pending' || order.payment === 'Unpaid'));
  return <div className="space-y-6"><div className="grid gap-3 sm:grid-cols-3"><Metric label="Paid revenue" value={money(paid.reduce((sum, order) => sum + order.total, 0))} detail="Confirmed payments only" /><Metric label="Manual confirmations" value={String(pending.length)} detail="Square excluded" /><Metric label="Amount pending" value={money(pending.reduce((sum, order) => sum + order.total, 0))} detail="Not included in revenue" /></div><Panel title="Manual payment queue" eyebrow="Match sender before confirming"><div className="space-y-3">{pending.map((order) => <div key={order.id} className="grid gap-3 border border-[#173c3a]/10 bg-white p-4 sm:grid-cols-[1fr_1fr_auto] sm:items-center"><div><strong>{order.orderNumber}</strong><p className="text-xs text-[#738681]">{order.customer} / {order.email}</p></div><div><p className="font-bold">{order.paymentMethod} / {money(order.total)}</p><p className="text-xs text-[#738681]">Expected sender: {order.expectedSenderName || 'Not provided'}</p><p className="text-xs text-[#738681]">Submitted: {order.paymentSubmittedAt ? new Date(order.paymentSubmittedAt).toLocaleString() : order.date}</p></div><button type="button" onClick={() => onMarkPaid(order.id)} className="bg-[#173c3a] px-4 py-3 text-[10px] font-bold uppercase tracking-[.1em] text-white" data-testid={`button-payment-mark-paid-${order.id}`}>Confirm payment received</button></div>)}</div>{!pending.length && <EmptyState title="Payment queue is clear" copy="No manual transfers are awaiting confirmation." />}</Panel></div>;
}

function SettingsPage({ settings, onSave }: { settings: Settings; onSave: (settings: Settings) => void }) {
  const [draft, setDraft] = useState(settings);
  const inputClass = "mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#27625a]";
  const paymentFields = [['Apple Pay', 'applePayHandle', 'applePayEnabled', 'applePayQrPath'], ['Cash App', 'cashAppHandle', 'cashAppEnabled', 'cashAppQrPath'], ['Venmo', 'venmoHandle', 'venmoEnabled', 'venmoQrPath'], ['Zelle', 'zelleContact', 'zelleEnabled', 'zelleQrPath']] as const;
  return <Panel title="Business settings" eyebrow="Owner configuration">
    <div className="mb-6 border border-[#e7d58d] bg-[#fff9df] p-4 text-sm text-[#7b6414]"><Settings2 size={17} className="mb-2" /><strong>Provider credentials stay server-side.</strong><p className="mt-1 text-xs">Configure public payment handles here; QR fields store persistent object paths, never image bytes.</p></div>
    <div className="grid gap-4 sm:grid-cols-2">{([['Business name', 'businessName'], ['Phone', 'phone'], ['Email', 'email'], ['Instagram', 'instagram'], ['Pickup information', 'pickupInformation']] as const).map(([label, key]) => <label key={key} className="text-xs font-bold uppercase tracking-[.12em]">{label}<input value={draft[key]} onChange={(event) => setDraft({ ...draft, [key]: event.target.value })} className={inputClass} /></label>)}</div>
    <div className="mt-8 border-t border-[#173c3a]/10 pt-6"><h3 className="text-sm font-extrabold">Manual payment methods</h3><div className="mt-4 grid gap-5 lg:grid-cols-3">{paymentFields.map(([label, handle, enabled, qr]) => <div key={label} className="border border-[#173c3a]/10 p-4"><label className="text-xs font-bold uppercase tracking-[.12em]">{label} handle<input value={draft[handle]} onChange={(event) => setDraft({ ...draft, [handle]: event.target.value })} className={inputClass} /></label><label className="mt-3 block text-xs font-bold uppercase tracking-[.12em]">QR object path<input value={draft[qr]} onChange={(event) => setDraft({ ...draft, [qr]: event.target.value })} className={inputClass} placeholder="/objects/payment-qr/..." /></label><label className="mt-3 flex items-center gap-2 text-sm font-semibold"><input type="checkbox" checked={draft[enabled]} onChange={(event) => setDraft({ ...draft, [enabled]: event.target.checked })} /> Enabled</label></div>)}</div></div>
    <div className="mt-8 grid gap-4 border-t border-[#173c3a]/10 pt-6 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.12em]">Standard price<input type="number" min="0" step="0.01" value={draft.pricing.standardPrice} onChange={(event) => setDraft({ ...draft, pricing: { ...draft.pricing, standardPrice: Number(event.target.value) } })} className={inputClass} /></label><label className="text-xs font-bold uppercase tracking-[.12em]">Premium surcharge<input type="number" min="0" step="0.01" value={draft.pricing.premiumCharge} onChange={(event) => setDraft({ ...draft, pricing: { ...draft.pricing, premiumCharge: Number(event.target.value) } })} className={inputClass} /></label></div>
    <button type="button" onClick={() => onSave(draft)} className="mt-7 bg-[#173c3a] px-5 py-3 text-xs font-bold uppercase tracking-[.12em] text-white">Save settings</button>
  </Panel>;
}

type GalleryRecord = { id: string; title: string; description: string; mediaType: 'image' | 'video'; mediaPath: string; posterPath: string; linkedMealId: string | null; category: string; status: 'draft' | 'published' | 'archived'; displayOrder: number; featured: boolean };
function GalleryManager({ apiSession, meals }: { apiSession: boolean; meals: AdminMenuMeal[] }) {
  const api = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
  const [items, setItems] = useState<GalleryRecord[]>([]);
  const [draft, setDraft] = useState<Partial<GalleryRecord> | null>(null);
  const [error, setError] = useState('');
  async function load() {
    if (!apiSession) return;
    const response = await fetch(`${api}/admin/gallery`, { credentials: 'include' });
    if (response.ok) setItems(await response.json());
  }
  useEffect(() => { void load(); }, [apiSession]);
  async function save() {
    if (!draft?.title || !draft.mediaPath || !draft.mediaType) { setError('Title, media type, and a persistent media path are required.'); return; }
    const response = await fetch(`${api}/admin/gallery${draft.id ? `/${draft.id}` : ''}`, { method: draft.id ? 'PATCH' : 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(draft) });
    if (!response.ok) { setError((await response.json()).error || 'Could not save media.'); return; }
    setDraft(null); setError(''); void load();
  }
  async function update(id: string, changes: Partial<GalleryRecord>) {
    await fetch(`${api}/admin/gallery/${id}`, { method: 'PATCH', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(changes) }); void load();
  }
  async function upload(file: File) {
    const response = await fetch(`${api}/admin/gallery/upload-url`, { method: 'POST', credentials: 'include', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name: file.name, size: file.size, contentType: file.type }) });
    const payload = await response.json();
    if (!response.ok) { setError(payload.error || 'Upload could not start.'); return; }
    const uploaded = await fetch(payload.uploadURL, { method: 'PUT', headers: { 'Content-Type': file.type }, body: file });
    if (!uploaded.ok) { setError('Upload failed before the media was saved.'); return; }
    setDraft((current) => ({ ...current, mediaPath: `${api}${payload.objectPath}`, mediaType: file.type.startsWith('video/') ? 'video' : 'image' }));
  }
  return <Panel title="Gallery manager" eyebrow="Persistent public media" action={<div className="flex gap-2"><label className="cursor-pointer border border-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.12em]">Upload<input type="file" accept="image/jpeg,image/png,image/webp,image/gif,video/mp4,video/webm,video/quicktime" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) { setDraft({ title: file.name.replace(/\.[^.]+$/, ''), description: '', mediaType: file.type.startsWith('video/') ? 'video' : 'image', mediaPath: '', posterPath: '', linkedMealId: null, category: '', status: 'draft', displayOrder: items.length, featured: false }); void upload(file); } }} /></label><button type="button" onClick={() => setDraft({ title: '', description: '', mediaType: 'image', mediaPath: '', posterPath: '', linkedMealId: null, category: '', status: 'draft', displayOrder: items.length, featured: false })} className="bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white">+ Add media</button></div>}>
    {draft && <div className="mb-6 border border-[#e7d58d] bg-[#fff9df] p-5"><div className="grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.1em]">Title<input value={draft.title || ''} onChange={(e) => setDraft({ ...draft, title: e.target.value })} className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.1em]">Media path / uploaded object URL<input value={draft.mediaPath || ''} onChange={(e) => setDraft({ ...draft, mediaPath: e.target.value })} placeholder="/objects/gallery/..." className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.1em]">Type<select value={draft.mediaType} onChange={(e) => setDraft({ ...draft, mediaType: e.target.value as GalleryRecord['mediaType'] })} className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal"><option value="image">Image</option><option value="video">Video</option></select></label><label className="text-xs font-bold uppercase tracking-[.1em]">Linked meal<select value={draft.linkedMealId || ''} onChange={(e) => setDraft({ ...draft, linkedMealId: e.target.value || null })} className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal"><option value="">No linked meal</option>{meals.map((meal) => <option key={meal.id} value={meal.id}>{meal.name}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.1em]">Category<input value={draft.category || ''} onChange={(e) => setDraft({ ...draft, category: e.target.value })} className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.1em]">Poster path<input value={draft.posterPath || ''} onChange={(e) => setDraft({ ...draft, posterPath: e.target.value })} className="mt-2 w-full border bg-white p-3 text-sm normal-case tracking-normal" /></label></div><label className="mt-4 block text-xs font-bold uppercase tracking-[.1em]">Description<textarea value={draft.description || ''} onChange={(e) => setDraft({ ...draft, description: e.target.value })} className="mt-2 min-h-20 w-full border bg-white p-3 text-sm normal-case tracking-normal" /></label><div className="mt-4 flex flex-wrap gap-2"><button type="button" onClick={save} className="bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.1em] text-white">Save media</button><button type="button" onClick={() => setDraft(null)} className="border px-4 py-3 text-xs font-bold uppercase tracking-[.1em]">Cancel</button>{error && <span className="p-3 text-sm text-[#a14935]">{error}</span>}</div></div>}
    <div className="space-y-3">{items.map((item) => <div key={item.id} className="grid gap-3 border border-[#173c3a]/10 bg-white p-4 sm:grid-cols-[1fr_auto] sm:items-center">
      <div>{item.mediaType === 'video' ? <video src={item.mediaPath} poster={item.posterPath || undefined} muted playsInline controls preload="metadata" className="mb-3 h-24 w-40 object-cover" /> : <img src={item.mediaPath} alt="" loading="lazy" className="mb-3 h-24 w-40 object-cover" />}<strong>{item.title}</strong><p className="text-xs text-[#738681]">{item.category || 'Uncategorized'}{item.linkedMealId ? ` / linked meal: ${meals.find((m) => m.id === item.linkedMealId)?.name || 'past meal'}` : ''}</p><p className="text-xs text-[#738681]">Order {item.displayOrder} / {item.featured ? 'Featured' : 'Standard'}</p></div>
      <div className="flex flex-wrap gap-2"><select value={item.status} onChange={(e) => void update(item.id, { status: e.target.value as GalleryRecord['status'] })} className="border p-2 text-xs"><option>draft</option><option>published</option><option>archived</option></select><button type="button" onClick={() => void update(item.id, { featured: !item.featured })} className="border px-3 py-2 text-xs font-bold">{item.featured ? 'Unfeature' : 'Feature'}</button><button type="button" onClick={() => void update(item.id, { displayOrder: Math.max(0, item.displayOrder - 1) })} className="border px-3 py-2 text-xs font-bold">Move up</button><button type="button" onClick={() => void update(item.id, { displayOrder: item.displayOrder + 1 })} className="border px-3 py-2 text-xs font-bold">Move down</button><button type="button" onClick={() => setDraft(item)} className="border px-3 py-2 text-xs font-bold uppercase">Edit</button><button type="button" onClick={() => { if (window.confirm('Permanently delete this media? This cannot be undone.')) void fetch(`${api}/admin/gallery/${item.id}`, { method: 'DELETE', credentials: 'include' }).then(load); }} className="border border-[#a14935] px-3 py-2 text-xs font-bold uppercase text-[#a14935]">Delete</button></div>
    </div>)}</div>
  </Panel>;
}

function MealEditor({ meal, pricing, onClose, onSave }: { meal: AdminMenuMeal | null; pricing: Pricing; onClose: () => void; onSave: (meal: AdminMenuMeal) => void }) {
  const [draft, setDraft] = useState<AdminMenuMeal>(meal || { id: '', mealNumber: 0, name: '', description: '', category: 'Entrées', price: pricing.standardPrice, premium: false, premiumCharge: 0, calories: 0, protein: 0, carbs: 0, image: '/images/menu-generated/904-menu-04.jpg', available: true });
  function update(changes: Partial<AdminMenuMeal>) { setDraft((current) => ({ ...current, ...changes })); }
  function submit(event: FormEvent) {
    event.preventDefault();
    if (!draft.name.trim()) return;
    onSave({ ...draft, id: draft.id || `meal-${Date.now()}`, mealNumber: draft.mealNumber || 12, price: pricing.standardPrice, premiumCharge: draft.premium ? pricing.premiumCharge : 0, tag: draft.premium ? `Premium / ${money(pricing.standardPrice + pricing.premiumCharge)}` : `Standard / ${money(pricing.standardPrice)}` });
  }
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#102d2b]/65 p-4"><form onSubmit={submit} className="max-h-[92dvh] w-full max-w-[720px] overflow-y-auto bg-[#f3f5f2] shadow-2xl" role="dialog" aria-modal="true"><div className="flex items-start justify-between border-b border-[#173c3a]/10 bg-white px-5 py-5"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b28b17]">{meal ? 'Edit library meal' : 'Add library meal'}</p><h2 className="mt-1 text-2xl font-extrabold">{meal ? meal.name : 'New meal'}</h2></div><button type="button" onClick={onClose} aria-label="Close meal editor"><X size={20} /></button></div><div className="grid gap-4 p-5 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.12em] sm:col-span-2">Meal title<input autoFocus required value={draft.name} onChange={(event) => update({ name: event.target.value })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.12em] sm:col-span-2">Description<textarea required value={draft.description} onChange={(event) => update({ description: event.target.value })} className="mt-2 block min-h-24 w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label><label className="text-xs font-bold uppercase tracking-[.12em]">Category<select value={draft.category} onChange={(event) => update({ category: event.target.value as MenuCategory })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal">{categories.map((category) => <option key={category}>{category}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.12em]">Meal number<input type="number" min="1" value={draft.mealNumber || ''} onChange={(event) => update({ mealNumber: Number(event.target.value) })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label>{[['Calories', 'calories'], ['Protein (g)', 'protein'], ['Carbs (g)', 'carbs']].map(([label, key]) => <label key={key} className="text-xs font-bold uppercase tracking-[.12em]">{label}<input type="number" min="0" value={draft[key as 'calories' | 'protein' | 'carbs']} onChange={(event) => update({ [key]: Number(event.target.value) })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" /></label>)}<label className="flex items-center gap-3 border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-semibold sm:col-span-2"><input type="checkbox" checked={draft.premium} onChange={(event) => update({ premium: event.target.checked, premiumCharge: event.target.checked ? pricing.premiumCharge : 0 })} /> Premium meal <span className="ml-auto text-xs text-[#738681]">Auto price: {money(pricing.standardPrice + (draft.premium ? pricing.premiumCharge : 0))}</span></label><label className="text-xs font-bold uppercase tracking-[.12em] sm:col-span-2">Photo path / local asset<input value={draft.image} onChange={(event) => update({ image: event.target.value })} className="mt-2 block w-full border border-[#173c3a]/15 bg-white px-3 py-3 text-sm font-normal normal-case tracking-normal" placeholder="/images/menu-generated/..." /></label></div><div className="flex justify-end gap-3 border-t border-[#173c3a]/10 bg-white px-5 py-4"><button type="button" onClick={onClose} className="border border-[#173c3a]/20 px-4 py-3 text-xs font-bold uppercase tracking-[.1em]">Cancel</button><button type="submit" className="bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.1em] text-white">{meal ? 'Save meal' : 'Add meal'}</button></div></form></div>;
}

function OrderDetail({ order, onClose, onStatusChange, onMarkPaid }: { order: AdminOrder; onClose: () => void; onStatusChange: (id: string, status: AdminOrderStatus) => void; onMarkPaid: (id: string) => void }) {
  const manualPayment = !['Square', 'Square / Apple Pay'].includes(order.paymentMethod);
  return <div className="fixed inset-0 z-50 grid place-items-center bg-[#102d2b]/65 p-4"><div className="max-h-[90dvh] w-full max-w-[700px] overflow-y-auto bg-[#f3f5f2] shadow-2xl" role="dialog" aria-modal="true" aria-labelledby="order-detail-heading" data-testid="order-detail"><div className="flex items-start justify-between border-b border-[#173c3a]/10 bg-white px-5 py-5 sm:px-7"><div><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b28b17]">Order detail</p><h2 id="order-detail-heading" className="mt-1 text-2xl font-extrabold">{order.orderNumber}</h2><p className="mt-1 text-xs text-[#738681]">{order.date}</p></div><button type="button" onClick={onClose} aria-label="Close order detail" data-testid="button-close-order-detail"><X size={20} /></button></div><div className="space-y-5 p-5 sm:p-7"><div className="grid gap-4 sm:grid-cols-2"><Info label="Customer" value={order.customer} /><Info label="Phone / email" value={`${order.phone} / ${order.email}`} /><Info label="Fulfillment" value={`${order.fulfillment} / ${order.window}`} /><Info label="Address / zone" value={`${order.address}${order.deliveryZone ? ` / ${order.deliveryZone}` : ''}`} /><Info label="Payment method" value={order.paymentMethod} /><Info label="Payment status" value={order.payment} /></div>{manualPayment && order.payment !== 'Paid' && order.payment !== 'Refunded' && <div className="border border-[#e7d58d] bg-[#fff9df] p-4 text-sm text-[#7b6414]"><p className="font-bold">Payment pending — collect {money(order.total)}</p><p className="mt-2 text-xs leading-5">Confirm the transfer here only after the funds are visible in the payment account.</p><button type="button" onClick={() => onMarkPaid(order.id)} className="mt-4 bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white hover:bg-[#27625a]" data-testid="button-detail-mark-paid">Mark paid</button></div>}<div className="border border-[#173c3a]/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#738681]">Meals ordered / historical snapshots</p><div className="mt-3 space-y-2 text-sm">{order.items.map((item) => <div key={item.id} className="flex justify-between gap-3"><span>{item.mealName} × {item.quantity}</span><strong>{money((item.unitPrice + item.premiumCharge) * item.quantity)}</strong></div>)}</div>{order.notes && <p className="mt-4 border-t border-[#173c3a]/10 pt-4 text-xs text-[#738681]">Note: {order.notes}</p>}</div><div className="grid gap-3 border border-[#173c3a]/10 bg-white p-5 text-sm"><div className="flex justify-between"><span>Meal subtotal</span><strong>{money(order.mealSubtotal)}</strong></div><div className="flex justify-between"><span>Premium charges</span><strong>{money(order.premiumCharges)}</strong></div><div className="flex justify-between"><span>Delivery charge</span><strong>{money(order.deliveryCharge)}</strong></div><div className="flex justify-between border-t border-[#173c3a]/10 pt-3 text-lg"><span>Final total</span><strong>{money(order.total)}</strong></div></div><div className="flex flex-col justify-between gap-3 border-t border-[#173c3a]/10 pt-5 sm:flex-row sm:items-center"><label className="text-xs font-bold uppercase tracking-[.1em]">Order status<select value={order.status} onChange={(event) => onStatusChange(order.id, event.target.value as AdminOrderStatus)} className="ml-3 border border-[#173c3a]/15 bg-transparent px-3 py-2 text-sm font-semibold normal-case tracking-normal" data-testid="select-order-detail-status">{statuses.map((status) => <option key={status}>{status}</option>)}</select></label><button type="button" onClick={onClose} className="bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.12em] text-white">Done</button></div></div></div></div>;
}

function ConfirmDialog({ title, copy, onCancel, onConfirm }: { title: string; copy: string; onCancel: () => void; onConfirm: () => void }) {
  return <div className="fixed inset-0 z-[60] grid place-items-center bg-[#102d2b]/70 p-4"><div className="w-full max-w-[430px] bg-[#f3f5f2] p-6 shadow-2xl" role="dialog" aria-modal="true"><p className="text-[10px] font-bold uppercase tracking-[.15em] text-[#b28b17]">Confirm action</p><h2 className="mt-2 text-2xl font-extrabold">{title}</h2><p className="mt-3 text-sm leading-6 text-[#526863]">{copy}</p><div className="mt-6 flex justify-end gap-3"><button type="button" onClick={onCancel} className="border border-[#173c3a]/20 px-4 py-3 text-xs font-bold uppercase tracking-[.1em]">Keep draft</button><button type="button" onClick={onConfirm} className="bg-[#173c3a] px-4 py-3 text-xs font-bold uppercase tracking-[.1em] text-white">Publish now</button></div></div></div>;
}

function Panel({ title, eyebrow, action, children }: { title: string; eyebrow: string; action?: ReactNode; children: ReactNode }) { return <section className="border border-[#173c3a]/10 bg-white p-5 lg:p-6"><div className="flex items-start justify-between gap-4"><div><p className="text-[10px] font-bold uppercase tracking-[.16em] text-[#b28b17]">{eyebrow}</p><h3 className="mt-1 text-xl font-extrabold tracking-[-.03em]">{title}</h3></div>{action}</div>{children}</section>; }
function Metric({ label, value, detail }: { label: string; value: string; detail: string }) { return <div className="border border-[#173c3a]/10 bg-white p-5"><p className="text-xs font-bold uppercase tracking-[.12em] text-[#738681]">{label}</p><p className="mt-5 text-2xl font-extrabold tracking-[-.04em]">{value}</p><p className="mt-2 text-xs font-semibold text-[#35a579]">{detail}</p></div>; }
function Progress({ label, value, color }: { label: string; value: number; color: string }) { return <div><div className="mb-2 flex justify-between text-xs font-bold"><span>{label}</span><span>{value}%</span></div><div className="h-2 bg-[#e5ebe7]"><div className={`h-full ${color}`} style={{ width: `${Math.min(100, Math.max(0, value))}%` }} /></div></div>; }
function MiniBarChart({ data, showRevenue = false }: { data: typeof weeklyAnalytics; showRevenue?: boolean }) { const max = Math.max(...data.map((item) => showRevenue ? item.revenue : item.orders)); return <div className="flex h-48 items-end gap-2 sm:gap-4">{data.map((item) => { const value = showRevenue ? item.revenue : item.orders; return <div key={item.week} className="group flex h-full flex-1 flex-col items-center justify-end gap-2"><span className="text-[10px] font-bold text-[#738681] opacity-0 transition-opacity group-hover:opacity-100">{showRevenue ? `$${(value / 1000).toFixed(1)}k` : value}</span><div className={`w-full max-w-10 bg-[#174d49] transition-all group-hover:bg-[#e7bd32] ${item === data[data.length - 1] ? 'bg-[#e7bd32]' : ''}`} style={{ height: `${Math.max(8, (value / max) * 140)}px` }} /><span className="text-[10px] text-[#738681]">{item.week}</span></div>; })}</div>; }
function PerformanceTable({ rows }: { rows: typeof popularMeals }) { return <div className="mt-5 space-y-3">{rows.map((row, index) => <div key={row.name} className="flex items-center gap-3 border-b border-[#173c3a]/10 pb-3 last:border-0"><span className="grid h-7 w-7 place-items-center bg-[#e7bd32] text-xs font-black">{index + 1}</span><span className="min-w-0 flex-1"><strong className="block truncate text-sm">{row.name}</strong><small className="text-xs text-[#738681]">{row.appearances} menu appearances</small></span><strong>{row.units} units</strong></div>)}</div>; }
function Info({ label, value }: { label: string; value: string }) { return <div><p className="text-[10px] font-bold uppercase tracking-[.12em] text-[#738681]">{label}</p><p className="mt-1 text-sm font-semibold">{value || 'Not provided'}</p></div>; }
function EmptyState({ title, copy }: { title: string; copy: string }) { return <div className="py-10 text-center text-sm text-[#738681]"><UtensilsCrossed size={26} className="mx-auto mb-3 opacity-50" /><strong className="block text-[#173c3a]">{title}</strong><span className="mt-1 block">{copy}</span></div>; }
function StatusPill({ label, kind }: { label: string; kind: 'green' | 'yellow' | 'gray' | 'red' }) { const colors = { green: 'bg-[#dff3e7] text-[#277652]', yellow: 'bg-[#fff1bd] text-[#7b6414]', gray: 'bg-[#e8eeeb] text-[#526863]', red: 'bg-[#f7dddd] text-[#9c4141]' }; return <span className={`inline-flex whitespace-nowrap rounded-full px-2.5 py-1 text-[10px] font-bold ${colors[kind]}`}>{label}</span>; }
function ArrowRightIcon() { return <span aria-hidden="true">→</span>; }
function PlusIcon() { return <span aria-hidden="true" className="text-base leading-none">+</span>; }