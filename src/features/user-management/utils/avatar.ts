const AVATAR_PALETTE = [
  { bg: 'bg-[#d1fae5]', color: 'text-[#065f46]' },
  { bg: 'bg-blue-100', color: 'text-blue-700' },
  { bg: 'bg-orange-100', color: 'text-orange-700' },
  { bg: 'bg-purple-100', color: 'text-purple-700' },
  { bg: 'bg-pink-100', color: 'text-pink-700' },
  { bg: 'bg-yellow-100', color: 'text-yellow-700' },
  { bg: 'bg-teal-100', color: 'text-teal-700' },
  { bg: 'bg-red-100', color: 'text-red-700' },
  { bg: 'bg-gray-100', color: 'text-gray-700' },
];

const FALLBACK_PALETTE_ENTRY = { bg: 'bg-gray-100', color: 'text-gray-700' };

export function initialsOf(name: string): string {
  return (
    name
      .split(' ')
      .map((part) => part[0])
      .filter(Boolean)
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'NA'
  );
}

/** Deterministic by name, not random — so a person's avatar color stays stable across refetches. */
export function avatarForName(name: string): { initials: string; bg: string; color: string } {
  const palette = AVATAR_PALETTE[name.length % AVATAR_PALETTE.length] ?? FALLBACK_PALETTE_ENTRY;
  return { initials: initialsOf(name), bg: palette.bg, color: palette.color };
}
