import { Router } from "express";
import cors from "cors";
import { gisAuthController as controller } from "../controllers";
import { getProxyBasePath } from "@/utils/gisProxyPath";

// Public OIDC login/token-exchange routes, ported from the standalone proxy's
// auth endpoints. Mounted at the app root (not under BASE_PATH/createSecureRouter)
// so existing clients pointing at `${PROXY_BASE_PATH}/auth/...` keep working.
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

router.post(`${base}/auth/access_token`, (req, res) => controller.accessToken(req, res));
router.get(`${base}/auth/authorize`, (req, res) => controller.authorize(req, res));

export default router;
