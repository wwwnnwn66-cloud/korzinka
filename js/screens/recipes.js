/*
  Экран «Рецепты»: список подходящих рецептов и карточка одного рецепта.
*/
import { getProfile, MEALS, EQUIPMENT, METHODS } from '../profile.js';
import { cookbook, adaptRecipe, findRecipe, formatAmount, formatPrice } from '../cookbook.js';
import { esc, plural } from '../ui.js';
import { loadMenu } from '../storage.js';
import { menuDetails } from '../planner.js';

// Что выбрано в фильтрах — запоминаем, пока приложение открыто
let mealFilter = 'all';
let search = '';

// ---------- Список ----------

export function renderRecipeList(el) {
  const profile = getProfile();
  const book = cookbook(profile);

  const draw = () => {
    const shown = book.ok.filter((x) =>
      (mealFilter === 'all' || x.recipe.meals.includes(mealFilter)) &&
      x.recipe.name.toLowerCase().includes(search.toLowerCase()));

    el.querySelector('#recipe-results').innerHTML = shown.length
      ? shown.map(recipeCard).join('')
      : '<p class="muted">Ничего не нашлось.</p>';
  };

  const mealTabs = [{ id: 'all', label: 'Все' }, ...MEALS.filter((m) => profile.meals.includes(m.id))];
  const total = book.ok.length + book.hidden.length;

  el.innerHTML = `
    <input class="input search" type="search" id="recipe-search" placeholder="Найти рецепт…" value="${esc(search)}">
    <div class="chips chips--scroll">
      ${mealTabs.map((m) => `
        <label class="chip">
          <input type="radio" name="meal-filter" value="${m.id}" ${mealFilter === m.id ? 'checked' : ''}>
          <span>${m.label}</span>
        </label>`).join('')}
    </div>
    <p class="muted small">Под вашу анкету подходит ${book.ok.length} из ${total} ${plural(total, 'рецепта', 'рецептов', 'рецептов')}.</p>
    <div id="recipe-results"></div>
    ${book.hidden.length ? `
      <details class="card hidden-list">
        <summary>Почему скрыты остальные ${book.hidden.length}</summary>
        <ul class="list small">
          ${book.hidden.map((x) => `<li><b>${esc(x.recipe.name)}</b> — ${esc(x.reasons.join('; '))}</li>`).join('')}
        </ul>
      </details>` : ''}
  `;

  el.oninput = (e) => {
    if (e.target.id === 'recipe-search') { search = e.target.value; draw(); }
    if (e.target.name === 'meal-filter') { mealFilter = e.target.value; draw(); }
  };
  draw();
}

function recipeCard(x) {
  const r = x.recipe;
  return `
    <a class="card recipe-card" href="#recipe/${r.id}">
      <h3>${esc(r.name)}</h3>
      <p class="meta">
        <span>⏱ ${r.time} мин</span>
        <span>${x.nutrition.kcal} ккал</span>
        <span>≈ ${formatPrice(x.price)} / порция</span>
      </p>
    </a>`;
}

// ---------- Один рецепт ----------

/*
  slotKey — если рецепт открыт из меню, например «2.dinner» (день 2, ужин):
  тогда граммовка считается на порции из меню (с учётом калорий каждого человека).
*/
export function renderRecipe(el, id, slotKey) {
  const recipe = findRecipe(id);
  if (!recipe) {
    el.innerHTML = '<p>Рецепт не найден.</p><a class="btn" href="#recipes">К рецептам</a>';
    return;
  }
  const profile = getProfile();
  const x = adaptRecipe(recipe, profile);
  const n = x.nutrition;

  // порции из меню, если пришли оттуда
  let fromMenu = null;
  if (slotKey) {
    const [day, meal] = slotKey.split('.');
    const menu = loadMenu();
    if (menu && menu.days && menu.days[Number(day)]) {
      const s = menuDetails(menu, profile).days[Number(day)].slots.find((t) => t.meal === meal);
      if (s && s.x && s.x.recipe.id === id) fromMenu = s;
    }
  }
  let portions = fromMenu
    ? (fromMenu.slot.cookFor2 ? fromMenu.cookPortions : fromMenu.portions)
    : Math.max(1, profile.people.length);
  const fmt = (v) => v.toLocaleString('ru-RU', { maximumFractionDigits: 1 });

  const draw = () => {
    el.innerHTML = `
      <a class="back" href="${fromMenu ? '#menu' : '#recipes'}">‹ ${fromMenu ? 'К меню' : 'Все рецепты'}</a>
      <h2 class="recipe-title">${esc(recipe.name)}</h2>
      ${!x.ok ? `<p class="warn">Не подходит под анкету: ${esc(x.reasons.join('; '))}</p>` : ''}
      ${fromMenu ? `
        <div class="card notice small">
          По меню: ${fromMenu.people.map((pp) => `${esc(pp.person.name || '—')} — ${fmt(pp.factor)} порц. (${pp.kcal} ккал)`).join(', ')}.
          ${fromMenu.slot.cookFor2 ? '<br>Готовите сразу на 2 дня, граммовка ниже — на оба дня.' : ''}
          ${fromMenu.slot.leftover ? '<br>Это остатки со вчера, готовить не нужно.' : ''}
        </div>` : ''}

      <div class="stats">
        <div><b>${recipe.time}</b><span>мин всего</span></div>
        <div><b>${recipe.active}</b><span>мин у плиты</span></div>
        <div><b>${n.kcal}</b><span>ккал</span></div>
        <div><b>${formatPrice(x.price)}</b><span>порция</span></div>
      </div>
      <p class="muted small macros">На порцию: белки ${n.p} г · жиры ${n.f} г · углеводы ${n.c} г</p>

      <section class="card">
        <div class="portions">
          <h3>Продукты</h3>
          <div class="stepper" role="group" aria-label="Порции">
            <button type="button" data-step="-1" aria-label="Меньше порций">−</button>
            <span>${fmt(portions)} ${Number.isInteger(portions) ? plural(portions, 'порция', 'порции', 'порций') : 'порции'}</span>
            <button type="button" data-step="1" aria-label="Больше порций">+</button>
          </div>
        </div>
        <ul class="ingredients">
          ${x.items.map((it) => `
            <li>
              <div>
                <span>${esc(it.product.ru)}${it.optional ? ' <small class="muted">(по желанию)</small>' : ''}</span>
                <small class="de">${esc(it.product.de)}</small>
                ${it.note ? `<small class="swap">${esc(it.note)}</small>` : ''}
                ${profile.pantry.includes(it.product.id) ? '<small class="muted">есть дома</small>' : ''}
              </div>
              <b>${formatAmount(it.product, it.g * portions)}</b>
            </li>`).join('')}
        </ul>
        ${x.dropped.length ? `<p class="muted small">Убрано по анкете: ${x.dropped.map((p) => esc(p.ru.toLowerCase())).join(', ')}. В шагах ниже просто пропускайте это.</p>` : ''}
      </section>

      <section class="card">
        <h3>Посуда</h3>
        <p>${recipe.equipment.length
          ? recipe.equipment.map((need) => need.split('|').map((id) => labelOf(EQUIPMENT, id)).join(' или ')).join(', ')
          : 'не нужна'}</p>
        <p class="muted small">Способ: ${recipe.methods.map((m) => labelOf(METHODS, m).toLowerCase()).join(', ')}.
          ${recipe.keeps >= 2 ? `Хранится в холодильнике до ${recipe.keeps} дней.` : ''}</p>
      </section>

      <section class="card">
        <h3>Как готовить</h3>
        <ol class="steps">${recipe.steps.map((s) => `<li>${esc(s)}</li>`).join('')}</ol>
      </section>
    `;
  };

  el.onclick = (e) => {
    const b = e.target.closest('[data-step]');
    if (!b) return;
    const step = Number(b.dataset.step);
    // дробные порции из меню при первом нажатии округляются до целых
    const base = Number.isInteger(portions) ? portions : (step > 0 ? Math.floor(portions) : Math.ceil(portions));
    portions = Math.min(12, Math.max(1, base + step));
    draw();
  };
  draw();
}

const labelOf = (list, id) => (list.find((x) => x.id === id) || { label: id }).label;
