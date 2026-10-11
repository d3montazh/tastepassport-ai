import type { Locale } from '../i18n';

// Server routes only: never import this module from a client component.
const QLOO_SERVER = 'https://hackathon.api.qloo.com';
export type QlooEntity = {
  entity_id?: string;
  name: string;
  type?: string;
  subtype?: string;
  properties?: Record<string, any>;
  query?: Record<string, any>;
};

export function fallbackSource(locale: Locale): string {
  const labels: Record<string, string> = {
    en: 'Demo mode · live Qloo data unavailable',
    ru: 'Демо-режим · живые данные Qloo недоступны',
    uk: 'Демо-режим · живі дані Qloo недоступні',
    es: 'Modo demo · datos Qloo en vivo no disponibles',
    zh: '演示模式 · 实时 Qloo 数据暂不可用',
  };
  return labels[locale] || labels.en;
}

export function requestError(locale: Locale): string {
  const labels: Record<string, string> = {
    en: 'Invalid request. Check the required fields.',
    ru: 'Некорректный запрос. Проверь обязательные поля.',
    uk: 'Некоректний запит. Перевір обов’язкові поля.',
    es: 'Solicitud inválida. Revisa los campos obligatorios.',
    zh: '请求无效。请检查必填字段。',
  };
  return labels[locale] || labels.en;
}

export function unchangedNote(locale: Locale, unsupported = false): string {
  const labels = {
    en: unsupported
      ? 'This refinement is not supported yet. Your route has not changed.'
      : 'Could not find enough new matches right now. Your route has not changed. Try again later.',
    ru: unsupported
      ? 'Такое уточнение пока не поддерживается. Твой маршрут не изменён.'
      : 'Сейчас не удалось подобрать достаточно новых мест. Твой маршрут не изменён. Попробуй позже.',
    uk: unsupported
      ? 'Таке уточнення поки не підтримується. Твій маршрут не змінено.'
      : 'Зараз не вдалося підібрати достатньо нових місць. Твій маршрут не змінено. Спробуй пізніше.',
    es: unsupported
      ? 'Este ajuste aún no está disponible. Tu ruta no ha cambiado.'
      : 'No se encontraron suficientes lugares nuevos en este momento. Tu ruta no ha cambiado. Inténtalo más tarde.',
    zh: unsupported
      ? '暂不支持此调整。你的路线未更改。'
      : '暂时无法找到足够的新地点。你的路线未更改，请稍后重试。',
  };
  return labels[locale] || labels.en;
}

export async function qlooPlaces(options: {
  city: string;
  interests: string[];
  take: number;
  popularityMax?: number;
  budget?: boolean;
  categories?: string[];
}): Promise<QlooEntity[]> {
  const key = process.env.QLOO_API_KEY?.trim();
  if (!key || key === 'your_qloo_api_key_here') return [];
  // One deadline covers searches, tag resolution and insights, including bodies.
  const signal = AbortSignal.timeout(12_000);
  const deadline = Date.now() + 12_000;
  async function get(path: string, params: Record<string, string>) {
    const url = new URL(path, QLOO_SERVER);
    url.search = new URLSearchParams(params).toString();
    let response: Response;
    for (let attempt = 0; ; attempt++) {
      response = await fetch(url, {
        headers: { Accept: 'application/json', 'X-Api-Key': key! },
        cache: 'no-store', redirect: 'error', signal,
      });
      if (attempt || ![429, 502, 503, 504].includes(response.status)) break;
      const retryAfter = response.headers.get('retry-after');
      const seconds = retryAfter === null ? NaN : Number(retryAfter);
      const requestedDelay = Number.isFinite(seconds) ? seconds * 1000 : Date.parse(retryAfter || '') - Date.now();
      const delay = Number.isFinite(requestedDelay) ? Math.max(0, requestedDelay) : 1000;
      // Honor Retry-After without exceeding the overall request deadline.
      if (Date.now() + delay + 500 >= deadline) break;
      await response.body?.cancel();
      await new Promise<void>((resolve, reject) => {
        if (signal.aborted) { reject(new Error('Qloo unavailable')); return; }
        const abort = () => { clearTimeout(timer); reject(new Error('Qloo unavailable')); };
        const timer = setTimeout(() => { signal.removeEventListener('abort', abort); resolve(); }, delay);
        signal.addEventListener('abort', abort, { once: true });
      });
    }
    // Do not log upstream bodies, headers, keys or exception objects.
    if (response.status === 404 && path === '/search') return { results: [] };
    if (!response.ok) throw new Error('Qloo unavailable');
    const data = await response.json();
    if (data?.error) throw new Error('Qloo unavailable');
    return data;
  }
  try {
    const ids: string[] = [];
    const tags: string[] = [];
    const interests = [...new Set(options.interests)].slice(0, 8);
    // Limit concurrent searches to reduce hackathon rate-limit pressure.
    for (let start = 0; start < interests.length; start += 4) {
      const matches = await Promise.all(interests.slice(start, start + 4).map(async (query) => {
        const data = await get('/search', { query, take: '1' });
        return data?.results?.[0]?.entity_id;
      }));
      ids.push(...matches.filter((id): id is string => typeof id === 'string' && !!id));
    }
    if (!ids.length) return [];
    // Resolve actual tag IDs; never send an instruction sentence as an entity.
    for (const category of (options.categories || []).slice(0, 4)) {
      const data = await get('/v2/tags', { 'filter.query': category, take: '50' });
      const candidates = data?.results?.tags;
      const matches = Array.isArray(candidates) ? candidates.filter((tag: any) =>
        typeof tag?.id === 'string' && /^urn:tag:(genre|category):place:/.test(tag.id) &&
        String(tag.name).toLowerCase() === category.toLowerCase()) : [];
      if (!matches.length) return [];
      // Qloo may return several place taxonomies with the same label.
      // Keep all exact matches instead of trusting the first (possibly empty) taxonomy.
      tags.push(...matches.map((tag: any) => tag.id));
    }
    const params: Record<string, string> = {
      'filter.type': 'urn:entity:place',
      'filter.location.query': options.city,
      'signal.interests.entities': [...new Set(ids)].join(','),
      'feature.explainability': 'true',
      take: String(options.take),
    };
    if (options.popularityMax !== undefined) params['filter.popularity.max'] = String(options.popularityMax);
    if (options.budget) params['filter.price_level.max'] = '2';
    if (tags.length) {
      params['filter.tags'] = [...new Set(tags)].join(',');
      params['operator.filter.tags'] = 'union';
    }
    const data = await get('/v2/insights', params);
    const candidates = data?.results?.entities;
    if (!Array.isArray(candidates)) return [];
    const seen = new Set<string>();
    return candidates.filter((entity: any): entity is QlooEntity => {
      if (typeof entity?.name !== 'string' || !entity.name.trim()) return false;
      const id = entity.name.trim().toLowerCase();
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  } catch {
    // Missing access, throttling, timeouts and malformed responses all degrade safely.
    return [];
  }
}
