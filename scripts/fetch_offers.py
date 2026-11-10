"""
Скрипт акций Lidl для «Корзинки».

Что делает:
  1. Открывает публичные страницы Marktguru «Lidl + категория»
     (например, https://www.marktguru.de/rc/lidl/tiefkuehlpizza) — те же,
     что видит любой посетитель сайта. Правила сайта (robots.txt) это разрешают.
  2. Берёт из них действующие акции Lidl (название, цена, даты).
  3. Сопоставляет акции с продуктами каталога приложения (js/data/products.js).
  4. Сохраняет результат в data/offers.json — его читает приложение.

Запуск на компьютере:
    python scripts/fetch_offers.py

Запуск раз в неделю делает GitHub Actions (шаг 8).
Используются только встроенные модули Python — ничего доустанавливать не нужно.

Важно: акции Lidl почти везде в Германии одинаковые. Страницы Marktguru
не зависят от индекса, поэтому индекс 48341 записывается в файл только для справки.
"""

import json
import re
import sys
import time
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

POSTCODE = "48341"
BASE_URL = "https://www.marktguru.de/rc/lidl/"
USER_AGENT = "Korzinka/1.0 (personal weekly meal planner; once a week)"
PAUSE_SECONDS = 2  # пауза между страницами, чтобы не нагружать сайт
OUTPUT = Path(__file__).resolve().parent.parent / "data" / "offers.json"

# ---------------------------------------------------------------------------
# Какие продукты каталога в каких категориях искать и по каким словам.
#   any  — достаточно одного из этих слов
#   all  — должны быть все эти слова
#   not  — если есть хоть одно из этих слов, это не тот продукт
# Слова ищутся в «бренд + название + описание» маленькими буквами.
# ---------------------------------------------------------------------------
MATCHERS = [
    # Мясо и птица
    {"id": "chicken_breast", "cats": ["gefluegel"], "any": ["hähnchenbrust", "hähnchen-brust"], "not": ["wurst", "aufschnitt", "paniert", "nuggets", "döner"]},
    {"id": "chicken_thigh", "cats": ["gefluegel"], "any": ["oberschenkel"], "not": ["paniert", "wurst"]},
    {"id": "turkey", "cats": ["gefluegel"], "any": ["putenschnitzel", "putenbrust"], "not": ["wurst", "aufschnitt", "salami", "paniert"]},
    {"id": "minced_mixed", "cats": ["schweinefleisch", "rindfleisch"], "all": ["hack"], "any": ["gemischt"]},
    {"id": "minced_beef", "cats": ["rindfleisch"], "all": ["hack"], "any": ["rinderhack", "rind"], "not": ["gemischt"]},
    {"id": "pork_schnitzel", "cats": ["schweinefleisch"], "any": ["schnitzel"], "not": ["puten", "hähnchen", "paniert", "cordon"]},
    {"id": "bacon", "cats": ["schinken", "schweinefleisch"], "any": ["speckwürfel", "bacon", "schinkenwürfel"]},
    {"id": "ham", "cats": ["schinken", "wurstaufschnitt"], "any": ["kochschinken", "hinterschinken"]},
    # Молочное и яйца
    {"id": "milk_lf", "cats": ["milch"], "all": ["laktosefrei"], "any": ["milch"], "not": ["müllermilch", "drink", "kakao"]},
    {"id": "milk", "cats": ["milch"], "any": ["h-milch", "frische milch", "vollmilch", "fettarme milch"], "not": ["laktosefrei", "müllermilch", "kakao", "drink"]},
    {"id": "yogurt_lf", "cats": ["joghurt"], "all": ["joghurt", "laktosefrei"]},
    {"id": "yogurt", "cats": ["joghurt"], "any": ["naturjoghurt", "joghurt natur"], "not": ["laktosefrei"]},
    {"id": "quark_lf", "cats": ["kaese-quark"], "all": ["quark", "laktosefrei"]},
    {"id": "quark", "cats": ["kaese-quark"], "any": ["magerquark", "speisequark"], "not": ["laktosefrei"]},
    {"id": "cream_lf", "cats": ["sahne"], "all": ["sahne", "laktosefrei"]},
    {"id": "cream", "cats": ["sahne"], "any": ["schlagsahne"], "not": ["laktosefrei", "sprüh"]},
    {"id": "sour_cream", "cats": ["sahne", "kaese-quark"], "any": ["schmand", "saure sahne"], "not": ["laktosefrei"]},
    {"id": "butter_lf", "cats": ["butter-margarine-fett"], "all": ["butter", "laktosefrei"]},
    {"id": "butter", "cats": ["butter-margarine-fett"], "any": ["butter"], "not": ["laktosefrei", "margarine", "schmalz", "kekse"]},
    {"id": "gouda_lf", "cats": ["kaese-quark"], "all": ["gouda", "laktosefrei"]},
    {"id": "gouda", "cats": ["kaese-quark"], "any": ["gouda"], "not": ["laktosefrei"]},
    {"id": "mozz_lf", "cats": ["kaese-quark"], "all": ["mozzarella", "laktosefrei"]},
    {"id": "mozzarella", "cats": ["kaese-quark"], "any": ["mozzarella"], "not": ["laktosefrei", "pizza", "sticks"]},
    {"id": "eggs", "cats": ["eier"], "any": ["eier"], "not": ["schoko", "nudeln", "likör", "ostern"]},
    # Бакалея
    {"id": "pasta", "cats": ["nudeln"], "any": ["spaghetti", "penne", "fusilli", "farfalle", "nudeln"], "not": ["frisch", "gefüllt", "tortellini", "ravioli", "instant", "asia", "gnocchi"]},
    {"id": "rice", "cats": ["reis"], "any": ["langkornreis", "basmati", "jasmin", "reis"], "not": ["milchreis", "waffel", "risotto"]},
    {"id": "oil", "cats": ["oel"], "any": ["sonnenblumenöl"]},
    {"id": "olive_oil", "cats": ["oel"], "any": ["olivenöl"]},
    {"id": "honey", "cats": ["honig"], "any": ["honig"]},
    {"id": "passata", "cats": ["gemuesekonserven", "saucen-dips"], "any": ["passiert"]},
    {"id": "canned_tomatoes", "cats": ["gemuesekonserven"], "any": ["gehackte tomaten", "tomaten stück", "geschälte tomaten"]},
    {"id": "kidney_beans", "cats": ["gemuesekonserven"], "any": ["kidney"]},
    {"id": "chickpeas", "cats": ["gemuesekonserven"], "any": ["kichererbsen"]},
    {"id": "tuna", "cats": ["fischkonserven"], "any": ["thunfisch"]},
    # Хлеб
    {"id": "toast", "cats": ["brot"], "any": ["toast"]},
    {"id": "bread", "cats": ["brot"], "any": ["vollkornbrot", "roggenbrot", "mischbrot", "körnerbrot"], "not": ["toast"]},
    # Заморозка
    {"id": "frozen_pizza", "cats": ["tiefkuehlpizza"], "any": ["pizza"], "not": ["piccolini", "baguette", "snack", "mini"]},
    {"id": "salmon", "cats": ["tiefkuehlfisch"], "any": ["lachs"], "not": ["räucher"]},
    {"id": "veg_mix", "cats": ["tiefkuehlgerichte"], "any": ["gemüsemischung", "pfannengemüse", "buttergemüse"]},
    {"id": "spinach", "cats": ["tiefkuehlgerichte"], "any": ["blattspinat"]},
    # Напитки
    {"id": "cola_zero", "cats": ["softdrinks"], "all": ["cola"], "any": ["zero", "ohne zucker", "light"]},
    {"id": "cola", "cats": ["softdrinks"], "any": ["cola"], "not": ["zero", "ohne zucker", "light", "mezzo", "mix", "orange"]},
    {"id": "energy", "cats": ["softdrinks"], "any": ["energy"]},
    {"id": "water_still", "cats": ["wasser"], "any": ["naturelle", "still", "ohne kohlensäure"], "not": ["touch", "tee", "juicy", "geschmack", "frucht"]},
    {"id": "water_medium", "cats": ["wasser"], "any": ["medium"], "not": ["touch", "tee", "juicy", "geschmack", "frucht"]},
    {"id": "water_sparkling", "cats": ["wasser"], "any": ["classic", "spritzig", "mit kohlensäure", "sprudel"], "not": ["touch", "tee", "juicy", "geschmack", "frucht"]},
]

CATEGORIES = sorted({c for m in MATCHERS for c in m["cats"]})


def fetch(url):
    """Скачать страницу как обычный браузер (одна попытка + одна повторная)."""
    req = urllib.request.Request(url, headers={"User-Agent": USER_AGENT, "Accept-Language": "de-DE,de"})
    for attempt in range(2):
        try:
            with urllib.request.urlopen(req, timeout=30) as resp:
                return resp.read().decode("utf-8", errors="replace")
        except Exception as e:  # сеть, 404, 500…
            if attempt == 1:
                raise
            print(f"  повтор после ошибки: {e}")
            time.sleep(5)


def offers_from_page(html):
    """Достать список акций из JSON, который встроен в страницу."""
    m = re.search(r'<script[^>]*type="application/json"[^>]*>(.*?)</script>', html, re.S)
    if not m:
        return []
    data = json.loads(m.group(1))
    return (((data.get("data") or {}).get("offers") or {}).get("results")) or []


def parse_date(s):
    return datetime.fromisoformat(s.replace("Z", "+00:00")) if s else None


def normal_price_from_text(text):
    """«Normalpreis: 3.49» в описании → 3.49"""
    m = re.search(r"normalpreis:?\s*(\d+[.,]\d{2})", text, re.I)
    return float(m.group(1).replace(",", ".")) if m else None


def multipack_count(text):
    """«Je 18 x 0,33 l» или «10x 0,5 l» → 18 / 10; иначе 1"""
    m = re.search(r"(\d{1,2})\s*x\s*\d", text, re.I)
    return int(m.group(1)) if m and int(m.group(1)) > 1 else 1


def matches(rule, text):
    if any(w in text for w in rule.get("not", [])):
        return False
    if not all(w in text for w in rule.get("all", [])):
        return False
    words = rule.get("any")
    return any(w in text for w in words) if words else True


def main():
    now = datetime.now(timezone.utc)
    horizon = now + timedelta(days=8)  # акции, которые идут сейчас или начнутся в ближайшую неделю
    seen = {}
    ok_pages = 0

    print(f"Читаю {len(CATEGORIES)} категорий Lidl на Marktguru…")
    for cat in CATEGORIES:
        url = BASE_URL + cat
        try:
            results = offers_from_page(fetch(url))
            ok_pages += 1
        except Exception as e:
            print(f"  {cat}: ошибка — {e}")
            continue
        fresh = 0
        for o in results:
            if (o.get("retailer") or {}).get("uniqueName") != "lidl":
                continue
            valid_from, valid_to = parse_date(o.get("validFrom")), parse_date(o.get("validTo"))
            if not valid_to or valid_to < now or (valid_from and valid_from > horizon):
                continue  # закончилась или ещё не скоро
            fresh += 1
            o["_category"] = cat
            seen[o["id"]] = o
        print(f"  {cat}: акций сейчас — {fresh}")
        time.sleep(PAUSE_SECONDS)

    # Если почти ничего не скачалось — не портим старый файл
    if ok_pages < len(CATEGORIES) // 2:
        print("Слишком много ошибок, файл не обновляю.")
        sys.exit(1)

    items = []
    for o in seen.values():
        brand = (o.get("brand") or {}).get("name") or ""
        if brand == "thisisnobrand123":
            brand = ""
        name = (o.get("product") or {}).get("name") or ""
        desc = o.get("description") or ""
        text = f"{brand} {name} {desc}".lower()
        for rule in MATCHERS:
            if o["_category"] not in rule["cats"] or not matches(rule, text):
                continue
            unit = ((o.get("unit") or {}).get("shortName") or "").lower()
            items.append({
                "productId": rule["id"],
                # «Pepsi» + «Pepsi Cola» → «Pepsi Cola», без повтора бренда
                "title": name if brand and name.lower().startswith(brand.lower()) else f"{brand} {name}".strip(),
                "description": desc[:160],
                "price": o.get("price"),
                "oldPrice": o.get("oldPrice") or normal_price_from_text(desc),
                # цена за кг / л — чтобы пересчитать на упаковку из каталога
                "unitPrice": o.get("referencePrice") if unit in ("kg", "l") else None,
                "unit": unit,
                # сколько штук в упаковке-наборе («10x 0,5 l» → 10), обычно 1
                "count": multipack_count(desc),
                "lidlPlus": "lidl plus" in text,
                "validFrom": (o.get("validFrom") or "")[:10],
                "validTo": (o.get("validTo") or "")[:10],
                "category": o["_category"],
            })
            break  # одна акция — один продукт каталога

    items.sort(key=lambda x: (x["productId"], x["price"] or 0))
    result = {
        "updated": now.isoformat(timespec="seconds"),
        "postcode": POSTCODE,
        "store": "lidl",
        "source": "marktguru.de (публичные страницы категорий)",
        "items": items,
    }
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    OUTPUT.write_text(json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Готово: {len(seen)} акций Lidl, из них подходят к каталогу — {len(items)}.")
    print(f"Сохранено в {OUTPUT}")


if __name__ == "__main__":
    main()
