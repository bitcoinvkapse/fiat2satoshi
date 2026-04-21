(function (global) {
  'use strict';

  const HOST_RE = /(^|\.)rohlik\.(cz|sk|hu|at|de|it|ro)$/i;

  // Pure helper: složí částku z integer textu, decimal textu (ze <sup>) a textu měny.
  // Testovatelné bez DOM.
  function combineParts(intText, decText, currencyText) {
    const clean = (s) => (s || '').replace(/[\s\u00A0]/g, '');
    const intClean = clean(intText);
    if (!/^\d+$/.test(intClean)) return null;

    const decClean = clean(decText);
    if (decClean && !/^\d+$/.test(decClean)) return null;

    const curr = (currencyText || '').trim();
    let code;
    if (curr === 'Kč' || /^CZK$/i.test(curr)) code = 'CZK';
    else if (curr === '€' || /^EUR$/i.test(curr)) code = 'EUR';
    else return null;

    let amount = parseInt(intClean, 10);
    if (decClean) {
      amount += parseInt(decClean, 10) / Math.pow(10, decClean.length);
    }
    return { amount, currency: code };
  }

  // DOM extractor: z priceNo spanu (<span>INT</span><sup>DEC</sup>) + sourozence -currency
  // vrátí { amount, currency, originalText, priceNo, currency }
  function extractFromContainer(container) {
    const priceNo = container.querySelector('[data-test$="-priceNo"]');
    if (!priceNo || !priceNo.parentElement) return null;
    const currency = priceNo.parentElement.querySelector('[data-test$="-currency"]');
    if (!currency) return null;

    const intEl = priceNo.querySelector(':scope > span');
    const decEl = priceNo.querySelector(':scope > sup');
    const intText = intEl ? intEl.textContent : priceNo.textContent;
    const decText = decEl ? decEl.textContent : '';
    const currencyText = currency.textContent;

    const parts = combineParts(intText, decText, currencyText);
    if (!parts) return null;

    const originalText = decText
      ? `${intText.trim()},${decText.trim()} ${currencyText.trim()}`
      : `${intText.trim()} ${currencyText.trim()}`;

    return {
      amount: parts.amount,
      currency: parts.currency,
      originalText,
      priceNo,
      currencyEl: currency
    };
  }

  function queryAll(root, selector) {
    const result = [];
    if (root.matches && root.matches(selector)) result.push(root);
    if (root.querySelectorAll) {
      for (const el of root.querySelectorAll(selector)) result.push(el);
    }
    return result;
  }

  // Najde "price block" kontejnery. Dva módy:
  //   split  — potomek -priceNo (<span>INT</span><sup>DEC</sup>) + sourozenec -currency.
  //            Kontejner = rodič priceNo. Detail + listing.
  //   text   — element s data-test končícím "-price", nemá -priceNo potomka.
  //            Cena je flatten textContent (např. cart-header-price: "109,<sub>95</sub> Kč").
  //            Kontejner = element sám; použije se standardní regex na textContent.
  function findContainers(root) {
    if (!root) return [];
    const seen = new Set();
    const containers = [];

    for (const anchor of queryAll(root, '[data-test$="-priceNo"]')) {
      const parent = anchor.parentElement;
      if (!parent || seen.has(parent)) continue;
      if (!parent.querySelector('[data-test$="-currency"]')) continue;
      seen.add(parent);
      containers.push({ el: parent, mode: 'split' });
    }

    for (const el of queryAll(root, '[data-test$="-price"]')) {
      if (seen.has(el)) continue;
      if (el.querySelector('[data-test$="-priceNo"]')) continue; // split handled above
      seen.add(el);
      containers.push({ el, mode: 'text' });
    }

    return containers;
  }

  const ADAPTER = {
    name: 'rohlik',
    hostMatches(hostname) { return HOST_RE.test(hostname || ''); },
    findContainers,
    extract: extractFromContainer
  };

  const F2S = (global.__F2S = global.__F2S || { currencies: [] });
  F2S.adapters = F2S.adapters || [];
  F2S.adapters.push(ADAPTER);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADAPTER, combineParts, extractFromContainer };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
