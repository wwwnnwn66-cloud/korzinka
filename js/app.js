/*
  Логика «Корзинки»: переключение вкладок.
  Каждый экран живёт в своей функции; большие экраны — в отдельных файлах (папка screens).
*/
import { renderSettings } from './screens/settings.js';
import { renderRecipeList, renderRecipe } from './screens/recipes.js';
import { renderMenu } from './screens/menu.js';
import { loadOffers } from './offers.js';
import { renderShopping } from './screens/shopping.js';

const screens = {
  menu: {
    title: 'Меню на неделю',
    render: renderMenu,
  },

  shopping: {
    title: 'Список покупок',
    render: renderShopping,
  },

  recipes: {
    title: 'Рецепты',
    render: renderRecipeList,
  },

  // один рецепт: адрес вида #recipe/m_plov
  recipe: {
    title: 'Рецепт',
    tab: 'recipes',
    render: renderRecipe,
  },

  settings: {
    title: 'Анкета',
    render: renderSettings,
  },
};

// Показать нужную вкладку. Какая вкладка открыта — видно по адресу (#menu, #shopping…).
function showScreen() {
  // адрес «#recipe/m_plov» → экран «recipe», параметр «m_plov»
  const [name, ...params] = (location.hash.replace('#', '') || 'menu').split('/');
  const screen = screens[name] || screens.menu;
  const route = screen.tab || (screens[name] ? name : 'menu');
  const el = document.getElementById('screen');

  // убрать обработчики нажатий от предыдущего экрана
  el.oninput = el.onchange = el.onclick = el.onkeydown = null;
  screen.render(el, ...params);

  document.getElementById('screen-title').textContent = screen.title;
  document.title = screen.title + ' — Корзинка';

  // Подсветить активную вкладку в нижнем меню
  document.querySelectorAll('.tabbar__item').forEach((link) => {
    if (link.dataset.route === route) link.setAttribute('aria-current', 'page');
    else link.removeAttribute('aria-current');
  });

  window.scrollTo(0, 0);
}

// Сначала загружаем акции (data/offers.json), потом показываем экран
await loadOffers();
window.addEventListener('hashchange', showScreen);
showScreen();

// Подключить «помощника для работы без интернета» (service worker).
// Он работает только когда приложение открыто через сайт (https или localhost).
if ('serviceWorker' in navigator && location.protocol.startsWith('http')) {
  navigator.serviceWorker.register('sw.js');
}
