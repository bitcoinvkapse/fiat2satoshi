// Fiat2Satoshi – background service worker
// Stahuje BTC kurz z primárního zdroje (CoinGecko), s fallbackem na Coinbase.
// Cachuje v chrome.storage.session (5 min TTL) a persistuje poslední známý
// kurz do chrome.storage.local jako offline fallback.

const SOURCES = [
  {
    name: 'coingecko',
    url: 'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=czk,eur,usd',
    parse: (data) => {
      const btc = data && data.bitcoin;
      if (!btc || typeof btc.czk !== 'number' || typeof btc.eur !== 'number' || typeof btc.usd !== 'number') {
        throw new Error('CoinGecko: neplatná odpověď');
      }
      return { CZK: btc.czk, EUR: btc.eur, USD: btc.usd };
    }
  },
  {
    name: 'coinbase',
    url: 'https://api.coinbase.com/v2/exchange-rates?currency=BTC',
    parse: (data) => {
      const r = data && data.data && data.data.rates;
      if (!r) throw new Error('Coinbase: neplatná odpověď');
      const czk = parseFloat(r.CZK);
      const eur = parseFloat(r.EUR);
      const usd = parseFloat(r.USD);
      if (!isFinite(czk) || !isFinite(eur) || !isFinite(usd)) {
        throw new Error('Coinbase: chybí kurz CZK/EUR/USD');
      }
      return { CZK: czk, EUR: eur, USD: usd };
    }
  }
];

const CACHE_KEY = 'btcRate';
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALARM_NAME = 'fiat2satoshi-refresh-rate';
const RETRY_DELAYS_MS = [1000, 3000];

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchFromSource(source) {
  // Při HTTP 429 / dočasné síťové chybě zkusíme krátký backoff předtím,
  // než přepneme na další zdroj. Reviewer Web Storu opakovaně narazil
  // na rate limit CoinGecka — retry tam pomáhá tu chvíli překlenout.
  let lastErr = null;
  for (let attempt = 0; attempt <= RETRY_DELAYS_MS.length; attempt++) {
    try {
      const res = await fetch(source.url, { cache: 'no-store' });
      if (res.status === 429 || res.status === 503) {
        lastErr = new Error(`${source.name}: HTTP ${res.status}`);
      } else if (!res.ok) {
        throw new Error(`${source.name}: HTTP ${res.status}`);
      } else {
        const data = await res.json();
        const rates = source.parse(data);
        return { rates, source: source.name };
      }
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // Síťová chyba (TypeError z fetch) — zkusíme znovu, pak fallback.
    }
    if (attempt < RETRY_DELAYS_MS.length) {
      await delay(RETRY_DELAYS_MS[attempt]);
    }
  }
  throw lastErr || new Error(`${source.name}: neznámá chyba`);
}

async function fetchFromAnySource() {
  const errors = [];
  for (const source of SOURCES) {
    try {
      const result = await fetchFromSource(source);
      return {
        rates: result.rates,
        fetchedAt: Date.now(),
        source: result.source
      };
    } catch (err) {
      errors.push(err.message || String(err));
    }
  }
  throw new Error(`Všechny zdroje selhaly: ${errors.join('; ')}`);
}

async function refreshRate() {
  try {
    const payload = await fetchFromAnySource();
    await chrome.storage.session.set({ [CACHE_KEY]: payload });
    await chrome.storage.local.set({ [CACHE_KEY]: payload, lastError: null });
    return { ok: true, payload };
  } catch (err) {
    const msg = err && err.message ? err.message : String(err);
    await chrome.storage.local.set({ lastError: { message: msg, at: Date.now() } });
    return { ok: false, error: msg };
  }
}

async function getRate({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const sess = await chrome.storage.session.get(CACHE_KEY);
    const cached = sess[CACHE_KEY];
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return { ...cached, stale: false };
    }
  }

  const result = await refreshRate();
  if (result.ok) {
    return { ...result.payload, stale: false };
  }

  // Fallback na poslední známý kurz z local storage
  const local = await chrome.storage.local.get(CACHE_KEY);
  if (local[CACHE_KEY]) {
    return { ...local[CACHE_KEY], stale: true, error: result.error };
  }

  return { error: result.error };
}

chrome.runtime.onInstalled.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 });
  refreshRate();
});

chrome.runtime.onStartup.addListener(() => {
  chrome.alarms.create(ALARM_NAME, { periodInMinutes: 5 });
  refreshRate();
});

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === ALARM_NAME) {
    refreshRate();
  }
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message !== 'object') return false;

  if (message.type === 'getRate') {
    getRate({ forceRefresh: !!message.forceRefresh }).then(sendResponse);
    return true; // async response
  }

  if (message.type === 'refreshRate') {
    refreshRate().then(async (res) => {
      if (res.ok) {
        sendResponse({ ...res.payload, stale: false });
      } else {
        const local = await chrome.storage.local.get(CACHE_KEY);
        sendResponse({
          ...(local[CACHE_KEY] || {}),
          stale: true,
          error: res.error
        });
      }
    });
    return true;
  }

  return false;
});
