/** 0-9 A-Z without I, L, O, U — what the service accepts in a ticket code. */
const ALPHABET = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';

/**
 * A ticket code for a new category, derived from its name: the first three
 * allowed letters or digits, padded with `0`. When that is taken, the last
 * character is varied, then the middle one. Null only if every code is taken.
 *
 * The service still decides uniqueness; this only avoids the codes already
 * known to be in use.
 */
export function suggestTicketCode(name: string, takenCodes: readonly string[]): string | null {
  const taken = new Set(takenCodes.map((code) => code.toUpperCase()));
  const letters = [...name.toUpperCase()].filter((ch) => ALPHABET.includes(ch));
  const [first, second, third] = [...letters.slice(0, 3), '0', '0', '0'];

  const candidates = [
    `${first}${second}${third}`,
    ...[...ALPHABET].map((last) => `${first}${second}${last}`),
    ...[...ALPHABET].flatMap((middle) => [...ALPHABET].map((last) => `${first}${middle}${last}`)),
  ];
  return candidates.find((code) => !taken.has(code)) ?? null;
}
