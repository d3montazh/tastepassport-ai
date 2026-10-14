import type { Coordinate } from './venue-evidence';

/**
 * Search URLs are discovery links, not verified navigation destinations.
 * Never send invented demo venues or unverified legacy snapshots to Maps.
 */
export type MapLinkStop = {
  name?: string;
  address?: string | null;
  provenance?: 'qloo' | 'demo';
  coordinates?: Coordinate;
  coordinatesApproximate?: boolean;
};

function usablePoint(point: Coordinate | undefined): point is Coordinate {
  return Boolean(point && Number.isFinite(point.lat) && Number.isFinite(point.lng) &&
    Math.abs(point.lat) <= 90 && Math.abs(point.lng) <= 180);
}

export function mapsLinkForVerifiedSource(item: MapLinkStop, city: string): string | undefined {
  if (item.provenance !== 'qloo') return undefined;
  const name = typeof item.name === 'string' ? item.name.trim() : '';
  const address = typeof item.address === 'string' ? item.address.trim() : '';
  // A geohash cell center is an approximation. When Qloo provides a
  // venue name+address, prefer the search over precise-looking false pins.
  if (!item.coordinatesApproximate && usablePoint(item.coordinates)) {
    const location = `${item.coordinates.lat},${item.coordinates.lng}`;
    return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(location)}`;
  }
  if (!name || !address) {
    // Don't send an approximate geohash cell center as an exact venue.
    return undefined;
  }

  // A Qloo-supplied textual address is only a search hint; destination
  // identity still needs to be checked in Maps by the user.
  const search = [name, address, city.trim()].filter(Boolean).join(', ');
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(search)}`;
}
