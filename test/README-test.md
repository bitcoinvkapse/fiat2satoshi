# Testy

Testy používají vestavěný test runner Node.js (`node --test`, dostupný od Node 18). Žádné závislosti, žádná instalace.

## Spuštění

Z kořenového adresáře repozitáře:

```bash
node --test
```

Node 22+ automaticky objeví všechny `*.test.js` soubory v `test/`.

Jednotlivé soubory:

```bash
node --test test/czk-parser.test.js test/formatter.test.js
```

## Co se testuje

- `czk-parser.test.js` — parsování všech formátů CZK cen (s mezerami, tečkami, čárkami, `,-` suffixem, prefix `CZK`/`Kč`).
- `formatter.test.js` — formátování satoshi výstupu (pod 1 000 / do milionu / Msat).

## Struktura testů

Každý test používá `node:test` API a `node:assert/strict`. Parsery jsou napsané jako univerzální moduly (IIFE + `module.exports`), takže stejný soubor běží jak v prohlížeči jako content script, tak v Node při testování.

## Přidání nového testu

```js
const { test } = require('node:test');
const assert = require('node:assert/strict');

test('popis testu', () => {
  assert.equal(actual, expected);
});
```
