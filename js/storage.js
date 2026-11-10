/*
  Сохранение в памяти телефона (localStorage).
  Данные хранятся только на этом устройстве и никуда не отправляются.
  try/catch — на случай, если браузер запретил хранение (например, режим инкогнито):
  тогда приложение просто работает без сохранения, а не ломается.
*/
const PROFILE_KEY = 'korzinka.profile.v1';
const MENU_KEY = 'korzinka.menu.v1';

function load(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function save(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
    return true;
  } catch {
    return false;
  }
}

export const loadProfile = () => load(PROFILE_KEY);
export const saveProfile = (profile) => save(PROFILE_KEY, profile);

export const loadMenu = () => load(MENU_KEY);
export const saveMenu = (menu) => save(MENU_KEY, menu);

// Галочки и свои пункты в списке покупок
const SHOP_KEY = 'korzinka.shopping.v1';
export const loadShopping = () => load(SHOP_KEY);
export const saveShopping = (state) => save(SHOP_KEY, state);
