import type { Metadata } from "next";
import { ProxyListView } from "../../components/proxylist/ProxyListView";
import { getProxyStats } from "../../lib/api-client";
import { getProxyListRobots } from "../../lib/proxy-seo";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const [stats, robots] = await Promise.all([
    getProxyStats().catch(() => null),
    getProxyListRobots({ protocol: "http" }),
  ]);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";

  return {
    title: `Free HTTP Proxy List 2026 - ${totalLabel} Working Proxies`,
    description: `Browse ${totalLabel} working HTTP proxies across ${countriesLabel} countries. Filter by country, port, and anonymity level. Updated every few minutes.`,
    alternates: {
      canonical: "https://socks5proxies.com/http-proxy-list",
    },
    openGraph: {
      title: `HTTP Proxy List - ${totalLabel} Live Proxies`,
      description: `Live HTTP proxy list with ${totalLabel} working proxies across ${countriesLabel} countries.`,
      url: "https://socks5proxies.com/http-proxy-list",
      type: "website",
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function HttpProxyListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const country = Array.isArray(searchParams.country)
    ? searchParams.country[0]
    : searchParams.country;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  const stats = await getProxyStats().catch(() => null);
  const total = stats?.data?.total;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Socks5Proxies.com HTTP Proxy List",
    description: `Free HTTP proxy list with ${totalLabel} working proxies. Filter by country, port, and anonymity level.`,
    url: "https://socks5proxies.com/http-proxy-list",
    creator: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    keywords: ["http proxies", "http proxy list", "free http proxy"],
    provider: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
    },
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <ProxyListView
        title="Free HTTP Proxy List"
        description="Browse live HTTP proxies by country, port, and anonymity. Updated frequently with uptime and latency metrics."
        basePath="/http-proxy-list"
        filters={{
          protocol: "http",
          country,
          anonymity,
          port: parseNumber(searchParams.port),
          limit: parseNumber(searchParams.limit),
          offset: parseNumber(searchParams.offset),
        }}
        lockProtocol
      />
    </>
  );
}
