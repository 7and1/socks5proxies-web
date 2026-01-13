import type { Metadata } from "next";
import Link from "next/link";
import { ProxyListView } from "../../../components/proxylist/ProxyListView";
import { getProxyStats } from "../../../lib/api-client";

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getProxyStats().catch(() => null);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";

  return {
    title: `Free Proxy List 2026 - ${totalLabel} Working SOCKS5, HTTP Proxies`,
    description: `Browse our free proxy list with ${totalLabel} working proxies across ${countriesLabel} countries. Filter by SOCKS5, HTTP, HTTPS, port, and anonymity level. Updated every few minutes.`,
    keywords: [
      "free proxy list",
      "free socks5 proxy",
      "free http proxy",
      "free https proxy",
      "proxy server list",
      "working proxies",
      "fresh proxies",
      "proxy list by country",
      "anonymous proxy list",
      "elite proxy list",
      "transparent proxy list",
      "public proxy servers",
    ],
    alternates: {
      canonical: "https://socks5proxies.com/free-proxy-list",
    },
    openGraph: {
      title: `Free Proxy List 2026 - ${totalLabel} Working Proxies`,
      description: `Browse a live free proxy list with ${totalLabel} working proxies across ${countriesLabel} countries. Filter by protocol, port, and anonymity.`,
      url: "https://socks5proxies.com/free-proxy-list",
      siteName: "Socks5Proxies.com",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: "Socks5Proxies.com Free Proxy List",
        },
      ],
    },
  };
}

export const dynamic = "force-dynamic";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export default async function FreeProxyListPage({
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
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;
  const city = Array.isArray(searchParams.city)
    ? searchParams.city[0]
    : searchParams.city;
  const region = Array.isArray(searchParams.region)
    ? searchParams.region[0]
    : searchParams.region;

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Socks5Proxies.com Free Proxy List",
    description:
      "Public proxy dataset with country, port, protocol, anonymity, and uptime metrics.",
    url: "https://socks5proxies.com/free-proxy-list",
    creator: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    keywords: ["free proxies", "socks5", "http proxies", "proxy list"],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <ProxyListView
        title="Free Proxy List"
        description="Filter by country, protocol, port, and anonymity to find the right proxy mix for scraping, automation, or privacy testing."
        basePath="/free-proxy-list"
        filters={{
          country,
          protocol,
          anonymity,
          city,
          region,
          asn: parseNumber(searchParams.asn),
          port: parseNumber(searchParams.port),
          limit: parseNumber(searchParams.limit),
          offset: parseNumber(searchParams.offset),
        }}
      />
      <section className="mx-auto max-w-6xl px-6 pb-16">
        <div className="rounded-3xl border border-sand-200 bg-sand-50 p-6 text-sm text-ink-muted">
          <h2 className="text-lg font-semibold text-ink">
            Learn how to use free proxies safely
          </h2>
          <p className="mt-2">
            Explore risks, anonymity tips, and proxy comparisons before you
            scale. These resources help you choose the right proxy type for your
            workload.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/free-proxy-list/guide"
              className="rounded-full bg-ocean-600 px-5 py-2 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-ocean-500"
            >
              Free Proxy Guide
            </Link>
            <Link
              href="/proxy-comparison"
              className="rounded-full border border-sand-300 bg-white px-5 py-2 text-xs font-semibold text-ink transition hover:border-sand-400"
            >
              Proxy Comparison
            </Link>
            <Link
              href="/faq"
              className="rounded-full border border-sand-300 bg-white px-5 py-2 text-xs font-semibold text-ink transition hover:border-sand-400"
            >
              Proxy FAQ
            </Link>
          </div>
        </div>
      </section>
    </>
  );
}
