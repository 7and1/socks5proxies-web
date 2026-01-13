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
    getProxyListRobots({ protocol: "https" }),
  ]);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";

  return {
    title: `Free HTTPS Proxy List 2026 - ${totalLabel} Secure Proxies`,
    description: `Browse ${totalLabel} working HTTPS proxies across ${countriesLabel} countries. Filter by country, port, and anonymity level. Updated every few minutes.`,
    alternates: {
      canonical: "https://socks5proxies.com/https-proxy-list",
    },
    openGraph: {
      title: `HTTPS Proxy List - ${totalLabel} Live Proxies`,
      description: `Live HTTPS proxy list with ${totalLabel} working proxies across ${countriesLabel} countries.`,
      url: "https://socks5proxies.com/https-proxy-list",
      type: "website",
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function HttpsProxyListPage({
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
    name: "Socks5Proxies.com HTTPS Proxy List",
    description: `Free HTTPS proxy list with ${totalLabel} working proxies. Filter by country, port, and anonymity level.`,
    url: "https://socks5proxies.com/https-proxy-list",
    creator: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    keywords: ["https proxies", "https proxy list", "free https proxy"],
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
        title="Free HTTPS Proxy List"
        description="Browse secure HTTPS proxies by country, port, and anonymity. Updated frequently with uptime and latency metrics."
        basePath="/https-proxy-list"
        filters={{
          protocol: "https",
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
