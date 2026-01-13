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
  params: { slug: string; country: string };
}): Promise<Metadata> {
  const protocol = params.slug.toUpperCase();
  const country = params.country.toUpperCase();
  const robots = await getProxyListRobots({
    protocol: params.slug,
    country,
  });
  return {
    title: `${protocol} Proxies in ${country}`,
    description: `Free ${protocol} proxy list for ${country}. Filter by port and anonymity for your workflows.`,
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/protocol/${params.slug}/${params.country}`,
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function ProtocolCountryProxyListPage({
  params,
  searchParams,
}: {
  params: { slug: string; country: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`${params.slug.toUpperCase()} Proxies in ${params.country.toUpperCase()}`}
      description={`Browse ${params.slug.toUpperCase()} proxies hosted in ${params.country.toUpperCase()}.`}
      basePath={`/free-proxy-list/protocol/${params.slug}/${params.country}`}
      filters={{
        protocol: params.slug,
        country: params.country.toUpperCase(),
        anonymity,
        port: parseNumber(searchParams.port),
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockProtocol
      lockCountry
    />
  );
}
