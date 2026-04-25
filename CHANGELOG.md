# Changelog

Všechny významné změny projektu budou dokumentovány v tomto souboru.

Formát vychází z [Keep a Changelog](https://keepachangelog.com/) a verzování z [Semantic Versioning](https://semver.org/).

## [Neuvedeno]

## [0.1.1]

### Přidáno
- Coinbase (`api.coinbase.com/v2/exchange-rates`) jako fallback zdroj kurzu, když CoinGecko vrátí 429 nebo selže — Web Store reviewer narazil opakovaně na rate limit z CoinGecka při dynamic analysis a zamítl položku.
- Retry s exponenciálním backoffem (1 s, 3 s) na HTTP 429/503 a síťové chyby u každého zdroje, než se přepne na další.
- Site adaptéry pro weby, kde je cena rozložena přes víc DOM elementů.
- Adaptér pro `rohlik.cz` (listing, detail, košík) — dvoumódový: anchor přes `data-test="*-priceNo"` / `*-currency` (split), fallback na `textContent` u kontejnerů bez `-priceNo` (např. součet v košíku).
- Adaptér pro `allegro.cz` (+ .pl/.sk/.hu/.it) — heuristika nad fragmentovanými text nody pro stránky s hashovanými CSS třídami a bez stabilních markerů.
- Deferred re-scan po `init()` pojistkou proti SPA hydrataci, která může proběhnout paralelně s prvním průchodem.
- Staleness detection — když React přepíše obsah adaptérem zpracovaného kontejneru, adaptér ho zpracuje znovu.

## [0.1.0] – 2026-04-19

### Přidáno
- První verze extension s podporou CZK a EUR.
- Content script s TreeWalker a MutationObserverem pro detekci cen.
- Background service worker stahující BTC kurz z CoinGecka (cache 5 min, persistentní fallback).
- Popup s on/off toggle, toggle per-měna, zobrazením kurzu a tlačítkem „Obnovit kurz".
- Tooltip (hover) s původní cenou, použitým kurzem a časem aktualizace.
- Currency registry pro snadné přidání dalších měn.
- Unit testy pro CZK parser a formátování satoshi (`node --test`).
