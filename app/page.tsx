'use client';

import { useMemo, useState } from 'react';

type Mode = 'safe' | 'balanced' | 'unexpected';

type ResultItem = {
  name: string;
  type?: string;
  reason?: string;
  address?: string | null;
};

type ResultPayload = {
  summary?: string;
  items?: ResultItem[];
  meta?: {
    source?: string;
    mode?: string;
    matched?: number;
  };
};

const surpriseSeeds = [
  {
    likes: 'Frank Ocean, Blade Runner 2049, A-COLD-WALL*, ramen, brutalist architecture',
    city: 'Tokyo',
  },
  {
    likes: 'The Weeknd, Drive, vintage Prada, espresso bars, neon photography',
    city: 'Milan',
  },
  {
    likes: 'Travis Scott, Interstellar, Stone Island, Japanese food, underground clubs',
    city: 'New York',
  },
  {
    likes: 'Arctic Monkeys, The Grand Budapest Hotel, old bookstores, natural wine, minimal fashion',
    city: 'Paris',
  },
];

const modeCopy: Record<Mode, { label: string; note: string }> = {
  safe: {
    label: 'Safe',
    note: 'High-confidence matches close to what you already love.',
  },
  balanced: {
    label: 'Balanced',
    note: 'Familiar taste with just enough discovery to feel fresh.',
  },
  unexpected: {
    label: 'Unexpected',
    note: 'Pushes further into surprising cross-domain connections.',
  },
};

export default function Home() {
  const [likes, setLikes] = useState('Travis Scott, Interstellar, Stone Island, Japanese food');
  const [city, setCity] = useState('New York');
  const [mode, setMode] = useState<Mode>('balanced');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<ResultPayload | null>(null);
  const [error, setError] = useState('');

  const tasteTags = useMemo(
    () =>
      likes
        .split(/[,\n]/)
        .map((x) => x.trim())
        .filter(Boolean)
        .slice(0, 6),
    [likes],
  );

  function surpriseMe() {
    const current = `${likes}|${city}`;
    const options = surpriseSeeds.filter((seed) => `${seed.likes}|${seed.city}` !== current);
    const next = options[Math.floor(Math.random() * options.length)] || surpriseSeeds[0];
    setLikes(next.likes);
    setCity(next.city);
    setMode('unexpected');
    setResult(null);
    setError('');
  }

  async function generate() {
    setLoading(true);
    setError('');
    setResult(null);

    try {
      const res = await fetch('/api/recommend', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ likes, city, mode }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Something went wrong');
      setResult(data);
    } catch (e: any) {
      setError(e.message || 'Something went wrong');
    } finally {
      setLoading(false);
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
            <span>AI cultural discovery agent</span>
          </div>
        </div>
        <div className="nav-pill">Powered by Qloo</div>
      </nav>

      <section className="hero-grid">
        <div className="hero-copy">
          <div className="eyebrow">Your taste already knows where you should go next.</div>
          <h1>
            Explore a city through
            <span> your own taste.</span>
          </h1>
          <p className="lead">
            TastePassport turns the music, movies, fashion and food you love into a personalized cultural route — built around you, not generic tourist rankings.
          </p>

          <div className="hero-points">
            <div><b>01</b><span>Read your taste DNA</span></div>
            <div><b>02</b><span>Translate it into a city</span></div>
            <div><b>03</b><span>Discover unexpected matches</span></div>
          </div>
        </div>

        <div className="taste-orbit" aria-hidden="true">
          <div className="orbit-ring ring-one" />
          <div className="orbit-ring ring-two" />
          <div className="orbit-core">
            <span>TASTE</span>
            <strong>DNA</strong>
          </div>
          <div className="orbit-chip chip-a">MUSIC</div>
          <div className="orbit-chip chip-b">FILM</div>
          <div className="orbit-chip chip-c">FOOD</div>
          <div className="orbit-chip chip-d">STYLE</div>
          <div className="orbit-chip chip-e">PLACES</div>
        </div>
      </section>

      <section className="builder-wrap">
        <div className="builder-head">
          <div>
            <span className="section-kicker">Build your passport</span>
            <h2>Tell us what feels like you.</h2>
          </div>
          <button className="ghost-button" onClick={surpriseMe} type="button">
            ✦ Surprise me
          </button>
        </div>

        <div className="builder-grid">
          <div className="panel input-panel">
            <label htmlFor="likes">What do you like?</label>
            <textarea
              id="likes"
              value={likes}
              onChange={(e) => setLikes(e.target.value)}
              placeholder="Artists, movies, brands, foods, places..."
            />

            <div className="taste-tags">
              {tasteTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>

            <label htmlFor="city">Where are you going?</label>
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

          <div className="panel mode-panel">
            <label>Discovery mode</label>
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
                <><span className="spinner" /> Mapping your taste…</>
              ) : (
                <>Build my TastePassport <span>→</span></>
              )}
            </button>

            {error && <div className="error">{error}</div>}
          </div>
        </div>
      </section>

      {result && (
        <section className="results" id="results">
          <div className="results-head">
            <div>
              <span className="section-kicker">Your cultural route</span>
              <h2>{result.summary || 'Your personalized route'}</h2>
            </div>
            <div className="result-meta">
              <span>{result.meta?.source || 'Qloo Insights API'}</span>
              <b>{result.meta?.matched ?? result.items?.length ?? 0} matches</b>
            </div>
          </div>

          <div className="taste-dna-card">
            <div className="dna-label">Your current Taste DNA</div>
            <div className="dna-tags">
              {tasteTags.map((tag) => <span key={tag}>{tag}</span>)}
            </div>
            <div className="dna-mode">Discovery: <b>{modeCopy[mode].label}</b></div>
          </div>

          <div className="route-line">
            {(result.items || []).map((item, i) => (
              <article className="route-card" key={`${item.name}-${i}`}>
                <div className="route-step">
                  <span>{String(i + 1).padStart(2, '0')}</span>
                  <i />
                </div>
                <div className="route-body">
                  <div className="type">{item.type || 'Discovery'}</div>
                  <h3>{item.name}</h3>
                  {item.address && <div className="address">⌖ {item.address}</div>}
                  <p>{item.reason || 'A Qloo-powered match connected to your taste profile.'}</p>
                  <div className="match-row">
                    <span>Why it fits</span>
                    <div className="match-bar"><i style={{ width: `${Math.max(62, 92 - i * 5)}%` }} /></div>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}

      <section className="how-it-works">
        <div className="section-kicker">What makes it different</div>
        <div className="feature-grid">
          <div className="feature-card">
            <span>01</span>
            <h3>Cross-domain taste</h3>
            <p>Your music can influence restaurants. Your movies can influence neighborhoods. TastePassport connects categories instead of treating them separately.</p>
          </div>
          <div className="feature-card">
            <span>02</span>
            <h3>Explainable discovery</h3>
            <p>Each recommendation tells you why it belongs in your route instead of giving you another opaque top-10 list.</p>
          </div>
          <div className="feature-card">
            <span>03</span>
            <h3>Controlled serendipity</h3>
            <p>Move from Safe to Unexpected and deliberately decide how adventurous your recommendations should feel.</p>
          </div>
        </div>
      </section>

      <footer>
        <span>TastePassport AI · Qloo Agentic Hackathon 2026</span>
        <span>Built for cultural discovery, not tourist checklists.</span>
      </footer>
    </main>
  );
}
