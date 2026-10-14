/**
 * Conservative quality guard for Qloo place recommendations.
 * These labels are not a complete venue taxonomy: reject only recognizable
 * category mismatches. Unknown categories remain eligible and unverified.
 * No opening-hours or travel-time claims are inferred here.
 */
export type PlaceLike = {
  name?: string;
  type?: string;
  subtype?: string;
  properties?: Record<string, unknown>;
  tags?: unknown;
};
type Role = 'culture' | 'shopping' | 'food' | 'scenery' | 'nightlife';
const SLOT_ROLES: Role[] = ['culture', 'shopping', 'food', 'culture', 'scenery', 'nightlife'];

function labelOf(value: unknown): string[] {
  if (typeof value === 'string') return [value];
  if (Array.isArray(value)) return value.flatMap(labelOf);
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return [obj.name, obj.label, obj.category].flatMap(labelOf);
  }
  return [];
}

export function placeCategory(entity: PlaceLike): string {
  const p = entity.properties ?? {};
  return [
    ...labelOf(entity.subtype),
    ...labelOf(p.subtype),
    ...labelOf(p.category),
    ...labelOf(p.categories),
    ...labelOf(p.tags),
    ...labelOf(entity.tags),
    ...labelOf(entity.type),
  ].join(' | ').toLowerCase();
}

function knownCategory(label: string): Role | 'hotel' | undefined {
  // Category labels are not a reliable proxy for opening hours or availability.
  if (/hotel|hostel|motel|lodging|accommodation|отель|готель|хостел|гостиниц/.test(label)) return 'hotel';
  if (/night[ -]?club|nightlife|cocktail|karaoke|(^|\W)bar(\W|$)|(^|\W)pub(\W|$)|ночн.*клуб|нічн.*клуб|караоке/.test(label)) return 'nightlife';
  if (/restaurant|cafe|coffee|bakery|bistro|diner|eatery|brunch|food|ресторан|кафе|пекарн|їдальн/.test(label)) return 'food';
  if (/clothing|boutique|fashion|shopping|bookstore|retail|store|shop|market|магазин|бутик|крамниц/.test(label)) return 'shopping';
  if (/museum|gallery|cinema|theat|art center|exhibition|music venue|concert|музей|галере|театр|кино|кіно/.test(label)) return 'culture';
  if (/park|garden|viewpoint|observation deck|nature|landmark|scenic|парк|сад|смотров|оглядов/.test(label)) return 'scenery';
  return undefined;
}

export function fitsSlot(entity: PlaceLike, index: number): boolean {
  const category = knownCategory(placeCategory(entity));
  const role = SLOT_ROLES[index];
  if (!role) return true;
  if (!category) return true; // Data not sufficient to reject.
  if (category === 'hotel') return false;
  // A cultural venue can work as a visually interesting stop in the afternoon.
  return category === role || (role === 'scenery' && category === 'culture');
}

/**
 * Select a non-repeated Qloo candidate for an itinerary slot. If nothing
 * matches, return undefined so the caller can preserve existing user data.
 */
export function selectForSlot<T extends PlaceLike>(
  candidates: T[],
  index: number,
  excludedNames: Iterable<string> = [],
): T | undefined {
  const excluded = new Set(Array.from(excludedNames, name => name.trim().toLowerCase()));
  const eligible = candidates.filter(place => {
    const name = typeof place.name === 'string' ? place.name.trim().toLowerCase() : '';
    return name.length > 0 && !excluded.has(name) && fitsSlot(place, index);
  });
  // Prefer a documented matching category to an unclassified venue.
  // Unknown categories remain a last-resort option, not verified matches.
  const role = SLOT_ROLES[index];
  return eligible.find(place => knownCategory(placeCategory(place)) === role)
    || eligible.find(place => knownCategory(placeCategory(place)) !== undefined)
    || eligible[0];
}

/** Assemble an ordered itinerary without using a venue in the wrong role. */
export function selectItinerary<T extends PlaceLike>(candidates: T[], slots = 6): T[] {
  const selected: T[] = [];
  const used = new Set<string>();
  for (let index = 0; index < slots; index++) {
    const candidate = selectForSlot(candidates, index, used);
    if (!candidate) return [];
    selected.push(candidate);
    used.add(candidate.name!.trim().toLowerCase());
  }
  return selected;
}

/**
 * Keep every compatible real venue even when Qloo cannot fill all six roles.
 * A missing role is left undefined so the caller can add an explicitly labelled
 * demo placeholder. Narrow roles are allocated first to prevent a broad
 * cultural slot from claiming a candidate needed for food or nightlife.
 */
export function selectPartialItinerary<T extends PlaceLike>(
  candidates: T[], slots = 6,
): Array<T | undefined> {
  const selected: Array<T | undefined> = Array(slots).fill(undefined);
  const used = new Set<string>();
  // Specialized itinerary roles first, then flexible cultural stops.
  const priorities = [2, 1, 5, 4, 3, 0];
  const order = [...priorities.filter(index => index < slots),
    ...Array.from({ length: slots }, (_, index) => index).filter(index => !priorities.includes(index))];
  for (const index of order) {
    const place = selectForSlot(candidates, index, used);
    if (!place) continue;
    selected[index] = place;
    used.add(place.name!.trim().toLowerCase());
  }
  return selected;
}
