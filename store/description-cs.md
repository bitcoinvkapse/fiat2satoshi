# Fiat2Satoshi — listing pro Chrome Web Store (CS)

## Krátký popis (do 132 znaků)

Ceny na webu v Kč a € automaticky přepočítá na satoshi podle aktuálního BTC kurzu. Pro bitcoinery a pro orientaci v cenách. ⚡

## Dlouhý popis

**Fiat2Satoshi** přepočítá ceny v českých korunách a eurech na satoshi přímo v textu webových stránek. Místo „1 234 Kč" uvidíš „⚡ 52 830 sats" a rychle získáš představu o hodnotě v bitcoinové jednotce.

### Co Fiat2Satoshi umí

- 🔍 Automatická detekce cen ve formátech: `1 234 Kč`, `1234,50 Kč`, `CZK 1 234`, `€ 99,90`, `EUR 1234` a dalších
- ⚡ Okamžité nahrazení ekvivalentem v satoshi s formátováním:
  - pod 1 000 sats → `⚡ 847 sats`
  - 1 000 – 999 999 sats → `⚡ 12 345 sats`
  - přes 1 000 000 → `⚡ 1,23 Msat`
- 💬 Hover tooltip s původní cenou, použitým kurzem a časem poslední aktualizace
- 🔄 Automatická aktualizace kurzu každých 5 minut z CoinGecka
- 🎛 Popup s on/off přepínačem a volbou měn (CZK / EUR)
- 📄 Funguje i na dynamických stránkách (SPA, e-shopy)

### Proč

Satoshi je základní jednotka bitcoinu (1 BTC = 100 000 000 sats). Když ceny vidíš přímo v satoshi, zvykneš si na tuto jednotku a přestaneš mentálně převádět přes fiat. Je to cvičení pro "low-time-preference" mindset.

### Technické

- Manifest V3, vanilla JS, bez telemetrie, open source (MIT).
- Neposílá žádná data nikam — komunikuje pouze s CoinGeckem pro kurz.
- Nepotřebuje přístup k jednotlivým stránkám (`<all_urls>` se používá jen pro obsahový skript).

Zdrojový kód: https://github.com/bitcoinvkapse/fiat2satoshi
