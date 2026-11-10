/*
  Экран «Список покупок».
  Галочки сохраняются в памяти телефона — список работает и без интернета.
*/
import { getProfile, PANTRY } from '../profile.js';
import { loadMenu, loadShopping, saveShopping, saveProfile } from '../storage.js';
import { buildShopping, packText, lineSale, shoppingText } from '../shopping.js';
import { formatPrice } from '../cookbook.js';
import { priceOf, promoOnly } from '../pricing.js';
import { offersInfo } from '../offers.js';
import { esc, toast } from '../ui.js';

const dateShort = new Intl.DateTimeFormat('ru-RU', { weekday: 'short', day: 'numeric', month: 'short' });
let activeTrip = 0;

// Состояние галочек привязано к конкретному меню: новое меню — чистый список
function loadState(menu) {
  const s = loadShopping();
  if (s && s.menuCreatedAt === menu.createdAt) return s;
  return { menuCreatedAt: menu.createdAt, checked: [{}, {}], extras: [[], []] };
}

export function renderShopping(el) {
  const menu = loadMenu();
  if (!menu || !menu.days) {
    el.innerHTML = `
      <div class="card">
        <h2>Список пока пуст</h2>
        <p>Список покупок собирается из меню на неделю.</p>
      </div>
      <a class="btn btn--block" href="#menu">Составить меню</a>`;
    return;
  }

  const profile = getProfile();
  const trips = buildShopping(menu, profile);
  if (activeTrip >= trips.length) activeTrip = 0;
  const state = loadState(menu);

  const draw = () => {
    const trip = trips[activeTrip];
    const checked = state.checked[activeTrip];
    const extras = state.extras[activeTrip];
    const total = trip.count + extras.length;
    const done = Object.values(checked).filter(Boolean).length + extras.filter((x) => x.done).length;

    el.innerHTML = `
      ${trips.length > 1 ? `
        <div class="trip-tabs" role="tablist">
          ${trips.map((t) => `
            <button type="button" role="tab" data-trip="${t.index}" aria-selected="${t.index === activeTrip}">
              ${t.index + 1}-й поход
              <small>${dateShort.format(t.from)} – ${dateShort.format(t.to)}</small>
            </button>`).join('')}
        </div>` : ''}

      <div class="card shop-summary">
        <div class="budget__row">
          <span>Куплено ${done} из ${total}</span>
          <b>на кассе ≈ ${formatPrice(trip.checkout)}</b>
        </div>
        <div class="bar"><span style="width:${total ? Math.round((done / total) * 100) : 0}%"></span></div>
        <p class="muted small">Цена — целыми упаковками.
          ${trip.checkout - trip.budgetPart > 0.5 ? `В бюджет недели засчитано ≈ ${formatPrice(trip.budgetPart)}: остаток круп, картошки и специй пойдёт на следующие недели.` : ''}
          ${trip.pfand ? `Плюс залог за тару (Pfand) ${formatPrice(trip.pfand)} — вернут.` : ''}</p>
        ${offersInfo().updated
          ? `<p class="muted small">Акции Lidl обновлены ${new Date(offersInfo().updated).toLocaleDateString('ru-RU')}.</p>`
          : '<p class="muted small">Акций пока нет — они появятся после первого запуска скрипта.</p>'}
        <button type="button" class="btn btn--ghost btn--block" data-action="copy">Скопировать список</button>
      </div>

      ${trip.groups.map((g) => `
        <section class="card dep">
          <h2 class="dep__title">${esc(g.dep.de)} <small>${esc(g.dep.ru)}</small></h2>
          <ul class="shop-list">
            ${sortChecked(g.lines, checked).map((l) => lineRow(l, checked[l.product.id], profile)).join('')}
          </ul>
        </section>`).join('')}

      <section class="card dep">
        <h2 class="dep__title">Своё <small>что ещё купить</small></h2>
        <ul class="shop-list">
          ${extras.map((x, i) => `
            <li class="${x.done ? 'is-done' : ''}">
              <label class="shop-item">
                <input type="checkbox" data-extra="${i}" ${x.done ? 'checked' : ''}>
                <span class="shop-item__text"><b>${esc(x.text)}</b></span>
              </label>
              <button type="button" class="chip__x" data-action="remove-extra" data-index="${i}" aria-label="Удалить ${esc(x.text)}">×</button>
            </li>`).join('')}
        </ul>
        <div class="add-row">
          <input class="input" id="extra-input" type="text" placeholder="Например, Toilettenpapier">
          <button type="button" class="btn" data-action="add-extra">Добавить</button>
        </div>
      </section>

      ${trip.atHome.length ? `
        <details class="card">
          <summary class="muted">Проверьте, что дома хватает (${trip.atHome.length})</summary>
          <p class="small">${trip.atHome.map((p) => esc(p.ru)).join(', ')}.</p>
        </details>` : ''}

      ${done ? `<button type="button" class="btn btn--ghost btn--block" data-action="to-pantry">Купленные крупы и специи → «Есть дома»</button>` : ''}
    `;
  };

  const persist = () => saveShopping(state);

  el.onchange = (e) => {
    const t = e.target;
    if (t.dataset.product) {
      state.checked[activeTrip][t.dataset.product] = t.checked;
    } else if (t.dataset.extra !== undefined) {
      state.extras[activeTrip][Number(t.dataset.extra)].done = t.checked;
    } else {
      return;
    }
    persist();
    const y = window.scrollY;
    draw();
    window.scrollTo(0, y);
  };

  el.onclick = async (e) => {
    const tab = e.target.closest('[data-trip]');
    if (tab) {
      activeTrip = Number(tab.dataset.trip);
      draw();
      return;
    }
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'add-extra') addExtra();
    if (action === 'remove-extra') {
      state.extras[activeTrip].splice(Number(btn.dataset.index), 1);
      persist();
      draw();
    }
    if (action === 'copy') {
      const trip = trips[activeTrip];
      let text = shoppingText(trip, state.checked[activeTrip], profile);
      const extra = state.extras[activeTrip].filter((x) => !x.done).map((x) => `☐ ${x.text}`);
      if (extra.length) text += '\n\nСвоё\n' + extra.join('\n');
      try {
        await navigator.clipboard.writeText(text);
        toast('Список скопирован');
      } catch {
        toast('Не получилось скопировать');
      }
    }
    if (action === 'to-pantry') {
      const pantryIds = PANTRY.map((p) => p.id);
      const bought = Object.entries(state.checked[activeTrip])
        .filter(([id, v]) => v && pantryIds.includes(id))
        .map(([id]) => id);
      const p = getProfile();
      const added = bought.filter((id) => !p.pantry.includes(id));
      if (!added.length) {
        toast('Нечего добавлять — это только для круп, масла и специй');
        return;
      }
      p.pantry.push(...added);
      p.savedAt = Date.now();
      saveProfile(p);
      toast(`Добавлено в «Есть дома»: ${added.length}`);
    }
  };

  el.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.id === 'extra-input') {
      e.preventDefault();
      addExtra();
    }
  };

  function addExtra() {
    const input = document.getElementById('extra-input');
    const text = input.value.trim();
    if (!text) return;
    state.extras[activeTrip].push({ text, done: false });
    persist();
    draw();
    document.getElementById('extra-input').focus();
  }

  draw();
}

// Купленное — вниз группы
function sortChecked(lines, checked) {
  return [...lines].sort((a, b) => Number(!!checked[a.product.id]) - Number(!!checked[b.product.id]));
}

const dm = (iso) => iso ? iso.slice(8, 10) + '.' + iso.slice(5, 7) : '';

function lineRow(l, isChecked, profile) {
  const offer = lineSale(l, profile);
  const pack = priceOf(l.product, profile);
  // «только по скидке»: покупаем сам акционный товар — его и пишем крупно
  const promo = offer && promoOnly(l.product, profile);
  const amount = promo && l.product.unit === 'ml'
    ? `нужно ≈ ${(l.grams / 1000).toLocaleString('ru-RU', { maximumFractionDigits: 1 })} л`
    : packText(l);
  return `
    <li class="${isChecked ? 'is-done' : ''}">
      <label class="shop-item">
        <input type="checkbox" data-product="${l.product.id}" ${isChecked ? 'checked' : ''}>
        <span class="shop-item__text">
          <b>${esc(promo ? offer.title : l.product.de)}</b>
          <small>${esc(l.product.ru)} · ${amount}</small>
          ${offer ? `<small class="offer">Акция: ${promo ? '' : esc(offer.title) + ' — '}${formatPrice(offer.price)}${offer.count > 1 ? ` за ${offer.count} шт.` : ''}
            · ${dm(offer.validFrom)}–${dm(offer.validTo)}${offer.lidlPlus ? ' · только с Lidl Plus' : ''}</small>` : ''}
        </span>
      </label>
      <span class="shop-item__price">
        <span class="${offer ? 'sale' : ''}">${formatPrice(pack * l.packs)}</span>
        ${offer && !promo ? `<s class="muted">${formatPrice(l.product.price * l.packs)}</s>` : ''}
      </span>
    </li>`;
}
