'use strict';

const { test } = require('node:test');
const assert = require('node:assert/strict');

const { formatSats, formatThousands } = require('../content/formatter.js');

test('formatThousands: malé číslo beze změny', () => {
  assert.equal(formatThousands(847), '847');
  assert.equal(formatThousands(0), '0');
});

test('formatThousands: nezlomitelné mezery mezi tisíci', () => {
  assert.equal(formatThousands(12345), '12\u00A0345');
  assert.equal(formatThousands(1000000), '1\u00A0000\u00A0000');
});

test('formatSats: pod 1 000 -> "⚡ N sats"', () => {
  assert.equal(formatSats(0), '⚡ 0 sats');
  assert.equal(formatSats(847), '⚡ 847 sats');
  assert.equal(formatSats(999), '⚡ 999 sats');
});

test('formatSats: 1 000 – 999 999 s mezerami', () => {
  assert.equal(formatSats(1000), '⚡ 1\u00A0000 sats');
  assert.equal(formatSats(12345), '⚡ 12\u00A0345 sats');
  assert.equal(formatSats(999999), '⚡ 999\u00A0999 sats');
});

test('formatSats: 1 000 000+ -> Msat s čárkou (default)', () => {
  assert.equal(formatSats(1_000_000), '⚡ 1,00 Msat');
  assert.equal(formatSats(1_230_000), '⚡ 1,23 Msat');
  assert.equal(formatSats(12_345_678), '⚡ 12,35 Msat');
});

test('formatSats: useMsat=false -> vždy sats s mezerami', () => {
  assert.equal(formatSats(12_345_678, { unit: 'sat', useMsat: false }), '⚡ 12\u00A0345\u00A0678 sats');
  assert.equal(formatSats(1_000_000, { unit: 'sat', useMsat: false }), '⚡ 1\u00A0000\u00A0000 sats');
});

test('formatSats: useKsat=true -> Ksat mezi 1k a 1M', () => {
  assert.equal(formatSats(12_345, { unit: 'sat', useKsat: true }), '⚡ 12,35 Ksat');
  assert.equal(formatSats(1_000, { unit: 'sat', useKsat: true }), '⚡ 1,00 Ksat');
  assert.equal(formatSats(847, { unit: 'sat', useKsat: true }), '⚡ 847 sats');
});

test('formatSats: useKsat + useMsat současně', () => {
  const opts = { unit: 'sat', useKsat: true, useMsat: true };
  assert.equal(formatSats(500, opts), '⚡ 500 sats');
  assert.equal(formatSats(12_345, opts), '⚡ 12,35 Ksat');
  assert.equal(formatSats(1_230_000, opts), '⚡ 1,23 Msat');
});

test('formatSats: unit=btc -> 8 desetinných', () => {
  assert.equal(formatSats(100_000_000, { unit: 'btc' }), '⚡ 1,00000000 BTC');
  assert.equal(formatSats(12_345_678, { unit: 'btc' }), '⚡ 0,12345678 BTC');
  assert.equal(formatSats(1, { unit: 'btc' }), '⚡ 0,00000001 BTC');
  assert.equal(formatSats(150_000_000, { unit: 'btc' }), '⚡ 1,50000000 BTC');
});

test('formatSats: unit=btc s velkou hodnotou (mezery v celé části)', () => {
  assert.equal(formatSats(1_234_500_000_000, { unit: 'btc' }), '⚡ 12\u00A0345,00000000 BTC');
});

test('formatSats: zaokrouhluje celé satoshi', () => {
  assert.equal(formatSats(847.4), '⚡ 847 sats');
  assert.equal(formatSats(847.6), '⚡ 848 sats');
});

test('formatSats: záporné a NaN vrací null', () => {
  assert.equal(formatSats(-1), null);
  assert.equal(formatSats(NaN), null);
  assert.equal(formatSats(Infinity), null);
});
