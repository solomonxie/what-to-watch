export class ProviderHttpError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = 'ProviderHttpError';
  }
}

function redact(url: string): string {
  return url.replace(/(api_?key=)[^&]+/gi, '$1…');
}

export async function fetchJson<T>(url: string, timeoutMs = 10000): Promise<T> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal });
    if (!response.ok) {
      throw new ProviderHttpError(
        response.status,
        `Request to ${redact(url)} failed with ${response.status}`,
      );
    }
    return (await response.json()) as T;
  } finally {
    clearTimeout(timeout);
  }
}
