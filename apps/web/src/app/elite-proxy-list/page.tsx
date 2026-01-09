import type { Metadata } from "next";
import { ProxyListView } from "../../components/proxylist/ProxyListView";
import { getProxyStats } from "../../lib/api-client";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getProxyStats().catch(() => null);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";

  return {
    title: `Elite Proxy List 2025 - ${totalLabel} High Anonymity Proxies`,
    description: `Browse elite proxies with the highest anonymity across ${countriesLabel} countries. Filter by protocol, country, and port. Updated every few minutes.`,
    alternates: {
      canonical: "https://socks5proxies.com/elite-proxy-list",
    },
    openGraph: {
      title: `Elite Proxy List - ${totalLabel} Anonymous Proxies`,
      description: `High-anonymity proxy list with ${totalLabel} elite proxies across ${countriesLabel} countries.`,
      url: "https://socks5proxies.com/elite-proxy-list",
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function EliteProxyListPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const country = Array.isArray(searchParams.country)
    ? searchParams.country[0]
    : searchParams.country;
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;

  return (
    <ProxyListView
      title="Elite Proxy List"
      description="Elite proxies hide your real IP address completely. Filter by protocol, country, and port to find the best high-anonymity proxies."
      basePath="/elite-proxy-list"
      filters={{
        anonymity: "elite",
        country,
        protocol,
        port: parseNumber(searchParams.port),
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
    />
  );
}
