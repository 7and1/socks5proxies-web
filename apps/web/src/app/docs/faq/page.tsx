import type { Metadata } from "next";
import { HelpCircle, AlertCircle, Mail, Wrench, Shield } from "lucide-react";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proxy Checker FAQ - Common Questions & Troubleshooting",
  description:
    "Find answers to common questions about bulk proxy checking, IP anonymity testing, proxy formats, and troubleshooting connection issues. Get help with proxy validation.",
  keywords: [
    "proxy faq",
    "proxy troubleshooting",
    "socks5 help",
    "proxy checker help",
    "proxy format help",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/docs/faq",
  },
};

// FAQ JSON-LD for featured snippets
const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: [
    {
      "@type": "Question",
      name: "How many proxies can I check at once?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "You can check up to 500 proxies in a single batch using our bulk proxy checker. Results stream in real-time via WebSocket. For larger operations, contact us for enterprise API access with higher limits.",
      },
    },
    {
      "@type": "Question",
      name: "Why do my proxies show as timeout?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Proxy timeouts typically occur when: 1) The proxy is offline or overloaded, 2) The proxy blocks connections from our checker IP, 3) Network latency exceeds the timeout threshold, or 4) The proxy requires authentication you haven't provided. Try increasing the timeout value or verify the proxy works from a different IP.",
      },
    },
    {
      "@type": "Question",
      name: "What is the difference between Elite, Anonymous, and Transparent proxies?",
      acceptedAnswer: {
        "@type": "Answer",
        text: "Elite proxies (Level 1) hide all evidence of proxy usage - no headers reveal you're using a proxy. Anonymous proxies (Level 2) show you're using a proxy but hide your real IP. Transparent proxies (Level 3) expose your real IP via headers like X-Forwarded-For and offer no anonymity protection.",
      },
    },
  ],
};

const faqs = [
  {
    category: "General",
    icon: HelpCircle,
    questions: [
      {
        q: "Is this service free to use?",
        a: "Yes, our bulk proxy checker, IP anonymity tester, and format converter are completely free. We apply rate limits to ensure fair usage for all users. No registration or credit card required.",
      },
      {
        q: "How many proxies can I check at once?",
        a: "You can check up to 500 proxies in a single batch. Results stream in real-time via WebSocket, so you see each proxy status as it completes. For larger operations requiring thousands of proxies, contact us for enterprise API access.",
      },
      {
        q: "What proxy formats are supported?",
        a: "We support IP:Port format for public proxies and IP:Port:User:Pass for authenticated proxies. The converter tool outputs to JSON (for APIs), Clash config (for proxy clients), and cURL (for command-line testing).",
      },
      {
        q: "Is my proxy data stored on your servers?",
        a: "Proxy lists submitted for checking are processed in memory and discarded after results are returned. The format converter runs entirely in your browser - no data is transmitted to our servers. We do not log or store individual proxy addresses.",
      },
    ],
  },
  {
    category: "Troubleshooting",
    icon: AlertCircle,
    questions: [
      {
        q: "Why do my proxies show as 'timeout'?",
        a: "Timeouts occur when: 1) The proxy is offline or overloaded, 2) The proxy blocks connections from our checker, 3) Network latency exceeds the threshold, or 4) Authentication is required but not provided. Try increasing the timeout value or verify the proxy works from a different location.",
      },
      {
        q: "My proxies work in my browser but fail here. Why?",
        a: "Some proxy providers whitelist specific IPs or regions. Our checker runs from data center IPs which some providers block. Additionally, HTTP-only proxies will fail SOCKS5 tests. Try testing with the correct protocol selected.",
      },
      {
        q: "What does 'anonymity: detected' mean?",
        a: "This means the proxy is injecting headers (like X-Forwarded-For or Via) that reveal proxy usage to the destination server. For true anonymity, you need an 'Elite' rated proxy that passes no identifying headers.",
      },
      {
        q: "Why does the IP score show a WebRTC leak?",
        a: "WebRTC can bypass proxy settings and reveal your real IP through browser APIs. This is a browser-level leak, not a proxy issue. Use a browser extension to disable WebRTC or switch to an anti-detect browser for sensitive operations.",
      },
    ],
  },
  {
    category: "Anonymity & Security",
    icon: Shield,
    questions: [
      {
        q: "What is the difference between Elite, Anonymous, and Transparent proxies?",
        a: "Elite (Level 1): Completely hides proxy usage - appears as direct connection. Anonymous (Level 2): Shows proxy usage but hides your real IP. Transparent (Level 3): Exposes your real IP via headers - provides no anonymity. For sensitive operations, always use Elite proxies.",
      },
      {
        q: "How do I prevent WebRTC leaks?",
        a: "Disable WebRTC in browser settings (Firefox: media.peerconnection.enabled = false), use a WebRTC-blocking extension, or use an anti-detect browser like Multilogin or GoLogin that isolates fingerprints.",
      },
      {
        q: "Are residential proxies more anonymous than datacenter proxies?",
        a: "Residential proxies use real ISP IPs which are less likely to be flagged or blocked. However, both can be Elite-level anonymous. Residential IPs are better for accessing geo-restricted content and avoiding IP reputation blocks, not necessarily for header-level anonymity.",
      },
    ],
  },
  {
    category: "API & Integration",
    icon: Wrench,
    questions: [
      {
        q: "Do you offer an API for automated proxy checking?",
        a: "Yes. We provide REST endpoints for batch checking and WebSocket connections for real-time streaming results. Rate limits apply: 100 requests/minute for checking, 50/minute for conversion. See our API documentation for code examples.",
      },
      {
        q: "Can I integrate this into my application?",
        a: "Absolutely. Our API is designed for integration with automation tools, proxy managers, and custom applications. For enterprise needs (higher rate limits, dedicated endpoints, SLA), contact ops@socks5proxies.com.",
      },
      {
        q: "What is the response format for the API?",
        a: "All API responses use JSON. Each proxy result includes: status (alive/dead), latency (ms), anonymity level (elite/anonymous/transparent), country code, and IP score. See the API docs for complete schema.",
      },
    ],
  },
];

export default function FaqPage() {
  return (
    <div className="space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />
      <header>
        <h1 className="text-3xl font-semibold">Frequently Asked Questions</h1>
        <p className="mt-2 text-ink-muted max-w-2xl">
          Get answers to common questions about proxy checking, anonymity
          testing, troubleshooting, and API integration.
        </p>
      </header>

      <section className="space-y-8">
        {faqs.map((category) => {
          const Icon = category.icon;
          return (
            <div key={category.category}>
              <div className="flex items-center gap-3">
                <div className="rounded-full bg-sand-100 p-2 dark:bg-sand-800">
                  <Icon className="h-5 w-5 text-sand-600 dark:text-sand-400" />
                </div>
                <h2 className="text-xl font-semibold">{category.category}</h2>
              </div>
              <div className="mt-4 space-y-3">
                {category.questions.map((item, idx) => (
                  <details
                    key={idx}
                    className="group rounded-2xl border border-sand-200 bg-sand-50 dark:border-sand-700 dark:bg-sand-800"
                  >
                    <summary className="cursor-pointer p-4 font-semibold hover:text-ocean-700 dark:hover:text-ocean-400 list-none flex items-center justify-between">
                      {item.q}
                      <span className="text-sand-400 group-open:rotate-180 transition-transform">
                        <svg
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                        >
                          <polyline points="6 9 12 15 18 9" />
                        </svg>
                      </span>
                    </summary>
                    <div className="px-4 pb-4 text-sm text-ink-muted dark:text-sand-400">
                      {item.a}
                    </div>
                  </details>
                ))}
              </div>
            </div>
          );
        })}
      </section>

      <section className="rounded-3xl border border-ocean-200 bg-ocean-50/50 p-6 dark:border-ocean-800 dark:bg-ocean-950/30">
        <div className="flex items-start gap-4">
          <Mail className="h-6 w-6 text-ocean-600 dark:text-ocean-400 flex-shrink-0 mt-1" />
          <div>
            <h2 className="text-lg font-semibold">Still have questions?</h2>
            <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
              Our team typically responds within 24 hours. Contact us at{" "}
              <a
                href="mailto:ops@socks5proxies.com"
                className="font-semibold text-ocean-700 hover:underline dark:text-ocean-400"
              >
                ops@socks5proxies.com
              </a>
            </p>
            <p className="mt-1 text-sm text-ink-muted dark:text-sand-400">
              For enterprise integration, custom rate limits, dedicated support,
              or partnership inquiries.
            </p>
          </div>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Related Resources</h2>
        <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
          Explore our guides and documentation for more detailed information
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/docs/guides"
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ocean-400 hover:bg-ocean-50 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
          >
            Proxy Guides
          </Link>
          <Link
            href="/docs/api"
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ocean-400 hover:bg-ocean-50 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
          >
            API Documentation
          </Link>
          <Link
            href="/tools/bulk-checker"
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ocean-400 hover:bg-ocean-50 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
          >
            Bulk Checker
          </Link>
          <Link
            href="/tools/ip-score"
            className="rounded-full border border-sand-300 bg-white px-4 py-2 text-sm font-semibold transition hover:border-ocean-400 hover:bg-ocean-50 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
          >
            IP Anonymity Test
          </Link>
        </div>
      </section>
    </div>
  );
}
