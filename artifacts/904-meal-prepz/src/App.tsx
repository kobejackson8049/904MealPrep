import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { ArrowDownRight, ArrowLeft, ArrowRight, Check, Clock3, Flame, Instagram, Leaf, Mail, MapPin, Menu as MenuIcon, Minus, Phone, Play, Plus, ShieldCheck, ShoppingBag, Truck, X } from 'lucide-react';
import { premiumCharge, weeklyMenu, type MenuCategory, type WeeklyMeal } from '@/data/weeklyMenu';

type Selections = Record<string, number>;
type Fulfillment = 'pickup' | 'delivery';
type OrderDraft = {
  fulfillment: Fulfillment;
  pickupWindow: string;
  deliveryZone: string;
  address: string;
  name: string;
  email: string;
  phone: string;
  notes: string;
};

const categories: Array<'All' | MenuCategory> = ['All', 'Breakfast', 'Entrées', 'Healthier Entrées', 'Premium Meals'];
const emptyDraft: OrderDraft = {
  fulfillment: 'pickup',
  pickupWindow: weeklyMenu.pickupWindows[0],
  deliveryZone: weeklyMenu.deliveryZones[0].id,
  address: '',
  name: '',
  email: '',
  phone: '',
  notes: '',
};

function money(value: number) {
  return `$${value.toFixed(2)}`;
}

function padded(value: number) {
  return String(value).padStart(2, '0');
}

function remainingTime(deadline: Date, now: Date) {
  const difference = Math.max(0, deadline.getTime() - now.getTime());
  const totalMinutes = Math.floor(difference / 60000);
  return {
    days: Math.floor(totalMinutes / 1440),
    hours: Math.floor((totalMinutes % 1440) / 60),
    minutes: totalMinutes % 60,
  };
}

function Logo({ light = false }: { light?: boolean }) {
  return (
    <a href="#top" className={`flex items-center gap-2.5 ${light ? 'text-[#f1eee6]' : 'text-[#102d2b]'}`} data-testid="link-logo">
      <span className="grid h-9 w-9 place-items-center bg-[#e7bd32] text-[#102d2b] font-black text-lg leading-none">9</span>
      <span className="font-extrabold tracking-[-.04em] text-[15px] leading-none">904<br /><span className="text-[10px] tracking-[.18em]">MEAL PREPZ</span></span>
    </a>
  );
}

function App() {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [category, setCategory] = useState<'All' | MenuCategory>('All');
  const [selections, setSelections] = useState<Selections>(() => {
    try { return JSON.parse(localStorage.getItem('904-week') || localStorage.getItem('904-cart') || '{}'); } catch { return {}; }
  });
  const [now, setNow] = useState(() => new Date());
  const [orderOpen, setOrderOpen] = useState(false);
  const [orderStep, setOrderStep] = useState(1);
  const [submitted, setSubmitted] = useState(false);
  const [draft, setDraft] = useState<OrderDraft>(emptyDraft);

  useEffect(() => { localStorage.setItem('904-week', JSON.stringify(selections)); }, [selections]);
  useEffect(() => {
    const timer = window.setInterval(() => setNow(new Date()), 30000);
    document.title = '904 Meal Prepz — Build your week.';
    document.querySelector('meta[name="description"]')?.setAttribute('content', 'Build your weekly preorder from 904 Meal Prepz. Choose your meals, pickup or delivery, and get your order organized in minutes.');
    return () => window.clearInterval(timer);
  }, []);

  const deadline = useMemo(() => new Date(weeklyMenu.orderDeadline), []);
  const orderingOpen = deadline.getTime() > now.getTime();
  const countdown = remainingTime(deadline, now);
  const filteredMeals = useMemo(() => weeklyMenu.meals.filter((meal) => category === 'All' || meal.category === category), [category]);
  const selectedItems = useMemo(() => weeklyMenu.meals.filter((meal) => selections[meal.id] > 0).map((meal) => ({ meal, quantity: selections[meal.id] })), [selections]);
  const totalMeals = selectedItems.reduce((sum, item) => sum + item.quantity, 0);
  const mealSubtotal = selectedItems.reduce((sum, item) => sum + item.meal.price * item.quantity, 0);
  const premiumCharges = selectedItems.reduce((sum, item) => sum + (item.meal.premium ? premiumCharge * item.quantity : 0), 0);
  const deliveryFee = draft.fulfillment === 'delivery' ? (weeklyMenu.deliveryZones.find((zone) => zone.id === draft.deliveryZone)?.fee || 0) : 0;
  const orderTotal = mealSubtotal + premiumCharges + deliveryFee;

  function updateQuantity(meal: WeeklyMeal, amount: number) {
    if (!orderingOpen) return;
    setSelections((current) => {
      const next = { ...current, [meal.id]: Math.max(0, (current[meal.id] || 0) + amount) };
      if (!next[meal.id]) delete next[meal.id];
      return next;
    });
  }

  function closeMobile() { setMobileOpen(false); }
  function scrollToBuilder() { document.getElementById('build-your-week')?.scrollIntoView({ behavior: 'smooth' }); }
  function openOrderFlow(step = 1) {
    if (!totalMeals || !orderingOpen) { scrollToBuilder(); return; }
    setSubmitted(false);
    setOrderStep(step);
    setOrderOpen(true);
  }
  function updateDraft(changes: Partial<OrderDraft>) { setDraft((current) => ({ ...current, ...changes })); }

  return (
    <div className="site-shell grain min-h-[100dvh] bg-[#f1eee6] text-[#102d2b]" id="top">
      <header className="absolute inset-x-0 top-0 z-20 text-[#f1eee6]">
        <div className="mx-auto flex max-w-[1320px] items-center justify-between px-5 py-5 lg:px-10">
          <Logo light />
          <nav className="hidden items-center gap-8 md:flex" aria-label="Main navigation">
            <a href="#build-your-week" className="text-xs font-bold uppercase tracking-[.16em] transition-colors hover:text-[#e7bd32]" data-testid="link-nav-menu">Build your week</a>
            <a href="#how-it-works" className="text-xs font-bold uppercase tracking-[.16em] transition-colors hover:text-[#e7bd32]" data-testid="link-nav-how-it-works">How it works</a>
            <a href="#story" className="text-xs font-bold uppercase tracking-[.16em] transition-colors hover:text-[#e7bd32]" data-testid="link-nav-story">Our kitchen</a>
          </nav>
          <div className="flex items-center gap-3">
            <button type="button" onClick={scrollToBuilder} className="relative flex items-center gap-2 border border-[#f1eee6]/35 px-3 py-2 text-xs font-bold uppercase tracking-[.13em] transition-colors hover:border-[#e7bd32] hover:text-[#e7bd32]" data-testid="button-open-week-summary">
              <ShoppingBag size={16} strokeWidth={1.8} /> <span className="hidden sm:inline">Your week</span>
              {totalMeals > 0 && <span className="grid h-5 min-w-5 place-items-center rounded-full bg-[#e7bd32] px-1 text-[10px] text-[#102d2b]" data-testid="text-week-count">{totalMeals}</span>}
            </button>
            <button type="button" onClick={() => setMobileOpen(!mobileOpen)} className="grid h-10 w-10 place-items-center border border-[#f1eee6]/35 md:hidden" aria-label={mobileOpen ? 'Close menu' : 'Open menu'} data-testid="button-mobile-menu">
              {mobileOpen ? <X size={20} /> : <MenuIcon size={20} />}
            </button>
          </div>
        </div>
        {mobileOpen && (
          <nav className="border-t border-[#f1eee6]/15 bg-[#102d2b] px-5 py-5 md:hidden" aria-label="Mobile navigation">
            <a onClick={closeMobile} href="#build-your-week" className="block border-b border-[#f1eee6]/15 py-3 text-sm font-bold uppercase tracking-[.16em]" data-testid="link-mobile-menu">Build your week</a>
            <a onClick={closeMobile} href="#how-it-works" className="block border-b border-[#f1eee6]/15 py-3 text-sm font-bold uppercase tracking-[.16em]" data-testid="link-mobile-how-it-works">How it works</a>
            <a onClick={closeMobile} href="#story" className="block py-3 text-sm font-bold uppercase tracking-[.16em]" data-testid="link-mobile-story">Our kitchen</a>
          </nav>
        )}
      </header>

      <main>
        <section className="relative min-h-[720px] overflow-hidden bg-[#102d2b] text-[#f1eee6] sm:min-h-[780px]" aria-labelledby="hero-heading">
          <img src="/images/meals/hero-salmon.jpg" alt="Blackened salmon bowl with roasted sweet potato and broccolini" className="hero-image absolute inset-0 h-full w-full object-cover opacity-55" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(16,45,43,.98)_0%,rgba(16,45,43,.82)_35%,rgba(16,45,43,.22)_100%)]" />
          <div className="relative mx-auto flex min-h-[720px] max-w-[1320px] items-end px-5 pb-16 pt-32 sm:min-h-[780px] sm:pb-24 lg:px-10">
            <div className="max-w-[780px]">
              <p className="mono-label rise-in mb-7 text-[#e7bd32]">Jacksonville, Florida / Est. 2020</p>
              <h1 id="hero-heading" className="display-face rise-in delay-1 max-w-[780px] text-[clamp(4rem,10vw,9.2rem)] font-semibold leading-[.82]">Eat like<br /><em className="text-[#e7bd32] not-italic">you mean it.</em></h1>
              <p className="rise-in delay-2 mt-8 max-w-[440px] text-base leading-7 text-[#f1eee6]/76 sm:text-lg">Chef-prepared meals for the weeks that do not slow down. Choose your quantities once, then let us handle the prep.</p>
              <div className="rise-in delay-3 mt-9 flex flex-wrap items-center gap-4">
                <button type="button" onClick={scrollToBuilder} className="inline-flex items-center gap-3 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.15em] text-[#102d2b] transition-transform hover:-translate-y-0.5" data-testid="button-hero-build">Build your week <ArrowDownRight size={17} /></button>
                <a href="tel:+19045550184" className="inline-flex items-center gap-2 px-2 py-3 text-xs font-bold uppercase tracking-[.15em] text-[#f1eee6] hover:text-[#e7bd32]" data-testid="link-hero-phone"><Phone size={15} /> (904) 555-0184</a>
              </div>
              <p className="mono-label rise-in delay-3 mt-7 text-[#f1eee6]/55">Meals from $8 / Sunday pickup + local delivery</p>
            </div>
            <div className="absolute bottom-8 right-5 hidden text-right lg:block lg:right-10">
              <span className="mono-label text-[#f1eee6]/55">This week in the kitchen</span>
              <p className="mt-2 text-sm text-[#f1eee6]/80">Blackened salmon / citrus quinoa</p>
            </div>
          </div>
        </section>

        <div className="overflow-hidden bg-[#e7bd32] py-3 text-[#102d2b]">
          <div className="ticker flex w-max gap-8 whitespace-nowrap">
            {Array.from({ length: 2 }).map((_, index) => <span key={index} className="flex items-center gap-8 text-[11px] font-extrabold uppercase tracking-[.2em]"><span>Flavor forward</span><span className="text-lg">/</span><span>Built for busy</span><span className="text-lg">/</span><span>Preorder weekly</span><span className="text-lg">/</span><span>Made in 904</span><span className="text-lg">/</span></span>)}
          </div>
        </div>

        <section id="build-your-week" className="scroll-mt-10 mx-auto max-w-[1320px] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="menu-heading">
          <div className="flex flex-col justify-between gap-8 md:flex-row md:items-end">
            <div>
              <p className="mono-label mb-4 text-[#174d49]">The weekly drop / 01</p>
              <h2 id="menu-heading" className="display-face max-w-[680px] text-5xl font-semibold leading-[.92] sm:text-7xl">Build your<br /><span className="text-[#bd8f16]">week.</span></h2>
            </div>
            <p className="max-w-[310px] text-sm leading-6 text-[#174d49]/75">Pick quantities from this week’s menu. Your choices stay together, your totals calculate themselves, and your order is ready before you are.</p>
          </div>
          <DeadlineBanner orderingOpen={orderingOpen} countdown={countdown} deadlineLabel={weeklyMenu.deadlineLabel} />
          <div className="mt-8 flex flex-wrap items-center gap-2 border-b border-[#102d2b]/15 pb-4">
            {categories.map((item) => <button key={item} type="button" onClick={() => setCategory(item)} className={`px-3 py-2 text-xs font-extrabold uppercase tracking-[.14em] transition-colors ${category === item ? 'bg-[#102d2b] text-[#f1eee6]' : 'text-[#174d49] hover:bg-[#dcd8cd]'}`} data-testid={`button-filter-${item.toLowerCase().replace(/\s+/g, '-')}`}>{item}</button>)}
            <span className="ml-auto hidden text-xs text-[#174d49]/60 sm:block" data-testid="text-menu-count">{filteredMeals.length} meals this week</span>
          </div>
          <div className="mt-8 grid gap-10 lg:grid-cols-[minmax(0,1fr)_330px] lg:items-start">
            <div>
              <div className="mb-8 grid gap-6 border-b border-[#102d2b]/15 pb-10 lg:grid-cols-[1fr_180px] lg:items-center">
                <div>
                  <p className="mono-label text-[#174d49]">Straight from the feed</p>
                  <h3 className="mt-3 max-w-[520px] text-2xl font-extrabold tracking-[-.035em] sm:text-3xl">The weekly drop, the way Jacksonville already knows it.</h3>
                  <p className="mt-3 max-w-[540px] text-sm leading-6 text-[#174d49]/72">The menu rotates every week. Choose what you want, how many you want, and we’ll organize the rest.</p>
                </div>
                <figure className="group relative mx-auto w-full max-w-[180px] overflow-hidden bg-[#102d2b]">
                  <img src="/images/menu/weekly-menu.jpg" alt="904 Meal Prepz weekly meal prep menu graphic" loading="lazy" className="h-auto w-full transition-transform duration-700 group-hover:scale-[1.03]" data-testid="img-weekly-menu-reference" />
                  <figcaption className="absolute inset-x-0 bottom-0 bg-[#102d2b]/85 px-2 py-2 text-[9px] font-bold uppercase tracking-[.1em] text-[#f1eee6]">Real weekly menu</figcaption>
                </figure>
              </div>
              <div className="space-y-14">
                {categories.filter((item): item is MenuCategory => item !== 'All').map((group) => {
                  const groupMeals = filteredMeals.filter((meal) => meal.category === group);
                  if (!groupMeals.length) return null;
                  return (
                    <section key={group} aria-labelledby={`category-${group}`}>
                      <div className="mb-5 flex items-center justify-between border-b-2 border-[#174d49] pb-3">
                        <h3 id={`category-${group}`} className="text-sm font-extrabold uppercase tracking-[.16em]">{group}</h3>
                        <span className="mono-label text-[#174d49]/60">{groupMeals.length} options</span>
                      </div>
                      <div className="grid gap-x-5 gap-y-12 sm:grid-cols-2">
                        {groupMeals.map((meal, index) => <MealCard key={meal.id} meal={meal} index={index} quantity={selections[meal.id] || 0} orderingOpen={orderingOpen} onUpdate={(amount) => updateQuantity(meal, amount)} />)}
                      </div>
                    </section>
                  );
                })}
              </div>
            </div>
            <WeekSummary items={selectedItems} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} onUpdate={updateQuantity} onContinue={() => openOrderFlow(1)} orderingOpen={orderingOpen} />
          </div>
        </section>

        <section id="how-it-works" className="scroll-mt-10 bg-[#174d49] text-[#f1eee6]" aria-labelledby="how-heading">
          <div className="mx-auto grid max-w-[1320px] lg:grid-cols-[.82fr_1.18fr]">
            <div className="flex flex-col justify-between px-5 py-20 lg:px-10 lg:py-28">
              <div>
                <p className="mono-label mb-5 text-[#e7bd32]">No guesswork / 02</p>
                <h2 id="how-heading" className="display-face max-w-[460px] text-5xl font-semibold leading-[.9] sm:text-7xl">Your week,<br /><span className="text-[#e7bd32]">handled.</span></h2>
              </div>
              <p className="mt-12 max-w-[330px] text-sm leading-6 text-[#f1eee6]/72 lg:mt-0">You bring the appetite. We handle the grocery list, the chopping, the cleanup and the “what am I eating?” spiral.</p>
            </div>
            <div className="grid border-t border-[#f1eee6]/15 sm:grid-cols-3 lg:border-l lg:border-t-0">
              <Step number="01" title="Build your week" copy="Choose the meals and quantities you want before Saturday at noon." />
              <Step number="02" title="We cook Sunday" copy="Our Jacksonville kitchen preps everything fresh, in small batches." />
              <Step number="03" title="Pickup or delivery" copy="Choose a Sunday pickup window or a delivery zone at checkout." />
            </div>
          </div>
        </section>

        <section id="story" className="scroll-mt-10 bg-[#102d2b] px-5 py-20 text-[#f1eee6] lg:px-10 lg:py-28" aria-labelledby="story-heading">
          <div className="mx-auto grid max-w-[1320px] items-center gap-12 lg:grid-cols-[1.1fr_.9fr] lg:gap-20">
            <div className="relative min-h-[400px] overflow-hidden sm:min-h-[530px]">
              <video autoPlay muted loop playsInline controls preload="metadata" poster="/images/meals/real-meal-lineup.jpg" className="absolute inset-0 h-full w-full object-cover" aria-label="Portrait video of 904 Meal Prepz meals being prepared" data-testid="video-kitchen-prep">
                <source src="/videos/kitchen-prep.mp4" type="video/mp4" />
              </video>
              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-[#102d2b]/65 to-transparent" />
              <div className="pointer-events-none absolute bottom-5 left-5 flex items-center gap-3 text-xs font-bold uppercase tracking-[.13em]"><span className="grid h-9 w-9 place-items-center border border-[#f1eee6]/50"><Play size={14} fill="currentColor" /></span> Kitchen story / real footage</div>
              <div className="pointer-events-none absolute right-5 top-5 border border-[#e7bd32] px-3 py-2 text-[#e7bd32]"><span className="mono-label">Made in the 904</span></div>
            </div>
            <div>
              <p className="mono-label mb-5 text-[#e7bd32]">The why / 03</p>
              <h2 id="story-heading" className="display-face text-5xl font-semibold leading-[.9] sm:text-7xl">Food with<br /><span className="text-[#e7bd32]">a point of view.</span></h2>
              <p className="mt-8 max-w-[430px] text-base leading-7 text-[#f1eee6]/72">904 Meal Prepz started with a simple rule: convenience should never mean compromise. We cook with the same energy we bring to the rest of our lives — bold, balanced, and made for right now.</p>
              <div className="mt-10 grid max-w-[440px] grid-cols-2 gap-6 border-t border-[#f1eee6]/20 pt-6">
                <div><p className="text-3xl font-bold text-[#e7bd32]">2,400+</p><p className="mono-label mt-2 text-[#f1eee6]/55">Meals cooked monthly</p></div>
                <div><p className="text-3xl font-bold text-[#e7bd32]">904</p><p className="mono-label mt-2 text-[#f1eee6]/55">Our home code</p></div>
              </div>
              <div className="mt-8 flex items-center gap-4 border-t border-[#f1eee6]/20 pt-6">
                <img src="/images/brand/904-logo.jpg" alt="904 Meal Prepz logo" loading="lazy" className="h-24 w-16 object-cover object-top" data-testid="img-brand-logo" />
                <p className="max-w-[250px] text-xs leading-5 text-[#f1eee6]/58">The real logo, the real menu, and the same bold energy that started it all.</p>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-[#d9d4c6] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="promise-heading">
          <div className="mx-auto max-w-[1320px]">
            <div className="flex flex-col justify-between gap-6 border-b border-[#102d2b]/20 pb-8 md:flex-row md:items-end">
              <div><p className="mono-label mb-4 text-[#174d49]">The standard / 04</p><h2 id="promise-heading" className="display-face max-w-[580px] text-5xl font-semibold leading-[.9] sm:text-7xl">What goes in<br />matters.</h2></div>
              <p className="max-w-[310px] text-sm leading-6 text-[#174d49]/75">No mystery sauces. No sad desk lunches. Just ingredients that pull their weight and food you actually look forward to.</p>
            </div>
            <div className="mt-10 grid gap-5 sm:grid-cols-3">
              <Promise icon={<FlameIcon />} title="Big flavor" copy="Spice, acid, char and texture in every box." />
              <Promise icon={<ShieldIcon />} title="Smart portions" copy="Balanced plates that keep you going, not slowing." />
              <Promise icon={<LeafIcon />} title="Fresh weekly" copy="Small-batch cooking, never a freezer-first operation." />
            </div>
          </div>
        </section>

        <section className="bg-[#f1eee6] px-5 py-20 lg:px-10 lg:py-28" aria-labelledby="gallery-heading">
          <div className="mx-auto max-w-[1320px]">
            <div className="flex flex-col justify-between gap-6 md:flex-row md:items-end">
              <div><p className="mono-label mb-4 text-[#174d49]">No stock photos / 05</p><h2 id="gallery-heading" className="display-face max-w-[640px] text-5xl font-semibold leading-[.9] sm:text-7xl">Real food.<br /><span className="text-[#bd8f16]">Real portions.</span></h2></div>
              <p className="max-w-[300px] text-sm leading-6 text-[#174d49]/75">What arrives in the box is what you see here. Big flavor, balanced portions, zero mystery.</p>
            </div>
            <div className="mt-10 grid gap-4 sm:grid-cols-12 sm:grid-rows-2">
              <figure className="relative min-h-[360px] overflow-hidden sm:col-span-7 sm:row-span-2"><img src="/images/meals/hero-salmon.jpg" alt="Blackened salmon meal with roasted vegetables and grains" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" data-testid="img-gallery-salmon" /><figcaption className="absolute bottom-4 left-4 bg-[#102d2b] px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#f1eee6]">Blackened salmon / citrus quinoa</figcaption></figure>
              <figure className="relative min-h-[220px] overflow-hidden sm:col-span-5"><img src="/images/meals/jerk-chicken.jpg" alt="Jerk chicken meal with mango and coconut rice" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" data-testid="img-gallery-jerk-chicken" /><figcaption className="absolute bottom-4 left-4 bg-[#e7bd32] px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#102d2b]">Jerk chicken / mango</figcaption></figure>
              <figure className="relative min-h-[220px] overflow-hidden sm:col-span-5"><img src="/images/meals/real-meal-lineup.jpg" alt="Real meal prep containers lined up with rice, vegetables, shrimp and sausage" loading="lazy" className="h-full w-full object-cover transition-transform duration-700 hover:scale-[1.03]" data-testid="img-gallery-real-meal-lineup" /><figcaption className="absolute bottom-4 left-4 bg-[#f1eee6] px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#102d2b]">Real meals / real prep</figcaption></figure>
              <figure className="relative min-h-[300px] overflow-hidden sm:col-span-5"><video autoPlay muted loop playsInline controls preload="metadata" poster="/images/meals/real-meal-lineup.jpg" className="h-full w-full object-cover" aria-label="Portrait video of finished 904 Meal Prepz meals" data-testid="video-meal-lineup"><source src="/videos/meal-lineup.mp4" type="video/mp4" /></video><figcaption className="pointer-events-none absolute bottom-4 left-4 bg-[#e7bd32] px-3 py-2 text-xs font-bold uppercase tracking-[.12em] text-[#102d2b]">Behind the scenes / real footage</figcaption></figure>
            </div>
          </div>
        </section>

        <section className="bg-[#174d49] px-5 py-20 text-[#f1eee6] lg:px-10 lg:py-24" aria-labelledby="proof-heading">
          <div className="mx-auto grid max-w-[1320px] gap-10 lg:grid-cols-[.8fr_1.2fr] lg:items-end">
            <div><p className="mono-label mb-4 text-[#e7bd32]">The word on the street / 06</p><h2 id="proof-heading" className="display-face max-w-[430px] text-5xl font-semibold leading-[.9] sm:text-7xl">Good food<br /><span className="text-[#e7bd32]">travels.</span></h2><a href="https://instagram.com/904mealprepz" target="_blank" rel="noreferrer" className="mt-8 inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-[.14em] text-[#e7bd32] hover:text-[#f1eee6]" data-testid="link-proof-instagram"><Instagram size={16} /> Follow @904mealprepz <ArrowRight size={16} /></a></div>
            <div className="grid gap-4 sm:grid-cols-3">
              <figure className="border-t border-[#f1eee6]/25 pt-4"><div className="text-3xl text-[#e7bd32]">“</div><blockquote className="mt-3 text-sm leading-6 text-[#f1eee6]/78">Demo placeholder — replace with a verified customer quote about flavor.</blockquote><figcaption className="mono-label mt-6 text-[#f1eee6]/45">Future customer / Jacksonville</figcaption></figure>
              <figure className="border-t border-[#f1eee6]/25 pt-4"><div className="text-3xl text-[#e7bd32]">“</div><blockquote className="mt-3 text-sm leading-6 text-[#f1eee6]/78">Demo placeholder — replace with a verified customer quote about convenience.</blockquote><figcaption className="mono-label mt-6 text-[#f1eee6]/45">Future customer / The 904</figcaption></figure>
              <figure className="border-t border-[#f1eee6]/25 pt-4"><div className="text-3xl text-[#e7bd32]">“</div><blockquote className="mt-3 text-sm leading-6 text-[#f1eee6]/78">Demo placeholder — replace with a verified customer quote about portions.</blockquote><figcaption className="mono-label mt-6 text-[#f1eee6]/45">Future customer / Jacksonville</figcaption></figure>
            </div>
          </div>
        </section>

        <section className="bg-[#e7bd32] px-5 py-16 lg:px-10" aria-labelledby="contact-heading">
          <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-8 md:flex-row md:items-center">
            <div><p className="mono-label mb-3 text-[#102d2b]/65">Questions, catering, good ideas?</p><h2 id="contact-heading" className="display-face text-4xl font-semibold leading-none sm:text-6xl">Let’s talk food.</h2></div>
            <div className="flex flex-wrap gap-3">
              <a href="mailto:hello@904mealprepz.com" className="inline-flex items-center gap-2 border border-[#102d2b] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] transition-colors hover:bg-[#102d2b] hover:text-[#f1eee6]" data-testid="link-contact-email"><Mail size={16} /> Email us</a>
              <a href="tel:+19045550184" className="inline-flex items-center gap-2 border border-[#102d2b] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] transition-colors hover:bg-[#102d2b] hover:text-[#f1eee6]" data-testid="link-contact-phone"><Phone size={16} /> Call (904) 555-0184</a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-[#102d2b] px-5 py-10 text-[#f1eee6] lg:px-10">
        <div className="mx-auto flex max-w-[1320px] flex-col justify-between gap-10 md:flex-row">
          <div><Logo light /><p className="mt-5 max-w-[260px] text-sm leading-6 text-[#f1eee6]/55">Real food for real schedules.<br />Proudly cooking in Jacksonville, FL.</p></div>
          <div className="grid grid-cols-2 gap-x-12 gap-y-6 sm:grid-cols-3">
            <div><p className="mono-label mb-4 text-[#e7bd32]">Find us</p><a href="https://instagram.com/904mealprepz" target="_blank" rel="noreferrer" className="flex items-center gap-2 text-sm hover:text-[#e7bd32]" data-testid="link-instagram"><Instagram size={16} /> @904mealprepz</a></div>
            <div><p className="mono-label mb-4 text-[#e7bd32]">Pickup</p><p className="flex items-start gap-2 text-sm text-[#f1eee6]/70"><MapPin size={16} className="mt-0.5 shrink-0" /> Sunday / 10–2<br />Jacksonville, FL</p></div>
            <div><p className="mono-label mb-4 text-[#e7bd32]">Next drop</p><p className="flex items-start gap-2 text-sm text-[#f1eee6]/70"><Clock3 size={16} className="mt-0.5 shrink-0" /> Order by<br />Saturday noon</p></div>
          </div>
        </div>
        <div className="mx-auto mt-10 flex max-w-[1320px] justify-between border-t border-[#f1eee6]/15 pt-5 text-[10px] uppercase tracking-[.12em] text-[#f1eee6]/38"><span>© 2025 904 Meal Prepz</span><span>Made for the 904</span></div>
      </footer>

      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-[#102d2b]/20 bg-[#f1eee6] p-3 shadow-[0_-8px_30px_rgba(16,45,43,.14)] lg:hidden">
        <div className="mx-auto flex max-w-[700px] items-center justify-between gap-3">
          <div><p className="mono-label text-[#174d49]">Your week</p><p className="text-sm font-bold">{totalMeals} meal{totalMeals === 1 ? '' : 's'} / {money(mealSubtotal + premiumCharges)}</p></div>
          <button type="button" onClick={() => openOrderFlow(1)} disabled={!totalMeals || !orderingOpen} className="inline-flex items-center gap-2 bg-[#e7bd32] px-4 py-3 text-xs font-extrabold uppercase tracking-[.12em] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-mobile-review-week">Review week <ArrowRight size={15} /></button>
        </div>
      </div>

      {orderOpen && <OrderFlow step={orderStep} setStep={setOrderStep} draft={draft} updateDraft={updateDraft} items={selectedItems} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} deliveryFee={deliveryFee} total={orderTotal} submitted={submitted} onClose={() => { setOrderOpen(false); setSubmitted(false); }} onComplete={() => setSubmitted(true)} />}
    </div>
  );
}

function DeadlineBanner({ orderingOpen, countdown, deadlineLabel }: { orderingOpen: boolean; countdown: { days: number; hours: number; minutes: number }; deadlineLabel: string }) {
  return (
    <div className={`mt-10 flex flex-col gap-4 border px-4 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-5 ${orderingOpen ? 'border-[#e7bd32] bg-[#102d2b] text-[#f1eee6]' : 'border-[#102d2b]/20 bg-[#d9d4c6]'}`} data-testid="deadline-banner">
      {orderingOpen ? (
        <>
          <div className="flex items-center gap-3"><Clock3 size={21} className="text-[#e7bd32]" /><div><p className="mono-label text-[#e7bd32]">Orders close in</p><p className="mt-1 font-mono text-lg font-bold tracking-[.08em]" data-testid="text-order-countdown">{padded(countdown.days)} DAY : {padded(countdown.hours)} HOURS : {padded(countdown.minutes)} MIN</p></div></div>
          <p className="text-xs uppercase tracking-[.12em] text-[#f1eee6]/65">Weekly cutoff / {deadlineLabel}</p>
        </>
      ) : (
        <p className="text-sm font-bold" data-testid="text-ordering-closed">Ordering for this week’s menu has closed. Check back for next week’s menu.</p>
      )}
    </div>
  );
}

function MealCard({ meal, index, quantity, orderingOpen, onUpdate }: { meal: WeeklyMeal; index: number; quantity: number; orderingOpen: boolean; onUpdate: (amount: number) => void }) {
  return (
    <article className="meal-card group" data-testid={`card-meal-${meal.id}`}>
      <div className="relative aspect-[1.15] overflow-hidden bg-[#d9d4c6]">
        <img src={meal.image} alt={`${meal.name}, ${meal.description}`} loading={index > 2 ? 'lazy' : undefined} className="meal-card-image h-full w-full object-cover" />
        <span className="absolute left-3 top-3 bg-[#e7bd32] px-2.5 py-1.5 text-[10px] font-extrabold uppercase tracking-[.12em] text-[#102d2b]">#{padded(meal.mealNumber)} {meal.premium ? 'Premium' : meal.category}</span>
        <span className="absolute bottom-3 right-3 bg-[#102d2b] px-2.5 py-1.5 font-mono text-[10px] text-[#f1eee6]" data-testid={`text-meal-macros-${meal.id}`}>{meal.calories} cal / {meal.protein}g protein / {meal.carbs}g carbs</span>
      </div>
      <div className="border-b border-[#102d2b]/18 pb-5 pt-4">
        <div className="flex items-start justify-between gap-4"><div><p className="mono-label mb-2 text-[#174d49]/65">{meal.category}</p><h3 className="text-xl font-extrabold tracking-[-.035em]" data-testid={`text-meal-name-${meal.id}`}>{meal.name}</h3></div><div className="text-right"><span className="text-lg font-bold" data-testid={`text-meal-price-${meal.id}`}>{money(meal.price)}</span>{meal.premium && <span className="block text-[10px] font-bold uppercase tracking-[.1em] text-[#bd8f16]">+ $2 premium</span>}</div></div>
        <p className="mt-2 max-w-[330px] text-sm leading-6 text-[#174d49]/70">{meal.description}</p>
        <div className="mt-5 flex items-center justify-between gap-3">
          <span className="text-xs font-extrabold uppercase tracking-[.13em] text-[#174d49]">{quantity ? `${quantity} selected` : 'Select quantity'}</span>
          <div className={`flex items-center border ${quantity ? 'border-[#174d49]' : 'border-[#102d2b]/25'} ${!orderingOpen ? 'opacity-50' : ''}`}>
            <button type="button" onClick={() => onUpdate(-1)} disabled={!quantity || !orderingOpen} className="grid h-10 w-10 place-items-center transition-colors hover:bg-[#d9d4c6] disabled:cursor-not-allowed" aria-label={`Decrease ${meal.name}`} data-testid={`button-decrease-${meal.id}`}><Minus size={15} /></button>
            <span className="w-8 text-center text-sm font-bold" data-testid={`text-quantity-${meal.id}`}>{quantity}</span>
            <button type="button" onClick={() => onUpdate(1)} disabled={!orderingOpen} className="grid h-10 w-10 place-items-center bg-[#102d2b] text-[#f1eee6] transition-colors hover:bg-[#174d49] disabled:cursor-not-allowed" aria-label={`Increase ${meal.name}`} data-testid={`button-increase-${meal.id}`}><Plus size={15} /></button>
          </div>
        </div>
      </div>
    </article>
  );
}

function WeekSummary({ items, totalMeals, mealSubtotal, premiumCharges, onUpdate, onContinue, orderingOpen }: { items: Array<{ meal: WeeklyMeal; quantity: number }>; totalMeals: number; mealSubtotal: number; premiumCharges: number; onUpdate: (meal: WeeklyMeal, amount: number) => void; onContinue: () => void; orderingOpen: boolean }) {
  return (
    <aside className="sticky top-6 hidden border-2 border-[#174d49] bg-[#d9d4c6] lg:block" aria-label="Your week summary" data-testid="week-summary">
      <div className="border-b border-[#174d49]/20 bg-[#174d49] px-5 py-5 text-[#f1eee6]"><p className="mono-label text-[#e7bd32]">Your week</p><h2 className="mt-1 text-2xl font-extrabold">Ready when you are.</h2><p className="mt-2 text-xs leading-5 text-[#f1eee6]/65">Choose quantities beside each meal. We’ll keep the running total here.</p></div>
      <div className="max-h-[420px] overflow-y-auto px-5">
        {!items.length ? <div className="py-10 text-center"><ShoppingBag size={30} strokeWidth={1.2} className="mx-auto" /><p className="mt-4 text-sm font-bold">Start with a meal.</p><p className="mt-2 text-xs leading-5 text-[#174d49]/65">Your weekly preorder will build here.</p></div> : items.map(({ meal, quantity }) => <div key={meal.id} className="flex gap-3 border-b border-[#102d2b]/12 py-4" data-testid={`row-week-summary-${meal.id}`}><img src={meal.image} alt="" className="h-14 w-14 object-cover" /><div className="min-w-0 flex-1"><div className="flex justify-between gap-2"><h3 className="text-sm font-bold leading-tight">#{padded(meal.mealNumber)} {meal.name}</h3><span className="text-sm font-bold">{money((meal.price + (meal.premium ? premiumCharge : 0)) * quantity)}</span></div><div className="mt-2 flex items-center justify-between gap-2"><span className="text-xs text-[#174d49]/65">{quantity} selected{meal.premium ? ' / +$2 premium' : ''}</span><div className="flex items-center border border-[#102d2b]/20"><button type="button" onClick={() => onUpdate(meal, -1)} className="grid h-7 w-7 place-items-center" aria-label={`Decrease ${meal.name} in your week`}><Minus size={12} /></button><span className="w-6 text-center text-xs">{quantity}</span><button type="button" onClick={() => onUpdate(meal, 1)} disabled={!orderingOpen} className="grid h-7 w-7 place-items-center bg-[#102d2b] text-[#f1eee6] disabled:opacity-40" aria-label={`Increase ${meal.name} in your week`}><Plus size={12} /></button></div></div></div></div>)}
      </div>
      <div className="border-t border-[#102d2b]/20 px-5 py-5">
        <div className="flex justify-between text-sm"><span>Meals selected</span><strong data-testid="text-summary-meals">{totalMeals}</strong></div>
        <div className="mt-3 flex justify-between text-sm"><span>Meal subtotal</span><strong data-testid="text-summary-meal-subtotal">{money(mealSubtotal)}</strong></div>
        <div className="mt-2 flex justify-between text-sm"><span>Premium charges</span><strong data-testid="text-summary-premium">{money(premiumCharges)}</strong></div>
        <div className="mt-4 flex justify-between border-t border-[#102d2b]/20 pt-4 font-bold"><span>Running subtotal</span><strong data-testid="text-summary-total">{money(mealSubtotal + premiumCharges)}</strong></div>
        <button type="button" onClick={onContinue} disabled={!items.length || !orderingOpen} className="mt-5 flex w-full items-center justify-center gap-2 bg-[#e7bd32] px-4 py-4 text-xs font-extrabold uppercase tracking-[.14em] text-[#102d2b] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-review-week">Review your week <ArrowRight size={16} /></button>
        {!orderingOpen && <p className="mt-3 text-center text-xs leading-5 text-[#174d49]/70">This week’s preorder window has closed.</p>}
      </div>
    </aside>
  );
}

function OrderFlow({ step, setStep, draft, updateDraft, items, totalMeals, mealSubtotal, premiumCharges, deliveryFee, total, submitted, onClose, onComplete }: { step: number; setStep: (step: number) => void; draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void; items: Array<{ meal: WeeklyMeal; quantity: number }>; totalMeals: number; mealSubtotal: number; premiumCharges: number; deliveryFee: number; total: number; submitted: boolean; onClose: () => void; onComplete: () => void }) {
  const canContinueFulfillment = draft.fulfillment === 'pickup' || (draft.deliveryZone && draft.address.trim());
  const canContinueCustomer = draft.name.trim() && draft.phone.trim() && draft.email.trim();
  const stepLabels = ['Build your week', 'Fulfillment', 'Customer info', 'Review order', 'Secure checkout'];
  if (submitted) return <div className="fixed inset-0 z-50 grid place-items-center overflow-y-auto bg-[#102d2b]/75 p-5"><div className="w-full max-w-[520px] bg-[#f1eee6] p-8 text-center text-[#102d2b] sm:p-12" data-testid="checkout-success"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-[#e7bd32]"><Check size={27} /></div><p className="mono-label mt-7 text-[#174d49]">Demo order prepared</p><h2 className="display-face mt-3 text-5xl leading-none">You’re on the list.</h2><p className="mx-auto mt-5 max-w-[350px] text-sm leading-6 text-[#174d49]/70">This is the Square hosted checkout handoff point. No payment was taken and no live order was submitted.</p><button type="button" onClick={onClose} className="mt-8 bg-[#102d2b] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em] text-[#f1eee6]" data-testid="button-close-success">Back to menu</button></div></div>;
  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-[#102d2b]/75 p-4 sm:p-8">
      <div className="mx-auto max-w-[980px] bg-[#f1eee6] text-[#102d2b]">
        <div className="flex items-center justify-between border-b border-[#102d2b]/15 px-5 py-5 sm:px-8"><div><p className="mono-label text-[#174d49]">Weekly preorder / step {step} of 5</p><h2 className="mt-1 text-2xl font-extrabold">{stepLabels[step - 1]}</h2></div><button type="button" onClick={onClose} className="grid h-10 w-10 place-items-center border border-[#102d2b]/20" aria-label="Close order flow" data-testid="button-close-order-flow"><X size={19} /></button></div>
        <div className="grid grid-cols-5 border-b border-[#102d2b]/15">
          {stepLabels.map((label, index) => <button key={label} type="button" onClick={() => index + 1 < step ? setStep(index + 1) : undefined} className={`border-r border-[#102d2b]/10 px-2 py-3 text-[9px] font-extrabold uppercase tracking-[.08em] last:border-0 sm:px-4 sm:text-[10px] ${step === index + 1 ? 'bg-[#174d49] text-[#f1eee6]' : index + 1 < step ? 'text-[#174d49]' : 'text-[#174d49]/45'}`} aria-current={step === index + 1 ? 'step' : undefined}>{String(index + 1).padStart(2, '0')}<span className="mt-1 hidden sm:block">{label}</span></button>)}
        </div>
        <div className="p-5 sm:p-8">
          {step === 1 && <BuildStep items={items} totalMeals={totalMeals} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} setStep={setStep} />}
          {step === 2 && <FulfillmentStep draft={draft} updateDraft={updateDraft} setStep={setStep} canContinue={Boolean(canContinueFulfillment)} />}
          {step === 3 && <CustomerStep draft={draft} updateDraft={updateDraft} setStep={setStep} canContinue={Boolean(canContinueCustomer)} />}
          {step === 4 && <ReviewStep items={items} draft={draft} mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} deliveryFee={deliveryFee} total={total} setStep={setStep} />}
          {step === 5 && <SecureCheckoutStep total={total} onComplete={onComplete} setStep={setStep} />}
        </div>
      </div>
    </div>
  );
}

function BuildStep({ items, totalMeals, mealSubtotal, premiumCharges, setStep }: { items: Array<{ meal: WeeklyMeal; quantity: number }>; totalMeals: number; mealSubtotal: number; premiumCharges: number; setStep: (step: number) => void }) {
  return <div><div className="flex flex-col justify-between gap-4 border-b border-[#102d2b]/15 pb-6 sm:flex-row sm:items-end"><div><p className="mono-label text-[#174d49]">Step 01</p><h3 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Here’s your week.</h3></div><p className="text-sm text-[#174d49]/65">{totalMeals} meal{totalMeals === 1 ? '' : 's'} selected</p></div><div className="mt-6 grid gap-3 sm:grid-cols-2">{items.map(({ meal, quantity }) => <div key={meal.id} className="flex items-center gap-3 border border-[#102d2b]/15 p-3" data-testid={`flow-item-${meal.id}`}><span className="grid h-9 w-9 shrink-0 place-items-center bg-[#e7bd32] text-xs font-black">#{meal.mealNumber}</span><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{meal.name}</p><p className="text-xs text-[#174d49]/65">{quantity} × {money(meal.price + (meal.premium ? premiumCharge : 0))}</p></div><strong className="text-sm">{money((meal.price + (meal.premium ? premiumCharge : 0)) * quantity)}</strong></div>)}</div><OrderTotals mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} /><div className="mt-8 flex justify-end"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-to-fulfillment">Continue to fulfillment <ArrowRight size={16} /></button></div></div>;
}

function FulfillmentStep({ draft, updateDraft, setStep, canContinue }: { draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void; setStep: (step: number) => void; canContinue: boolean }) {
  return <div><p className="mono-label text-[#174d49]">Step 02</p><h3 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">How should we get it to you?</h3><div className="mt-7 grid gap-4 sm:grid-cols-2"><button type="button" onClick={() => updateDraft({ fulfillment: 'pickup' })} className={`border p-5 text-left ${draft.fulfillment === 'pickup' ? 'border-[#174d49] bg-[#d9d4c6]' : 'border-[#102d2b]/20'}`} data-testid="button-select-pickup"><MapPin size={19} /><strong className="mt-4 block text-lg">Sunday pickup</strong><span className="mt-1 block text-sm text-[#174d49]/65">Choose your preferred weekly pickup window.</span></button><button type="button" onClick={() => updateDraft({ fulfillment: 'delivery' })} className={`border p-5 text-left ${draft.fulfillment === 'delivery' ? 'border-[#174d49] bg-[#d9d4c6]' : 'border-[#102d2b]/20'}`} data-testid="button-select-delivery"><Truck size={19} /><strong className="mt-4 block text-lg">Local delivery</strong><span className="mt-1 block text-sm text-[#174d49]/65">Select your 904 zone and we’ll calculate the fee.</span></button></div>{draft.fulfillment === 'pickup' ? <label className="mt-7 block text-xs font-bold uppercase tracking-[.1em]">Pickup window<select value={draft.pickupWindow} onChange={(event) => updateDraft({ pickupWindow: event.target.value })} className="mt-2 w-full border border-[#102d2b]/20 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#174d49]" data-testid="select-pickup-window">{weeklyMenu.pickupWindows.map((window) => <option key={window}>{window}</option>)}</select></label> : <div className="mt-7 grid gap-4 sm:grid-cols-2"><label className="text-xs font-bold uppercase tracking-[.1em]">Delivery zone<select value={draft.deliveryZone} onChange={(event) => updateDraft({ deliveryZone: event.target.value })} className="mt-2 w-full border border-[#102d2b]/20 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#174d49]" data-testid="select-delivery-zone">{weeklyMenu.deliveryZones.map((zone) => <option key={zone.id} value={zone.id}>{zone.name} / {money(zone.fee)}</option>)}</select></label><label className="text-xs font-bold uppercase tracking-[.1em]">Delivery address<textarea required value={draft.address} onChange={(event) => updateDraft({ address: event.target.value })} className="mt-2 min-h-[92px] w-full resize-y border border-[#102d2b]/20 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#174d49]" placeholder="Street, city, ZIP" data-testid="input-delivery-address" /></label></div>}<div className="mt-8 flex justify-between gap-3"><button type="button" onClick={() => setStep(1)} className="inline-flex items-center gap-2 px-2 py-3 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-back-build"><ArrowLeft size={16} /> Back</button><button type="button" onClick={() => setStep(3)} disabled={!canContinue} className="inline-flex items-center gap-2 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-flow-to-customer">Customer info <ArrowRight size={16} /></button></div></div>;
}

function CustomerStep({ draft, updateDraft, setStep, canContinue }: { draft: OrderDraft; updateDraft: (changes: Partial<OrderDraft>) => void; setStep: (step: number) => void; canContinue: boolean }) {
  return <div><p className="mono-label text-[#174d49]">Step 03</p><h3 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Who are we prepping for?</h3><div className="mt-7 grid gap-4 sm:grid-cols-2"><Field label="Full name" value={draft.name} onChange={(value) => updateDraft({ name: value })} placeholder="Your name" testId="input-customer-name" /><Field label="Phone" value={draft.phone} onChange={(value) => updateDraft({ phone: value })} placeholder="(904) 555-0184" type="tel" testId="input-customer-phone" /><Field label="Email" value={draft.email} onChange={(value) => updateDraft({ email: value })} placeholder="you@email.com" type="email" testId="input-customer-email" /><label className="text-xs font-bold uppercase tracking-[.1em] sm:col-span-2">Order notes <textarea value={draft.notes} onChange={(event) => updateDraft({ notes: event.target.value })} className="mt-2 min-h-[110px] w-full resize-y border border-[#102d2b]/20 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#174d49]" placeholder="Optional — allergies, timing notes, or anything we should know." data-testid="input-order-notes" /></label></div><div className="mt-8 flex justify-between gap-3"><button type="button" onClick={() => setStep(2)} className="inline-flex items-center gap-2 px-2 py-3 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-back-fulfillment"><ArrowLeft size={16} /> Back</button><button type="button" onClick={() => setStep(4)} disabled={!canContinue} className="inline-flex items-center gap-2 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em] disabled:cursor-not-allowed disabled:opacity-45" data-testid="button-flow-to-review">Review order <ArrowRight size={16} /></button></div></div>;
}

function ReviewStep({ items, draft, mealSubtotal, premiumCharges, deliveryFee, total, setStep }: { items: Array<{ meal: WeeklyMeal; quantity: number }>; draft: OrderDraft; mealSubtotal: number; premiumCharges: number; deliveryFee: number; total: number; setStep: (step: number) => void }) {
  const zone = weeklyMenu.deliveryZones.find((item) => item.id === draft.deliveryZone);
  return <div><p className="mono-label text-[#174d49]">Step 04</p><h3 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Make sure it looks right.</h3><div className="mt-7 grid gap-8 lg:grid-cols-[1fr_300px]"><div><div className="space-y-3">{items.map(({ meal, quantity }) => <div key={meal.id} className="flex justify-between gap-4 border-b border-[#102d2b]/12 pb-3 text-sm"><span>{quantity} × #{meal.mealNumber} {meal.name}{meal.premium ? ' / premium' : ''}</span><strong>{money((meal.price + (meal.premium ? premiumCharge : 0)) * quantity)}</strong></div>)}</div><div className="mt-6 border-t border-[#102d2b]/15 pt-5 text-sm"><p className="font-bold">Fulfillment</p><p className="mt-2 text-[#174d49]/70">{draft.fulfillment === 'pickup' ? draft.pickupWindow : `${zone?.name} / ${money(deliveryFee)}`}</p>{draft.fulfillment === 'delivery' && <p className="mt-1 text-[#174d49]/70">{draft.address}</p>}<p className="mt-5 font-bold">Customer</p><p className="mt-2 text-[#174d49]/70">{draft.name} / {draft.phone} / {draft.email}</p>{draft.notes && <><p className="mt-5 font-bold">Notes</p><p className="mt-2 text-[#174d49]/70">{draft.notes}</p></>}</div></div><div className="bg-[#d9d4c6] p-5"><OrderTotals mealSubtotal={mealSubtotal} premiumCharges={premiumCharges} deliveryFee={deliveryFee} total={total} /></div></div><div className="mt-8 flex justify-between gap-3"><button type="button" onClick={() => setStep(3)} className="inline-flex items-center gap-2 px-2 py-3 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-back-customer"><ArrowLeft size={16} /> Back</button><button type="button" onClick={() => setStep(5)} className="inline-flex items-center gap-2 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-to-checkout">Secure checkout <ArrowRight size={16} /></button></div></div>;
}

function SecureCheckoutStep({ total, onComplete, setStep }: { total: number; onComplete: () => void; setStep: (step: number) => void }) {
  return <div><p className="mono-label text-[#174d49]">Step 05</p><h3 className="mt-2 text-3xl font-extrabold tracking-[-.04em]">Secure checkout.</h3><div className="mt-7 grid gap-8 lg:grid-cols-[1fr_280px] lg:items-center"><div className="border border-[#174d49] bg-[#d9d4c6] p-6"><div className="flex items-start gap-4"><ShieldCheck className="mt-0.5 text-[#174d49]" size={24} /><div><h4 className="text-lg font-bold">Square hosted checkout ready</h4><p className="mt-2 max-w-[470px] text-sm leading-6 text-[#174d49]/70">When you are ready to go live, this button becomes a server-created Square Checkout link. No payment credentials are needed for this demo.</p></div></div></div><div className="bg-[#174d49] p-6 text-[#f1eee6]"><p className="mono-label text-[#e7bd32]">Final total</p><p className="mt-2 text-4xl font-bold">{money(total)}</p><p className="mt-2 text-xs text-[#f1eee6]/60">Payment is not processed here.</p></div></div><div className="mt-8 flex justify-between gap-3"><button type="button" onClick={() => setStep(4)} className="inline-flex items-center gap-2 px-2 py-3 text-xs font-extrabold uppercase tracking-[.14em]" data-testid="button-flow-back-review"><ArrowLeft size={16} /> Back</button><button type="button" onClick={onComplete} className="inline-flex items-center gap-2 bg-[#e7bd32] px-5 py-3.5 text-xs font-extrabold uppercase tracking-[.14em]" data-checkout-provider="square" data-testid="button-square-demo-checkout">Continue to Square <ArrowRight size={16} /></button></div></div>;
}

function OrderTotals({ mealSubtotal, premiumCharges, deliveryFee = 0, total = mealSubtotal + premiumCharges + deliveryFee }: { mealSubtotal: number; premiumCharges: number; deliveryFee?: number; total?: number }) {
  return <div className="space-y-3 text-sm"><div className="flex justify-between"><span>Meal subtotal</span><strong data-testid="text-order-meal-subtotal">{money(mealSubtotal)}</strong></div><div className="flex justify-between"><span>Premium charges</span><strong data-testid="text-order-premium-charges">{money(premiumCharges)}</strong></div><div className="flex justify-between"><span>Delivery charge</span><strong data-testid="text-order-delivery-fee">{deliveryFee ? money(deliveryFee) : '—'}</strong></div><div className="flex justify-between border-t border-[#102d2b]/20 pt-4 font-bold"><span>Final total</span><strong data-testid="text-order-final-total">{money(total)}</strong></div></div>;
}

function Field({ label, value, onChange, placeholder, type = 'text', testId }: { label: string; value: string; onChange: (value: string) => void; placeholder: string; type?: string; testId: string }) {
  return <label className="text-xs font-bold uppercase tracking-[.1em]">{label}<input required type={type} value={value} onChange={(event) => onChange(event.target.value)} className="mt-2 w-full border border-[#102d2b]/20 bg-transparent px-3 py-3 text-sm font-normal normal-case tracking-normal outline-none focus:border-[#174d49]" placeholder={placeholder} data-testid={testId} /></label>;
}

function Step({ number, title, copy }: { number: string; title: string; copy: string }) {
  return <div className="border-b border-[#f1eee6]/15 p-5 sm:border-b-0 sm:border-r last:border-0 lg:p-8"><p className="mono-label text-[#e7bd32]">{number}</p><h3 className="mt-16 text-xl font-bold">{title}</h3><p className="mt-3 text-sm leading-6 text-[#f1eee6]/65">{copy}</p></div>;
}
function Promise({ icon, title, copy }: { icon: ReactNode; title: string; copy: string }) {
  return <div className="border-t-2 border-[#174d49] pt-5"><div className="mb-9 text-[#bd8f16]">{icon}</div><h3 className="text-xl font-extrabold">{title}</h3><p className="mt-2 max-w-[260px] text-sm leading-6 text-[#174d49]/70">{copy}</p></div>;
}
function FlameIcon() { return <Flame size={27} strokeWidth={1.5} aria-hidden="true" />; }
function ShieldIcon() { return <ShieldCheck size={27} strokeWidth={1.5} aria-hidden="true" />; }
function LeafIcon() { return <Leaf size={27} strokeWidth={1.5} aria-hidden="true" />; }

export default App;