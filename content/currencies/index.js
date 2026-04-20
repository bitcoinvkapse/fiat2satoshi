(function (global) {
  'use strict';

  const F2S = (global.__F2S = global.__F2S || { currencies: [] });

  // Vrátí seznam všech registrovaných měn. Každá má: code, enabled, patterns, parse.
  F2S.getCurrencies = function getCurrencies() {
    return F2S.currencies.slice();
  };

  // Aplikuje uživatelské preference z chrome.storage (code -> boolean).
  F2S.applyPreferences = function applyPreferences(prefs) {
    if (!prefs || typeof prefs !== 'object') return;
    for (const c of F2S.currencies) {
      if (Object.prototype.hasOwnProperty.call(prefs, c.code)) {
        c.enabled = !!prefs[c.code];
      }
    }
  };

  F2S.getEnabledCurrencies = function getEnabledCurrencies() {
    return F2S.currencies.filter((c) => c.enabled);
  };

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = F2S;
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
