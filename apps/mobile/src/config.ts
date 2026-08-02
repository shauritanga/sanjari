import Constants from 'expo-constants';

const configuredApiUrl = (Constants.expoConfig?.extra as { apiUrl?: unknown } | undefined)?.apiUrl;

export const API_URL =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl
    : 'http://37.60.238.125:3400/api/v1';
