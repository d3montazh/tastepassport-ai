'use client';

import { useEffect, useMemo, useState } from 'react';
import { languages, normalizeLocale, uiCopy, type Locale } from './i18n';
import { aerialDistanceKm, type Coordinate } from './lib/venue-evidence';
import { SAVED_ROUTE_KEY, parseSavedRoute, routeShareText, type SavedRoute } from './lib/route-storage';

type Mode = 'safe' | 'balanced' | 'unexpected';
type ReplacementStyle = 'closer' | 'surprise';

type ResultItem = {
  name: string;
  type?: string;
  reason?: string;
  address?: string | null;
  time?: string;
  phase?: string;
  bridge?: string;
  fit?: number;
  fitSource?: 'qloo-affinity';
  coordinates?: Coordinate;
};

type ResultPayload = {
  summary?: string;
  items?: ResultItem[];
  meta?: {
    source?: string;
    fallback?: boolean;
    mixed?: boolean;
    mode?: string;
    matched?: number;
    origin?: string;
    destination?: string;
    strategy?: string;
  };
};

const routeStorageCopy: Record<Locale, {
  save: string; restore: string; remove: string; share: string; saved: string;
  restored: string; removed: string; copied: string; error: string; info: string;
}> = {
  en: { save: 'Save route', restore: 'Restore saved route', remove: 'Delete saved route', share: 'Copy route', saved: 'Saved on this device.', restored: 'Saved route restored.', removed: 'Saved route deleted.', copied: 'Route copied. Share it wherever you like.', error: 'Could not access local storage or clipboard.', info: 'Saved only in this browser. Sharing copies text, not a public link.' },
  ru: { save: 'Сохранить маршрут', restore: 'Вернуть сохранённый', remove: 'Удалить сохранённый', share: 'Скопировать маршрут', saved: 'Маршрут сохранён на этом устройстве.', restored: 'Маршрут восстановлен.', removed: 'Сохранённый маршрут удалён.', copied: 'Маршрут скопирован — можно отправить.', error: 'Не удалось получить доступ к сохранению или буферу обмена.', info: 'Хранится только в этом браузере. Для отправки копируется текст, а не публичная ссылка.' },
  uk: { save: 'Зберегти маршрут', restore: 'Відновити збережений', remove: 'Видалити збережений', share: 'Скопіювати маршрут', saved: 'Маршрут збережено на цьому пристрої.', restored: 'Маршрут відновлено.', removed: 'Збережений маршрут видалено.', copied: 'Маршрут скопійовано — можна надіслати.', error: 'Не вдалося отримати доступ до сховища або буфера обміну.', info: 'Зберігається лише в цьому браузері. Для надсилання копіюється текст, а не публічне посилання.' },
  es: { save: 'Guardar ruta', restore: 'Restaurar ruta', remove: 'Eliminar ruta guardada', share: 'Copiar ruta', saved: 'Ruta guardada en este dispositivo.', restored: 'Ruta restaurada.', removed: 'Ruta guardada eliminada.', copied: 'Ruta copiada para compartir.', error: 'No se pudo usar el almacenamiento o el portapapeles.', info: 'Solo se guarda en este navegador. Se copia texto, no un enlace público.' },
  zh: { save: '保存路线', restore: '恢复路线', remove: '删除已保存路线', share: '复制路线', saved: '路线已保存在此设备。', restored: '已恢复保存的路线。', removed: '已删除保存的路线。', copied: '路线已复制，可发送给他人。', error: '无法访问本地存储或剪贴板。', info: '仅保存在此浏览器。分享功能复制文字，不创建公开链接。' },
};

const evidenceCopy: Record<Locale, {
  score: string; scoreInfo: string; noScore: string; schedule: string;
  distance: string; far: string; maps: string;
}> = {
  en: { score: 'Qloo affinity', scoreInfo: 'Qloo cultural affinity index, not the probability you will like this place.', noScore: 'No verified affinity score', schedule: 'Times are suggested. Opening hours and travel times have not been verified.', distance: 'From previous stop, straight line', far: 'Long gap between stops', maps: 'Open in Maps' },
  ru: { score: 'Связь с твоим вкусом · Qloo', scoreInfo: 'Индекс культурной связи Qloo, а не вероятность того, что место тебе понравится.', noScore: 'Нет подтверждённой оценки', schedule: 'Время посещения примерное. Часы работы и время в пути не проверены.', distance: 'От предыдущего места по прямой', far: 'Большое расстояние между точками', maps: 'Открыть на карте' },
  uk: { score: 'Зв’язок із твоїм смаком · Qloo', scoreInfo: 'Індекс культурного зв’язку Qloo, а не ймовірність того, що місце тобі сподобається.', noScore: 'Немає підтвердженої оцінки', schedule: 'Час відвідування орієнтовний. Години роботи й час у дорозі не перевірено.', distance: 'Від попереднього місця по прямій', far: 'Велика відстань між точками', maps: 'Відкрити на карті' },
  es: { score: 'Afinidad Qloo', scoreInfo: 'Índice de afinidad cultural de Qloo; no es la probabilidad de que te guste.', noScore: 'Afinidad no disponible', schedule: 'Horarios sugeridos: no se han verificado horarios de apertura ni tiempos de viaje.', distance: 'Desde la parada anterior, en línea recta', far: 'Distancia larga entre paradas', maps: 'Abrir en el mapa' },
  zh: { score: 'Qloo 品味关联', scoreInfo: 'Qloo 文化关联指数，并非你喜欢该地点的概率。', noScore: '缺少可核实的关联评分', schedule: '到访时间仅为建议；未核实营业时间及交通用时。', distance: '距上一站直线距离', far: '相邻站点距离较远', maps: '在地图中打开' },
};

function mapsLink(item: ResultItem, city: string): string {
  const point = item.coordinates;
  const query = point && Number.isFinite(point.lat) && Number.isFinite(point.lng)
    ? `${point.lat},${point.lng}`
    : [item.name, item.address, city].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

const surpriseSeeds = [
  {
    likes: 'Frank Ocean, Blade Runner 2049, A-COLD-WALL*, ramen, brutalist architecture',
    origin: 'London',
    city: 'Tokyo',
  },
  {
    likes: 'The Weeknd, Drive, vintage Prada, espresso bars, neon photography',
    origin: 'Toronto',
    city: 'Milan',
  },
  {
    likes: 'Travis Scott, Interstellar, Stone Island, Japanese food, underground clubs',
    origin: 'Kyiv',
    city: 'New York',
  },
  {
    likes: 'Arctic Monkeys, The Grand Budapest Hotel, old bookstores, natural wine, minimal fashion',
    origin: 'Berlin',
    city: 'Paris',
  },
  {
    likes: 'Kendrick Lamar, Akira, Stüssy, Korean BBQ, skate culture',
    origin: 'Los Angeles',
    city: 'Seoul',
  },
  {
    likes: 'Rosalía, Pedro Almodóvar, Loewe, tapas, contemporary art',
    origin: 'Barcelona',
    city: 'Mexico City',
  },
  {
    likes: 'Fred again.., Her, Our Legacy, natural wine, industrial design',
    origin: 'Warsaw',
    city: 'Copenhagen',
  },
  {
    likes: 'Tame Impala, Lost in Translation, Issey Miyake, sushi, jazz bars',
    origin: 'Amsterdam',
    city: 'Osaka',
  },
  {
    likes: 'Bad Bunny, Wong Kar-wai, Jacquemus, seafood, colorful architecture',
    origin: 'Lisbon',
    city: 'Buenos Aires',
  },
  {
    likes: 'Charli XCX, The Matrix, Rick Owens, techno, brutalist interiors',
    origin: 'Prague',
    city: 'Seoul',
  },
  {
    likes: 'Radiohead, The Lighthouse, Acne Studios, specialty coffee, modern architecture',
    origin: 'Stockholm',
    city: 'Berlin',
  },
  {
    likes: 'Måneskin, La Dolce Vita, Prada, aperitivo, contemporary photography',
    origin: 'Rome',
    city: 'Tokyo',
  },
  {
    likes: 'Daft Punk, Amélie, Maison Margiela, bakeries, art-house cinema',
    origin: 'Paris',
    city: 'Seoul',
  },
  {
    likes: 'Tyler the Creator, Moonlight, Supreme, soul food, vinyl shops',
    origin: 'New York',
    city: 'London',
  },
  {
    likes: 'Ryuichi Sakamoto, Perfect Days, Comme des Garçons, kissaten coffee, minimal architecture',
    origin: 'Tokyo',
    city: 'Paris',
  },
  {
    likes: 'C. Tangana, Dune, Balenciaga, pintxos, rooftop culture',
    origin: 'Madrid',
    city: 'New York',
  },
  {
    likes: 'Burial, Ex Machina, Marimekko, Nordic food, saunas',
    origin: 'Helsinki',
    city: 'Copenhagen',
  },
  {
    likes: 'FKA twigs, The Handmaiden, Jil Sander, vegan tasting menus, performance art',
    origin: 'Vienna',
    city: 'Barcelona',
  },
  {
    likes: 'King Krule, Chungking Express, Palace, dumplings, street photography',
    origin: 'Melbourne',
    city: 'Tokyo',
  },
  {
    likes: 'Kali Uchis, Roma, Bode, tacos, modernist architecture',
    origin: 'Mexico City',
    city: 'Madrid',
  },
];

export default function Home() {
  const [locale, setLocale] = useState<Locale>('en');
  const t = uiCopy[locale];
  const [likes, setLikes] = useState('Travis Scott, Interstellar, Stone Island, Japanese food');
  const [origin, setOrigin] = useState('Kyiv');
  const [city, setCity] = useState('New York');
  const [mode, setMode] = useState<Mode>('balanced');
  const [loading, setLoading] = useState(false);
  const [loadingStage, setLoadingStage] = useState(0);
  const [loadingProgress, setLoadingProgress] = useState(0);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState('');
  const [replacing, setReplacing] = useState<{ index: number; style: ReplacementStyle } | null>(null);
  const [agentMessage, setAgentMessage] = useState('');
  const [refineInstruction, setRefineInstruction] = useState(t.presets[0]);
  const [refining, setRefining] = useState(false);
  const [hasSavedRoute, setHasSavedRoute] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');

  useEffect(() => {
    try { setHasSavedRoute(Boolean(parseSavedRoute(window.localStorage.getItem(SAVED_ROUTE_KEY)))); } catch { setHasSavedRoute(false); }
    const saved = window.localStorage.getItem('tastepassport-locale');
    const browserLocale = navigator.language || 'en';
    const next = normalizeLocale(saved || browserLocale);
    setLocale(next);
    setRefineInstruction(uiCopy[next].presets[0]);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'uk' ? 'uk' : locale === 'zh' ? 'zh-CN' : locale;
    window.localStorage.setItem('tastepassport-locale', locale);
    window.dispatchEvent(new CustomEvent('tastepassport:language', { detail: locale }));
  }, [locale]);

  const modeCopy: Record<Mode, { label: string; note: string }> = {
    safe: { label: t.safe, note: t.safeNote },
    balanced: { label: t.balanced, note: t.balancedNote },
    unexpected: { label: t.unexpected, note: t.unexpectedNote },
  };

  const tasteTags = useMemo(
    () =>
      likes
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 6),
    [likes],
  );

  const tasteMapLinks = useMemo(() => {
    const items = result?.items || [];
    if (!items.length) return [];
    const signals = tasteTags.length ? tasteTags : ['Taste DNA'];

    return items.slice(0, 6).map((item, index) => {
      const bridgeSignal = item.bridge?.split('→')?.[0]?.trim();
      return {
        signal: bridgeSignal || signals[index % signals.length],
        target: item.name,
        type: item.type || t.discoveryFallback,
        fit: item.fitSource === 'qloo-affinity' ? item.fit : undefined,
      };
    });
  }, [result, tasteTags, t.discoveryFallback]);

  function snapshot(): SavedRoute | null {
    if (!result?.items?.length) return null;
    return { version: 1, likes, origin, city, mode, result: { ...result, items: result.items } };
  }

  function saveRoute() {
    const route = snapshot();
    if (!route) return;
    try {
      window.localStorage.setItem(SAVED_ROUTE_KEY, JSON.stringify(route));
      setHasSavedRoute(true);
      setSaveMessage(routeStorageCopy[locale].saved);
    } catch { setSaveMessage(routeStorageCopy[locale].error); }
  }

  function restoreRoute() {
    try {
      const stored = parseSavedRoute(window.localStorage.getItem(SAVED_ROUTE_KEY));
      if (!stored) { setHasSavedRoute(false); setSaveMessage(routeStorageCopy[locale].error); return; }
      setLikes(stored.likes);
      setOrigin(stored.origin);
      setCity(stored.city);
      setMode(stored.mode);
      setResult(stored.result);
      setAgentMessage('');
      setError('');
      setSaveMessage(routeStorageCopy[locale].restored);
      requestAnimationFrame(() => document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
    } catch { setSaveMessage(routeStorageCopy[locale].error); }
  }

  function deleteSavedRoute() {
    try {
      window.localStorage.removeItem(SAVED_ROUTE_KEY);
      setHasSavedRoute(false);
      setSaveMessage(routeStorageCopy[locale].removed);
    } catch { setSaveMessage(routeStorageCopy[locale].error); }
  }

  async function copyRoute() {
    const route = snapshot();
    if (!route) return;
    try {
      await navigator.clipboard.writeText(routeShareText(route, locale));
      setSaveMessage(routeStorageCopy[locale].copied);
    } catch { setSaveMessage(routeStorageCopy[locale].error); }
  }

  function changeLanguage(nextLocale: Locale) {
    setLocale(nextLocale);
    setRefineInstruction(uiCopy[nextLocale].presets[0]);
    setError('');
    setAgentMessage('');
  }

  function surpriseMe() {
    const current = `${likes}|${origin}|${city}`;
    const options = surpriseSeeds.filter((seed) => `${seed.likes}|${seed.origin}|${seed.city}` !== current);
    const next = options[Math.floor(Math.random() * options.length)] || surpriseSeeds[0];
    setLikes(next.likes);
    setOrigin(next.origin);
    setCity(next.city);
    setMode('unexpected');
    setResult(null);
    setError('');
    setAgentMessage('');
  }

  async function generate() {
    setLoading(true);
    setLoadingStage(0);
    setLoadingProgress(14);
    setError('');
    setResult(null);
    setAgentMessage('');

    const startedAt = Date.now();
    let stage = 0;
    const loadingTimer = window.setInterval(() => {
      stage = Math.min(stage + 1, t.loadingSteps.length - 1);
      setLoadingStage(stage);
      setLoadingProgress([14, 39, 67, 88][stage] || 88);
    }, 520);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes, origin, city, mode, locale }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorGeneric);

      const remaining = Math.max(0, 1850 - (Date.now() - startedAt));
      if (remaining) await new Promise((resolve) => window.setTimeout(resolve, remaining));

      window.clearInterval(loadingTimer);
      setLoadingStage(t.loadingSteps.length - 1);
      setLoadingProgress(100);
      await new Promise((resolve) => window.setTimeout(resolve, 220));

      setResult(data);
      requestAnimationFrame(() => {
        document.getElementById('results')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      });
    } catch (e: any) {
      setError(e.message || t.errorGeneric);
    } finally {
      window.clearInterval(loadingTimer);
      setLoading(false);
      setLoadingProgress(0);
    }
  }

  async function replaceStop(index: number, replacementStyle: ReplacementStyle) {
    if (!result?.items?.[index]) return;

    setReplacing({ index, style: replacementStyle });
    setError('');
    setAgentMessage('');

    try {
      const res = await fetch('/api/replace', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likes,
          origin,
          city,
          mode,
          locale,
          index,
          replacementStyle,
          currentItem: result.items[index],
          currentNames: result.items.map((item) => item.name),
          currentFallback: result.meta?.fallback,
          currentMixed: result.meta?.mixed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorReplace);

      if (data?.meta?.changed === false) {
        setAgentMessage(data.meta.note || t.errorReplace);
        return;
      }
      setResult((current) => {
        if (!current?.items) return current;
        const nextItems = [...current.items];
        nextItems[index] = data.item;
        return {
          ...current,
          items: nextItems,
          meta: {
            ...current.meta,
            source: data?.meta?.source || current.meta?.source,
            fallback: data?.meta?.fallback ?? current.meta?.fallback,
            mixed: data?.meta?.mixed ?? current.meta?.mixed,
            strategy: replacementStyle === 'surprise' ? t.strategySurprise : t.strategyCloser,
          },
        };
      });

      setAgentMessage(
        data?.meta?.note ||
          `${String(index + 1).padStart(2, '0')} ${replacementStyle === 'surprise' ? t.stopUnexpected : t.stopCloser}`,
      );
    } catch (e: any) {
      setError(e.message || t.errorReplace);
    } finally {
      setReplacing(null);
    }
  }

  async function refineRoute() {
    if (!result?.items?.length || !refineInstruction.trim()) return;

    setRefining(true);
    setError('');
    setAgentMessage('');

    try {
      const res = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          likes,
          origin,
          city,
          mode,
          locale,
          instruction: refineInstruction.trim(),
          currentItems: result.items,
          currentFallback: result.meta?.fallback,
          currentMixed: result.meta?.mixed,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorRefine);

      if (data?.meta?.changed === false) {
        setAgentMessage(data.meta.note || t.errorRefine);
        return;
      }

      setResult((current) => {
        if (!current) return current;
        return {
          ...current,
          items: data.items || current.items,
          meta: {
            ...current.meta,
            source: data?.meta?.source || current.meta?.source,
            fallback: data?.meta?.fallback ?? current.meta?.fallback,
            mixed: data?.meta?.mixed ?? current.meta?.mixed,
            strategy: data?.meta?.strategy || `${t.fullAdapted} “${refineInstruction.trim()}”`,
          },
        };
      });

      setAgentMessage(data?.meta?.note || `${t.fullAdapted} “${refineInstruction.trim()}”.`);
    } catch (e: any) {
      setError(e.message || t.errorRefine);
    } finally {
      setRefining(false);
    }
  }

  return (
    <main className="site-shell">
      <div className="ambient ambient-one" />
      <div className="ambient ambient-two" />

      <nav className="topbar">
        <div className="brand">
          <div className="brand-mark">TP</div>
          <div>
            <strong>TastePassport</strong>
            <span>{t.brandSubtitle}</span>
          </div>
        </div>
        <div className="topbar-actions">
          <label className="language-picker" aria-label="Language">
            <span className="language-icon">◎</span>
            <select value={locale} onChange={(e) => changeLanguage(e.target.value as Locale)}>
              {languages.map((language) => (
                <option key={language.code} value={language.code}>{language.label}</option>
              ))}
            </select>
          </label>
          <div className="nav-pill">{t.poweredBy}</div>
        </div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">{t.eyebrow}</div>
          <h1>
            {t.heroTitleA}
            <span>{t.heroTitleB}</span>
          </h1>
          <p className="lead">{t.heroLead}</p>

          <div className="hero-points">
            <div><b>01</b><span>{t.heroPoint1}</span></div>
            <div><b>02</b><span>{t.heroPoint2}</span></div>
            <div><b>03</b><span>{t.heroPoint3}</span></div>
          </div>
        </div>

        <div className="taste-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-core">
            <span>{t.orbitTaste}</span>
            <strong>DNA</strong>
          </div>
          <div className="orbit-chip chip-a">{t.orbitMusic}</div>
          <div className="orbit-chip chip-b">{t.orbitFilm}</div>
          <div className="orbit-chip chip-c">{t.orbitFood}</div>
          <div className="orbit-chip chip-d">{t.orbitStyle}</div>
          <div className="orbit-chip chip-e">{t.orbitPlaces}</div>
        </div>
      </section>

      <section className="builder-wrap">
        <div className="builder-head">
          <div>
            <span className="section-kicker">{t.buildKicker}</span>
            <h2>{t.buildTitle}</h2>
          </div>
            {hasSavedRoute && <button className="ghost-button" type="button" onClick={restoreRoute}>{routeStorageCopy[locale].restore}</button>}
          <button className="ghost-button" onClick={surpriseMe} type="button">
            ✦ {t.surpriseMe}
          </button>
        </div>

        <div className="builder-grid">
          <div className="panel input-panel">
            <label htmlFor="likes">{t.whatLike}</label>
            <textarea
              id="likes"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              placeholder={t.likesPlaceholder}
            />

            <div className="taste-tags">
              {tasteTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <div className="city-pair">
              <div>
                <label htmlFor="origin">{t.originLabel}</label>
                <div className="city-input-wrap">
                  <span>◎</span>
                  <input
                    id="origin"
                    value={origin}
                    onChange={(e) => setOrigin(e.target.value)}
                    placeholder="Kyiv, London, Seoul..."
                  />
                </div>
              </div>
              <div className="translate-arrow">→</div>
              <div>
                <label htmlFor="city">{t.destinationLabel}</label>
                <div className="city-input-wrap">
                  <span>⌖</span>
                  <input
                    id="city"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    placeholder="Tokyo, New York, Paris..."
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="panel mode-panel">
            <label>{t.discoveryMode}</label>
            <div className="mode-stack">
              {(Object.keys(modeCopy) as Mode[]).map((value) => (
                <button
                  key={value}
                  className={`mode-option ${mode === value ? 'active' : ''}`}
                  onClick={() => setMode(value)}
                  type="button"
                >
                  <span className="mode-radio"><i /></span>
                  <span>
                    <strong>{modeCopy[value].label}</strong>
                    <small>{modeCopy[value].note}</small>
                  </span>
                </button>
              ))}
            </div>

            <button className="primary" onClick={generate} disabled={loading || !likes.trim() || !city.trim()}>
              {loading ? (
                <><span className="spinner" /> {t.loadingSteps[loadingStage]?.label || t.loadingHeadline}</>
              ) : (
                <>{t.translate} <span>→</span></>
              )}
            </button>

            {loading && (
              <div className="loading-cinematic" aria-live="polite">
                <div className="loading-cinematic-head">
                  <span>{t.loadingHeadline}</span>
                  <b>{Math.max(1, loadingProgress)}%</b>
                </div>
                <div className="loading-track"><i style={{ width: `${loadingProgress}%` }} /></div>
                <div className="loading-steps">
                  {t.loadingSteps.map((step, index) => (
                    <div
                      key={`${locale}-${step.short}`}
                      className={`${index < loadingStage ? 'done' : ''} ${index === loadingStage ? 'active' : ''}`}
                    >
                      <span>{index < loadingStage ? '✓' : String(index + 1).padStart(2, '0')}</span>
                      <small>{step.short}</small>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {error && <div className="error">{error}</div>}
          </div>
        </div>
      </section>

      {result && (
        <section className="results" id="results">
          <div className="results-head">
            <div>
              <span className="section-kicker">{t.routeKicker}</span>
              <h2>{result.summary || t.personalizedRoute}</h2>
            </div>
            <div className="result-meta">
              <span>{result.meta?.source || 'Qloo Insights API'}</span>
              <b>{result.meta?.matched ?? result.items?.length ?? 0} {t.matches}</b>
            </div>
          </div>

          <div className="route-utility-actions">
            <button type="button" onClick={saveRoute}>{routeStorageCopy[locale].save}</button>
            <button type="button" onClick={copyRoute}>{routeStorageCopy[locale].share}</button>
            {hasSavedRoute && <button type="button" onClick={restoreRoute}>{routeStorageCopy[locale].restore}</button>}
            {hasSavedRoute && <button type="button" onClick={deleteSavedRoute}>{routeStorageCopy[locale].remove}</button>}
          </div>
          <div className="route-storage-info" role="status">{saveMessage || routeStorageCopy[locale].info}</div>

          <div className="translation-map">
            <div className="translation-city">
              <span>{t.from}</span>
              <strong>{result.meta?.origin || origin || 'Home'}</strong>
            </div>
            <div className="translation-signals">
              {tasteTags.slice(0, 4).map((tag) => <span key={tag}>{tag}</span>)}
              <i>→</i>
            </div>
            <div className="translation-city destination">
              <span>{t.into}</span>
              <strong>{result.meta?.destination || city}</strong>
            </div>
          </div>

          <div className="agent-note">
            <span className="agent-dot" />
            <div>
              <b>{t.agentStrategy}</b>
              <p>{agentMessage || result.meta?.strategy || t.defaultStrategy}</p>
            </div>
            <div className="agent-mode">{modeCopy[mode].label}</div>
          </div>

          <div className={`route-refiner ${refining ? 'is-refining' : ''}`}>
            <div className="refiner-copy">
              <span>{t.talkRoute}</span>
              <strong>{t.refineTitle}</strong>
              <p>{t.refineDesc}</p>
            </div>
            <div className="refiner-controls">
              <div className="refiner-input-wrap">
                <span>✦</span>
                <input
                  value={refineInstruction}
                  onChange={(e) => setRefineInstruction(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !refining) refineRoute();
                  }}
                  placeholder={t.refinePlaceholder}
                  aria-label={t.talkRoute}
                />
                <button type="button" onClick={refineRoute} disabled={refining || !refineInstruction.trim()}>
                  {refining ? t.refining : t.refine}
                </button>
              </div>
              <div className="refiner-presets">
                {t.presets.map((preset) => (
                  <button
                    type="button"
                    key={`${locale}-${preset}`}
                    className={refineInstruction === preset ? 'active' : ''}
                    onClick={() => setRefineInstruction(preset)}
                  >
                    {preset}
                  </button>
                ))}
              </div>
            </div>
          </div>

          <div className="taste-dna-card">
            <div className="dna-label">{t.currentDna}</div>
            <div className="dna-tags">
              {tasteTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="dna-mode">{t.discovery}: <b>{modeCopy[mode].label}</b></div>
          </div>

          {tasteMapLinks.length > 0 && (
            <div className="taste-map-card">
              <div className="taste-map-head">
                <div>
                  <span className="section-kicker">{t.tasteMapKicker}</span>
                  <h3>{t.tasteMapTitle}</h3>
                  <p>{t.tasteMapDesc}</p>
                </div>
                <div className="taste-map-count">{tasteMapLinks.length} {t.liveConnections}</div>
              </div>

              <div className="taste-map-legend">
                <span>{t.yourSignal}</span>
                <span>{t.translationStrength}</span>
                <span>{result.meta?.destination || city}</span>
              </div>

              <div className="taste-map-graph">
                {tasteMapLinks.map((link, index) => (
                  <div className="taste-map-row" key={`${link.signal}-${link.target}-${index}`}>
                    <div className="taste-map-node taste-map-source">
                      <small>{t.signal} {String(index + 1).padStart(2, '0')}</small>
                      <strong>{link.signal}</strong>
                    </div>
                    <div className="taste-map-connection">
                      <div className="taste-map-line">
                          {typeof link.fit === 'number' && Number.isFinite(link.fit) && <i style={{ left: `${Math.max(0, Math.min(100, link.fit))}%` }} />}
                        </div>
                        {typeof link.fit === 'number' && Number.isFinite(link.fit) && <b title={evidenceCopy[locale].scoreInfo}>{link.fit}%</b>}
                    </div>
                    <div className="taste-map-node taste-map-target">
                      <small>{link.type}</small>
                      <strong>{link.target}</strong>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          <p className="route-evidence-note">{evidenceCopy[locale].schedule} {evidenceCopy[locale].scoreInfo}</p>
          <div className="route-line">
            {(result.items || []).map((item, i) => {
              const isReplacing = replacing?.index === i;
              const distanceKm = i > 0 ? aerialDistanceKm(result.items?.[i - 1]?.coordinates, item.coordinates) : undefined;
              const scoreAvailable = item.fitSource === 'qloo-affinity' && typeof item.fit === 'number' && Number.isFinite(item.fit);
              return (
                <article className={`route-card ${isReplacing ? 'is-replacing' : ''}`} key={`${item.name}-${i}`}>
                  <div className="route-step">
                    <span>{String(i + 1).padStart(2, '0')}</span>
                    <i />
                  </div>
                  <div className="route-body">
                    <div className="route-time-row">
                      <div className="type">{item.type || t.discoveryFallback}</div>
                      {(item.time || item.phase) && (
                        <div className="time-pill">{item.time ? `≈ ${item.time}` : ''}{item.phase ? ` · ${item.phase}` : ''}</div>
                      )}
                    </div>
                    <h3>{item.name}</h3>
                    {item.address && <div className="address">⌖ {item.address}</div>}
                    <div className="address"><a href={mapsLink(item, city)} target="_blank" rel="noopener noreferrer">↗ {evidenceCopy[locale].maps}</a></div>
                    {distanceKm !== undefined && <div className="address">{evidenceCopy[locale].distance}: ≈ {distanceKm.toFixed(1)} km{distanceKm > 5 ? ` · ${evidenceCopy[locale].far}` : ''}</div>}
                    <p>{item.reason || t.matchFallback}</p>
                    {item.bridge && <div className="bridge"><span>{t.tasteBridge}</span>{item.bridge}</div>}
                    {scoreAvailable ? (
                      <div className="match-row">
                        <span title={evidenceCopy[locale].scoreInfo}>{evidenceCopy[locale].score}</span>
                        <div className="match-bar"><i style={{ width: `${Math.min(100, Math.max(0, item.fit))}%` }} /></div>
                        <b>{item.fit}%</b>
                      </div>
                    ) : <div className="address" title={evidenceCopy[locale].scoreInfo}>{evidenceCopy[locale].noScore}</div>}

                    <div className="agent-actions">
                      <span>{t.adaptStop}</span>
                      <div>
                        <button
                          type="button"
                          disabled={isReplacing || refining}
                          onClick={() => replaceStop(i, 'closer')}
                        >
                          {isReplacing && replacing?.style === 'closer' ? t.adapting : t.moreLikeMe}
                        </button>
                        <button
                          type="button"
                          className="surprise-action"
                          disabled={isReplacing || refining}
                          onClick={() => replaceStop(i, 'surprise')}
                        >
                          {isReplacing && replacing?.style === 'surprise' ? t.exploring : t.surpriseMore}
                        </button>
                      </div>
                    </div>
                  </div>
                </article>
              );
            })}
          </div>
        </section>
      )}

      <section className="how-it-works">
        <div className="section-kicker">{t.differentKicker}</div>
        <div className="feature-grid">
          <div className="feature-card">
            <span>01</span>
            <h3>{t.feature1Title}</h3>
            <p>{t.feature1Desc}</p>
          </div>
          <div className="feature-card">
            <span>02</span>
            <h3>{t.feature2Title}</h3>
            <p>{t.feature2Desc}</p>
          </div>
          <div className="feature-card">
            <span>03</span>
            <h3>{t.feature3Title}</h3>
            <p>{t.feature3Desc}</p>
          </div>
        </div>
      </section>

      <footer>
        <span>TastePassport AI · Qloo Agentic Hackathon 2026</span>
        <span>{t.footer2}</span>
      </footer>
    </main>
  );
}
