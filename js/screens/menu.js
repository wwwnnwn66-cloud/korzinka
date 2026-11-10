/*
  Экран «Меню на неделю».
*/
import { getProfile, MEALS } from '../profile.js';
import { loadProfile, loadMenu, saveMenu } from '../storage.js';
import { generateMenu, menuDetails, replaceSlot, nextMonday } from '../planner.js';
import { formatPrice } from '../cookbook.js';
import { drinksPlan, offerUsed } from '../pricing.js';
import { esc, plural, toast } from '../ui.js';

const mealLabel = (id) => (MEALS.find((m) => m.id === id) || { label: id }).label;
const dayFormat = new Intl.DateTimeFormat('ru-RU', { weekday: 'long', day: 'numeric', month: 'long' });
const shortFormat = new Intl.DateTimeFormat('ru-RU', { day: 'numeric', month: 'long' });
const num = (x) => x.toLocaleString('ru-RU', { maximumFractionDigits: 1 });
const capitalize = (s) => s.charAt(0).toUpperCase() + s.slice(1);

let startChoice = 'today';

export function renderMenu(el) {
  if (loadProfile() === null) {
    el.innerHTML = `
      <div class="card">
        <h2>Добро пожаловать!</h2>
        <p>Здесь появится меню на 7 дней в рамках вашего бюджета —
           с калориями, БЖУ и кнопкой «заменить блюдо».</p>
        <p class="muted">Сначала заполните анкету — это займёт пару минут.</p>
      </div>
      <a class="btn btn--block" href="#settings">Заполнить анкету</a>`;
    return;
  }

  const profile = getProfile();
  const menu = loadMenu();

  el.onclick = (e) => {
    const btn = e.target.closest('[data-action]');
    if (!btn) return;
    const action = btn.dataset.action;
    if (action === 'generate') {
      const start = startChoice === 'monday' ? nextMonday() : new Date();
      btn.disabled = true;
      btn.textContent = 'Составляю…';
      // даём экрану обновиться, потом считаем
      setTimeout(() => {
        saveMenu(generateMenu(getProfile(), new Date(start.getFullYear(), start.getMonth(), start.getDate())));
        renderMenu(el);
        window.scrollTo(0, 0);
      }, 30);
    } else if (action === 'regenerate') {
      if (confirm('Составить меню заново? Текущее меню пропадёт.')) {
        saveMenu(null);
        renderMenu(el);
      }
    } else if (action === 'replace') {
      const m = loadMenu();
      const ok = replaceSlot(m, getProfile(), Number(btn.dataset.day), btn.dataset.meal);
      if (ok) {
        saveMenu(m);
        const y = window.scrollY;
        renderMenu(el);
        window.scrollTo(0, y);
        toast('Блюдо заменено');
      } else {
        toast('Других подходящих блюд нет');
      }
    }
  };
  el.oninput = (e) => {
    if (e.target.name === 'start') startChoice = e.target.value;
  };

  if (!menu || !menu.days) {
    drawEmpty(el, profile);
  } else {
    drawMenu(el, profile, menu);
  }
}

function drawEmpty(el, profile) {
  const monday = nextMonday();
  el.innerHTML = `
    <div class="card">
      <h2>Меню на неделю</h2>
      <p>Составлю меню на 7 дней для
        ${profile.people.length} ${plural(profile.people.length, 'человека', 'человек', 'человек')}
        в рамках бюджета ${profile.budget ?? '—'} €.</p>
      <p class="field__label">Начать</p>
      <div class="chips">
        <label class="chip"><input type="radio" name="start" value="today" ${startChoice === 'today' ? 'checked' : ''}>
          <span>С сегодняшнего дня</span></label>
        <label class="chip"><input type="radio" name="start" value="monday" ${startChoice === 'monday' ? 'checked' : ''}>
          <span>С понедельника, ${shortFormat.format(monday)}</span></label>
      </div>
    </div>
    <button type="button" class="btn btn--block" data-action="generate">Составить меню</button>
    <a class="btn btn--ghost btn--block gap-top" href="#settings">Изменить анкету</a>`;
}

function drawMenu(el, profile, menu) {
  const d = menuDetails(menu, profile);
  const budget = profile.budget || 0;
  const over = budget && d.cost > budget;
  const percent = budget ? Math.min(100, Math.round((d.cost / budget) * 100)) : 0;
  const first = d.days[0].date;
  const last = d.days[d.days.length - 1].date;
  const profileChanged = profile.savedAt && profile.savedAt > menu.createdAt;
  const needsKcal = profile.people.some((p) => !p.kcal);

  el.innerHTML = `
    ${profileChanged ? `
      <div class="card notice">
        <p>Анкета изменилась после того, как меню было составлено.</p>
        <button type="button" class="btn btn--ghost btn--block" data-action="regenerate">Составить заново</button>
      </div>` : ''}

    <div class="card">
      <h2>${shortFormat.format(first)} — ${shortFormat.format(last)}</h2>
      <div class="budget">
        <div class="budget__row">
          <span>Покупки на неделю</span>
          <b class="${over ? 'over' : ''}">≈ ${formatPrice(d.cost)}${budget ? ` из ${budget} €` : ''}</b>
        </div>
        ${budget ? `<div class="bar"><span class="${over ? 'over' : ''}" style="width:${percent}%"></span></div>` : ''}
        ${over ? '<p class="warn">Не уложились в бюджет даже в лучшем варианте. Попробуйте «Заменить» у дорогих блюд, увеличьте бюджет или отметьте, что уже есть дома.</p>' : ''}
        <p class="muted small">Цены примерные. Свежие продукты посчитаны целыми упаковками.</p>
      </div>
      ${needsKcal ? '<p class="muted small">Порции обычные. Чтобы подогнать их под каждого, впишите калории в анкете.</p>' : ''}
      ${drinksText(profile)}
    </div>

    ${d.days.map((day, i) => dayCard(day, i, profile)).join('')}

    <button type="button" class="btn btn--ghost btn--block" data-action="regenerate">Составить новое меню</button>
  `;
}

// Строчка про напитки: что покупаем, что ждёт скидки
function drinksText(profile) {
  const plan = drinksPlan(profile).filter((d) => d.mode !== 'no' && d.qty > 0);
  if (!plan.length) return '';
  const parts = plan.map((d) => {
    const name = esc(d.product.ru);
    if (d.active) {
      const offer = offerUsed(d.product, profile);
      return offer
        ? `${name} — ${d.qty} ${d.product.pieceName} <span class="sale">по скидке: ${esc(offer.title)}</span>`
        : `${name} — ${d.qty} ${d.product.pieceName}`;
    }
    return `${name} — <span class="muted">ждём скидку</span>`;
  });
  return `<p class="small drinks">Напитки: ${parts.join('; ')}.</p>`;
}

function dayCard(day, i, profile) {
  return `
    <section class="card day ${day.weekend ? 'day--weekend' : ''}">
      <h2 class="day__title">${capitalize(dayFormat.format(day.date))}</h2>
      <p class="day__kcal">
        ${day.perPerson.map((pp) => `
          <span>${esc(pp.person.name || 'Без имени')}: <b>${pp.kcal.toLocaleString('ru-RU')}</b>${pp.person.kcal ? ` из ${pp.person.kcal.toLocaleString('ru-RU')}` : ''} ккал
            <small>Б ${pp.p} · Ж ${pp.f} · У ${pp.c}</small></span>`).join('')}
      </p>
      ${day.slots.map((s) => slotRow(s, i, profile)).join('')}
    </section>`;
}

function slotRow(s, dayIndex, profile) {
  if (!s.x) {
    return `
      <div class="slot">
        <div class="slot__meal">${mealLabel(s.meal)}</div>
        <p class="warn">Нет подходящих рецептов. Проверьте анкету: посуду, ограничения, время.</p>
      </div>`;
  }
  const r = s.x.recipe;
  const many = profile.people.length > 1;
  // продукты этого блюда, которые сейчас по акции
  const onSale = s.slot.leftover ? [] : s.x.items.filter((it) => offerUsed(it.product, profile)).map((it) => it.product.ru.toLowerCase());
  let note = '';
  if (s.slot.leftover) note = '<span class="tag tag--leftover">Остатки со вчера — разогреть</span>';
  else if (s.slot.cookFor2) note = `<span class="tag tag--double">Готовьте сразу на 2 дня: ${num(s.cookPortions)} порц.</span>`;

  return `
    <div class="slot">
      <div class="slot__meal">${mealLabel(s.meal)}</div>
      <div class="slot__body">
        <a class="slot__name" href="#recipe/${r.id}/${dayIndex}.${s.meal}">${esc(r.name)}</a>
        <p class="meta">
          ${s.slot.leftover ? '<span>⏱ 5 мин</span>' : `<span>⏱ ${r.time} мин</span>`}
          ${many
            ? s.people.map((pp) => `<span>${esc(pp.person.name || '—')}: ${num(pp.factor)} порц. · ${pp.kcal} ккал</span>`).join('')
            : `<span>${num(s.people[0].factor)} порц. · ${s.people[0].kcal} ккал</span>`}
        </p>
        ${note}
        ${onSale.length ? `<span class="tag tag--sale">По акции: ${esc(onSale.join(', '))}</span>` : ''}
        ${!s.x.ok ? '<p class="warn">Больше не подходит под анкету — замените.</p>' : ''}
      </div>
      <button type="button" class="replace" data-action="replace" data-day="${dayIndex}" data-meal="${s.meal}"
              aria-label="Заменить: ${esc(r.name)}" title="Заменить блюдо">↻</button>
    </div>`;
}
