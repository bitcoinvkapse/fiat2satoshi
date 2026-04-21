'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { combineParts, ADAPTER } = require('../content/adapters/rohlik.js');

test('combineParts: integer + decimal sup + Kč -> CZK', () => {
  assert.deepEqual(combineParts('109', '95', 'Kč'), { amount: 109.95, currency: 'CZK' });
  assert.deepEqual(combineParts('131', '90', 'Kč'), { amount: 131.90, currency: 'CZK' });
});

test('combineParts: bez decimálu -> celé číslo', () => {
  assert.deepEqual(combineParts('250', '', 'Kč'), { amount: 250, currency: 'CZK' });
  assert.deepEqual(combineParts('1234', null, 'CZK'), { amount: 1234, currency: 'CZK' });
});

test('combineParts: třímístný decimal', () => {
  assert.deepEqual(combineParts('1', '500', 'Kč'), { amount: 1.5, currency: 'CZK' });
});

test('combineParts: jednomístný decimal', () => {
  assert.deepEqual(combineParts('10', '5', 'Kč'), { amount: 10.5, currency: 'CZK' });
});

test('combineParts: ořezává whitespace a nbsp', () => {
  assert.deepEqual(combineParts(' 109 ', '\u00A095', ' Kč '), {
    amount: 109.95,
    currency: 'CZK'
  });
});

test('combineParts: EUR i €', () => {
  assert.deepEqual(combineParts('99', '90', '€'), { amount: 99.9, currency: 'EUR' });
  assert.deepEqual(combineParts('1234', '', 'EUR'), { amount: 1234, currency: 'EUR' });
});

test('combineParts: neznámá měna -> null', () => {
  assert.equal(combineParts('100', '', 'USD'), null);
  assert.equal(combineParts('100', '', '$'), null);
  assert.equal(combineParts('100', '', ''), null);
});

test('combineParts: nečíselný integer -> null', () => {
  assert.equal(combineParts('abc', '', 'Kč'), null);
  assert.equal(combineParts('', '95', 'Kč'), null);
  assert.equal(combineParts('12.5', '', 'Kč'), null);
});

test('combineParts: nečíselný decimal -> null', () => {
  assert.equal(combineParts('109', 'abc', 'Kč'), null);
});

test('ADAPTER.hostMatches: rohlik.cz a subdomény', () => {
  assert.equal(ADAPTER.hostMatches('rohlik.cz'), true);
  assert.equal(ADAPTER.hostMatches('www.rohlik.cz'), true);
  assert.equal(ADAPTER.hostMatches('rohlik.sk'), true);
  assert.equal(ADAPTER.hostMatches('ROHLIK.CZ'), true);
});

test('ADAPTER.hostMatches: odmítá cizí domény', () => {
  assert.equal(ADAPTER.hostMatches('alza.cz'), false);
  assert.equal(ADAPTER.hostMatches('fakerohlik.cz'), false);
  assert.equal(ADAPTER.hostMatches('rohlik.com'), false);
  assert.equal(ADAPTER.hostMatches(''), false);
});
