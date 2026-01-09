import Link from "next/link";
import type { FacetItem } from "../../types/proxy";

interface FacetLinksProps {
  countries: FacetItem[];
  ports: FacetItem[];
  protocols: FacetItem[];
  cities: FacetItem[];
  regions: FacetItem[];
  asns: FacetItem[];
}

function splitKey(key: string) {
  const parts = key.split("|");
  if (parts.length >= 2) {
    return { country: parts[0], value: parts.slice(1).join("|") };
  }
  return { country: "", value: key };
}

export function FacetLinks({
  countries,
  ports,
  protocols,
  cities,
  regions,
  asns,
}: FacetLinksProps) {
  return (
    <div className="space-y-6">
      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Top Countries
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {countries.slice(0, 8).map((country) => (
            <li key={country.key}>
              <Link
                href={`/free-proxy-list/country/${country.key.toLowerCase()}`}
                className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
              >
                <span>{country.metadata?.name || country.key}</span>
                <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                  {country.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Popular Ports
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {ports.slice(0, 8).map((port) => (
            <li key={port.key}>
              <Link
                href={`/free-proxy-list/port/${port.key}`}
                className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
              >
                <span>{port.key}</span>
                <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                  {port.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Protocols
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {protocols.map((protocol) => (
            <li key={protocol.key}>
              <Link
                href={
                  protocol.key === "socks5"
                    ? "/socks5-proxy-list"
                    : protocol.key === "http"
                      ? "/http-proxy-list"
                      : protocol.key === "https"
                        ? "/https-proxy-list"
                        : `/free-proxy-list/protocol/${protocol.key}`
                }
                className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
              >
                <span className="uppercase">{protocol.key}</span>
                <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                  {protocol.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Top Cities
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {cities.slice(0, 8).map((city) => {
            const info = splitKey(city.key);
            const country = city.metadata?.country_code || info.country;
            const name = city.metadata?.name || info.value;
            if (!country) {
              return null;
            }
            return (
              <li key={city.key}>
                <Link
                  href={`/free-proxy-list/city/${country.toLowerCase()}/${encodeURIComponent(
                    name,
                  )}`}
                  className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
                >
                  <span>{name}</span>
                  <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                    {city.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Top Regions
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {regions.slice(0, 8).map((region) => {
            const info = splitKey(region.key);
            const country = region.metadata?.country_code || info.country;
            const name = region.metadata?.name || info.value;
            if (!country) {
              return null;
            }
            return (
              <li key={region.key}>
                <Link
                  href={`/free-proxy-list/region/${country.toLowerCase()}/${encodeURIComponent(
                    name,
                  )}`}
                  className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
                >
                  <span>{name}</span>
                  <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                    {region.count}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      </div>

      <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <h3 className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
          Top ASNs
        </h3>
        <ul className="mt-3 space-y-2 text-sm">
          {asns.slice(0, 6).map((asn) => (
            <li key={asn.key}>
              <Link
                href={`/free-proxy-list/asn/${asn.key}`}
                className="flex items-center justify-between text-ink-muted hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-300"
              >
                <span>AS{asn.key}</span>
                <span className="text-xs text-ink-muted/70 dark:text-sand-500">
                  {asn.count}
                </span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
