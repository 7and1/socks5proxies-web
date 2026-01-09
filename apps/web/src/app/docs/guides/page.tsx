import type { Metadata } from "next";
import Link from "next/link";
import { BookOpen, Zap, Shield, GitBranch } from "lucide-react";

export const metadata: Metadata = {
  title: "SOCKS5 Proxy Guides & Tutorials - Learn Proxy Best Practices",
  description:
    "Learn how to check proxy quality, understand anonymity levels (Elite vs Anonymous vs Transparent), and compare SOCKS5 vs HTTP proxies. Expert guides for proxy operators.",
  keywords: [
    "proxy guide",
    "socks5 tutorial",
    "proxy anonymity levels",
    "proxy quality check",
    "socks5 vs http",
    "proxy rotation guide",
    "elite proxy explained",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/docs/guides",
  },
  openGraph: {
    title: "SOCKS5 Proxy Guides & Tutorials",
    description:
      "Expert guides on proxy quality, anonymity levels, and protocol comparison for proxy operators.",
    url: "https://socks5proxies.com/docs/guides",
    type: "website",
  },
};

const guides = [
  {
    id: "how-to-check-proxy-quality",
    title: "How to Check Proxy Quality",
    description:
      "Learn the key metrics for evaluating proxy performance: latency, uptime, anonymity level, and IP reputation.",
    icon: Zap,
    category: "Performance",
    readTime: "5 min",
  },
  {
    id: "understanding-proxy-anonymity-levels",
    title: "Understanding Proxy Anonymity Levels",
    description:
      "Elite, Anonymous, Transparent: what each level means for your fingerprint and when to use each type.",
    icon: Shield,
    category: "Security",
    readTime: "7 min",
  },
  {
    id: "socks5-vs-http-proxies",
    title: "SOCKS5 vs HTTP Proxies",
    description:
      "Deep comparison of protocols: UDP support, authentication, performance, and use case recommendations.",
    icon: GitBranch,
    category: "Comparison",
    readTime: "6 min",
  },
  {
    id: "proxy-rotation-strategies",
    title: "Proxy Rotation Strategies",
    description:
      "How to implement sticky sessions, random rotation, and header-based routing for large-scale operations.",
    icon: BookOpen,
    category: "Advanced",
    readTime: "8 min",
  },
];

export default function GuidesPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Proxy Guides & Tutorials</h1>
        <p className="mt-2 text-ink-muted">
          Expert knowledge on proxy quality, anonymity, and protocol selection.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        {guides.map((guide) => {
          const Icon = guide.icon;
          return (
            <Link
              key={guide.id}
              href={`/docs/guides/${guide.id}`}
              className="group block rounded-3xl border border-sand-200 bg-white/80 p-6 transition hover:border-sand-400 hover:shadow-lg"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-sand-700">
                    {guide.category}
                  </span>
                  <h3 className="mt-3 text-lg font-semibold group-hover:text-sand-700">
                    {guide.title}
                  </h3>
                  <p className="mt-2 text-sm text-ink-muted">
                    {guide.description}
                  </p>
                  <p className="mt-3 text-xs text-ink-muted">
                    {guide.readTime} read
                  </p>
                </div>
                <div className="ml-4 rounded-full bg-sand-100 p-3">
                  <Icon className="h-5 w-5 text-sand-600" />
                </div>
              </div>
            </Link>
          );
        })}
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6">
        <h2 className="text-lg font-semibold">Need a specific guide?</h2>
        <p className="mt-2 text-sm text-ink-muted">
          We cover SOCKS5, HTTP/HTTPS, residential vs datacenter, and browser
          fingerprinting techniques. Contact us at ops@socks5proxies.com for
          custom integration guidance.
        </p>
      </section>
    </div>
  );
}
