import type { Metadata } from "next";
import { BulkCheckerClient } from "../../../components/features/checker/BulkCheckerClient";

export const metadata: Metadata = {
  title: "Free Bulk Proxy Checker - Test 500 SOCKS5 Proxies Online",
  description:
    "Free bulk proxy checker with real-time WebSocket results. Test up to 500 SOCKS5 proxies for speed, latency, anonymity level, and uptime simultaneously. Export results to CSV. No registration required.",
  keywords: [
    "bulk proxy checker",
    "free proxy checker",
    "socks5 proxy tester",
    "proxy latency test",
    "proxy uptime checker",
    "mass proxy checker",
    "proxy speed test online",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/tools/bulk-checker",
  },
  openGraph: {
    title: "Free Bulk Proxy Checker - Test 500 Proxies at Once",
    description:
      "Test up to 500 SOCKS5 proxies for speed, anonymity, and uptime with live WebSocket streaming results.",
    url: "https://socks5proxies.com/tools/bulk-checker",
    type: "website",
  },
};

const workflow = [
  {
    step: "1",
    title: "Paste your proxy list",
    body: "Enter IP:Port or authenticated proxy lines (IP:Port:User:Pass). The validator automatically flags invalid entries before scanning.",
  },
  {
    step: "2",
    title: "Run high-concurrency scan",
    body: "Our Go-powered checker tests proxies in parallel with controlled concurrency and streams results via WebSocket in real-time.",
  },
  {
    step: "3",
    title: "Triage and export results",
    body: "Sort by latency, anonymity level, or status. Export working proxies to CSV or upgrade to premium residential IPs if needed.",
  },
];

// JSON-LD for Breadcrumb schema
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
      name: "Tools",
      item: "https://socks5proxies.com/tools",
    },
    {
      "@type": "ListItem",
      position: 3,
      name: "Bulk Proxy Checker",
      item: "https://socks5proxies.com/tools/bulk-checker",
    },
  ],
};

// JSON-LD for HowTo schema
const howToJsonLd = {
  "@context": "https://schema.org",
  "@type": "HowTo",
  name: "How to Check Multiple Proxies at Once",
  description:
    "Step-by-step guide to bulk test SOCKS5 proxies for speed, anonymity, and uptime using our free online tool.",
  totalTime: "PT2M",
  tool: {
    "@type": "HowToTool",
    name: "Socks5Proxies.com Bulk Checker",
  },
  step: [
    {
      "@type": "HowToStep",
      name: "Paste your proxy list",
      text: "Enter your proxies in IP:Port or IP:Port:User:Pass format, one per line. You can check up to 500 proxies at once.",
      position: 1,
    },
    {
      "@type": "HowToStep",
      name: "Start the scan",
      text: "Click 'Check Proxies' to begin the high-concurrency scan. Results stream in real-time via WebSocket.",
      position: 2,
    },
    {
      "@type": "HowToStep",
      name: "Review and export results",
      text: "Sort results by latency, status, or anonymity level. Export working proxies to CSV for your applications.",
      position: 3,
    },
  ],
};

export default function BulkCheckerPage() {
  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(howToJsonLd) }}
      />
      <header>
        <h1 className="text-3xl font-semibold">
          Free Bulk SOCKS5 Proxy Checker
        </h1>
        <p className="mt-2 text-ink-muted">
          Test up to 500 proxies simultaneously for speed, anonymity level, and
          uptime with real-time WebSocket streaming results.
        </p>
      </header>

      <BulkCheckerClient />

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">
          How to Check Multiple Proxies at Once
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {workflow.map((item) => (
            <article
              key={item.title}
              className="rounded-2xl border border-sand-200 bg-sand-50 p-4"
            >
              <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-ocean-100 text-xs font-bold text-ocean-700">
                {item.step}
              </span>
              <h3 className="mt-2 text-sm font-semibold">{item.title}</h3>
              <p className="mt-2 text-sm text-ink-muted">{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">
          Why Use Our Bulk Proxy Checker?
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="space-y-3 text-sm text-ink-muted">
            <p>
              <strong className="text-ink">Real-time WebSocket results:</strong>{" "}
              See proxy status as each check completes, no waiting for batch
              completion.
            </p>
            <p>
              <strong className="text-ink">High concurrency:</strong> Test
              hundreds of proxies in parallel with our Go-powered backend.
            </p>
            <p>
              <strong className="text-ink">Detailed metrics:</strong> Get
              latency, anonymity level (Elite/Anonymous/Transparent), country,
              and uptime status.
            </p>
          </div>
          <div className="space-y-3 text-sm text-ink-muted">
            <p>
              <strong className="text-ink">No registration:</strong> Start
              checking immediately without creating an account.
            </p>
            <p>
              <strong className="text-ink">Export to CSV:</strong> Download
              results for use in your automation scripts and tools.
            </p>
            <p>
              <strong className="text-ink">SOCKS5 and HTTP support:</strong>{" "}
              Test both proxy protocols with automatic detection.
            </p>
          </div>
        </div>
      </section>
    </div>
  );
}
