import type { Metadata } from "next";
import { ProxyListView } from "../../../components/proxylist/ProxyListView";
import { getProxyStats } from "../../../lib/api-client";
import { getProxyListRobots } from "../../../lib/proxy-seo";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const [stats, robots] = await Promise.all([
    getProxyStats().catch(() => null),
    getProxyListRobots({ protocol: "socks5" }),
  ]);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";

  return {
    title: `Free SOCKS5 Proxy List 2026 - ${totalLabel} Working Proxies`,
    description: `Browse ${totalLabel} working SOCKS5 proxies across ${countriesLabel} countries. Filter by country, port, and anonymity level. Updated every few minutes.`,
    alternates: {
      canonical: "https://socks5proxies.com/socks5-proxy-list",
    },
    openGraph: {
      title: `SOCKS5 Proxy List - ${totalLabel} Live Proxies`,
      description: `Live SOCKS5 proxy list with ${totalLabel} working proxies across ${countriesLabel} countries.`,
      url: "https://socks5proxies.com/socks5-proxy-list",
      type: "website",
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function Socks5ProxyListPage({
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
    name: "Socks5Proxies.com SOCKS5 Proxy List",
    description: `Free SOCKS5 proxy list with ${totalLabel} working proxies. Filter by country, port, and anonymity level.`,
    url: "https://socks5proxies.com/socks5-proxy-list",
    creator: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    keywords: ["socks5 proxies", "socks5 proxy list", "free socks5"],
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
        title="Free SOCKS5 Proxy List"
        description="Find live SOCKS5 proxies by country, port, and anonymity. Updated every few minutes with uptime and latency metrics."
        basePath="/socks5-proxy-list"
        filters={{
          protocol: "socks5",
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
