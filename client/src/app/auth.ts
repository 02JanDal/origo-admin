import { NextAuthOptions, DefaultSession, User } from "next-auth";
import { refreshAccessToken } from "./auth/refreshTokenHandler";

export const authOptions: NextAuthOptions = {
  providers: [
    {
      id: "oidc",
      name: process.env.PROTECTED_IDP_NAME!,
      type: "oauth",
      version: "2.0",
      wellKnown: process.env.PROTECTED_IDP_WELL_KNOWN,
      idToken: true,
      issuer: process.env.PROTECTED_IDP_ISSUER,
      checks: ["pkce", "state"],
      authorization: {
        url: process.env.PROTECTED_IDP_AUTH_URL,
        params: {
          scope: process.env.PROTECTED_IDP_SCOPE,
          redirect_uri: process.env.PROTECTED_IDP_REDIRECT_URI,
        },
      },
      token: process.env.PROTECTED_IDP_TOKEN_URL,
      userinfo: process.env.PROTECTED_IDP_USERINFO_URL,
      jwks_endpoint: process.env.PROTECTED_IDP_JWKS_URL,
      async profile(profile: any, tokens: any) {
        return {
          id: profile.sub,
          name: profile.name,
          email: profile.email,
          image: profile.picture,
        };
      },
      clientId: process.env.PROTECTED_IDP_CLIENT_ID,
      clientSecret: process.env.PROTECTED_IDP_CLIENT_SECRET,
    },
  ],
  callbacks: {
    async signIn({ user, account, profile, email, credentials }) {
      return true;
    },
    async redirect({ url, baseUrl }) {
      const basePath = process.env.NEXT_PUBLIC_BASE_PATH || "";
      // NEXT_PUBLIC_BASE_PATH may be a full origin or a relative path. Only prefix baseUrl with it when it's relative, otherwise
      // it already is the full base URL and should be used as-is.
      const isAbsoluteBasePath = /^https?:\/\//i.test(basePath);
      const effectiveBaseUrl = isAbsoluteBasePath ? basePath : `${baseUrl}${basePath}`;

      if (url.startsWith("/")) return `${effectiveBaseUrl}${url}`;

      try {
        if (new URL(url).origin === new URL(baseUrl).origin) return url;
      } catch {
        // Ignore invalid URLs and fall back to the base URL below.
      }

      return effectiveBaseUrl;
    },
    async session({ session, token }) {
      if (token) {
        const user = token.user as User;
        session.user = {
          name: user.name,
        };
      }
      return session;
    },
    async jwt({ token, user, account, profile, trigger }) {
      // Initial sign in
      if (account && user) {
        const expiresIn = account.expires_in ? (account.expires_in as number) * 1000 : 600 * 1000;

        return {
          access_token: account.access_token,
          accessTokenExpires: Date.now() + expiresIn,
          refreshToken: account.refresh_token,
          access_token_url: account.access_token_url,
          user: user,
        };
      }

      if (token.accessTokenExpires && Date.now() < (token.accessTokenExpires as number)) {
        return token;
      }

      const refreshedToken = await refreshAccessToken(
        token,
        process.env.PROTECTED_IDP_SCOPE!,
        process.env.PROTECTED_IDP_TOKEN_URL!,
        process.env.PROTECTED_IDP_CLIENT_ID!,
        process.env.PROTECTED_IDP_CLIENT_SECRET!
      );
      if (refreshedToken.error) {
        return { ...token, error: "RefreshAccessTokenError" };
      }

      return {
        ...token,
        access_token: refreshedToken.access_token,
        accessTokenExpires: Date.now() + (refreshedToken.expires_in as number) * 1000,
        refreshToken: refreshedToken.refresh_token ?? token.refreshToken,
      };
    },
  },
  session: {
    strategy: 'jwt',
    maxAge: parseInt(process.env.PROTECTED_IDP_SESSION_MAXAGE || "") || 600 // 10 minutes
  },
};
