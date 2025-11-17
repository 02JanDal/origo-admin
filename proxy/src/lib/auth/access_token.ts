import { NextFunction, Request, Response } from "express";
import { TokenSet } from "openid-client";
import { getOpenidClient } from "./openidIssuer";

export const access_token = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
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
        redirect_uri: process.env.REDIRECT_URI ?? req.body.redirectUrl as string,
      });
    } else if (refresh_token) {
      tokenSet = await client.grant({
        grant_type: "refresh_token",
        refresh_token: refresh_token,
        scope: process.env.SCOPE,
        redirect_uri: process.env.REDIRECT_URI ?? req.body.redirectUrl as string,
      });
    } else {
      res.status(400).send("Bad Request: Neither code nor refresh token found.");
      return;
    }

    if (!tokenSet) {
      throw new Error("Failed to obtain token set");
    }

    const userInfo = await client.userinfo(tokenSet.access_token!);

    // Store tokenSet and userInfo in res.locals
    res.locals.tokenSet = tokenSet;
    res.locals.userInfo = userInfo;

    // Call next to pass control back to server.ts
    next();
  } catch (error) {
    console.error(`[${new Date().toISOString()}] Access token error:`, error);
    res.status(500).json({
      error: "Access token error",
      details: error instanceof Error ? error.message : "Unknown error",
    });
  }
};
