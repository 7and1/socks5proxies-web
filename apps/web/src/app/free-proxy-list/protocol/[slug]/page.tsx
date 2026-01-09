import type { Metadata } from "next";
import { ProxyListView } from "../../../../components/proxylist/ProxyListView";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function generateMetadata({
  params,
}: {
  params: { slug: string };
}): Metadata {
  const protocol = params.slug.toUpperCase();
  return {
    title: `Free ${protocol} Proxy List`,
    description: `Browse free ${protocol} proxies by country, port, and anonymity. Updated frequently with uptime metrics.`,
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/protocol/${params.slug}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ProtocolProxyListPage({
  params,
  searchParams,
}: {
  params: { slug: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const country = Array.isArray(searchParams.country)
    ? searchParams.country[0]
    : searchParams.country;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`Free ${params.slug.toUpperCase()} Proxies`}
      description={`Filter ${params.slug.toUpperCase()} proxies by country, port, and anonymity level.`}
      basePath={`/free-proxy-list/protocol/${params.slug}`}
      filters={{
        protocol: params.slug,
        country,
        anonymity,
        port: parseNumber(searchParams.port),
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockProtocol
    />
  );
}
