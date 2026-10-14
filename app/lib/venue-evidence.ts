/**
 * Structured evidence from Qloo responses.
 * A numerical affinity is a Qloo model index, NOT the probability a user
 * will like or visit a venue. Never substitute ranks, ratings or popularity.
 */
export type Coordinate = { lat: number; lng: number };
type Source = { affinity?: unknown; query?: { affinity?: unknown }; properties?: Record<string, unknown> };

export function qlooAffinityPercent(entity: Source): number | undefined {
  // Only inspect an explicit affinity field, never a rank or a popularity percentile.
  const value = entity.affinity ?? entity.query?.affinity;
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0 || value > 1) return undefined;
  return Math.round(value * 100);
}

function numeric(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string' && /^-?\d+(?:\.\d+)?$/.test(value.trim())) {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return undefined;
}

function point(value: unknown): Coordinate | undefined {
  if (!value || typeof value !== 'object') return undefined;
  const p = value as Record<string, unknown>;
  let lat = numeric(p.latitude ?? p.lat);
  let lng = numeric(p.longitude ?? p.lng ?? p.lon);
  if (p.type === 'Point' && Array.isArray(p.coordinates) && p.coordinates.length === 2) {
    lng = numeric(p.coordinates[0]);
    lat = numeric(p.coordinates[1]);
  }
  if (lat === undefined || lng === undefined || Math.abs(lat) > 90 || Math.abs(lng) > 180) return undefined;
  return { lat, lng };
}

/** Qloo may supply a precise geohash instead of numeric latitude/longitude.
 * Decode its cell center, but only for 8-12 character hashes. Short hashes
 * cover overly broad areas and cannot be safely used as venue pins.
 */
export function geohashCenter(value: unknown): Coordinate | undefined {
  if (typeof value !== 'string' || !/^[0123456789bcdefghjkmnpqrstuvwxyz]{8,12}$/.test(value)) return undefined;
  const alphabet = '0123456789bcdefghjkmnpqrstuvwxyz';
  let latMin = -90;
  let latMax = 90;
  let lngMin = -180;
  let lngMax = 180;
  let even = true;
  for (const char of value) {
    const bits = alphabet.indexOf(char);
    for (let mask = 16; mask > 0; mask >>= 1) {
      if (even) {
        const middle = (lngMin + lngMax) / 2;
        if (bits & mask) lngMin = middle;
        else lngMax = middle;
      } else {
        const middle = (latMin + latMax) / 2;
        if (bits & mask) latMin = middle;
        else latMax = middle;
      }
      even = !even;
    }
  }
  return { lat: (latMin + latMax) / 2, lng: (lngMin + lngMax) / 2 };
}

/** Geohash cell centers are approximations, not surveyed venue entrances. */
export function qlooUsesGeohash(entity: Source): boolean {
  const p = entity.properties ?? {};
  if (point(p.location) || point(p.coordinates) || point(p.geocode) || point(p)) return false;
  const geocode = p.geocode && typeof p.geocode === 'object'
    ? p.geocode as Record<string, unknown> : {};
  return Boolean(geohashCenter(geocode.geohash ?? p.geohash));
}

export function qlooCoordinates(entity: Source): Coordinate | undefined {
  const properties = entity.properties ?? {};
  const geocode = properties.geocode && typeof properties.geocode === 'object'
    ? properties.geocode as Record<string, unknown> : {};
  return point(properties.location) || point(properties.coordinates) || point(properties.geocode) ||
    point(properties) || geohashCenter(geocode.geohash ?? properties.geohash);
}

/** Straight-line distance, never estimated travel time or road distance. */
export function aerialDistanceKm(a: Coordinate | undefined, b: Coordinate | undefined): number | undefined {
  if (!a || !b || !point(a) || !point(b)) return undefined;
  const r = Math.PI / 180;
  const dLat = (b.lat - a.lat) * r;
  const dLng = (b.lng - a.lng) * r;
  const h = Math.sin(dLat / 2) ** 2 +
    Math.cos(a.lat * r) * Math.cos(b.lat * r) * Math.sin(dLng / 2) ** 2;
  return 6371.0088 * 2 * Math.asin(Math.min(1, Math.sqrt(h)));
}
