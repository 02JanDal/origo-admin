// Runtime-agnostic logging configuration, safe to import from the Edge runtime (middleware).
// LOG_LEVEL: DEBUG | INFO | WARN | ERROR (default INFO)
// LOG_FORMAT: text | json (default text)
// ACCESS_LOG: true | false (default false), independent of LOG_LEVEL

export type LogLevel = "debug" | "info" | "warn" | "error";

export interface Logger {
  debug(message: string, meta?: unknown): void;
  info(message: string, meta?: unknown): void;
  warn(message: string, meta?: unknown): void;
  error(message: string, meta?: unknown): void;
  /** Logs one HTTP request; emitted only when ACCESS_LOG is enabled, regardless of LOG_LEVEL. */
  access(message: string, meta?: Record<string, unknown>): void;
}

export const getLogLevel = (): LogLevel => {
  const value = process.env.LOG_LEVEL?.trim().toLowerCase();
  if (value === "warning") return "warn";
  return value === "debug" || value === "info" || value === "warn" || value === "error" ? value : "info";
};

export const isJsonFormat = () => process.env.LOG_FORMAT?.trim().toLowerCase() === "json";

export const isAccessLogEnabled = () => ["true", "1"].includes((process.env.ACCESS_LOG ?? "").trim().toLowerCase());
