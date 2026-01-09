import type { Metadata } from "next";
import { FingerprintCheck } from "../../../components/features/ip/FingerprintCheck";
import { WhoamiCard } from "../../../components/features/ip/WhoamiCard";
import { AffiliateAlert } from "../../../components/features/ads/AffiliateAlert";

export const metadata: Metadata = {
  title: "Free IP Anonymity Score Test - WebRTC Leak Detection Online",
  description:
    "Free IP anonymity test with WebRTC leak detection, proxy header analysis, and browser fingerprint checking. Detect if your proxy exposes your real IP address. Instant results, no registration.",
  keywords: [
    "ip anonymity test",
    "webrtc leak test",
    "proxy leak detection",
    "ip fingerprint check",
    "anonymous proxy test",
    "proxy headers check",
    "ip address leak test",
    "browser fingerprint test",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/tools/ip-score",
  },
  openGraph: {
    title: "Free IP Anonymity Score - WebRTC Leak Detection",
    description:
      "Test your proxy for WebRTC leaks, header exposure, and browser fingerprinting. Free instant analysis.",
    url: "https://socks5proxies.com/tools/ip-score",
    type: "website",
  },
};

// Breadcrumb JSON-LD for SEO
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
      name: "IP Anonymity Score",
      item: "https://socks5proxies.com/tools/ip-score",
    },
  ],
};

// JSON-LD for the tool
const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "IP Anonymity Score Tool",
  description:
    "Free online tool to test IP anonymity, detect WebRTC leaks, and analyze proxy headers for exposure risks.",
  url: "https://socks5proxies.com/tools/ip-score",
  applicationCategory: "SecurityApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "WebRTC leak detection",
    "Proxy header analysis",
    "Browser fingerprint checking",
    "IP reputation scoring",
    "Real-time results",
  ],
};

export default function IpScorePage() {
  return (
    <div className="space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <header>
        <h1 className="text-3xl font-semibold">
          Free IP Anonymity Score & WebRTC Leak Test
        </h1>
        <p className="mt-2 text-ink-muted">
          Detect WebRTC leaks, proxy-revealing headers, and browser fingerprint
          mismatches that can expose your real IP address.
        </p>
      </header>

      <div className="grid gap-6 md:grid-cols-2">
        <FingerprintCheck />
        <WhoamiCard />
      </div>

      <AffiliateAlert
        title="Low anonymity score detected?"
        cta="Upgrade to residential IPs"
        provider="brightdata"
      />

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">
          What This IP Anonymity Test Checks
        </h2>
        <ul className="mt-3 space-y-3 text-sm text-ink-muted">
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-ocean-500 flex-shrink-0"></span>
            <span>
              <strong className="text-ink">WebRTC leaks</strong> - Detects if
              WebRTC exposes your local or ISP IP address even when using a
              proxy.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-ocean-500 flex-shrink-0"></span>
            <span>
              <strong className="text-ink">Proxy headers</strong> - Checks for
              X-Forwarded-For, Via, and other headers that reveal proxy usage.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-ocean-500 flex-shrink-0"></span>
            <span>
              <strong className="text-ink">IP fingerprint mismatch</strong> -
              Compares proxy exit IP with browser fingerprint location data.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="mt-0.5 h-2 w-2 rounded-full bg-ocean-500 flex-shrink-0"></span>
            <span>
              <strong className="text-ink">DNS leak detection</strong> -
              Verifies your DNS requests are routing through the proxy.
            </span>
          </li>
        </ul>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6">
        <h2 className="text-xl font-semibold">
          Understanding Proxy Anonymity Levels
        </h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <article className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <h3 className="font-semibold text-emerald-700">Elite (Level 1)</h3>
            <p className="mt-2 text-sm text-ink-muted">
              Highest anonymity. No headers reveal proxy usage. Target cannot
              detect you are using a proxy.
            </p>
          </article>
          <article className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <h3 className="font-semibold text-amber-700">
              Anonymous (Level 2)
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              Target knows you use a proxy but cannot see your real IP. Some
              headers may be modified.
            </p>
          </article>
          <article className="rounded-2xl border border-sand-200 bg-sand-50 p-4">
            <h3 className="font-semibold text-red-700">
              Transparent (Level 3)
            </h3>
            <p className="mt-2 text-sm text-ink-muted">
              Your real IP is exposed via X-Forwarded-For or similar headers.
              Provides no anonymity protection.
            </p>
          </article>
        </div>
      </section>
    </div>
  );
}
