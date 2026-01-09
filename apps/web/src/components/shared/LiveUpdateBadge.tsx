import { formatRelativeSeconds } from "../../lib/format";

interface LiveUpdateBadgeProps {
  ageSeconds?: number;
  label?: string;
}

export function LiveUpdateBadge({
  ageSeconds = 0,
  label,
}: LiveUpdateBadgeProps) {
  const freshnessLabel = formatRelativeSeconds(ageSeconds);
  let tone = "bg-emerald-500";
  let text = "text-emerald-700 dark:text-emerald-300";
  let ring = "bg-emerald-100 dark:bg-emerald-900/40";

  if (ageSeconds >= 900) {
    tone = "bg-red-500";
    text = "text-red-700 dark:text-red-300";
    ring = "bg-red-100 dark:bg-red-900/40";
  } else if (ageSeconds >= 300) {
    tone = "bg-amber-500";
    text = "text-amber-700 dark:text-amber-300";
    ring = "bg-amber-100 dark:bg-amber-900/40";
  }

  return (
    <span
      className={`inline-flex items-center gap-2 rounded-full ${ring} px-3 py-1 text-xs font-semibold ${text}`}
    >
      <span className={`h-2 w-2 rounded-full ${tone}`} />
      {label ? `${label} ${freshnessLabel}` : `Updated ${freshnessLabel}`}
    </span>
  );
}
