(function (global) {
  'use strict';

  // Heuristika pro parsování českých čísel:
  //   "1 234"       -> 1234    (mezera jako tisícový oddělovač)
  //   "1.234"       -> 1234    (tečka jako tisícový oddělovač)
  //   "1 234,50"    -> 1234.5  (čárka jako desetinný oddělovač)
  //   "1234.50"     -> 1234.5  (tečka jako desetinný oddělovač pokud 1–2 číslice za ní)
  //   "1 234,-"     -> 1234    (celé koruny)
  //   "1.234,50"    -> 1234.5  (oba oddělovače — pravější je desetinný)
  function parseCzkNumber(raw) {
    let s = String(raw).replace(/[\s\u00A0]/g, '');
    if (s.endsWith(',-')) s = s.slice(0, -2);
    if (!s) return NaN;

    const hasComma = s.includes(',');
    const hasDot = s.includes('.');

    if (hasComma && hasDot) {
      if (s.lastIndexOf(',') > s.lastIndexOf('.')) {
        s = s.replace(/\./g, '').replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasComma) {
      const lastComma = s.lastIndexOf(',');
      const afterLast = s.length - lastComma - 1;
      const commaCount = (s.match(/,/g) || []).length;
      if (commaCount === 1 && afterLast >= 1 && afterLast <= 2) {
        s = s.replace(',', '.');
      } else {
        s = s.replace(/,/g, '');
      }
    } else if (hasDot) {
      const lastDot = s.lastIndexOf('.');
      const afterLast = s.length - lastDot - 1;
      const dotCount = (s.match(/\./g) || []).length;
      // Single dot s 1-2 číslicemi za = desetinný; jinak tisícový
      if (dotCount === 1 && afterLast >= 1 && afterLast <= 2) {
        // ponecháme jako desetinný
      } else {
        s = s.replace(/\./g, '');
      }
    }

    return parseFloat(s);
  }

  // Suffix form: "1 234,50 Kč", "1234 CZK", "1 234,- Kč"
  // Group 1 = number string
  const SUFFIX_RE = /(?<!\d)((?:\d{1,3}(?:[\s\u00A0.]\d{3})+|\d+)(?:[,.]\d+|,-)?)\s*(?:Kč|CZK)(?![A-Za-zÀ-ž])/gu;

  // Prefix form: "CZK 1 234", "Kč 1 234,50"
  // Group 1 = number string
  const PREFIX_RE = /(?<![A-Za-zÀ-ž])(?:CZK|Kč)\s*((?:\d{1,3}(?:[\s\u00A0.]\d{3})+|\d+)(?:[,.]\d+)?)(?!\d)/gu;

  // Bare form "13 990,-" bez symbolu — aktivuje se jen v českém kontextu
  // (hostname .cz, lang=cs, nebo výskyt Kč/CZK kdekoliv na stránce).
  const BARE_RE = /(?<!\d)((?:\d{1,3}(?:[\s\u00A0.]\d{3})+|\d{2,})(?:[,.]\d+)?,-)(?!\d)/gu;

  function isCzechContext(doc) {
    if (!doc) return false;
    const host = (doc.location && doc.location.hostname) || '';
    if (/\.cz$/i.test(host)) return true;
    const lang = ((doc.documentElement && doc.documentElement.lang) || '').toLowerCase();
    if (lang.startsWith('cs') || lang.startsWith('sk')) return true;
    const txt = doc.body && doc.body.textContent ? doc.body.textContent : '';
    // \b nefunguje na č (non-ASCII), proto explicitní negativní look-around.
    return /(?<![A-Za-zÀ-ž])(?:Kč|CZK)(?![A-Za-zÀ-ž])/u.test(txt);
  }

  const CZK = {
    code: 'CZK',
    enabled: true,
    patterns: [
      { regex: SUFFIX_RE, extract: (m) => parseCzkNumber(m[1]) },
      { regex: PREFIX_RE, extract: (m) => parseCzkNumber(m[1]) },
      { regex: BARE_RE, extract: (m) => parseCzkNumber(m[1]), contextOnly: true }
    ],
    contextMatches: isCzechContext,
    parse: parseCzkNumber
  };

  // Browser: globální registr
  const F2S = (global.__F2S = global.__F2S || { currencies: [] });
  F2S.currencies.push(CZK);
  F2S.parseCzkNumber = parseCzkNumber;

  // Node: CommonJS export pro testy
  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { CZK, parseCzkNumber, SUFFIX_RE, PREFIX_RE, BARE_RE, isCzechContext };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
