'use client';

import { useState } from 'react';

export default function Home() {
  const [likes, setLikes] = useState('Travis Scott, Interstellar, Stone Island, Japanese food');
  const [city, setCity] = useState('New York');
  const [mode, setMode] = useState('balanced');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [error, setError] = useState('');

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
    <main className="wrap">
      <section className="hero">
        <div className="badge">Qloo-powered cultural taste agent</div>
        <h1>TastePassport AI</h1>
        <p className="lead">Turn what you already love into a personalized city experience — food, culture, fashion and places that actually match your taste.</p>
      </section>

      <section className="panel">
        <label>What do you like?</label>
        <textarea value={likes} onChange={(e) => setLikes(e.target.value)} placeholder="Artists, movies, brands, foods, places..." />

        <label>Where are you going?</label>
        <input value={city} onChange={(e) => setCity(e.target.value)} placeholder="Tokyo, New York, Paris..." />

        <label>Discovery mode</label>
        <div className="modes">
          {[
            ['safe', 'Safe'],
            ['balanced', 'Balanced'],
            ['unexpected', 'Unexpected'],
          ].map(([value, label]) => (
            <button key={value} className={mode === value ? 'active' : ''} onClick={() => setMode(value)}>{label}</button>
          ))}
        </div>

        <button className="primary" onClick={generate} disabled={loading || !likes.trim() || !city.trim()}>
          {loading ? 'Building your taste map…' : 'Build my TastePassport'}
        </button>

        {error && <div className="error">{error}</div>}
      </section>

      {result && (
        <section className="results">
          <div className="summary">
            <span>Taste DNA</span>
            <h2>{result.summary || 'Your personalized route'}</h2>
          </div>
          <div className="grid">
            {(result.items || []).map((item: any, i: number) => (
              <article className="card" key={i}>
                <div className="num">0{i + 1}</div>
                <div>
                  <div className="type">{item.type || 'Recommendation'}</div>
                  <h3>{item.name}</h3>
                  <p>{item.reason}</p>
                </div>
              </article>
            ))}
          </div>
        </section>
      )}
    </main>
  );
}
