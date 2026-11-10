/*
  Анкета: все варианты ответов и ответы «по умолчанию».
  Чтобы добавить новый вариант (например, новую посуду),
  достаточно дописать строчку в нужный список ниже.
  id — короткое имя для программы (латиницей), label — то, что видит человек.
*/
import { loadProfile, saveProfile } from './storage.js';

export const MEALS = [
  { id: 'breakfast', label: 'Завтрак' },
  { id: 'lunch', label: 'Обед' },
  { id: 'dinner', label: 'Ужин' },
  { id: 'snack', label: 'Перекус' },
];

// Ограничения — общие правила питания
export const DIETS = [
  { id: 'lactose_free', label: 'Без лактозы', hint: 'молочка только безлактозная' },
  { id: 'dairy_free', label: 'Совсем без молочного' },
  { id: 'gluten_free', label: 'Без глютена' },
  { id: 'vegetarian', label: 'Вегетарианское', hint: 'без мяса и рыбы' },
  { id: 'vegan', label: 'Веганское' },
  { id: 'no_pork', label: 'Без свинины' },
  { id: 'no_eggs', label: 'Без яиц' },
];

// Стоп-продукты — то, что не едим или не любим (можно дописать своё)
export const STOP_SUGGESTIONS = [
  { id: 'fish', label: 'Рыба и морепродукты' },
  { id: 'canned', label: 'Консервы' },
  { id: 'chickpeas', label: 'Нут' },
  { id: 'beans', label: 'Фасоль' },
  { id: 'lentils', label: 'Чечевица' },
  { id: 'peas', label: 'Горох' },
  { id: 'offal', label: 'Печень и субпродукты' },
  { id: 'nuts', label: 'Орехи' },
  { id: 'mushrooms', label: 'Грибы' },
  { id: 'beef', label: 'Говядина' },
  { id: 'tomatoes', label: 'Помидоры' },
  { id: 'onion', label: 'Лук' },
  { id: 'garlic', label: 'Чеснок' },
  { id: 'cilantro', label: 'Кинза' },
  { id: 'spicy', label: 'Острое' },
];

export const EQUIPMENT = [
  { id: 'frying_pan', label: 'Сковорода' },
  { id: 'frying_pan_lid', label: 'Крышка для сковороды' },
  { id: 'pot_small', label: 'Кастрюля маленькая (до 2 л)' },
  { id: 'pot_large', label: 'Кастрюля большая (от 3 л)' },
  { id: 'pot_lid', label: 'Крышка для кастрюли' },
  { id: 'oven', label: 'Духовка' },
  { id: 'baking_tray', label: 'Противень' },
  { id: 'baking_dish', label: 'Форма для запекания' },
  { id: 'microwave', label: 'Микроволновка' },
  { id: 'blender', label: 'Блендер' },
  { id: 'multicooker', label: 'Мультиварка' },
  { id: 'airfryer', label: 'Аэрогриль' },
];

export const METHODS = [
  { id: 'fry', label: 'Жарить на сковороде' },
  { id: 'boil', label: 'Варить' },
  { id: 'stew', label: 'Тушить' },
  { id: 'bake', label: 'Запекать в духовке' },
  { id: 'raw', label: 'Без готовки', hint: 'салаты, бутерброды' },
];

export const TIME_OPTIONS = [
  { id: '10', label: 'до 10 мин' },
  { id: '15', label: 'до 15 мин' },
  { id: '30', label: 'до 30 мин' },
  { id: '60', label: 'до 1 часа' },
  { id: 'any', label: 'неважно' },
];

export const COOK_TWICE = [
  { id: 'yes', label: 'Да, можно' },
  { id: 'dinner_to_lunch', label: 'Только ужин на завтрашний обед' },
  { id: 'no', label: 'Нет, каждый день новое' },
];

export const SHOPS_PER_WEEK = [
  { id: '1', label: '1 раз в неделю' },
  { id: '2', label: '2 раза в неделю' },
];

// Продукты, которые часто уже есть дома. de — название как в Lidl.
export const PANTRY = [
  { id: 'salt', label: 'Соль', de: 'Salz' },
  { id: 'pepper', label: 'Чёрный перец', de: 'Schwarzer Pfeffer' },
  { id: 'sugar', label: 'Сахар', de: 'Zucker' },
  { id: 'oil', label: 'Растительное масло', de: 'Sonnenblumenöl' },
  { id: 'olive_oil', label: 'Оливковое масло', de: 'Olivenöl' },
  { id: 'flour', label: 'Мука', de: 'Weizenmehl' },
  { id: 'rice', label: 'Рис', de: 'Reis' },
  { id: 'pasta', label: 'Макароны', de: 'Nudeln' },
  { id: 'buckwheat', label: 'Гречка', de: 'Buchweizen' },
  { id: 'oats', label: 'Овсяные хлопья', de: 'Haferflocken' },
  { id: 'paprika_powder', label: 'Паприка молотая', de: 'Paprikapulver' },
  { id: 'garlic_powder', label: 'Чеснок сушёный', de: 'Knoblauchpulver' },
  { id: 'herbs', label: 'Итальянские травы', de: 'Italienische Kräuter' },
  { id: 'curry', label: 'Карри', de: 'Currypulver' },
  { id: 'bay_leaf', label: 'Лавровый лист', de: 'Lorbeerblätter' },
  { id: 'vinegar', label: 'Уксус', de: 'Essig' },
  { id: 'soy_sauce', label: 'Соевый соус', de: 'Sojasauce' },
  { id: 'tomato_paste', label: 'Томатная паста', de: 'Tomatenmark' },
  { id: 'mustard', label: 'Горчица', de: 'Senf' },
  { id: 'honey', label: 'Мёд', de: 'Honig' },
  { id: 'broth', label: 'Бульонные кубики', de: 'Gemüsebrühe' },
  { id: 'baking_powder', label: 'Разрыхлитель', de: 'Backpulver' },
  { id: 'starch', label: 'Крахмал', de: 'Speisestärke' },
];

// Готовая еда и напитки: когда покупать
export const BUY_MODES = [
  { id: 'no', label: 'Не нужно' },
  { id: 'sale', label: 'Только по скидке' },
  { id: 'always', label: 'Всегда' },
];
export const COLA_KINDS = [
  { id: 'regular', label: 'Обычная' },
  { id: 'zero', label: 'Без сахара' },
];
export const WATER_KINDS = [
  { id: 'sparkling', label: 'С газом' },
  { id: 'medium', label: 'Слабогазированная' },
  { id: 'still', label: 'Без газа' },
];

// Для помощника по калориям
export const ACTIVITY = [
  { id: '1.2', label: 'Почти не двигаюсь' },
  { id: '1.375', label: 'Немного: прогулки, 1–3 тренировки' },
  { id: '1.55', label: 'Средне: 3–5 тренировок' },
  { id: '1.725', label: 'Много: спорт почти каждый день' },
];
export const GOALS = [
  { id: 'lose', label: 'Похудеть' },
  { id: 'keep', label: 'Держать вес' },
  { id: 'gain', label: 'Набрать вес' },
];

export function newPerson(name = '') {
  return {
    id: 'p' + Date.now() + Math.floor(Math.random() * 1000),
    name,
    kcal: null, // цель по калориям в день; пусто = обычные порции
    calc: { sex: 'f', age: '', height: '', weight: '', activity: '1.375', goal: 'keep' },
  };
}

// Ответы по умолчанию — для того, кто открыл приложение впервые
export function defaultProfile() {
  return {
    people: [newPerson('Я')],
    meals: ['breakfast', 'lunch', 'dinner'],
    diets: [],
    stop: [],
    stopCustom: [], // свои стоп-продукты, вписанные вручную
    equipment: ['frying_pan', 'pot_small', 'pot_lid', 'oven', 'baking_tray'],
    methods: ['fry', 'boil', 'stew', 'bake', 'raw'],
    time: {
      simple: '30',
      detailed: false,
      weekday: { breakfast: '15', lunch: '30', dinner: '30', snack: '10' },
      weekend: { breakfast: '30', lunch: '60', dinner: '60', snack: '10' },
    },
    cookTwice: 'dinner_to_lunch',
    shopsPerWeek: '1',
    pantry: ['salt', 'pepper', 'sugar', 'oil'],
    budget: 60,
    store: 'lidl',
    postcode: '48341',
    // замороженная пицца: 'no' / 'sale' / 'always'; pizzaLactoseOk — можно, даже если в ней лактоза
    ready: { pizza: 'no', pizzaLactoseOk: false, pizzaPerWeek: 1 },
    // напитки: mode — 'no' / 'sale' / 'always', qty — бутылок (банок) в неделю
    drinks: {
      cola: { mode: 'no', kind: 'regular', qty: 2 },
      water: { mode: 'no', kind: 'sparkling', qty: 6 },
      energy: { mode: 'no', kind: 'regular', qty: 4 },
    },
    savedAt: null, // когда анкету последний раз меняли
  };
}

// Взять анкету из памяти. Если в новой версии приложения появились
// новые вопросы — для них подставятся ответы по умолчанию.
export function getProfile() {
  const def = defaultProfile();
  const saved = loadProfile();
  if (!saved) return def;
  return {
    ...def,
    ...saved,
    time: {
      ...def.time,
      ...saved.time,
      weekday: { ...def.time.weekday, ...(saved.time && saved.time.weekday) },
      weekend: { ...def.time.weekend, ...(saved.time && saved.time.weekend) },
    },
    ready: { ...def.ready, ...saved.ready },
    drinks: Object.fromEntries(Object.keys(def.drinks).map((k) =>
      [k, { ...def.drinks[k], ...(saved.drinks && saved.drinks[k]) }])),
  };
}

export function setProfile(profile) {
  profile.savedAt = Date.now();
  return saveProfile(profile);
}

// Норма калорий по формуле Миффлина — Сан-Жеора (приблизительно)
export function calcKcal({ sex, age, height, weight, activity, goal }) {
  const a = Number(age), h = Number(height), w = Number(weight);
  if (!a || !h || !w) return null;
  const base = 10 * w + 6.25 * h - 5 * a + (sex === 'm' ? 5 : -161);
  const factor = { lose: 0.85, keep: 1, gain: 1.1 }[goal] || 1;
  const kcal = base * Number(activity || 1.375) * factor;
  return Math.round(kcal / 50) * 50; // округляем до 50
}
