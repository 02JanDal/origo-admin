import { permissionCacheService } from "@/services/permissionCache.service";

/**
 * Refreshes the in-process GIS proxy permission/resource cache. This used to
 * be an HTTP call to the standalone proxy's /proxy/refresh-cache endpoint
 * (via PROXY_UPDATE_URL); now that the proxy lives in the same process, it's
 * a direct in-process call.
 * Called after saving, can be turned off with PROXY_CACHE_REFRESH_ON_SAVE=false.
 */
export async function updateProxyCache(): Promise<void> {
  if (!isRefreshOnSaveEnabled()) {
    return;
  }
  try {
    await permissionCacheService.refreshCache();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to trigger proxy cache update: ${error}`);
  }
}

export function isRefreshOnSaveEnabled(): boolean {
  return process.env.PROXY_CACHE_REFRESH_ON_SAVE?.toLowerCase?.() !== "false";
}
