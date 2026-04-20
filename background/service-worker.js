// Fiat2Satoshi – background service worker
// Stahuje BTC kurz z CoinGecka, cachuje v chrome.storage.session (5 min TTL)
// a persistuje poslední známý kurz do chrome.storage.local jako fallback.

const API_URL =
  'https://api.coingecko.com/api/v3/simple/price?ids=bitcoin&vs_currencies=czk,eur,usd';
const CACHE_KEY = 'btcRate';
const CACHE_TTL_MS = 5 * 60 * 1000;
const ALARM_NAME = 'fiat2satoshi-refresh-rate';

async function fetchFromApi() {
  const res = await fetch(API_URL, { cache: 'no-store' });
  if (!res.ok) {
    throw new Error(`CoinGecko HTTP ${res.status}`);
  }
  const data = await res.json();
  const btc = data && data.bitcoin;
  if (!btc || typeof btc.czk !== 'number') {
    throw new Error('Neplatná odpověď z CoinGecka');
  }
  return {
    rates: { CZK: btc.czk, EUR: btc.eur, USD: btc.usd },
    fetchedAt: Date.now(),
    source: 'coingecko'
  };
}

async function refreshRate() {
  try {
    const payload = await fetchFromApi();
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
