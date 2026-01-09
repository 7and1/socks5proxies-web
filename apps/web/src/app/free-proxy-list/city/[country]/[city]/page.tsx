import type { Metadata } from "next";
import { ProxyListView } from "../../../../../components/proxylist/ProxyListView";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function generateMetadata({
  params,
}: {
  params: { country: string; city: string };
}): Metadata {
  const country = params.country.toUpperCase();
  const city = decodeURIComponent(params.city);
  const canonicalUrl = `https://socks5proxies.com/free-proxy-list/city/${params.country}/${encodeURIComponent(city)}`;
  return {
    title: `Free ${city} Proxies (${country}) - SOCKS5, HTTP & HTTPS Servers`,
    description: `Browse free proxy servers in ${city}, ${country}. Filter by SOCKS5, HTTP, HTTPS protocol, port, and anonymity level. Updated every few minutes with uptime metrics.`,
    keywords: [
      `${city} proxy`,
      `${city} ${country} proxy`,
      `free ${city} proxy`,
      `${city} socks5 proxy`,
      `${city} http proxy`,
      "city proxy list",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Free ${city} Proxies (${country})`,
      description: `Browse free proxy servers in ${city}, ${country}. Filter by protocol, port, and anonymity.`,
      url: canonicalUrl,
      siteName: "Socks5Proxies.com",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `Socks5Proxies.com Free ${city} Proxy List`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Free ${city} Proxies (${country})`,
      description: `Browse free proxy servers in ${city}, ${country}. Filter by protocol, port, and anonymity.`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function CityProxyListPage({
  params,
  searchParams,
}: {
  params: { country: string; city: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;
  const city = decodeURIComponent(params.city);

  return (
    <ProxyListView
      title={`Proxies in ${city}, ${params.country.toUpperCase()}`}
      description={`Latest proxy servers in ${city}. Filter by protocol, port, and anonymity.`}
      basePath={`/free-proxy-list/city/${params.country}/${encodeURIComponent(
        city,
      )}`}
      filters={{
        country: params.country.toUpperCase(),
        city,
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
