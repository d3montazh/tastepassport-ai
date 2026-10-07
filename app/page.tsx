'use client';

import { useEffect, useMemo, useState } from 'react';
import { languages, normalizeLocale, uiCopy, type Locale } from './i18n';

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
};

type ResultPayload = {
  summary?: string;
  items?: ResultItem[];
  meta?: {
    source?: string;
    mode?: string;
    matched?: number;
    origin?: string;
    destination?: string;
    strategy?: string;
  };
};

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

  useEffect(() => {
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
        fit: item.fit ?? Math.max(62, 92 - index * 5),
      };
    });
  }, [result, tasteTags, t.discoveryFallback]);

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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorReplace);

      setResult((current) => {
        if (!current?.items) return current;
        const nextItems = [...current.items];
        nextItems[index] = data.item;
        return {
          ...current,
          items: nextItems,
          meta: {
            ...current.meta,
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
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || t.errorRefine);

      setResult((current) => {
        if (!current) return current;
        return {
          ...current,
          items: data.items || current.items,
          meta: {
            ...current.meta,
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
                        <i style={{ left: `${Math.min(91, Math.max(9, link.fit))}%` }} />
                      </div>
                      <b>{link.fit}%</b>
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

          <div className="route-line">
            {(result.items || []).map((item, i) => {
              const isReplacing = replacing?.index === i;
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
                        <div className="time-pill">{item.time || ''}{item.phase ? ` · ${item.phase}` : ''}</div>
                      )}
                    </div>
                    <h3>{item.name}</h3>
                    {item.address && <div className="address">⌖ {item.address}</div>}
                    <p>{item.reason || t.matchFallback}</p>
                    {item.bridge && <div className="bridge"><span>{t.tasteBridge}</span>{item.bridge}</div>}
                    <div className="match-row">
                      <span>{t.routeFit}</span>
                      <div className="match-bar"><i style={{ width: `${item.fit ?? Math.max(62, 92 - i * 5)}%` }} /></div>
                      <b>{item.fit ?? Math.max(62, 92 - i * 5)}%</b>
                    </div>

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
