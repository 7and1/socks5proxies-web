"use client";

import { useState, useCallback } from "react";
import { env } from "../../lib/env";
import type { ProxyListResponse, FacetItem } from "../../types/proxy";
import { DEFAULT_PAGE_SIZE } from "../../config/proxy-constants";
import ProxyFilters from "./ProxyFilters";
import ProxyPagination from "./ProxyPagination";
import FacetLinks from "./FacetLinks";
import ProxyListInteractive from "./ProxyListInteractive";
import { LiveUpdateBadge } from "../shared/LiveUpdateBadge";
import { formatRelativeTime } from "../../lib/format";

interface ProxyListErrorBoundaryProps {
  title: string;
  description: string;
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
    offset?: number;
  };
  lockCountry?: boolean;
  lockProtocol?: boolean;
  lockPort?: boolean;
  facets: {
    countries: FacetItem[];
    ports: FacetItem[];
    protocols: FacetItem[];
    cities: FacetItem[];
    regions: FacetItem[];
    asns: FacetItem[];
  };
  initialError: string;
}

export function ProxyListErrorBoundary({
  title,
  description,
  basePath,
  filters,
  lockCountry,
  lockProtocol,
  lockPort,
  facets,
  initialError,
}: ProxyListErrorBoundaryProps) {
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters.offset ?? 0;

  const [isRetrying, setIsRetrying] = useState(false);
  const [error, setError] = useState<string | null>(initialError);
  const [response, setResponse] = useState<ProxyListResponse>({
    data: [],
    meta: {
      total: 0,
      limit,
      offset,
      cached: false,
      cache_age: 0,
    },
  });

  const handleRetry = useCallback(async () => {
    setIsRetrying(true);
    setError(null);

    try {
      const searchParams = new URLSearchParams();
      if (filters.country) searchParams.set("country", filters.country);
      if (filters.protocol) searchParams.set("protocol", filters.protocol);
      if (filters.port) searchParams.set("port", String(filters.port));
      if (filters.anonymity) searchParams.set("anonymity", filters.anonymity);
      if (filters.city) searchParams.set("city", filters.city);
      if (filters.region) searchParams.set("region", filters.region);
      if (filters.asn) searchParams.set("asn", String(filters.asn));
      if (filters.limit) searchParams.set("limit", String(filters.limit));
      if (filters.offset) searchParams.set("offset", String(filters.offset));

      const apiBase = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
      const url = `${apiBase}/api/proxies?${searchParams}`;

      const res = await fetch(url, { cache: "no-store" });

      if (!res.ok) {
        throw new Error(`API returned ${res.status}`);
      }

      const data: ProxyListResponse = await res.json();
      setResponse(data);
      setError(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load proxies");
    } finally {
      setIsRetrying(false);
    }
  }, [filters]);

  const query = {
    country: filters.country,
    protocol: filters.protocol,
    port: filters.port,
    anonymity: filters.anonymity,
    city: filters.city,
    region: filters.region,
    asn: filters.asn,
    limit,
  };

  const lastSyncLabel = response.meta.last_sync
    ? formatRelativeTime(response.meta.last_sync)
    : "";

  return (
    <div className="space-y-8">
      {error && (
        <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="font-medium">
                Proxy list data is temporarily unavailable.
              </p>
              <p className="mt-1 text-xs opacity-80">{error}</p>
            </div>
            <button
              onClick={handleRetry}
              disabled={isRetrying}
              className="rounded-xl bg-red-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-red-700 disabled:opacity-50 dark:bg-red-700 dark:hover:bg-red-600"
            >
              {isRetrying ? "Retrying..." : "Retry"}
            </button>
          </div>
        </div>
      )}

      <section className="mx-auto w-full max-w-7xl space-y-8 px-4 py-8 sm:px-6 lg:px-8 2xl:max-w-[96rem]">
        <div className="rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                Free Proxy Database
              </p>
              <h1 className="mt-2 text-3xl font-semibold">{title}</h1>
              <p className="mt-2 max-w-2xl text-sm text-ink-muted dark:text-sand-400">
                {description}
              </p>
            </div>
            <div className="rounded-2xl border border-ocean-200 bg-ocean-50 px-4 py-3 text-xs text-ocean-700 dark:border-ocean-800 dark:bg-ocean-950 dark:text-ocean-300">
              <div className="flex items-center justify-between gap-2">
                <div className="font-semibold">Dataset Snapshot</div>
                <LiveUpdateBadge ageSeconds={response.meta.cache_age} />
              </div>
              <div className="mt-1 flex flex-wrap gap-2">
                <span>{response.meta.total.toLocaleString()} proxies</span>
                <span>• cached {response.meta.cache_age}s ago</span>
                {lastSyncLabel ? <span>• last sync {lastSyncLabel}</span> : null}
              </div>
            </div>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[260px,1fr,240px]">
          <ProxyFilters
            countries={facets.countries}
            ports={facets.ports}
            protocols={facets.protocols}
            basePath={basePath}
            filters={{ ...filters, limit }}
            lockCountry={lockCountry}
            lockProtocol={lockProtocol}
            lockPort={lockPort}
          />

          <div className="space-y-4">
            <ProxyPagination
              basePath={basePath}
              limit={limit}
              offset={offset}
              total={response.meta.total}
              query={query}
            />
            <ProxyListInteractive
              data={response.data}
              basePath={basePath}
              query={query}
            />
            <ProxyPagination
              basePath={basePath}
              limit={limit}
              offset={offset}
              total={response.meta.total}
              query={query}
            />
          </div>

          <FacetLinks
            countries={facets.countries}
            ports={facets.ports}
            protocols={facets.protocols}
            cities={facets.cities}
            regions={facets.regions}
            asns={facets.asns}
          />
        </div>
      </section>
    </div>
  );
}
