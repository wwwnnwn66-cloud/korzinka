/*
  Акции Lidl.
  Файл data/offers.json раз в неделю обновляет скрипт scripts/fetch_offers.py.
  Одна акция выглядит так:
    { "productId": "cola", "title": "Pepsi Cola", "price": 0.88, "oldPrice": null,
      "unitPrice": 0.7, "unit": "l", "lidlPlus": false,
      "validFrom": "2026-11-08", "validTo": "2026-11-14" }

  Два разных понятия:
  - «выгодная акция» (bestDeal) — акция, после которой упаковка из каталога выходит
    ДЕШЕВЛЕ обычной цены. Только такие снижают стоимость меню.
  - «есть в проспекте» (promoFor) — любая акция на этот товар. Нужна для того,
    что в анкете отмечено «только по скидке» (пицца, кола, энергетики): тогда
    покупаем именно акционный товар по его цене.
*/
let offers = { updated: null, items: [] };

// Загрузить акции при запуске приложения. Без интернета — берётся сохранённая копия.
export async function loadOffers() {
  try {
    const res = await fetch('data/offers.json', { cache: 'no-cache' });
    if (res.ok) offers = await res.json();
  } catch {
    // нет файла или нет сети — работаем без акций
  }
  return offers;
}

export function offersInfo() {
  return offers;
}

// Действующие акции на продукт (закончившиеся отбрасываем)
function current(productId) {
  const today = new Date().toISOString().slice(0, 10);
  return (offers.items || []).filter((o) => o.productId === productId && (!o.validTo || o.validTo >= today));
}

// Цена упаковки из каталога по этой акции.
// Если известна цена за кг / л — пересчитываем на размер упаковки каталога.
export function offerPackPrice(offer, product) {
  if (offer.unitPrice && (offer.unit === 'kg' || offer.unit === 'l')) {
    return Math.round(offer.unitPrice * product.size) / 1000;
  }
  return offer.price;
}

// Цена одной штуки акционного товара (для пиццы и напитков «по скидке»):
// «10 банок за 8,88 €» → 0,89 € за банку
export function offerPiecePrice(offer) {
  return Math.round((offer.price / (offer.count || 1)) * 100) / 100;
}

function cheapest(list, priceFn) {
  if (!list.length) return null;
  return list.reduce((best, o) => (priceFn(o) < priceFn(best) ? o : best));
}

// Выгодная акция: упаковка выходит дешевле обычной цены
export function bestDeal(product) {
  const price = (o) => offerPackPrice(o, product);
  return cheapest(current(product.id).filter((o) => price(o) < product.price), price);
}

// Любая акция из проспекта (для «только по скидке»).
// Напитки сравниваем по цене за литр (банка 0,33 л и бутылка 1,5 л — разные вещи),
// пиццу — по цене за штуку.
export function promoFor(product) {
  return cheapest(current(product.id), (o) => promoPackPrice(o, product));
}

// Сколько стоит «наша» упаковка/штука при покупке акционного товара
export function promoPackPrice(offer, product) {
  if (product.unit === 'ml' && offer.unitPrice && offer.unit === 'l') return offerPackPrice(offer, product);
  return offerPiecePrice(offer);
}

export function isOnSale(productId) {
  return current(productId).length > 0;
}

// Для совместимости: «акция, которую показываем» — выгодная
export function saleFor(productId) {
  const list = current(productId);
  return list.length ? list[0] : null;
}
