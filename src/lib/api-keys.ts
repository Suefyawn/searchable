/**
 * Admin API keys (ADR-40). Generated from /admin/api-keys, stored as SHA-256 hashes, honoured on
 * `Authorization: Bearer <key>` by getSessionUser(). Web Crypto only, so this runs unchanged on Workers.
 */
export const API_KEY_PREFIX = "spk_";
const PREFIX_SHOWN = 12;

const hex = (bytes: ArrayLike<number>) => Array.from(bytes, (b) => b.toString(16).padStart(2, "0")).join("");

/** A new key: the prefix plus 64 hex characters (256 bits). Shown once, never stored. */
export function generateApiKey(): string {
  return API_KEY_PREFIX + hex(crypto.getRandomValues(new Uint8Array(32)));
}

export async function hashApiKey(key: string): Promise<string> {
  return hex(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(key))));
}

/** What admin shows for a key: `spk_1a2b3c4d`. */
export function apiKeyPrefix(key: string): string {
  return key.slice(0, PREFIX_SHOWN);
}
