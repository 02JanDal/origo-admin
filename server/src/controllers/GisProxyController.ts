import http from "http";
import https from "https";
import { Request, Response } from "express";
import { URL } from "url";
import { permissionCacheService } from "@/services/permissionCache.service";
import { JsonFilterService } from "@/services/jsonFilter.service";
import { UserInfo, userInfoService } from "@/services/userInfo.service";
import { extractTokenFromRequest } from "@/utils/auth";
import { GISRequestAnalyzer } from "@/utils/gisRequestAnalyzer";
import { getProxyBasePath } from "@/utils/gisProxyPath";
import { MapInstanceService } from "@/services";

const jsonFilterService = new JsonFilterService();
const mapInstanceService = new MapInstanceService();

class GisProxyController {
  /**
   * Serves the filtered, permission-aware published map config JSON.
   * Replaces the standalone proxy's jsonProxyHandler, which used to make an
   * HTTP round-trip back into this same API. Now it calls the map instance
   * service directly, in-process.
   */
  async getLatestPublished(req: Request, res: Response): Promise<void> {
    await this.respondWithFilteredConfig(
      req,
      res,
      () => mapInstanceService.getLatestPublished(req.params.name as string),
      async () => mapInstanceService.isPublic(req.params.name as string)
    );
  }

  async getPublished(req: Request, res: Response): Promise<void> {
    await this.respondWithFilteredConfig(req, res, () => mapInstanceService.getPublished(req.params.id as string));
  }

  async getPreview(req: Request, res: Response): Promise<void> {
    await this.respondWithFilteredConfig(req, res, () => mapInstanceService.getPreview(req.params.id as string));
  }
  
  private async respondWithFilteredConfig(
    req: Request,
    res: Response,
    fetchConfig: () => Promise<any>,
    canAccessWithoutToken: (() => Promise<boolean>) | null = null
  ): Promise<void> {
    try {
      const token = extractTokenFromRequest(req);
      const isPublicUnauthenticatedRequest =
        token === null && canAccessWithoutToken !== null ? await canAccessWithoutToken() : false;
      if (token === null && !isPublicUnauthenticatedRequest) {
        res.status(401).send("Unauthorized");
        return;
      }

      let userInfo: UserInfo = {
        access_token: "",
        expires_at: 0,
        groups: [],
        username: "",
      };
      let skipPermissionFiltering = false;
      if (!isPublicUnauthenticatedRequest) {
        try {
          userInfo = await userInfoService.getUserInfo(token!.value, token!.expiresIn);
        } catch (error) {
          console.error(`[${new Date().toISOString()}] Error retrieving user info:`, error);
          res.status(401).send("Unauthorized");
          return;
        }
      } else {
        skipPermissionFiltering = true;
      }

      const json = await fetchConfig();
      if (!json) {
        res.status(404).json({ message: "Not found" });
        return;
      }

      // Layer source URLs are rewritten (see JsonFilterService/REWRITE_SOURCES)
      // to point at this server's own `${PROXY_BASE_PATH}/gis/*` passthrough.
      const proxyHost = process.env.HOST;
      const protocol = req.protocol;
      const hostName = proxyHost || `${protocol}://${req.headers.host}`;
      const proxyBaseUrl = `${hostName}${getProxyBasePath()}/`;

      const filtered = await jsonFilterService.filterJson(json, proxyBaseUrl, userInfo, permissionCacheService, {
        skipPermissionFiltering,
      });
      res.json(filtered);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error serving map config:`, error);
      res.status(500).send("Internal Server Error");
    }
  }

  /**
   * Reverse-proxies WMS/WFS/WMTS requests to external GIS sources. These
   * targets are genuinely external, so this still performs a real HTTP
   * request — but permission checks are done in-process against
   * permissionCacheService instead of over the network.
   */
  async gis(req: Request, res: Response): Promise<void> {
    try {
      const proxyBasePath = getProxyBasePath();
      const proxyPath = req.url!.replace(new RegExp(`^${proxyBasePath}/gis/`), "");

      const [sourcePath, query] = proxyPath.split("?");
      const [source, ...pathParts] = sourcePath.split("/");
      const path = pathParts.join("/");

      const sourceUrl = permissionCacheService.getSourceUrlByName(source);

      if (!sourceUrl) {
        res.status(404).send("Source not found");
        return;
      }

      let targetUrlString;
      if (sourceUrl.includes("?")) {
        const [sourceBase, sourceQuery] = sourceUrl.split("?");
        targetUrlString = `${sourceBase}/${path}?${sourceQuery}${query ? `&${query}` : ""}`;
      } else {
        targetUrlString = `${sourceUrl}/${path}${query ? `?${query}` : ""}`;
      }

      targetUrlString = targetUrlString.replace(/([^:]\/)\/+/g, "$1");
      const targetUrl = new URL(targetUrlString);
      const { layerName, layers } = GISRequestAnalyzer.parseRequest(targetUrlString);

      const token = extractTokenFromRequest(req);
      if (token === null) {
        res.status(401).send("Unauthorized");
        return;
      }

      let userInfo;
      try {
        userInfo = await userInfoService.getUserInfo(token.value, token.expiresIn);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error retrieving user info:`, error);
        res.status(401).send("Unauthorized");
        return;
      }

      const permissions = typeof userInfo.groups === "string"
          ? userInfo.groups.split(",")
          : Array.isArray(userInfo.groups)
              ? userInfo.groups
              : Object.keys(userInfo.groups);
      permissions.push(userInfo.username);

      let hasPermission = false;
      if (layers && layers.length > 0) {
        hasPermission = layers.every((layer) => permissionCacheService.hasLayerPermission(source, layer, permissions));
      } else if (layerName) {
        hasPermission = permissionCacheService.hasLayerPermission(source, layerName, permissions);
      } else if (source) {
        hasPermission = permissionCacheService.hasSourcePermission(source, permissions);
      }

      if (!hasPermission) {
        res.status(403).send("Forbidden: You don't have permission to access this resource");
        return;
      }

      const options = {
        hostname: targetUrl.hostname,
        port: targetUrl.port || (targetUrl.protocol === "https:" ? 443 : 80),
        path: targetUrl.pathname + targetUrl.search,
        method: req.method,
        headers: {
          ...req.headers,
          host: targetUrl.host,
        },
      };

      const proxyReq = (targetUrl.protocol === "https:" ? https : http).request(options, (proxyRes) => {
        res.writeHead(proxyRes.statusCode || 200, proxyRes.headers);
        proxyRes.pipe(res);
      });

      proxyReq.on("error", (error) => {
        console.error(`[${new Date().toISOString()}] Proxy error:`, error);
        res.status(500).send("Internal Server Error");
      });

      req.pipe(proxyReq as unknown as NodeJS.WritableStream);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in gis proxy handler:`, error);
      res.status(500).send("Internal Server Error");
    }
  }

  async health(req: Request, res: Response): Promise<void> {
    const healthStatus = await permissionCacheService.healthCheck();

    if (healthStatus.status === "healthy" || healthStatus.status === "recovered") {
      res.status(200).json(healthStatus);
    } else {
      res.status(503).json(healthStatus);
    }
  }

  async refreshCache(req: Request, res: Response): Promise<void> {
    try {
      await permissionCacheService.refreshCache();
      res.send("Cache refreshed successfully");
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error refreshing cache:`, error);
      res.status(500).send("Error refreshing cache");
    }
  }
}

const gisProxyController = new GisProxyController();
export { gisProxyController };
