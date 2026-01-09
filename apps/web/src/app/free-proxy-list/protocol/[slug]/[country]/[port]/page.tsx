import type { Metadata } from "next";
import { ProxyListView } from "../../../../../../components/proxylist/ProxyListView";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function generateMetadata({
  params,
}: {
  params: { slug: string; country: string; port: string };
}): Metadata {
  const protocol = params.slug.toUpperCase();
  const country = params.country.toUpperCase();
  return {
    title: `${protocol} Proxies in ${country} on Port ${params.port}`,
    description: `Browse ${protocol} proxy servers in ${country} using port ${params.port}. Filter by anonymity and performance.`,
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/protocol/${params.slug}/${params.country}/${params.port}`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ProtocolCountryPortProxyListPage({
  params,
  searchParams,
}: {
  params: { slug: string; country: string; port: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`${params.slug.toUpperCase()} Proxies in ${params.country.toUpperCase()} on Port ${params.port}`}
      description={`Focused ${params.slug.toUpperCase()} proxy list for ${params.country.toUpperCase()} on port ${params.port}.`}
      basePath={`/free-proxy-list/protocol/${params.slug}/${params.country}/${params.port}`}
      filters={{
        protocol: params.slug,
        country: params.country.toUpperCase(),
        port: parseNumber(params.port),
        anonymity,
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockProtocol
      lockCountry
      lockPort
    />
  );
}
