/**
 * Explicit opt-in, device-local storage for one itinerary. Never syncs tastes
 * to a server and never exports them in a URL.
 */
export const SAVED_ROUTE_KEY = 'tastepassport-saved-route-v1';

export type SavedStop = {
  name: string;
  type?: string;
  reason?: string;
  address?: string | null;
  time?: string;
  phase?: string;
  bridge?: string;
  fit?: number;
  fitSource?: 'qloo-affinity';
  coordinates?: { lat: number; lng: number };
};
export type SavedRoute = {
  version: 1;
  likes: string;
  origin: string;
  city: string;
  mode: 'safe' | 'balanced' | 'unexpected';
  result: {
    summary?: string;
    items: SavedStop[];
    meta?: {
      source?: string; fallback?: boolean; mixed?: boolean;
      mode?: string; matched?: number;
      origin?: string; destination?: string; strategy?: string;
    };
  };
};
function stringOf(value: unknown, max = 1000): value is string {
  return typeof value === 'string' && value.length <= max;
}
function validStop(value: unknown): value is SavedStop {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false;
  const v = value as Record<string, unknown>;
  return stringOf(v.name, 300) && v.name.trim().length > 0 &&
    (!v.time || stringOf(v.time, 30)) &&
    (!v.address || stringOf(v.address, 600)) &&
    (!v.reason || stringOf(v.reason, 3000));
}
export function parseSavedRoute(raw: string | null): SavedRoute | null {
  if (!raw || raw.length > 80_000) return null;
  try {
    const v: unknown = JSON.parse(raw);
    if (!v || typeof v !== 'object' || Array.isArray(v)) return null;
    const route = v as Record<string, any>;
    if (route.version !== 1 || !stringOf(route.likes, 2000) || !stringOf(route.origin, 250) ||
        !stringOf(route.city, 250) || !['safe', 'balanced', 'unexpected'].includes(route.mode) ||
        !route.result || !Array.isArray(route.result.items) ||
        route.result.items.length < 1 || route.result.items.length > 6 ||
        !route.result.items.every(validStop)) return null;
    return route as SavedRoute;
  } catch {
    return null;
  }
}

export function routeShareText(route: SavedRoute, locale: string): string {
  const labels: Record<string, { from: string; taste: string; source: string; affinity: string }> = {
    en: { from: 'Route', taste: 'My taste', source: 'Source', affinity: 'Qloo affinity index' },
    ru: { from: 'Маршрут', taste: 'Мои интересы', source: 'Источник', affinity: 'Индекс связи Qloo' },
    uk: { from: 'Маршрут', taste: 'Мої інтереси', source: 'Джерело', affinity: 'Індекс зв’язку Qloo' },
    es: { from: 'Ruta', taste: 'Mis gustos', source: 'Fuente', affinity: 'Afinidad Qloo' },
    zh: { from: '路线', taste: '我的兴趣', source: '来源', affinity: 'Qloo 关联指数' },
  };
  const c = labels[locale] ?? labels.en;
  const lines = [
    'TastePassport AI',
    `${c.from}: ${route.origin} → ${route.city}`,
    `${c.taste}: ${route.likes}`,
    `${c.source}: ${route.result.meta?.source || 'Unknown'}`, '',
  ];
  route.result.items.forEach((stop, index) => {
    lines.push(`${index + 1}. ${stop.time ? stop.time + ' · ' : ''}${stop.name}`);
    if (stop.address) lines.push(stop.address);
    if (stop.fitSource === 'qloo-affinity' && typeof stop.fit === 'number' && Number.isFinite(stop.fit)) {
      lines.push(`${c.affinity}: ${Math.min(100, Math.max(0, stop.fit))}%`);
    }
  });
  // Copyable text, not a permanent external link or promised booking.
  return lines.join('\n');
}
