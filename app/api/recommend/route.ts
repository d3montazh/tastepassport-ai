import { NextResponse } from 'next/server';

type QlooEntity = {
  name?: string;
  title?: string;
  subtype?: string;
  type?: string;
  properties?: Record<string, any>;
  query?: Record<string, any>;
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

function reasonFor(entity: QlooEntity, mode: string) {
  const explain = entity?.query?.explainability;
  if (explain && typeof explain === 'object') {
    const names = Object.keys(explain).slice(0, 2);
    if (names.length) return `Qloo connects this recommendation strongly to ${names.join(' and ')} in your taste profile.`;
  }

  if (mode === 'unexpected') return 'A less obvious cross-domain match chosen to stretch your taste without becoming random.';
  if (mode === 'safe') return 'A high-confidence match close to the interests you already know you enjoy.';
  return 'A balanced Qloo match combining familiarity with a little discovery.';
}

function demoItems(city: string, interests: string[], mode: string) {
  const seed = interests[0] || 'your taste';
  const second = interests[1] || 'your favorite culture';
  const third = interests[2] || 'your style';

  return [
    {
      name: `${city} listening room`,
      type: 'Music · Culture',
      reason: `Demo preview: a music-first stop inspired by ${seed}, chosen to start the route with a strong personal signal.`,
      address: `Central ${city}`,
    },
    {
      name: 'Independent design district',
      type: 'Fashion · Neighborhood',
      reason: `Demo preview: a neighborhood direction that translates the visual language of ${second} into local fashion and design.`,
      address: `${city} design quarter`,
    },
    {
      name: 'Late lunch, local twist',
      type: 'Food',
      reason: `Demo preview: food discovery influenced by ${third}, with the ${mode} discovery setting controlling how adventurous the match feels.`,
      address: `${city} food district`,
    },
    {
      name: 'Hidden cinema & gallery stop',
      type: 'Film · Art',
      reason: `Demo preview: a cross-domain stop connecting your entertainment taste with smaller cultural venues in ${city}.`,
      address: `Creative ${city}`,
    },
    {
      name: 'Golden-hour city texture',
      type: 'Place · Photography',
      reason: 'Demo preview: a visually distinctive place selected to match the mood and aesthetic patterns in your taste profile.',
      address: `${city} viewpoint`,
    },
    {
      name: 'After-dark wildcard',
      type: 'Night · Discovery',
      reason: mode === 'unexpected'
        ? 'Demo preview: the wildcard stop intentionally reaches beyond your obvious preferences while staying culturally adjacent.'
        : 'Demo preview: a comfortable final stop that keeps the route connected to your strongest preferences.',
      address: `${city} after dark`,
    },
  ];
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const likes = String(body?.likes || '').trim();
    const city = String(body?.city || '').trim();
    const mode = String(body?.mode || 'balanced');

    if (!likes || !city) {
      return NextResponse.json({ error: 'Likes and city are required.' }, { status: 400 });
    }

    const apiKey = process.env.QLOO_API_KEY;
    const baseUrl = (process.env.QLOO_BASE_URL || 'https://api.qloo.com/v2').replace(/\/$/, '');
    const interests = likes
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

    // Temporary transparent fallback so the product can be previewed while
    // Qloo access is under maintenance. It is intentionally labelled Demo mode
    // and is replaced automatically as soon as QLOO_API_KEY is configured.
    if (!apiKey) {
      const items = demoItems(city, interests, mode);
      return NextResponse.json({
        summary: `${city}, translated through ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
        items,
        meta: {
          source: 'Demo mode · add QLOO_API_KEY for live Qloo data',
          mode,
          matched: items.length,
        },
      });
    }

    const popularityMax = mode === 'unexpected' ? 0.82 : undefined;
    const take = 8;

    const qlooBody: Record<string, any> = {
      'filter.type': 'urn:entity:place',
      'filter.location.query': city,
      'signal.interests.entities.query': interests,
      'feature.explainability': true,
      take,
    };

    if (popularityMax) qlooBody['filter.popularity.max'] = popularityMax;

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
      console.error('Qloo error:', response.status, data);
      return NextResponse.json(
        { error: `Qloo request failed (${response.status}). Check your API key/base URL and parameters.` },
        { status: 502 },
      );
    }

    const entities = pickEntities(data);
    const items = entities.slice(0, 6).map((entity, index) => {
      const props = entity?.properties || {};
      return {
        name: entity?.name || entity?.title || `Discovery ${index + 1}`,
        type: entity?.subtype || entity?.type || props?.subtype || 'Place',
        reason: reasonFor(entity, mode),
        address: props?.address || props?.formatted_address || null,
      };
    });

    return NextResponse.json({
      summary: `${city}, translated through ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
      items,
      meta: {
        source: 'Qloo Insights API',
        mode,
        matched: items.length,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
