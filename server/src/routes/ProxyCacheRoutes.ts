import { createSecureRouter, RouteRegistry } from "@/utils/routeUtils";
import { proxyCacheController as controller } from "../controllers";

const route = "proxy-cache";
const router = createSecureRouter(route);

/**
 * @route GET /${route}
 * @description Get the status of the proxy cache
 * @returns {ProxyCacheStatusDto}
 */
router.get(`/${route}`, (req, res) => controller.getStatus(req, res));

/**
 * @route POST /${route}/refresh
 * @description Refresh the proxy cache (roles, permissions and resources)
 * @returns {ProxyCacheStatusDto}
 */
router.post(`/${route}/refresh`, (req, res) => controller.refresh(req, res));

RouteRegistry.registerRoutes(router, route);

export default router;
