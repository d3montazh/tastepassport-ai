'use client';

import { useEffect, useRef, useState } from 'react';
import type { Locale } from '../i18n';
import type { Coordinate } from '../lib/venue-evidence';

type MapStop = { name: string; coordinates?: Coordinate };
type RouteResponse = {
  available?: boolean; mode?: string; source?: string;
  distanceKm?: number; durationMinutes?: number; geometry?: number[][];
};
const copy: Record<Locale, { loading: string; error: string; aerial: string; road: string; partial: string }> = {
  en: { loading: 'Loading OpenStreetMap…', error: 'Map could not be loaded. Use the map links in the stop cards.', aerial: 'Dotted lines show straight-line connections, not roads.', road: 'Driving route (OSRM)', partial: 'Only stops with known coordinates are shown.' },
  ru: { loading: 'Загрузка OpenStreetMap…', error: 'Не удалось загрузить карту. Используй ссылки в карточках.', aerial: 'Пунктирные линии — расстояния по прямой, не дороги.', road: 'Маршрут на автомобиле (OSRM)', partial: 'Показаны только точки с известными координатами.' },
  uk: { loading: 'Завантаження OpenStreetMap…', error: 'Не вдалося завантажити карту. Скористайся посиланнями в картках.', aerial: 'Пунктирні лінії — відстані по прямій, не дороги.', road: 'Маршрут автомобілем (OSRM)', partial: 'Показані лише зупинки з відомими координатами.' },
  es: { loading: 'Cargando OpenStreetMap…', error: 'No se pudo cargar el mapa. Usa los enlaces de las paradas.', aerial: 'Las líneas punteadas son distancias en línea recta, no carreteras.', road: 'Ruta en coche (OSRM)', partial: 'Solo se muestran lugares con coordenadas.' },
  zh: { loading: '正在加载 OpenStreetMap…', error: '地图加载失败。请使用地点卡片中的地图链接。', aerial: '虚线代表直线距离，并非道路路线。', road: '驾车路线（OSRM）', partial: '仅显示具有坐标的地点。' },
};
const JS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js';
const CSS = 'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css';

function valid(coord: Coordinate | undefined): coord is Coordinate {
  return Boolean(coord && Number.isFinite(coord.lat) && Number.isFinite(coord.lng) &&
    Math.abs(coord.lat) <= 90 && Math.abs(coord.lng) <= 180);
}

async function leaflet(): Promise<any> {
  const w = window as Window & { L?: any };
  if (w.L) return w.L;
  if (!document.querySelector('link[data-taste-leaflet]')) {
    const link = document.createElement('link');
    link.rel = 'stylesheet';
    link.href = CSS;
    link.integrity = 'sha256-p4NxAoJBhIIN+hmNHrzRCf9tD/miZyoHS5obTRR9BMY=';
    link.crossOrigin = 'anonymous';
    link.dataset.tasteLeaflet = 'true';
    document.head.appendChild(link);
  }
  return await new Promise<any>((resolve, reject) => {
    let script = document.querySelector<HTMLScriptElement>('script[data-taste-leaflet]');
    if (!script) {
      script = document.createElement('script');
      script.src = JS;
      script.integrity = 'sha256-20nQCchB9co0qIjJZRGuk2/Z9VM+kNiyxNV1lvTlZBo=';
      script.crossOrigin = 'anonymous';
      script.dataset.tasteLeaflet = 'true';
      script.async = true;
      script.addEventListener('load', () => resolve(w.L), { once: true });
      script.addEventListener('error', () => reject(new Error('Map unavailable')), { once: true });
      document.head.appendChild(script);
    } else {
      script.addEventListener('load', () => resolve(w.L), { once: true });
      script.addEventListener('error', () => reject(new Error('Map unavailable')), { once: true });
    }
  });
}

export default function RouteMap({ stops, locale }: { stops: MapStop[]; locale: Locale }) {
  const el = useRef<HTMLDivElement>(null);
  const [status, setStatus] = useState(copy[locale].loading);
  const available = stops.map((stop, index) => ({ ...stop, index }))
    .filter((item): item is typeof item & { coordinates: Coordinate } => valid(item.coordinates));

  useEffect(() => {
    let cancelled = false;
    let map: any;
    const controller = new AbortController();
    async function init() {
      if (!el.current || available.length < 2) return;
      setStatus(copy[locale].loading);
      try {
        const L = await leaflet();
        if (!L || cancelled || !el.current) return;
        map = L.map(el.current, { scrollWheelZoom: false });
        L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
          maxZoom: 19,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a> contributors',
        }).addTo(map);
        const positions = available.map(stop => [stop.coordinates.lat, stop.coordinates.lng]);
        available.forEach(stop => {
          const marker = L.marker([stop.coordinates.lat, stop.coordinates.lng]).addTo(map);
          const popup = document.createElement('div');
          popup.textContent = `${stop.index + 1}. ${stop.name}`;
          marker.bindPopup(popup);
        });
        const outline = L.polyline(positions, { color: '#9bb2ff', weight: 3, dashArray: '7,9' }).addTo(map);
        map.fitBounds(L.latLngBounds(positions).pad(0.2), { maxZoom: 14 });
        setStatus(copy[locale].aerial + (available.length < stops.length ? ' ' + copy[locale].partial : ''));
        if (available.length !== stops.length) return;
        const response = await fetch('/api/road-route', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ coordinates: available.map(s => s.coordinates) }),
          signal: controller.signal,
        });
        if (!response.ok || cancelled) return;
        const data: RouteResponse = await response.json();
        if (!data.available || !Array.isArray(data.geometry) || cancelled) return;
        const geometry = data.geometry.map(point => [point[1], point[0]]);
        map.removeLayer(outline);
        L.polyline(geometry, { color: '#a9d7bc', weight: 4 }).addTo(map);
        const distance = typeof data.distanceKm === 'number' ? ` · ${data.distanceKm} km` : '';
        const duration = typeof data.durationMinutes === 'number' ? ` · ≈ ${data.durationMinutes} min` : '';
        setStatus(copy[locale].road + distance + duration);
      } catch {
        if (!cancelled) setStatus(copy[locale].error);
      }
    }
    init();
    return () => {
      cancelled = true;
      controller.abort();
      if (map) map.remove();
    };
    // Map is initialized only when user explicitly expands it.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale, stops]);

  return (
    <div className="tp-osm-wrap">
      <div className="tp-osm-map" ref={el} role="region" aria-label="OpenStreetMap route overview" />
      <p className="tp-osm-caption" role="status">{status}</p>
    </div>
  );
}
