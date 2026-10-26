import jwt, { Algorithm } from "jsonwebtoken";
import jwksClient, { JwksClient } from "jwks-rsa";

export function isJwt(token: string): boolean {
  return token.split(".").length === 3;
}

interface DiscoveryMetadata {
  issuer?: string;
  jwks_uri?: string;
  id_token_signing_alg_values_supported?: string[];
}

let cachedDiscoveryPromise: Promise<DiscoveryMetadata> | null = null;

async function getDiscoveryMetadata(): Promise<DiscoveryMetadata> {
  if (!cachedDiscoveryPromise) {
    cachedDiscoveryPromise = (async () => {
      const wellKnownUrl = process.env.PROTECTED_IDP_WELL_KNOWN;
      if (!wellKnownUrl) {
        // No discovery document available; fall back to the explicitly configured values only.
        return {
          issuer: process.env.PROTECTED_IDP_ISSUER,
          jwks_uri: process.env.PROTECTED_IDP_JWKS_URL,
        };
      }
      const response = await fetch(wellKnownUrl);
      if (!response.ok) {
        throw new Error(`Failed to fetch well-known config: ${response.statusText}`);
      }
      return (await response.json()) as DiscoveryMetadata;
    })();
  }
  return cachedDiscoveryPromise;
}

let cachedJwksClient: JwksClient | undefined;
let cachedAlgorithms: Algorithm[] | undefined;

async function getVerificationContext(): Promise<{ client: JwksClient; algorithms: Algorithm[]; issuer?: string }> {
  const metadata = await getDiscoveryMetadata();
  const jwksUri = process.env.PROTECTED_IDP_JWKS_URL || metadata.jwks_uri;
  if (!jwksUri) {
    throw new Error("No JWKS URL configured (PROTECTED_IDP_JWKS_URL or well-known discovery); cannot verify JWTs");
  }

  if (!cachedJwksClient) {
    cachedJwksClient = jwksClient({ jwksUri });
  }
  if (!cachedAlgorithms) {
    // Only asymmetric algorithms are accepted, to avoid algorithm-confusion attacks (e.g. a client supplying
    // an HS256-signed token using the (public) JWKS key material as the HMAC secret). Derived from discovery
    // rather than a dedicated env var, since the IdP already publishes the algorithms it actually uses.
    const supported = (metadata.id_token_signing_alg_values_supported ?? []).filter((alg) => /^(RS|ES|PS)/.test(alg));
    cachedAlgorithms = (supported.length > 0 ? supported : ["RS256"]) as Algorithm[];
  }

  return { client: cachedJwksClient, algorithms: cachedAlgorithms, issuer: process.env.PROTECTED_IDP_ISSUER || metadata.issuer };
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

    const { client, algorithms, issuer } = await getVerificationContext();
    const signingKey = await client.getSigningKey(decoded.header.kid);

    const payload = jwt.verify(token, signingKey.getPublicKey(), {
      algorithms,
      audience: process.env.PROTECTED_IDP_CLIENT_ID,
      issuer,
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
