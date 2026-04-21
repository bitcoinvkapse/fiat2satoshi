(function (global) {
  'use strict';

  function formatThousands(n) {
    return String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  const DEFAULT_DISPLAY = { unit: 'sat', useKsat: false, useMsat: true };

  function formatTwoDecimals(n) {
    const rounded = Math.round(n * 100) / 100;
    return rounded.toFixed(2).replace('.', ',');
  }

  // Zobrazení v BTC: 8 desetinných míst, česká čárka, mezery v celé části.
  function formatBtc(sats) {
    const btc = sats / 1e8;
    const [intPart, decPart] = btc.toFixed(8).split('.');
    return `⚡ ${formatThousands(intPart)},${decPart} BTC`;
  }

  // Krátký BTC formát (auto-switch nad 1 BTC v sat módu): 2 desetinná místa.
  function formatBtcShort(sats) {
    const btc = sats / 1e8;
    const rounded = Math.round(btc * 100) / 100;
    const [intPart, decPart] = rounded.toFixed(2).split('.');
    return `⚡ ${formatThousands(intPart)},${decPart} BTC`;
  }

  // Formátování satoshi podle uživatelské volby:
  //   unit='btc'                        -> "⚡ 0,00012345 BTC" (vždy 8 des. míst)
  //   unit='sat', useKsat, useMsat      -> Ksat/Msat kde aplikovatelné
  //   jinak jednotné sats s mezerami
  // Auto-switch: v sat módu při sats >= 1 BTC (100 000 000) se zobrazí
  //   "⚡ 1,43 BTC" místo nepřehledných 143 Msat.
  function formatSats(sats, opts) {
    if (!isFinite(sats) || sats < 0) return null;

    const display = Object.assign({}, DEFAULT_DISPLAY, opts || {});

    if (display.unit === 'btc') {
      return formatBtc(sats);
    }

    if (sats < 1000) {
      return `⚡ ${Math.round(sats)} sats`;
    }
    if (sats < 1_000_000) {
      if (display.useKsat) {
        return `⚡ ${formatTwoDecimals(sats / 1000)} Ksat`;
      }
      return `⚡ ${formatThousands(Math.round(sats))} sats`;
    }
    if (sats >= 100_000_000) {
      return formatBtcShort(sats);
    }
    if (display.useMsat) {
      return `⚡ ${formatTwoDecimals(sats / 1_000_000)} Msat`;
    }
    return `⚡ ${formatThousands(Math.round(sats))} sats`;
  }

  const F2S = (global.__F2S = global.__F2S || { currencies: [] });
  F2S.formatSats = formatSats;
  F2S.formatThousands = formatThousands;
  F2S.DEFAULT_DISPLAY = DEFAULT_DISPLAY;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { formatSats, formatThousands, DEFAULT_DISPLAY };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
