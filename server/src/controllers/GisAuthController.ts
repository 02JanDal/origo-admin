import { Request, Response } from "express";
import { TokenSet } from "openid-client";
import { getOpenidClient } from "@/services/openidClient.service";

/**
 * OIDC login/token-exchange flow, ported from the standalone proxy's
 * lib/auth/access_token.ts + lib/auth/authorize.ts.
 */
class GisAuthController {
  async accessToken(req: Request, res: Response): Promise<void> {
    try {
      const client = await getOpenidClient();
      const code = req.body.code || req.query.code;
      const { refresh_token } = req.body;
      let tokenSet: TokenSet | null = null;

      if (code && refresh_token) {
        res.status(400).send("Bad Request: Send either code or refresh token. Not both.");
        return;
      }

      if (code) {
        tokenSet = await client.grant({
          grant_type: "authorization_code",
          code: code as string,
          redirect_uri: process.env.REDIRECT_URI ?? (req.body.redirectUrl as string),
        });
      } else if (refresh_token) {
        tokenSet = await client.grant({
          grant_type: "refresh_token",
          refresh_token: refresh_token,
          scope: process.env.SCOPE,
          redirect_uri: process.env.REDIRECT_URI ?? (req.body.redirectUrl as string),
        });
      } else {
        res.status(400).send("Bad Request: Neither code nor refresh token found.");
        return;
      }

      if (!tokenSet) {
        throw new Error("Failed to obtain token set");
      }

      const userInfo = await client.userinfo(tokenSet.access_token!);

      const expires_in = Math.floor((tokenSet.expires_at! * 1000 - Date.now()) / 1000);
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
        displayname: (userInfo as any)[process.env.DISPLAY_NAME as string],
      });
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Access token error:`, error);
      res.status(500).json({
        error: "Access token error",
        details: error instanceof Error ? error.message : "Unknown error",
      });
    }
  }

  async authorize(req: Request, res: Response): Promise<void> {
    try {
      const client = await getOpenidClient();
      const authorizationUrl = client.authorizationUrl({
        redirect_uri: process.env.REDIRECT_URI ?? (req.query.redirectUrl as string),
        scope: process.env.SCOPE,
        state: req.query.state as string,
      });
      res.redirect(authorizationUrl);
    } catch (error) {
      console.error(`[${new Date().toISOString()}] Authorization error:`, error);
      res.status(500).send("Authorization error");
    }
  }
}

const gisAuthController = new GisAuthController();
export { gisAuthController };
