export function countryCodeToFlag(code?: string): string {
  if (!code || code.length !== 2) return "🌐";
  const base = 0x1f1e6;
  const chars = code.toUpperCase().split("");
  const first = chars[0].charCodeAt(0) - 65;
  const second = chars[1].charCodeAt(0) - 65;
  if (first < 0 || second < 0 || first > 25 || second > 25) return "🌐";
  return String.fromCodePoint(base + first, base + second);
}
