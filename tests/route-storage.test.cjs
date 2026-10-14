const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const { parseSavedRoute, routeShareText } = require('../app/lib/route-storage.ts');

const route = {
  version: 1, likes: 'The Weeknd, Prada', origin: 'Kyiv', city: 'Paris', mode: 'balanced',
  result: {
    summary: 'Personalized Paris',
    items: [
      { name: 'Cafe A', time: '10:00', address: 'Rue A', fit: 88, fitSource: 'qloo-affinity' },
      { name: 'Gallery B', time: '12:00' },
    ],
    meta: { source: 'Qloo + demo', fallback: true },
  },
};
test('one-device route snapshot round-trips safely', () => {
  assert.deepEqual(parseSavedRoute(JSON.stringify(route)), route);
});
test('reject malformed or oversized cached route snapshots', () => {
  for (const raw of [
    '', '{', 'x'.repeat(90000),
    JSON.stringify({ ...route, version: 2 }),
    JSON.stringify({ ...route, result: { items: [] } }),
    JSON.stringify({ ...route, result: { items: [{ name: '' }] } }),
    JSON.stringify({ ...route, mode: 'hijack' }),
    JSON.stringify({ ...route, result: { items: [{ name: 'Place', coordinates: { lat: 200, lng: 3 } }] } }),
    JSON.stringify({ ...route, result: { items: [{ name: 'Place' }], meta: { source: { malicious: true } } } }),
  ]) {
    assert.equal(parseSavedRoute(raw), null);
  }
});
test('copy format includes human-readable stops and sourced affinity, not made-up demo percentages', () => {
  const text = routeShareText(route, 'ru');
  assert.match(text, /Маршрут: Kyiv → Paris/);
  assert.match(text, /1\. 10:00 · Cafe A/);
  assert.match(text, /88%/);
  assert.match(text, /Gallery B/);
  assert.ok(!text.includes('null%'));
});
test('copy format supports all five languages with no keys or public sharing URL', () => {
  for (const lang of ['en', 'ru', 'uk', 'es', 'zh']) {
    const text = routeShareText(route, lang);
    assert.ok(text.includes('Paris'));
    assert.ok(text.includes('The Weeknd'));
    assert.ok(!text.includes('QLOO_API_KEY'));
  }
});


test('copied demo stop is explicitly labeled and omits fictional geographic addresses', () => {
  const mixed = {
    ...route,
    result: {
      ...route.result,
      items: [
        { name: 'New York: музична вітальня', address: 'Центр New York',
          time: '10:00', provenance: 'demo' },
        { name: 'Real Cafe', address: '123 Example Street',
          provenance: 'qloo', time: '12:00' },
      ],
    },
  };
  const shared = routeShareText(mixed, 'uk');
  assert.match(shared, /ДЕМО-ІДЕЯ/);
  assert.doesNotMatch(shared, /Центр New York/);
  assert.match(shared, /123 Example Street/);
  assert.deepEqual(parseSavedRoute(JSON.stringify(mixed)), mixed);
});

test('old saved itinerary without source does not claim verified locations', () => {
  const shared = routeShareText(route, 'ru');
  assert.match(shared, /Источник места не подтверждён/);
  assert.doesNotMatch(shared, /Rue A/);
  assert.equal(parseSavedRoute(JSON.stringify({
    ...route, result: { ...route.result, items: [{ name: 'Venue', provenance: 'made-up' }] },
  })), null);
});
