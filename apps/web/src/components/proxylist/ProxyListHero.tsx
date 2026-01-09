import Link from "next/link";
import { ArrowRight } from "lucide-react";
import type { ProxyData } from "../../types/proxy";
import { countryCodeToFlag } from "../../lib/flags";
import { formatRelativeTime } from "../../lib/format";
import { LiveUpdateBadge } from "../shared/LiveUpdateBadge";

interface ProxyListHeroProps {
  proxies: ProxyData[];
  cacheAge?: number;
}

export function ProxyListHero({ proxies, cacheAge = 0 }: ProxyListHeroProps) {
  const preview = proxies.slice(0, 8);

  return (
    <div className="card-hover rounded-3xl border border-sand-200/80 bg-white/90 p-6 shadow-xl backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Live Proxy Feed
        </p>
        <LiveUpdateBadge ageSeconds={cacheAge} />
      </div>
      <div
        className="mt-5 space-y-3"
        role="list"
        aria-label="Latest proxy updates"
      >
        {preview.length === 0
          ? Array.from({ length: 5 }).map((_, idx) => (
              <div
                key={`skeleton-${idx}`}
                className="h-12 rounded-2xl bg-sand-100/80 dark:bg-sand-800/60 skeleton"
              />
            ))
          : preview.map((proxy) => (
              <div
                key={`${proxy.ip}-${proxy.port}`}
                role="listitem"
                className="flex items-center justify-between rounded-2xl border border-sand-200 bg-sand-50/80 px-4 py-3 text-sm transition-all hover:border-ocean-200 hover:bg-ocean-50/60 dark:border-sand-700 dark:bg-sand-800/80 dark:hover:border-ocean-700 dark:hover:bg-ocean-900/30"
              >
                <div className="flex items-center gap-3">
                  <span className="flex h-9 w-9 items-center justify-center rounded-lg bg-sand-200 text-lg dark:bg-sand-700">
                    {countryCodeToFlag(proxy.country_code)}
                  </span>
                  <div>
                    <p className="font-mono text-xs">
                      {proxy.ip}:{proxy.port}
                    </p>
                    <p className="text-xs text-ink-muted dark:text-sand-400">
                      {proxy.country_name || proxy.country_code || "Unknown"} •
                      Last seen {formatRelativeTime(proxy.last_seen)}
                    </p>
                  </div>
                </div>
                <div className="text-right">
                  <div className="flex flex-wrap justify-end gap-1">
                    {proxy.protocols.slice(0, 2).map((protocol) => (
                      <span
                        key={`${proxy.ip}-${protocol}`}
                        className="rounded-full bg-ocean-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-widest text-ocean-700 dark:bg-ocean-900/40 dark:text-ocean-300"
                      >
                        {protocol}
                      </span>
                    ))}
                  </div>
                  <p className="mt-1 text-xs text-ink-muted dark:text-sand-400">
                    Uptime {proxy.uptime}%
                  </p>
                </div>
              </div>
            ))}
      </div>
      <div className="mt-5 flex items-center justify-between text-xs text-ink-muted dark:text-sand-400">
        <span>Streaming from the live proxy database.</span>
        <Link
          href="/free-proxy-list"
          className="inline-flex items-center gap-1 font-semibold text-ocean-700 hover:gap-2 dark:text-ocean-400"
        >
          Browse full list
          <ArrowRight className="h-3 w-3" />
        </Link>
      </div>
    </div>
  );
}
