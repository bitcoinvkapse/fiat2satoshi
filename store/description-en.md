# Fiat2Satoshi — Chrome Web Store listing (EN)

## Short description (up to 132 chars)

Automatically converts CZK and EUR prices on any webpage to satoshi using the live BTC rate. For bitcoiners and learners. ⚡

## Long description

**Fiat2Satoshi** replaces fiat prices (Czech koruna and euro) with their satoshi equivalent directly in web page text. Instead of "€99.90" you'll see "⚡ 115 420 sats" and get an instant sense of value in bitcoin's base unit.

### Features

- 🔍 Automatic price detection in common formats: `1 234 Kč`, `1234,50 Kč`, `CZK 1 234`, `€ 99.90`, `EUR 1234`, and more
- ⚡ Instant replacement with satoshi equivalent:
  - under 1,000 sats → `⚡ 847 sats`
  - 1,000 – 999,999 sats → `⚡ 12 345 sats`
  - over 1,000,000 → `⚡ 1,23 Msat`
- 💬 Hover tooltip showing the original price, exchange rate used, and last-updated time
- 🔄 Exchange rate refreshes every 5 minutes from CoinGecko
- 🎛 Popup with on/off toggle and per-currency switches (CZK / EUR)
- 📄 Works on dynamic pages (SPAs, e-commerce sites)

### Why

Satoshi is bitcoin's base unit (1 BTC = 100,000,000 sats). Seeing prices directly in sats helps you think in bitcoin-native terms instead of mentally re-pricing everything in fiat. A small but useful step toward a low-time-preference mindset.

### Technical

- Manifest V3, vanilla JS, no telemetry, open source (MIT).
- Sends no data anywhere — only talks to CoinGecko for the rate.
- `<all_urls>` access is used solely for the content script.

Source code: https://github.com/bitcoinvkapse/fiat2satoshi
