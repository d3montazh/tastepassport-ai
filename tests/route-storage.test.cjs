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
