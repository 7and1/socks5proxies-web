import Link from "next/link";
import type { FacetItem } from "../../types/proxy";
import { countryCodeToFlag } from "../../lib/flags";

interface CountryGridProps {
  countries: FacetItem[];
  limit?: number;
}

export function CountryGrid({ countries, limit = 6 }: CountryGridProps) {
  const top = countries.slice(0, limit);

  return (
    <div id="countries" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {top.map((country) => (
        <Link
          key={country.key}
          href={`/free-proxy-list/country/${country.key.toLowerCase()}`}
          className="group rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ocean-200 hover:shadow-md dark:border-sand-700 dark:bg-sand-900/70"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <span className="text-xl">{countryCodeToFlag(country.key)}</span>
              <div>
                <p className="text-sm font-semibold">
                  {country.metadata?.name || country.key}
                </p>
                <p className="text-xs text-ink-muted dark:text-sand-400">
                  {country.key.toUpperCase()}
                </p>
              </div>
            </div>
            <span className="rounded-full bg-sand-100 px-2 py-1 text-xs font-semibold text-ink-muted dark:bg-sand-800 dark:text-sand-400">
              {country.count.toLocaleString()}
            </span>
          </div>
          <p className="mt-3 text-xs text-ink-muted dark:text-sand-400">
            Browse proxies in {country.metadata?.name || country.key}.
          </p>
        </Link>
      ))}
    </div>
  );
}
