export function formatRelativeSeconds(ageSeconds: number): string {
  if (!Number.isFinite(ageSeconds) || ageSeconds < 0) return "--";
  if (ageSeconds < 60) return `${Math.round(ageSeconds)}s ago`;
  if (ageSeconds < 3600) return `${Math.round(ageSeconds / 60)}m ago`;
  if (ageSeconds < 86400) return `${Math.round(ageSeconds / 3600)}h ago`;
  return `${Math.round(ageSeconds / 86400)}d ago`;
}

export function formatRelativeTime(
  isoTimestamp?: string,
  now = new Date(),
): string {
  if (!isoTimestamp) return "--";
  const parsed = new Date(isoTimestamp);
  if (Number.isNaN(parsed.getTime())) return "--";
  const diffSeconds = Math.max(0, (now.getTime() - parsed.getTime()) / 1000);
  return formatRelativeSeconds(diffSeconds);
}
