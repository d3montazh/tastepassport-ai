/**
 * Honest, aggregate diagnostics. This never exports personal input, entity
 * identifiers, secret keys or raw Qloo explainability payloads.
 */
import { qlooCoordinates, type Coordinate } from './venue-evidence';
import { fitsSlot, type PlaceLike } from './route-quality';

export type AuditableStop = {
  name?: string;
  provenance?: 'qloo' | 'demo';
  fit?: number;
  fitSource?: string;
  coordinates?: Coordinate;
};

export type RouteAudit = {
  total: number;
  qloo: number;
  demo: number;
  unknown: number;
  withAffinity: number;
  withCoordinates: number;
  fullyMapped: boolean;
};

export function summarizeRoute(stops: AuditableStop[]): RouteAudit {
  const valid = stops.filter(stop => typeof stop.name === 'string' && stop.name.trim().length > 0);
  const qloo = valid.filter(stop => stop.provenance === 'qloo').length;
  const demo = valid.filter(stop => stop.provenance === 'demo').length;
  const withAffinity = valid.filter(stop =>
    stop.fitSource === 'qloo-affinity' && typeof stop.fit === 'number' &&
    Number.isFinite(stop.fit) && stop.fit >= 0 && stop.fit <= 100).length;
  const withCoordinates = valid.filter(stop => {
    const c = stop.coordinates;
    return c && Number.isFinite(c.lat) && Number.isFinite(c.lng) &&
      Math.abs(c.lat) <= 90 && Math.abs(c.lng) <= 180;
  }).length;
  return {
    total: valid.length, qloo, demo, unknown: valid.length - qloo - demo,
    withAffinity, withCoordinates,
    fullyMapped: valid.length > 1 && withCoordinates === valid.length,
  };
}

export function displayPlaceType(type: unknown, subtype: unknown, props: Record<string, unknown>, fallback: string): string {
  const candidates = [subtype, props.subtype, props.category, ...(Array.isArray(props.categories) ? props.categories : []), type];
  for (const candidate of candidates) {
    const label = typeof candidate === 'string' ? candidate :
      (candidate && typeof candidate === 'object' && 'name' in candidate &&
        typeof candidate.name === 'string' ? candidate.name : '');
    if (label.trim() && !/^urn:/i.test(label.trim()) && !/^[a-z]+[.:][a-z]+/i.test(label.trim())) {
      return label.trim().slice(0, 85);
    }
  }
  return fallback;
}


/** Aggregate diagnostics only: do not return venue names, user interests,
 * coordinates, addresses, API responses, or upstream exception bodies.
 */
export type CandidateCoverage = {
  returned: number;
  compatiblePerSlot: number[];
  withParsedCoordinates: number;
  withAddress: number;
  withGeocodeField: number;
  withLocationField: number;
  withCoordinatesField: number;
  withGeometryField: number;
  withRootGeometry: number;
};

export function summarizeCandidateCoverage(entities: PlaceLike[], slots = 6): CandidateCoverage {
  const has = (value: unknown) => value !== undefined && value !== null;
  return {
    returned: entities.length,
    compatiblePerSlot: Array.from({ length: slots }, (_, index) =>
      entities.filter(entity => fitsSlot(entity, index)).length),
    withParsedCoordinates: entities.filter(entity => Boolean(qlooCoordinates(entity))).length,
    withAddress: entities.filter(entity => {
      const p = entity.properties || {};
      return typeof p.address === 'string' || typeof p.formatted_address === 'string';
    }).length,
    withGeocodeField: entities.filter(entity => has(entity.properties?.geocode)).length,
    withLocationField: entities.filter(entity => has(entity.properties?.location)).length,
    withCoordinatesField: entities.filter(entity => has(entity.properties?.coordinates)).length,
    withGeometryField: entities.filter(entity => has(entity.properties?.geometry)).length,
    withRootGeometry: entities.filter(entity => has((entity as PlaceLike & {geometry?:unknown}).geometry)).length,
  };
}
