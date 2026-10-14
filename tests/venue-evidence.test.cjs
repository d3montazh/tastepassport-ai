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

const { qlooAffinityPercent, qlooCoordinates, aerialDistanceKm } = require('../app/lib/venue-evidence.ts');

test('converts only a genuine finite Qloo affinity in [0,1] into a percentage', () => {
  assert.equal(qlooAffinityPercent({ affinity: 0.83 }), 83);
  assert.equal(qlooAffinityPercent({ query: { affinity: 0.791 } }), 79);
  assert.equal(qlooAffinityPercent({ affinity: 0 }), 0);
  assert.equal(qlooAffinityPercent({ affinity: 1 }), 100);
  for (const affinity of [undefined, null, '0.92', NaN, Infinity, -0.2, 1.4, 92]) {
    assert.equal(qlooAffinityPercent({ affinity }), undefined);
  }
});

test('ignores popularity, rating, position and explainability scores as taste match', () => {
  assert.equal(qlooAffinityPercent({
    properties: { popularity: 0.97, rating: 4.9 },
    query: { explainability: { 'signal.interests.entities': 0.91 } },
  }), undefined);
});

test('extracts only sane geocoordinates and does not invent missing coordinates', () => {
  assert.deepEqual(qlooCoordinates({ properties: { geocode: { latitude: '40.73', longitude: '-73.99' } } }),
    { lat: 40.73, lng: -73.99 });
  assert.deepEqual(qlooCoordinates({ properties: { location: { type: 'Point', coordinates: [-73.99, 40.73] } } }),
    { lat: 40.73, lng: -73.99 });
  assert.equal(qlooCoordinates({ properties: { geocode: { city: 'New York' } } }), undefined);
  assert.equal(qlooCoordinates({ properties: { latitude: 91, longitude: 8 } }), undefined);
});

test('straight-line distances use actual coordinates, not guessed travel times', () => {
  const ny = { lat: 40.7128, lng: -74.0060 };
  const ny2 = { lat: 40.7228, lng: -74.0060 };
  const km = aerialDistanceKm(ny, ny2);
  assert.ok(km > 1 && km < 1.2);
  assert.equal(aerialDistanceKm(undefined, ny), undefined);
  assert.equal(aerialDistanceKm({ lat: 100, lng: 0 }, ny), undefined);
});
