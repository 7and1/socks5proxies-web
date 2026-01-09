import type { MetadataRoute } from "next";
import { getFacets } from "../lib/api-client";
import {
  MIN_PROXIES_FOR_PAGE,
  SITEMAP_MAX_URLS,
} from "../config/proxy-constants";

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = "https://socks5proxies.com";
  const now = new Date();

  const [countries, ports, protocols] = await Promise.all([
    getFacets("countries").catch(() => []),
    getFacets("ports").catch(() => []),
    getFacets("protocols").catch(() => []),
  ]);

  const entries: MetadataRoute.Sitemap = [
    {
      url: `${base}/free-proxy-list`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
  ];

  const remaining = SITEMAP_MAX_URLS - entries.length;
  const maxCountries = Math.min(250, remaining);
  countries
    .filter((country) => country.count >= MIN_PROXIES_FOR_PAGE)
    .slice(0, maxCountries)
    .forEach((country) => {
      entries.push({
        url: `${base}/free-proxy-list/country/${country.key.toLowerCase()}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.7,
      });
    });

  const maxPorts = Math.min(200, SITEMAP_MAX_URLS - entries.length);
  ports
    .filter((port) => port.count >= MIN_PROXIES_FOR_PAGE)
    .slice(0, maxPorts)
    .forEach((port) => {
      entries.push({
        url: `${base}/free-proxy-list/port/${port.key}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.6,
      });
    });

  protocols
    .filter((protocol) => protocol.count >= MIN_PROXIES_FOR_PAGE)
    .forEach((protocol) => {
      entries.push({
        url: `${base}/free-proxy-list/protocol/${protocol.key}`,
        lastModified: now,
        changeFrequency: "daily",
        priority: 0.6,
      });
    });

  return entries.slice(0, SITEMAP_MAX_URLS);
}
