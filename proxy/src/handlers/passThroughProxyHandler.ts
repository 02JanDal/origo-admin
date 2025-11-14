// PassthroughProxyHandler.ts

import { IncomingMessage, ServerResponse } from "http";
import * as http from "http";
import * as https from "https";
import { URL } from "url";
import { UserInfoService } from "../lib/auth/userInforService";
import { CacheManager } from "../cacheManager";
import { GISRequestAnalyzer } from "../GISRequestAnalyzer";
import { extractTokenFromRequest } from "../lib/auth/auth";

export type ProxyHandler = (req: IncomingMessage, res: ServerResponse) => Promise<void>;

export function createPassthroughProxyHandler(proxyBasePath: string, cacheManager: CacheManager, apiAccessToken: string, userInfoService: UserInfoService): ProxyHandler {
  return async (req: IncomingMessage, res: ServerResponse) => {
    try {
      const proxyPath = req.url!.replace(new RegExp(`^${proxyBasePath}gis/`), "");

      const [sourcePath, query] = proxyPath.split("?");
      const [source, ...pathParts] = sourcePath.split("/");
      const path = pathParts.join("/");

      const sourceUrl = cacheManager.getSourceUrlByName(source);

      if (!sourceUrl) {
        res.writeHead(404, { "Content-Type": "text/plain" });
        res.end("Source not found");
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
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
        return;
      }

      let userInfo;
      try {
        userInfo = await userInfoService.getUserInfo(token.value, token.expiresIn);
      } catch (error) {
        console.error(`[${new Date().toISOString()}] Error retrieving user info:`, error);
        res.writeHead(401, { "Content-Type": "text/plain" });
        res.end("Unauthorized");
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
        hasPermission = layers.every((layer) => cacheManager.hasLayerPermission(source, layer, permissions));
      } else if (layerName) {
        hasPermission = cacheManager.hasLayerPermission(source, layerName, permissions);
      } else if (source) {
        hasPermission = cacheManager.hasSourcePermission(source, permissions);
      }

      if (!hasPermission) {
        res.writeHead(403, { "Content-Type": "text/plain" });
        res.end("Forbidden: You don't have permission to access this resource");
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
        res.writeHead(500, { "Content-Type": "text/plain" });
        res.end("Internal Server Error");
      });

      req.pipe(proxyReq);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Error in proxy handler:`, error);
      res.writeHead(500, { "Content-Type": "text/plain" });
      res.end("Internal Server Error");
    }
  };
}
