const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

require.extensions['.ts'] = (module, filename) => {
  const result = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(result.outputText, filename);
};

const { mapsLinkForVerifiedSource } = require('../app/lib/map-links.ts');

test('demo venue never becomes a Google Maps destination, even with fictional address', () => {
  assert.equal(mapsLinkForVerifiedSource({
    name: 'New York: музична вітальня',
    provenance: 'demo',
    address: 'Центр New York',
  }, 'New York'), undefined);
  assert.equal(mapsLinkForVerifiedSource({
    name: 'Demo with placeholder coordinates', provenance: 'demo',
    coordinates: { lat: 40.7128, lng: -74.006 },
  }, 'New York'), undefined);
});

test('legacy saved places without provenance never become Maps searches', () => {
  assert.equal(mapsLinkForVerifiedSource({
    name: 'New York: музична вітальня', address: 'Центр New York',
  }, 'New York'), undefined);
});

test('Qloo venue with valid coordinates searches exact coordinate pair', () => {
  const link = mapsLinkForVerifiedSource({
    name: 'Real New York venue', provenance: 'qloo',
    coordinates: { lat: 40.7228, lng: -73.9872 },
  }, 'New York');
  assert.match(link, /^https:\/\/www\.google\.com\/maps\/search\/\?api=1&query=/);
  const url = new URL(link);
  assert.equal(url.searchParams.get('query'), '40.7228,-73.9872');
});

test('Qloo venue with textual address produces only a discovery search', () => {
  const link = mapsLinkForVerifiedSource({
    name: 'Real Cafe', provenance: 'qloo', address: '123 Example Street',
  }, 'New York');
  assert.equal(new URL(link).searchParams.get('query'), 'Real Cafe, 123 Example Street, New York');
});

test('reject Qloo place without location evidence and invalid coordinates', () => {
  assert.equal(mapsLinkForVerifiedSource({ name: 'Unknown', provenance: 'qloo' }, 'Paris'), undefined);
  assert.equal(mapsLinkForVerifiedSource({
    name: 'Unknown', provenance: 'qloo', coordinates: { lat: 100, lng: 2 },
  }, 'Paris'), undefined);
});
