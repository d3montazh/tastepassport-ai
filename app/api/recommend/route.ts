import { NextResponse } from 'next/server';
import { normalizeLocale, type Locale } from '../../i18n';

type QlooEntity = {
  name?: string;
  title?: string;
  subtype?: string;
  type?: string;
  properties?: Record<string, any>;
  query?: Record<string, any>;
};

const routeTimes = ['10:00', '11:45', '13:30', '16:00', '18:30', '21:30'];

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

function copyFor(locale: Locale) {
  if (locale === 'ru') return {
    phases: ['Утро', 'Позднее утро', 'Обед', 'День', 'Золотой час', 'Ночь'],
    sourceDemo: 'Демо-режим · добавьте QLOO_API_KEY для живых данных Qloo',
    strategy: 'Межкатегорийные сигналы собраны в культурный маршрут от утра до ночи',
    liveStrategy: 'Сигналы Qloo собраны в культурный маршрут от утра до ночи',
    summary: (city: string, interests: string[]) => `${city} через призму ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
    unexpectedReason: 'Менее очевидное межкатегорийное совпадение, выбранное, чтобы расширить твой вкус без случайности.',
    safeReason: 'Надёжное совпадение, близкое к интересам, которые тебе уже нравятся.',
    balancedReason: 'Сбалансированное совпадение Qloo: знакомое плюс немного нового.',
    qlooReason: (names: string[]) => `Qloo связывает эту рекомендацию с ${names.join(' и ')} из твоего профиля вкуса.`,
    demo: [
      { name: (city: string) => `${city}: музыкальная гостиная`, type: 'Музыка · Культура', reason: (a: string) => `Демо: музыкальная точка, вдохновлённая ${a}, чтобы начать день с сильного личного сигнала.`, address: (city: string) => `Центр ${city}`, bridge: (a: string) => `${a} → локальная музыкальная культура` },
      { name: () => 'Независимый дизайн-квартал', type: 'Мода · Район', reason: (a: string) => `Демо: район, который переводит визуальный язык ${a} в локальную моду и дизайн.`, address: (city: string) => `Дизайн-квартал ${city}`, bridge: (a: string) => `${a} → локальный язык дизайна` },
      { name: () => 'Поздний обед с локальным акцентом', type: 'Еда', reason: (a: string, mode: string) => `Демо: гастрономическое открытие под влиянием ${a}; режим ${mode} определяет смелость совпадения.`, address: (city: string) => `Гастрорайон ${city}`, bridge: (a: string) => `${a} → гастрономическое открытие` },
      { name: () => 'Скрытый кинотеатр и галерея', type: 'Кино · Искусство', reason: (_a: string, _m: string, city: string) => `Демо: межкатегорийная точка, соединяющая твой экранный вкус с небольшими культурными площадками ${city}.`, address: (city: string) => `Творческий ${city}`, bridge: () => 'экранный вкус → физическая культура' },
      { name: () => 'Городская фактура на золотом часу', type: 'Место · Фотография', reason: (_a: string, _m: string, _c: string, origin: string) => `Демо: визуально выразительное место, подобранное под настроение и эстетику, которые ты привозишь из ${origin || 'дома'}.`, address: (city: string) => `Смотровая точка ${city}`, bridge: (_a: string, _m: string, city: string, origin: string) => `${origin || 'домашняя'} эстетика → фактура ${city}` },
      { name: () => 'Ночной wildcard', type: 'Ночь · Открытие', reason: (_a: string, mode: string) => mode === 'unexpected' ? 'Демо: финальная точка намеренно выходит за очевидные предпочтения, сохраняя культурную близость.' : 'Демо: комфортная финальная точка, связанная с твоими самыми сильными предпочтениями.', address: (city: string) => `${city} после заката`, bridge: () => 'сильнейший сигнал → контролируемый сюрприз' },
    ],
    liveBridge: (interest: string, city: string) => `${interest} → открытие ${city}`,
  };

  if (locale === 'uk') return {
    phases: ['Ранок', 'Пізній ранок', 'Обід', 'День', 'Золота година', 'Ніч'],
    sourceDemo: 'Демо-режим · додайте QLOO_API_KEY для живих даних Qloo',
    strategy: 'Міжкатегорійні сигнали зібрані в культурний маршрут від ранку до ночі',
    liveStrategy: 'Сигнали Qloo зібрані в культурний маршрут від ранку до ночі',
    summary: (city: string, interests: string[]) => `${city} крізь призму ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
    unexpectedReason: 'Менш очевидний міжкатегорійний збіг, обраний, щоб розширити твій смак без випадковості.',
    safeReason: 'Надійний збіг, близький до інтересів, які тобі вже подобаються.',
    balancedReason: 'Збалансований збіг Qloo: знайоме плюс трохи нового.',
    qlooReason: (names: string[]) => `Qloo пов’язує цю рекомендацію з ${names.join(' та ')} у твоєму профілі смаку.`,
    demo: [
      { name: (city: string) => `${city}: музична вітальня`, type: 'Музика · Культура', reason: (a: string) => `Демо: музична точка, натхненна ${a}, щоб почати день із сильного особистого сигналу.`, address: (city: string) => `Центр ${city}`, bridge: (a: string) => `${a} → локальна музична культура` },
      { name: () => 'Незалежний дизайн-квартал', type: 'Мода · Район', reason: (a: string) => `Демо: район, що перекладає візуальну мову ${a} у локальну моду й дизайн.`, address: (city: string) => `Дизайн-квартал ${city}`, bridge: (a: string) => `${a} → локальна мова дизайну` },
      { name: () => 'Пізній обід із локальним акцентом', type: 'Їжа', reason: (a: string, mode: string) => `Демо: гастрономічне відкриття під впливом ${a}; режим ${mode} визначає сміливість збігу.`, address: (city: string) => `Гастрорайон ${city}`, bridge: (a: string) => `${a} → гастрономічне відкриття` },
      { name: () => 'Прихований кінотеатр і галерея', type: 'Кіно · Мистецтво', reason: (_a: string, _m: string, city: string) => `Демо: міжкатегорійна точка, що поєднує твій екранний смак із невеликими культурними просторами ${city}.`, address: (city: string) => `Творчий ${city}`, bridge: () => 'екранний смак → фізична культура' },
      { name: () => 'Міська фактура золотої години', type: 'Місце · Фотографія', reason: (_a: string, _m: string, _c: string, origin: string) => `Демо: виразне місце, підібране під настрій та естетику, які ти привозиш із ${origin || 'дому'}.`, address: (city: string) => `Оглядова точка ${city}`, bridge: (_a: string, _m: string, city: string, origin: string) => `${origin || 'домашня'} естетика → фактура ${city}` },
      { name: () => 'Нічний wildcard', type: 'Ніч · Відкриття', reason: (_a: string, mode: string) => mode === 'unexpected' ? 'Демо: фінальна точка навмисно виходить за очевидні вподобання, зберігаючи культурну близькість.' : 'Демо: комфортна фінальна точка, пов’язана з твоїми найсильнішими вподобаннями.', address: (city: string) => `${city} після заходу сонця`, bridge: () => 'найсильніший сигнал → контрольований сюрприз' },
    ],
    liveBridge: (interest: string, city: string) => `${interest} → відкриття ${city}`,
  };

  if (locale === 'es') return {
    phases: ['Mañana', 'Media mañana', 'Almuerzo', 'Tarde', 'Hora dorada', 'Noche'],
    sourceDemo: 'Modo demo · añade QLOO_API_KEY para datos Qloo en vivo',
    strategy: 'Señales entre categorías organizadas en una ruta cultural de la mañana a la noche',
    liveStrategy: 'Señales de Qloo organizadas en una ruta cultural de la mañana a la noche',
    summary: (city: string, interests: string[]) => `${city}, traducido a través de ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
    unexpectedReason: 'Una coincidencia menos obvia entre categorías, elegida para ampliar tu gusto sin volverse aleatoria.',
    safeReason: 'Una coincidencia de alta confianza cercana a los intereses que ya disfrutas.',
    balancedReason: 'Una coincidencia equilibrada de Qloo que mezcla familiaridad con descubrimiento.',
    qlooReason: (names: string[]) => `Qloo conecta esta recomendación con ${names.join(' y ')} de tu perfil de gusto.`,
    demo: [
      { name: (city: string) => `Sala de escucha de ${city}`, type: 'Música · Cultura', reason: (a: string) => `Demo: una parada centrada en música inspirada por ${a}, elegida para empezar con una señal personal fuerte.`, address: (city: string) => `Centro de ${city}`, bridge: (a: string) => `${a} → cultura musical local` },
      { name: () => 'Distrito de diseño independiente', type: 'Moda · Barrio', reason: (a: string) => `Demo: un barrio que traduce el lenguaje visual de ${a} a moda y diseño locales.`, address: (city: string) => `Distrito de diseño de ${city}`, bridge: (a: string) => `${a} → lenguaje de diseño local` },
      { name: () => 'Almuerzo tardío con giro local', type: 'Comida', reason: (a: string, mode: string) => `Demo: descubrimiento gastronómico influido por ${a}; el modo ${mode} controla lo aventurera que se siente la coincidencia.`, address: (city: string) => `Distrito gastronómico de ${city}`, bridge: (a: string) => `${a} → descubrimiento gastronómico` },
      { name: () => 'Cine oculto y galería', type: 'Cine · Arte', reason: (_a: string, _m: string, city: string) => `Demo: una parada entre categorías que conecta tu gusto audiovisual con espacios culturales pequeños de ${city}.`, address: (city: string) => `${city} creativo`, bridge: () => 'gusto audiovisual → cultura física' },
      { name: () => 'Textura urbana en hora dorada', type: 'Lugar · Fotografía', reason: (_a: string, _m: string, _c: string, origin: string) => `Demo: un lugar visualmente distintivo elegido para coincidir con el estado de ánimo y la estética que traes de ${origin || 'casa'}.`, address: (city: string) => `Mirador de ${city}`, bridge: (_a: string, _m: string, city: string, origin: string) => `estética de ${origin || 'casa'} → textura de ${city}` },
      { name: () => 'Comodín nocturno', type: 'Noche · Descubrimiento', reason: (_a: string, mode: string) => mode === 'unexpected' ? 'Demo: la parada final se aleja intencionalmente de tus preferencias obvias sin perder cercanía cultural.' : 'Demo: una parada final cómoda que mantiene la ruta conectada con tus preferencias más fuertes.', address: (city: string) => `${city} de noche`, bridge: () => 'señal más fuerte → sorpresa controlada' },
    ],
    liveBridge: (interest: string, city: string) => `${interest} → descubrimiento en ${city}`,
  };

  if (locale === 'zh') return {
    phases: ['上午', '上午晚些时候', '午餐', '下午', '黄金时刻', '夜晚'],
    sourceDemo: '演示模式 · 添加 QLOO_API_KEY 以启用实时 Qloo 数据',
    strategy: '将跨领域信号编排成从早到晚的文化路线',
    liveStrategy: '将 Qloo 品味信号编排成从早到晚的文化路线',
    summary: (city: string, interests: string[]) => `${city} · 通过 ${interests.slice(0, 3).join('、')}${interests.length > 3 ? '…' : ''} 翻译你的品味`,
    unexpectedReason: '一个不那么明显的跨领域匹配，用来拓展你的品味，同时避免随机感。',
    safeReason: '一个高置信度匹配，贴近你已经喜欢的兴趣。',
    balancedReason: '一个平衡的 Qloo 匹配，在熟悉感和新发现之间取得平衡。',
    qlooReason: (names: string[]) => `Qloo 将这条推荐与你品味档案中的 ${names.join(' 和 ')} 强关联。`,
    demo: [
      { name: (city: string) => `${city} 听音空间`, type: '音乐 · 文化', reason: (a: string) => `演示：以 ${a} 为灵感的音乐优先站点，用强烈的个人信号开启路线。`, address: (city: string) => `${city} 市中心`, bridge: (a: string) => `${a} → 本地音乐文化` },
      { name: () => '独立设计街区', type: '时尚 · 街区', reason: (a: string) => `演示：把 ${a} 的视觉语言翻译成本地时尚与设计的街区方向。`, address: (city: string) => `${city} 设计街区`, bridge: (a: string) => `${a} → 本地设计语言` },
      { name: () => '带本地风味的晚午餐', type: '美食', reason: (a: string, mode: string) => `演示：受到 ${a} 影响的美食探索；${mode} 模式控制匹配的冒险程度。`, address: (city: string) => `${city} 美食街区`, bridge: (a: string) => `${a} → 美食探索` },
      { name: () => '隐藏影院与画廊', type: '电影 · 艺术', reason: (_a: string, _m: string, city: string) => `演示：一个跨领域站点，把你的影视品味连接到 ${city} 更小众的文化空间。`, address: (city: string) => `创意 ${city}`, bridge: () => '银幕品味 → 实体文化' },
      { name: () => '黄金时刻的城市质感', type: '地点 · 摄影', reason: (_a: string, _m: string, _c: string, origin: string) => `演示：选择一个视觉上鲜明的地点，匹配你从 ${origin || '家乡'} 带来的情绪与审美。`, address: (city: string) => `${city} 观景点`, bridge: (_a: string, _m: string, city: string, origin: string) => `${origin || '家乡'} 审美 → ${city} 城市质感` },
      { name: () => '夜间惊喜站', type: '夜晚 · 探索', reason: (_a: string, mode: string) => mode === 'unexpected' ? '演示：最后一站会故意超出你最明显的偏好，同时保持文化上的邻近感。' : '演示：一个舒适的最后一站，让路线继续贴近你最强的偏好。', address: (city: string) => `${city} 夜间`, bridge: () => '最强信号 → 可控惊喜' },
    ],
    liveBridge: (interest: string, city: string) => `${interest} → ${city} 探索`,
  };

  return {
    phases: ['Morning', 'Late morning', 'Lunch', 'Afternoon', 'Golden hour', 'Night'],
    sourceDemo: 'Demo mode · add QLOO_API_KEY for live Qloo data',
    strategy: 'Cross-domain signals sequenced into a morning-to-night cultural route',
    liveStrategy: 'Qloo taste signals sequenced into a morning-to-night cultural route',
    summary: (city: string, interests: string[]) => `${city}, translated through ${interests.slice(0, 3).join(', ')}${interests.length > 3 ? '…' : ''}`,
    unexpectedReason: 'A less obvious cross-domain match chosen to stretch your taste without becoming random.',
    safeReason: 'A high-confidence match close to the interests you already know you enjoy.',
    balancedReason: 'A balanced Qloo match combining familiarity with a little discovery.',
    qlooReason: (names: string[]) => `Qloo connects this recommendation strongly to ${names.join(' and ')} in your taste profile.`,
    demo: [
      { name: (city: string) => `${city} listening room`, type: 'Music · Culture', reason: (a: string) => `Demo preview: a music-first stop inspired by ${a}, chosen to start the route with a strong personal signal.`, address: (city: string) => `Central ${city}`, bridge: (a: string) => `${a} → local music culture` },
      { name: () => 'Independent design district', type: 'Fashion · Neighborhood', reason: (a: string) => `Demo preview: a neighborhood direction that translates the visual language of ${a} into local fashion and design.`, address: (city: string) => `${city} design quarter`, bridge: (a: string) => `${a} → local design language` },
      { name: () => 'Late lunch, local twist', type: 'Food', reason: (a: string, mode: string) => `Demo preview: food discovery influenced by ${a}, with the ${mode} discovery setting controlling how adventurous the match feels.`, address: (city: string) => `${city} food district`, bridge: (a: string) => `${a} → food discovery` },
      { name: () => 'Hidden cinema & gallery stop', type: 'Film · Art', reason: (_a: string, _m: string, city: string) => `Demo preview: a cross-domain stop connecting your entertainment taste with smaller cultural venues in ${city}.`, address: (city: string) => `Creative ${city}`, bridge: () => 'screen taste → physical culture' },
      { name: () => 'Golden-hour city texture', type: 'Place · Photography', reason: (_a: string, _m: string, _c: string, origin: string) => `Demo preview: a visually distinctive place selected to match the mood and aesthetic patterns you bring from ${origin || 'home'}.`, address: (city: string) => `${city} viewpoint`, bridge: (_a: string, _m: string, city: string, origin: string) => `${origin || 'home'} aesthetic → ${city} texture` },
      { name: () => 'After-dark wildcard', type: 'Night · Discovery', reason: (_a: string, mode: string) => mode === 'unexpected' ? 'Demo preview: the wildcard stop intentionally reaches beyond your obvious preferences while staying culturally adjacent.' : 'Demo preview: a comfortable final stop that keeps the route connected to your strongest preferences.', address: (city: string) => `${city} after dark`, bridge: () => 'strongest signal → controlled surprise' },
    ],
    liveBridge: (interest: string, city: string) => `${interest} → ${city} discovery`,
  };
}

function reasonFor(entity: QlooEntity, mode: string, locale: Locale) {
  const c = copyFor(locale);
  const explain = entity?.query?.explainability;
  if (explain && typeof explain === 'object') {
    const names = Object.keys(explain).slice(0, 2);
    if (names.length) return c.qlooReason(names);
  }

  if (mode === 'unexpected') return c.unexpectedReason;
  if (mode === 'safe') return c.safeReason;
  return c.balancedReason;
}

function demoItems(city: string, origin: string, interests: string[], mode: string, locale: Locale) {
  const seed = interests[0] || 'Taste DNA';
  const second = interests[1] || seed;
  const third = interests[2] || seed;
  const signals = [seed, second, third, seed, seed, seed];
  const c = copyFor(locale);

  return c.demo.map((template, index) => ({
    name: template.name(city),
    type: template.type,
    reason: template.reason(signals[index], mode, city, origin),
    address: template.address(city),
    bridge: template.bridge(signals[index], mode, city, origin),
    fit: index === 0 ? 94 : index === 1 ? 89 : index === 2 ? 86 : index === 3 ? 82 : index === 4 ? 79 : mode === 'unexpected' ? 74 : 84,
    time: routeTimes[index],
    phase: c.phases[index],
  }));
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const likes = String(body?.likes || '').trim();
    const city = String(body?.city || '').trim();
    const origin = String(body?.origin || '').trim();
    const mode = String(body?.mode || 'balanced');
    const locale = normalizeLocale(body?.locale);

    if (!likes || !city) {
      return NextResponse.json({ error: 'Likes and destination city are required.' }, { status: 400 });
    }

    const apiKey = process.env.QLOO_API_KEY;
    const baseUrl = (process.env.QLOO_BASE_URL || 'https://api.qloo.com/v2').replace(/\/$/, '');
    const interests = likes
      .split(/[,\n]/)
      .map((x) => x.trim())
      .filter(Boolean)
      .slice(0, 8);
    const c = copyFor(locale);

    if (!apiKey) {
      const items = demoItems(city, origin, interests, mode, locale);
      return NextResponse.json({
        summary: c.summary(city, interests),
        items,
        meta: {
          source: c.sourceDemo,
          mode,
          matched: items.length,
          origin,
          destination: city,
          strategy: c.strategy,
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
        reason: reasonFor(entity, mode, locale),
        address: props?.address || props?.formatted_address || null,
        time: routeTimes[index],
        phase: c.phases[index],
        bridge: c.liveBridge(interests[index % Math.max(interests.length, 1)] || 'Taste DNA', city),
        fit: Math.max(68, 94 - index * 5),
      };
    });

    return NextResponse.json({
      summary: c.summary(city, interests),
      items,
      meta: {
        source: 'Qloo Insights API',
        mode,
        matched: items.length,
        origin,
        destination: city,
        strategy: c.liveStrategy,
      },
    });
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Unexpected server error.' }, { status: 500 });
  }
}
