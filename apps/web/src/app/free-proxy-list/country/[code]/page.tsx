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
  params: { code: string };
}): Promise<Metadata> {
  const country = params.code.toUpperCase();
  const robots = await getProxyListRobots({ country });
  return {
    title: `Free ${country} Proxy List - SOCKS5, HTTP & HTTPS Servers | Socks5Proxies.com`,
    description: `Browse free ${country} proxy servers by protocol, port, and anonymity level. Updated frequently with uptime and delay metrics. Find working ${country} SOCKS5, HTTP, and HTTPS proxies.`,
    keywords: [
      `free ${country} proxy`,
      `${country} proxy list`,
      `${country} socks5 proxy`,
      `${country} http proxy`,
      `${country} proxy server`,
      "free proxy list",
      "working proxies",
    ],
    alternates: {
      canonical: `https://socks5proxies.com/free-proxy-list/country/${params.code}`,
    },
    openGraph: {
      title: `Free ${country} Proxy List - SOCKS5, HTTP & HTTPS Servers`,
      description: `Browse free ${country} proxy servers by protocol, port, and anonymity level. Updated frequently with uptime and delay metrics.`,
      url: `https://socks5proxies.com/free-proxy-list/country/${params.code}`,
      siteName: "Socks5Proxies.com",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `Socks5Proxies.com Free ${country} Proxy List`,
        },
      ],
    },
    robots,
  };
}

export const dynamic = "force-dynamic";

export default async function CountryProxyListPage({
  params,
  searchParams,
}: {
  params: { code: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const countryCode = params.code.toUpperCase();
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;

  return (
    <ProxyListView
      title={`Free ${countryCode} Proxies`}
      description={`Explore fresh proxy servers located in ${countryCode}. Filter by protocol, port, and anonymity for your workflow.`}
      basePath={`/free-proxy-list/country/${params.code}`}
      filters={{
        country: countryCode,
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
