(function (global) {
  'use strict';

  // Parser EUR čísel:
  //   "1.234,50"   -> 1234.5   (continental)
  //   "1,234.50"   -> 1234.5   (anglo)
  //   "1 234,50"   -> 1234.5
  //   "1234"       -> 1234
  //   "1,23"       -> 1.23     (decimal)
  //   "1,234"      -> 1234     (thousands — 3 číslice za čárkou)
  function parseEurNumber(raw) {
    let s = String(raw).replace(/[\s\u00A0]/g, '');
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
      if (dotCount === 1 && afterLast >= 1 && afterLast <= 2) {
        // desetinný
      } else {
        s = s.replace(/\./g, '');
      }
    }

    return parseFloat(s);
  }

  // Suffix form: "1 234,50 €", "1234 EUR"
  const SUFFIX_RE = /(?<!\d)((?:\d{1,3}(?:[\s\u00A0.,]\d{3})+|\d+)(?:[,.]\d+)?)\s*(?:€|EUR)(?![A-Za-zÀ-ž])/gu;

  // Prefix form: "€ 1.234,50", "EUR 1234"
  const PREFIX_RE = /(?<![A-Za-zÀ-ž])(?:€|EUR)\s*((?:\d{1,3}(?:[\s\u00A0.,]\d{3})+|\d+)(?:[,.]\d+)?)(?!\d)/gu;

  const EUR = {
    code: 'EUR',
    enabled: true,
    patterns: [
      { regex: SUFFIX_RE, extract: (m) => parseEurNumber(m[1]) },
      { regex: PREFIX_RE, extract: (m) => parseEurNumber(m[1]) }
    ],
    parse: parseEurNumber
  };

  const F2S = (global.__F2S = global.__F2S || { currencies: [] });
  F2S.currencies.push(EUR);
  F2S.parseEurNumber = parseEurNumber;

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EUR, parseEurNumber, SUFFIX_RE, PREFIX_RE };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
