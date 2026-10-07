import { NextResponse } from 'next/server';

type RouteItem = {
  name?: string;
  type?: string;
  reason?: string;
  address?: string | null;
  time?: string;
  phase?: string;
  bridge?: string;
  fit?: number;
};

type QlooEntity = {
  name?: string;
  title?: string;
  subtype?: string;
  type?: string;
  properties?: Record<string, any>;
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

function intentFromInstruction(instruction: string) {
  const text = instruction.toLowerCase();
  return {
    lessTouristy: /less tourist|non[- ]?tourist|local|hidden|underground/.test(text),
    fashion: /fashion|style|design|clothes|shopping/.test(text),
    budget: /cheap|cheaper|budget|affordable|low cost/.test(text),
    nightlife: /night|nightlife|club|bar|late/.test(text),
    food: /food|restaurant|eat|lunch|dinner|cafe/.test(text),
    music: /music|concert|vinyl|listening/.test(text),
    art: /art|gallery|museum|cinema|film/.test(text),
  };
}

function demoRefine(city: string, interests: string[], instruction: string, currentItems: RouteItem[]) {
  const intent = intentFromInstruction(instruction);
  const seed = interests[0] || 'your taste';

  return currentItems.map((item, index) => {
    let name = item.name || `${city} discovery stop`;
    let type = item.type || 'Discovery';
    let reason = `Agent refinement: this stop was adjusted around “${instruction}” while preserving its place in the day.`;
    let bridge = item.bridge || `${seed} → ${city}`;
    let fit = Math.max(72, Number(item.fit || 84));

    if (intent.lessTouristy) {
      const names = ['Neighborhood listening room', 'Independent maker block', 'Backstreet lunch counter', 'Artist-run microcinema', 'Local texture walk', 'Low-key late bar'];
      name = `${city} ${names[index] || 'local hidden stop'}`;
      reason = 'Agent refinement: shifted away from headline attractions toward smaller, locally oriented places and cultural pockets.';
      bridge = `${seed} → less-touristy local culture`;
      fit = Math.min(96, fit + 2);
    }

    if (intent.fashion) {
      const names = ['Concept store & sound space', 'Independent design district', 'Designer cafe stop', 'Fashion archive & gallery', 'Street-style photo walk', 'Creative after-hours spot'];
      name = `${city} ${names[index] || 'design-led stop'}`;
      type = index === 2 ? 'Food · Design' : index === 5 ? 'Night · Style' : 'Fashion · Culture';
      reason = 'Agent refinement: increased the route’s fashion and design weight while keeping the original morning-to-night rhythm.';
      bridge = `${interests[2] || seed} → local fashion language`;
    }

    if (intent.budget) {
      const names = ['Free cultural walk', 'Affordable local design stop', 'Neighborhood lunch counter', 'Low-cost indie screening', 'Public-space photo route', 'Budget-friendly night stop'];
      name = `${city} ${names[index] || 'budget discovery'}`;
      reason = 'Agent refinement: prioritized lower-cost and public-space experiences without flattening the cultural personality of the route.';
      bridge = `${seed} → high-value local discovery`;
    }

    if (intent.nightlife && index >= 3) {
      const names = ['Late gallery crossover', 'Sunset listening terrace', 'After-dark music wildcard'];
      name = `${city} ${names[index - 3] || 'nightlife stop'}`;
      type = index === 3 ? 'Art · Night' : index === 4 ? 'Music · Evening' : 'Nightlife · Discovery';
      reason = 'Agent refinement: pushed the second half of the route toward stronger after-dark energy and nightlife discovery.';
      bridge = `${seed} → ${city} after dark`;
    }

    if (intent.food && (index === 1 || index === 2 || index === 5)) {
      name = `${city} ${['market tasting stop', 'chef-counter lunch', 'late food wildcard'][index === 1 ? 0 : index === 2 ? 1 : 2]}`;
      type = 'Food · Local';
      reason = 'Agent refinement: increased the food signal with locally grounded places that still connect back to the user’s wider Taste DNA.';
      bridge = `${interests[3] || seed} → local food culture`;
    }

    if (intent.music && (index === 0 || index === 4 || index === 5)) {
      name = `${city} ${index === 0 ? 'listening salon' : index === 4 ? 'sunset record stop' : 'late-night music room'}`;
      type = 'Music · Culture';
      reason = 'Agent refinement: made music a stronger connective thread across the route instead of leaving it as a single isolated stop.';
      bridge = `${seed} → local sound culture`;
    }

    if (intent.art && (index === 1 || index === 3 || index === 4)) {
      name = `${city} ${index === 1 ? 'design gallery pocket' : index === 3 ? 'microcinema & gallery' : 'architecture art walk'}`;
      type = 'Art · Culture';
      reason = 'Agent refinement: increased visual culture, film and art weight while keeping the route balanced with the user’s other signals.';
      bridge = `${interests[1] || seed} → physical visual culture`;
    }

    return {
      ...item,
      name,
      type,
      reason,
      bridge,
      fit,
      address: item.address || `${city} · refined recommendation`,
    };
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const likes = String(body?.likes || '').trim();
    const city = String(body?.city || '').trim();
    const origin = String(body?.origin || '').trim();
    const mode = String(body?.mode || 'balanced');
    const instruction = String(body?.instruction || '').trim();
    const currentItems: RouteItem[] = Array.isArray(body?.currentItems) ? body.currentItems.slice(0, 6) : [];

    if (!likes || !city || !instruction || !currentItems.length) {
      return NextResponse.json({ error: 'Taste, city, instruction and an existing route are required.' }, { status: 400 });
    }

    const interests = likes
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);

    const apiKey = process.env.QLOO_API_KEY;
    const baseUrl = (process.env.QLOO_BASE_URL || 'https://api.qloo.com/v2').replace(/\/$/, '');
    const intent = intentFromInstruction(instruction);

    if (!apiKey) {
      const items = demoRefine(city, interests, instruction, currentItems);
      return NextResponse.json({
        items,
        meta: {
          source: 'Demo mode',
          origin,
          destination: city,
          instruction,
          strategy: `Agent rebalanced the full route around: “${instruction}”`,
          note: 'Full-route natural-language refinement applied while preserving the day structure.',
        },
      });
    }

    const qlooBody: Record<string, any> = {
      'filter.type': 'urn:entity:place',
      'filter.location.query': city,
      'signal.interests.entities.query': [...interests, instruction].slice(0, 9),
      'feature.explainability': true,
      take: 20,
    };

    if (intent.lessTouristy || mode === 'unexpected') qlooBody['filter.popularity.max'] = 0.65;

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
      return NextResponse.json({ error: `Qloo refinement request failed (${response.status}).` }, { status: 502 });
    }

    const entities = pickEntities(data);
    if (!entities.length) {
      return NextResponse.json({ error: 'Qloo returned no matches for this refinement.' }, { status: 404 });
    }

    const items = currentItems.map((current, index) => {
      const entity = entities[index % entities.length];
      const props = entity?.properties || {};
      return {
        ...current,
        name: entity?.name || entity?.title || current.name || `Discovery ${index + 1}`,
        type: entity?.subtype || entity?.type || props?.subtype || current.type || 'Place',
        address: props?.address || props?.formatted_address || current.address || null,
        reason: `Qloo refinement: this stop was re-selected to better satisfy “${instruction}” while keeping the route’s existing time slot and overall flow.`,
        bridge: `${interests[index % Math.max(interests.length, 1)] || 'your taste'} + ${instruction} → ${city}`,
        fit: Math.max(74, 93 - index * 4),
      };
    });

    return NextResponse.json({
      items,
      meta: {
        source: 'Qloo Insights API',
        origin,
        destination: city,
        instruction,
        strategy: `Qloo-backed agent rebalanced the full route around: “${instruction}”`,
        note: 'Full-route natural-language refinement applied while preserving the day structure.',
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected route refinement error.' }, { status: 500 });
  }
}
