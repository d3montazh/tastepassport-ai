import { qlooPlaces, fallbackSource, requestError } from '../../lib/qloo';
import { NextResponse } from 'next/server';
import { normalizeLocale, type Locale } from '../../i18n';

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


function intentFromInstruction(instruction: string) {
  const text = instruction.toLowerCase();
  return {
    lessTouristy: /less tourist|non[- ]?tourist|local|hidden|underground|менее турист|менше турист|локальн|скрыт|прихован|андеграунд|menos tur|local|oculto|地下|本地|游客/.test(text),
    fashion: /fashion|style|design|clothes|shopping|мод|стил|дизайн|одежд|одяг|шоп|moda|estilo|diseño|ropa|compras|时尚|风格|设计|购物/.test(text),
    budget: /cheap|cheaper|budget|affordable|low cost|дешев|бюджет|доступн|经济|便宜|presupuesto|barato|económico|asequible/.test(text),
    nightlife: /night|nightlife|club|bar|late|ноч|клуб|бар|вечер|ніч|вечір|vida nocturna|noche|club|bar|夜生活|夜晚|俱乐部|酒吧/.test(text),
    food: /food|restaurant|eat|lunch|dinner|cafe|еда|ресторан|есть|обед|ужин|кафе|їжа|їсти|обід|вечеря|comida|restaurante|comer|almuerzo|cena|café|美食|餐厅|吃|午餐|晚餐|咖啡/.test(text),
    music: /music|concert|vinyl|listening|музык|концерт|винил|слуш|музик|слух|música|concierto|vinilo|escuchar|音乐|演唱会|黑胶|听/.test(text),
    art: /art|gallery|museum|cinema|film|искусств|галере|музе|кино|фильм|мистецтв|кіно|фільм|arte|galería|museo|cine|película|艺术|画廊|博物馆|电影/.test(text),
  };
}

function copyFor(locale: Locale) {
  if (locale === 'ru') return {
    required: 'Нужны Taste DNA, город, инструкция и существующий маршрут.', discovery: 'Открытие', place: 'Место', refined: 'обновлённая рекомендация',
    defaultReason: (instruction: string) => `Агент изменил эту точку под запрос «${instruction}», сохранив её место в течение дня.`,
    lessReason: 'Агент сместил маршрут от главных достопримечательностей к более локальным местам и культурным карманам.', fashionReason: 'Агент усилил моду и дизайн, сохранив ритм маршрута от утра до ночи.', budgetReason: 'Агент отдал приоритет более доступным и общественным местам, сохранив культурный характер маршрута.', nightlifeReason: 'Агент усилил вторую половину маршрута вечерней энергией и ночными открытиями.', foodReason: 'Агент усилил гастрономическую часть локальными местами, связанными с твоим Taste DNA.', musicReason: 'Агент сделал музыку сквозной темой маршрута, а не одной отдельной точкой.', artReason: 'Агент усилил визуальную культуру, кино и искусство, сохранив баланс с другими сигналами.',
    note: 'Маршрут изменён обычной фразой с сохранением структуры дня.', strategy: (instruction: string) => `Агент перестроил весь маршрут вокруг: «${instruction}»`, liveStrategy: (instruction: string) => `Агент на базе Qloo перестроил маршрут вокруг: «${instruction}»`,
    liveReason: (instruction: string) => `Qloo заново подобрал эту точку под запрос «${instruction}», сохранив её время и общий поток маршрута.`, bridgeTaste: 'твой вкус',
    names: {
      less: ['районная listening room','квартал независимых мастерских','закусочная в переулке','микрокинотеатр от художников','прогулка по локальным фактурам','спокойный поздний бар'],
      fashion: ['concept store и sound space','независимый дизайн-квартал','дизайнерская cafe-точка','fashion-архив и галерея','street-style фотопрогулка','креативная after-hours точка'],
      budget: ['бесплатная культурная прогулка','доступная локальная дизайн-точка','районная обеденная стойка','недорогой indie-сеанс','фотомаршрут по общественным пространствам','доступная ночная точка'],
      night: ['поздняя галерея-crossover','закатная listening terrace','ночной музыкальный wildcard'], food: ['рыночная дегустация','обед за стойкой шефа','поздний гастро-wildcard'], music: ['listening salon','закатная vinyl-точка','ночная музыкальная комната'], art: ['карман дизайн-галерей','микрокинотеатр и галерея','архитектурная арт-прогулка'],
    },
    types: { fashion: 'Мода · Культура', foodDesign: 'Еда · Дизайн', nightStyle: 'Ночь · Стиль', artNight: 'Искусство · Ночь', musicEvening: 'Музыка · Вечер', nightlife: 'Ночная жизнь · Открытие', food: 'Еда · Локальное', music: 'Музыка · Культура', art: 'Искусство · Культура' },
  };
  if (locale === 'uk') return {
    required: 'Потрібні Taste DNA, місто, інструкція та існуючий маршрут.', discovery: 'Відкриття', place: 'Місце', refined: 'оновлена рекомендація',
    defaultReason: (instruction: string) => `Агент змінив цю точку під запит «${instruction}», зберігши її місце протягом дня.`,
    lessReason: 'Агент змістив маршрут від головних пам’яток до локальніших місць і культурних осередків.', fashionReason: 'Агент посилив моду й дизайн, зберігши ритм маршруту від ранку до ночі.', budgetReason: 'Агент надав перевагу доступнішим і громадським просторам, зберігши культурний характер маршруту.', nightlifeReason: 'Агент посилив другу половину маршруту вечірньою енергією та нічними відкриттями.', foodReason: 'Агент посилив гастрономічну частину локальними місцями, пов’язаними з твоїм Taste DNA.', musicReason: 'Агент зробив музику наскрізною темою маршруту, а не однією окремою точкою.', artReason: 'Агент посилив візуальну культуру, кіно й мистецтво, зберігши баланс з іншими сигналами.',
    note: 'Маршрут змінено звичайною фразою зі збереженням структури дня.', strategy: (instruction: string) => `Агент перебудував увесь маршрут навколо: «${instruction}»`, liveStrategy: (instruction: string) => `Агент на базі Qloo перебудував маршрут навколо: «${instruction}»`,
    liveReason: (instruction: string) => `Qloo заново підібрав цю точку під запит «${instruction}», зберігши її час і загальний потік маршруту.`, bridgeTaste: 'твій смак',
    names: {
      less: ['районна listening room','квартал незалежних майстерень','закусочна в провулку','мікрокінотеатр від митців','прогулянка локальними фактурами','спокійний пізній бар'],
      fashion: ['concept store і sound space','незалежний дизайн-квартал','дизайнерська cafe-точка','fashion-архів і галерея','street-style фотопрогулянка','креативна after-hours точка'],
      budget: ['безкоштовна культурна прогулянка','доступна локальна дизайн-точка','районна обідня стійка','недорогий indie-сеанс','фотомаршрут громадськими просторами','доступна нічна точка'],
      night: ['пізня галерея-crossover','західна listening terrace','нічний музичний wildcard'], food: ['ринкова дегустація','обід за стійкою шефа','пізній гастро-wildcard'], music: ['listening salon','західна vinyl-точка','нічна музична кімната'], art: ['кишеня дизайн-галерей','мікрокінотеатр і галерея','архітектурна арт-прогулянка'],
    },
    types: { fashion: 'Мода · Культура', foodDesign: 'Їжа · Дизайн', nightStyle: 'Ніч · Стиль', artNight: 'Мистецтво · Ніч', musicEvening: 'Музика · Вечір', nightlife: 'Нічне життя · Відкриття', food: 'Їжа · Локальне', music: 'Музика · Культура', art: 'Мистецтво · Культура' },
  };
  if (locale === 'es') return {
    required: 'Se necesitan Taste DNA, ciudad, instrucción y una ruta existente.', discovery: 'Descubrimiento', place: 'Lugar', refined: 'recomendación refinada',
    defaultReason: (instruction: string) => `El agente ajustó esta parada alrededor de “${instruction}” conservando su lugar en el día.`,
    lessReason: 'El agente se alejó de las atracciones principales hacia lugares pequeños, locales y culturales.', fashionReason: 'El agente aumentó el peso de moda y diseño manteniendo el ritmo de mañana a noche.', budgetReason: 'El agente priorizó experiencias de menor costo y espacios públicos sin perder la personalidad cultural.', nightlifeReason: 'El agente llevó la segunda mitad de la ruta hacia una energía nocturna más fuerte.', foodReason: 'El agente reforzó la señal gastronómica con lugares locales conectados con tu Taste DNA.', musicReason: 'El agente convirtió la música en un hilo conductor de la ruta, no en una parada aislada.', artReason: 'El agente reforzó cultura visual, cine y arte manteniendo equilibrio con tus otras señales.',
    note: 'Refinamiento de ruta en lenguaje natural aplicado conservando la estructura del día.', strategy: (instruction: string) => `El agente reequilibró toda la ruta alrededor de: “${instruction}”`, liveStrategy: (instruction: string) => `El agente con Qloo reequilibró la ruta alrededor de: “${instruction}”`,
    liveReason: (instruction: string) => `Qloo volvió a seleccionar esta parada para satisfacer mejor “${instruction}” conservando su horario y el flujo general.`, bridgeTaste: 'tu gusto',
    names: {
      less: ['sala de escucha de barrio','bloque de creadores independientes','barra de almuerzo escondida','microcine gestionado por artistas','paseo de texturas locales','bar nocturno discreto'],
      fashion: ['concept store y espacio sonoro','distrito de diseño independiente','parada de café de diseño','archivo de moda y galería','paseo de street style','espacio creativo after-hours'],
      budget: ['paseo cultural gratuito','parada de diseño asequible','barra de almuerzo de barrio','proyección indie económica','ruta fotográfica por espacios públicos','parada nocturna asequible'],
      night: ['galería nocturna crossover','terraza de escucha al atardecer','comodín musical nocturno'], food: ['degustación de mercado','almuerzo en barra del chef','comodín gastronómico nocturno'], music: ['salón de escucha','parada de vinilos al atardecer','sala musical nocturna'], art: ['zona de galerías de diseño','microcine y galería','paseo de arte y arquitectura'],
    },
    types: { fashion: 'Moda · Cultura', foodDesign: 'Comida · Diseño', nightStyle: 'Noche · Estilo', artNight: 'Arte · Noche', musicEvening: 'Música · Tarde', nightlife: 'Vida nocturna · Descubrimiento', food: 'Comida · Local', music: 'Música · Cultura', art: 'Arte · Cultura' },
  };
  if (locale === 'zh') return {
    required: '需要 Taste DNA、城市、指令和现有路线。', discovery: '探索', place: '地点', refined: '优化推荐',
    defaultReason: (instruction: string) => `智能体根据“${instruction}”调整了这一站，同时保留它在一天中的位置。`,
    lessReason: '智能体避开热门景点，转向更小、更本地化的文化空间。', fashionReason: '智能体增强了时尚与设计元素，同时保留从早到晚的节奏。', budgetReason: '智能体优先选择更低成本和公共空间体验，同时保留路线的文化个性。', nightlifeReason: '智能体让路线后半段拥有更强的夜间能量与探索感。', foodReason: '智能体加入更多本地美食信号，同时仍与 Taste DNA 保持联系。', musicReason: '智能体让音乐成为贯穿路线的线索，而不是孤立的一站。', artReason: '智能体增强了视觉文化、电影与艺术，同时保持与其他兴趣信号的平衡。',
    note: '已使用自然语言优化整条路线，同时保留一天的结构。', strategy: (instruction: string) => `智能体围绕“${instruction}”重新平衡了整条路线`, liveStrategy: (instruction: string) => `基于 Qloo 的智能体围绕“${instruction}”重新平衡了整条路线`,
    liveReason: (instruction: string) => `Qloo 为了更好满足“${instruction}”重新选择了这一站，同时保留原有时间和整体路线流。`, bridgeTaste: '你的口味',
    names: {
      less: ['社区聆听空间','独立创作者街区','后街午餐小店','艺术家运营微型影院','本地城市纹理漫步','低调深夜酒吧'],
      fashion: ['概念店与声音空间','独立设计街区','设计咖啡站','时尚档案与画廊','街头风格摄影漫步','创意夜间空间'],
      budget: ['免费文化漫步','平价本地设计站','社区午餐吧台','低成本独立放映','公共空间摄影路线','平价夜间站点'],
      night: ['深夜画廊跨界站','日落聆听露台','夜间音乐随机站'], food: ['市场品鉴站','主厨吧台午餐','深夜美食随机站'], music: ['聆听沙龙','日落黑胶站','深夜音乐空间'], art: ['设计画廊区','微型影院与画廊','建筑艺术漫步'],
    },
    types: { fashion: '时尚 · 文化', foodDesign: '美食 · 设计', nightStyle: '夜晚 · 风格', artNight: '艺术 · 夜晚', musicEvening: '音乐 · 傍晚', nightlife: '夜生活 · 探索', food: '美食 · 本地', music: '音乐 · 文化', art: '艺术 · 文化' },
  };
  return {
    required: 'Taste, city, instruction and an existing route are required.', discovery: 'Discovery', place: 'Place', refined: 'refined recommendation',
    defaultReason: (instruction: string) => `Agent refinement: this stop was adjusted around “${instruction}” while preserving its place in the day.`,
    lessReason: 'Agent refinement: shifted away from headline attractions toward smaller, locally oriented places and cultural pockets.', fashionReason: 'Agent refinement: increased the route’s fashion and design weight while keeping the original morning-to-night rhythm.', budgetReason: 'Agent refinement: prioritized lower-cost and public-space experiences without flattening the cultural personality of the route.', nightlifeReason: 'Agent refinement: pushed the second half of the route toward stronger after-dark energy and nightlife discovery.', foodReason: 'Agent refinement: increased the food signal with locally grounded places that still connect back to the user’s wider Taste DNA.', musicReason: 'Agent refinement: made music a stronger connective thread across the route instead of leaving it as a single isolated stop.', artReason: 'Agent refinement: increased visual culture, film and art weight while keeping the route balanced with the user’s other signals.',
    note: 'Full-route natural-language refinement applied while preserving the day structure.', strategy: (instruction: string) => `Agent rebalanced the full route around: “${instruction}”`, liveStrategy: (instruction: string) => `Qloo-backed agent rebalanced the full route around: “${instruction}”`,
    liveReason: (instruction: string) => `Qloo refinement: this stop was re-selected to better satisfy “${instruction}” while keeping the route’s existing time slot and overall flow.`, bridgeTaste: 'your taste',
    names: {
      less: ['Neighborhood listening room','Independent maker block','Backstreet lunch counter','Artist-run microcinema','Local texture walk','Low-key late bar'],
      fashion: ['Concept store & sound space','Independent design district','Designer cafe stop','Fashion archive & gallery','Street-style photo walk','Creative after-hours spot'],
      budget: ['Free cultural walk','Affordable local design stop','Neighborhood lunch counter','Low-cost indie screening','Public-space photo route','Budget-friendly night stop'],
      night: ['Late gallery crossover','Sunset listening terrace','After-dark music wildcard'], food: ['Market tasting stop','Chef-counter lunch','Late food wildcard'], music: ['Listening salon','Sunset record stop','Late-night music room'], art: ['Design gallery pocket','Microcinema & gallery','Architecture art walk'],
    },
    types: { fashion: 'Fashion · Culture', foodDesign: 'Food · Design', nightStyle: 'Night · Style', artNight: 'Art · Night', musicEvening: 'Music · Evening', nightlife: 'Nightlife · Discovery', food: 'Food · Local', music: 'Music · Culture', art: 'Art · Culture' },
  };
}

function demoRefine(city: string, interests: string[], instruction: string, currentItems: RouteItem[], locale: Locale) {
  const intent = intentFromInstruction(instruction);
  const copy = copyFor(locale);
  const seed = interests[0] || copy.bridgeTaste;

  return currentItems.map((item, index) => {
    let name = item.name || `${city} ${copy.discovery}`;
    let type = item.type || copy.discovery;
    let reason = copy.defaultReason(instruction);
    let bridge = item.bridge || `${seed} → ${city}`;
    let fit = Math.max(72, Number(item.fit || 84));

    if (intent.lessTouristy) {
      name = `${city} ${copy.names.less[index] || copy.discovery}`;
      reason = copy.lessReason;
      bridge = `${seed} → ${copy.names.less[Math.min(index, copy.names.less.length - 1)]}`;
      fit = Math.min(96, fit + 2);
    }
    if (intent.fashion) {
      name = `${city} ${copy.names.fashion[index] || copy.discovery}`;
      type = index === 2 ? copy.types.foodDesign : index === 5 ? copy.types.nightStyle : copy.types.fashion;
      reason = copy.fashionReason;
      bridge = `${interests[2] || seed} → ${copy.types.fashion}`;
    }
    if (intent.budget) {
      name = `${city} ${copy.names.budget[index] || copy.discovery}`;
      reason = copy.budgetReason;
      bridge = `${seed} → ${copy.names.budget[Math.min(index, copy.names.budget.length - 1)]}`;
    }
    if (intent.nightlife && index >= 3) {
      name = `${city} ${copy.names.night[index - 3] || copy.discovery}`;
      type = index === 3 ? copy.types.artNight : index === 4 ? copy.types.musicEvening : copy.types.nightlife;
      reason = copy.nightlifeReason;
      bridge = `${seed} → ${city}`;
    }
    if (intent.food && (index === 1 || index === 2 || index === 5)) {
      const pos = index === 1 ? 0 : index === 2 ? 1 : 2;
      name = `${city} ${copy.names.food[pos]}`;
      type = copy.types.food;
      reason = copy.foodReason;
      bridge = `${interests[3] || seed} → ${copy.types.food}`;
    }
    if (intent.music && (index === 0 || index === 4 || index === 5)) {
      const pos = index === 0 ? 0 : index === 4 ? 1 : 2;
      name = `${city} ${copy.names.music[pos]}`;
      type = copy.types.music;
      reason = copy.musicReason;
      bridge = `${seed} → ${copy.types.music}`;
    }
    if (intent.art && (index === 1 || index === 3 || index === 4)) {
      const pos = index === 1 ? 0 : index === 3 ? 1 : 2;
      name = `${city} ${copy.names.art[pos]}`;
      type = copy.types.art;
      reason = copy.artReason;
      bridge = `${interests[1] || seed} → ${copy.types.art}`;
    }

    return { ...item, name, type, reason, bridge, fit, address: `${city} · ${copy.refined}` };
  });
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
    const instruction = String(body?.instruction || '').trim();
    const currentItems: RouteItem[] = Array.isArray(body?.currentItems) ? body.currentItems.slice(0, 6) : [];

    if (!likes || !city || !instruction || !currentItems.length) return NextResponse.json({ error: copy.required }, { status: 400 });

    const interests = likes.split(/[,\n]/).map((x) => x.trim()).filter(Boolean).slice(0, 8);
    const intent = intentFromInstruction(instruction);

    const categories = [intent.fashion && 'Fashion', intent.nightlife && 'Nightlife',
      intent.food && 'Restaurant', intent.music && 'Music', intent.art && 'Art'].filter(Boolean) as string[];
    const supported = intent.lessTouristy || intent.budget || categories.length > 0;
    const entities = supported ? await qlooPlaces({ city, interests, take: 20, categories,
      budget: intent.budget, popularityMax: intent.lessTouristy || mode === 'unexpected' ? 0.65 : undefined }) : [];
    if (entities.length < currentItems.length) {
      const items = demoRefine(city, interests, instruction, currentItems, locale);
      return NextResponse.json({ items, meta: { source: fallbackSource(locale), fallback: true, origin, destination: city, instruction, strategy: copy.strategy(instruction), note: copy.note } });
    }

    const items = currentItems.map((current, index) => {
      const entity = entities[index];
      const props = entity?.properties || {};
      return {
        ...current,
        name: entity?.name || current.name || `${copy.discovery} ${index + 1}`,
        type: entity?.subtype || entity?.type || props?.subtype || current.type || copy.place,
        address: props?.address || props?.formatted_address || null,
        reason: copy.liveReason(instruction),
        bridge: `${interests[index % Math.max(interests.length, 1)] || copy.bridgeTaste} + ${instruction} → ${city}`,
        fit: Math.max(74, 93 - index * 4),
      };
    });

    return NextResponse.json({ items, meta: { source: 'Qloo Insights API', fallback: false, origin, destination: city, instruction, strategy: copy.liveStrategy(instruction), note: copy.note } });
  } catch {
    return NextResponse.json({ error: requestError(errorLocale) }, { status: 400 });
  }
}
