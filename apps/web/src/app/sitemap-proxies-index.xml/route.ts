import { getFacetPage } from "../../lib/api-client";

const BASE_URL = "https://socks5proxies.com";
const PAGE_SIZE = 5000;

function renderSitemapIndex(locations: string[]) {
  const now = new Date().toISOString();
  const entries = locations
    .map(
      (loc) => `<sitemap><loc>${loc}</loc><lastmod>${now}</lastmod></sitemap>`,
    )
    .join("");

  return `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${entries}
</sitemapindex>`;
}

async function getPageCount(type: "cities" | "regions" | "asns") {
  try {
    const response = await getFacetPage(type, { limit: 1, offset: 0 });
    const total = response.meta?.total ?? 0;
    return Math.max(1, Math.ceil(total / PAGE_SIZE));
  } catch {
    return 1;
  }
}

export async function GET() {
  const [cityPages, regionPages, asnPages] = await Promise.all([
    getPageCount("cities"),
    getPageCount("regions"),
    getPageCount("asns"),
  ]);

  const locations: string[] = [
    `${BASE_URL}/sitemap.xml`,
    `${BASE_URL}/sitemap-proxies.xml`,
    `${BASE_URL}/sitemap-proxies-combos.xml`,
  ];

  for (let i = 0; i < cityPages; i += 1) {
    locations.push(`${BASE_URL}/sitemap-proxies-cities.xml?page=${i}`);
  }
  for (let i = 0; i < regionPages; i += 1) {
    locations.push(`${BASE_URL}/sitemap-proxies-regions.xml?page=${i}`);
  }
  for (let i = 0; i < asnPages; i += 1) {
    locations.push(`${BASE_URL}/sitemap-proxies-asns.xml?page=${i}`);
  }

  const xml = renderSitemapIndex(locations);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
      "Cache-Control":
        "public, max-age=3600, s-maxage=3600, stale-while-revalidate=86400",
      "X-Robots-Tag": "noindex",
    },
  });
}
