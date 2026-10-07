import { NextResponse } from 'next/server';

type QlooEntity = {
  name?: string;
  title?: string;
  subtype?: string;
  type?: string;
  properties?: Record<string, any>;
  query?: Record<string, any>;
};

type CurrentItem = {
  name?: string;
  type?: string;
  reason?: string;
  address?: string | null;
  time?: string;
  phase?: string;
  bridge?: string;
  fit?: number;
};

function pickEntities(payload: any): QlooEntity[] {
  const candidates = [
    payload?.results?.entities,
    payload?.results,
    payload?.entities,
    payload?.data?.results?.entities,
    payload?.data?.entities,
  ];

  for (const value of candidates) {
    if (Array.isArray(value)) return value;
  }
  return [];
}

function demoPool(city: string, interests: string[], index: number) {
  const seed = interests[index % Math.max(interests.length, 1)] || 'your taste';
  const pools = [
    [
      ['Vinyl bar & listening salon', 'Music · Culture', `${seed} → intimate local music culture`, 92],
      ['Independent radio studio visit', 'Music · Community', `${seed} → emerging local sound`, 88],
      ['Small-label record stop', 'Music · Discovery', `${seed} → underground catalog`, 84],
    ],
    [
      ['Local concept-store cluster', 'Fashion · Design', `${seed} → independent design language`, 91],
      ['Archive fashion stop', 'Fashion · Culture', `${seed} → local fashion history`, 86],
      ['Designer workshop district', 'Fashion · Neighborhood', `${seed} → maker culture`, 82],
    ],
    [
      ['Chef-counter lunch', 'Food · Local', `${seed} → local flavor translation`, 90],
      ['Neighborhood tasting room', 'Food · Discovery', `${seed} → regional ingredients`, 85],
      ['Tiny market food crawl', 'Food · Street', `${seed} → everyday local taste`, 81],
    ],
    [
      ['Microcinema & art-book stop', 'Film · Art', `${seed} → independent screen culture`, 89],
      ['Artist-run gallery block', 'Art · Community', `${seed} → emerging local scene`, 84],
      ['Design archive & screening room', 'Film · Design', `${seed} → visual culture`, 80],
    ],
    [
      ['Rooftop texture walk', 'Place · Photography', `${seed} → city atmosphere`, 88],
      ['Architecture detour', 'Place · Design', `${seed} → built-environment match`, 83],
      ['Riverfront golden-hour path', 'Place · Mood', `${seed} → visual rhythm`, 79],
    ],
    [
      ['Late-night listening bar', 'Night · Music', `${seed} → after-dark culture`, 87],
      ['Basement cultural club', 'Night · Discovery', `${seed} → controlled surprise`, 82],
      ['Night-market wildcard', 'Night · Food', `${seed} → spontaneous local energy`, 77],
    ],
  ];

  return (pools[index] || pools[0]).map(([name, type, bridge, fit]) => ({
    name: `${city} ${name}`,
    type,
    bridge,
    fit,
    address: `${city} · local recommendation`,
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const likes = String(body?.likes || '').trim();
    const city = String(body?.city || '').trim();
    const origin = String(body?.origin || '').trim();
    const mode = String(body?.mode || 'balanced');
    const replacementStyle = body?.replacementStyle === 'surprise' ? 'surprise' : 'closer';
    const index = Number.isFinite(Number(body?.index)) ? Number(body.index) : 0;
    const currentItem: CurrentItem = body?.currentItem || {};
    const currentNames = Array.isArray(body?.currentNames)
      ? body.currentNames.map((name: unknown) => String(name).toLowerCase())
      : [];

    if (!likes || !city) {
      return NextResponse.json({ error: 'Likes and destination city are required.' }, { status: 400 });
    }

    const interests = likes
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

    const apiKey = process.env.QLOO_API_KEY;
    const baseUrl = (process.env.QLOO_BASE_URL || 'https://api.qloo.com/v2').replace(/\/$/, '');

    if (!apiKey) {
      const pool = demoPool(city, interests, index);
      const choice = pool.find((item) => !currentNames.includes(String(item.name).toLowerCase())) || pool[0];
      const item = {
        ...choice,
        time: currentItem.time,
        phase: currentItem.phase,
        reason: replacementStyle === 'surprise'
          ? `Agent replacement: a more adventurous alternative that stays culturally adjacent to your Taste DNA while moving beyond the obvious ${currentItem.type || 'match'}.`
          : `Agent replacement: a closer-fit alternative selected to stay near your strongest signals while preserving this stop's role in the route.`,
        fit: replacementStyle === 'surprise' ? Math.max(72, Number(choice.fit) - 6) : choice.fit,
      };

      return NextResponse.json({
        item,
        meta: {
          source: 'Demo mode',
          action: replacementStyle,
          note: replacementStyle === 'surprise'
            ? 'Agent widened the discovery radius for this stop only.'
            : 'Agent tightened this stop toward your existing taste.',
        },
      });
    }

    const qlooBody: Record<string, any> = {
      'filter.type': 'urn:entity:place',
      'filter.location.query': city,
      'signal.interests.entities.query': interests,
      'feature.explainability': true,
      take: 16,
    };

    if (replacementStyle === 'surprise' || mode === 'unexpected') {
      qlooBody['filter.popularity.max'] = 0.72;
    }

    const response = await fetch(`${baseUrl}/insights`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'X-Api-Key': apiKey,
      },
      body: JSON.stringify(qlooBody),
      cache: 'no-store',
    });

    const rawText = await response.text();
    let data: any = {};
    try {
      data = rawText ? JSON.parse(rawText) : {};
    } catch {
      data = { raw: rawText };
    }

    if (!response.ok) {
      return NextResponse.json({ error: `Qloo replacement request failed (${response.status}).` }, { status: 502 });
    }

    const entities = pickEntities(data);
    const entity = entities.find((candidate) => {
      const name = String(candidate?.name || candidate?.title || '').toLowerCase();
      return name && !currentNames.includes(name);
    }) || entities[0];

    if (!entity) {
      return NextResponse.json({ error: 'No alternative Qloo match was available for this stop.' }, { status: 404 });
    }

    const props = entity?.properties || {};
    const item = {
      name: entity?.name || entity?.title || 'Alternative discovery',
      type: entity?.subtype || entity?.type || props?.subtype || currentItem.type || 'Place',
      address: props?.address || props?.formatted_address || null,
      time: currentItem.time,
      phase: currentItem.phase,
      reason: replacementStyle === 'surprise'
        ? 'Qloo found a less obvious alternative that broadens this single stop while preserving the rest of your route.'
        : 'Qloo found a closer alternative anchored more tightly to your existing taste signals.',
      bridge: `${interests[index % Math.max(interests.length, 1)] || 'your taste'} → ${city} alternative`,
      fit: replacementStyle === 'surprise' ? 78 : 91,
    };

    return NextResponse.json({
      item,
      meta: {
        source: 'Qloo Insights API',
        action: replacementStyle,
        origin,
        destination: city,
        note: replacementStyle === 'surprise'
          ? 'Agent widened the discovery radius for this stop only.'
          : 'Agent tightened this stop toward your existing taste.',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected replacement error.' }, { status: 500 });
  }
}
