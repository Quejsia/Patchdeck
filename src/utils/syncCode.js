// Excludes visually ambiguous characters (0/O, 1/I/L) so codes are easy to
// read and type correctly between devices.
const ALPHABET = 'ABCDEFGHJKMNPQRSTUVWXYZ23456789';

/**
 * Generates an 8-character sync code like "XQP4-7K2M", using
 * crypto.getRandomValues (not Math.random) so codes aren't practically
 * guessable — 32^8 possible codes, and there's no way to enumerate/list
 * existing codes through the API, only exact lookup.
 */
export function generateSyncCode() {
  const bytes = new Uint8Array(8);
  crypto.getRandomValues(bytes);
  let code = '';
  for (let i = 0; i < bytes.length; i++) {
    code += ALPHABET[bytes[i] % ALPHABET.length];
  }
  return `${code.slice(0, 4)}-${code.slice(4)}`;
}

/** Normalizes user-typed input (case/whitespace) before it's used as a lookup key. */
export function normalizeSyncCode(raw) {
  return raw.trim().toUpperCase();
}
