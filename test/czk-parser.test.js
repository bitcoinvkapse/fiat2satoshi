'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { parseCzkNumber, CZK, BARE_RE, isCzechContext } = require('../content/currencies/czk.js');

// --- parseCzkNumber: jednotlivé formáty čísel ---
test('parseCzkNumber: jednoduché celé číslo', () => {
  assert.equal(parseCzkNumber('1234'), 1234);
  assert.equal(parseCzkNumber('0'), 0);
});

test('parseCzkNumber: mezera jako tisícový oddělovač', () => {
  assert.equal(parseCzkNumber('1 234'), 1234);
  assert.equal(parseCzkNumber('12 345 678'), 12345678);
});

test('parseCzkNumber: nezlomitelná mezera', () => {
  assert.equal(parseCzkNumber('1\u00A0234'), 1234);
});

test('parseCzkNumber: čárka jako desetinný oddělovač', () => {
  assert.equal(parseCzkNumber('1 234,50'), 1234.5);
  assert.equal(parseCzkNumber('1234,50'), 1234.5);
  assert.equal(parseCzkNumber('0,99'), 0.99);
});

test('parseCzkNumber: tečka jako desetinný oddělovač', () => {
  assert.equal(parseCzkNumber('1234.50'), 1234.5);
});

test('parseCzkNumber: tečka jako tisícový oddělovač', () => {
  assert.equal(parseCzkNumber('1.234'), 1234);
  assert.equal(parseCzkNumber('1.234.567'), 1234567);
});

test('parseCzkNumber: oba oddělovače (čárka rozhoduje jako desetinný)', () => {
  assert.equal(parseCzkNumber('1.234,50'), 1234.5);
});

test('parseCzkNumber: suffix ,- strhne desetinnou část', () => {
  assert.equal(parseCzkNumber('1234,-'), 1234);
  assert.equal(parseCzkNumber('1 234,-'), 1234);
});

// --- regex patterns: detekce v textu ---
function matchAll(pat, text) {
  pat.regex.lastIndex = 0;
  const out = [];
  let m;
  while ((m = pat.regex.exec(text)) !== null) {
    out.push({ matched: m[0], amount: pat.extract(m) });
  }
  return out;
}

const SUFFIX = CZK.patterns[0];
const PREFIX = CZK.patterns[1];

test('suffix Kč: "1 234 Kč"', () => {
  const r = matchAll(SUFFIX, 'Cena 1 234 Kč celkem');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('suffix Kč: "1234 Kč"', () => {
  const r = matchAll(SUFFIX, 'Cena 1234 Kč');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('suffix Kč: "1 234,50 Kč"', () => {
  const r = matchAll(SUFFIX, '1 234,50 Kč');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234.5);
});

test('suffix Kč: "1234.50 Kč"', () => {
  const r = matchAll(SUFFIX, '1234.50 Kč');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234.5);
});

test('suffix Kč: "1 234,- Kč" (platné s symbolem)', () => {
  const r = matchAll(SUFFIX, 'Rezervace 1 234,- Kč dnes');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('suffix Kč: samotné "1 234,-" bez Kč se nematchuje', () => {
  const r = matchAll(SUFFIX, 'Sleva 1 234,- od pátku');
  assert.equal(r.length, 0);
});

test('suffix CZK: "1 234 CZK"', () => {
  const r = matchAll(SUFFIX, 'Suma 1 234 CZK');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('prefix: "CZK 1 234"', () => {
  const r = matchAll(PREFIX, 'Zaplaceno CZK 1 234 celkem');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('prefix: "CZK 1234"', () => {
  const r = matchAll(PREFIX, 'CZK 1234');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('prefix: "Kč 1 234,50"', () => {
  const r = matchAll(PREFIX, 'Kč 1 234,50');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234.5);
});

test('tečka jako tisícovky: "1.234 Kč"', () => {
  const r = matchAll(SUFFIX, '1.234 Kč');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1234);
});

test('více výskytů v jednom stringu', () => {
  const r = matchAll(SUFFIX, 'Levné: 299 Kč, dražší: 1 499 Kč');
  assert.equal(r.length, 2);
  assert.equal(r[0].amount, 299);
  assert.equal(r[1].amount, 1499);
});

test('nemátne delší číslo uvnitř: "12345678 Kč" jako kompaktní', () => {
  const r = matchAll(SUFFIX, '12345678 Kč');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 12345678);
});

test('nematchuje Kč bez čísla', () => {
  const r1 = matchAll(SUFFIX, 'Kurz v Kč je dobrý');
  const r2 = matchAll(PREFIX, 'Kurz v Kč je dobrý');
  assert.equal(r1.length, 0);
  assert.equal(r2.length, 0);
});

test('velké číslo s mezerami: "1 990 CZK"', () => {
  const r = matchAll(SUFFIX, 'Pračka 1 990 CZK');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 1990);
});

// --- bare form: "13 990,-" bez symbolu (aktivní v CZ kontextu) ---
const BARE = CZK.patterns[2];

test('bare: "13 990,-" (holý tvar s ,-)', () => {
  const r = matchAll(BARE, 'Cena 13 990,- za kus');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 13990);
});

test('bare: více holých cen', () => {
  const r = matchAll(BARE, 'Levné 299,- dražší 1 499,- a 19 990,-');
  assert.equal(r.length, 3);
  assert.deepEqual(r.map((x) => x.amount), [299, 1499, 19990]);
});

test('bare: tečka jako tisícový oddělovač "13.990,-"', () => {
  const r = matchAll(BARE, 'Akce 13.990,- kus');
  assert.equal(r.length, 1);
  assert.equal(r[0].amount, 13990);
});

test('bare: nematchuje holé číslo bez ,-', () => {
  const r = matchAll(BARE, 'Cena 13 990 kč');
  assert.equal(r.length, 0);
});

test('bare: flagged contextOnly', () => {
  assert.equal(BARE.contextOnly, true);
});

test('isCzechContext: .cz hostname', () => {
  const doc = { location: { hostname: 'alza.cz' }, documentElement: { lang: '' }, body: { textContent: '' } };
  assert.equal(isCzechContext(doc), true);
});

test('isCzechContext: lang="cs"', () => {
  const doc = { location: { hostname: 'example.com' }, documentElement: { lang: 'cs-CZ' }, body: { textContent: '' } };
  assert.equal(isCzechContext(doc), true);
});

test('isCzechContext: Kč v textu stránky', () => {
  const doc = { location: { hostname: 'example.com' }, documentElement: { lang: 'en' }, body: { textContent: 'Price in Kč.' } };
  assert.equal(isCzechContext(doc), true);
});

test('isCzechContext: neutrální stránka -> false', () => {
  const doc = { location: { hostname: 'example.com' }, documentElement: { lang: 'en' }, body: { textContent: 'Hello world' } };
  assert.equal(isCzechContext(doc), false);
});
