/*
  «Повар-помощник»: проверяет, подходит ли рецепт под анкету.
  - меняет обычную молочку на безлактозную (или растительную), если так указано в анкете;
  - убирает необязательные продукты, которые нельзя;
  - прячет рецепты, для которых нет посуды или которые нарушают ограничения;
  - считает калории, БЖУ и примерную цену порции.
*/
import { PRODUCTS } from './data/products.js';
import { RECIPES } from './data/recipes.js';
import { DIETS, STOP_SUGGESTIONS, EQUIPMENT, METHODS, MEALS } from './profile.js';
import { priceOf } from './pricing.js';
import { isOnSale } from './offers.js';

// Какие метки продуктов запрещает каждое ограничение
const DIET_BANS = {
  gluten_free: ['gluten'],
  vegetarian: ['meat', 'fish'],
  vegan: ['meat', 'fish', 'dairy', 'egg', 'animal'],
  no_pork: ['pork'],
  no_eggs: ['egg'],
};

const label = (list, id) => (list.find((x) => x.id === id) || { label: id }).label;

// Упрощённое сравнение слов: «кабачки» найдёт «Кабачок»
function stem(word) {
  const w = word.toLowerCase().replace(/ё/g, 'е').trim();
  return w.length > 5 ? w.slice(0, w.length - 2) : w;
}
function matchesCustom(text, customStems) {
  const t = text.toLowerCase().replace(/ё/g, 'е');
  return customStems.find((s) => s && t.includes(s));
}

// Заменить продукт под ограничения. Возвращает { product, note } или { fail }
function adaptProduct(product, diets, profile) {
  let p = product;
  const notes = [];
  // готовая еда (пицца), для которой в анкете разрешена лактоза
  if (p.tags.includes('ready') && profile.ready && profile.ready.pizzaLactoseOk) {
    diets = diets.filter((d) => d !== 'lactose_free');
  }
  if ((diets.includes('dairy_free') || diets.includes('vegan')) && p.tags.includes('dairy')) {
    if (p.alt && p.alt.df) {
      notes.push(`вместо «${p.ru}»`);
      p = PRODUCTS[p.alt.df];
    } else {
      return { fail: `${p.ru} — молочное` };
    }
  }
  if (diets.includes('lactose_free') && p.tags.includes('lactose')) {
    if (p.alt && p.alt.lf) {
      notes.push(`вместо «${p.ru}»`);
      p = PRODUCTS[p.alt.lf];
    } else {
      return { fail: `${p.ru} — есть лактоза` };
    }
  }
  return { product: p, note: notes.join(', ') };
}

// Почему продукт нельзя (или null, если можно)
function productProblem(p, profile, customStems) {
  for (const diet of profile.diets) {
    const bans = DIET_BANS[diet] || [];
    if (p.tags.some((t) => bans.includes(t))) return `${p.ru} — ${label(DIETS, diet).toLowerCase()}`;
  }
  const stopTag = p.tags.find((t) => profile.stop.includes(t));
  if (stopTag) return `${p.ru} — в стоп-списке (${label(STOP_SUGGESTIONS, stopTag).toLowerCase()})`;
  const custom = matchesCustom(p.ru + ' ' + p.de, customStems);
  if (custom) return `${p.ru} — в стоп-списке`;
  return null;
}

/*
  Проверить один рецепт под анкету.
  Результат: { recipe, ok, reasons[], items[], nutrition, price }
  items — продукты на одну порцию после замен: { product, g, optional, note }
*/
export function adaptRecipe(recipe, profile) {
  const reasons = [];
  const items = [];
  const dropped = [];
  const customStems = (profile.stopCustom || []).map(stem);

  // 1. Посуда
  for (const need of recipe.equipment) {
    const options = need.split('|');
    if (!options.some((id) => profile.equipment.includes(id))) {
      reasons.push('нет посуды: ' + options.map((id) => label(EQUIPMENT, id).toLowerCase()).join(' или '));
    }
  }
  // 2. Способы готовки
  for (const m of recipe.methods) {
    if (!profile.methods.includes(m)) reasons.push('способ готовки: ' + label(METHODS, m).toLowerCase());
  }
  // 3. Приёмы пищи
  if (!recipe.meals.some((m) => profile.meals.includes(m))) {
    reasons.push('приём пищи не выбран: ' + recipe.meals.map((m) => label(MEALS, m).toLowerCase()).join(', '));
  }
  // 4. Особые метки рецепта (например, острое) и свои стоп-продукты в названии
  for (const t of recipe.tags || []) {
    if (profile.stop.includes(t)) reasons.push('в стоп-списке: ' + label(STOP_SUGGESTIONS, t).toLowerCase());
  }
  if (matchesCustom(recipe.name, customStems)) reasons.push('в стоп-списке (название блюда)');

  // 5. Готовая еда (пицца): по настройке «не нужно / по скидке / всегда»
  if (recipe.ready) {
    const mode = (profile.ready && profile.ready[recipe.ready]) || 'no';
    const mainProduct = recipe.ing[0][0];
    if (mode === 'no') reasons.push('готовая еда выключена в анкете');
    if (mode === 'sale' && !isOnSale(mainProduct)) reasons.push('только по скидке — сейчас скидки нет');
  }

  // 6. Продукты
  for (const [id, g, opt] of recipe.ing) {
    const original = PRODUCTS[id];
    if (!original) {
      reasons.push(`неизвестный продукт «${id}»`);
      continue;
    }
    const optional = opt === 'opt';
    const swapped = adaptProduct(original, profile.diets, profile);
    const problem = swapped.fail || productProblem(swapped.product, profile, customStems);
    if (problem) {
      // необязательное или «для вкуса» (лук, чеснок, зелень) — просто убираем
      if (optional || original.soft) dropped.push(original);
      else reasons.push(problem);
      continue;
    }
    items.push({ product: swapped.product, g, optional, note: swapped.note });
  }

  const nutrition = { kcal: 0, p: 0, f: 0, c: 0 };
  let price = 0;
  for (const it of items) {
    const [kcal, pr, f, c] = it.product.n;
    nutrition.kcal += (kcal * it.g) / 100;
    nutrition.p += (pr * it.g) / 100;
    nutrition.f += (f * it.g) / 100;
    nutrition.c += (c * it.g) / 100;
    // то, что уже есть дома, в цену не входит
    if (!profile.pantry.includes(it.product.id)) {
      price += (priceOf(it.product, profile) * it.g) / it.product.size;
    }
  }
  for (const k of Object.keys(nutrition)) nutrition[k] = Math.round(nutrition[k]);

  return { recipe, ok: reasons.length === 0, reasons, items, dropped, nutrition, price };
}

// Все рецепты сразу: подходящие и скрытые
export function cookbook(profile) {
  const all = RECIPES.map((r) => adaptRecipe(r, profile));
  return { ok: all.filter((x) => x.ok), hidden: all.filter((x) => !x.ok) };
}

export function findRecipe(id) {
  return RECIPES.find((r) => r.id === id);
}

// ---------- Форматирование для экрана ----------

// «2 шт (120 г)», «200 мл», «по вкусу»
export function formatAmount(product, grams) {
  if (!grams) return 'по вкусу';
  const unit = product.unit === 'ml' ? 'мл' : 'г';
  const rounded = grams >= 30 ? Math.round(grams / 5) * 5 : Math.round(grams);
  if (product.piece) {
    const pieces = grams / product.piece;
    const half = Math.round(pieces * 2) / 2; // округляем до половинок
    if (half > 0) {
      const text = String(half).replace('.5', '½').replace(/^0½/, '½').replace('.', ',');
      return `${text} ${product.pieceName} (${rounded} ${unit})`;
    }
  }
  return `${rounded} ${unit}`;
}

export function formatPrice(euro) {
  return euro.toFixed(2).replace('.', ',') + ' €';
}
