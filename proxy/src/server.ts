import express from "express";
import dotenv from "dotenv";
import { CacheManager } from "./cacheManager";
import { ProxyManager } from "./proxyManager";
import { authorize } from "./lib/auth/authorize";
import { access_token } from "./lib/auth/access_token";
import cors from "cors";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import morgan from "morgan";

dotenv.config();

const port = process.env.PORT || 3020;
const resourcesEndpoint = process.env.RESOURCES_ENDPOINT_URL!;
const rolesEndpoint = process.env.ROLES_ENDPOINT_URL!;
const PROXY_BASE_PATH = process.env.PROXY_BASE_PATH || "/proxy";
const API_ACCESS_TOKEN = process.env.API_ACCESS_TOKEN!;

const app = express();
app.use(morgan("tiny"));

app.use(
  cors({
    origin: process.env.AUTH_CLIENT_DOMAIN,
    credentials: true,
  })
);

app.use(cookieParser());
// Exclude the /gis path when using the body-parser middleware, so that the body will not
// already be consumed before passing it on to the target.
// IMPORTANT! If the regex used for exclusion is changed, it must be checked to be safe from ReDoS attacks.
app.use(new RegExp(`^(?!${PROXY_BASE_PATH}/gis)`, "g"), bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

const cacheManager = new CacheManager(rolesEndpoint, resourcesEndpoint, API_ACCESS_TOKEN);
const proxyManager = new ProxyManager(cacheManager, API_ACCESS_TOKEN, PROXY_BASE_PATH);

async function initializeServer() {
  try {
    await cacheManager.initializeCache();
    console.info(`[${new Date().toISOString()}] Cache initialized successfully`);
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Failed to initialize cache:`, error);
    process.exit(1);
  }
}

app.get(`${PROXY_BASE_PATH}/refresh-cache`, async (req, res) => {
  try {
    await cacheManager.refreshCache();
    res.send("Cache refreshed successfully");
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Error refreshing sources:`, error);
    res.status(500).send("Error refreshing sources");
  }
});

app.use(function (req, res, next) {
  res.header("Access-Control-Allow-Credentials", "true");
  res.header("Access-Control-Allow-Origin", process.env.AUTH_CLIENT_DOMAIN);
  res.header("Access-Control-Allow-Methods", "GET,POST,PUT,DELETE,OPTIONS,HEAD");
  res.header("Access-Control-Allow-Headers", "Content-Type, Authorization");
  next();
});

app.post(`${PROXY_BASE_PATH}/auth/access_token`, access_token, (req, res) => {
  const tokenSet = res.locals.tokenSet;
  const userInfo = res.locals.userInfo;
  const expires_in = Math.floor((tokenSet.expires_at * 1000 - Date.now()) / 1000);
  const expires_at = new Date(expires_in * 1000 + Date.now());
  res.cookie("oidc_access_token", tokenSet.access_token, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    partitioned: true,
    expires: expires_at,
    domain: process.env.AUTH_CLIENT_DOMAIN,
  });

  res.cookie("oidc_access_token_expires_in", expires_in, {
    httpOnly: true,
    secure: true,
    sameSite: "strict",
    path: "/",
    partitioned: true,
    expires: expires_at,
    domain: process.env.AUTH_CLIENT_DOMAIN,
  });

  res.json({
    authenticated: true,
    access_token: tokenSet.access_token,
    refresh_token: tokenSet.refresh_token,
    id_token: tokenSet.id_token,
    expires_at: tokenSet.expires_at,
    displayname: userInfo[process.env.DISPLAY_NAME as string],
  });
});

app.get(`${PROXY_BASE_PATH}/auth/authorize`, authorize);

app.get(`${PROXY_BASE_PATH}/health`, async (req, res) => {
  const healthStatus = await cacheManager.healthCheck();

  if (healthStatus.status === "healthy" || healthStatus.status === "recovered") {
    res.status(200).json(healthStatus);
  } else {
    res.status(503).json(healthStatus);
  }
});

app.use(proxyManager.getProxyMiddleware());

initializeServer().then(() => {
  app.listen(port, () => {
    console.info(`[${new Date().toISOString()}] Proxy server running on port ${port}`);
  });
});
