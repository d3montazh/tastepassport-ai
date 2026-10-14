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
const { fitsSlot, selectForSlot, selectItinerary } = require('../app/lib/route-quality.ts');
const entity = (name, subtype) => ({ name, subtype });
test('reject a hotel for a scheduled lunch stop', () => {
  assert.equal(fitsSlot(entity('Hotel', 'Hotel'), 2), false);
  assert.equal(selectForSlot([entity('Hotel', 'Hotel'), entity('Bistro', 'Restaurant')], 2)?.name, 'Bistro');
});
test('shopping place cannot be scheduled as nightlife', () => {
  assert.equal(fitsSlot(entity('Shop', 'Clothing store'), 5), false);
  assert.equal(fitsSlot(entity('Club', 'Night club'), 5), true);
});
test('select itinerary is unique and follows role constraints', () => {
  const places = [
    entity('Museum', 'Museum'), entity('Shop', 'Clothing store'),
    entity('Restaurant', 'Restaurant'), entity('Gallery', 'Art gallery'),
    entity('Park', 'Park'), entity('Nightclub', 'Night club'),
  ];
  assert.deepEqual(selectItinerary(places).map(p => p.name), places.map(p => p.name));
  assert.equal(selectItinerary(places.slice(0, 5)).length, 0);
});
test('unknown categories remain eligible without claiming verification', () => {
  assert.equal(fitsSlot(entity('Unknown', ''), 2), true);
});
test('excluded or repeated venues are not used as replacements', () => {
  assert.equal(selectForSlot([entity('Shop', 'Clothing store')], 1, ['shop']), undefined);
});

test('prioritizes documented place type over an unknown venue in each slot', () => {
  const candidates = [entity('Mystery', undefined), entity('Museum', 'Museum')];
  assert.equal(selectForSlot(candidates, 0)?.name, 'Museum');
  assert.equal(selectForSlot([entity('Mystery', undefined), entity('Restaurant', 'Restaurant')], 2)?.name, 'Restaurant');
});
