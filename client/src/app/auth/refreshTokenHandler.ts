import axios from "axios";
import { JWT } from "next-auth/jwt";
import { createLogger } from "@/lib/logger";

const log = createLogger("auth");

type RefreshTokenResponse = {
  access_token?: string;
  refresh_token?: string;
  expires_in?: number;
  error?: string;
  fatal?: boolean;
};

// Share the result between concurrent requests using the same refresh token
const REFRESH_RESULT_TTL_MS = 60 * 1000;
const refreshes = new Map<string, { result: Promise<RefreshTokenResponse>; createdAt: number }>();

export async function refreshAccessToken(token: JWT, scope: string, access_token_url: string, clientId: string, clientSecret: string): Promise<RefreshTokenResponse> {
  const refreshToken = token.refreshToken as string | undefined;
  if (!refreshToken) {
    return { error: "No refresh token available", fatal: true };
  }

  const now = Date.now();
  refreshes.forEach((entry, key) => {
    if (now - entry.createdAt > REFRESH_RESULT_TTL_MS) refreshes.delete(key);
  });

  let entry = refreshes.get(refreshToken);
  if (!entry) {
    entry = { result: requestNewTokens(refreshToken, scope, access_token_url, clientId, clientSecret), createdAt: now };
    refreshes.set(refreshToken, entry);
    entry.result.then((result) => {
      // Don't cache transient errors
      if (result.error && !result.fatal) refreshes.delete(refreshToken);
    });
  }
  return entry.result;
}

async function requestNewTokens(refreshToken: string, scope: string, access_token_url: string, clientId: string, clientSecret: string): Promise<RefreshTokenResponse> {
  const params = new URLSearchParams();
  params.append("grant_type", "refresh_token");
  params.append("refresh_token", refreshToken);
  params.append("scope", scope);
  params.append("client_id", clientId);
  params.append("client_secret", clientSecret);

  try {
    const response = await axios.post<RefreshTokenResponse>(access_token_url, params.toString(), {
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
      },
    });

    const data = response.data;
    log.info(`Access token refreshed (expires in ${data.expires_in ?? "unknown"}s)`);
    return {
      access_token: data.access_token,
      refresh_token: data.refresh_token,
      expires_in: data.expires_in,
    };
  } catch (error: any) {
    log.error("Error refreshing OAuth token", error);
    let errorMessage = "An unknown error occurred";
    let fatal = false;
    if (axios.isAxiosError(error)) {
      if (error.response && error.response.data) {
        errorMessage = error.response.data.error || error.message;
      } else {
        errorMessage = error.message;
      }
      // 400/401 means the refresh token was rejected
      const status = error.response?.status;
      fatal = status === 400 || status === 401;
    } else if (error instanceof Error) {
      errorMessage = error.message;
    }

    return {
      error: errorMessage,
      fatal,
    };
  }
}
