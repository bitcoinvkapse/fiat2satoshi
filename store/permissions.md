# Zdůvodnění oprávnění (Chrome Web Store)

Texty pro pole "Účel oprávnění" / "Permission justification" ve formuláři Web Store. CS verze je primární; EN je k dispozici pro případ, že reviewer požaduje anglické zdůvodnění.

## `activeTab`

**CS:**
> Popup používá `chrome.tabs.query({active: true, currentWindow: true})`, aby zjistil hostname aktivní karty a mohl pro ni nabídnout přepínač "Vypnout na této stránce". Bez `activeTab` by popup nevěděl, na jaké doméně uživatel právě je, a per-site přepínač by nešel implementovat. URL z karty nikam neodchází — slouží pouze jako klíč do mapy `disabledHosts` v `chrome.storage.local`.

**EN:**
> The popup calls `chrome.tabs.query({active: true, currentWindow: true})` to read the active tab's hostname so it can offer a per-site "Disable on this site" toggle. Without `activeTab` the popup cannot know which domain the user is currently viewing and the per-site toggle would be impossible. The URL never leaves the browser; it is only used as a key into the `disabledHosts` map stored in `chrome.storage.local`.

Místo v kódu: `popup/popup.js` (funkce `getCurrentTabHost`).

## `storage`

**CS:**
> Ukládání uživatelského nastavení (zapnuto/vypnuto, vybrané měny CZK/EUR, formát zobrazení sat/Ksat/Msat/BTC) přes `chrome.storage.sync` a per-site přepínače plus cache posledního známého kurzu přes `chrome.storage.local`. Cache slouží jako offline fallback, aby ceny zůstaly převedené i při dočasné nedostupnosti API. Bez `storage` by se nastavení ztrácelo mezi otevřeními popupu.

**EN:**
> Persists user settings (on/off, enabled currencies CZK/EUR, display format sat/Ksat/Msat/BTC) via `chrome.storage.sync`, plus per-site toggles and a cache of the last known BTC rate via `chrome.storage.local`. The cache provides an offline fallback so prices remain converted when the rate API is temporarily unreachable. Without `storage` the settings would be lost between popup openings.

## `alarms`

**CS:**
> Periodická obnova BTC kurzu jednou za 5 minut (`chrome.alarms.create('fiat2satoshi-refresh-rate', { periodInMinutes: 5 })`). V Manifest V3 service worker po krátké nečinnosti usíná, takže `setInterval` není spolehlivý — `chrome.alarms` je standardní mechanismus pro periodické úlohy v MV3.

**EN:**
> Periodically refreshes the BTC rate every 5 minutes (`chrome.alarms.create('fiat2satoshi-refresh-rate', { periodInMinutes: 5 })`). In Manifest V3 the service worker is suspended after a short idle period, so `setInterval` is unreliable — `chrome.alarms` is the standard MV3 mechanism for periodic tasks.

## Host permission `https://api.coingecko.com/*`

**CS:**
> Stažení aktuálního BTC kurzu (CZK, EUR, USD) z primárního zdroje voláním `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=czk,eur,usd`. Žádná uživatelská data ani obsah stránek se neposílají, jde o jediný GET na veřejný cenový endpoint.

**EN:**
> Fetches the current BTC rate (CZK, EUR, USD) from the primary source via `GET /api/v3/simple/price?ids=bitcoin&vs_currencies=czk,eur,usd`. No user data or page content is sent — only a single GET to a public price endpoint.

## Host permission `https://api.coinbase.com/*`

**CS:**
> Fallback zdroj kurzu, použije se výhradně tehdy, když primární zdroj (CoinGecko) vrátí HTTP 429/503 nebo je nedostupný. Voláme `GET /v2/exchange-rates?currency=BTC` a z odpovědi čteme jen kurzy CZK/EUR/USD. Stejně jako u primárního zdroje jde o jediný GET, žádná uživatelská data se neposílají. Důvod, proč je fallback potřeba: CoinGecko free endpoint má agresivní per-IP rate limit a opakovaně vrací 429 i z prostředí Web Store reviewera.

**EN:**
> Fallback rate source used only when the primary source (CoinGecko) returns HTTP 429/503 or is otherwise unreachable. We call `GET /v2/exchange-rates?currency=BTC` and read only the CZK/EUR/USD rates from the response. Like the primary source, this is a single GET with no user data attached. The fallback is needed because CoinGecko's free endpoint has an aggressive per-IP rate limit and repeatedly returns 429, including from Web Store review environments.

## Content script pro `<all_urls>`

**CS:**
> Rozšíření má pro uživatele hodnotu jen tehdy, pokud umí najít fiat ceny na libovolné navštívené stránce (e-shop, blog, fórum, …) a nahradit je satoshi ekvivalentem. Rozsah je tedy svázán přímo s deklarovanou funkcí. Content script čte text DOM uzlů, lokálně provede přepočet a v rámci stejné karty nahradí text — obsah stránek se neodesílá, neukládá ani nikam neagreguje (viz veřejný popis položky).

**EN:**
> The extension is only useful if it can find fiat prices on any visited page (e-shops, blogs, forums, …) and replace them with the satoshi equivalent. The scope is therefore directly tied to the declared functionality. The content script reads text nodes from the DOM, performs the conversion locally, and replaces the text within the same tab — page content is never sent, stored, or aggregated anywhere (as stated in the public listing).
