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
  params: { country: string; region: string };
}): Promise<Metadata> {
  const country = params.country.toUpperCase();
  const region = decodeURIComponent(params.region);
  const canonicalUrl = `https://socks5proxies.com/free-proxy-list/region/${params.country}/${encodeURIComponent(region)}`;
  const robots = await getProxyListRobots({
    country,
    region,
  });
  return {
    title: `Free ${region} Proxies (${country}) - SOCKS5, HTTP & HTTPS Servers`,
    description: `Browse free proxy servers in ${region}, ${country}. Filter by SOCKS5, HTTP, HTTPS protocol, port, and anonymity level. Updated every few minutes with uptime metrics.`,
    keywords: [
      `${region} proxy`,
      `${region} ${country} proxy`,
      `free ${region} proxy`,
      `${region} socks5 proxy`,
      `${region} http proxy`,
      "region proxy list",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Free ${region} Proxies (${country})`,
      description: `Browse free proxy servers in ${region}, ${country}. Filter by protocol, port, and anonymity.`,
      url: canonicalUrl,
      siteName: "Socks5Proxies.com",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `Socks5Proxies.com Free ${region} Proxy List`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Free ${region} Proxies (${country})`,
      description: `Browse free proxy servers in ${region}, ${country}. Filter by protocol, port, and anonymity.`,
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function RegionProxyListPage({
  params,
  searchParams,
}: {
  params: { country: string; region: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;
  const region = decodeURIComponent(params.region);

  return (
    <ProxyListView
      title={`Proxies in ${region}, ${params.country.toUpperCase()}`}
      description={`Latest proxy servers in ${region}. Filter by protocol, port, and anonymity.`}
      basePath={`/free-proxy-list/region/${params.country}/${encodeURIComponent(
        region,
      )}`}
      filters={{
        country: params.country.toUpperCase(),
        region,
        protocol,
        anonymity,
        port: parseNumber(searchParams.port),
        limit: parseNumber(searchParams.limit),
        offset: parseNumber(searchParams.offset),
      }}
      lockCountry
    />
  );
}
