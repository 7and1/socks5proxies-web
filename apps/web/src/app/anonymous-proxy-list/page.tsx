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
    title: `Anonymous Proxy List 2025 - ${totalLabel} Working Proxies`,
    description: `Browse anonymous proxies across ${countriesLabel} countries. Filter by protocol, country, and port to keep your identity protected. Updated every few minutes.`,
    alternates: {
      canonical: "https://socks5proxies.com/anonymous-proxy-list",
    },
    openGraph: {
      title: `Anonymous Proxy List - ${totalLabel} Live Proxies`,
      description: `Anonymous proxy list with ${totalLabel} working proxies across ${countriesLabel} countries.`,
      url: "https://socks5proxies.com/anonymous-proxy-list",
      type: "website",
    },
  };
}

export const dynamic = "force-dynamic";

export default async function AnonymousProxyListPage({
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
      title="Anonymous Proxy List"
      description="Anonymous proxies hide your IP but may reveal proxy usage. Filter by protocol, country, and port to find the right balance of speed and privacy."
      basePath="/anonymous-proxy-list"
      filters={{
        anonymity: "anonymous",
        country,
        protocol,
        port: parseNumber(searchParams.port),
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
    />
  );
}
