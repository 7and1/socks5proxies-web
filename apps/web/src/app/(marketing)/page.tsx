import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, Activity, Shield, Zap } from "lucide-react";
import {
  getFacets,
  getProxyStats,
  getRecentProxies,
} from "../../lib/api-client";
import { toolsConfig } from "../../config/tools";
import { site } from "../../config/site";
import { ProxyListHero } from "../../components/proxylist/ProxyListHero";
import { ProtocolCards } from "../../components/proxylist/ProtocolCards";
import { CountryGrid } from "../../components/proxylist/CountryGrid";
import { LiveUpdateBadge } from "../../components/shared/LiveUpdateBadge";

export async function generateMetadata(): Promise<Metadata> {
  const stats = await getProxyStats().catch(() => null);
  const total = stats?.data?.total;
  const countries = stats?.data?.countries;
  const avgUptime = stats?.data?.avg_uptime;
  const totalLabel = total ? `${total.toLocaleString()}+` : "10,000+";
  const countriesLabel = countries ? `${countries}` : "100+";
  const uptimeLabel = avgUptime ? `${avgUptime.toFixed(1)}%` : "95%";

  return {
    title: `Free Proxy List 2026 - ${totalLabel} Live SOCKS5, HTTP & HTTPS Proxies`,
    description: `Browse ${totalLabel} live free proxies across ${countriesLabel} countries with real-time uptime, latency, and anonymity data. Filter by country, protocol, and port. Average uptime: ${uptimeLabel}.`,
    keywords: [
      "free proxy list",
      "free socks5 proxy list",
      "free http proxy",
      "free https proxy",
      "working proxy list",
      "proxy list by country",
      "fresh proxies",
    ],
    alternates: {
      canonical: "https://socks5proxies.com",
    },
    openGraph: {
      title: `Free Proxy List - ${totalLabel} Live SOCKS5, HTTP & HTTPS Proxies`,
      description: `Browse ${totalLabel} live proxy servers with uptime, latency, and anonymity filters. Average uptime: ${uptimeLabel}. Updated every few minutes.`,
      url: "https://socks5proxies.com",
      type: "website",
    },
  };
}

export default async function HomePage() {
  const [statsResponse, recentResponse, countryFacets, protocolFacets] =
    await Promise.all([
      getProxyStats().catch(() => null),
      getRecentProxies(8).catch(() => null),
      getFacets("countries", { limit: 12 }).catch(() => []),
      getFacets("protocols", { limit: 4 }).catch(() => []),
    ]);

  const stats = statsResponse?.data;
  const proxies = recentResponse?.data ?? [];
  const cacheAge =
    recentResponse?.meta?.cache_age ?? statsResponse?.meta?.cache_age ?? 0;

  const totalLabel = stats?.total ? stats.total.toLocaleString() : "--";
  const countryLabel = stats?.countries
    ? stats.countries.toLocaleString()
    : "--";
  const uptimeLabel = Number.isFinite(stats?.avg_uptime)
    ? `${stats?.avg_uptime ?? 0}%`
    : "--";

  const datasetJsonLd = {
    "@context": "https://schema.org",
    "@type": "Dataset",
    name: "Socks5Proxies.com Free Proxy List",
    description: `Free proxy list with ${totalLabel} working proxies across ${countryLabel} countries. Includes country, port, protocol, anonymity, and uptime metrics.`,
    url: "https://socks5proxies.com/free-proxy-list",
    creator: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    keywords: ["free proxies", "socks5", "http proxies", "proxy list"],
    provider: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    distribution: {
      "@type": "DataDownload",
      encodingFormat: "application/json",
      contentUrl: "https://api.socks5proxies.com/api/proxies",
    },
    temporalCoverage: "2026/2026",
    spatialCoverage: {
      "@type": "Place",
      name: "Worldwide",
    },
  };

  const organizationJsonLd = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "Socks5Proxies.com",
    url: "https://socks5proxies.com",
    description:
      "Free proxy list with real-time validation, uptime monitoring, and multi-protocol support.",
    sameAs: [],
  };

  return (
    <div>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(datasetJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
      />
      {/* Hero Section */}
      <section
        className="relative overflow-hidden"
        aria-labelledby="hero-heading"
      >
        <div
          className="absolute -top-32 right-0 h-96 w-96 rounded-full bg-ocean-200/30 blur-3xl animate-float"
          aria-hidden="true"
        />
        <div
          className="absolute bottom-0 left-10 h-64 w-64 rounded-full bg-sand-300/40 blur-3xl"
          aria-hidden="true"
        />
        <div
          className="absolute top-1/2 left-1/3 h-48 w-48 rounded-full bg-ocean-100/30 blur-2xl"
          aria-hidden="true"
        />

        <div className="mx-auto grid max-w-6xl gap-12 px-6 py-24 md:py-32 lg:grid-cols-[1.1fr,0.9fr]">
          <div className="space-y-8 animate-fade-up">
            <div className="inline-flex items-center gap-3 rounded-full border border-ocean-200 bg-white/80 px-5 py-2 text-xs font-semibold uppercase tracking-widest text-ocean-700 shadow-sm backdrop-blur-sm dark:border-ocean-700 dark:bg-sand-900/80 dark:text-ocean-300">
              <span className="relative flex h-2 w-2">
                <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ocean-400 opacity-75"></span>
                <span className="relative inline-flex h-2 w-2 rounded-full bg-ocean-500"></span>
              </span>
              Live Proxy Intelligence
            </div>

            <h1
              id="hero-heading"
              className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl lg:text-6xl"
            >
              {site.tagline}
            </h1>

            <p className="max-w-xl text-lg leading-relaxed text-ink-muted dark:text-sand-400">
              {site.description}
            </p>

            <div className="flex flex-wrap gap-4 pt-2">
              <Link
                href="/free-proxy-list"
                className="btn-glow group inline-flex items-center gap-2 rounded-full bg-ocean-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ocean-600/30 transition-all duration-300 hover:-translate-y-1 hover:bg-ocean-500 hover:shadow-xl hover:shadow-ocean-600/40 focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2"
                aria-label="Browse free proxy list"
              >
                Browse Full List
                <ArrowRight
                  className="h-4 w-4 transition-transform group-hover:translate-x-1"
                  aria-hidden="true"
                />
              </Link>
              <Link
                href="/socks5-proxy-list"
                className="inline-flex items-center gap-2 rounded-full border-2 border-ink/10 bg-white/50 px-7 py-3.5 text-sm font-semibold text-ink backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:border-ink/20 hover:bg-white/80 hover:shadow-lg dark:border-sand-600 dark:bg-sand-800/50 dark:text-sand-200 dark:hover:bg-sand-800/80"
                aria-label="SOCKS5 proxy list"
              >
                SOCKS5 List
              </Link>
              <Link
                href="/http-proxy-list"
                className="inline-flex items-center gap-2 rounded-full border border-ocean-200 bg-ocean-50/80 px-7 py-3.5 text-sm font-semibold text-ocean-700 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:bg-ocean-100 hover:shadow-lg dark:border-ocean-700 dark:bg-ocean-900/40 dark:text-ocean-200"
                aria-label="HTTP proxy list"
              >
                HTTP / HTTPS List
              </Link>
            </div>

            <div className="flex flex-wrap items-center gap-x-8 gap-y-3 pt-4 text-xs uppercase tracking-widest text-ink-muted dark:text-sand-500">
              <span className="flex items-center gap-2">
                <Zap className="h-4 w-4 text-ocean-500" aria-hidden="true" />
                Updated every 5 minutes
              </span>
              <span className="flex items-center gap-2">
                <Activity
                  className="h-4 w-4 text-ocean-500"
                  aria-hidden="true"
                />
                Live uptime + latency
              </span>
              <span className="flex items-center gap-2">
                <Shield className="h-4 w-4 text-ocean-500" aria-hidden="true" />
                Filter by anonymity
              </span>
            </div>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "0.2s" }}>
            <ProxyListHero proxies={proxies} cacheAge={cacheAge} />
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-12">
        <div className="grid gap-4 md:grid-cols-4">
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Total Proxies
            </p>
            <p className="mt-3 text-3xl font-semibold">{totalLabel}</p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-400">
              Live working IPs
            </p>
          </div>
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Countries Covered
            </p>
            <p className="mt-3 text-3xl font-semibold">{countryLabel}</p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-400">
              Global proxy coverage
            </p>
          </div>
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Avg Uptime
            </p>
            <p className="mt-3 text-3xl font-semibold">{uptimeLabel}</p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-400">
              Based on recent checks
            </p>
          </div>
          <div className="rounded-3xl border border-sand-200 bg-white/80 p-5 shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
            <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
              Data Freshness
            </p>
            <div className="mt-3">
              <LiveUpdateBadge ageSeconds={cacheAge} />
            </div>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-400">
              Sync cadence: 5 minutes
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-8">
          <h2 className="text-3xl font-semibold">Quick Filters</h2>
          <p className="mt-3 text-ink-muted max-w-2xl">
            Jump straight to the protocol or region you need. Each card links to
            a dedicated list page with live filtering.
          </p>
        </div>
        <div className="space-y-8">
          <ProtocolCards protocols={protocolFacets} />
          <CountryGrid countries={countryFacets} />
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-semibold">Tools to Work with Proxies</h2>
          <p className="mt-3 text-ink-muted max-w-2xl mx-auto">
            Validate and reshape proxies in seconds with our free operations
            toolkit.
          </p>
        </div>
        <div className="grid gap-8 md:grid-cols-3">
          {toolsConfig.map((tool) => (
            <Link
              key={tool.id}
              href={tool.href}
              className="rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm hover:shadow-md transition-shadow dark:border-sand-700 dark:bg-sand-900/80"
            >
              <tool.icon className="h-6 w-6 text-ocean-600 dark:text-ocean-400" />
              <h3 className="mt-4 text-xl font-semibold">{tool.title}</h3>
              <p className="mt-3 text-sm text-ink-muted">{tool.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ocean-700 dark:text-ocean-400">
                Launch Tool
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 py-16">
        <div className="mb-10">
          <h2 className="text-3xl font-semibold">Learn & Compare</h2>
          <p className="mt-3 text-ink-muted max-w-2xl">
            Go deeper with strategy guides, risk breakdowns, and side-by-side
            comparisons before you scale.
          </p>
        </div>
        <div className="grid gap-6 md:grid-cols-3">
          {[
            {
              title: "Free Proxy Guide",
              description:
                "Understand free proxies, the risks, and safe usage patterns.",
              href: "/free-proxy-list/guide",
              label: "Read Guide",
            },
            {
              title: "Proxy Comparison",
              description:
                "Compare free, datacenter, residential, and mobile proxies.",
              href: "/proxy-comparison",
              label: "Compare Types",
            },
            {
              title: "Proxy FAQ",
              description:
                "Quick answers on anonymity levels, protocols, and safety.",
              href: "/faq",
              label: "View FAQ",
            },
          ].map((item) => (
            <Link
              key={item.title}
              href={item.href}
              className="rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-sand-700 dark:bg-sand-900/80"
            >
              <h3 className="text-xl font-semibold">{item.title}</h3>
              <p className="mt-3 text-sm text-ink-muted">{item.description}</p>
              <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ocean-700 dark:text-ocean-400">
                {item.label}
                <ArrowRight className="h-3 w-3" />
              </span>
            </Link>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-20">
        <div className="rounded-3xl border border-ocean-200 bg-ocean-50/70 p-10 dark:border-ocean-800 dark:bg-ocean-950/30">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-widest text-ocean-700 dark:text-ocean-400">
                Free proxy list
              </p>
              <h2 className="mt-2 text-3xl font-semibold">
                Build faster workflows with verified proxies.
              </h2>
              <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
                Use our free proxy list for scraping, QA testing, and
                automation. Filter by protocol, anonymity, and country in
                seconds.
              </p>
            </div>
            <Link
              href="/free-proxy-list"
              className="inline-flex items-center gap-2 rounded-full bg-ocean-600 px-7 py-3.5 text-sm font-semibold text-white shadow-lg shadow-ocean-600/30 transition hover:-translate-y-0.5 hover:bg-ocean-500"
            >
              Browse Proxy List
              <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
          <div className="mt-8 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 dark:border-sand-700 dark:bg-sand-900/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Fresh data
              </p>
              <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
                Every proxy is checked on a rolling schedule for uptime and
                latency.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 dark:border-sand-700 dark:bg-sand-900/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Filters that matter
              </p>
              <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
                Country, port, protocol, and anonymity filters stay in sync with
                live data.
              </p>
            </div>
            <div className="rounded-2xl border border-white/70 bg-white/80 p-5 dark:border-sand-700 dark:bg-sand-900/80">
              <p className="text-xs font-semibold uppercase tracking-widest text-ink-muted">
                Export ready
              </p>
              <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
                Copy, download, or send proxies straight into your workflows.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-6xl px-6 pb-24">
        <div className="rounded-3xl border border-sand-200 bg-white/80 p-10 text-sm text-ink-muted dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-400">
          <h2 className="text-2xl font-semibold text-ink dark:text-sand-100">
            Free proxy list for automation, scraping, and testing
          </h2>
          <p className="mt-4">
            Socks5Proxies.com tracks thousands of public proxies, validates them
            for uptime, and surfaces the fastest options across SOCKS5, HTTP,
            and HTTPS. Use the live proxy list to power monitoring, web
            scraping, QA testing, or geo-targeted research without waiting on
            manual updates.
          </p>
          <p className="mt-4">
            Each proxy record includes latency, anonymity level, and last-seen
            status. Export working proxies in multiple formats or feed them into
            the bulk checker to validate performance before deployment.
          </p>
        </div>
      </section>
    </div>
  );
}
