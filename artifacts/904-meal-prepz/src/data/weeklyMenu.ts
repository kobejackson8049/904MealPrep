export type MenuCategory = 'Breakfast' | 'Entrées' | 'Healthier Entrées' | 'Premium Meals';

export type WeeklyMeal = {
  id: string;
  mealNumber: number;
  name: string;
  description: string;
  category: MenuCategory;
  price: number;
  calories: number;
  protein: number;
  carbs: number;
  image: string;
  premium: boolean;
  tag?: string;
};

export type DeliveryZone = {
  id: string;
  name: string;
  fee: number;
};

export const weeklyMenu = {
  weekLabel: 'This week',
  orderDeadline: '2026-09-05T12:00:00-04:00',
  deadlineLabel: 'Saturday at noon',
  pickupWindows: ['Sunday / 10:00 AM–12:00 PM', 'Sunday / 12:00 PM–2:00 PM'],
  deliveryZones: [
    { id: 'zone-904-core', name: 'Core 904 zone', fee: 5 },
    { id: 'zone-east', name: 'East Jacksonville', fee: 7 },
    { id: 'zone-beaches', name: 'Beaches area', fee: 9 },
  ] satisfies DeliveryZone[],
  meals: [
    { id: 'three-egg-breakfast', mealNumber: 1, name: '3 Egg Breakfast', description: 'Three eggs, seasoned breakfast potatoes, turkey sausage and fresh fruit.', category: 'Breakfast', price: 8, calories: 460, protein: 31, carbs: 34, image: '/images/meals/hero-salmon.jpg', premium: false, tag: 'Starts at $8' },
    { id: 'biscuits-gravy-bowl', mealNumber: 2, name: 'Biscuits & Gravy Bowl', description: 'Flaky biscuit, turkey sausage gravy, eggs and breakfast potatoes.', category: 'Breakfast', price: 9.5, calories: 590, protein: 29, carbs: 58, image: '/images/meals/steak-chimichurri.jpg', premium: false },
    { id: 'steak-egg-cheese-croissant', mealNumber: 3, name: 'Steak Egg & Cheese Croissant', description: 'Sliced steak, scrambled egg, melted cheese and a buttery croissant.', category: 'Breakfast', price: 10.5, calories: 620, protein: 38, carbs: 43, image: '/images/meals/jerk-chicken.jpg', premium: false },
    { id: 'teriyaki-chicken-bowl', mealNumber: 4, name: 'Teriyaki Chicken Bowl', description: 'Grilled chicken, jasmine rice, sesame broccoli and house teriyaki glaze.', category: 'Entrées', price: 12.75, calories: 560, protein: 45, carbs: 58, image: '/images/meals/real-meal-lineup.jpg', premium: false, tag: 'Customer favorite' },
    { id: 'jerk-chicken', mealNumber: 5, name: 'Jerk Chicken Bowl', description: 'Coconut rice, island greens, fresh mango salsa and lime.', category: 'Entrées', price: 13.75, calories: 570, protein: 47, carbs: 54, image: '/images/meals/jerk-chicken.jpg', premium: false, tag: 'Jacksonville favorite' },
    { id: 'tex-mex-beefy-mac', mealNumber: 6, name: 'Tex-Mex Beefy Mac', description: 'Seasoned ground beef, creamy mac, roasted corn, pico and cilantro.', category: 'Entrées', price: 13.25, calories: 640, protein: 41, carbs: 62, image: '/images/meals/real-meal-lineup.jpg', premium: false },
    { id: 'buffalo-ranch-home-fries', mealNumber: 7, name: 'Buffalo Ranch Chicken Loaded Home Fries', description: 'Buffalo chicken, crispy home fries, bacon, ranch and melted cheese.', category: 'Entrées', price: 14.25, calories: 620, protein: 39, carbs: 52, image: '/images/meals/real-meal-lineup.jpg', premium: false },
    { id: 'buttery-garlic-chicken', mealNumber: 8, name: 'Buttery Garlic Chicken', description: 'Roasted chicken, garlic butter, broccoli, seasoned rice and asparagus.', category: 'Healthier Entrées', price: 13.25, calories: 480, protein: 42, carbs: 23, image: '/images/meals/lemon-chicken.jpg', premium: false, tag: 'Lean pick' },
    { id: 'chicken-caprese-wrap', mealNumber: 9, name: 'Chicken Caprese Wrap', description: 'Herb chicken, mozzarella, tomato, basil and balsamic glaze in a soft wrap.', category: 'Healthier Entrées', price: 11.75, calories: 430, protein: 36, carbs: 38, image: '/images/meals/lemon-chicken.jpg', premium: false },
    { id: 'smoky-salmon-bowl', mealNumber: 10, name: 'Smoky Salmon Bowl', description: 'Citrus quinoa, charred broccolini, roasted sweet potato and herb crema.', category: 'Premium Meals', price: 15.5, calories: 610, protein: 42, carbs: 49, image: '/images/meals/hero-salmon.jpg', premium: true, tag: 'Premium +$2' },
    { id: 'steak-chimichurri', mealNumber: 11, name: 'Steak Chimichurri', description: 'Seared sirloin, smashed potatoes, crisp vegetables and bright chimichurri.', category: 'Premium Meals', price: 16.25, calories: 680, protein: 49, carbs: 51, image: '/images/meals/steak-chimichurri.jpg', premium: true, tag: 'Premium +$2' },
  ] satisfies WeeklyMeal[],
};

export const premiumCharge = 2;