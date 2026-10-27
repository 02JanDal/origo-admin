/**
 * Normalizes the PROXY_BASE_PATH env var (default "/proxy") to always start
 * with a single leading slash and never end with a trailing slash, so it can
 * be safely used as an Express route prefix, e.g. `${getProxyBasePath()}/gis`.
 */
export function getProxyBasePath(): string {
  let path = process.env.PROXY_BASE_PATH || "/proxy";
  if (!path.startsWith("/")) {
    path = "/" + path;
  }
  if (path.endsWith("/")) {
    path = path.slice(0, -1);
  }
  return path;
}
