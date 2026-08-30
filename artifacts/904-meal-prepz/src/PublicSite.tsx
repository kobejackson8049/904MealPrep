import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowRight, Check, ChevronDown, Clock3, Flame, Instagram, Leaf, Mail, MapPin, Menu as MenuIcon, Minus, Phone, Play, Plus, ShieldCheck, ShoppingBag, Sparkles, Truck, X } from 'lucide-react';
import { Link, useLocation } from 'wouter';
import { displayedMealPrice, premiumCharge, weeklyMenu, type MenuCategory, type WeeklyMeal } from '@/data/weeklyMenu';

type Fulfillment = 'pickup' | 'delivery';
type PaymentMethod = 'square' | 'apple_pay' | 'cash_app' | 'venmo' | 'zelle' | 'other_manual';
type OrderDraft = {
  fulfillment: Fulfillment;
  pickupWindow: string;
  deliveryZone: string;
  address: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
  paymentMethod: PaymentMethod;
  expectedSenderName: string;
};
type Selection = Record<string, number>;
type Countdown = { days: number; hours: number; minutes: number };
type PaymentOption = { enabled: boolean; handle: string; qrPath: string };
let configuredPaymentOptions: Partial<Record<PaymentMethod, PaymentOption>> = {
  apple_pay: { enabled: true, handle: '$904mealprepz', qrPath: '' },
  cash_app: { enabled: true, handle: '$904mealprepz', qrPath: '' },
};

const publicNav = [
  { href: '/', label: 'Home' },
  { href: '/menu', label: "This week's menu" },
  { href: '/order', label: 'Build your order' },
  { href: '/how-it-works', label: 'How it works' },
  { href: '/about', label: 'About' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/contact', label: 'Contact' },
];
const publicGroups: Array<{ label: string; categories: MenuCategory[] }> = [
  { label: 'Breakfast', categories: ['Breakfast'] },
  { label: 'Lunch', categories: ['Entrées'] },
  { label: 'Dinner', categories: ['Healthier Entrées'] },
  { label: 'Premium', categories: ['Premium Meals'] },
];
const emptyDraft: OrderDraft = {
  fulfillment: 'pickup',
  pickupWindow: weeklyMenu.pickupWindows[0],
  deliveryZone: weeklyMenu.deliveryZones[0].id,
  address: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
  paymentMethod: 'square',
  expectedSenderName: '',
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function padded(value: number) {
  return String(value).padStart(2, '0');
}

function paymentLabel(method: PaymentMethod) {
  return ({ square: 'Square', apple_pay: 'Apple Pay', cash_app: 'Cash App', venmo: 'Venmo', zelle: 'Zelle', other_manual: 'Other supported method' })[method];
}

function paymentInstructions(method: PaymentMethod) {
  return ({
    apple_pay: import.meta.env.VITE_PAYMENT_APPLE_PAY_INSTRUCTIONS || 'Apple Pay instructions will be sent with your order confirmation.',
    cash_app: import.meta.env.VITE_PAYMENT_CASH_APP_INSTRUCTIONS || 'Cash App instructions will be sent with your order confirmation.',
    venmo: import.meta.env.VITE_PAYMENT_VENMO_INSTRUCTIONS || 'Venmo instructions will be sent with your order confirmation.',
    zelle: import.meta.env.VITE_PAYMENT_ZELLE_INSTRUCTIONS || 'Zelle instructions will be sent with your order confirmation.',
    other_manual: import.meta.env.VITE_PAYMENT_OTHER_INSTRUCTIONS || 'Payment instructions will be sent with your order confirmation.',
  } as Partial<Record<PaymentMethod, string>>)[method] || '';
}

function remainingTime(deadline: Date, now: Date): Countdown {
  const difference = Math.max(0, deadline.getTime() - now.getTime());
  const minutes = Math.floor(difference / 60000);
  return { days: Math.floor(minutes / 1440), hours: Math.floor((minutes % 1440) / 60), minutes: minutes % 60 };
}

function readPublishedMenu() {
  try {
    const stored = JSON.parse(localStorage.getItem('904-published-menu') || 'null');
    if (stored && Array.isArray(stored.meals) && stored.meals.length) {
      return { ...weeklyMenu, ...stored, meals: stored.meals } as typeof weeklyMenu;
    }
  } catch {
    // The committed weekly menu remains the portable default.
  }
  return weeklyMenu;
}

function Logo({ light = false, compact = false }: { light?: boolean; compact?: boolean }) {
  return (
    <Link href="/" className={`flex items-center gap-2.5 ${light ? 'text-[#f7f4eb]' : 'text-[#073d45]'}`} data-testid="link-logo">
      <span className={`overflow-hidden rounded-sm border ${light ? 'border-[#efb22d]/50 bg-[#f7f4eb]' : 'border-[#073d45]/15 bg-[#f7f4eb]'} ${compact ? 'h-12 w-9' : 'h-14 w-10'}`}>
        <img src="/images/brand/904-meal-prepz-logo.jpeg" alt="904 Meal Prepz logo" className="h-full w-full object-cover object-top" />
      </span>
      {!compact && <span className="font-extrabold tracking-[-.04em] text-[15px] leading-none">904<br /><span className="text-[10px] tracking-[.18em]">MEAL PREPZ</span></span>}
    </Link>
  );
}

function PublicShell({ children, currentPath, cartCount = 0 }: { children: ReactNode; currentPath: string; cartCount?: number }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  return (
    <div className="site-shell min-h-[100dvh] bg-[#f7f4eb] text-[#073d45]">
      <header className="sticky top-0 z-40 border-b border-[#f7f4eb]/15 bg-[#073d45] text-[#f7f4eb] shadow-[0_10px_35px_rgba(7,61,69,.12)]">
        <div className="mx-auto flex max-w-[1380px] items-center justify-between gap-5 px-5 py-4 lg:px-10">
          <Logo light />
          <nav className="hidden items-center gap-5 xl:flex" aria-label="Main navigation">
            {publicNav.map((item) => <Link key={item.href} href={item.href} className={`text-[11px] font-extrabold uppercase tracking-[.12em] transition-colors hover:text-[#efb22d] ${currentPath === item.href ? 'text-[#efb22d]' : 'text-[#f7f4eb]/75'}`} data-testid={`link-nav-${item.href === '/' ? 'home' : item.href.slice(1).replaceAll('/', '-')}`}>{item.label}</Link>)}
          </nav>
          <div className="ml-auto flex items-center gap-2">
            <Link href="/order" className="inline-flex items-center gap-2 bg-[#efb22d] px-3 py-2.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#073d45] transition-transform hover:-translate-y-0.5 sm:px-4" data-testid="link-order-now">Order now <ArrowRight size={14} /></Link>
            <Link href="/order" className="relative grid h-10 w-10 place-items-center border border-[#f7f4eb]/25 hover:border-[#efb22d]" aria-label="Open your order" data-testid="link-week-summary"><ShoppingBag size={17} />{cartCount > 0 && <span className="absolute -right-1 -top-1 grid h-5 min-w-5 place-items-center rounded-full bg-[#efb22d] px-1 text-[9px] font-black text-[#073d45]">{cartCount}</span>}</Link>
            <button type="button" onClick={() => setMobileOpen((open) => !open)} className="grid h-10 w-10 place-items-center border border-[#f7f4eb]/25 xl:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">{mobileOpen ? <X size={19} /> : <MenuIcon size={19} />}</button>
          </div>
        </div>
        {mobileOpen && <nav className="border-t border-[#f7f4eb]/15 bg-[#062e35] px-5 py-4 xl:hidden" aria-label="Mobile navigation">{publicNav.map((item) => <Link key={item.href} onClick={() => setMobileOpen(false)} href={item.href} className={`block border-b border-[#f7f4eb]/10 py-3 text-xs font-extrabold uppercase tracking-[.14em] last:border-0 ${currentPath === item.href ? 'text-[#efb22d]' : 'text-[#f7f4eb]/80'}`}>{item.label}</Link>)}</nav>}
      </header>
      {children}
      <footer className="bg-[#062e35] px-5 py-12 text-[#f7f4eb] lg:px-10">
        <div className="mx-auto grid max-w-[1380px] gap-10 md:grid-cols-[1.3fr_1fr_1fr_1fr]">
          <div><Logo light /><p className="mt-5 max-w-[270px] text-sm leading-6 text-[#f7f4eb]/60">Chef-prepared meals for real schedules. Proudly cooking and delivering around Jacksonville, Florida.</p></div>
          <FooterColumn title="Explore"><Link href="/menu">This week's menu</Link><Link href="/how-it-works">How it works</Link><Link href="/gallery">Food gallery</Link></FooterColumn>
          <FooterColumn title="Get started"><Link href="/order">Build your order</Link><Link href="/contact">FAQ / contact</Link><Link href="/admin">Owner login</Link><a href="tel:+19045550184">(904) 555-0184</a><a href="mailto:hello@904mealprepz.com">hello@904mealprepz.com</a></FooterColumn>
          <FooterColumn title="Find us"><a href="https://instagram.com/904mealprepz" target="_blank" rel="noreferrer"><Instagram size={15} /> @904mealprepz</a><span><MapPin size={15} /> Jacksonville, FL</span><span><Clock3 size={15} /> Sunday pickup</span></FooterColumn>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1380px] justify-between border-t border-[#f7f4eb]/15 pt-5 text-[10px] uppercase tracking-[.15em] text-[#f7f4eb]/40"><span>© 2026 904 Meal Prepz</span><span>Made for the 904</span></div>
      </footer>
    </div>
  );
}

function FooterColumn({ title, children }: { title: string; children: ReactNode }) {
  return <div><p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#efb22d]">{title}</p><div className="space-y-3 text-sm text-[#f7f4eb]/70 [&>a]:flex [&>a]:items-center [&>a]:gap-2 [&>a]:hover:text-[#efb22d] [&>span]:flex [&>span]:items-center [&>span]:gap-2">{children}</div></div>;
}

function PageIntro({ eyebrow, title, copy, dark = false }: { eyebrow: string; title: ReactNode; copy: string; dark?: boolean }) {
  return <section className={`${dark ? 'bg-[#073d45] text-[#f7f4eb]' : 'bg-[#f7f4eb] text-[#073d45]'} px-5 pb-16 pt-16 lg:px-10 lg:pb-24 lg:pt-24`}><div className="mx-auto max-w-[1380px]"><p className={`mb-5 text-[10px] font-extrabold uppercase tracking-[.2em] ${dark ? 'text-[#efb22d]' : 'text-[#157f8f]'}`}>{eyebrow}</p><h1 className="display-face max-w-[850px] text-[clamp(3.5rem,8vw,7.6rem)] font-semibold leading-[.86]">{title}</h1><p className={`mt-8 max-w-[530px] text-base leading-7 ${dark ? 'text-[#f7f4eb]/68' : 'text-[#073d45]/68'}`}>{copy}</p></div></section>;
}

function DeadlineBanner({ orderingOpen, countdown }: { orderingOpen: boolean; countdown: Countdown }) {
  return <div className={`flex flex-col gap-4 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${orderingOpen ? 'border-[#efb22d] bg-[#073d45] text-[#f7f4eb]' : 'border-[#073d45]/15 bg-[#e4dfd1]'}`} data-testid="deadline-banner">{orderingOpen ? <><div className="flex items-center gap-3"><Clock3 size={20} className="text-[#efb22d]" /><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#efb22d]">Orders close in</p><p className="mt-1 font-mono text-lg font-bold tracking-[.06em]" data-testid="text-order-countdown">{padded(countdown.days)} DAY : {padded(countdown.hours)} HOURS : {padded(countdown.minutes)} MIN</p></div></div><p className="text-xs uppercase tracking-[.1em] text-[#f7f4eb]/60">Weekly cutoff / Saturday at noon</p></> : <p className="text-sm font-bold" data-testid="text-ordering-closed">Ordering for this week's menu has closed. Check back for the next drop.</p>}</div>;
}

function HomePage({ orderingOpen, countdown }: { orderingOpen: boolean; countdown: Countdown }) {
  return <main>
    <section className="relative overflow-hidden bg-[#073d45] text-[#f7f4eb]"><img src="/images/meals/hero-salmon.jpg" alt="Blackened salmon meal with roasted vegetables" className="absolute inset-0 h-full w-full object-cover opacity-35" /><div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(7,61,69,.99),rgba(7,61,69,.72)_55%,rgba(7,61,69,.2))]" /><div className="relative mx-auto grid min-h-[670px] max-w-[1380px] items-end gap-10 px-5 pb-16 pt-20 lg:grid-cols-[1fr_300px] lg:px-10 lg:pb-24"><div><p className="mb-7 text-[10px] font-extrabold uppercase tracking-[.2em] text-[#efb22d]">Jacksonville, Florida / 904 proud</p><h1 className="display-face max-w-[780px] text-[clamp(4.5rem,11vw,10rem)] font-semibold leading-[.78]">Eat like<br /><em className="not-italic text-[#efb22d]">you mean it.</em></h1><p className="mt-8 max-w-[465px] text-base leading-7 text-[#f7f4eb]/72 sm:text-lg">Flavor-forward, chef-prepared meals for the weeks that do not slow down. Choose your quantities once, then let us handle the prep.</p><div className="mt-9 flex flex-wrap gap-3"><Link href="/order" className="inline-flex items-center gap-3 bg-[#efb22d] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.15em] text-[#073d45] transition-transform hover:-translate-y-0.5" data-testid="button-hero-build">Build my order <ArrowDownRight size={17} /></Link><Link href="/menu" className="inline-flex items-center gap-2 border border-[#f7f4eb]/35 px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.15em] hover:border-[#efb22d] hover:text-[#efb22d]" data-testid="button-hero-menu">View this week's menu <ArrowRight size={16} /></Link></div><p className="mt-7 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#f7f4eb]/45">Meals from $8 / Sunday pickup + local delivery</p></div><div className="justify-self-end"><div className="w-[205px] rotate-2 border border-[#efb22d]/70 bg-[#f7f4eb] p-2 shadow-2xl"><img src="/images/brand/904-meal-prepz-logo.jpeg" alt="904 Meal Prepz illustrated logo" className="h-auto w-full" /><p className="bg-[#073d45] px-2 py-2 text-center text-[9px] font-extrabold uppercase tracking-[.16em] text-[#efb22d]">In our hearts. In our drive.</p></div></div></div></section>
    <div className="overflow-hidden bg-[#efb22d] py-3 text-[#073d45]"><div className="ticker flex w-max gap-8 whitespace-nowrap">{Array.from({ length: 2 }).map((_, index) => <span key={index} className="flex items-center gap-8 text-[10px] font-extrabold uppercase tracking-[.2em]"><span>Flavor forward</span><span>/</span><span>Built for busy</span><span>/</span><span>Preorder weekly</span><span>/</span><span>Made in 904</span><span>/</span></span>)}</div></div>
    <section className="mx-auto max-w-[1380px] px-5 py-16 lg:px-10 lg:py-24"><div className="flex flex-col justify-between gap-7 md:flex-row md:items-end"><div><p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">The current drop / 01</p><h2 className="display-face text-5xl font-semibold leading-[.88] sm:text-7xl">A better week<br /><span className="text-[#d18e19]">starts here.</span></h2></div><p className="max-w-[340px] text-sm leading-6 text-[#073d45]/65">The menu rotates weekly. Browse the full drop, then build an order around the meals you actually want to eat.</p></div><div className="mt-8"><DeadlineBanner orderingOpen={orderingOpen} countdown={countdown} /></div><div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">{weeklyMenu.meals.slice(0, 4).map((meal, index) => <FeaturedMeal key={meal.id} meal={meal} index={index} />)}</div><div className="mt-10 flex flex-wrap gap-3"><Link href="/menu" className="inline-flex items-center gap-2 bg-[#073d45] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em] text-[#f7f4eb] hover:bg-[#157f8f]">See the full menu <ArrowRight size={16} /></Link><Link href="/order" className="inline-flex items-center gap-2 border border-[#073d45]/25 px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em] hover:border-[#157f8f] hover:text-[#157f8f]">Build your order <ShoppingBag size={16} /></Link></div></section>
    <section className="bg-[#0b6470] px-5 py-16 text-[#f7f4eb] lg:px-10 lg:py-24"><div className="mx-auto grid max-w-[1380px] gap-12 lg:grid-cols-[.75fr_1.25fr]"><div><p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#efb22d]">How it works / 02</p><h2 className="display-face max-w-[470px] text-5xl font-semibold leading-[.88] sm:text-7xl">Your week,<br /><span className="text-[#efb22d]">handled.</span></h2><Link href="/how-it-works" className="mt-8 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#efb22d] hover:text-[#f7f4eb]">See the process <ArrowRight size={16} /></Link></div><div className="grid border-t border-[#f7f4eb]/20 sm:grid-cols-3 lg:border-l lg:border-t-0">{[['01', 'Choose', 'Pick meals and quantities before the weekly cutoff.'], ['02', 'We cook', 'Small-batch prep happens fresh in our Jacksonville kitchen.'], ['03', 'Enjoy', 'Pickup or local delivery gets dinner off your plate.']].map(([number, title, copy]) => <div key={number} className="border-b border-[#f7f4eb]/20 px-0 py-6 sm:border-b-0 sm:border-r sm:px-6 sm:py-0 last:border-0"><p className="font-mono text-sm text-[#efb22d]">{number}</p><h3 className="mt-9 text-xl font-extrabold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#f7f4eb]/65">{copy}</p></div>)}</div></div></section>
    <section className="bg-[#062e35] px-5 py-16 text-[#f7f4eb] lg:px-10 lg:py-24"><div className="mx-auto grid max-w-[1380px] items-center gap-12 lg:grid-cols-[1fr_.85fr]"><div className="relative min-h-[450px] overflow-hidden"><video autoPlay muted loop playsInline controls preload="metadata" poster="/images/meals/real-meal-lineup.jpg" className="absolute inset-0 h-full w-full object-cover" aria-label="904 Meal Prepz kitchen preparation video"><source src="/videos/kitchen-prep.mp4" type="video/mp4" /></video><div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#062e35]/70 to-transparent" /><div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-3 text-xs font-extrabold uppercase tracking-[.13em]"><span className="grid h-9 w-9 place-items-center border border-[#f7f4eb]/50"><Play size={14} fill="currentColor" /></span> Real kitchen / real footage</div></div><div><p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#efb22d]">The 904 difference / 03</p><h2 className="display-face text-5xl font-semibold leading-[.88] sm:text-7xl">Convenience<br /><span className="text-[#efb22d]">with a point of view.</span></h2><p className="mt-8 max-w-[470px] text-base leading-7 text-[#f7f4eb]/65">We believe prepared food should still feel like something you were excited to order. Bold seasoning, balanced plates, and a menu that keeps moving.</p><Link href="/about" className="mt-8 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#efb22d] hover:text-[#f7f4eb]">Read our story <ArrowRight size={16} /></Link></div></div></section>
    <section className="bg-[#e4dfd1] px-5 py-16 lg:px-10 lg:py-20"><div className="mx-auto grid max-w-[1380px] gap-8 lg:grid-cols-[.8fr_1.2fr] lg:items-end"><div><p className="mb-4 text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">The word on the street / 04</p><h2 className="display-face text-5xl font-semibold leading-[.88] sm:text-7xl">Good food<br /><span className="text-[#d18e19]">travels.</span></h2></div><div className="grid gap-5 sm:grid-cols-3">{['Flavor that does not taste like meal prep.', 'The easiest decision I make all week.', 'Portions that keep me going, not slowing.'].map((quote) => <figure key={quote} className="border-t-2 border-[#073d45] pt-4"><div className="text-3xl text-[#d18e19]">“</div><blockquote className="mt-2 text-sm font-semibold leading-6 text-[#073d45]/75">{quote}</blockquote><figcaption className="mt-6 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#073d45]/45">Future customer / Jacksonville</figcaption></figure>)}</div></div></section>
  </main>;
}

function FeaturedMeal({ meal, index }: { meal: WeeklyMeal; index: number }) {
  return <Link href="/menu" className="group block" data-testid={`card-featured-${meal.id}`}><div className="relative aspect-[1.05] overflow-hidden bg-[#e4dfd1]"><img src={meal.image} alt={meal.name} loading={index > 1 ? 'lazy' : undefined} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-[#efb22d] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#073d45]">#{padded(meal.mealNumber)} {meal.premium ? 'Premium' : 'This week'}</span></div><div className="border-b border-[#073d45]/15 py-4"><div className="flex justify-between gap-3"><h3 className="text-lg font-extrabold tracking-[-.03em]">{meal.name}</h3><span className="font-bold">{money(displayedMealPrice(meal))}</span></div><p className="mt-2 text-xs leading-5 text-[#073d45]/60">{meal.description}</p></div></Link>;
}

function MenuPage() {
  return <main><PageIntro eyebrow="The weekly drop / 01" title={<>This week's<br /><span className="text-[#d18e19]">menu.</span></>} copy="Everything currently published for the active week, grouped so you can scan it fast. Pick your favorites, then build quantities on the order page." /><section className="mx-auto max-w-[1380px] px-5 pb-20 lg:px-10 lg:pb-28"><div className="mb-10 flex flex-wrap items-center justify-between gap-4 border-b border-[#073d45]/15 pb-6"><p className="text-sm text-[#073d45]/65">{weeklyMenu.meals.length} meals published this week / standard meals $8 / premium meals $10</p><Link href="/order" className="inline-flex items-center gap-2 bg-[#efb22d] px-5 py-3 text-xs font-extrabold uppercase tracking-[.13em] text-[#073d45]">Build my order <ShoppingBag size={15} /></Link></div>{publicGroups.map((group) => { const meals = weeklyMenu.meals.filter((meal) => group.categories.includes(meal.category)); return <section key={group.label} className="mb-16" aria-labelledby={`menu-${group.label}`}><div className="mb-7 flex items-end justify-between border-b-2 border-[#073d45] pb-3"><h2 id={`menu-${group.label}`} className="text-sm font-extrabold uppercase tracking-[.17em]">{group.label}</h2><span className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#157f8f]">{meals.length} options</span></div><div className="grid gap-x-6 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">{meals.map((meal, index) => <MenuMealCard key={meal.id} meal={meal} index={index} />)}</div></section>; })}</section></main>;
}

function MenuMealCard({ meal, index }: { meal: WeeklyMeal; index: number }) {
  return <article className="group" data-testid={`card-menu-${meal.id}`}><div className="relative aspect-[1.15] overflow-hidden bg-[#e4dfd1]"><img src={meal.image} alt={`${meal.name}, ${meal.description}`} loading={index > 1 ? 'lazy' : undefined} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><div className="absolute inset-x-0 bottom-0 flex items-center justify-between gap-2 bg-[#073d45]/90 px-3 py-2 text-[9px] font-extrabold uppercase tracking-[.1em] text-[#f7f4eb]"><span>#{padded(meal.mealNumber)}</span><span>{meal.calories} cal / {meal.protein}g protein / {meal.carbs}g carbs</span></div>{meal.premium && <span className="absolute left-3 top-3 bg-[#efb22d] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[.13em] text-[#073d45]">Premium / $10</span>}</div><div className="border-b border-[#073d45]/15 py-4"><div className="flex items-start justify-between gap-4"><div><p className="mb-1 text-[10px] font-extrabold uppercase tracking-[.14em] text-[#157f8f]">{meal.category}</p><h3 className="text-xl font-extrabold tracking-[-.035em]">{meal.name}</h3></div><span className="text-lg font-extrabold">{money(displayedMealPrice(meal))}</span></div><p className="mt-2 text-sm leading-6 text-[#073d45]/65">{meal.description}</p><Link href="/order" className="mt-5 inline-flex items-center gap-2 text-[10px] font-extrabold uppercase tracking-[.13em] text-[#157f8f] hover:text-[#d18e19]">Choose quantities <ArrowRight size={14} /></Link></div></article>;
}

function QuantityControl({ quantity, onChange, disabled = false }: { quantity: number; onChange: (amount: number) => void; disabled?: boolean }) {
  return <div className="flex items-center border border-[#073d45]/20" aria-label="Quantity controls"><button type="button" onClick={() => onChange(-1)} disabled={disabled || quantity === 0} className="grid h-9 w-9 place-items-center hover:bg-[#e4dfd1] disabled:opacity-30" aria-label="Decrease quantity"><Minus size={14} /></button><span className="grid h-9 min-w-9 place-items-center border-x border-[#073d45]/20 text-sm font-extrabold" data-testid="text-quantity">{quantity}</span><button type="button" onClick={() => onChange(1)} disabled={disabled} className="grid h-9 w-9 place-items-center bg-[#efb22d] text-[#073d45] hover:bg-[#d99c1f] disabled:opacity-30" aria-label="Increase quantity"><Plus size={14} /></button></div>;
}

function OrderMealCard({ meal, quantity, orderingOpen, onChange, index }: { meal: WeeklyMeal; quantity: number; orderingOpen: boolean; onChange: (amount: number) => void; index: number }) {
  return <article className="group" data-testid={`card-order-${meal.id}`}><div className="relative aspect-[1.12] overflow-hidden bg-[#e4dfd1]"><img src={meal.image} alt={meal.name} loading={index > 2 ? 'lazy' : undefined} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-[#efb22d] px-2.5 py-1.5 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#073d45]">#{padded(meal.mealNumber)} {meal.premium ? 'Premium' : meal.category}</span></div><div className="border-b border-[#073d45]/15 py-4"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.13em] text-[#157f8f]">{meal.category}</p><h3 className="mt-1 text-lg font-extrabold tracking-[-.03em]">{meal.name}</h3></div><span className="text-lg font-extrabold">{money(displayedMealPrice(meal))}</span></div><p className="mt-2 text-sm leading-6 text-[#073d45]/62">{meal.description}</p><div className="mt-4 flex items-center justify-between gap-3"><span className="text-[10px] font-bold uppercase tracking-[.1em] text-[#073d45]/50">{meal.calories} cal / {meal.protein}g protein</span><QuantityControl quantity={quantity} onChange={onChange} disabled={!orderingOpen} /></div></div></article>;
}

type SelectedItem = { meal: WeeklyMeal; quantity: number };
function OrderSummary({ items, totalMeals, mealSubtotal, premiumCharges, deliveryFee = 0, onChange, onContinue, onPreviewPayments, orderingOpen }: { items: SelectedItem[]; totalMeals: number; mealSubtotal: number; premiumCharges: number; deliveryFee?: number; onChange: (meal: WeeklyMeal, amount: number) => void; onContinue: () => void; onPreviewPayments: () => void; orderingOpen: boolean }) {
  return <aside className="border border-[#073d45]/15 bg-[#e4dfd1] p-5 lg:sticky lg:top-28" data-testid="order-summary"><div className="flex items-start justify-between gap-3"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#157f8f]">Your order</p><h2 className="mt-2 text-2xl font-extrabold tracking-[-.04em]">{totalMeals} meal{totalMeals === 1 ? '' : 's'} selected</h2></div><ShoppingBag size={21} className="text-[#d18e19]" /></div>{items.length ? <div className="mt-6 space-y-3 border-t border-[#073d45]/15 pt-4">{items.map(({ meal, quantity }) => <div key={meal.id} className="flex items-center justify-between gap-3 text-sm"><div className="min-w-0"><p className="truncate font-bold">{meal.name}</p><p className="text-xs text-[#073d45]/55">Qty {quantity} / {money(meal.price * quantity + (meal.premium ? premiumCharge * quantity : 0))}</p></div><QuantityControl quantity={quantity} onChange={(amount) => onChange(meal, amount)} disabled={!orderingOpen} /></div>)}</div> : <p className="mt-6 border-t border-[#073d45]/15 pt-4 text-sm leading-6 text-[#073d45]/60">Your weekly lineup is waiting. Use the plus buttons to start building.</p>}<div className="mt-6 space-y-2 border-t border-[#073d45]/15 pt-4 text-sm"><div className="flex justify-between"><span className="text-[#073d45]/65">Standard meal charges</span><span>{money(mealSubtotal)}</span></div><div className="flex justify-between"><span className="text-[#073d45]/65">Premium meal charges</span><span>{money(premiumCharges)}</span></div>{deliveryFee > 0 && <div className="flex justify-between"><span className="text-[#073d45]/65">Delivery</span><span>{money(deliveryFee)}</span></div>}<div className="flex justify-between border-t border-[#073d45]/15 pt-3 text-lg font-extrabold"><span>Subtotal</span><span>{money(mealSubtotal + premiumCharges + deliveryFee)}</span></div></div><button type="button" onClick={onContinue} disabled={!orderingOpen} className="mt-6 flex w-full items-center justify-center gap-2 bg-[#073d45] px-4 py-3.5 text-xs font-extrabold uppercase tracking-[.13em] text-[#f7f4eb] hover:bg-[#157f8f] disabled:cursor-not-allowed disabled:opacity-40" data-testid="button-checkout-start">{items.length ? 'Continue to checkout' : 'Preview payment methods'} <ArrowRight size={16} /></button>{items.length > 0 && <button type="button" onClick={onPreviewPayments} className="mt-3 flex w-full items-center justify-center gap-2 border border-[#073d45]/30 px-4 py-3 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#073d45] hover:border-[#157f8f] hover:text-[#157f8f]" data-testid="button-preview-payment-methods">Preview payment methods <ArrowRight size={14} /></button>}<p className="mt-2 text-center text-[10px] text-[#073d45]/55">{items.length ? 'Choose your meals first, then review checkout.' : 'Preview only — nothing is submitted.'}</p>{!orderingOpen && <p className="mt-3 text-xs font-semibold text-[#a14935]">Ordering is closed for this weekly menu.</p>}</aside>;
}

function OrderPage({ orderingOpen, countdown }: { orderingOpen: boolean; countdown: Countdown }) {
  const [selections, setSelections] = useState<Selection>(() => { try { return JSON.parse(localStorage.getItem('904-week') || '{}'); } catch { return {}; } });
  const [category, setCategory] = useState<'All' | MenuCategory>('All');
  const [step, setStep] = useState(() => new URLSearchParams(window.location.search).get('preview') === 'payment' ? 4 : 1);
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);
  const [submitted, setSubmitted] = useState(false);
  const [submittedOrder, setSubmittedOrder] = useState<{ orderNumber: string; instructions: string } | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [orderError, setOrderError] = useState('');
  useEffect(() => { localStorage.setItem('904-week', JSON.stringify(selections)); }, [selections]);
  useEffect(() => {
    if (new URLSearchParams(window.location.search).get('preview') !== 'payment') return;
    const timeout = window.setTimeout(() => document.getElementById('checkout-heading')?.scrollIntoView({ behavior: 'auto', block: 'start' }), 0);
    return () => window.clearTimeout(timeout);
  }, []);
  const items = useMemo(() => weeklyMenu.meals.filter((meal) => selections[meal.id] > 0).map((meal) => ({ meal, quantity: selections[meal.id] })), [selections]);
  const totalMeals = items.reduce((sum, item) => sum + item.quantity, 0);
  const mealSubtotal = items.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
  const premiumCharges = items.reduce((sum, item) => sum + (displayedMealPrice(item.meal) - item.meal.price) * item.quantity, 0);
  const deliveryFee = draft.fulfillment === 'delivery' ? weeklyMenu.deliveryZones.find((zone) => zone.id === draft.deliveryZone)?.fee || 0 : 0;
  const total = mealSubtotal + premiumCharges + deliveryFee;
  const filteredMeals = weeklyMenu.meals.filter((meal) => category === 'All' || meal.category === category);
  function updateQuantity(meal: WeeklyMeal, amount: number) { if (!orderingOpen) return; setSelections((current) => { const next = { ...current, [meal.id]: Math.max(0, (current[meal.id] || 0) + amount) }; if (!next[meal.id]) delete next[meal.id]; return next; }); }
  function updateDraft(changes: Partial<OrderDraft>) { setDraft((current) => ({ ...current, ...changes })); }
  function previewPaymentMethods() {
    const url = new URL(window.location.href);
    url.searchParams.set('preview', 'payment');
    window.history.replaceState({}, '', `${url.pathname}${url.search}`);
    setStep(4);
    window.setTimeout(() => document.getElementById('checkout-heading')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 0);
  }
  function continueFromSummary() {
    if (items.length) {
      setStep(2);
      return;
    }
    previewPaymentMethods();
  }
  async function submitOrder() {
    setSubmitting(true); setOrderError('');
    const apiBase = import.meta.env.VITE_API_BASE_URL || '/api';
    try {
      const response = await fetch(`${apiBase.replace(/\/$/, '')}/orders`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ menuId: weeklyMenu.id, customer: { name: draft.name, email: draft.email, phone: draft.phone, address: draft.address }, fulfillment: draft.fulfillment, pickupWindow: draft.pickupWindow, deliveryZone: draft.deliveryZone, deliveryAddress: draft.address, notes: draft.notes, paymentMethod: draft.paymentMethod, expectedSenderName: draft.expectedSenderName, items: items.map(({ meal, quantity }) => ({ mealId: meal.id, quantity })) }) });
      const payload = await response.json().catch(() => null) as { error?: string; order?: Record<string, unknown> & { orderNumber: string }; payment?: { instructions: string } } | null;
      if (!response.ok) throw new Error(payload?.error || 'The order service could not accept this order.');
      if (payload?.order) {
        const previewOrder = { ...payload.order, items: items.map(({ meal, quantity }) => ({ id: `${payload.order?.orderNumber}-${meal.id}`, mealId: meal.id, mealNumberSnapshot: meal.mealNumber, mealNameSnapshot: meal.name, categorySnapshot: meal.category, quantity, unitPriceSnapshot: meal.price, premiumChargeSnapshot: meal.premium ? premiumCharge : 0 })) };
        const existing = JSON.parse(localStorage.getItem('904-preview-api-orders') || '[]');
        localStorage.setItem('904-preview-api-orders', JSON.stringify([previewOrder, ...(Array.isArray(existing) ? existing : []).filter((order) => order.orderNumber !== payload.order?.orderNumber)]));
      }
      setSubmittedOrder({ orderNumber: payload?.order?.orderNumber || 'Pending', instructions: payload?.payment?.instructions || paymentInstructions(draft.paymentMethod) });
      setSubmitted(true); setStep(6);
    } catch (error) { setOrderError(error instanceof Error ? error.message : 'The order service could not accept this order.'); } finally { setSubmitting(false); }
  }
  return <main><PageIntro eyebrow="Build your order / 02" title={<>Build your<br /><span className="text-[#d18e19]">week.</span></>} copy="Choose quantities directly from this week's live menu. Every standard meal is $8; the premium meal is $10. Your selections stay together while you choose pickup, delivery, and payment." /><section className="mx-auto max-w-[1380px] px-5 pb-24 lg:px-10"><DeadlineBanner orderingOpen={orderingOpen} countdown={countdown} /><div className="mt-7 grid gap-10 lg:grid-cols-[minmax(0,1fr)_340px] lg:items-start"><div><div className="flex flex-wrap items-center gap-2 border-b border-[#073d45]/15 pb-4">{['All', ...publicGroups.map((group) => group.label)].map((label) => <button key={label} type="button" onClick={() => setCategory(label === 'All' ? 'All' : publicGroups.find((group) => group.label === label)?.categories[0] || 'All')} className={`px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.13em] ${((category === 'All' && label === 'All') || publicGroups.find((group) => group.categories.includes(category as MenuCategory))?.label === label) ? 'bg-[#073d45] text-[#f7f4eb]' : 'text-[#073d45]/65 hover:bg-[#e4dfd1]'}`}>{label}</button>)}<span className="ml-auto hidden text-[10px] font-bold uppercase tracking-[.1em] text-[#073d45]/45 sm:block">{filteredMeals.length} meals published</span></div><div className="mt-8 space-y-14">{publicGroups.map((group) => { const groupMeals = filteredMeals.filter((meal) => group.categories.includes(meal.category)); if (!groupMeals.length) return null; return <section key={group.label}><div className="mb-5 flex items-center justify-between border-b-2 border-[#073d45] pb-3"><h2 className="text-sm font-extrabold uppercase tracking-[.16em]">{group.label}</h2><span className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#157f8f]">{groupMeals.length} options</span></div><div className="grid gap-x-5 gap-y-10 sm:grid-cols-2">{groupMeals.map((meal, index) => <OrderMealCard key={meal.id} meal={meal} index={index} quantity={selections[meal.id] || 0} orderingOpen={orderingOpen} onChange={(amount) => updateQuantity(meal, amount)} />)}</div></section>; })}</div></div><OrderSummary items={items} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} onChange={updateQuantity} onContinue={continueFromSummary} onPreviewPayments={previewPaymentMethods} orderingOpen={orderingOpen} /></div><div className="mt-10 lg:hidden"><OrderSummary items={items} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} onChange={updateQuantity} onPreviewPayments={previewPaymentMethods} onContinue={continueFromSummary} orderingOpen={orderingOpen} /></div></section>{step > 1 && <CheckoutPanel step={step} setStep={setStep} draft={draft} updateDraft={updateDraft} items={items} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} deliveryFee={deliveryFee} total={total} submitted={submitted} submittedOrder={submittedOrder} submitting={submitting} error={orderError} onComplete={submitOrder} />}</main>;
}

function CheckoutPanel({ step, setStep, draft, updateDraft, items, totalMeals, mealSubtotal, premiumCharges, deliveryFee, total, submitted, submittedOrder, submitting, error, onComplete }: { step: number; setStep: (step: number) => void; draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void; items: SelectedItem[]; totalMeals: number; mealSubtotal: number; premiumCharges: number; deliveryFee: number; total: number; submitted: boolean; submittedOrder: { orderNumber: string; instructions: string } | null; submitting: boolean; error: string; onComplete: () => void }) {
  const manualPayment = draft.paymentMethod !== 'square';
  const customerComplete = Boolean(draft.name.trim() && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email.trim()) && draft.phone.trim());
  const canContinue = step === 3 ? customerComplete : step !== 4 || !manualPayment || Boolean(draft.expectedSenderName.trim());
  return <section className="border-t-8 border-[#efb22d] bg-[#073d45] px-5 py-16 text-[#f7f4eb] lg:px-10 lg:py-24" aria-labelledby="checkout-heading"><div className="mx-auto max-w-[1100px]"><div className="flex flex-wrap items-center justify-between gap-5"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#efb22d]">Your order / checkout</p><h2 id="checkout-heading" className="display-face mt-3 text-5xl font-semibold leading-[.88] sm:text-7xl">{submitted ? 'You are all set.' : <>Finish your<br /><span className="text-[#efb22d]">order.</span></>}</h2></div>{!submitted && <div className="flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-[.08em] text-[#f7f4eb]/60">{[2, 3, 4, 5, 6].map((number) => <span key={number} className={`grid h-8 w-8 place-items-center rounded-full border ${step === number ? 'border-[#efb22d] bg-[#efb22d] text-[#073d45]' : step > number ? 'border-[#5cc2a0] bg-[#5cc2a0] text-[#073d45]' : 'border-[#f7f4eb]/25'}`}>{step > number ? <Check size={14} /> : number}</span>)}</div>}</div>{submitted ? <Confirmation total={total} method={draft.paymentMethod} order={submittedOrder} /> : <div className="mt-12 grid gap-10 lg:grid-cols-[1fr_300px]"><div>{step === 2 && <FulfillmentStep draft={draft} updateDraft={updateDraft} />}{step === 3 && <CustomerStep draft={draft} updateDraft={updateDraft} />}{step === 4 && <PaymentStep draft={draft} updateDraft={updateDraft} total={total} />}{step === 5 && <ReviewStep draft={draft} items={items} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} deliveryFee={deliveryFee} total={total} error={error} />}</div>{step < 6 && <div className="flex flex-col justify-end gap-3"><div className="border border-[#f7f4eb]/15 bg-[#0b6470] p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#efb22d]">Step {step} of 6</p><p className="mt-3 text-sm leading-6 text-[#f7f4eb]/72">{step === 2 ? 'Tell us where your meals should meet you.' : step === 3 ? 'A valid email is required for order and payment confirmation.' : step === 4 ? 'Manual payments remain pending until the owner verifies receipt.' : 'Review everything before you place the preorder.'}</p></div><div className="flex gap-3"><button type="button" onClick={() => setStep(step === 2 ? 1 : step - 1)} className="flex-1 border border-[#f7f4eb]/25 px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] hover:border-[#efb22d]">Back</button>{step < 5 ? <button type="button" onClick={() => setStep(step + 1)} disabled={!canContinue} className="flex-1 bg-[#efb22d] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-[#073d45] hover:bg-[#d99c1f] disabled:opacity-40">Next <ArrowRight size={15} className="ml-1 inline" /></button> : <button type="button" onClick={onComplete} disabled={submitting} className="flex-1 bg-[#efb22d] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-[#073d45] hover:bg-[#d99c1f] disabled:opacity-50">{submitting ? 'Sending...' : manualPayment ? 'I’ve sent / will send payment' : 'Place preorder'} <Check size={15} className="ml-1 inline" /></button>}</div></div>}</div>}</div></section>;
}

function StepLabel({ number, children }: { number: string; children: ReactNode }) { return <div className="mb-6 flex items-center gap-3"><span className="grid h-8 w-8 place-items-center rounded-full bg-[#efb22d] text-sm font-black text-[#073d45]">{number}</span><h3 className="text-2xl font-extrabold tracking-[-.04em]">{children}</h3></div>; }
function FulfillmentStep({ draft, updateDraft }: { draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void }) {
  return <div><StepLabel number="2">Pickup or delivery</StepLabel><div className="grid gap-4 sm:grid-cols-2">{[['pickup', 'Sunday pickup', 'Choose a window and collect from Jacksonville.'], ['delivery', 'Local delivery', 'We deliver across the 904 zone for a small fee.']].map(([value, title, copy]) => <button key={value} type="button" onClick={() => updateDraft({ fulfillment: value as Fulfillment })} className={`border p-5 text-left transition ${draft.fulfillment === value ? 'border-[#efb22d] bg-[#0b6470]' : 'border-[#f7f4eb]/20 hover:border-[#f7f4eb]/50'}`}><div className="flex justify-between gap-3"><span className="text-lg font-extrabold">{title}</span><span className={`grid h-5 w-5 place-items-center rounded-full border ${draft.fulfillment === value ? 'border-[#efb22d] bg-[#efb22d]' : 'border-[#f7f4eb]/35'}`}>{draft.fulfillment === value && <Check size={12} className="text-[#073d45]" />}</span></div><p className="mt-2 text-sm leading-6 text-[#f7f4eb]/60">{copy}</p></button>)}</div>{draft.fulfillment === 'pickup' ? <label className="mt-6 block text-xs font-bold uppercase tracking-[.12em]">Pickup window<select value={draft.pickupWindow} onChange={(event) => updateDraft({ pickupWindow: event.target.value })} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#0b6470] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none focus:border-[#efb22d]">{weeklyMenu.pickupWindows.map((window) => <option key={window} value={window}>{window}</option>)}</select></label> : <div className="mt-6 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.12em]">Delivery zone<select value={draft.deliveryZone} onChange={(event) => updateDraft({ deliveryZone: event.target.value })} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#0b6470] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none focus:border-[#efb22d]">{weeklyMenu.deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} / +{money(zone.fee)}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.12em]">Delivery address<input value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#0b6470] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none placeholder:text-[#f7f4eb]/35 focus:border-[#efb22d]" placeholder="Street, city, ZIP" /></label></div>}</div>;
}
function CustomerStep({ draft, updateDraft }: { draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void }) {
  const fields: Array<[keyof OrderDraft, string, string]> = [['name', 'Name', 'Your name'], ['email', 'Email', 'you@example.com'], ['phone', 'Phone', '(904) 555-0184']];
  return <div><StepLabel number="3">Your information</StepLabel><p className="mb-5 text-sm text-[#f7f4eb]/65">Name, email, and phone are required so the order can be sent to the owner’s admin panel and you can receive confirmation.</p><div className="grid gap-4 sm:grid-cols-2">{fields.map(([key, label, placeholder]) => <label key={key} className="text-xs font-bold uppercase tracking-[.12em]">{label}<input required type={key === 'email' ? 'email' : 'text'} value={draft[key] as string} onChange={(event) => updateDraft({ [key]: event.target.value })} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#0b6470] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none placeholder:text-[#f7f4eb]/35 focus:border-[#efb22d]" placeholder={placeholder} /></label>)}<label className="text-xs font-bold uppercase tracking-[.12em] sm:col-span-2">Notes <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} className="mt-2 block min-h-28 w-full border border-[#f7f4eb]/25 bg-[#0b6470] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none placeholder:text-[#f7f4eb]/35 focus:border-[#efb22d]" placeholder="Allergies, timing notes, or anything else we should know." /></label></div></div>;
}
function PaymentStep({ draft, updateDraft, total }: { draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void; total: number }) {
  const methods: Array<[PaymentMethod, string, string]> = ([['square', 'Square', 'Secure checkout when Square is connected.'], ['apple_pay', 'Apple Pay', 'Send payment to the Apple Pay tag shown below.'], ['cash_app', 'Cash App', 'Send payment to the Cash App handle shown below.'], ['venmo', 'Venmo', 'Send payment to the Venmo handle shown below.'], ['zelle', 'Zelle', 'Send payment to the Zelle contact shown below.'], ['other_manual', 'Other supported method', 'Ask us for the current option.']] as Array<[PaymentMethod, string, string]>).filter(([value]) => value === 'square' || value === 'other_manual' || configuredPaymentOptions[value]?.enabled !== false);
  const manual = draft.paymentMethod !== 'square';
  const option = configuredPaymentOptions[draft.paymentMethod];
  const instructions = option?.handle ? `Send ${money(total)} to ${option.handle}.` : paymentInstructions(draft.paymentMethod);
  return <div><StepLabel number="4">Choose payment</StepLabel><div className="mb-5 border border-[#efb22d]/45 bg-[#0b6470] p-4 text-sm"><p className="font-extrabold text-[#efb22d]">Amount due: {money(total)}</p><p className="mt-1 text-[#f7f4eb]/70">Manual payments are not marked paid until the owner verifies receipt.</p></div><div className="space-y-3">{methods.map(([value, title, copy]) => <button key={value} type="button" onClick={() => updateDraft({ paymentMethod: value })} className={`flex w-full items-start justify-between gap-4 border p-4 text-left ${draft.paymentMethod === value ? 'border-[#efb22d] bg-[#0b6470]' : 'border-[#f7f4eb]/20 hover:border-[#f7f4eb]/50'}`}><div><p className="font-extrabold">{title}</p><p className="mt-1 text-sm text-[#f7f4eb]/58">{copy}</p></div><span className={`mt-1 grid h-5 w-5 shrink-0 place-items-center rounded-full border ${draft.paymentMethod === value ? 'border-[#efb22d] bg-[#efb22d]' : 'border-[#f7f4eb]/35'}`}>{draft.paymentMethod === value && <Check size={12} className="text-[#073d45]" />}</span></button>)}</div>{manual && <div className="mt-5 border border-[#efb22d]/60 bg-[#0b6470] p-5"><p className="text-sm font-extrabold text-[#efb22d]">{paymentLabel(draft.paymentMethod)} payment instructions</p><p className="mt-2 text-base font-bold">{instructions}</p>{option?.qrPath && <img src={option.qrPath} alt={`${paymentLabel(draft.paymentMethod)} payment QR code`} className="mt-4 h-40 w-40 bg-white object-contain p-2" />}<button type="button" onClick={() => void navigator.clipboard.writeText(instructions)} className="mt-3 border border-[#f7f4eb]/30 px-3 py-2 text-[10px] font-extrabold uppercase tracking-[.12em]">Copy payment instructions</button><label className="mt-5 block text-xs font-bold uppercase tracking-[.12em]">Name on the payment account<input value={draft.expectedSenderName} onChange={(event) => updateDraft({ expectedSenderName: event.target.value })} className="mt-2 block w-full border border-[#f7f4eb]/25 bg-[#073d45] px-3 py-3 text-sm font-normal normal-case tracking-normal text-[#f7f4eb] outline-none focus:border-[#efb22d]" placeholder="Exactly as it appears on your payment account" required /></label></div>}</div>;
}
function ReviewStep({ draft, items, totalMeals, mealSubtotal, premiumCharges, deliveryFee, total, error }: { draft: OrderDraft; items: SelectedItem[]; totalMeals: number; mealSubtotal: number; premiumCharges: number; deliveryFee: number; total: number; error: string }) {
  return <div><StepLabel number="5">Review order</StepLabel><div className="border border-[#f7f4eb]/20 bg-[#0b6470] p-5"><div className="grid gap-4 border-b border-[#f7f4eb]/15 pb-5 text-sm sm:grid-cols-2"><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#efb22d]">Customer</p><p className="mt-2 font-bold">{draft.name || 'Name not entered'}</p><p className="text-[#f7f4eb]/65">{draft.email || 'Email not entered'} / {draft.phone || 'Phone not entered'}</p></div><div><p className="text-[10px] font-extrabold uppercase tracking-[.12em] text-[#efb22d]">Fulfillment / payment</p><p className="mt-2 font-bold">{draft.fulfillment === 'pickup' ? draft.pickupWindow : `${draft.deliveryZone} / ${draft.address || 'Address not entered'}`}</p><p className="text-[#f7f4eb]/65">{paymentLabel(draft.paymentMethod)}</p></div></div><div className="space-y-2 py-5 text-sm">{items.map(({ meal, quantity }) => <div key={meal.id} className="flex justify-between gap-4"><span>{meal.name} × {quantity}</span><span>{money(meal.price * quantity + (meal.premium ? premiumCharge * quantity : 0))}</span></div>)}</div><div className="space-y-2 border-t border-[#f7f4eb]/15 pt-4 text-sm"><div className="flex justify-between text-[#f7f4eb]/65"><span>{totalMeals} meals / standard charges</span><span>{money(mealSubtotal)}</span></div><div className="flex justify-between text-[#f7f4eb]/65"><span>Premium charges</span><span>{money(premiumCharges)}</span></div>{deliveryFee > 0 && <div className="flex justify-between text-[#f7f4eb]/65"><span>Delivery fee</span><span>{money(deliveryFee)}</span></div>}<div className="flex justify-between pt-2 text-xl font-extrabold"><span>Total</span><span className="text-[#efb22d]">{money(total)}</span></div></div></div>{error && <p className="mt-4 border border-[#ff9883]/50 bg-[#a14935]/30 p-3 text-sm text-[#ffd0c5]">{error}</p>}</div>;
}
function Confirmation({ total, method, order }: { total: number; method: PaymentMethod; order: { orderNumber: string; instructions: string } | null }) {
  return <div className="mt-12 max-w-[720px] border border-[#5cc2a0]/40 bg-[#0b6470] p-7"><span className="grid h-12 w-12 place-items-center rounded-full bg-[#5cc2a0] text-[#073d45]"><Check size={25} /></span><p className="mt-6 text-[10px] font-extrabold uppercase tracking-[.16em] text-[#efb22d]">Step 6 / order received</p><h3 className="mt-2 text-3xl font-extrabold">Order {order?.orderNumber || ''} is in.</h3><p className="mt-4 text-sm leading-6 text-[#f7f4eb]/68">We received your {money(total)} preorder using {paymentLabel(method)}. {method === 'square' ? 'Square checkout is the next handoff when live payments are connected.' : 'Payment is pending until the owner verifies receipt. You will receive a separate confirmation email when it is paid.'}</p>{method !== 'square' && <div className="mt-5 border border-[#efb22d]/45 p-4 text-sm"><p className="font-bold text-[#efb22d]">{order?.instructions}</p><p className="mt-2 text-[#f7f4eb]/65">Include order number {order?.orderNumber} in the payment note when possible.</p></div>}<div className="mt-7 flex flex-wrap gap-3"><Link href="/menu" className="bg-[#efb22d] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] text-[#073d45]">Browse the menu</Link><Link href="/" className="border border-[#f7f4eb]/25 px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em]">Back home</Link></div></div>;
}

function HowItWorksPage() {
  const steps = [['01', 'The menu drops', 'A fresh weekly lineup goes live with a clear order cutoff.'], ['02', 'Choose meals', 'Pick your favorites and set quantities directly. No cart gymnastics.'], ['03', 'Select fulfillment', 'Choose a Sunday pickup window or a local delivery zone.'], ['04', 'Pay', 'Choose Apple Pay, Cash App, Venmo, Zelle, Square, or another supported method.'], ['05', 'We prep', 'Meals are cooked in small batches and organized for the week ahead.'], ['06', 'Heat, eat, repeat', 'Pick up or receive your order, then get on with your week.']];
  return <main><PageIntro eyebrow="The rhythm / 03" title={<>Good food<br /><span className="text-[#d18e19]">on repeat.</span></>} copy="A weekly rhythm that takes the guesswork out of eating well without taking the joy out of it." dark /><section className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[.65fr_1.35fr] lg:px-10 lg:py-24"><div className="relative min-h-[470px] overflow-hidden"><img src="/images/meals/real-meal-lineup.jpg" alt="Lineup of prepared meals ready for pickup" className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-[#073d45]/80 to-transparent" /><p className="absolute bottom-5 left-5 text-xs font-extrabold uppercase tracking-[.14em] text-[#f7f4eb]">One simple weekly rhythm</p></div><div className="grid gap-0 border-t border-[#073d45]/15">{steps.map(([number, title, copy]) => <div key={number} className="grid gap-4 border-b border-[#073d45]/15 py-6 sm:grid-cols-[70px_180px_1fr]"><span className="font-mono text-sm text-[#d18e19]">{number}</span><h2 className="text-lg font-extrabold">{title}</h2><p className="text-sm leading-6 text-[#073d45]/65">{copy}</p></div>)}</div></section><section className="bg-[#efb22d] px-5 py-14 lg:px-10"><div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><div><p className="text-[10px] font-extrabold uppercase tracking-[.17em] text-[#073d45]/60">Ready when you are</p><h2 className="display-face mt-2 text-4xl font-semibold leading-none sm:text-6xl">Make this week easier.</h2></div><Link href="/order" className="inline-flex items-center gap-2 self-start bg-[#073d45] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.13em] text-[#f7f4eb]">Build your order <ArrowRight size={16} /></Link></div></section></main>;
}

function AboutPage() {
  return <main><PageIntro eyebrow="The why / 04" title={<>Made for the<br /><span className="text-[#d18e19]">904.</span></>} copy="904 Meal Prepz is a Jacksonville-area meal prep business helping busy people save time without settling for bland, forgettable food." dark /><section className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[1fr_.9fr] lg:px-10 lg:py-24"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">Our mission</p><h2 className="display-face mt-5 max-w-[620px] text-5xl font-semibold leading-[.88] sm:text-7xl">Convenience<br />should never<br /><span className="text-[#d18e19]">mean compromise.</span></h2><p className="mt-8 max-w-[510px] text-base leading-7 text-[#073d45]/68">The goal is simple: make prepared meals that feel like a smart decision and a satisfying one. We build menus around big flavor, balanced plates, and a weekly cadence that works for Jacksonville schedules.</p></div><div className="grid gap-4 sm:grid-cols-2"><div className="relative min-h-[360px] overflow-hidden sm:row-span-2"><img src="/images/brand/kitchen-plating.jpg" alt="Meal prep plating in the kitchen" className="absolute inset-0 h-full w-full object-cover" /></div><div className="relative min-h-[220px] overflow-hidden"><img src="/images/meals/jerk-chicken.jpg" alt="Jerk chicken prepared meal" className="absolute inset-0 h-full w-full object-cover" /></div><div className="flex items-end bg-[#0b6470] p-5 text-[#f7f4eb]"><p className="text-sm leading-6">Bold food. Practical portions. A little more pride in the box.</p></div></div></section><section className="bg-[#e4dfd1] px-5 py-16 lg:px-10 lg:py-24"><div className="mx-auto grid max-w-[1380px] gap-6 sm:grid-cols-3">{[['Big flavor', 'Spice, acid, char, texture.'], ['Smart portions', 'Food that fuels the day ahead.'], ['Fresh weekly', 'Menus and prep that keep moving.']].map(([title, copy], index) => <div key={title} className="border-t-2 border-[#073d45] pt-4"><span className="text-3xl text-[#d18e19]">0{index + 1}</span><h3 className="mt-6 text-xl font-extrabold">{title}</h3><p className="mt-2 text-sm leading-6 text-[#073d45]/60">{copy}</p></div>)}</div></section></main>;
}

function GalleryPage() {
  const [managedGallery, setManagedGallery] = useState<Array<{ id: string; title: string; description: string; mediaType: 'image' | 'video'; mediaPath: string; posterPath: string; featured: boolean; linkedMeal: { name: string } | null }> | null>(null);
  useEffect(() => {
    const api = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    fetch(`${api}/gallery`).then((response) => response.ok ? response.json() : Promise.reject()).then((items) => { if (Array.isArray(items)) setManagedGallery(items); }).catch(() => undefined);
  }, []);
  const archive = [
    ['/images/gallery-context/past-sausage-shrimp-rice.jpg', 'Past meal / sausage, shrimp & rice', 'Supplied meal photo'],
    ['/images/meals/hero-salmon.jpg', 'Past meal / smoky salmon', 'Supplied meal photo'],
    ['/images/meals/jerk-chicken.jpg', 'Past meal / jerk chicken', 'Supplied meal photo'],
    ['/images/meals/lemon-chicken.jpg', 'Past meal / lemon chicken', 'Supplied meal photo'],
    ['/images/meals/steak-chimichurri.jpg', 'Past meal / steak chimichurri', 'Supplied meal photo'],
    ['/images/brand/kitchen-plating.jpg', 'Kitchen plating / prepared with care', 'Supplied kitchen photo'],
  ];
  if (managedGallery?.length) return <main><PageIntro eyebrow="The gallery / 05" title={<>Good food.<br /><span className="text-[#d18e19]">Made visible.</span></>} copy="Published kitchen moments, meals, and behind-the-scenes content from 904 Meal Prepz." /><section className="mx-auto max-w-[1380px] px-5 pb-20 lg:px-10 lg:pb-24"><div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">{managedGallery.map((item) => <figure key={item.id} className={item.featured ? 'sm:col-span-2' : ''}>{item.mediaType === 'video' ? <video src={item.mediaPath} poster={item.posterPath || undefined} muted playsInline controls preload="metadata" className="aspect-[1.15] w-full object-cover" /> : <img src={item.mediaPath} alt={item.title} loading="lazy" className="aspect-[1.15] w-full object-cover" />}<figcaption className="border-b border-[#073d45]/15 py-3"><p className="font-extrabold">{item.title}</p>{item.description && <p className="mt-1 text-xs text-[#073d45]/60">{item.description}</p>}{item.linkedMeal && <Link href="/menu" className="mt-2 inline-block text-[10px] font-bold uppercase tracking-[.12em] text-[#157f8f]">{item.linkedMeal.name} / available this week</Link>}</figcaption></figure>)}</div></section></main>;
  return <main><PageIntro eyebrow="The archive / 05" title={<>Good food.<br /><span className="text-[#d18e19]">In every era.</span></>} copy="Current-week menu visuals are clearly separated from the supplied archive of past meals, kitchen work, and brand context." /><section className="mx-auto max-w-[1380px] px-5 pb-20 lg:px-10 lg:pb-24"><div className="mb-7 flex flex-col justify-between gap-4 border-b border-[#073d45]/15 pb-5 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">This week's menu / concept visuals</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">The current drop</h2></div><p className="max-w-[390px] text-xs leading-5 text-[#073d45]/60">These generated images show what each meal is called. They are visual concepts, not photos of this week's cooked batches.</p></div><div className="grid gap-x-5 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">{weeklyMenu.meals.map((meal) => <figure key={meal.id} className="group"><div className="relative aspect-square overflow-hidden bg-[#e4dfd1]"><img src={meal.image} alt={meal.name} className="h-full w-full object-cover transition duration-700 group-hover:scale-105" /><span className="absolute left-3 top-3 bg-[#073d45] px-2 py-1 text-[9px] font-extrabold uppercase tracking-[.12em] text-[#f7f4eb]">Menu visual</span></div><figcaption className="border-b border-[#073d45]/15 py-3"><p className="text-sm font-extrabold">{meal.name}</p><p className="mt-1 text-[10px] font-bold uppercase tracking-[.12em] text-[#157f8f]">{meal.premium ? 'Premium / $10' : 'Standard / $8'}</p></figcaption></figure>)}</div><div className="mt-20 border-t-2 border-[#073d45] pt-6"><div className="mb-7 flex flex-col justify-between gap-4 sm:flex-row sm:items-end"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">Supplied archive / past meals</p><h2 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">The food that built the story</h2></div><p className="max-w-[390px] text-xs leading-5 text-[#073d45]/60">These are real supplied/context images from previous meals and brand materials. They are not being used to label this week's menu.</p></div><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">{archive.map(([src, title, label]) => <figure key={src} className="group relative overflow-hidden"><img src={src} alt={title} className="aspect-[1.15] w-full object-cover transition duration-700 group-hover:scale-105" /><figcaption className="absolute inset-x-0 bottom-0 bg-[#073d45]/90 px-3 py-3 text-[#f7f4eb]"><p className="text-xs font-extrabold uppercase tracking-[.11em]">{title}</p><p className="mt-1 text-[9px] font-bold uppercase tracking-[.13em] text-[#efb22d]">{label}</p></figcaption></figure>)}<figure className="relative overflow-hidden sm:col-span-2 lg:col-span-3"><video autoPlay muted loop playsInline controls preload="metadata" poster="/images/meals/real-meal-lineup.jpg" className="aspect-[2.5] w-full object-cover"><source src="/videos/meal-lineup.mp4" type="video/mp4" /></video><figcaption className="pointer-events-none absolute bottom-4 left-4 bg-[#efb22d] px-3 py-2 text-xs font-extrabold uppercase tracking-[.12em] text-[#073d45]">Supplied kitchen footage / past lineup</figcaption></figure></div></div></section></main>;
}

function ContactPage() {
  const faqs = [['When does ordering close?', 'Orders close Saturday at noon for the active weekly drop. If ordering is closed, check back for the next menu.'], ['Where do I pick up?', 'Pickup windows are on Sunday in Jacksonville. Your confirmed window will be attached to the order.'], ['Do you deliver?', 'Yes. Choose local delivery at checkout and select the zone that fits your address.'], ['How do manual payments work?', 'Cash App, Venmo, and Zelle orders enter the same order ledger as Square orders. They remain payment pending until the owner confirms payment.'], ['Can I see macros?', 'Every published meal includes calories, protein, and carbs on the menu page.']];
  return <main><PageIntro eyebrow="Questions / 06" title={<>Let's talk<br /><span className="text-[#d18e19]">food.</span></>} copy="Need help with a weekly order, a pickup window, delivery, or something else? Reach out and we will point you in the right direction." dark /><section className="mx-auto grid max-w-[1380px] gap-12 px-5 py-16 lg:grid-cols-[.7fr_1.3fr] lg:px-10 lg:py-24"><div><p className="text-[10px] font-extrabold uppercase tracking-[.18em] text-[#157f8f]">Contact 904 Meal Prepz</p><div className="mt-7 space-y-4"><a href="tel:+19045550184" className="flex items-center gap-3 border-b border-[#073d45]/15 pb-4 text-lg font-extrabold hover:text-[#157f8f]"><Phone size={19} /> (904) 555-0184</a><a href="mailto:hello@904mealprepz.com" className="flex items-center gap-3 border-b border-[#073d45]/15 pb-4 text-lg font-extrabold hover:text-[#157f8f]"><Mail size={19} /> hello@904mealprepz.com</a><a href="https://instagram.com/904mealprepz" target="_blank" rel="noreferrer" className="flex items-center gap-3 border-b border-[#073d45]/15 pb-4 text-lg font-extrabold hover:text-[#157f8f]"><Instagram size={19} /> @904mealprepz</a></div><div className="mt-10 bg-[#efb22d] p-5"><p className="text-[10px] font-extrabold uppercase tracking-[.16em] text-[#073d45]/60">Weekly cutoff</p><p className="mt-2 text-2xl font-extrabold">Saturday at noon</p><p className="mt-2 text-sm leading-6 text-[#073d45]/65">Plan ahead, pick your meals, and let the kitchen do the rest.</p></div></div><div className="border-t border-[#073d45]/15">{faqs.map(([question, answer]) => <details key={question} className="group border-b border-[#073d45]/15 py-5"><summary className="flex cursor-pointer list-none items-center justify-between gap-5 text-lg font-extrabold">{question}<ChevronDown size={19} className="transition group-open:rotate-180" /></summary><p className="max-w-[680px] pt-4 text-sm leading-6 text-[#073d45]/65">{answer}</p></details>)}</div></section><section className="bg-[#efb22d] px-5 py-14 lg:px-10"><div className="mx-auto flex max-w-[1380px] flex-col justify-between gap-6 sm:flex-row sm:items-center"><h2 className="display-face text-4xl font-semibold sm:text-6xl">Ready to eat better?</h2><Link href="/order" className="inline-flex items-center gap-2 self-start bg-[#073d45] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.13em] text-[#f7f4eb]">Build your order <ArrowRight size={16} /></Link></div></section></main>;
}

function NotFoundPage() {
  return <main><PageIntro eyebrow="404 / Not on this week's drop" title={<>This page<br /><span className="text-[#d18e19]">wandered off.</span></>} copy="Try the menu, the order builder, or head back home." /><div className="mx-auto flex max-w-[1380px] flex-wrap gap-3 px-5 pb-24 lg:px-10"><Link href="/" className="bg-[#073d45] px-5 py-3 text-xs font-extrabold uppercase tracking-[.13em] text-[#f7f4eb]">Back home</Link><Link href="/menu" className="border border-[#073d45]/25 px-5 py-3 text-xs font-extrabold uppercase tracking-[.13em]">View menu</Link></div></main>;
}

export default function PublicSite() {
  const [location] = useLocation();
  const [publishedMenu, setPublishedMenu] = useState(() => readPublishedMenu());
  const [now, setNow] = useState(() => new Date());
  Object.assign(weeklyMenu, publishedMenu);
  useEffect(() => { const timer = window.setInterval(() => setNow(new Date()), 30000); return () => window.clearInterval(timer); }, []);
  useEffect(() => {
    const refresh = () => setPublishedMenu(readPublishedMenu());
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);
  useEffect(() => {
    let active = true;
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '/api').replace(/\/$/, '');
    fetch(`${apiBase}/menus/current`)
      .then(async (response) => {
        if (!response.ok) throw new Error('Published menu API unavailable');
        return response.json();
      })
      .then((menu) => {
        if (!active || !Array.isArray(menu.meals) || !menu.meals.length) return;
        configuredPaymentOptions = menu.paymentOptions || {};
        setPublishedMenu({
          ...weeklyMenu,
          ...menu,
          meals: menu.meals.map((meal: Record<string, unknown>) => ({
            ...meal,
            price: Number(meal.price),
            premiumCharge: Number(meal.premiumCharge || 0),
            premium: Number(meal.premiumCharge || 0) > 0,
          })),
          deliveryZones: Array.isArray(menu.deliveryZones) ? menu.deliveryZones.map((zone: Record<string, unknown>) => ({ ...zone, fee: Number(zone.fee) })) : weeklyMenu.deliveryZones,
        } as typeof weeklyMenu);
      })
      .catch(() => {
        // Offline/static deployments intentionally keep the committed or locally published fallback.
      });
    return () => { active = false; };
  }, []);
  const deadline = useMemo(() => new Date(publishedMenu.orderDeadline), [publishedMenu.orderDeadline]);
  const orderingOpen = deadline.getTime() > now.getTime();
  const countdown = remainingTime(deadline, now);
  useEffect(() => {
    const titles: Record<string, string> = { '/': '904 Meal Prepz — Eat like you mean it.', '/menu': "This week's menu — 904 Meal Prepz", '/order': 'Build your order — 904 Meal Prepz', '/how-it-works': 'How it works — 904 Meal Prepz', '/about': 'About 904 Meal Prepz', '/gallery': 'Food gallery — 904 Meal Prepz', '/contact': 'FAQ & contact — 904 Meal Prepz' };
    const descriptions: Record<string, string> = { '/': 'Chef-prepared weekly meal prep for Jacksonville schedules.', '/menu': 'Browse the current 904 Meal Prepz weekly menu with meal details and macros.', '/order': 'Build your weekly preorder with quantity controls, pickup, delivery, and payment options.', '/how-it-works': 'See how the weekly 904 Meal Prepz preorder process works.', '/about': 'Learn about the Jacksonville meal prep business behind 904 Meal Prepz.', '/gallery': 'See real 904 Meal Prepz meals, kitchen prep, and food photography.', '/contact': 'Get answers about pickup, delivery, payments, and the weekly menu.' };
    const title = titles[location] || '904 Meal Prepz';
    const description = descriptions[location] || descriptions['/'];
    document.title = title;
    document.querySelector('meta[name="description"]')?.setAttribute('content', description);
    document.querySelector('meta[property="og:title"]')?.setAttribute('content', title);
    document.querySelector('meta[property="og:description"]')?.setAttribute('content', description);
    document.querySelector('meta[name="twitter:title"]')?.setAttribute('content', title);
    document.querySelector('meta[name="twitter:description"]')?.setAttribute('content', description);
  }, [location]);
  const selections = useMemo(() => { try { return JSON.parse(localStorage.getItem('904-week') || '{}') as Selection; } catch { return {}; } }, [location]);
  const cartCount = Object.values(selections).reduce((sum, count) => sum + count, 0);
  let page: ReactNode;
  if (location === '/') page = <HomePage orderingOpen={orderingOpen} countdown={countdown} />;
  else if (location === '/menu') page = <MenuPage />;
  else if (location === '/order') page = <OrderPage orderingOpen={orderingOpen} countdown={countdown} />;
  else if (location === '/how-it-works') page = <HowItWorksPage />;
  else if (location === '/about') page = <AboutPage />;
  else if (location === '/gallery') page = <GalleryPage />;
  else if (location === '/contact') page = <ContactPage />;
  else page = <NotFoundPage />;
  return <PublicShell currentPath={location} cartCount={cartCount}>{page}</PublicShell>;
}