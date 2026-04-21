(function (global) {
  'use strict';

  const HOST_RE = /(^|\.)allegro\.(cz|pl|sk|hu|it)$/i;

  // Allegro používá hashované CSS třídy a žádné data-test markery. Anchor je
  // proto heuristika: element, jehož textContent matchuje cenovou regex, ale
  // match je fragmentovaný přes víc text nodů (žádný jeden child text node
  // neobsahuje celý string).
  const PRICE_REGEX =
    /(?<!\d)((?:\d{1,3}(?:[\s\u00A0.]\d{3})+|\d+)(?:[,.]\d+|,-)?)\s*(?:Kč|CZK|€|EUR)(?![A-Za-zÀ-ž])/u;

  const CANDIDATE_SELECTOR = 'div, p, span, li';
  const MAX_TEXT_LENGTH = 80;
  const MAX_CHILDREN = 20;

  function hasInSingleTextNode(root, needle) {
    if (!root || !root.ownerDocument) return false;
    const walker = root.ownerDocument.createTreeWalker(
      root,
      NodeFilter.SHOW_TEXT,
      null
    );
    let n;
    while ((n = walker.nextNode())) {
      if ((n.nodeValue || '').indexOf(needle) !== -1) return true;
    }
    return false;
  }

  function findContainers(root) {
    if (!root || root.nodeType !== 1) return [];
    const candidates = [];
    if (root.matches && root.matches(CANDIDATE_SELECTOR)) candidates.push(root);
    if (root.querySelectorAll) {
      for (const el of root.querySelectorAll(CANDIDATE_SELECTOR)) candidates.push(el);
    }

    const hits = [];
    for (const el of candidates) {
      if (el.dataset && el.dataset.f2sAdapter) continue;
      if (el.children.length > MAX_CHILDREN) continue;
      const text = el.textContent || '';
      if (!text || text.length > MAX_TEXT_LENGTH) continue;
      const match = text.match(PRICE_REGEX);
      if (!match) continue;
      // Přeskoč, pokud je celý match v jednom text nodu — text walker
      // v content.js to zvládne sám (bez přepisu celého innerHTML).
      if (hasInSingleTextNode(el, match[0])) continue;
      hits.push(el);
    }

    // Dedup: ponech jen nejvnitřnější (když vnořený kandidát taky matchuje,
    // vnější kontejner vyřadíme — jinak bychom nahradili vrstvu navíc).
    const pruned = hits.filter(
      (el) => !hits.some((other) => other !== el && el.contains(other))
    );

    return pruned.map((el) => ({ el, mode: 'text' }));
  }

  const ADAPTER = {
    name: 'allegro',
    hostMatches(hostname) { return HOST_RE.test(hostname || ''); },
    findContainers
  };

  const F2S = (global.__F2S = global.__F2S || { currencies: [] });
  F2S.adapters = F2S.adapters || [];
  F2S.adapters.push(ADAPTER);

  if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ADAPTER, findContainers, PRICE_REGEX };
  }
})(typeof globalThis !== 'undefined' ? globalThis : this);
