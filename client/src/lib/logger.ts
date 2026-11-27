// Server-side (Node.js runtime) logger built on pino. For the Edge runtime (middleware) use ./logger-edge instead.
import pino from "pino";
import pretty from "pino-pretty";
import { getLogLevel, isAccessLogEnabled, isJsonFormat, Logger } from "./logger-config";

const root = pino(
  {
    level: getLogLevel(),
    base: undefined,
    timestamp: pino.stdTimeFunctions.isoTime,
    formatters: { level: (label) => ({ level: label }) },
  },
  isJsonFormat() ? undefined : pretty({ sync: true, colorize: process.stdout.isTTY, translateTime: "SYS:standard", ignore: "scope", messageFormat: "{if scope}[{scope}] {end}{msg}" })
);

// Access lines are always emitted at info, so they are not affected by LOG_LEVEL
const accessLogger = root.child({ scope: "access" }, { level: "info" });

const toBindings = (meta: unknown): Record<string, unknown> => {
  if (meta instanceof Error) return { err: meta };
  if (meta && typeof meta === "object") return meta as Record<string, unknown>;
  return meta === undefined ? {} : { meta };
};

export const createLogger = (scope?: string): Logger => {
  const log = scope ? root.child({ scope }) : root;
  return {
    debug: (m, meta) => log.debug(toBindings(meta), m),
    info: (m, meta) => log.info(toBindings(meta), m),
    warn: (m, meta) => log.warn(toBindings(meta), m),
    error: (m, meta) => log.error(toBindings(meta), m),
    access: (m, meta) => {
      if (isAccessLogEnabled()) accessLogger.info(toBindings(meta), m);
    },
  };
};

export const logger = createLogger();
export type { Logger };
