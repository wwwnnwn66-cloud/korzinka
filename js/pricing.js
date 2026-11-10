/*
  Сколько стоит неделя.
  Свежие продукты (мясо, молочка, хлеб, большинство овощей) считаем ЦЕЛЫМИ упаковками —
  половину пачки фарша не купишь, а через неделю она испортится.
  Долгохранящиеся (крупы, специи, заморозка, картошка, лук…) считаем по доле:
  остаток пойдёт в следующую неделю.
  То, что отмечено в анкете как «есть дома», не стоит ничего.
*/
import { PRODUCTS } from './data/products.js';
import { isOnSale, bestDeal, promoFor, offerPackPrice, promoPackPrice } from './offers.js';

const LONG_DEPS = ['trocken', 'gewuerze', 'frueh', 'tk'];
const LONG_ITEMS = ['potato', 'onion', 'garlic', 'carrot', 'apple', 'lemon', 'cabbage', 'pumpkin'];

export function keepsLong(product) {
  return LONG_DEPS.includes(product.dep) || LONG_ITEMS.includes(product.id);
}

// Товар отмечен в анкете «только по скидке»? Тогда покупаем именно акционный.
export function promoOnly(product, profile) {
  if (!profile) return false;
  if (product.id === 'frozen_pizza') return profile.ready && profile.ready.pizza === 'sale';
  for (const [key, kinds] of Object.entries(DRINK_KINDS)) {
    if (Object.values(kinds).includes(product.id)) {
      return profile.drinks && profile.drinks[key] && profile.drinks[key].mode === 'sale';
    }
  }
  return false;
}

// Какая акция используется для этого товара (или null)
export function offerUsed(product, profile) {
  return promoOnly(product, profile) ? promoFor(product) : bestDeal(product);
}

// Цена упаковки из каталога с учётом акции.
// Для «только по скидке» (пицца, напитки) покупаем сам акционный товар — цена за штуку.
export function priceOf(product, profile) {
  if (promoOnly(product, profile)) {
    const promo = promoFor(product);
    return promo ? promoPackPrice(promo, product) : product.price;
  }
  const deal = bestDeal(product);
  return deal ? offerPackPrice(deal, product) : product.price;
}

// ---------- Напитки из анкеты ----------
export const DRINK_KINDS = {
  cola: { regular: 'cola', zero: 'cola_zero' },
  water: { sparkling: 'water_sparkling', medium: 'water_medium', still: 'water_still' },
  energy: { regular: 'energy' },
};

/*
  Какие напитки покупать на этой неделе.
  mode: 'no' — не нужно, 'sale' — только если по скидке, 'always' — всегда.
  Результат: [{ key, product, qty, mode, active }]
*/
export function drinksPlan(profile) {
  const drinks = profile.drinks || {};
  return Object.keys(DRINK_KINDS).map((key) => {
    const d = drinks[key] || { mode: 'no' };
    const kinds = DRINK_KINDS[key];
    const product = PRODUCTS[kinds[d.kind] || Object.values(kinds)[0]];
    const qty = Math.max(0, Number(d.qty) || 0);
    const active = qty > 0 && (d.mode === 'always' || (d.mode === 'sale' && isOnSale(product.id)));
    return { key, product, qty, mode: d.mode, active };
  });
}

// Добавить напитки к списку нужных продуктов (в граммах/мл)
export function addDrinks(needs, profile) {
  for (const d of drinksPlan(profile)) {
    if (d.active) needs[d.product.id] = (needs[d.product.id] || 0) + d.qty * d.product.piece;
  }
  return needs;
}

/*
  needs — сколько граммов каждого продукта нужно за неделю: { milk_lf: 1400, ... }
  Результат: { lines: [...], total }
*/
export function priceNeeds(needs, profile) {
  const lines = [];
  let total = 0;
  for (const [id, grams] of Object.entries(needs)) {
    const product = PRODUCTS[id];
    if (!product || grams <= 0) continue;
    const atHome = profile.pantry.includes(id);
    // небольшой допуск, чтобы 1010 г не превращались в 2 пачки по 1000 г
    const packs = Math.max(1, Math.ceil(grams / product.size - 0.03));
    let cost = 0;
    if (!atHome) {
      const pack = priceOf(product, profile);
      cost = keepsLong(product) ? (grams / product.size) * pack : packs * pack;
    }
    total += cost;
    lines.push({ product, grams, packs, cost, atHome });
  }
  return { lines, total };
}
