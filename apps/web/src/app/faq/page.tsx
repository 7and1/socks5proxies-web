import type { Metadata } from "next";
import Link from "next/link";

export const metadata: Metadata = {
  title: "Proxy FAQ - Free Proxies, SOCKS5, and Anonymity Answers",
  description:
    "Frequently asked questions about free proxies, SOCKS5 vs HTTP, anonymity levels, and safe usage.",
  alternates: {
    canonical: "https://socks5proxies.com/faq",
  },
  openGraph: {
    title: "Proxy FAQ - Answers for Free Proxy Users",
    description:
      "Get clear answers about proxy types, anonymity, and safe usage before you launch.",
    url: "https://socks5proxies.com/faq",
    type: "website",
  },
};

const faqItems = [
  {
    question: "Are free proxies safe to use?",
    answer:
      "Free proxies are best for low-risk testing. Avoid sending credentials or sensitive data because public proxies can log traffic.",
  },
  {
    question: "What is the difference between SOCKS5 and HTTP proxies?",
    answer:
      "SOCKS5 proxies handle more protocols and typically support better authentication. HTTP/HTTPS proxies are simpler but leak more metadata.",
  },
  {
    question: "Why are free proxies slow or offline?",
    answer:
      "Public proxies churn quickly. Many are misconfigured, rate-limited, or blocked by targets after abuse.",
  },
  {
    question: "How do I test anonymity levels?",
    answer:
      "Use an anonymity test to detect proxy headers, WebRTC leaks, and fingerprint mismatches.",
  },
  {
    question: "When should I upgrade to paid proxies?",
    answer:
      "If your workflow needs stability, compliance, or higher success rates, paid residential or datacenter proxies are the right choice.",
  },
  {
    question: "How often is the proxy list updated?",
    answer:
      "The list updates continuously and provides cache-age indicators so you can see how fresh the data is.",
  },
];

const faqJsonLd = {
  "@context": "https://schema.org",
  "@type": "FAQPage",
  mainEntity: faqItems.map((item) => ({
    "@type": "Question",
    name: item.question,
    acceptedAnswer: {
      "@type": "Answer",
      text: item.answer,
    },
  })),
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
      name: "FAQ",
      item: "https://socks5proxies.com/faq",
    },
  ],
};

export default function FAQPage() {
  return (
    <div className="mx-auto max-w-5xl px-6 py-12 space-y-8">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(faqJsonLd) }}
      />

      <header className="rounded-3xl border border-sand-200 bg-white/80 p-8 shadow-sm">
        <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
          Proxy FAQ
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Answers to the Most Common Proxy Questions
        </h1>
        <p className="mt-3 text-sm text-ink-muted">
          Everything you need to know about free proxies, SOCKS5, and anonymity
          levels before you launch a workflow.
        </p>
      </header>

      <section className="grid gap-4">
        {faqItems.map((item) => (
          <article
            key={item.question}
            className="rounded-3xl border border-sand-200 bg-white/80 p-6"
          >
            <h2 className="text-lg font-semibold">{item.question}</h2>
            <p className="mt-2 text-sm text-ink-muted">{item.answer}</p>
          </article>
        ))}
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6 text-sm text-ink-muted">
        <h2 className="text-lg font-semibold text-ink">Need deeper guides?</h2>
        <p className="mt-2">
          Explore advanced playbooks and proxy strategy guides curated for
          operators.
        </p>
        <div className="mt-4 flex flex-wrap gap-3">
          <Link
            href="/docs/guides"
            className="rounded-full bg-ocean-600 px-5 py-2 text-xs font-semibold text-white shadow-lg transition hover:-translate-y-0.5 hover:bg-ocean-500"
          >
            Read Guides
          </Link>
          <Link
            href="/free-proxy-list/guide"
            className="rounded-full border border-sand-300 bg-white px-5 py-2 text-xs font-semibold text-ink transition hover:border-sand-400"
          >
            Free Proxy Guide
          </Link>
        </div>
      </section>
    </div>
  );
}
