const { test, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const ts = require('typescript');

// Transpile route modules in memory; tests never contact Qloo or use a real key.
require.extensions['.ts'] = (module, filename) => {
  const output = ts.transpileModule(fs.readFileSync(filename, 'utf8'), {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  });
  module._compile(output.outputText, filename);
};
const routes = Object.fromEntries(['recommend', 'replace', 'refine'].map(name =>
  [name, require(`../app/api/${name}/route.ts`).POST]));
const originalFetch = global.fetch;
const originalKey = process.env.QLOO_API_KEY;
after(() => {
  global.fetch = originalFetch;
  if (originalKey === undefined) delete process.env.QLOO_API_KEY;
  else process.env.QLOO_API_KEY = originalKey;
});
const currentItems = Array.from({ length: 6 }, (_, i) => ({
  name: `Existing ${i}`, time: `${10 + i}:00`, phase: `Phase ${i}`, address: 'Old address',
}));
const body = { likes: 'Interstellar, Unknown', city: 'Paris', locale: 'uk',
  instruction: 'Make it cheaper', currentItems, currentItem: currentItems[0],
  currentNames: currentItems.map(item => item.name), index: 0 };
async function call(name, values = {}) {
  const response = await routes[name](new Request(`http://localhost/api/${name}`, {
    method: 'POST', body: JSON.stringify({ ...body, ...values }),
  }));
  return { status: response.status, data: await response.json() };
}
function liveFetch(calls, entities = Array.from({ length: 8 }, (_, i) => ({
  entity_id: `place-${i}`, name: `Real place ${i}`, properties: { address: `Address ${i}` },
}))) {
  return async (url, init) => {
    assert.equal(url.origin, 'https://hackathon.api.qloo.com');
    assert.equal(init.headers['X-Api-Key'], 'test-placeholder');
    assert.equal(url.toString().includes('test-placeholder'), false);
    assert.equal(init.cache, 'no-store');
    assert.equal(init.redirect, 'error');
    assert.ok(init.signal);
    calls.push(url);
    if (url.pathname === '/search') {
      return url.searchParams.get('query') === 'Unknown'
        ? new Response('{}', { status: 404 })
        : Response.json({ results: [{ entity_id: 'seed-id', name: 'Interstellar' }] });
    }
    if (url.pathname === '/v2/tags') return Response.json({ results: { tags: [
      { id: 'urn:tag:genre:place:restaurant', name: 'Restaurant' },
    ] } });
    assert.equal(url.pathname, '/v2/insights');
    assert.equal(url.searchParams.get('signal.interests.entities'), 'seed-id');
    assert.equal(url.searchParams.get('filter.location.query'), 'Paris');
    return Response.json({ results: { entities } });
  };
}

test('all routes return localized fallback without a key and make no requests', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Unexpected network request'); };
  for (const locale of ['en', 'ru', 'uk', 'es', 'zh']) {
    for (const route of Object.keys(routes)) {
      const { status, data } = await call(route, { locale });
      assert.equal(status, 200);
      assert.equal(data.meta.fallback, true);
      assert.notEqual(data.meta.source, 'Qloo Insights API');
      assert.ok(data.item || data.items.length);
      if (route !== 'recommend') {
        assert.equal(data.meta.changed, false);
        assert.equal(data.meta.source, undefined);
        assert.equal(data.meta.strategy, undefined);
        assert.ok(data.meta.note);
        assert.deepEqual(route === 'refine' ? data.items : data.item,
          route === 'refine' ? currentItems : currentItems[0]);
      }
    }
  }
});

test('recommend resolves names to IDs, maps live results, deduplicates and applies discovery filter', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const calls = [];
  global.fetch = liveFetch(calls);
  const { data } = await call('recommend', { mode: 'unexpected' });
  assert.equal(data.meta.fallback, false);
  assert.equal(data.items.length, 6);
  assert.equal(data.items[0].name, 'Real place 0');
  assert.equal(data.items[0].address, 'Address 0');
  assert.equal(data.items[0].phase, 'Ранок');
  assert.equal(calls.at(-1).searchParams.get('filter.popularity.max'), '0.82');
});

test('replace excludes current names and retains the existing time and phase', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([]);
  const { data } = await call('replace', { currentNames: ['Real place 0'], replacementStyle: 'surprise' });
  assert.equal(data.item.name, 'Real place 1');
  assert.equal(data.item.time, currentItems[0].time);
  assert.equal(data.item.phase, currentItems[0].phase);
  assert.equal(data.meta.fallback, false);
});

test('refine applies budget/category constraints and preserves the route slots', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const calls = [];
  global.fetch = liveFetch(calls);
  const { data } = await call('refine', { instruction: 'Cheaper restaurants' });
  assert.equal(data.meta.fallback, false);
  assert.deepEqual(data.items.map(i => i.time), currentItems.map(i => i.time));
  assert.equal(calls.at(-1).searchParams.get('filter.price_level.max'), '2');
  assert.equal(calls.at(-1).searchParams.get('filter.tags'), 'urn:tag:genre:place:restaurant');
  assert.equal(calls.at(-1).searchParams.has('signal.interests.entities.query'), false);
});

test('all routes fall back safely on authentication, throttling, invalid JSON and network errors', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  for (const failure of [
    () => new Response('private upstream body', { status: 401 }),
    () => new Response('{}', { status: 429 }),
    () => new Response('invalid json'),
    () => { throw new DOMException('private upstream body', 'TimeoutError'); },
  ]) {
    global.fetch = failure;
    for (const route of Object.keys(routes)) {
      const { status, data } = await call(route);
      assert.equal(status, 200);
      assert.equal(data.meta.fallback, true);
      assert.equal(JSON.stringify(data).includes('private upstream body'), false);
      assert.equal(JSON.stringify(data).includes('test-placeholder'), false);
      if (route !== 'recommend') {
        assert.equal(data.meta.changed, false);
        assert.deepEqual(route === 'refine' ? data.items : data.item,
          route === 'refine' ? currentItems : currentItems[0]);
      }
    }
  }
});

test('empty, duplicate-only and insufficient results use fallback instead of repeating live places', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], []);
  assert.equal((await call('recommend')).data.meta.fallback, true);
  global.fetch = liveFetch([], [currentItems[0], currentItems[0]]);
  assert.equal((await call('replace')).data.meta.fallback, true);
  assert.equal((await call('refine')).data.meta.fallback, true);
  assert.deepEqual((await call('refine')).data.items, currentItems);
});

test('fashion resolves the actual Qloo id field and ignores same-name media tags', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const calls = [];
  const fetchLive = liveFetch(calls);
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [
      { id: 'urn:tag:genre:media:clothing_store', name: 'Clothing store', type: 'urn:tag:genre:media' },
      { id: 'urn:tag:genre:place:clothing_store', name: 'Clothing store', type: 'urn:tag:genre:place' },
      { id: 'urn:tag:category:place:clothing_store', name: 'Clothing store', type: 'urn:tag:category:place' },
    ] } }) : fetchLive(url, init);
  const { data } = await call('refine', { instruction: 'Больше моды и дизайна', locale: 'ru' });
  assert.equal(data.meta.changed, true);
  assert.equal(data.meta.fallback, false);
  assert.equal(calls.at(-1).searchParams.get('filter.tags'), 'urn:tag:genre:place:clothing_store,urn:tag:category:place:clothing_store');
  assert.equal(calls.at(-1).searchParams.get('operator.filter.tags'), 'union');
  assert.deepEqual(data.items.map(i => [i.time, i.phase]), currentItems.map(i => [i.time, i.phase]));
});

test('unresolved category retains the full route, including addresses and explanation fields', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const fetchLive = liveFetch([]);
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [{ id: 'urn:tag:genre:media:fashion', name: 'Fashion' }] } })
    : fetchLive(url, init);
  const items = currentItems.map(i => ({ ...i, reason: 'Existing explanation', bridge: 'Existing bridge', fit: 81 }));
  const { data } = await call('refine', { instruction: 'More fashion', currentItems: items });
  assert.equal(data.meta.changed, false);
  assert.deepEqual(data.items, items);
});

test('unsupported instructions keep the route and do not call Qloo', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  let requests = 0;
  global.fetch = () => { requests++; throw new Error('Unexpected request'); };
  const { data } = await call('refine', { instruction: 'Use only wheelchair-accessible places' });
  assert.equal(requests, 0);
  assert.equal(data.meta.reason, 'unsupported_instruction');
  assert.equal(data.meta.changed, false);
  assert.deepEqual(data.items, currentItems);
});

test('invalid current route items are rejected before searching', async () => {
  assert.equal((await call('refine', { currentItems: [null] })).status, 400);
  assert.equal((await call('replace', { currentItem: {} })).status, 400);
});

test('temporary rate limiting retries once and can recover a live refinement', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const fetchLive = liveFetch([]);
  let attempts = 0;
  global.fetch = async (url, init) => {
    if (url.pathname === '/v2/insights' && attempts++ === 0) {
      return new Response('{}', { status: 429, headers: { 'Retry-After': '0' } });
    }
    return fetchLive(url, init);
  };
  const { data } = await call('refine');
  assert.equal(attempts, 2);
  assert.equal(data.meta.changed, true);
});

test('long Retry-After does not exceed the deadline or replace existing places', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const fetchLive = liveFetch([]);
  let attempts = 0;
  global.fetch = async (url, init) => {
    if (url.pathname === '/v2/insights') {
      attempts++;
      return new Response('{}', { status: 429, headers: { 'Retry-After': '60' } });
    }
    return fetchLive(url, init);
  };
  const { data } = await call('refine');
  assert.equal(attempts, 1);
  assert.equal(data.meta.changed, false);
  assert.deepEqual(data.items, currentItems);
});

test('malformed JSON and missing inputs return a controlled client error', async () => {
  for (const route of Object.keys(routes)) {
    const response = await routes[route](new Request('http://localhost', { method: 'POST', body: '{' }));
    assert.equal(response.status, 400);
    assert.equal((await call(route, { likes: '' })).status, 400);
  }
});

test('role guard rejects obvious venue mismatches and keeps unknown categories conservative', () => {
  const { selectForSlot, selectItinerary } = require('../app/lib/route-quality.ts');
  const hotel = { name: 'Hotel Stop', subtype: 'Hotel' };
  const gallery = { name: 'Art Center', subtype: 'Art gallery' };
  const cafe = { name: 'Neighborhood Cafe', subtype: 'Cafe' };
  const club = { name: 'Club One', subtype: 'Night club' };
  assert.equal(selectForSlot([hotel, gallery, cafe], 2)?.name, 'Neighborhood Cafe');
  assert.equal(selectForSlot([cafe, club], 5)?.name, 'Club One');
  assert.equal(selectForSlot([hotel, gallery], 2), undefined);
  assert.equal(selectForSlot([{ name: 'Unknown venue' }], 2)?.name, 'Unknown venue');
  assert.equal(selectItinerary([gallery, hotel, cafe], 3).length, 0);
});

test('live recommend rejects a hotel in a meal slot instead of presenting an invalid route', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `venue-${i}`, name: `Venue ${i}`,
    subtype: i >= 2 ? 'Hotel' : undefined,
    properties: { address: `Street ${i}` },
  }));
  global.fetch = liveFetch([], entities);
  const { data } = await call('recommend');
  assert.equal(data.meta.fallback, true);
  assert.notEqual(data.meta.source, 'Qloo Insights API');
});

test('replacement keeps current stop when category is inappropriate', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], Array.from({ length: 8 }, (_, i) => ({
    entity_id: `hotel-${i}`, name: `Hotel ${i}`, subtype: 'Hotel',
  })));
  const { data } = await call('replace', { index: 2 });
  assert.equal(data.meta.changed, false);
  assert.deepEqual(data.item, currentItems[0]);
});

test('API does not invent numerical taste fit for live venues', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([]);
  const { data } = await call('recommend');
  assert.equal(data.meta.fallback, false);
  assert.ok(data.items.every(item => item.fit === undefined));
});


test('fashion refinement updates shopping only and keeps all other stops untouched', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `fashion-${i}`, name: `Fashion ${i}`, subtype: 'Clothing store',
    properties: { address: `Style street ${i}` },
  }));
  const fetchLive = liveFetch([], entities);
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [
        { id: 'urn:tag:genre:place:clothing_store', name: 'Clothing store' },
      ] } })
    : fetchLive(url, init);
  const original = currentItems.map(item => ({ ...item, bridge: 'Original bridge', reason: 'Original reason', fit: 80 }));
  const { data } = await call('refine', { instruction: 'Больше моды', currentItems: original });
  assert.equal(data.meta.changed, true);
  assert.deepEqual(data.meta.updatedIndices, [1]);
  assert.equal(data.items[1].name, 'Fashion 0');
  assert.equal(data.items[1].time, original[1].time);
  for (let i = 0; i < original.length; i++) {
    if (i !== 1) assert.deepEqual(data.items[i], original[i]);
  }
});

test('nightlife refinement updates evening slot, not the full itinerary', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `club-${i}`, name: `Club ${i}`, subtype: 'Night club',
    properties: { address: `Evening street ${i}` },
  }));
  const fetchLive = liveFetch([], entities);
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [
        { id: 'urn:tag:genre:place:night_club', name: 'Night club' },
      ] } })
    : fetchLive(url, init);
  const { data } = await call('refine', { instruction: 'Больше ночной жизни' });
  assert.equal(data.meta.changed, true);
  assert.deepEqual(data.meta.updatedIndices, [5]);
  assert.equal(data.items[5].name, 'Club 0');
  assert.deepEqual(data.items.slice(0, 5), currentItems.slice(0, 5));
});

test('a category-constrained refinement does not replace stops with hotels', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const fetchLive = liveFetch([], Array.from({ length: 8 }, (_, i) =>
    ({ entity_id: `hotel-${i}`, name: `Hotel ${i}`, subtype: 'Hotel' })));
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [
        { id: 'urn:tag:genre:place:clothing_store', name: 'Clothing store' },
      ] } })
    : fetchLive(url, init);
  const { data } = await call('refine', { instruction: 'More fashion' });
  assert.equal(data.meta.changed, false);
  assert.deepEqual(data.items, currentItems);
});

test('Qloo internal explainability keys never appear in recommendation reasons', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `place-${i}`, name: `Real place ${i}`,
    query: { explainability: { 'signal.interests.entities': true, arbitrary_internal_key: true } },
    properties: { address: `Address ${i}` },
  }));
  global.fetch = liveFetch([], entities);
  const { data } = await call('recommend', { locale: 'en' });
  assert.equal(data.meta.fallback, false);
  assert.ok(data.items.every(item => !item.reason.includes('signal.interests.entities')));
  assert.ok(data.items.every(item => !item.reason.includes('arbitrary_internal_key')));
});


test('demo routes keep a mixed-source label after one Qloo replacement', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([]);
  const { data } = await call('replace', { locale: 'ru', currentFallback: true });
  assert.equal(data.meta.changed, true);
  assert.equal(data.meta.mixed, true);
  assert.equal(data.meta.fallback, true);
  assert.match(data.meta.source, /демо/i);
});

test('category refinement preserves demo provenance for unchanged stops', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([]);
  const { data } = await call('refine', {
    locale: 'uk', instruction: 'Cheaper restaurants', currentFallback: true,
  });
  assert.equal(data.meta.changed, true);
  assert.deepEqual(data.meta.updatedIndices, [2]);
  assert.equal(data.meta.mixed, true);
  assert.match(data.meta.source, /демо/i);
  assert.equal(data.items[0].name, currentItems[0].name);
});


test('Qloo affinity is passed through only when upstream provides a valid numeric value', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = Array.from({ length: 8 }, (_, i) => ({
    entity_id: `venue-${i}`, name: `Evidence venue ${i}`,
    affinity: i === 0 ? 0.84 : undefined,
    properties: { address: 'Real address', geocode: { latitude: 40.7, longitude: -74.0 } },
  }));
  global.fetch = liveFetch([], entities);
  const { data } = await call('recommend');
  assert.equal(data.meta.fallback, false);
  assert.equal(data.items[0].fit, 84);
  assert.equal(data.items[0].fitSource, 'qloo-affinity');
  assert.deepEqual(data.items[0].coordinates, { lat: 40.7, lng: -74.0 });
  assert.equal(data.items[1].fit, undefined);
  assert.equal(data.items[1].fitSource, undefined);
});

test('demo route does not fabricate affinity values or geographic metadata', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Do not call Qloo in demo mode'); };
  const { data } = await call('recommend');
  assert.equal(data.meta.fallback, true);
  assert.ok(data.items.every(item => item.fit === undefined && item.fitSource === undefined && item.coordinates === undefined));
});

test('Qloo replacement carries actual affinity and coordinates without altering schedule', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const entities = [{
    entity_id: 'new1', name: 'A place with evidence', subtype: 'Museum',
    affinity: 0.74, properties: { latitude: 48.85, longitude: 2.35 },
  }];
  global.fetch = liveFetch([], entities);
  const { data } = await call('replace', { index: 0 });
  assert.equal(data.meta.changed, true);
  assert.equal(data.item.fit, 74);
  assert.equal(data.item.fitSource, 'qloo-affinity');
  assert.deepEqual(data.item.coordinates, { lat: 48.85, lng: 2.35 });
  assert.equal(data.item.time, currentItems[0].time);
});

test('Qloo scoped refinement retains any other stops unchanged and provides score only for updated venue', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const fetchLive = liveFetch([], [{
    entity_id: 'store', name: 'A real clothing shop', subtype: 'Clothing store',
    affinity: 0.62, properties: { latitude: 48.86, longitude: 2.34 },
  }]);
  global.fetch = async (url, init) => url.pathname === '/v2/tags'
    ? Response.json({ results: { tags: [{ id: 'urn:tag:genre:place:clothing_store', name: 'Clothing store' }] } })
    : fetchLive(url, init);
  const original = currentItems.map(item => ({ ...item, fit: 0, reason: 'original', coordinates: { lat: 0, lng: 0 } }));
  const { data } = await call('refine', { instruction: 'More fashion', currentItems: original });
  assert.equal(data.meta.changed, true);
  assert.equal(data.items[1].fit, 62);
  assert.equal(data.items[1].fitSource, 'qloo-affinity');
  assert.deepEqual(data.items[1].coordinates, { lat: 48.86, lng: 2.34 });
  assert.deepEqual(data.items[0], original[0]);
  assert.deepEqual(data.items[2], original[2]);
});


test('recommend includes auditable Qloo provenance and readable types', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const venues = Array.from({ length: 8 }, (_, index) => ({
    name: `Venue ${index}`, type: 'urn:entity:place', affinity: index === 0 ? 0.88 : undefined,
    properties: { geocode: { latitude: 40.7 + index / 1000, longitude: -74 } },
  }));
  global.fetch = liveFetch([], venues);
  const { data } = await call('recommend', { locale: 'uk' });
  assert.equal(data.meta.fallback, false);
  assert.equal(data.items[0].type, 'Місце');
  assert.equal(data.items[0].provenance, 'qloo');
  assert.equal(data.meta.audit.total, 6);
  assert.equal(data.meta.audit.qloo, 6);
  assert.equal(data.meta.audit.demo, 0);
  assert.equal(data.meta.audit.withAffinity, 1);
  assert.equal(data.meta.audit.withCoordinates, 6);
});

test('recommend demo fallback records unavailable evidence honestly', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Network must not be accessed'); };
  const { data } = await call('recommend', { locale: 'ru' });
  assert.equal(data.meta.fallback, true);
  assert.equal(data.meta.fallbackReason, 'qloo_unavailable_or_no_results');
  assert.equal(data.meta.audit.qloo, 0);
  assert.equal(data.meta.audit.demo, 6);
  assert.equal(data.meta.audit.withAffinity, 0);
  assert.equal(data.meta.audit.withCoordinates, 0);
  assert.ok(data.items.every(item => item.provenance === 'demo'));
});


test('recommend distinguishes missing Qloo credential without exposing it', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Network should not be called'); };
  const { data } = await call('recommend', { locale: 'ru' });
  assert.equal(data.meta.qlooStatus, 'missing_key');
  assert.equal(data.meta.fallback, true);
  assert.equal(data.meta.audit.demo, 6);
});

test('recommend reports rejected Qloo credential without exposing the key', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = async () => new Response('{}', { status: 401 });
  const { data } = await call('recommend', { locale: 'uk' });
  assert.equal(data.meta.qlooStatus, 'invalid_key');
  assert.equal(data.meta.fallback, true);
  assert.ok(!JSON.stringify(data).includes('test-placeholder'));
});

test('recommend reports rate limit separately from missing results', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = async () => new Response('{}', { status: 429, headers: { 'retry-after': '120' } });
  const { data } = await call('recommend');
  assert.equal(data.meta.qlooStatus, 'rate_limited');
});

test('recommend reports unmatched interests separately from upstream errors', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = async () => Response.json({ results: [] });
  const { data } = await call('recommend');
  assert.equal(data.meta.qlooStatus, 'no_interest_matches');
  assert.equal(data.meta.audit.demo, 6);
});

test('recommend reports empty Qloo place response separately', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], []);
  const { data } = await call('recommend');
  assert.equal(data.meta.qlooStatus, 'no_results');
});

test('recommend distinguishes insufficient compatible venue categories', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], Array.from({ length: 10 }, (_, i) => ({
    name: `Hotel ${i}`, subtype: 'Hotel',
  })));
  const { data } = await call('recommend');
  assert.equal(data.meta.qlooStatus, 'insufficient_compatible_venues');
});


test('partial Qloo responses keep live venues and fill only missing itinerary slots with labeled demo', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const realPlaces = [
    { entity_id: 'cafe', name: 'Real Midtown Cafe', subtype: 'Restaurant',
      properties: { address: '123 7th Ave' }, affinity: 0.82 },
    { entity_id: 'shop', name: 'Real Fashion Store', subtype: 'Clothing store',
      properties: { address: '5 Fashion Street' } },
  ];
  global.fetch = liveFetch([], realPlaces);
  const { data, status } = await call('recommend', { locale: 'ru' });
  assert.equal(status, 200);
  assert.equal(data.meta.mixed, true);
  assert.equal(data.meta.fallback, true);
  assert.equal(data.meta.matched, 2);
  assert.equal(data.meta.qlooStatus, 'insufficient_compatible_venues');
  assert.equal(data.meta.audit.qloo, 2);
  assert.equal(data.meta.audit.demo, 4);
  assert.equal(data.items.length, 6);
  assert.equal(data.items[2].name, 'Real Midtown Cafe');
  assert.equal(data.items[2].fit, 82);
  assert.equal(data.items[1].name, 'Real Fashion Store');
  assert.equal(data.items[1].provenance, 'qloo');
  assert.equal(data.items[0].provenance, 'demo');
  assert.match(data.meta.source, /Qloo \+ демо/);
});

test('when no Qloo results are available keep honest all-demo route and zero real matches', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Should not call Qloo'); };
  const { data } = await call('recommend');
  assert.equal(data.meta.mixed, undefined);
  assert.equal(data.meta.matched, 0);
  assert.equal(data.meta.audit.qloo, 0);
  assert.equal(data.meta.audit.demo, 6);
});

test('incompatible hotels are never used as live food or nightlife venues', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], [
    { name: 'Hotel A', subtype: 'Hotel' },
    { name: 'Real Restaurant', subtype: 'Restaurant' },
  ]);
  const { data } = await call('recommend');
  assert.equal(data.items[2].name, 'Real Restaurant');
  assert.equal(data.items[2].provenance, 'qloo');
  assert.equal(data.meta.audit.qloo, 1);
  assert.equal(data.meta.audit.demo, 5);
});


test('demo templates do not claim fictional district names as verified addresses', async () => {
  delete process.env.QLOO_API_KEY;
  global.fetch = () => { throw new Error('Qloo should not be called'); };
  const { data } = await call('recommend', { locale: 'uk', city: 'New York' });
  assert.equal(data.meta.fallback, true);
  assert.equal(data.items[0].provenance, 'demo');
  assert.ok(data.items.every(item => item.address === null));
});

test('recommend asks Qloo for the documented maximum of fifty candidates', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  const calls = [];
  global.fetch = liveFetch(calls);
  const { data } = await call('recommend', { locale: 'en' });
  const insights = calls.find(url => url.pathname === '/v2/insights');
  assert.equal(insights.searchParams.get('take'), '50');
  assert.equal(data.meta.qlooCandidateCoverage.returned, 8);
  assert.deepEqual(data.meta.qlooCandidateCoverage.compatiblePerSlot, [8, 8, 8, 8, 8, 8]);
  assert.equal(data.meta.qlooCandidateCoverage.withAddress, 8);
});

test('when Qloo returns few places, candidate summary explains real-vs-demo coverage', async () => {
  process.env.QLOO_API_KEY = 'test-placeholder';
  global.fetch = liveFetch([], [
    { name: 'Real Cafe', subtype: 'Restaurant', properties: { address: 'Street' } },
    { name: 'Real Hotel', subtype: 'Hotel', properties: { geocode: { city: 'Paris' } } },
  ]);
  const { data } = await call('recommend');
  assert.equal(data.meta.qlooCandidateCoverage.returned, 2);
  assert.deepEqual(data.meta.qlooCandidateCoverage.compatiblePerSlot, [0, 0, 1, 0, 0, 0]);
  assert.equal(data.meta.audit.qloo, 1);
  assert.equal(data.meta.audit.demo, 5);
});
