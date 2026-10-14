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
