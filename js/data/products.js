/*
  Каталог продуктов.
  Цены — ПРИМЕРНЫЕ обычные цены Lidl (Германия) и нужны для подсчёта бюджета.
  Акции из скрипта (шаг 6) будут их уточнять.

  Колонки в каждой строке p(...):
    id      — короткое имя для программы
    ru      — название по-русски
    de      — название на ценнике в Lidl
    dep     — отдел магазина (список DEPARTMENTS ниже)
    size    — размер упаковки в граммах (или мл)
    price   — цена упаковки, €
    n       — на 100 г: [ккал, белки, жиры, углеводы]
    tags    — метки для фильтров анкеты (молочное, глютен, мясо, стоп-продукты…)
    extra   — дополнительно:
              unit: 'ml'          — показывать в миллилитрах
              piece: 60           — вес одной штуки (яйцо ≈ 60 г), pieceName — как называть штуку
              alt: { lf, df }     — замена: lf — безлактозная, df — без молочного вообще
              soft: true          — «для вкуса»: если продукт в стоп-списке, его просто
                                    уберут из рецепта, а блюдо останется (лук, чеснок, зелень)
              pfand: 0.25         — залог за бутылку/банку (вернут при сдаче тары)
    Метка 'ready' — готовая еда (замороженная пицца): для неё в анкете можно
    разрешить лактозу.
*/

export const DEPARTMENTS = [
  { id: 'obst', ru: 'Овощи и фрукты', de: 'Obst & Gemüse' },
  { id: 'brot', ru: 'Хлеб и выпечка', de: 'Brot & Backwaren' },
  { id: 'kuehl', ru: 'Молочное и яйца', de: 'Kühlregal' },
  { id: 'fleisch', ru: 'Мясо и колбасы', de: 'Fleisch & Wurst' },
  { id: 'tk', ru: 'Заморозка', de: 'Tiefkühl' },
  { id: 'trocken', ru: 'Крупы, макароны, бакалея', de: 'Nudeln, Reis & Konserven' },
  { id: 'gewuerze', ru: 'Масло, специи, соусы', de: 'Öl, Gewürze & Saucen' },
  { id: 'frueh', ru: 'Для завтрака и сладкое', de: 'Frühstück & Süßes' },
  { id: 'getraenke', ru: 'Напитки', de: 'Getränke' },
];

const list = [];
function p(id, ru, de, dep, size, price, n, tags = [], extra = {}) {
  list.push({ id, ru, de, dep, size, price, n, tags, ...extra });
}
const SPICE = [0, 0, 0, 0]; // специи в таких малых количествах калорий почти не дают

// ---------- Молочное и яйца ----------
p('milk', 'Молоко 1,5%', 'Fettarme H-Milch 1,5 %', 'kuehl', 1000, 1.05, [47, 3.4, 1.5, 4.9], ['dairy', 'lactose'], { unit: 'ml', alt: { lf: 'milk_lf', df: 'oat_drink' } });
p('milk_lf', 'Безлактозное молоко 1,5%', 'Laktosefreie H-Milch 1,5 %', 'kuehl', 1000, 1.29, [47, 3.4, 1.5, 4.8], ['dairy'], { unit: 'ml', alt: { df: 'oat_drink' } });
p('oat_drink', 'Овсяное молоко', 'Haferdrink', 'kuehl', 1000, 0.95, [46, 1, 1.5, 6.7], [], { unit: 'ml' });
p('yogurt', 'Натуральный йогурт 3,5%', 'Naturjoghurt 3,5 %', 'kuehl', 500, 0.79, [64, 3.5, 3.5, 4.5], ['dairy', 'lactose'], { alt: { lf: 'yogurt_lf', df: 'soy_yogurt' } });
p('yogurt_lf', 'Безлактозный йогурт 3,5%', 'Laktosefreier Naturjoghurt 3,5 %', 'kuehl', 500, 1.19, [64, 3.5, 3.5, 4.4], ['dairy'], { alt: { df: 'soy_yogurt' } });
p('soy_yogurt', 'Соевый йогурт', 'Soja-Joghurtalternative', 'kuehl', 500, 1.19, [50, 4, 2.3, 2.4]);
p('quark', 'Творог обезжиренный', 'Magerquark', 'kuehl', 500, 1.19, [67, 12, 0.2, 4], ['dairy', 'lactose'], { alt: { lf: 'quark_lf' } });
p('quark_lf', 'Безлактозный творог', 'Laktosefreier Speisequark', 'kuehl', 250, 1.09, [70, 12, 0.3, 4.3], ['dairy']);
p('cream', 'Сливки 30%', 'Schlagsahne 30 %', 'kuehl', 200, 0.89, [292, 2.4, 30, 3.2], ['dairy', 'lactose'], { unit: 'ml', alt: { lf: 'cream_lf', df: 'oat_cream' } });
p('cream_lf', 'Безлактозные сливки 30%', 'Laktosefreie Schlagsahne', 'kuehl', 200, 1.19, [292, 2.4, 30, 3.1], ['dairy'], { unit: 'ml', alt: { df: 'oat_cream' } });
p('oat_cream', 'Овсяные сливки для готовки', 'Hafer Kochcreme', 'kuehl', 200, 0.99, [150, 1, 14, 6], [], { unit: 'ml' });
p('sour_cream', 'Сметана (Schmand 24%)', 'Schmand 24 %', 'kuehl', 200, 0.79, [240, 2.6, 24, 3.5], ['dairy', 'lactose'], { alt: { lf: 'sour_cream_lf', df: 'oat_cream' } });
p('sour_cream_lf', 'Безлактозная сметана', 'Laktosefreier Schmand', 'kuehl', 200, 1.19, [240, 2.6, 24, 3.4], ['dairy'], { alt: { df: 'oat_cream' } });
p('butter', 'Сливочное масло', 'Deutsche Markenbutter', 'kuehl', 250, 2.19, [741, 0.7, 82, 0.6], ['dairy', 'lactose'], { alt: { lf: 'butter_lf', df: 'margarine' } });
p('butter_lf', 'Безлактозное сливочное масло', 'Laktosefreie Butter', 'kuehl', 250, 2.69, [741, 0.7, 82, 0.5], ['dairy'], { alt: { df: 'margarine' } });
p('margarine', 'Растительный маргарин', 'Pflanzenmargarine', 'kuehl', 500, 1.49, [720, 0, 80, 0]);
p('gouda', 'Сыр гауда тёртый', 'Gouda gerieben', 'kuehl', 250, 1.89, [356, 24, 27, 0], ['dairy', 'lactose'], { alt: { lf: 'gouda_lf' } });
p('gouda_lf', 'Безлактозный сыр гауда', 'Laktosefreier Gouda, Scheiben', 'kuehl', 150, 1.69, [350, 25, 27, 0], ['dairy']);
p('mozzarella', 'Моцарелла', 'Mozzarella', 'kuehl', 125, 0.69, [250, 18, 19, 1], ['dairy', 'lactose'], { alt: { lf: 'mozz_lf' } });
p('mozz_lf', 'Безлактозная моцарелла', 'Laktosefreie Mozzarella', 'kuehl', 125, 0.99, [250, 18, 19, 1], ['dairy']);
p('eggs', 'Яйца', 'Freilandeier, Größe M (10 Stück)', 'kuehl', 600, 2.79, [137, 12.5, 9.3, 0.7], ['egg'], { piece: 60, pieceName: 'шт' });

// ---------- Мясо ----------
p('chicken_breast', 'Куриное филе', 'Hähnchenbrustfilet', 'fleisch', 600, 5.99, [110, 23, 1.5, 0], ['meat']);
p('chicken_thigh', 'Филе куриного бедра', 'Hähnchen-Oberschenkelfilet', 'fleisch', 600, 5.49, [160, 19, 9, 0], ['meat']);
p('turkey', 'Филе индейки (шницель)', 'Putenschnitzel', 'fleisch', 500, 5.49, [105, 24, 1, 0], ['meat']);
p('minced_mixed', 'Фарш свино-говяжий', 'Hackfleisch gemischt (Rind & Schwein)', 'fleisch', 500, 3.99, [250, 18, 20, 0], ['meat', 'pork', 'beef']);
p('minced_beef', 'Говяжий фарш', 'Rinderhackfleisch', 'fleisch', 500, 4.99, [210, 20, 14, 0], ['meat', 'beef']);
p('pork_schnitzel', 'Свиной шницель', 'Schweineschnitzel', 'fleisch', 500, 4.49, [110, 22, 2, 0], ['meat', 'pork']);
p('bacon', 'Бекон кубиками', 'Speckwürfel', 'fleisch', 200, 1.49, [260, 16, 22, 0], ['meat', 'pork']);
p('ham', 'Варёная ветчина', 'Kochschinken, Scheiben', 'fleisch', 200, 1.69, [110, 19, 3, 1], ['meat', 'pork']);

// ---------- Рыба, бобовые, консервы (для тех, кто это ест) ----------
p('salmon', 'Филе лосося (замороженное)', 'Lachsfilet, tiefgefroren', 'tk', 250, 4.49, [200, 20, 13, 0], ['fish']);
p('tuna', 'Тунец в собственном соку', 'Thunfisch Naturale (Dose)', 'trocken', 150, 1.29, [110, 25, 1, 0], ['fish', 'canned']);
p('chickpeas', 'Нут (консервированный)', 'Kichererbsen (Dose)', 'trocken', 240, 0.79, [120, 7, 2.5, 16], ['chickpeas', 'canned']);
p('kidney_beans', 'Красная фасоль (консервированная)', 'Kidneybohnen (Dose)', 'trocken', 250, 0.79, [100, 7, 0.5, 14], ['beans', 'canned']);
p('lentils', 'Красная чечевица', 'Rote Linsen', 'trocken', 500, 1.49, [340, 24, 1.5, 50], ['lentils']);
p('canned_tomatoes', 'Помидоры в собственном соку (банка)', 'Gehackte Tomaten (Dose)', 'trocken', 400, 0.59, [20, 1, 0.2, 3.5], ['tomatoes', 'canned']);
p('coconut_milk', 'Кокосовое молоко', 'Kokosmilch (Dose)', 'trocken', 400, 1.29, [180, 1.7, 18, 3], ['canned'], { unit: 'ml' });
p('walnuts', 'Грецкие орехи', 'Walnusskerne', 'frueh', 200, 2.49, [654, 15, 65, 7], ['nuts']);

// ---------- Овощи и фрукты ----------
p('potato', 'Картофель', 'Kartoffeln, festkochend', 'obst', 2500, 2.49, [72, 2, 0.1, 15]);
p('onion', 'Лук репчатый', 'Zwiebeln', 'obst', 1000, 1.19, [40, 1.2, 0.1, 8], ['onion'], { piece: 80, pieceName: 'шт', soft: true });
p('garlic', 'Чеснок', 'Knoblauch', 'obst', 150, 0.99, [140, 6, 0.5, 28], ['garlic'], { piece: 5, pieceName: 'зубч.', soft: true });
p('carrot', 'Морковь', 'Karotten', 'obst', 1000, 0.99, [36, 1, 0.2, 7], [], { piece: 100, pieceName: 'шт' });
p('bell_pepper', 'Сладкий перец', 'Paprika Mix', 'obst', 500, 1.79, [30, 1, 0.3, 6], [], { piece: 150, pieceName: 'шт' });
p('zucchini', 'Кабачок (цукини)', 'Zucchini', 'obst', 500, 1.19, [20, 1.5, 0.4, 2], [], { piece: 250, pieceName: 'шт' });
p('broccoli', 'Брокколи', 'Brokkoli', 'obst', 500, 1.49, [35, 3, 0.4, 4]);
p('pumpkin', 'Тыква хоккайдо', 'Hokkaido-Kürbis', 'obst', 1000, 1.99, [40, 1.7, 0.6, 8]);
p('cucumber', 'Огурец', 'Salatgurke', 'obst', 400, 0.69, [15, 0.6, 0.1, 2.2]);
p('tomato', 'Помидоры', 'Rispentomaten', 'obst', 500, 1.49, [18, 1, 0.2, 3], ['tomatoes'], { piece: 100, pieceName: 'шт' });
p('cabbage', 'Белокочанная капуста', 'Weißkohl', 'obst', 1000, 1.19, [25, 1.3, 0.2, 4.5]);
p('mushrooms', 'Шампиньоны', 'Champignons, weiß', 'obst', 400, 1.49, [22, 3, 0.3, 0.6], ['mushrooms']);
p('lettuce', 'Салат айсберг', 'Eisbergsalat', 'obst', 500, 0.99, [14, 1, 0.2, 2]);
p('green_onion', 'Зелёный лук', 'Frühlingszwiebeln', 'obst', 100, 0.59, [30, 1.8, 0.2, 5], ['onion'], { soft: true });
p('parsley', 'Петрушка', 'Petersilie, Bund', 'obst', 40, 0.79, [36, 3, 0.8, 6], [], { soft: true });
p('lemon', 'Лимон', 'Zitronen', 'obst', 500, 1.29, [30, 0.7, 0.3, 3], [], { piece: 100, pieceName: 'шт' });
p('banana', 'Бананы', 'Bananen', 'obst', 1000, 1.39, [89, 1.1, 0.3, 22], [], { piece: 120, pieceName: 'шт' });
p('apple', 'Яблоки', 'Äpfel', 'obst', 1000, 1.99, [52, 0.3, 0.2, 12], [], { piece: 150, pieceName: 'шт' });

// ---------- Заморозка ----------
p('berries', 'Ягоды замороженные', 'Beerenmischung, tiefgefroren', 'tk', 500, 2.29, [45, 1, 0.3, 9]);
p('spinach', 'Шпинат замороженный', 'Blattspinat, tiefgefroren', 'tk', 750, 1.29, [20, 2.5, 0.3, 1]);
p('veg_mix', 'Овощная смесь замороженная', 'Gemüsemischung, tiefgefroren', 'tk', 750, 1.49, [40, 2, 0.4, 6]);
p('peas', 'Зелёный горошек замороженный', 'Erbsen, tiefgefroren', 'tk', 750, 1.29, [80, 5.4, 0.4, 12], ['peas']);
p('frozen_pizza', 'Замороженная пицца «Маргарита»', 'Trattoria Alfredo Steinofenpizza Margherita', 'tk', 350, 1.99, [235, 10, 9, 28], ['dairy', 'lactose', 'gluten', 'ready'], { piece: 350, pieceName: 'шт' });

// ---------- Напитки ----------
p('cola', 'Кола', 'Freeway Cola 1,5 l', 'getraenke', 1500, 0.59, [42, 0, 0, 10.6], [], { unit: 'ml', piece: 1500, pieceName: 'бут.', pfand: 0.25 });
p('cola_zero', 'Кола без сахара', 'Freeway Cola Zero 1,5 l', 'getraenke', 1500, 0.59, [0, 0, 0, 0], [], { unit: 'ml', piece: 1500, pieceName: 'бут.', pfand: 0.25 });
p('water_sparkling', 'Минеральная вода с газом', 'Saskia Mineralwasser Classic 1,5 l', 'getraenke', 1500, 0.19, [0, 0, 0, 0], [], { unit: 'ml', piece: 1500, pieceName: 'бут.', pfand: 0.25 });
p('water_medium', 'Минеральная вода слабогазированная', 'Saskia Mineralwasser Medium 1,5 l', 'getraenke', 1500, 0.19, [0, 0, 0, 0], [], { unit: 'ml', piece: 1500, pieceName: 'бут.', pfand: 0.25 });
p('water_still', 'Минеральная вода без газа', 'Saskia Mineralwasser Naturell 1,5 l', 'getraenke', 1500, 0.19, [0, 0, 0, 0], [], { unit: 'ml', piece: 1500, pieceName: 'бут.', pfand: 0.25 });
p('energy', 'Энергетик', 'Kong Strong Energy Drink 0,25 l', 'getraenke', 250, 0.39, [46, 0, 0, 11], [], { unit: 'ml', piece: 250, pieceName: 'банк.', pfand: 0.25 });

// ---------- Хлеб ----------
p('bread', 'Цельнозерновой хлеб', 'Vollkornbrot, geschnitten', 'brot', 500, 1.29, [215, 7, 1.5, 40], ['gluten']);
p('toast', 'Тостовый хлеб цельнозерновой', 'Vollkorntoast', 'brot', 500, 1.09, [250, 9, 4, 43], ['gluten']);
p('tortilla', 'Пшеничные лепёшки (тортильи)', 'Weizen-Tortillas', 'brot', 370, 1.29, [310, 8, 7, 52], ['gluten'], { piece: 62, pieceName: 'шт' });
p('breadcrumbs', 'Панировочные сухари', 'Paniermehl', 'trocken', 400, 0.79, [360, 11, 2, 73], ['gluten']);

// ---------- Крупы и бакалея ----------
p('pasta', 'Макароны', 'Nudeln (Penne / Spaghetti)', 'trocken', 500, 0.89, [355, 12, 1.5, 71], ['gluten']);
p('rice', 'Рис длиннозёрный', 'Langkornreis', 'trocken', 1000, 1.79, [350, 7, 0.6, 78]);
p('buckwheat', 'Гречка', 'Buchweizen', 'trocken', 500, 1.99, [343, 13, 3.4, 62]);
p('oats', 'Овсяные хлопья', 'Haferflocken', 'frueh', 500, 0.59, [370, 13.5, 7, 59], ['gluten']);
p('flour', 'Пшеничная мука', 'Weizenmehl Type 405', 'trocken', 1000, 0.59, [340, 10, 1, 71], ['gluten']);
p('starch', 'Крахмал', 'Speisestärke', 'trocken', 400, 0.99, [350, 0.3, 0.1, 86]);
p('baking_powder', 'Разрыхлитель', 'Backpulver', 'trocken', 60, 0.39, SPICE);
p('passata', 'Протёртые томаты (в пакете или бутылке)', 'Passierte Tomaten', 'trocken', 500, 0.59, [30, 1.3, 0.2, 5], ['tomatoes']);
p('tomato_paste', 'Томатная паста', 'Tomatenmark', 'trocken', 200, 0.69, [80, 4, 0.5, 14], ['tomatoes']);

// ---------- Масло, специи, соусы ----------
p('oil', 'Подсолнечное масло', 'Sonnenblumenöl', 'gewuerze', 1000, 1.89, [884, 0, 100, 0], [], { unit: 'ml' });
p('olive_oil', 'Оливковое масло', 'Olivenöl', 'gewuerze', 500, 4.99, [884, 0, 100, 0], [], { unit: 'ml' });
p('salt', 'Соль', 'Salz', 'gewuerze', 500, 0.29, SPICE);
p('pepper', 'Чёрный перец', 'Schwarzer Pfeffer, gemahlen', 'gewuerze', 50, 1.29, SPICE);
p('sugar', 'Сахар', 'Zucker', 'frueh', 1000, 0.99, [400, 0, 0, 100]);
p('paprika_powder', 'Паприка молотая', 'Paprikapulver edelsüß', 'gewuerze', 50, 0.89, SPICE);
p('garlic_powder', 'Чеснок сушёный', 'Knoblauchpulver', 'gewuerze', 50, 0.89, SPICE, ['garlic'], { soft: true });
p('herbs', 'Итальянские травы', 'Italienische Kräuter', 'gewuerze', 15, 0.79, SPICE);
p('curry', 'Карри (порошок)', 'Currypulver', 'gewuerze', 50, 0.99, SPICE);
p('chili_flakes', 'Острый перец хлопьями', 'Chiliflocken', 'gewuerze', 30, 0.99, SPICE, ['spicy']);
p('bay_leaf', 'Лавровый лист', 'Lorbeerblätter', 'gewuerze', 10, 0.79, SPICE);
p('vinegar', 'Уксус', 'Branntweinessig', 'gewuerze', 1000, 0.49, [20, 0, 0, 0.6], [], { unit: 'ml' });
p('soy_sauce', 'Соевый соус', 'Sojasauce', 'gewuerze', 150, 1.19, [60, 6, 0, 8], ['gluten'], { unit: 'ml' });
p('mustard', 'Горчица', 'Senf, mittelscharf', 'gewuerze', 200, 0.59, [100, 6, 5, 5]);
p('broth', 'Овощной бульон (порошок)', 'Gemüsebrühe, instant', 'gewuerze', 140, 0.99, [200, 7, 10, 20]);
p('honey', 'Мёд', 'Honig', 'frueh', 500, 3.49, [304, 0.3, 0, 82], ['animal']);
p('jam', 'Джем', 'Konfitüre', 'frueh', 450, 1.49, [240, 0.4, 0, 60]);

// Каталог в виде «словаря»: PRODUCTS.milk → продукт «молоко»
export const PRODUCTS = Object.fromEntries(list.map((x) => [x.id, x]));
