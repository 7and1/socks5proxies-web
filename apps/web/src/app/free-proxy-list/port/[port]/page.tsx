import type { Metadata } from "next";
import { ProxyListView } from "../../../../components/proxylist/ProxyListView";
import { getProxyListRobots } from "../../../../lib/proxy-seo";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export async function generateMetadata({
  params,
}: {
  params: { port: string };
}): Promise<Metadata> {
  const portNumber = Number(params.port);
  const robots = await getProxyListRobots({
    port: Number.isFinite(portNumber) ? portNumber : undefined,
  });
  return {
    title: `Free Proxy List on Port ${params.port}`,
    description: `Browse free proxies running on port ${params.port} with protocol and anonymity filters.`,
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/port/${params.port}`,
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function PortProxyListPage({
  params,
  searchParams,
}: {
  params: { port: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const country = Array.isArray(searchParams.country)
    ? searchParams.country[0]
    : searchParams.country;
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`Proxies on Port ${params.port}`}
      description={`Browse free proxy servers running on port ${params.port}. Filter by country, protocol, and anonymity.`}
      basePath={`/free-proxy-list/port/${params.port}`}
      filters={{
        port: parseNumber(params.port),
        country,
        protocol,
        anonymity,
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockPort
    />
  );
}
