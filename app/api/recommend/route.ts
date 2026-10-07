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

    if (!apiKey) {
      return NextResponse.json({ error: 'QLOO_API_KEY is missing. Add it to .env.local.' }, { status: 500 });
    }

    const interests = likes
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

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
