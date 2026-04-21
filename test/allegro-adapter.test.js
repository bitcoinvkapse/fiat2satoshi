'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { ADAPTER, PRICE_REGEX } = require('../content/adapters/allegro.js');

test('PRICE_REGEX: "cena 1 054 Kč" flatten z Allegra', () => {
  const text = 'cena 1\u00A0054\u00A0Kč';
  const m = text.match(PRICE_REGEX);
  assert.ok(m, 'má match');
  assert.equal(m[0], '1\u00A0054\u00A0Kč');
  assert.equal(m[1], '1\u00A0054');
});

test('PRICE_REGEX: bez čísel nematchuje', () => {
  assert.equal('cena Kč'.match(PRICE_REGEX), null);
  assert.equal('Kč'.match(PRICE_REGEX), null);
});

test('PRICE_REGEX: desetinný i tisícový oddělovač', () => {
  assert.ok('99,90 Kč'.match(PRICE_REGEX));
  assert.ok('1 234,50 Kč'.match(PRICE_REGEX));
  assert.ok('1234 Kč'.match(PRICE_REGEX));
});

test('PRICE_REGEX: také EUR', () => {
  assert.ok('99,90 €'.match(PRICE_REGEX));
  assert.ok('1 234 EUR'.match(PRICE_REGEX));
});

test('PRICE_REGEX: odmítá slovo "Kčson" apod.', () => {
  assert.equal('1234 Kčson'.match(PRICE_REGEX), null);
});

test('ADAPTER.hostMatches: allegro.cz a subdomény', () => {
  assert.equal(ADAPTER.hostMatches('allegro.cz'), true);
  assert.equal(ADAPTER.hostMatches('www.allegro.cz'), true);
  assert.equal(ADAPTER.hostMatches('allegro.pl'), true);
  assert.equal(ADAPTER.hostMatches('ALLEGRO.CZ'), true);
});

test('ADAPTER.hostMatches: odmítá cizí domény', () => {
  assert.equal(ADAPTER.hostMatches('rohlik.cz'), false);
  assert.equal(ADAPTER.hostMatches('notallegro.cz'), false);
  assert.equal(ADAPTER.hostMatches('allegro.com'), false);
  assert.equal(ADAPTER.hostMatches(''), false);
});
