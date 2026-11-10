/*
  Экран «Анкета».
  Все ответы сохраняются сами сразу после изменения — кнопки «Сохранить» нет.
*/
import {
  MEALS, DIETS, STOP_SUGGESTIONS, EQUIPMENT, METHODS, TIME_OPTIONS, COOK_TWICE,
  SHOPS_PER_WEEK, PANTRY, ACTIVITY, GOALS, BUY_MODES, COLA_KINDS, WATER_KINDS,
  getProfile, setProfile, newPerson, calcKcal,
} from '../profile.js';
import { esc, toast } from '../ui.js';

let state; // текущие ответы
let el;    // область экрана

export function renderSettings(container) {
  el = container;
  state = getProfile();
  draw();
  el.oninput = onInput;
  el.onchange = onInput;
  el.onclick = onClick;
  el.onkeydown = (e) => {
    if (e.key === 'Enter' && e.target.id === 'stop-input') {
      e.preventDefault();
      addCustomStop();
    }
  };
}

// ---------- Отрисовка ----------

function draw() {
  el.innerHTML = `
    <p class="muted intro">Всё сохраняется само. Ответы хранятся только на этом телефоне.</p>

    ${section('1', 'Кто ест', `
      ${state.people.map(personCard).join('')}
      <button type="button" class="btn btn--ghost btn--block" data-action="add-person">+ Добавить человека</button>
    `)}

    ${section('2', 'Бюджет и магазин', `
      <label class="field">
        <span class="field__label">Бюджет на неделю, €</span>
        <input class="input" type="number" inputmode="decimal" min="0" step="5"
               data-path="budget" value="${esc(state.budget ?? '')}">
      </label>
      <p class="field__label">Как часто хожу в магазин</p>
      ${radios('shopsPerWeek', SHOPS_PER_WEEK, state.shopsPerWeek)}
      <div class="row">
        <label class="field">
          <span class="field__label">Магазин</span>
          <select class="input" data-path="store"><option value="lidl">Lidl</option></select>
        </label>
        <label class="field">
          <span class="field__label">Почтовый индекс (для акций)</span>
          <input class="input" type="text" inputmode="numeric" maxlength="5" pattern="[0-9]{5}"
                 placeholder="например 48341" data-path="postcode" value="${esc(state.postcode)}">
        </label>
      </div>
    `)}

    ${section('3', 'Приёмы пищи', `
      ${chips('meals', MEALS)}
      ${state.meals.length === 0 ? '<p class="warn">Выберите хотя бы один приём пищи.</p>' : ''}
    `)}

    ${section('4', 'Ограничения и стоп-продукты', `
      <p class="field__label">Ограничения</p>
      ${chips('diets', DIETS)}
      <p class="field__label">Не едим / не любим</p>
      ${chips('stop', STOP_SUGGESTIONS)}
      ${state.stopCustom.length ? `
        <div class="chips">
          ${state.stopCustom.map((name, i) => `
            <span class="chip chip--on chip--custom">${esc(name)}
              <button type="button" class="chip__x" data-action="remove-stop" data-index="${i}"
                      aria-label="Убрать ${esc(name)}">×</button>
            </span>`).join('')}
        </div>` : ''}
      <div class="add-row">
        <input class="input" id="stop-input" type="text" placeholder="Свой продукт, например «кабачки»">
        <button type="button" class="btn" data-action="add-stop">Добавить</button>
      </div>
    `)}

    ${section('5', 'Моя кухня', `
      <p class="field__label">Посуда и техника</p>
      ${chips('equipment', EQUIPMENT)}
      <p class="field__label">Как хочу готовить</p>
      ${chips('methods', METHODS)}
    `)}

    ${section('6', 'Сколько времени есть на готовку', `
      ${radios('time.simple', TIME_OPTIONS, state.time.simple)}
      <label class="switch">
        <input type="checkbox" id="time-detailed" ${state.time.detailed ? 'checked' : ''}>
        <span>Настроить подробнее (будни / выходные)</span>
      </label>
      <div id="time-detail" ${state.time.detailed ? '' : 'hidden'}>${timeTable()}</div>
    `)}

    ${section('7', 'Готовить на два дня?', `
      <p class="muted small">Например, суп на понедельник и вторник — экономит время и деньги.</p>
      ${radios('cookTwice', COOK_TWICE, state.cookTwice)}
    `)}

    ${section('8', 'Что уже есть дома', `
      <p class="muted small">Отмеченное не попадёт в список покупок и не тратит бюджет.</p>
      ${chips('pantry', PANTRY)}
    `)}

    ${section('9', 'Готовая еда и напитки', `
      <p class="muted small">«Только по скидке» — появится в меню и списке покупок, только когда в Lidl акция.</p>

      <p class="field__label"><b>Замороженная пицца</b> (на ужин или обед)</p>
      ${radios('ready.pizza', BUY_MODES, state.ready.pizza)}
      <div class="row">
        <label class="field">
          <span class="field__label">Не чаще, раз в неделю</span>
          ${select('ready.pizzaPerWeek', [1, 2, 3].map((n) => ({ id: n, label: String(n) })), state.ready.pizzaPerWeek, 'data-number')}
        </label>
      </div>
      <label class="switch">
        <input type="checkbox" data-path="ready.pizzaLactoseOk" ${state.ready.pizzaLactoseOk ? 'checked' : ''}>
        <span>Можно, даже если в пицце есть лактоза</span>
      </label>

      ${drinkBlock('cola', 'Кола', 'бутылок по 1,5 л', COLA_KINDS)}
      ${drinkBlock('water', 'Минеральная вода', 'бутылок по 1,5 л', WATER_KINDS)}
      ${drinkBlock('energy', 'Энергетики', 'банок по 0,25 л', null)}
      <p class="muted small">За бутылки и банки в Германии берут залог (Pfand) 0,25 €. Его возвращают, когда сдаёте тару, поэтому в бюджет он не входит.</p>
    `)}

    <a class="btn btn--block" href="#menu" data-action="done">Готово</a>
  `;
}

function section(num, title, body) {
  return `
    <section class="card">
      <h2><span class="num">${num}</span>${title}</h2>
      ${body}
    </section>`;
}

// Кнопки-«таблетки», можно выбрать несколько
function chips(list, options) {
  return `<div class="chips">${options.map((o) => `
    <label class="chip">
      <input type="checkbox" data-list="${list}" value="${o.id}" ${state[list].includes(o.id) ? 'checked' : ''}>
      <span>${o.label}${o.hint ? ` <small>· ${o.hint}</small>` : ''}</span>
    </label>`).join('')}</div>`;
}

// Кнопки-«таблетки», можно выбрать только одну
function radios(path, options, current) {
  return `<div class="chips">${options.map((o) => `
    <label class="chip">
      <input type="radio" name="${path}" data-path="${path}" value="${o.id}" ${current === o.id ? 'checked' : ''}>
      <span>${o.label}</span>
    </label>`).join('')}</div>`;
}

function select(path, options, current, attrs = '') {
  return `<select class="input" data-path="${path}" ${attrs}>${options.map((o) =>
    `<option value="${o.id}" ${String(current) === String(o.id) ? 'selected' : ''}>${o.label}</option>`).join('')}</select>`;
}

function drinkBlock(key, title, unitText, kinds) {
  const d = state.drinks[key];
  return `
    <div class="drink">
      <p class="field__label"><b>${title}</b></p>
      ${radios(`drinks.${key}.mode`, BUY_MODES, d.mode)}
      <div class="row">
        ${kinds ? `
          <label class="field">
            <span class="field__label">Какая</span>
            ${select(`drinks.${key}.kind`, kinds, d.kind)}
          </label>` : ''}
        <label class="field ${kinds ? 'field--small' : ''}">
          <span class="field__label">Сколько ${unitText} в неделю</span>
          <input class="input" type="number" inputmode="numeric" min="0" max="50"
                 data-path="drinks.${key}.qty" value="${esc(d.qty)}">
        </label>
      </div>
    </div>`;
}

function timeTable() {
  const meals = MEALS.filter((m) => state.meals.includes(m.id));
  if (!meals.length) return '<p class="muted small">Сначала выберите приёмы пищи.</p>';
  return `
    <table class="time-table">
      <thead><tr><th></th><th>Будни</th><th>Выходные</th></tr></thead>
      <tbody>
        ${meals.map((m) => `
          <tr>
            <th scope="row">${m.label}</th>
            <td>${select(`time.weekday.${m.id}`, TIME_OPTIONS, state.time.weekday[m.id], `aria-label="${m.label}, будни"`)}</td>
            <td>${select(`time.weekend.${m.id}`, TIME_OPTIONS, state.time.weekend[m.id], `aria-label="${m.label}, выходные"`)}</td>
          </tr>`).join('')}
      </tbody>
    </table>`;
}

function personCard(p, i) {
  const c = p.calc;
  return `
    <div class="person">
      <div class="row">
        <label class="field">
          <span class="field__label">Имя</span>
          <input class="input" type="text" data-person="${i}" data-field="name" value="${esc(p.name)}" placeholder="Например, Аня">
        </label>
        <label class="field field--small">
          <span class="field__label">Ккал в день</span>
          <input class="input" type="number" inputmode="numeric" min="800" max="6000" step="50"
                 data-person="${i}" data-field="kcal" value="${p.kcal ?? ''}" placeholder="не знаю">
        </label>
      </div>
      <details class="calc">
        <summary>Не знаю свою норму — посчитать</summary>
        <div class="row">
          <label class="field"><span class="field__label">Пол</span>
            <select class="input" data-person="${i}" data-field="calc.sex">
              <option value="f" ${c.sex === 'f' ? 'selected' : ''}>Женский</option>
              <option value="m" ${c.sex === 'm' ? 'selected' : ''}>Мужской</option>
            </select></label>
          <label class="field"><span class="field__label">Возраст</span>
            <input class="input" type="number" inputmode="numeric" data-person="${i}" data-field="calc.age" value="${esc(c.age)}"></label>
        </div>
        <div class="row">
          <label class="field"><span class="field__label">Рост, см</span>
            <input class="input" type="number" inputmode="numeric" data-person="${i}" data-field="calc.height" value="${esc(c.height)}"></label>
          <label class="field"><span class="field__label">Вес, кг</span>
            <input class="input" type="number" inputmode="decimal" data-person="${i}" data-field="calc.weight" value="${esc(c.weight)}"></label>
        </div>
        <label class="field"><span class="field__label">Активность</span>
          <select class="input" data-person="${i}" data-field="calc.activity">
            ${ACTIVITY.map((o) => `<option value="${o.id}" ${c.activity === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select></label>
        <label class="field"><span class="field__label">Цель</span>
          <select class="input" data-person="${i}" data-field="calc.goal">
            ${GOALS.map((o) => `<option value="${o.id}" ${c.goal === o.id ? 'selected' : ''}>${o.label}</option>`).join('')}
          </select></label>
        <button type="button" class="btn btn--block" data-action="calc" data-person="${i}">Посчитать</button>
        <p class="muted small" data-calc-result="${i}">Расчёт приблизительный. Если цель связана со здоровьем, лучше уточнить у врача.</p>
      </details>
      ${state.people.length > 1
        ? `<button type="button" class="link-danger" data-action="remove-person" data-person="${i}">Убрать ${esc(p.name || 'человека')}</button>`
        : ''}
    </div>`;
}

// ---------- Реакция на действия ----------

function onInput(e) {
  const t = e.target;

  if (t.dataset.list) {
    // галочка в списке: добавить или убрать
    const list = state[t.dataset.list];
    const has = list.includes(t.value);
    if (t.checked && !has) list.push(t.value);
    if (!t.checked && has) list.splice(list.indexOf(t.value), 1);
    if (t.dataset.list === 'meals') redrawTimeTable();
  } else if (t.dataset.person !== undefined && t.dataset.field) {
    const p = state.people[Number(t.dataset.person)];
    const field = t.dataset.field;
    if (field.startsWith('calc.')) p.calc[field.slice(5)] = t.value;
    else if (field === 'kcal') p.kcal = t.value === '' ? null : Number(t.value);
    else p[field] = t.value;
  } else if (t.dataset.path) {
    if (t.type === 'radio' && !t.checked) return;
    let value = t.value;
    if (t.type === 'checkbox') value = t.checked;
    else if (t.type === 'number' || t.hasAttribute('data-number')) value = t.value === '' ? null : Number(t.value);
    setPath(state, t.dataset.path, value);
  } else if (t.id === 'time-detailed') {
    state.time.detailed = t.checked;
    document.getElementById('time-detail').hidden = !t.checked;
  } else {
    return;
  }
  save();
}

function onClick(e) {
  const btn = e.target.closest('[data-action]');
  if (!btn) return;
  const action = btn.dataset.action;

  if (action === 'add-person') {
    state.people.push(newPerson(''));
    save();
    draw();
    const inputs = el.querySelectorAll('[data-field="name"]');
    inputs[inputs.length - 1].focus();
  } else if (action === 'remove-person') {
    state.people.splice(Number(btn.dataset.person), 1);
    save();
    draw();
  } else if (action === 'add-stop') {
    addCustomStop();
  } else if (action === 'remove-stop') {
    state.stopCustom.splice(Number(btn.dataset.index), 1);
    save();
    draw();
  } else if (action === 'calc') {
    const i = Number(btn.dataset.person);
    const kcal = calcKcal(state.people[i].calc);
    const note = el.querySelector(`[data-calc-result="${i}"]`);
    if (!kcal) {
      note.textContent = 'Заполните возраст, рост и вес.';
      return;
    }
    state.people[i].kcal = kcal;
    el.querySelector(`[data-person="${i}"][data-field="kcal"]`).value = kcal;
    note.textContent = `Примерно ${kcal} ккал в день — вписано в поле выше, можно поправить.`;
    save();
  }
}

function addCustomStop() {
  const input = document.getElementById('stop-input');
  const name = input.value.trim();
  if (!name) return;
  if (!state.stopCustom.some((s) => s.toLowerCase() === name.toLowerCase())) {
    state.stopCustom.push(name);
    save();
  }
  draw();
  document.getElementById('stop-input').focus();
}

function redrawTimeTable() {
  document.getElementById('time-detail').innerHTML = timeTable();
}

// Записать значение по «адресу» вида "time.weekday.lunch"
function setPath(obj, path, value) {
  const keys = path.split('.');
  const last = keys.pop();
  keys.reduce((o, k) => o[k], obj)[last] = value;
}

let saveTimer;
function save() {
  const ok = setProfile(state);
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => toast(ok ? 'Сохранено ✓' : 'Не удалось сохранить на этом устройстве'), 400);
}
