import { isJwt, verifyAndDecodeIdpToken, extractGroupsFromClaims, extractUsernameFromClaims } from "@/utils/auth";

declare global {
  var gisUserInfoCache: UserInfoCache | undefined;
}

export interface UserInfo {
  access_token: string;
  expires_at: number;
  groups: string | string[] | Record<string, any>;
  username: string;
}

export class UserInfoCache {
  private cache: Map<string, UserInfo> = new Map();
  private usernameToToken: Map<string, string> = new Map();

  constructor() {
    if (global.gisUserInfoCache) {
      this.cache = global.gisUserInfoCache.cache;
      this.usernameToToken = global.gisUserInfoCache.usernameToToken;
    } else {
      global.gisUserInfoCache = this;
    }
  }

  set(userInfo: UserInfo): void {
    const { access_token, username } = userInfo;
    this.cache.set(access_token, userInfo);
    this.usernameToToken.set(username, access_token);
  }

  getByToken(token: string): UserInfo | undefined {
    const userInfo = this.cache.get(token);
    if (userInfo && this.isExpired(userInfo)) {
      this.remove(token);
      return undefined;
    }
    return userInfo;
  }

  getByUsername(username: string): UserInfo | undefined {
    const token = this.usernameToToken.get(username);
    return token ? this.getByToken(token) : undefined;
  }

  remove(token: string): void {
    const userInfo = this.cache.get(token);
    if (userInfo) {
      this.usernameToToken.delete(userInfo.username);
      this.cache.delete(token);
    }
  }

  clear(): void {
    this.cache.clear();
    this.usernameToToken.clear();
  }

  private isExpired(userInfo: UserInfo): boolean {
    return Date.now() > userInfo.expires_at;
  }
}

interface WellKnownConfig {
  userinfo_endpoint: string;
  token_endpoint: string;
}

export class UserInfoService {
  private cache: UserInfoCache;
  private wellKnownConfigPromise: Promise<WellKnownConfig> | null = null;

  constructor() {
    this.cache = global.gisUserInfoCache || new UserInfoCache();
  }

  private async getWellKnownConfig(): Promise<WellKnownConfig> {
    if (!this.wellKnownConfigPromise) {
      this.wellKnownConfigPromise = this.fetchWellKnownConfig();
    }
    return this.wellKnownConfigPromise;
  }

  private async fetchWellKnownConfig(): Promise<WellKnownConfig> {
    const wellKnownUrl = process.env.WELL_KNOWN;
    if (!wellKnownUrl) {
      throw new Error("Well-known URL is not configured");
    }

    const response = await fetch(wellKnownUrl);
    if (!response.ok) {
      throw new Error(`Failed to fetch well-known config: ${response.statusText}`);
    }

    return await response.json();
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
