export interface PasswordRule {
  /** Shown in the checklist under a password field. */
  label: string;
  message: string;
  test: (value: string) => boolean;
}

export const PASSWORD_RULES: ReadonlyArray<PasswordRule> = [
  {
    label: 'At least 8 characters',
    message: 'Password must be between 8 and 64 characters long.',
    test: (value) => value.length >= 8 && value.length <= 64,
  },
  {
    label: 'A letter',
    message: 'Password must contain at least 1 letter.',
    test: (value) => /[A-Za-z]/.test(value),
  },
  {
    label: 'A number',
    message: 'Password must contain at least 1 number.',
    test: (value) => /\d/.test(value),
  },
  {
    label: 'A symbol',
    message: 'Password must contain at least 1 special character.',
    test: (value) => /[^A-Za-z0-9]/.test(value),
  },
];

/** Returns the message for the first unmet rule, or null if `value` satisfies all of them. */
export function validatePassword(value: string): string | null {
  const failed = PASSWORD_RULES.find((rule) => !rule.test(value));
  return failed ? failed.message : null;
}

// Excludes visually-confusable characters (0/O, 1/l/I) — this is read off a screen and
// handed to someone, not typed from memory.
const PASSWORD_LOWER = 'abcdefghjkmnpqrstuvwxyz';
const PASSWORD_UPPER = 'ABCDEFGHJKMNPQRSTUVWXYZ';
const PASSWORD_DIGITS = '23456789';
const PASSWORD_SYMBOLS = '!@#$%^&*-_';
const PASSWORD_ALL_CHARS = PASSWORD_LOWER + PASSWORD_UPPER + PASSWORD_DIGITS + PASSWORD_SYMBOLS;

/**
 * A random password that always satisfies `PASSWORD_RULES` — one character from each
 * category is placed first, so the length/letter/number/symbol rules can never fail, then
 * the rest (and a final shuffle) come from the combined pool via `crypto.getRandomValues`.
 */
export function generateRandomPassword(length = 16): string {
  const pools = [PASSWORD_LOWER, PASSWORD_UPPER, PASSWORD_DIGITS, PASSWORD_SYMBOLS];
  // Two independent draws — picking a char and shuffling its position from the same
  // random value would make each position's destination derivable from its own character.
  const picks = new Uint32Array(length);
  const shuffles = new Uint32Array(length);
  crypto.getRandomValues(picks);
  crypto.getRandomValues(shuffles);

  const chars = pools.map((pool, i) => pool[picks[i]! % pool.length]!);
  for (let i = pools.length; i < length; i++) {
    chars.push(PASSWORD_ALL_CHARS[picks[i]! % PASSWORD_ALL_CHARS.length]!);
  }

  for (let i = chars.length - 1; i > 0; i--) {
    const j = shuffles[i]! % (i + 1);
    [chars[i], chars[j]] = [chars[j]!, chars[i]!];
  }

  return chars.join('');
}
