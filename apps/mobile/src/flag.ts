/** Converts an ISO 3166-1 alpha-2 country code (e.g. "TZ") into its flag emoji. */
export function flagEmojiFor(countryCode?: string | null): string {
  if (!countryCode || countryCode.length !== 2) return '';
  const codePoints = countryCode
    .toUpperCase()
    .split('')
    .map((char) => 127397 + char.charCodeAt(0));
  return String.fromCodePoint(...codePoints);
}
