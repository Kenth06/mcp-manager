export type AuthType = 'public' | 'api_key' | 'oauth';

export type OAuthConfig = {
  provider?: string | null;
  clientId?: string | null;
  clientSecret?: string | null;
  introspectionUrl?: string | null;
  scopes?: string[] | string | null;
};

export function buildAuthSecrets(
  authType: AuthType,
  apiKeyHash?: string | null,
  oauth?: OAuthConfig
): Record<string, string> {
  const secrets: Record<string, string> = {};

  if (authType === 'api_key' && apiKeyHash) {
    secrets.MCP_API_KEY_HASH = apiKeyHash;
  }

  if (authType === 'oauth' && oauth) {
    if (oauth.provider) {
      secrets.OAUTH_PROVIDER = oauth.provider;
    }
    if (oauth.clientId) {
      secrets.OAUTH_CLIENT_ID = oauth.clientId;
    }
    if (oauth.clientSecret) {
      secrets.OAUTH_CLIENT_SECRET = oauth.clientSecret;
    }
    if (oauth.introspectionUrl) {
      secrets.OAUTH_INTROSPECTION_URL = oauth.introspectionUrl;
    }
    if (oauth.scopes) {
      secrets.OAUTH_SCOPES = Array.isArray(oauth.scopes)
        ? JSON.stringify(oauth.scopes)
        : String(oauth.scopes);
    }
  }

  return secrets;
}
