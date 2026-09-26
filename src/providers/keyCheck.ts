import { ProviderHttpError, fetchJson } from './httpClient';

export type KeyProvider = 'tmdb' | 'omdb';

/** Resolves if the provider accepts the key; throws with a user-facing message otherwise. */
export async function verifyApiKey(
  provider: KeyProvider,
  key: string,
): Promise<void> {
  const url =
    provider === 'tmdb'
      ? `https://api.themoviedb.org/3/configuration?api_key=${encodeURIComponent(
          key,
        )}`
      : `https://www.omdbapi.com/?apikey=${encodeURIComponent(
          key,
        )}&i=tt0111161`;
  const name = provider === 'tmdb' ? 'TMDB' : 'OMDb';
  try {
    const data = await fetchJson<{ Response?: string; Error?: string }>(url);
    if (data.Response === 'False')
      throw new Error(`${name} rejected this key (${data.Error}).`);
  } catch (error) {
    if (error instanceof ProviderHttpError) {
      throw new Error(`${name} rejected this key (${error.status}).`);
    }
    throw error;
  }
}
