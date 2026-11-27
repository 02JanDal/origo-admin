// Console-based logger for the Edge runtime (middleware), where pino is not available.
import { getLogLevel, isAccessLogEnabled, isJsonFormat, Logger, LogLevel } from "./logger-config";

const ORDER: Record<LogLevel, number> = { debug: 10, info: 20, warn: 30, error: 40 };

const write = (level: LogLevel, scope: string | undefined, message: string, meta?: unknown, force = false) => {
  if (!force && ORDER[level] < ORDER[getLogLevel()]) return;
  const sink = level === "error" ? console.error : level === "warn" ? console.warn : console.log;
  const extra = meta instanceof Error ? { err: { name: meta.name, message: meta.message, stack: meta.stack } } : meta && typeof meta === "object" ? meta : {};

  if (isJsonFormat()) {
    sink(JSON.stringify({ level, time: new Date().toISOString(), scope, msg: message, ...extra }));
    return;
  }
  const details = Object.keys(extra).length ? ` ${JSON.stringify(extra)}` : "";
  sink(`[${new Date().toISOString()}] ${level.toUpperCase().padEnd(5)}${scope ? ` [${scope}]` : ""} ${message}${details}`);
};

export const createLogger = (scope?: string): Logger => ({
  debug: (m, meta) => write("debug", scope, m, meta),
  info: (m, meta) => write("info", scope, m, meta),
  warn: (m, meta) => write("warn", scope, m, meta),
  error: (m, meta) => write("error", scope, m, meta),
  access: (m, meta) => {
    if (isAccessLogEnabled()) write("info", "access", m, meta, true);
  },
});
