import { Router } from "express";
import cors from "cors";
import { gisProxyController as controller } from "../controllers";
import { getProxyBasePath } from "@/utils/gisProxyPath";

// Public GIS gateway routes: published map config delivery, external GIS
// passthrough, health and cache-refresh. Mounted at the app root (not under
// BASE_PATH/createSecureRouter) so existing Origo map configs pointing at
// `${PROXY_BASE_PATH}/...` keep working unchanged.
const router = Router();
const base = getProxyBasePath();

// Cookie-based auth requires a specific (non-wildcard) origin + credentials,
// scoped to just these routes so it doesn't affect the rest of the API's CORS.
router.use(
  cors({
    origin: process.env.CORS_ORIGIN,
    credentials: true,
    methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

router.get(`${base}/mapinstances/:name/published/latest{.json}`, (req, res) => controller.getLatestPublished(req, res));
router.get(`${base}/mapinstances/published/:id`, (req, res) => controller.getPublished(req, res));

router.get(`${base}/health`, (req, res) => controller.health(req, res));
router.get(`${base}/refresh-cache`, (req, res) => controller.refreshCache(req, res));

// Passthrough proxy to external WMS/WFS/WMTS sources. Registered last and
// matches everything under `${base}/gis/`.
router.all(`${base}/gis/*splat`, (req, res) => controller.gis(req, res));

export default router;
