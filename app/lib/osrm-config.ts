/**
 * OSRM demo endpoints are not production routing backends.
 * This server-side configuration is never controlled by browser input.
 */
export function configuredOsrmBase(raw: string | undefined): URL | undefined {
  if (!raw) return undefined;
  try {
    const url = new URL(raw);
    if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash) return undefined;
    if (['localhost', '127.0.0.1', '::1', 'router.project-osrm.org', 'routing.openstreetmap.de'].includes(url.hostname.toLowerCase())) return undefined;
    if (!url.hostname.includes('.')) return undefined;
    return url;
  } catch { return undefined; }
}
