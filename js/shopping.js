/*
  Список покупок по меню.
  Что в какой поход покупать, решает tripNeeds (planner.js) —
  тем же способом считается и бюджет меню, поэтому цифры совпадают.
*/
import { DEPARTMENTS } from './data/products.js';
import { tripNeeds, fromISO, FIRST_TRIP_DAYS } from './planner.js';
import { priceNeeds, priceOf, offerUsed } from './pricing.js';

// Порядок отделов — примерно как идёшь по Lidl. Заморозку берём в самом конце.
const ORDER = ['obst', 'brot', 'fleisch', 'kuehl', 'trocken', 'gewuerze', 'frueh', 'getraenke', 'tk'];

export function buildShopping(menu, profile) {
  const trips = profile.shopsPerWeek === '2' ? 2 : 1;
  const dates = menu.days.map((d) => fromISO(d.date));
  return tripNeeds(menu.days, profile).map((needs, t) => {
    const priced = priceNeeds(needs, profile);
    const toBuy = priced.lines.filter((l) => !l.atHome);
    const atHome = priced.lines.filter((l) => l.atHome).map((l) => l.product);

    const groups = ORDER
      .map((dep) => ({
        dep: DEPARTMENTS.find((d) => d.id === dep),
        lines: toBuy.filter((l) => l.product.dep === dep).sort((a, b) => a.product.de.localeCompare(b.product.de, 'de')),
      }))
      .filter((g) => g.dep && g.lines.length);

    // сколько заплатим на кассе (целыми упаковками)
    const checkout = toBuy.reduce((s, l) => s + l.packs * priceOf(l.product, profile), 0);
    const pfand = toBuy.reduce((s, l) => s + (l.product.pfand || 0) * l.packs, 0);

    const from = t === 0 ? 0 : FIRST_TRIP_DAYS;
    const to = trips === 1 || t === 1 ? dates.length - 1 : FIRST_TRIP_DAYS - 1;
    // budgetPart — сколько из этого засчитано в бюджет недели
    // (крупы, картошка, специи куплены целой пачкой, но остаток пойдёт на следующие недели)
    return { index: t, from: dates[from], to: dates[to], groups, atHome, checkout, budgetPart: priced.total, pfand, count: toBuy.length };
  });
}

// Как показать количество: «2 уп. по 500 г», «6 бут.», «1 уп. (нужно 120 г)»
export function packText(line) {
  const p = line.product;
  const unit = p.unit === 'ml' ? 'мл' : 'г';
  const sizeText = p.size >= 1000 && p.size % 100 === 0
    ? `${(p.size / 1000).toLocaleString('ru-RU')} ${p.unit === 'ml' ? 'л' : 'кг'}`
    : `${p.size} ${unit}`;
  if (p.piece && p.piece === p.size) return `${line.packs} ${p.pieceName}`;
  const need = Math.round(line.grams / 10) * 10 || Math.round(line.grams);
  const base = `${line.packs} уп. по ${sizeText}`;
  return need < p.size * line.packs * 0.8 ? `${base} · нужно ≈ ${need} ${unit}` : base;
}

// Какая акция используется для строки списка (или null)
export function lineSale(line, profile) {
  return offerUsed(line.product, profile);
}

// Текст списка, чтобы отправить в мессенджер
export function shoppingText(trip, checked, profile) {
  const rows = [];
  for (const g of trip.groups) {
    const left = g.lines.filter((l) => !checked[l.product.id]);
    if (!left.length) continue;
    rows.push(`\n${g.dep.de} (${g.dep.ru})`);
    for (const l of left) {
      const offer = profile && offerUsed(l.product, profile);
      rows.push(`☐ ${l.product.de} — ${packText(l)}${offer ? ` (Angebot: ${offer.title}, ${offer.price.toFixed(2)} €)` : ''}`);
    }
  }
  return rows.join('\n').trim();
}
