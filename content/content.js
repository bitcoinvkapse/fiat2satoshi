(function () {
  'use strict';

  const F2S = globalThis.__F2S || { currencies: [] };
  const SATS_PER_BTC = 1e8;
  const SKIP_TAGS = new Set([
    'SCRIPT',
    'STYLE',
    'TEXTAREA',
    'INPUT',
    'CODE',
    'PRE',
    'NOSCRIPT'
  ]);

  let settings = { enabled: true, currencies: {}, display: F2S.DEFAULT_DISPLAY };
  let siteEnabled = true;
  let rateSnapshot = null; // { rates: {CZK, EUR, USD}, fetchedAt, stale, error }
  let observer = null;
  let mutationQueue = new Set();
  let mutationTimer = null;

  const formatSats = F2S.formatSats;
  const formatThousands = F2S.formatThousands;

  // --- Matching ---
  // Najde všechny shody ve vstupním textu napříč povolenými měnami.
  // Vrací pole { start, end, amount, currency } seřazené podle start, bez překryvů.
  function findMatches(text) {
    const hits = [];
    for (const currency of F2S.currencies) {
      if (!currency.enabled) continue;
      const inContext = currency.contextMatches ? currency.contextMatches(document) : false;
      for (const pat of currency.patterns) {
        if (pat.contextOnly && !inContext) continue;
        pat.regex.lastIndex = 0;
        let m;
        while ((m = pat.regex.exec(text)) !== null) {
          const amount = pat.extract(m);
          if (!isFinite(amount) || amount <= 0) continue;
          hits.push({
            start: m.index,
            end: m.index + m[0].length,
            matchText: m[0],
            amount,
            currency: currency.code
          });
        }
      }
    }
    if (!hits.length) return hits;
    hits.sort((a, b) => a.start - b.start || b.end - a.end);
    const result = [];
    let lastEnd = -1;
    for (const h of hits) {
      if (h.start >= lastEnd) {
        result.push(h);
        lastEnd = h.end;
      }
    }
    return result;
  }

  // --- DOM ---
  function isSkippable(node) {
    let p = node.parentElement;
    while (p) {
      if (SKIP_TAGS.has(p.tagName)) return true;
      if (p.classList && p.classList.contains('sats-value')) return true;
      p = p.parentElement;
    }
    return false;
  }

  function convertAmount(amount, currency) {
    if (!rateSnapshot || !rateSnapshot.rates) return null;
    const price = rateSnapshot.rates[currency];
    if (!price || price <= 0) return null;
    return (amount / price) * SATS_PER_BTC;
  }

  function buildSpan(match, sats) {
    const span = document.createElement('span');
    span.className = 'sats-value';
    span.setAttribute('data-original', match.matchText);
    span.setAttribute('data-fiat-amount', String(match.amount));
    span.setAttribute('data-fiat-currency', match.currency);
    span.textContent = formatSats(sats, settings.display);

    const fetchedAt = rateSnapshot && rateSnapshot.fetchedAt
      ? new Date(rateSnapshot.fetchedAt).toLocaleString()
      : 'neznámý čas';
    const price = rateSnapshot.rates[match.currency];
    const tooltip =
      `${match.matchText}\n` +
      `Kurz: 1 BTC = ${formatThousands(Math.round(price))} ${match.currency}\n` +
      `Aktualizováno: ${fetchedAt}` +
      (rateSnapshot.stale ? '\n(pozor: kurz může být zastaralý)' : '');
    span.setAttribute('title', tooltip);
    return span;
  }

  function processTextNode(textNode) {
    if (!textNode || textNode.nodeType !== Node.TEXT_NODE) return;
    if (!textNode.parentNode) return;
    if (isSkippable(textNode)) return;
    const text = textNode.nodeValue;
    if (!text || text.length < 2) return;

    const matches = findMatches(text);
    if (!matches.length) return;

    const parent = textNode.parentNode;
    const frag = document.createDocumentFragment();
    let cursor = 0;
    for (const m of matches) {
      const sats = convertAmount(m.amount, m.currency);
      if (sats == null) continue;
      if (m.start > cursor) {
        frag.appendChild(document.createTextNode(text.slice(cursor, m.start)));
      }
      frag.appendChild(buildSpan(m, sats));
      cursor = m.end;
    }
    if (cursor === 0) return; // žádný match nekonvertován (nebyl kurz)
    if (cursor < text.length) {
      frag.appendChild(document.createTextNode(text.slice(cursor)));
    }
    parent.replaceChild(frag, textNode);
  }

  function walkAndProcess(root) {
    if (!root) return;
    if (root.nodeType === Node.TEXT_NODE) {
      processTextNode(root);
      return;
    }
    if (root.nodeType !== Node.ELEMENT_NODE) return;
    if (root.classList && root.classList.contains('sats-value')) return;
    if (SKIP_TAGS.has(root.tagName)) return;

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
      acceptNode(node) {
        if (isSkippable(node)) return NodeFilter.FILTER_REJECT;
        return NodeFilter.FILTER_ACCEPT;
      }
    });

    const batch = [];
    let n;
    while ((n = walker.nextNode())) batch.push(n);
    for (const tn of batch) processTextNode(tn);
  }

  // --- Mutation Observer ---
  function scheduleMutation(nodes) {
    for (const n of nodes) mutationQueue.add(n);
    if (mutationTimer) return;
    const run = () => {
      mutationTimer = null;
      const queued = Array.from(mutationQueue);
      mutationQueue.clear();
      for (const node of queued) {
        if (!node.isConnected) continue;
        walkAndProcess(node);
      }
    };
    if (typeof requestIdleCallback === 'function') {
      mutationTimer = requestIdleCallback(run, { timeout: 500 });
    } else {
      mutationTimer = setTimeout(run, 300);
    }
  }

  function startObserver() {
    if (observer) return;
    observer = new MutationObserver((mutations) => {
      const adds = [];
      for (const m of mutations) {
        if (m.type === 'childList') {
          for (const n of m.addedNodes) {
            if (n.nodeType === Node.ELEMENT_NODE) {
              if (n.classList && n.classList.contains('sats-value')) continue;
              adds.push(n);
            } else if (n.nodeType === Node.TEXT_NODE) {
              adds.push(n);
            }
          }
        } else if (m.type === 'characterData') {
          adds.push(m.target);
        }
      }
      if (adds.length) scheduleMutation(adds);
    });
    observer.observe(document.body, {
      childList: true,
      subtree: true,
      characterData: true
    });
  }

  function stopObserver() {
    if (!observer) return;
    observer.disconnect();
    observer = null;
  }

  // --- Revert (při vypnutí) ---
  function revertAll() {
    const spans = document.querySelectorAll('span.sats-value');
    for (const span of spans) {
      const original = span.getAttribute('data-original') || '';
      span.replaceWith(document.createTextNode(original));
    }
  }

  // --- Inicializace ---
  async function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(
        {
          enabled: true,
          currencies: { CZK: true, EUR: true },
          display: { ...F2S.DEFAULT_DISPLAY }
        },
        (data) => resolve(data)
      );
    });
  }

  async function loadSiteEnabled() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ disabledHosts: {} }, (d) => {
        const map = d.disabledHosts || {};
        resolve(!map[window.location.hostname]);
      });
    });
  }

  function isActive() {
    return settings.enabled && siteEnabled;
  }

  function applyCurrencyPrefs() {
    for (const c of F2S.currencies) {
      if (Object.prototype.hasOwnProperty.call(settings.currencies, c.code)) {
        c.enabled = !!settings.currencies[c.code];
      }
    }
  }

  async function fetchRate() {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage({ type: 'getRate' }, (response) => {
          if (chrome.runtime.lastError) {
            resolve(null);
            return;
          }
          resolve(response || null);
        });
      } catch (_e) {
        resolve(null);
      }
    });
  }

  async function init() {
    [settings, siteEnabled] = await Promise.all([loadSettings(), loadSiteEnabled()]);
    applyCurrencyPrefs();
    if (!isActive()) return;

    rateSnapshot = await fetchRate();
    if (!rateSnapshot || !rateSnapshot.rates) {
      // Kurz není — originál zůstává, error se zobrazí v popupu.
      return;
    }

    walkAndProcess(document.body);
    startObserver();
  }

  async function reapply() {
    stopObserver();
    revertAll();
    if (!isActive()) return;
    if (!rateSnapshot) rateSnapshot = await fetchRate();
    if (!rateSnapshot || !rateSnapshot.rates) return;
    walkAndProcess(document.body);
    startObserver();
  }

  // Reakce na změny v popupu
  chrome.storage.onChanged.addListener(async (changes, area) => {
    if (area === 'sync') {
      settings = await loadSettings();
      applyCurrencyPrefs();
      await reapply();
    } else if (area === 'local' && changes.disabledHosts) {
      siteEnabled = await loadSiteEnabled();
      await reapply();
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init, { once: true });
  } else {
    init();
  }
})();
