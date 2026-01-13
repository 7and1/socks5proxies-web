import Link from "next/link";
import { memo } from "react";

interface ProxyPaginationProps {
  basePath: string;
  limit: number;
  offset: number;
  total: number;
  query: Record<string, string | number | undefined>;
}

function ProxyPagination({
  basePath,
  limit,
  offset,
  total,
  query,
}: ProxyPaginationProps) {
  const prevOffset = Math.max(0, offset - limit);
  const nextOffset = offset + limit;
  const hasPrev = offset > 0;
  const hasNext = nextOffset < total;

  const buildHref = (newOffset: number) => {
    const params = new URLSearchParams();
    Object.entries(query).forEach(([key, value]) => {
      if (value === undefined || value === "" || value === 0) return;
      params.set(key, String(value));
    });
    params.set("offset", String(newOffset));
    params.set("limit", String(limit));
    const queryString = params.toString();
    return queryString ? `${basePath}?${queryString}` : basePath;
  };

  const start = total === 0 ? 0 : offset + 1;
  const end = Math.min(offset + limit, total);
  const currentPage = Math.floor(offset / limit) + 1;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="flex items-center justify-between rounded-2xl border border-sand-200 bg-white/80 px-4 py-3 text-sm shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
      <div className="text-xs text-ink-muted dark:text-sand-400">
        Showing {start}-{end} of {total}
      </div>
      <div className="flex items-center gap-2">
        <Link
          href={buildHref(prevOffset)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            hasPrev
              ? "bg-sand-200 text-ink hover:bg-sand-300 dark:bg-sand-700 dark:text-sand-100 dark:hover:bg-sand-600"
              : "pointer-events-none bg-sand-100 text-ink-muted dark:bg-sand-800 dark:text-sand-500"
          }`}
          aria-disabled={!hasPrev}
          tabIndex={hasPrev ? undefined : -1}
        >
          Prev
        </Link>
        <span className="px-2 text-xs text-ink-muted dark:text-sand-400">
          {currentPage} / {totalPages}
        </span>
        <Link
          href={buildHref(nextOffset)}
          className={`rounded-full px-4 py-2 text-xs font-semibold transition ${
            hasNext
              ? "bg-ocean-600 text-white hover:bg-ocean-500"
              : "pointer-events-none bg-sand-100 text-ink-muted dark:bg-sand-800 dark:text-sand-500"
          }`}
          aria-disabled={!hasNext}
          tabIndex={hasNext ? undefined : -1}
        >
          Next
        </Link>
      </div>
    </div>
  );
}

export default memo(ProxyPagination);
