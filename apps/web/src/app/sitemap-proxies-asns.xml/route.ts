import { getFacetPage } from "../../lib/api-client";
import { MIN_PROXIES_FOR_PAGE } from "../../config/proxy-constants";

const BASE_URL = "https://socks5proxies.com";
const PAGE_SIZE = 5000;
const CHANGE_FREQ = "daily";
const PRIORITY = "0.6";

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

function parsePage(request: Request) {
  const url = new URL(request.url);
  const pageParam = url.searchParams.get("page");
  const parsed = pageParam ? Number.parseInt(pageParam, 10) : 0;
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export async function GET(request: Request) {
  const page = parsePage(request);
  const offset = page * PAGE_SIZE;

  let data: Array<{ key: string; count: number }> = [];
  try {
    const response = await getFacetPage("asns", { limit: PAGE_SIZE, offset });
    data = response.data ?? [];
  } catch {
    data = [];
  }

  const locations = data
    .filter((asn) => asn.count >= MIN_PROXIES_FOR_PAGE)
    .map((asn) => `${BASE_URL}/free-proxy-list/asn/${asn.key}`);

  const xml = renderSitemap(locations);
  return new Response(xml, {
    headers: {
      "Content-Type": "application/xml",
    },
  });
}
