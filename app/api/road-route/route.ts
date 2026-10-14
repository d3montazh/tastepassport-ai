import { NextResponse } from 'next/server';
import { configuredOsrmBase } from '../../lib/osrm-config';

export const runtime = 'nodejs';

type Coordinate = { lat: number; lng: number };
function validCoordinate(value: unknown): value is Coordinate {
  if (!value || typeof value !== 'object') return false;
  const p = value as Record<string, unknown>;
  return typeof p.lat === 'number' && Number.isFinite(p.lat) && Math.abs(p.lat) <= 90 &&
    typeof p.lng === 'number' && Number.isFinite(p.lng) && Math.abs(p.lng) <= 180;
}
export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const points: unknown = payload?.coordinates;
    if (!Array.isArray(points) || points.length < 2 || points.length > 6 ||
      !points.every(validCoordinate)) {
      return NextResponse.json({ available: false, reason: 'invalid_coordinates' }, { status: 400 });
    }
    const base = configuredOsrmBase(process.env.ROUTING_OSRM_BASE_URL);
    if (!base) return NextResponse.json({ available: false, reason: 'routing_not_configured' });
    const path = points.map((p: Coordinate) => `${p.lng},${p.lat}`).join(';');
    const upstream = new URL(`route/v1/driving/${path}`, base.href.endsWith('/') ? base : new URL(base.href + '/'));
    upstream.searchParams.set('overview', 'full');
    upstream.searchParams.set('geometries', 'geojson');
    upstream.searchParams.set('steps', 'false');
    const response = await fetch(upstream, {
      headers: { Accept: 'application/json' }, cache: 'no-store',
      redirect: 'error', signal: AbortSignal.timeout(6000),
    });
    if (!response.ok) return NextResponse.json({ available: false, reason: 'routing_unavailable' });
    const body = await response.json();
    const route = body?.code === 'Ok' ? body?.routes?.[0] : null;
    const raw = route?.geometry?.coordinates;
    const isPath = Array.isArray(raw) && raw.length >= 2 && raw.length <= 5000 &&
      raw.every((point: unknown) =>
        Array.isArray(point) && point.length === 2 &&
        typeof point[0] === 'number' && Number.isFinite(point[0]) && Math.abs(point[0]) <= 180 &&
        typeof point[1] === 'number' && Number.isFinite(point[1]) && Math.abs(point[1]) <= 90);
    if (!isPath || typeof route.distance !== 'number' || !Number.isFinite(route.distance) ||
      typeof route.duration !== 'number' || !Number.isFinite(route.duration) ||
      route.distance < 0 || route.duration < 0) {
      return NextResponse.json({ available: false, reason: 'routing_unavailable' });
    }
    return NextResponse.json({
      available: true, mode: 'driving', source: 'OSRM',
      distanceKm: Math.round(route.distance / 100) / 10,
      durationMinutes: Math.round(route.duration / 60),
      geometry: raw,
    });
  } catch {
    return NextResponse.json({ available: false, reason: 'routing_unavailable' });
  }
}
