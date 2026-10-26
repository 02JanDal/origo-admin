import { UserInfo, UserInfoCache } from "./userInfoCache";
import { isJwt, verifyAndDecodeIdpToken, extractGroupsFromClaims, extractUsernameFromClaims } from "./auth";

interface WellKnownConfig {
  userinfo_endpoint: string;
  token_endpoint: string;
}

export class UserInfoService {
  private cache: UserInfoCache;
  private wellKnownConfigPromise: Promise<WellKnownConfig> | null = null;

  constructor() {
    this.cache = global.userInfoCache || new UserInfoCache();
  }

  private async getWellKnownConfig(): Promise<WellKnownConfig> {
    if (!this.wellKnownConfigPromise) {
      this.wellKnownConfigPromise = this.fetchWellKnownConfig();
    }
    return this.wellKnownConfigPromise;
  }

  private async fetchWellKnownConfig(): Promise<WellKnownConfig> {
    const wellKnownUrl = process.env.PROTECTED_IDP_WELL_KNOWN;

    if (wellKnownUrl) {
      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch well-known config: ${response.statusText}`);
      }
      return await response.json();
    }

    // Fall back to the explicitly configured endpoints when no well-known
    // discovery URL is provided.
    const userinfo_endpoint = process.env.PROTECTED_IDP_USERINFO_URL;
    const token_endpoint = process.env.PROTECTED_IDP_TOKEN_URL;

    if (!userinfo_endpoint || !token_endpoint) {
      throw new Error("Well-known URL is not configured, and PROTECTED_IDP_USERINFO_URL/PROTECTED_IDP_TOKEN_URL fallback is missing");
    }

    return { userinfo_endpoint, token_endpoint };
  }

  public async getUserInfo(usernameOrToken: string, expires_in: number): Promise<UserInfo> {
    let userInfo = this.cache.getByToken(usernameOrToken) || this.cache.getByUsername(usernameOrToken);

    if (!userInfo) {
      userInfo = await this.fetchUserInfo(usernameOrToken, expires_in);
      this.cache.set(userInfo);
    }

    return userInfo;
  }

  private async fetchUserInfo(accessToken: string, expires_in: number): Promise<UserInfo> {
    // JWT-shaped access tokens are verified and read locally (via JWKS), since IdPs such as Entra ID can
    // embed group memberships directly in the token but don't return them from a UserInfo call. Opaque
    // (non-JWT) tokens fall back to the userinfo endpoint, as before.
    if (isJwt(accessToken)) {
      const claims = await verifyAndDecodeIdpToken(accessToken);
      if (claims) {
        return {
          access_token: accessToken,
          expires_at: Date.now() + expires_in * 1000,
          groups: extractGroupsFromClaims(claims),
          username: extractUsernameFromClaims(claims),
        };
      }
      console.warn(`[${new Date().toISOString()}] JWT verification failed; falling back to userinfo endpoint`);
    }

    const wellKnownConfig = await this.getWellKnownConfig();

    const response = await fetch(wellKnownConfig.userinfo_endpoint, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch user info: ${response.statusText}`);
    }

    const data = await response.json();
    return {
      access_token: accessToken,
      expires_at: Date.now() + expires_in * 1000,
      groups: extractGroupsFromClaims(data),
      username: extractUsernameFromClaims(data) ?? data.sub ?? data.email,
    };
  }
}

const userInfoService = new UserInfoService();

export { userInfoService };
