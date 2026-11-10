/*
  Составитель меню на неделю.

  Как он работает:
  1. Берёт только рецепты, которые подходят под анкету (cookbook.js).
  2. Для каждого дня и приёма пищи выбирает блюдо, которое успеваете приготовить
     (будни / выходные — по анкете), стараясь не повторяться.
  3. Если в анкете «готовить на два дня» — блюдо идёт и на следующий день.
  4. Пробует несколько сотен вариантов недели и оставляет лучший:
     в рамках бюджета, без повторов, дешевле.
  5. Порции каждого человека подгоняются под его цель по калориям.
*/
import { MEALS } from './profile.js';
import { cookbook, adaptRecipe, findRecipe } from './cookbook.js';
import { priceNeeds, addDrinks, keepsLong, offerUsed } from './pricing.js';

const ATTEMPTS = 300;

// Какую долю дневных калорий даёт каждый приём пищи
const MEAL_SHARE = { breakfast: 0.25, lunch: 0.35, dinner: 0.3, snack: 0.1 };

// ---------- Даты ----------

export function toISO(date) {
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${date.getFullYear()}-${m}-${d}`;
}
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number);
  return new Date(y, m - 1, d);
}
function addDays(date, n) {
  const d = new Date(date);
  d.setDate(d.getDate() + n);
  return d;
}
export function isWeekend(date) {
  const day = date.getDay();
  return day === 0 || day === 6;
}
export function nextMonday(from = new Date()) {
  const d = new Date(from.getFullYear(), from.getMonth(), from.getDate());
  const add = (8 - d.getDay()) % 7 || 7;
  return addDays(d, add);
}

// ---------- Время и порции ----------

// Сколько минут есть на этот приём пищи в этот день
export function timeLimit(profile, date, meal) {
  const t = profile.time;
  const value = t.detailed ? t[isWeekend(date) ? 'weekend' : 'weekday'][meal] : t.simple;
  return value === 'any' || value === undefined ? Infinity : Number(value);
}

// Во сколько раз порцию человека нужно увеличить/уменьшить под его цель
export function personFactor(person, meal, recipeKcal, meals) {
  if (!person.kcal || !recipeKcal) return 1;
  const shareSum = meals.reduce((s, m) => s + (MEAL_SHARE[m] || 0), 0) || 1;
  const target = (person.kcal * (MEAL_SHARE[meal] || 0.25)) / shareSum;
  const factor = Math.round((target / recipeKcal) * 10) / 10; // до десятых
  return Math.min(2, Math.max(0.5, factor));
}

// Выбранные приёмы пищи в правильном порядке
function orderedMeals(profile) {
  return MEALS.map((m) => m.id).filter((id) => profile.meals.includes(id));
}

// Подходящие рецепты: { id: результат adaptRecipe }
export function poolFor(profile) {
  return Object.fromEntries(cookbook(profile).ok.map((x) => [x.recipe.id, x]));
}

// Сколько продуктов блюда сейчас продаются выгоднее обычного (кроме того, что есть дома)
function dealCount(x, profile) {
  if (x._deals === undefined) {
    x._deals = x.items.filter((it) => !profile.pantry.includes(it.product.id) && offerUsed(it.product, profile)).length;
  }
  return x._deals;
}

// Случайный выбор с «весами»: чем больше вес, тем чаще выпадает
function weightedPick(items, weightOf) {
  const weights = items.map(weightOf);
  const sum = weights.reduce((a, b) => a + b, 0);
  let r = Math.random() * sum;
  for (let i = 0; i < items.length; i++) {
    r -= weights[i];
    if (r <= 0) return items[i];
  }
  return items[items.length - 1];
}

// ---------- Составление ----------

export function generateMenu(profile, startDate) {
  const pool = poolFor(profile);
  const dates = Array.from({ length: 7 }, (_, i) => addDays(startDate, i));
  let best = null;

  for (let a = 0; a < ATTEMPTS; a++) {
    const attempt = buildAttempt(profile, pool, dates);
    const cost = weekCost(attempt.days, profile, pool);
    const over = Math.max(0, cost - (profile.budget || Infinity));
    const score = over * 100 + cost * 0.3 + attempt.repeats * 4 + attempt.overTime * 10;
    if (!best || score < best.score) best = { ...attempt, score, cost };
  }

  return {
    createdAt: Date.now(),
    start: toISO(startDate),
    days: best.days,
  };
}

function buildAttempt(profile, pool, dates) {
  const meals = orderedMeals(profile);
  const days = dates.map((d) => ({ date: toISO(d), meals: {} }));
  const used = {};
  let repeats = 0;
  let overTime = 0;
  const all = Object.values(pool);

  dates.forEach((date, i) => {
    for (const meal of meals) {
      if (days[i].meals[meal]) continue; // уже заполнено остатками со вчера

      const options = all.filter((x) => x.recipe.meals.includes(meal));
      if (!options.length) {
        days[i].meals[meal] = { id: null };
        continue;
      }
      const limit = timeLimit(profile, date, meal);
      let fit = options.filter((x) => x.recipe.time <= limit);
      if (!fit.length) {
        // ничего не успеваем — берём самое быстрое
        const fastest = Math.min(...options.map((x) => x.recipe.time));
        fit = options.filter((x) => x.recipe.time === fastest);
        overTime++;
      }
      // готовая еда (пицца) — не чаще, чем указано в анкете
      const readyLimit = (profile.ready && Number(profile.ready.pizzaPerWeek)) || 1;
      const readyUsed = Object.entries(used)
        .filter(([id]) => pool[id] && pool[id].recipe.ready)
        .reduce((s, [, n]) => s + n, 0);
      const allowed = fit.filter((x) => !x.recipe.ready || readyUsed < readyLimit);
      if (allowed.length) fit = allowed;

      const yesterday = i > 0 && days[i - 1].meals[meal] ? days[i - 1].meals[meal].id : null;
      const pick = weightedPick(fit, (x) =>
        (used[x.recipe.id] ? 0.15 : 1) *
        (x.recipe.id === yesterday ? 0.02 : 1) *
        (x.recipe.ready ? 3 : 1) * // пицца по скидке — повыше шанс
        (1 + 0.6 * dealCount(x, profile))); // блюда с продуктами по акции — чаще

      const id = pick.recipe.id;
      if (used[id]) repeats++;
      used[id] = (used[id] || 0) + 1;
      const slot = { id };

      // «Готовить на два дня»
      const next = days[i + 1];
      const isMain = meal === 'lunch' || meal === 'dinner';
      if (next && isMain && profile.cookTwice === 'yes' && pick.recipe.keeps >= 2 &&
          !next.meals[meal] && Math.random() < 0.75) {
        slot.cookFor2 = true;
        next.meals[meal] = { id, leftover: true };
      }
      if (next && meal === 'dinner' && profile.cookTwice === 'dinner_to_lunch' &&
          meals.includes('lunch') && pick.recipe.keeps >= 1 && !next.meals.lunch) {
        slot.cookFor2 = true;
        next.meals.lunch = { id, leftover: true, fromDinner: true };
      }
      days[i].meals[meal] = slot;
    }
  });

  return { days, repeats, overTime };
}

// ---------- Подсчёты по готовому меню ----------

// Порции каждого человека в одном приёме пищи
export function slotPeople(profile, meal, x) {
  const meals = orderedMeals(profile);
  return profile.people.map((person) => {
    const factor = personFactor(person, meal, x.nutrition.kcal, meals);
    return { person, factor, kcal: Math.round(x.nutrition.kcal * factor) };
  });
}

// Сколько граммов каждого продукта нужно на всё меню
export function menuNeeds(days, profile, pool = poolFor(profile)) {
  const needs = {};
  for (const day of days) {
    for (const [meal, slot] of Object.entries(day.meals)) {
      const x = slot.id && (pool[slot.id] || adaptRecipe(findRecipe(slot.id), profile));
      if (!x) continue;
      const portions = slotPeople(profile, meal, x).reduce((s, p) => s + p.factor, 0);
      for (const it of x.items) {
        needs[it.product.id] = (needs[it.product.id] || 0) + it.g * portions;
      }
    }
  }
  return needs;
}

/*
  Что покупать в каждый поход в магазин.
  Если походов 2: во 2-й поход переносятся только быстро портящиеся продукты
  (мясо, хлеб, свежие овощи и фрукты) для блюд с 5-го дня. Молочка, яйца,
  крупы, заморозка и напитки — всё в 1-й поход: они спокойно хранятся неделю.
  Остатки «со вчера» относятся к дню, когда блюдо готовят.
*/
const SHORT_DEPS = ['obst', 'brot', 'fleisch'];
export const FIRST_TRIP_DAYS = 4;

export function tripNeeds(days, profile, pool = poolFor(profile)) {
  const trips = profile.shopsPerWeek === '2' ? 2 : 1;
  const out = Array.from({ length: trips }, () => ({}));
  days.forEach((day, i) => {
    for (const [meal, slot] of Object.entries(day.meals)) {
      if (!slot.id || !findRecipe(slot.id)) continue;
      const x = pool[slot.id] || adaptRecipe(findRecipe(slot.id), profile);
      const cookDay = slot.leftover ? i - 1 : i;
      const portions = slotPeople(profile, meal, x).reduce((s, p) => s + p.factor, 0);
      for (const it of x.items) {
        const late = trips === 2 && cookDay >= FIRST_TRIP_DAYS &&
          SHORT_DEPS.includes(it.product.dep) && !keepsLong(it.product);
        const needs = out[late ? 1 : 0];
        needs[it.product.id] = (needs[it.product.id] || 0) + it.g * portions;
      }
    }
  });
  addDrinks(out[0], profile);
  return out;
}

// Стоимость недели — так же, как в списке покупок (по походам)
function weekCost(days, profile, pool) {
  return tripNeeds(days, profile, pool).reduce((s, needs) => s + priceNeeds(needs, profile).total, 0);
}

// Найти «пару» для блюда на два дня: { cook: [день, приём], leftover: [день, приём] }
function findPair(menu, dayIndex, meal) {
  const slot = menu.days[dayIndex].meals[meal];
  if (!slot) return null;
  if (slot.leftover) {
    const cookMeal = slot.fromDinner ? 'dinner' : meal;
    return { cook: [dayIndex - 1, cookMeal], leftover: [dayIndex, meal], minKeeps: slot.fromDinner ? 1 : 2 };
  }
  if (slot.cookFor2) {
    const next = menu.days[dayIndex + 1];
    if (next) {
      if (next.meals[meal] && next.meals[meal].leftover && !next.meals[meal].fromDinner) {
        return { cook: [dayIndex, meal], leftover: [dayIndex + 1, meal], minKeeps: 2 };
      }
      if (meal === 'dinner' && next.meals.lunch && next.meals.lunch.fromDinner) {
        return { cook: [dayIndex, meal], leftover: [dayIndex + 1, 'lunch'], minKeeps: 1 };
      }
    }
  }
  return null;
}

// Всё, что нужно экрану меню: порции, калории по дням, стоимость
export function menuDetails(menu, profile) {
  const pool = poolFor(profile);
  const meals = orderedMeals(profile);
  const adapt = (id) => pool[id] || adaptRecipe(findRecipe(id), profile);

  const days = menu.days.map((day, i) => {
    const date = fromISO(day.date);
    const perPerson = profile.people.map((person) => ({ person, kcal: 0, p: 0, f: 0, c: 0 }));

    const slots = meals.filter((m) => day.meals[m]).map((meal) => {
      const slot = day.meals[meal];
      if (!slot.id || !findRecipe(slot.id)) return { meal, slot, x: null };
      const x = adapt(slot.id);
      const people = slotPeople(profile, meal, x);
      people.forEach((pp, k) => {
        perPerson[k].kcal += pp.kcal;
        perPerson[k].p += x.nutrition.p * pp.factor;
        perPerson[k].f += x.nutrition.f * pp.factor;
        perPerson[k].c += x.nutrition.c * pp.factor;
      });
      const portions = people.reduce((s, pp) => s + pp.factor, 0);
      // если готовим на два дня — сразу на обе порции
      let cookPortions = portions;
      const pair = findPair(menu, i, meal);
      if (slot.cookFor2 && pair) {
        const [li, lm] = pair.leftover;
        cookPortions += slotPeople(profile, lm, x).reduce((s, pp) => s + pp.factor, 0);
      }
      return { meal, slot, x, people, portions, cookPortions };
    });

    perPerson.forEach((pp) => {
      pp.kcal = Math.round(pp.kcal);
      pp.p = Math.round(pp.p);
      pp.f = Math.round(pp.f);
      pp.c = Math.round(pp.c);
    });
    return { date, iso: day.date, weekend: isWeekend(date), slots, perPerson };
  });

  return { days, cost: weekCost(menu.days, profile, pool) };
}

// ---------- «Заменить блюдо» ----------

export function replaceSlot(menu, profile, dayIndex, meal) {
  const pool = poolFor(profile);
  const pair = findPair(menu, dayIndex, meal);
  const [ci, cm] = pair ? pair.cook : [dayIndex, meal];
  const current = menu.days[ci].meals[cm].id;
  const limit = timeLimit(profile, fromISO(menu.days[ci].date), cm);

  const usedInWeek = new Set();
  menu.days.forEach((d) => Object.values(d.meals).forEach((s) => s.id && usedInWeek.add(s.id)));

  // сколько раз готовая еда уже есть в меню (не считая заменяемого блюда)
  const readyLimit = (profile.ready && Number(profile.ready.pizzaPerWeek)) || 1;
  let readyCount = 0;
  menu.days.forEach((d, di) => Object.entries(d.meals).forEach(([m, s]) => {
    const isThis = (di === ci && m === cm) || (pair && di === pair.leftover[0] && m === pair.leftover[1]);
    if (!isThis && !s.leftover && s.id && pool[s.id] && pool[s.id].recipe.ready) readyCount++;
  }));

  let options = Object.values(pool).filter((x) =>
    x.recipe.meals.includes(cm) &&
    x.recipe.id !== current &&
    (!pair || x.recipe.keeps >= pair.minKeeps) &&
    (!x.recipe.ready || readyCount < readyLimit));
  if (!options.length) return false;
  const inTime = options.filter((x) => x.recipe.time <= limit);
  if (inTime.length) options = inTime;

  // примерить каждый вариант: сколько будет стоить неделя
  const tryWith = (id) => {
    const days = JSON.parse(JSON.stringify(menu.days));
    days[ci].meals[cm].id = id;
    if (pair) days[pair.leftover[0]].meals[pair.leftover[1]].id = id;
    return { id, days, cost: weekCost(days, profile, pool) };
  };
  const tried = options.map((x) => tryWith(x.recipe.id));
  const budget = profile.budget || Infinity;
  const inBudget = tried.filter((t) => t.cost <= budget);
  const fresh = inBudget.filter((t) => !usedInWeek.has(t.id));

  let pick;
  if (fresh.length) pick = fresh[Math.floor(Math.random() * fresh.length)];
  else if (inBudget.length) pick = inBudget[Math.floor(Math.random() * inBudget.length)];
  else pick = tried.sort((a, b) => a.cost - b.cost)[0];

  menu.days = pick.days;
  return true;
}
