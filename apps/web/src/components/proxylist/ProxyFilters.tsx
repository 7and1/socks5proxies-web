import { COMMON_PORTS } from "../../config/proxy-constants";
import type { FacetItem } from "../../types/proxy";

interface ProxyFiltersProps {
  countries: FacetItem[];
  ports: FacetItem[];
  protocols: FacetItem[];
  basePath: string;
  filters: {
    country?: string;
    protocol?: string;
    port?: number;
    anonymity?: string;
    city?: string;
    region?: string;
    asn?: number;
    limit?: number;
  };
  lockCountry?: boolean;
  lockProtocol?: boolean;
  lockPort?: boolean;
}

export function ProxyFilters({
  countries,
  ports,
  protocols,
  basePath,
  filters,
  lockCountry,
  lockProtocol,
  lockPort,
}: ProxyFiltersProps) {
  const portOptions =
    ports.length > 0
      ? ports.slice(0, 12).map((item) => item.key)
      : COMMON_PORTS.map((port) => String(port));

  return (
    <form
      action={basePath}
      method="get"
      className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70"
    >
      <input type="hidden" name="offset" value="0" />
      {filters.city ? (
        <input type="hidden" name="city" value={filters.city} />
      ) : null}
      {filters.region ? (
        <input type="hidden" name="region" value={filters.region} />
      ) : null}
      {filters.asn ? (
        <input type="hidden" name="asn" value={filters.asn} />
      ) : null}
      <div className="space-y-4">
        <div>
          <label
            htmlFor="filter-country"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400"
          >
            Country
          </label>
          {lockCountry ? (
            <>
              <input type="hidden" name="country" value={filters.country} />
              <div
                id="filter-country"
                className="mt-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm dark:border-sand-700 dark:bg-sand-800"
              >
                {filters.country || "All Countries"}
              </div>
            </>
          ) : (
            <select
              id="filter-country"
              name="country"
              defaultValue={filters.country || ""}
              className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-ocean-400 focus:outline-none dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
            >
              <option value="">All Countries</option>
              {countries.slice(0, 60).map((country) => (
                <option key={country.key} value={country.key}>
                  {country.metadata?.name || country.key} ({country.count})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor="filter-protocol"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400"
          >
            Protocol
          </label>
          {lockProtocol ? (
            <>
              <input type="hidden" name="protocol" value={filters.protocol} />
              <div
                id="filter-protocol"
                className="mt-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm uppercase dark:border-sand-700 dark:bg-sand-800"
              >
                {filters.protocol || "All Protocols"}
              </div>
            </>
          ) : (
            <select
              id="filter-protocol"
              name="protocol"
              defaultValue={filters.protocol || ""}
              className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-ocean-400 focus:outline-none dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
            >
              <option value="">All Protocols</option>
              {protocols.map((protocol) => (
                <option key={protocol.key} value={protocol.key}>
                  {protocol.key.toUpperCase()} ({protocol.count})
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor="filter-port"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400"
          >
            Port
          </label>
          {lockPort ? (
            <>
              <input type="hidden" name="port" value={filters.port} />
              <div
                id="filter-port"
                className="mt-2 rounded-xl border border-sand-200 bg-sand-50 px-3 py-2 text-sm dark:border-sand-700 dark:bg-sand-800"
              >
                {filters.port || "Any Port"}
              </div>
            </>
          ) : (
            <select
              id="filter-port"
              name="port"
              defaultValue={filters.port ? String(filters.port) : ""}
              className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-ocean-400 focus:outline-none dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
            >
              <option value="">Any Port</option>
              {portOptions.map((port) => (
                <option key={port} value={port}>
                  {port}
                </option>
              ))}
            </select>
          )}
        </div>

        <div>
          <label
            htmlFor="filter-anonymity"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400"
          >
            Anonymity
          </label>
          <select
            id="filter-anonymity"
            name="anonymity"
            defaultValue={filters.anonymity || ""}
            className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-ocean-400 focus:outline-none dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
          >
            <option value="">All Levels</option>
            <option value="elite">Elite</option>
            <option value="anonymous">Anonymous</option>
            <option value="transparent">Transparent</option>
          </select>
        </div>

        <div>
          <label
            htmlFor="filter-limit"
            className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400"
          >
            Page Size
          </label>
          <select
            id="filter-limit"
            name="limit"
            defaultValue={filters.limit ? String(filters.limit) : "25"}
            className="mt-2 w-full rounded-xl border border-sand-200 bg-white px-3 py-2 text-sm text-ink shadow-sm focus:border-ocean-400 focus:outline-none dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
          >
            <option value="25">25 per page</option>
            <option value="50">50 per page</option>
            <option value="100">100 per page</option>
          </select>
        </div>

        <div className="flex gap-2">
          <button
            type="submit"
            className="flex-1 rounded-full bg-ocean-600 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-ocean-600/30 transition hover:-translate-y-0.5 hover:bg-ocean-500"
          >
            Apply Filters
          </button>
          <a
            href={basePath}
            className="rounded-full border border-sand-300 bg-white px-4 py-2.5 text-sm font-semibold text-ink-muted transition hover:bg-sand-50 dark:border-sand-600 dark:bg-sand-800 dark:text-sand-300 dark:hover:bg-sand-700"
          >
            Clear
          </a>
        </div>
      </div>
    </form>
  );
}
