import { qlooPlaces, fallbackSource, requestError } from '../../lib/qloo';
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


function copyFor(locale: Locale) {
  if (locale === 'ru') return {
    required: 'Нужны интересы и город назначения.', noAlternative: 'Для этой точки не нашлось альтернативы Qloo.', unexpected: 'Неожиданная альтернатива', place: 'Место', local: 'локальная рекомендация',
    demoCloser: 'Агент выбрал более близкую альтернативу к твоим сильнейшим вкусовым сигналам, сохранив роль этой точки в маршруте.',
    demoSurprise: 'Агент выбрал более смелую альтернативу, которая остаётся культурно близкой к твоему Taste DNA, но выходит за очевидное совпадение.',
    liveCloser: 'Qloo нашёл более близкую альтернативу, сильнее привязанную к твоим существующим вкусовым сигналам.',
    liveSurprise: 'Qloo нашёл менее очевидную альтернативу, которая расширяет только эту точку, сохраняя остальной маршрут.',
    noteCloser: 'Агент приблизил только эту точку к твоему вкусу.', noteSurprise: 'Агент расширил радиус открытий только для этой точки.', bridge: 'альтернатива',
    pools: [
      [['винил-бар и listening salon','Музыка · Культура','интимная локальная музыкальная культура'],['визит в независимую радиостудию','Музыка · Сообщество','новая локальная сцена'],['точка независимого лейбла','Музыка · Открытие','андеграундный каталог']],
      [['кластер локальных concept stores','Мода · Дизайн','независимый язык дизайна'],['архивная fashion-точка','Мода · Культура','локальная история моды'],['район дизайнерских мастерских','Мода · Район','культура создателей']],
      [['обед за стойкой шефа','Еда · Локальное','перевод локального вкуса'],['районная дегустационная','Еда · Открытие','региональные ингредиенты'],['мини-маршрут по рынку','Еда · Улица','повседневный местный вкус']],
      [['микрокинотеатр и арт-книги','Кино · Искусство','независимая экранная культура'],['квартал независимых галерей','Искусство · Сообщество','новая локальная сцена'],['дизайн-архив и screening room','Кино · Дизайн','визуальная культура']],
      [['прогулка по городским фактурам','Место · Фотография','атмосфера города'],['архитектурный detour','Место · Дизайн','совпадение со средой'],['маршрут у воды на золотом часу','Место · Настроение','визуальный ритм']],
      [['ночной listening bar','Ночь · Музыка','культура после заката'],['подвальный культурный клуб','Ночь · Открытие','контролируемый сюрприз'],['ночной рынок-wildcard','Ночь · Еда','спонтанная локальная энергия']],
    ],
  };
  if (locale === 'uk') return {
    required: 'Потрібні інтереси та місто призначення.', noAlternative: 'Для цієї точки не знайшлося альтернативи Qloo.', unexpected: 'Неочікувана альтернатива', place: 'Місце', local: 'локальна рекомендація',
    demoCloser: 'Агент обрав ближчу альтернативу до твоїх найсильніших смакових сигналів, зберігши роль цієї точки в маршруті.',
    demoSurprise: 'Агент обрав сміливішу альтернативу, що лишається культурно близькою до твого Taste DNA, але виходить за очевидний збіг.',
    liveCloser: 'Qloo знайшов ближчу альтернативу, сильніше прив’язану до твоїх смакових сигналів.',
    liveSurprise: 'Qloo знайшов менш очевидну альтернативу, що розширює лише цю точку, зберігаючи решту маршруту.',
    noteCloser: 'Агент наблизив лише цю точку до твого смаку.', noteSurprise: 'Агент розширив радіус відкриттів лише для цієї точки.', bridge: 'альтернатива',
    pools: [
      [['вініл-бар і listening salon','Музика · Культура','інтимна локальна музична культура'],['візит до незалежної радіостудії','Музика · Спільнота','нова локальна сцена'],['точка незалежного лейбла','Музика · Відкриття','андеграундний каталог']],
      [['кластер локальних concept stores','Мода · Дизайн','незалежна мова дизайну'],['архівна fashion-точка','Мода · Культура','локальна історія моди'],['район дизайнерських майстерень','Мода · Район','культура творців']],
      [['обід за стійкою шефа','Їжа · Локальне','переклад локального смаку'],['районна дегустаційна','Їжа · Відкриття','регіональні інгредієнти'],['міні-маршрут ринком','Їжа · Вулиця','повсякденний місцевий смак']],
      [['мікрокінотеатр і арт-книги','Кіно · Мистецтво','незалежна екранна культура'],['квартал незалежних галерей','Мистецтво · Спільнота','нова локальна сцена'],['дизайн-архів і screening room','Кіно · Дизайн','візуальна культура']],
      [['прогулянка міськими фактурами','Місце · Фотографія','атмосфера міста'],['архітектурний detour','Місце · Дизайн','збіг із середовищем'],['маршрут біля води на золотій годині','Місце · Настрій','візуальний ритм']],
      [['нічний listening bar','Ніч · Музика','культура після заходу сонця'],['підвальний культурний клуб','Ніч · Відкриття','контрольований сюрприз'],['нічний ринок-wildcard','Ніч · Їжа','спонтанна локальна енергія']],
    ],
  };
  if (locale === 'es') return {
    required: 'Se necesitan gustos y ciudad de destino.', noAlternative: 'No había una alternativa de Qloo disponible para esta parada.', unexpected: 'Descubrimiento alternativo', place: 'Lugar', local: 'recomendación local',
    demoCloser: 'El agente eligió una alternativa más cercana a tus señales de gusto más fuertes, conservando el papel de esta parada.',
    demoSurprise: 'El agente eligió una alternativa más aventurera que sigue cerca de tu Taste DNA, pero va más allá de la coincidencia obvia.',
    liveCloser: 'Qloo encontró una alternativa más cercana y anclada a tus señales de gusto actuales.', liveSurprise: 'Qloo encontró una alternativa menos obvia que amplía solo esta parada y conserva el resto de la ruta.',
    noteCloser: 'El agente acercó solo esta parada a tu gusto.', noteSurprise: 'El agente amplió el radio de descubrimiento solo para esta parada.', bridge: 'alternativa',
    pools: [
      [['bar de vinilos y sala de escucha','Música · Cultura','cultura musical local íntima'],['visita a una radio independiente','Música · Comunidad','sonido local emergente'],['parada de sello independiente','Música · Descubrimiento','catálogo underground']],
      [['grupo de concept stores locales','Moda · Diseño','lenguaje de diseño independiente'],['archivo de moda','Moda · Cultura','historia local de la moda'],['distrito de talleres de diseño','Moda · Barrio','cultura maker']],
      [['almuerzo en barra del chef','Comida · Local','traducción del sabor local'],['sala de degustación de barrio','Comida · Descubrimiento','ingredientes regionales'],['ruta de comida por mercado','Comida · Calle','sabor cotidiano local']],
      [['microcine y libros de arte','Cine · Arte','cultura audiovisual independiente'],['bloque de galerías independientes','Arte · Comunidad','escena local emergente'],['archivo de diseño y sala de proyección','Cine · Diseño','cultura visual']],
      [['paseo de texturas urbanas','Lugar · Fotografía','atmósfera de la ciudad'],['desvío arquitectónico','Lugar · Diseño','afinidad con el entorno construido'],['ruta junto al agua en hora dorada','Lugar · Ambiente','ritmo visual']],
      [['bar de escucha nocturno','Noche · Música','cultura nocturna'],['club cultural subterráneo','Noche · Descubrimiento','sorpresa controlada'],['comodín de mercado nocturno','Noche · Comida','energía local espontánea']],
    ],
  };
  if (locale === 'zh') return {
    required: '需要兴趣信息和目的地城市。', noAlternative: '此站点没有可用的 Qloo 替代推荐。', unexpected: '替代发现', place: '地点', local: '本地推荐',
    demoCloser: '智能体选择了更贴近你最强兴趣信号的替代方案，同时保留这一步在路线中的作用。', demoSurprise: '智能体选择了更大胆的替代方案，仍与 Taste DNA 文化相近，但超出了最明显的匹配。',
    liveCloser: 'Qloo 找到了一个更贴近现有兴趣信号的替代方案。', liveSurprise: 'Qloo 找到了一个更不明显的替代方案，只扩展这一站，同时保留其余路线。',
    noteCloser: '智能体只让这一站更贴近你的口味。', noteSurprise: '智能体只为这一站扩大了探索范围。', bridge: '替代发现',
    pools: [
      [['黑胶酒吧与聆听空间','音乐 · 文化','亲密的本地音乐文化'],['独立电台探访','音乐 · 社群','新兴本地声音'],['小型唱片厂牌站点','音乐 · 探索','地下音乐目录']],
      [['本地概念店群','时尚 · 设计','独立设计语言'],['时尚档案站','时尚 · 文化','本地时尚历史'],['设计师工作室街区','时尚 · 街区','创作者文化']],
      [['主厨吧台午餐','美食 · 本地','本地风味转译'],['社区品鉴空间','美食 · 探索','地区食材'],['小型市场美食路线','美食 · 街头','日常本地味道']],
      [['微型影院与艺术书店','电影 · 艺术','独立影像文化'],['艺术家运营画廊街区','艺术 · 社群','新兴本地场景'],['设计档案与放映空间','电影 · 设计','视觉文化']],
      [['城市纹理漫步','地点 · 摄影','城市氛围'],['建筑绕行路线','地点 · 设计','建成环境匹配'],['河岸黄金时刻路线','地点 · 氛围','视觉节奏']],
      [['深夜聆听酒吧','夜晚 · 音乐','夜间文化'],['地下文化俱乐部','夜晚 · 探索','可控惊喜'],['夜市随机站','夜晚 · 美食','自发的本地能量']],
    ],
  };
  return {
    required: 'Likes and destination city are required.', noAlternative: 'No alternative Qloo match was available for this stop.', unexpected: 'Alternative discovery', place: 'Place', local: 'local recommendation',
    demoCloser: "Agent replacement: a closer-fit alternative selected to stay near your strongest signals while preserving this stop's role in the route.", demoSurprise: `Agent replacement: a more adventurous alternative that stays culturally adjacent to your Taste DNA while moving beyond the obvious match.`,
    liveCloser: 'Qloo found a closer alternative anchored more tightly to your existing taste signals.', liveSurprise: 'Qloo found a less obvious alternative that broadens this single stop while preserving the rest of your route.',
    noteCloser: 'Agent tightened this stop toward your existing taste.', noteSurprise: 'Agent widened the discovery radius for this stop only.', bridge: 'alternative',
    pools: [
      [['Vinyl bar & listening salon','Music · Culture','intimate local music culture'],['Independent radio studio visit','Music · Community','emerging local sound'],['Small-label record stop','Music · Discovery','underground catalog']],
      [['Local concept-store cluster','Fashion · Design','independent design language'],['Archive fashion stop','Fashion · Culture','local fashion history'],['Designer workshop district','Fashion · Neighborhood','maker culture']],
      [['Chef-counter lunch','Food · Local','local flavor translation'],['Neighborhood tasting room','Food · Discovery','regional ingredients'],['Tiny market food crawl','Food · Street','everyday local taste']],
      [['Microcinema & art-book stop','Film · Art','independent screen culture'],['Artist-run gallery block','Art · Community','emerging local scene'],['Design archive & screening room','Film · Design','visual culture']],
      [['Rooftop texture walk','Place · Photography','city atmosphere'],['Architecture detour','Place · Design','built-environment match'],['Riverfront golden-hour path','Place · Mood','visual rhythm']],
      [['Late-night listening bar','Night · Music','after-dark culture'],['Basement cultural club','Night · Discovery','controlled surprise'],['Night-market wildcard','Night · Food','spontaneous local energy']],
    ],
  };
}

function demoPool(city: string, interests: string[], index: number, locale: Locale) {
  const seed = interests[index % Math.max(interests.length, 1)] || 'Taste DNA';
  const copy = copyFor(locale);
  const fits = [[92,88,84],[91,86,82],[90,85,81],[89,84,80],[88,83,79],[87,82,77]];
  return (copy.pools[index] || copy.pools[0]).map((entry: string[], option: number) => ({
    name: `${city} ${entry[0]}`,
    type: entry[1],
    bridge: `${seed} → ${entry[2]}`,
    fit: fits[index]?.[option] ?? 84,
    address: `${city} · ${copy.local}`,
  }));
}

export async function POST(request: Request) {
  let errorLocale: Locale = 'en';
  try {
    const body = await request.json();
    const locale = normalizeLocale(body?.locale);
    errorLocale = locale;
    const copy = copyFor(locale);
    const likes = String(body?.likes || '').trim();
    const city = String(body?.city || '').trim();
    const origin = String(body?.origin || '').trim();
    const mode = String(body?.mode || 'balanced');
    const replacementStyle = body?.replacementStyle === 'surprise' ? 'surprise' : 'closer';
    const index = Math.max(0, Math.min(5, Math.floor(Number(body?.index) || 0)));
    const currentItem: CurrentItem = body?.currentItem || {};
    const currentNames = Array.isArray(body?.currentNames) ? body.currentNames.map((name: unknown) => String(name).toLowerCase()) : [];

    if (!likes || !city || !likes.split(/[,\n]/).some((value) => value.trim())) return NextResponse.json({ error: copy.required }, { status: 400 });

    const interests = likes.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 8);

    const entities = await qlooPlaces({ city, interests, take: 16,
      popularityMax: replacementStyle === 'surprise' || mode === 'unexpected' ? 0.72 : undefined });
    const excluded = new Set([...currentNames, String(currentItem.name || '').toLowerCase()]);
    const entity = entities.find((candidate) => !excluded.has(candidate.name.toLowerCase()));
    if (!entity) {
      const pool = demoPool(city, interests, index, locale);
      const choice = pool.find((item: any) => !currentNames.includes(String(item.name).toLowerCase())) || pool[0];
      const item = {
        ...choice,
        time: currentItem.time,
        phase: currentItem.phase,
        reason: replacementStyle === 'surprise' ? copy.demoSurprise : copy.demoCloser,
        fit: replacementStyle === 'surprise' ? Math.max(72, Number(choice.fit) - 6) : choice.fit,
      };
      return NextResponse.json({ item, meta: { source: fallbackSource(locale), fallback: true, action: replacementStyle, note: replacementStyle === 'surprise' ? copy.noteSurprise : copy.noteCloser } });
    }

    const props = entity?.properties || {};
    const item = {
      name: entity?.name || copy.unexpected,
      type: entity?.subtype || entity?.type || props?.subtype || currentItem.type || copy.place,
      address: props?.address || props?.formatted_address || null,
      time: currentItem.time,
      phase: currentItem.phase,
      reason: replacementStyle === 'surprise' ? copy.liveSurprise : copy.liveCloser,
      bridge: `${interests[index % Math.max(interests.length, 1)] || 'Taste DNA'} → ${city} ${copy.bridge}`,
      fit: replacementStyle === 'surprise' ? 78 : 91,
    };

    return NextResponse.json({ item, meta: { source: 'Qloo Insights API', fallback: false, action: replacementStyle, origin, destination: city, note: replacementStyle === 'surprise' ? copy.noteSurprise : copy.noteCloser } });
  } catch {
    return NextResponse.json({ error: requestError(errorLocale) }, { status: 400 });
  }
}
