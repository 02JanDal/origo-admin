import { createLogger } from "@/lib/logger";
import { getLogLevel, isAccessLogEnabled, isJsonFormat } from "@/lib/logger-config";
import type { Instrumentation } from "next";

export function registerNode() {
  createLogger("startup").info("Server starting", {
    logLevel: getLogLevel(),
    logFormat: isJsonFormat() ? "json" : "text",
    accessLog: isAccessLogEnabled(),
    authEnabled: process.env.AUTH_ENABLED === "true",
    node: process.version,
  });
}

export const onRequestErrorNode: Instrumentation.onRequestError = (error, request, context) => {
  const log = createLogger("request");
  log.error(`Unhandled error in ${request.method} ${request.path}`, error as Error);
  log.debug("Request error context", {
    routePath: context.routePath,
    routeType: context.routeType,
    renderSource: context.renderSource,
  });
};
