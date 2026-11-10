/*
  Service worker — «помощник для работы без интернета».
  При первом открытии он сохраняет файлы приложения в память телефона,
  а потом отдаёт их оттуда, даже если интернета нет.

  ВАЖНО: при каждом обновлении приложения увеличивайте номер версии ниже,
  иначе телефон будет показывать старую версию.
*/
const VERSION = 'korzinka-v7';

const FILES = [
  './',
  './index.html',
  './css/styles.css',
  './js/app.js',
  './js/ui.js',
  './js/storage.js',
  './js/profile.js',
  './js/screens/settings.js',
  './js/screens/recipes.js',
  './js/cookbook.js',
  './js/planner.js',
  './js/pricing.js',
  './js/offers.js',
  './js/shopping.js',
  './js/screens/shopping.js',
  './data/offers.json',
  './js/screens/menu.js',
  './js/data/products.js',
  './js/data/recipes.js',
  './manifest.webmanifest',
  './icons/icon.svg',
  './icons/icon-192.png',
  './icons/icon-512.png',
];

// Установка: сохраняем файлы
self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(VERSION).then((cache) => cache.addAll(FILES)));
  self.skipWaiting();
});

// Активация: удаляем сохранённые файлы старых версий
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((key) => key !== VERSION).map((key) => caches.delete(key)))
    )
  );
  self.clients.claim();
});

// Запросы: сначала пробуем интернет (чтобы были свежие данные),
// если интернета нет — берём из памяти.
self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;
  event.respondWith(
    fetch(event.request)
      .then((response) => {
        const copy = response.clone();
        caches.open(VERSION).then((cache) => cache.put(event.request, copy));
        return response;
      })
      .catch(() => caches.match(event.request, { ignoreSearch: true }))
  );
});
