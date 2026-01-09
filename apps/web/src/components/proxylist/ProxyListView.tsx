import { getFacets, getProxyList } from "../../lib/api-client";
import type { FacetItem, ProxyListResponse } from "../../types/proxy";
import { DEFAULT_PAGE_SIZE } from "../../config/proxy-constants";
import { ProxyFilters } from "./ProxyFilters";
import { ProxyPagination } from "./ProxyPagination";
import { FacetLinks } from "./FacetLinks";
import { ProxyListInteractive } from "./ProxyListInteractive";
import { LiveUpdateBadge } from "../shared/LiveUpdateBadge";

interface ProxyListViewProps {
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
}

async function fetchFacets(): Promise<{
  countries: FacetItem[];
  ports: FacetItem[];
  protocols: FacetItem[];
  cities: FacetItem[];
  regions: FacetItem[];
  asns: FacetItem[];
}> {
  const defaultLimit = 200;
  const [countries, ports, protocols] = await Promise.all([
    getFacets("countries", { limit: defaultLimit }).catch(() => []),
    getFacets("ports", { limit: defaultLimit }).catch(() => []),
    getFacets("protocols", { limit: defaultLimit }).catch(() => []),
  ]);

  const [cities, regions, asns] = await Promise.all([
    getFacets("cities", { limit: defaultLimit }).catch(() => []),
    getFacets("regions", { limit: defaultLimit }).catch(() => []),
    getFacets("asns", { limit: defaultLimit }).catch(() => []),
  ]);

  return { countries, ports, protocols, cities, regions, asns };
}

export async function ProxyListView({
  title,
  description,
  basePath,
  filters,
  lockCountry,
  lockProtocol,
  lockPort,
}: ProxyListViewProps) {
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters.offset ?? 0;

  let proxyResponse: ProxyListResponse = {
    data: [],
    meta: {
      total: 0,
      limit,
      offset,
      cached: false,
      cache_age: 0,
    },
  };
  let errorMessage = "";

  try {
    const [response, facets] = await Promise.all([
      getProxyList({ ...filters, limit, offset }),
      fetchFacets(),
    ]);
    proxyResponse = response;
    return (
      <ProxyListContent
        title={title}
        description={description}
        basePath={basePath}
        filters={filters}
        lockCountry={lockCountry}
        lockProtocol={lockProtocol}
        lockPort={lockPort}
        facets={facets}
        response={proxyResponse}
      />
    );
  } catch (error) {
    errorMessage =
      error instanceof Error
        ? error.message
        : "Unable to load proxy data right now.";
  }

  const fallbackFacets = await fetchFacets();

  return (
    <div className="space-y-8">
      <div className="rounded-3xl border border-red-200 bg-red-50/80 p-6 text-sm text-red-700 dark:border-red-800 dark:bg-red-900/20 dark:text-red-200">
        Proxy list data is temporarily unavailable. {errorMessage}
      </div>
      <ProxyListContent
        title={title}
        description={description}
        basePath={basePath}
        filters={filters}
        lockCountry={lockCountry}
        lockProtocol={lockProtocol}
        lockPort={lockPort}
        facets={fallbackFacets}
        response={proxyResponse}
      />
    </div>
  );
}

function ProxyListContent({
  title,
  description,
  basePath,
  filters,
  lockCountry,
  lockProtocol,
  lockPort,
  facets,
  response,
}: {
  title: string;
  description: string;
  basePath: string;
  filters: ProxyListViewProps["filters"];
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
  response: ProxyListResponse;
}) {
  const limit = filters.limit ?? DEFAULT_PAGE_SIZE;
  const offset = filters.offset ?? 0;
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

  return (
    <section className="space-y-8">
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
            <div className="mt-1">
              {response.meta.total.toLocaleString()} proxies • cached{" "}
              {response.meta.cache_age}s ago
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
  );
}
