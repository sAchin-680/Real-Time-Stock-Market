/** OAuth providers, enabled only when their credentials are configured. */
export type SocialProviderId = 'google' | 'apple' | 'microsoft';

export const SOCIAL_PROVIDERS: { id: SocialProviderId; label: string }[] = [
  { id: 'google', label: 'Google' },
  { id: 'apple', label: 'Apple' },
  { id: 'microsoft', label: 'Microsoft' },
];

const env = (key: string) => process.env[key]?.trim() || undefined;

const creds = (prefix: string) => {
  const clientId = env(`${prefix}_CLIENT_ID`);
  const clientSecret = env(`${prefix}_CLIENT_SECRET`);
  return clientId && clientSecret ? { clientId, clientSecret } : null;
};

export function getSocialProviderConfig() {
  const google = creds('GOOGLE');
  // Apple: CLIENT_ID is the Services ID; CLIENT_SECRET is the signed JWT generated from your .p8 key.
  const apple = creds('APPLE');
  const microsoft = creds('MICROSOFT');
  return {
    ...(google && { google: { ...google, prompt: 'select_account' as const } }),
    ...(apple && { apple: { ...apple, appBundleIdentifier: env('APPLE_APP_BUNDLE_IDENTIFIER') } }),
    ...(microsoft && {
      microsoft: { ...microsoft, tenantId: env('MICROSOFT_TENANT_ID') || 'common', prompt: 'select_account' as const },
    }),
  };
}

export const getEnabledSocialProviders = (): SocialProviderId[] =>
  SOCIAL_PROVIDERS.map((p) => p.id).filter((id) => id in getSocialProviderConfig());
