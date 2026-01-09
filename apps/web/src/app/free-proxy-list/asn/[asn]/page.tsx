import type { Metadata } from "next";
import Link from "next/link";
import { ProxyListView } from "../../../../components/proxylist/ProxyListView";
import { getASNDetails } from "../../../../lib/api-client";

function parseNumber(value: string | string[] | undefined) {
  if (!value) return undefined;
  const raw = Array.isArray(value) ? value[0] : value;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : undefined;
}

export function generateMetadata({
  params,
}: {
  params: { asn: string };
}): Metadata {
  const canonicalUrl = `https://socks5proxies.com/free-proxy-list/asn/${params.asn}`;
  return {
    title: `Free Proxies from ASN ${params.asn} - SOCKS5, HTTP & HTTPS Servers`,
    description: `Browse free proxy servers from ASN ${params.asn}. Filter by country, SOCKS5, HTTP, HTTPS protocol, port, and anonymity level. Updated every few minutes.`,
    keywords: [
      `ASN ${params.asn} proxy`,
      `AS${params.asn} proxy`,
      `free ASN proxy`,
      "autonomous system proxy",
      "datacenter proxy",
    ],
    alternates: {
      canonical: canonicalUrl,
    },
    openGraph: {
      title: `Free Proxies from ASN ${params.asn}`,
      description: `Browse free proxy servers from ASN ${params.asn}. Filter by country, protocol, port, and anonymity.`,
      url: canonicalUrl,
      siteName: "Socks5Proxies.com",
      type: "website",
      images: [
        {
          url: "/og-image.svg",
          width: 1200,
          height: 630,
          alt: `Socks5Proxies.com ASN ${params.asn} Proxy List`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: `Free Proxies from ASN ${params.asn}`,
      description: `Browse free proxy servers from ASN ${params.asn}. Filter by country, protocol, port, and anonymity.`,
    },
  };
}

export const dynamic = "force-dynamic";

export default async function ASNProxyListPage({
  params,
  searchParams,
}: {
  params: { asn: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const asnNumber = parseNumber(params.asn) ?? 0;
  const asnDetails = asnNumber ? await getASNDetails(asnNumber) : null;
  const country = Array.isArray(searchParams.country)
    ? searchParams.country[0]
    : searchParams.country;
  const protocol = Array.isArray(searchParams.protocol)
    ? searchParams.protocol[0]
    : searchParams.protocol;
  const anonymity = Array.isArray(searchParams.anonymity)
    ? searchParams.anonymity[0]
    : searchParams.anonymity;
  const protocolRows = asnDetails
    ? [
        {
          key: "http",
          label: "HTTP",
          count: asnDetails.protocols.http,
        },
        {
          key: "https",
          label: "HTTPS",
          count: asnDetails.protocols.https,
        },
        {
          key: "socks4",
          label: "SOCKS4",
          count: asnDetails.protocols.socks4,
        },
        {
          key: "socks5",
          label: "SOCKS5",
          count: asnDetails.protocols.socks5,
        },
      ].filter((row) => row.count > 0)
    : [];
  const protocolTotal = protocolRows.reduce((sum, row) => sum + row.count, 0);

  return (
    <div className="space-y-6">
      {asnDetails && (
        <section className="rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
                ASN Overview
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                ASN {asnDetails.asn}{" "}
                {asnDetails.name ? `· ${asnDetails.name}` : ""}
              </h1>
              <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
                {asnDetails.org || "Autonomous System network summary"}
              </p>
            </div>
            <div className="rounded-2xl border border-ocean-200 bg-ocean-50 px-4 py-3 text-xs text-ocean-700 dark:border-ocean-800 dark:bg-ocean-950 dark:text-ocean-300">
              <div className="font-semibold">ASN Snapshot</div>
              <div className="mt-1">
                {asnDetails.count.toLocaleString()} proxies · avg{" "}
                {Math.round(asnDetails.avg_delay)} ms
              </div>
            </div>
          </div>

          <div className="mt-6 grid gap-4 lg:grid-cols-[2fr,1fr]">
            <div className="rounded-2xl border border-sand-200 bg-sand-50/80 p-4 dark:border-sand-700 dark:bg-sand-800/60">
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
                Protocol Mix
              </div>
              {protocolRows.length > 0 ? (
                <div className="mt-3 space-y-3">
                  {protocolRows.map((row) => {
                    const percent = protocolTotal
                      ? Math.round((row.count / protocolTotal) * 100)
                      : 0;
                    return (
                      <div key={row.key}>
                        <div className="flex items-center justify-between text-xs text-ink-muted dark:text-sand-400">
                          <span className="font-semibold text-ink dark:text-sand-200">
                            {row.label}
                          </span>
                          <span>
                            {row.count.toLocaleString()} • {percent}%
                          </span>
                        </div>
                        <div className="mt-2 h-2 rounded-full bg-sand-200 dark:bg-sand-700">
                          <div
                            className="h-full rounded-full bg-ocean-500"
                            style={{ width: `${percent}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted dark:text-sand-400">
                  Protocol distribution will appear once enough proxies are
                  cached for this ASN.
                </p>
              )}
            </div>

            <div className="rounded-2xl border border-sand-200 bg-sand-50/80 p-4 dark:border-sand-700 dark:bg-sand-800/60">
              <div className="text-xs font-semibold uppercase tracking-widest text-ink-muted dark:text-sand-400">
                Top Countries
              </div>
              {asnDetails.countries.length > 0 ? (
                <div className="mt-3 space-y-2 text-sm">
                  {asnDetails.countries.slice(0, 6).map((countryItem) => (
                    <Link
                      key={countryItem.code}
                      href={`/free-proxy-list/asn/${asnDetails.asn}?country=${encodeURIComponent(
                        countryItem.code,
                      )}`}
                      className="flex items-center justify-between rounded-xl border border-transparent px-2 py-1 transition hover:border-sand-200 hover:bg-white dark:hover:border-sand-700 dark:hover:bg-sand-900/60"
                    >
                      <div className="font-semibold">
                        {countryItem.name || countryItem.code}
                      </div>
                      <div className="text-xs text-ink-muted dark:text-sand-400">
                        {countryItem.count} •{" "}
                        {Math.round(countryItem.avg_delay)} ms
                      </div>
                    </Link>
                  ))}
                </div>
              ) : (
                <p className="mt-3 text-sm text-ink-muted dark:text-sand-400">
                  No country breakdown available yet.
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <ProxyListView
        title={`Proxies for ASN ${params.asn}`}
        description={`Proxy servers linked to ASN ${params.asn}. Filter by country, protocol, port, and anonymity.`}
        basePath={`/free-proxy-list/asn/${params.asn}`}
        filters={{
          asn: asnNumber || undefined,
          country,
          protocol,
          anonymity,
          port: parseNumber(searchParams.port),
          limit: parseNumber(searchParams.limit),
          offset: parseNumber(searchParams.offset),
        }}
      />
    </div>
  );
}
