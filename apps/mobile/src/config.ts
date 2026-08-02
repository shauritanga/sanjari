import Constants from 'expo-constants';

const configuredApiUrl = Constants.expoConfig?.extra?.apiUrl;

export const API_URL =
  typeof configuredApiUrl === 'string' && configuredApiUrl.length > 0
    ? configuredApiUrl
    : 'http://192.168.100.104:4000/api/v1';
