import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proxy Comparison - Free vs Datacenter vs Residential vs Mobile",
  description:
    "Compare free, datacenter, residential, and mobile proxies by cost, stability, and anonymity. Learn which proxy type fits your workload.",
  alternates: {
    canonical: "https://socks5proxies.com/proxy-comparison",
  },
  openGraph: {
    title: "Proxy Comparison - Choose the Right Proxy Type",
    description:
      "Side-by-side comparison of free, datacenter, residential, and mobile proxies for scraping and automation.",
    url: "https://socks5proxies.com/proxy-comparison",
    type: "article",
  },
};

const breadcrumbJsonLd = {
  "@context": "https://schema.org",
  "@type": "BreadcrumbList",
  itemListElement: [
    {
      "@type": "ListItem",
      position: 1,
      name: "Home",
      item: "https://socks5proxies.com",
    },
    {
      "@type": "ListItem",
      position: 2,
      name: "Proxy Comparison",
      item: "https://socks5proxies.com/proxy-comparison",
    },
  ],
};

const articleJsonLd = {
  "@context": "https://schema.org",
  "@type": "Article",
  headline: "Proxy Comparison: Free vs Datacenter vs Residential vs Mobile",
  description:
    "Detailed comparison of proxy types by stability, anonymity, and typical use cases.",
  author: {
    "@type": "Organization",
    name: "Socks5Proxies.com",
  },
  mainEntityOfPage: "https://socks5proxies.com/proxy-comparison",
};

const comparisonRows = [
  {
    type: "Free proxies",
    cost: "Free",
    stability: "Low",
    anonymity: "Low to Medium",
    bestFor: "Testing, low-risk research",
    risk: "High churn, blocked targets",
  },
  {
    type: "Datacenter proxies",
    cost: "Low",
    stability: "High",
    anonymity: "Medium",
    bestFor: "Scraping at scale, automation",
    risk: "Easier to detect",
  },
  {
    type: "Residential proxies",
    cost: "Medium",
    stability: "High",
    anonymity: "High",
    bestFor: "Anti-bot heavy targets",
    risk: "Higher cost per GB",
  },
  {
    type: "Mobile proxies",
    cost: "High",
    stability: "Medium",
    anonymity: "Very High",
    bestFor: "Social, ad verification",
    risk: "Limited scale",
  },
];

export default function ProxyComparisonPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />

      <header className="rounded-3xl border border-sand-200 bg-white/80 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
          Proxy Comparison
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Choose the Right Proxy Type
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Compare free, datacenter, residential, and mobile proxies across cost,
          stability, and anonymity so you can match the right tool to the job.
        </p>
      </header>

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-widest text-ink-muted">
            <tr>
              <th className="pb-3">Type</th>
              <th className="pb-3">Cost</th>
              <th className="pb-3">Stability</th>
              <th className="pb-3">Anonymity</th>
              <th className="pb-3">Best For</th>
              <th className="pb-3">Primary Risk</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-sand-200">
            {comparisonRows.map((row) => (
              <tr key={row.type}>
                <td className="py-3 font-semibold">{row.type}</td>
                <td className="py-3">{row.cost}</td>
                <td className="py-3">{row.stability}</td>
                <td className="py-3">{row.anonymity}</td>
                <td className="py-3">{row.bestFor}</td>
                <td className="py-3">{row.risk}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      <section className="grid gap-6 md:grid-cols-3">
        <div className="rounded-3xl border border-sand-200 bg-sand-50 p-6">
          <h2 className="text-lg font-semibold">Start with free proxies</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Validate your workflow quickly with the live free proxy list before
            upgrading.
          </p>
          <Link
            href="/free-proxy-list"
            className="mt-4 inline-flex items-center rounded-full bg-ocean-600 px-4 py-2 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-ocean-500"
          >
            Browse Free List
          </Link>
        </div>
        <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Check anonymity first</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Detect leaks and header exposure before running production jobs.
          </p>
          <Link
            href="/tools/ip-score"
            className="mt-4 inline-flex items-center rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-sand-400"
          >
            Run IP Score
          </Link>
        </div>
        <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
          <h2 className="text-lg font-semibold">Need stronger coverage?</h2>
          <p className="mt-2 text-sm text-ink-muted">
            Use residential or mobile IPs when stability and trust are critical.
          </p>
          <Link
            href="/tools"
            className="mt-4 inline-flex items-center rounded-full border border-sand-300 bg-white px-4 py-2 text-xs font-semibold text-ink transition hover:border-sand-400"
          >
            Explore Tools
          </Link>
        </div>
      </section>
    </div>
  );
}
