import {
  setGenericPassword,
  getGenericPassword,
  resetGenericPassword,
} from 'react-native-keychain';
import type { ProviderId } from '../types/domain';
import { demoApiKey, isDemo } from '../demo/demoMode';

const realService = (providerId: ProviderId) =>
  `whattowatch.apikey.${providerId}`;

// Demo mode keeps its own keys.
const serviceFor = (providerId: ProviderId) =>
  isDemo()
    ? `whattowatch.apikey.demo.${providerId}`
    : realService(providerId);

async function read(service: string): Promise<string | null> {
  const result = await getGenericPassword({ service });
  return result ? result.password : null;
}

export async function saveApiKey(
  providerId: ProviderId,
  apiKey: string,
): Promise<void> {
  await setGenericPassword(providerId, apiKey, {
    service: serviceFor(providerId),
  });
}

/** Demo mode: a key set there, else .env.demo's, else (read only) the real one. */
export async function getApiKey(
  providerId: ProviderId,
): Promise<string | null> {
  const own = await read(serviceFor(providerId));
  if (own || !isDemo()) return own;
  return demoApiKey(providerId) ?? (await read(realService(providerId)));
}

export async function clearApiKey(providerId: ProviderId): Promise<void> {
  await resetGenericPassword({ service: serviceFor(providerId) });
}

export async function hasApiKey(providerId: ProviderId): Promise<boolean> {
  const key = await getApiKey(providerId);
  return !!key;
}
