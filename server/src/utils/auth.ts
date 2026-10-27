import jwt, { Algorithm } from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-rsa";
import { getIssuerMetadata } from "@/services/openidClient.service";

export type accessToken = {
  value: string;
  expiresIn: number;
};

export function isJwt(token: string): boolean {
  return token.split(".").length === 3;
}

let cachedJwksClient: JwksClient | undefined;
let cachedAlgorithms: Algorithm[] | undefined;

async function getVerificationContext(): Promise<{ client: JwksClient; algorithms: Algorithm[] }> {
  if (!cachedJwksClient || !cachedAlgorithms) {
    const metadata = await getIssuerMetadata();
    if (!metadata.jwks_uri) {
      throw new Error("IdP metadata has no jwks_uri; cannot verify JWTs");
    }
    cachedJwksClient = jwksClient({ jwksUri: metadata.jwks_uri });
    // Only asymmetric algorithms are accepted, to avoid algorithm-confusion attacks (e.g. a client supplying
    // an HS256-signed token using the (public) JWKS key material as the HMAC secret). Derived from discovery
    // rather than a dedicated env var, since the IdP already publishes the algorithms it actually uses.
    const supportedAlgValues = metadata.id_token_signing_alg_values_supported as string[] | undefined;
    const supported = (supportedAlgValues ?? []).filter((alg) => /^(RS|ES|PS)/.test(alg)) as Algorithm[];
    cachedAlgorithms = supported.length > 0 ? supported : ["RS256"];
  }
  return { client: cachedJwksClient, algorithms: cachedAlgorithms };
}

/**
 * Verifies a JWT access token's signature, issuer and audience against the configured IdP (via JWKS), and
 * returns its claims. Returns null (rather than throwing) on any verification failure, mirroring how a
 * failed userinfo call is treated elsewhere - i.e. the caller should treat the token as unauthenticated.
 */
export async function verifyAndDecodeIdpToken(token: string): Promise<jwt.JwtPayload | null> {
  try {
    const decoded = jwt.decode(token, { complete: true });
    if (!decoded || typeof decoded === "string" || !decoded.header.kid) {
      console.warn(`[${new Date().toISOString()}] JWT is missing a 'kid' header; cannot verify`);
      return null;
    }

    const { client, algorithms } = await getVerificationContext();
    const signingKey = await client.getSigningKey(decoded.header.kid);
    const metadata = await getIssuerMetadata();

    const payload = jwt.verify(token, signingKey.getPublicKey(), {
      algorithms,
      audience: process.env.AUDIENCE || process.env.CLIENT_ID,
      issuer: metadata.issuer,
    });
    return typeof payload === "string" ? null : payload;
  } catch (error) {
    console.warn(`[${new Date().toISOString()}] JWT verification failed:`, error);
    return null;
  }
}

/**
 * Extracts the groups/roles claim from already-verified IdP token claims (or a userinfo response - both
 * use the same claim name). Mirrors the shapes OpenMaps' IdPs are known to use: an array, a comma-separated
 * string, or (e.g. Zitadel's per-org roles) an object whose keys are the role/group names.
 */
export function extractGroupsFromClaims(claims: Record<string, any>): string[] {
  const raw = claims[process.env.PROTECTED_IDP_CLAIM_ROLES ?? "groups"];
  if (typeof raw === "string") {
    return raw.split(",").map((group) => group.trim());
  } else if (Array.isArray(raw)) {
    return raw;
  } else if (raw && typeof raw === "object") {
    return Object.keys(raw);
  }
  return [];
}

export function extractUsernameFromClaims(claims: Record<string, any>): string {
  const usernameClaim = process.env.PROTECTED_IDP_CLAIM_USERNAME;
  return (usernameClaim && claims[usernameClaim]) ?? claims.sub ?? claims.email;
}

export function extractTokenFromRequest(req: any): accessToken | null {
  const cookies = req.cookies;

  if (cookies && cookies.oidc_access_token && cookies.oidc_access_token_expires_in) {
    return { value: cookies.oidc_access_token, expiresIn: cookies.oidc_access_token_expires_in };
  }

  // if no auth in cookies check the headers
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    return { value: authHeader.substring(7), expiresIn: 0 };
  }
  // If no auth header, check the session
  if (req.session && (req.session as any).accessToken) {
    return {
      value: (req.session as any).accessToken,
      expiresIn: (req.session as any).expires_in ? Date.now() + (req.session as any).expires_in * 1000 : 0,
    };
  } else {
    console.log(`[${new Date().toISOString()}] No token found in session`);
  }

  return null;
}
