import type { Metadata } from "next";
import Link from "next/link";
import { toolsConfig } from "../../config/tools";
import { ArrowRight } from "lucide-react";

export const metadata: Metadata = {
  title: "Proxy Tools - Bulk Checker, IP Score, Format Converter",
  description:
    "Explore free proxy tools including bulk SOCKS5 checker, IP anonymity scoring, and proxy format converter. Built for operators who need fast validation workflows.",
  alternates: {
    canonical: "https://socks5proxies.com/tools",
  },
  openGraph: {
    title: "Proxy Tools for Validation & Monitoring",
    description:
      "Bulk check proxies, score IP anonymity, and convert formats in seconds. Free tools from Socks5Proxies.com.",
    url: "https://socks5proxies.com/tools",
    type: "website",
  },
};

const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "CollectionPage",
  name: "Proxy Tools",
  description:
    "Free proxy tools including bulk checker, IP anonymity score, and format converter.",
  url: "https://socks5proxies.com/tools",
};

export default function ToolsPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 py-12 space-y-10">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(toolJsonLd) }}
      />
      <header className="rounded-3xl border border-sand-200 bg-white/80 p-8 shadow-sm backdrop-blur dark:border-sand-700 dark:bg-sand-900/70">
        <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
          Proxy Operations Toolkit
        </p>
        <h1 className="mt-3 text-3xl font-semibold">
          Tools to Work with Proxies
        </h1>
        <p className="mt-3 max-w-2xl text-sm text-ink-muted dark:text-sand-400">
          Validate, score, and convert proxies in seconds. Each tool is built to
          complement the free proxy list and speed up your workflow.
        </p>
      </header>

      <section className="grid gap-6 md:grid-cols-3">
        {toolsConfig.map((tool) => (
          <Link
            key={tool.id}
            href={tool.href}
            className="group rounded-3xl border border-sand-200 bg-white/80 p-6 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-sand-700 dark:bg-sand-900/70"
          >
            <tool.icon className="h-6 w-6 text-ocean-600 dark:text-ocean-400" />
            <h2 className="mt-4 text-lg font-semibold">{tool.title}</h2>
            <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
              {tool.description}
            </p>
            <span className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-ocean-700 transition-all group-hover:gap-2 dark:text-ocean-400">
              Launch Tool
              <ArrowRight className="h-3 w-3" />
            </span>
          </Link>
        ))}
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50/80 p-6 text-sm text-ink-muted dark:border-sand-700 dark:bg-sand-900/60 dark:text-sand-400">
        <h2 className="text-lg font-semibold text-ink dark:text-sand-100">
          Need the proxies too?
        </h2>
        <p className="mt-2">
          Start with the live proxy list, then bring working IPs into the
          checker or converter when you are ready to test or reformat at scale.
        </p>
        <Link
          href="/free-proxy-list"
          className="mt-4 inline-flex items-center gap-2 rounded-full bg-ocean-600 px-5 py-2 text-xs font-semibold text-white shadow-lg shadow-ocean-600/30 transition hover:-translate-y-0.5 hover:bg-ocean-500"
        >
          Browse Free Proxy List
          <ArrowRight className="h-3 w-3" />
        </Link>
      </section>
    </div>
  );
}
