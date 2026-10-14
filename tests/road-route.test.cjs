const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');
require.extensions['.ts'] = (module, file) => {
  const output = ts.transpileModule(fs.readFileSync(file, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, file);
};
const { configuredOsrmBase, POST } = require('../app/api/road-route/route.ts');
const originalConfig = process.env.ROUTING_OSRM_BASE_URL;
const originalFetch = global.fetch;
after(() => {
  if (originalConfig === undefined) delete process.env.ROUTING_OSRM_BASE_URL;
  else process.env.ROUTING_OSRM_BASE_URL = originalConfig;
  global.fetch = originalFetch;
});
const coordinates = [{ lat: 48.855, lng: 2.34 }, { lat: 48.865, lng: 2.35 }];
function request(points = coordinates) {
  return new Request('http://localhost/api/road-route', {
    method: 'POST', body: JSON.stringify({ coordinates: points }),
  });
}
test('reject OSRM demo servers, insecure base URLs and local hosts', () => {
  for (const url of ['http://myrouting.example.org', 'https://router.project-osrm.org',
    'https://routing.openstreetmap.de', 'https://127.0.0.1:1234',
    'https://localhost', 'https://user:password@safe.example.org']) {
    assert.equal(configuredOsrmBase(url), undefined);
  }
  assert.equal(configuredOsrmBase('https://private-routing.example.org').hostname, 'private-routing.example.org');
});
test('road routing is explicitly unavailable when no provider is configured', async () => {
  delete process.env.ROUTING_OSRM_BASE_URL;
  global.fetch = () => { throw new Error('unexpected upstream request'); };
  const res = await POST(request());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), { available: false, reason: 'routing_not_configured' });
});
test('reject malformed or out-of-range coordinates before contacting routing backend', async () => {
  process.env.ROUTING_OSRM_BASE_URL = 'https://private-routing.example.org';
  global.fetch = () => { throw new Error('unexpected upstream request'); };
  for (const bad of [[], [{ lat: 0, lng: 0 }], [{ lat: 91, lng: 0 }, coordinates[1]],
    [{ lat: 0, lng: '0' }, coordinates[1]], Array(7).fill(coordinates[0])]) {
    const res = await POST(request(bad));
    assert.equal(res.status, 400);
  }
});
test('when configured, road route returns upstream validated distances, durations and geometry', async () => {
  process.env.ROUTING_OSRM_BASE_URL = 'https://private-routing.example.org';
  global.fetch = async (url, init) => {
    assert.equal(url.origin, 'https://private-routing.example.org');
    assert.equal(url.pathname, '/route/v1/driving/2.34,48.855;2.35,48.865');
    assert.equal(url.searchParams.get('geometries'), 'geojson');
    assert.equal(init.redirect, 'error');
    return Response.json({ code: 'Ok', routes: [{
      distance: 2100, duration: 350,
      geometry: { coordinates: [[2.34, 48.855], [2.35, 48.865]] },
    }] });
  };
  const res = await POST(request());
  assert.equal(res.status, 200);
  assert.deepEqual(await res.json(), {
    available: true, mode: 'driving', source: 'OSRM',
    distanceKm: 2.1, durationMinutes: 6,
    geometry: [[2.34, 48.855], [2.35, 48.865]],
  });
});
test('bad upstream road payload cannot present invented road distances', async () => {
  process.env.ROUTING_OSRM_BASE_URL = 'https://private-routing.example.org';
  global.fetch = async () => Response.json({ code: 'Ok', routes: [{
    distance: 1000, duration: 400, geometry: { coordinates: [[200, 100]] },
  }] });
  const res = await POST(request());
  assert.equal((await res.json()).available, false);
});
