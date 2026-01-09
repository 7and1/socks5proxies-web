import { getFacets } from "../../lib/api-client";
import {
  MIN_PROXIES_FOR_PAGE,
  SITEMAP_MAX_URLS,
} from "../../config/proxy-constants";

const BASE_URL = "https://socks5proxies.com";
const MAX_COUNTRIES = 60;
const MAX_PORTS = 60;
const MAX_COUNTRIES_3WAY = 25;
const MAX_PORTS_3WAY = 25;
const CHANGE_FREQ = "daily";
const PRIORITY = "0.5";

function renderSitemap(locations: string[]) {
  const now = new Date().toISOString();
  const entries = locations
    .map(
      (loc) =>
        `<url><loc>${loc}</loc><lastmod>${now}</lastmod><changefreq>${CHANGE_FREQ}</changefreq><priority>${PRIORITY}</priority></url>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</urlset>`;
}

function sortByCountDesc<T extends { count: number }>(items: T[]) {
  return [...items].sort((a, b) => b.count - a.count);
}

export async function GET() {
  const [countries, ports, protocols] = await Promise.all([
    getFacets("countries").catch(() => []),
    getFacets("ports").catch(() => []),
    getFacets("protocols").catch(() => []),
  ]);

  const topCountries = sortByCountDesc(countries)
    .filter((item) => item.count >= MIN_PROXIES_FOR_PAGE)
    .slice(0, MAX_COUNTRIES)
    .map((item) => item.key.toLowerCase());

  const topPorts = sortByCountDesc(ports)
    .filter((item) => item.count >= MIN_PROXIES_FOR_PAGE)
    .slice(0, MAX_PORTS)
    .map((item) => item.key);

  const topProtocols = sortByCountDesc(protocols)
    .filter((item) => item.count >= MIN_PROXIES_FOR_PAGE)
    .map((item) => item.key);

  const locations: string[] = [];
  const pushLocation = (loc: string) => {
    if (locations.length >= SITEMAP_MAX_URLS) return false;
    locations.push(loc);
    return true;
  };

  for (const protocol of topProtocols) {
    for (const country of topCountries) {
      if (
        !pushLocation(
          `${BASE_URL}/free-proxy-list/protocol/${protocol}/${country}`,
        )
      ) {
        break;
      }
    }
  }

  if (locations.length < SITEMAP_MAX_URLS) {
    for (const country of topCountries) {
      for (const port of topPorts) {
        if (!pushLocation(`${BASE_URL}/free-proxy-list/${country}/${port}`)) {
          break;
        }
      }
    }
  }

  const comboCountries = topCountries.slice(0, MAX_COUNTRIES_3WAY);
  const comboPorts = topPorts.slice(0, MAX_PORTS_3WAY);
  if (locations.length < SITEMAP_MAX_URLS) {
    for (const protocol of topProtocols) {
      for (const country of comboCountries) {
        for (const port of comboPorts) {
          if (
            !pushLocation(
              `${BASE_URL}/free-proxy-list/protocol/${protocol}/${country}/${port}`,
            )
          ) {
            break;
          }
        }
      }
    }
  }

  const xml = renderSitemap(locations);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
