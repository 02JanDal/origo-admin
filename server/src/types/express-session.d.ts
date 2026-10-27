import session from "express-session";

declare module "express-session" {
  interface SessionData {
    accessToken?: string;
    expires_in?: number;
  }
}
