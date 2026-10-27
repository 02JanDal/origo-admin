import { Issuer, Client, custom } from "openid-client";

if (process.env.TIMEOUT) {
  custom.setHttpOptionsDefaults({
    timeout: parseInt(process.env.TIMEOUT),
  });
}

let client: Client | undefined;

export const getOpenidClient = async (): Promise<Client> => {
  if (client) {
    return client;
  }
  const issuer = await Issuer.discover(process.env.WELL_KNOWN!);
  client = new issuer.Client({
    client_id: process.env.CLIENT_ID!,
    client_secret: process.env.CLIENT_SECRET!,
    redirect_uris: [process.env.REDIRECT_URI!],
    response_types: ["code"],
    grant_types: ["authorization_code", "refresh_token"],
  });
  return client;
};

/**
 * Exposes the discovered issuer metadata (jwks_uri, issuer, supported signing algorithms, ...) for callers
 * that need to verify tokens locally (see utils/auth.ts) without duplicating OIDC discovery.
 */
export const getIssuerMetadata = async (): Promise<Issuer["metadata"]> => {
  const openidClient = await getOpenidClient();
  return openidClient.issuer.metadata;
};
