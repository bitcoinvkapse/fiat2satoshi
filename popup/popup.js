(function () {
  'use strict';

  const DEFAULTS = {
    enabled: true,
    currencies: { CZK: true, EUR: true },
    display: { unit: 'sat', useKsat: false, useMsat: true }
  };

  const els = {
    extEnabled: document.getElementById('extension-enabled'),
    siteEnabled: document.getElementById('site-enabled'),
    siteHost: document.getElementById('site-host'),
    czk: document.getElementById('currency-CZK'),
    eur: document.getElementById('currency-EUR'),
    unitSat: document.getElementById('unit-sat'),
    unitBtc: document.getElementById('unit-btc'),
    useKsat: document.getElementById('use-ksat'),
    useMsat: document.getElementById('use-msat'),
    rateCzk: document.getElementById('rate-CZK'),
    rateEur: document.getElementById('rate-EUR'),
    meta: document.getElementById('rate-meta'),
    error: document.getElementById('rate-error'),
    refresh: document.getElementById('refresh-btn')
  };

  let currentHost = null;

  function formatFiat(amount) {
    if (!isFinite(amount)) return '—';
    return Math.round(amount)
      .toString()
      .replace(/\B(?=(\d{3})+(?!\d))/g, '\u00A0');
  }

  function formatRate(amount, code) {
    return `${formatFiat(amount)} ${code}`;
  }

  function formatTimeAgo(ts) {
    if (!ts) return 'nikdy';
    const diff = Date.now() - ts;
    if (diff < 60_000) return 'právě teď';
    const mins = Math.round(diff / 60_000);
    if (mins < 60) return `před ${mins} min`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `před ${hrs} h`;
    const days = Math.round(hrs / 24);
    return `před ${days} d`;
  }

  function renderRate(snapshot) {
    if (!snapshot || !snapshot.rates) {
      els.rateCzk.textContent = '—';
      els.rateEur.textContent = '—';
      els.meta.textContent = 'Kurz nedostupný';
      const msg = snapshot && snapshot.error
        ? `Nepodařilo se načíst kurz: ${snapshot.error}`
        : 'Nepodařilo se načíst BTC kurz z CoinGecka.';
      els.error.textContent = msg;
      els.error.classList.remove('hidden');
      return;
    }

    els.rateCzk.textContent = formatRate(snapshot.rates.CZK, 'Kč');
    els.rateEur.textContent = formatRate(snapshot.rates.EUR, '€');
    const when = formatTimeAgo(snapshot.fetchedAt);
    els.meta.textContent = snapshot.stale
      ? `Poslední známý kurz (${when}) — aktuální nelze načíst`
      : `Aktualizováno ${when}`;

    if (snapshot.error) {
      els.error.textContent = `Poznámka: ${snapshot.error}`;
      els.error.classList.remove('hidden');
    } else {
      els.error.classList.add('hidden');
    }
  }

  function loadSettings() {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, resolve);
    });
  }

  function saveSettings(patch) {
    return new Promise((resolve) => {
      chrome.storage.sync.get(DEFAULTS, (current) => {
        const next = {
          enabled: patch.enabled ?? current.enabled,
          currencies: { ...current.currencies, ...(patch.currencies || {}) },
          display: { ...current.display, ...(patch.display || {}) }
        };
        chrome.storage.sync.set(next, resolve);
      });
    });
  }

  function getDisabledHosts() {
    return new Promise((resolve) => {
      chrome.storage.local.get({ disabledHosts: {} }, (d) => resolve(d.disabledHosts || {}));
    });
  }

  function setSiteEnabled(host, enabled) {
    return new Promise((resolve) => {
      chrome.storage.local.get({ disabledHosts: {} }, (d) => {
        const map = d.disabledHosts || {};
        if (enabled) delete map[host];
        else map[host] = true;
        chrome.storage.local.set({ disabledHosts: map }, resolve);
      });
    });
  }

  function getCurrentTabHost() {
    return new Promise((resolve) => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        const tab = tabs && tabs[0];
        if (!tab || !tab.url) return resolve(null);
        try {
          const u = new URL(tab.url);
          if (u.protocol !== 'http:' && u.protocol !== 'https:') return resolve(null);
          resolve(u.hostname);
        } catch (_e) {
          resolve(null);
        }
      });
    });
  }

  function requestRate(forceRefresh = false) {
    return new Promise((resolve) => {
      try {
        chrome.runtime.sendMessage(
          { type: forceRefresh ? 'refreshRate' : 'getRate' },
          (response) => {
            if (chrome.runtime.lastError) {
              resolve({ error: chrome.runtime.lastError.message });
              return;
            }
            resolve(response || {});
          }
        );
      } catch (e) {
        resolve({ error: e.message });
      }
    });
  }

  function updateSiteToggleState() {
    const disabled = !els.extEnabled.checked || !currentHost;
    els.siteEnabled.disabled = disabled;
    if (!currentHost) {
      els.siteHost.textContent = '(tato stránka nepodporuje obsahové skripty)';
    } else {
      els.siteHost.textContent = currentHost;
    }
  }

  function updateDisplayState() {
    const useBtc = els.unitBtc.checked;
    els.useKsat.disabled = useBtc;
    els.useMsat.disabled = useBtc;
  }

  async function init() {
    const [settings, disabledHosts, host] = await Promise.all([
      loadSettings(),
      getDisabledHosts(),
      getCurrentTabHost()
    ]);
    currentHost = host;

    els.extEnabled.checked = !!settings.enabled;
    els.siteEnabled.checked = host ? !disabledHosts[host] : true;
    els.czk.checked = !!settings.currencies.CZK;
    els.eur.checked = !!settings.currencies.EUR;
    const display = settings.display || DEFAULTS.display;
    els.unitSat.checked = display.unit !== 'btc';
    els.unitBtc.checked = display.unit === 'btc';
    els.useKsat.checked = !!display.useKsat;
    els.useMsat.checked = !!display.useMsat;
    updateSiteToggleState();
    updateDisplayState();

    els.extEnabled.addEventListener('change', async (e) => {
      await saveSettings({ enabled: e.target.checked });
      updateSiteToggleState();
    });
    els.siteEnabled.addEventListener('change', async (e) => {
      if (!currentHost) return;
      await setSiteEnabled(currentHost, e.target.checked);
    });
    els.czk.addEventListener('change', async (e) => {
      await saveSettings({ currencies: { CZK: e.target.checked } });
    });
    els.eur.addEventListener('change', async (e) => {
      await saveSettings({ currencies: { EUR: e.target.checked } });
    });

    async function saveDisplay() {
      await saveSettings({
        display: {
          unit: els.unitBtc.checked ? 'btc' : 'sat',
          useKsat: els.useKsat.checked,
          useMsat: els.useMsat.checked
        }
      });
    }
    els.unitSat.addEventListener('change', async () => {
      updateDisplayState();
      await saveDisplay();
    });
    els.unitBtc.addEventListener('change', async () => {
      updateDisplayState();
      await saveDisplay();
    });
    els.useKsat.addEventListener('change', saveDisplay);
    els.useMsat.addEventListener('change', saveDisplay);

    els.refresh.addEventListener('click', async () => {
      els.refresh.disabled = true;
      els.meta.textContent = 'Načítám…';
      els.error.classList.add('hidden');
      const snapshot = await requestRate(true);
      renderRate(snapshot);
      els.refresh.disabled = false;
    });

    els.meta.textContent = 'Načítám…';
    const snapshot = await requestRate(false);
    renderRate(snapshot);
  }

  document.addEventListener('DOMContentLoaded', init);
})();
