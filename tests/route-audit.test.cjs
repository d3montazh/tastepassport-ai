const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, file);
};
const { summarizeRoute, displayPlaceType, summarizeCandidateCoverage } = require('../app/lib/route-audit.ts');

test('audit counts Qloo, demo, unknown and actual structured evidence', () => {
  const result = summarizeRoute([
    { name: 'Cafe', provenance: 'qloo', fitSource: 'qloo-affinity', fit: 82,
      coordinates: { lat: 40, lng: -74 } },
    { name: 'Club', provenance: 'demo', fit: 94 },
    { name: 'Old saved route' },
    { name: 'Fake affinity', provenance: 'qloo', fitSource: 'unknown', fit: 99,
      coordinates: { lat: 100, lng: 50 } },
  ]);
  assert.deepEqual(result, {
    total: 4, qloo: 2, demo: 1, unknown: 1,
    withAffinity: 1, withCoordinates: 1, fullyMapped: false,
  });
});
test('complete Qloo route with coordinates marks geographic coverage', () => {
  const result = summarizeRoute([
    { name: 'A', provenance: 'qloo', coordinates: { lat: 48.84, lng: 2.3 } },
    { name: 'B', provenance: 'qloo', coordinates: { lat: 48.85, lng: 2.4 } },
  ]);
  assert.equal(result.fullyMapped, true);
});
test('technical entity urn is not a human readable category', () => {
  assert.equal(displayPlaceType('urn:entity:place', undefined, {}, 'Місце'), 'Місце');
  assert.equal(displayPlaceType('urn:entity:place', 'Clothing store', {}, 'Місце'), 'Clothing store');
  assert.equal(displayPlaceType('urn:entity:place', null, { category: { name: 'Art gallery' } }, 'Place'), 'Art gallery');
});

test('candidate coverage is a numeric-only summary of all Qloo results', () => {
  const stats = summarizeCandidateCoverage([
    { name: 'Cafe', subtype: 'Restaurant', properties: { geocode: { city: 'Paris' }, address: 'Private street' } },
    { name: 'Hotel', subtype: 'Hotel', properties: { location: { latitude: 48.85, longitude: 2.35 } } },
    { name: 'Mystery', properties: { geometry: { type: 'Point', coordinates: [2.3, 48.8] } } },
  ]);
  assert.deepEqual(stats, {
    returned: 3, compatiblePerSlot: [1, 1, 2, 1, 1, 1],
    withParsedCoordinates: 1, withAddress: 1, withGeocodeField: 1,
    withLocationField: 1, withCoordinatesField: 0,
    withGeometryField: 1, withRootGeometry: 0,
  });
  assert.ok(!JSON.stringify(stats).includes('Private street'));
  assert.ok(!JSON.stringify(stats).includes('Mystery'));
});
