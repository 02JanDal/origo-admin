declare global {
  var userInfoCache: UserInfoCache | undefined;
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
    if (global.userInfoCache) {
      this.cache = global.userInfoCache.cache;
      this.usernameToToken = global.userInfoCache.usernameToToken;
    } else {
      global.userInfoCache = this;
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
