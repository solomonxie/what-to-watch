import {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
} from 'react-native-keychain';
import type { ProviderId } from '../types/domain';

const serviceFor = (providerId: ProviderId) =>
  `whattowatch.apikey.${providerId}`;

export async function saveApiKey(
  providerId: ProviderId,
  apiKey: string,
): Promise<void> {
  await setGenericPassword(providerId, apiKey, {
    service: serviceFor(providerId),
  });
}

export async function getApiKey(
  providerId: ProviderId,
): Promise<string | null> {
  const result = await getGenericPassword({ service: serviceFor(providerId) });
  if (!result) return null;
  return result.password;
}

export async function clearApiKey(providerId: ProviderId): Promise<void> {
  await resetGenericPassword({ service: serviceFor(providerId) });
}

export async function hasApiKey(providerId: ProviderId): Promise<boolean> {
  const key = await getApiKey(providerId);
  return !!key;
}
