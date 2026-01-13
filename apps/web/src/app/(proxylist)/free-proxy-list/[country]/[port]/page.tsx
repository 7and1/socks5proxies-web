import type { Metadata } from "next";
import { ProxyListView } from "../../../../../components/proxylist/ProxyListView";
import { getProxyListRobots } from "../../../../../lib/proxy-seo";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: { country: string; port: string };
}): Promise<Metadata> {
  const country = params.country.toUpperCase();
  const portNumber = Number(params.port);
  const robots = await getProxyListRobots({
    country,
    port: Number.isFinite(portNumber) ? portNumber : undefined,
  });
  return {
    title: `Free ${country} Proxies on Port ${params.port}`,
    description: `Free proxy list filtered by ${country} and port ${params.port}. Updated frequently with latency and uptime metrics.`,
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/${params.country}/${params.port}`,
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function CountryPortProxyListPage({
  params,
  searchParams,
}: {
  params: { country: string; port: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`Proxies in ${params.country.toUpperCase()} on Port ${params.port}`}
      description={`Filter proxy servers in ${params.country.toUpperCase()} running on port ${params.port}.`}
      basePath={`/free-proxy-list/${params.country}/${params.port}`}
      filters={{
        country: params.country.toUpperCase(),
        port: parseNumber(params.port),
        protocol,
        anonymity,
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockCountry
      lockPort
    />
  );
}
