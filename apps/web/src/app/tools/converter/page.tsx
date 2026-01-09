import type { Metadata } from "next";
import { ProxyConverter } from "../../../components/features/converter/ProxyConverter";

export const metadata: Metadata = {
  title: "Free Proxy Format Converter Online - JSON, Clash, cURL Generator",
  description:
    "Free online proxy format converter. Transform proxy lists to JSON, Clash YAML config, or cURL commands instantly. 100% client-side processing - your proxy data never leaves your browser. Supports SOCKS5 and HTTP proxies with authentication.",
  keywords: [
    "proxy converter",
    "clash config generator",
    "proxy to json converter",
    "socks5 to json",
    "proxy format converter online",
    "curl proxy format",
    "clash yaml generator",
    "convert proxy list",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/tools/converter",
  },
  openGraph: {
    title: "Free Proxy Format Converter - JSON, Clash, cURL Generator",
    description:
      "Convert proxy lists to JSON, Clash config, or cURL format instantly. 100% client-side - your data never leaves the browser.",
    url: "https://socks5proxies.com/tools/converter",
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
      name: "Proxy Format Converter",
      item: "https://socks5proxies.com/tools/converter",
    },
  ],
};

// JSON-LD for the tool
const toolJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Proxy Format Converter",
  description:
    "Free online tool to convert proxy lists between IP:Port, JSON, Clash config, and cURL formats. All processing is client-side.",
  url: "https://socks5proxies.com/tools/converter",
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
  },
  featureList: [
    "Convert to JSON format",
    "Generate Clash config YAML",
    "Create cURL commands",
    "100% client-side processing",
    "Support for authenticated proxies",
    "SOCKS5 and HTTP proxy support",
  ],
};

const outputFormats = [
  {
    name: "JSON",
    desc: "Structured data format for APIs and automation scripts",
    use: "Best for: Node.js, Python, API integrations",
  },
  {
    name: "Clash",
    desc: "Ready-to-use config for Clash proxy client",
    use: "Best for: Clash, ClashX, Clash for Windows",
  },
  {
    name: "cURL",
    desc: "Command-line format for testing and scripting",
    use: "Best for: Shell scripts, quick testing",
  },
];

export default function ConverterPage() {
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
          Free Proxy Format Converter Online
        </h1>
        <p className="mt-2 text-ink-muted max-w-2xl">
          Transform proxy lists to JSON, Clash, or cURL format instantly. All
          processing happens in your browser - your proxy data is never sent to
          any server.
        </p>
      </header>

      <ProxyConverter />

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6 dark:border-sand-700 dark:bg-sand-900/80">
        <h2 className="text-xl font-semibold">Supported Input Formats</h2>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 dark:border-sand-700 dark:bg-sand-800">
            <p className="font-mono text-sm font-semibold">ip:port</p>
            <p className="mt-1 text-sm text-ink-muted dark:text-sand-400">
              Basic format for public proxies without authentication
            </p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-500">
              Example: 192.168.1.1:1080
            </p>
          </div>
          <div className="rounded-2xl border border-sand-200 bg-sand-50 p-4 dark:border-sand-700 dark:bg-sand-800">
            <p className="font-mono text-sm font-semibold">ip:port:user:pass</p>
            <p className="mt-1 text-sm text-ink-muted dark:text-sand-400">
              Authenticated format for premium proxy services
            </p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-500">
              Example: 192.168.1.1:1080:myuser:mypass
            </p>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-white/80 p-6 dark:border-sand-700 dark:bg-sand-900/80">
        <h2 className="text-xl font-semibold">Output Formats</h2>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          {outputFormats.map((format) => (
            <div
              key={format.name}
              className="rounded-2xl border border-sand-200 bg-sand-50 p-4 dark:border-sand-700 dark:bg-sand-800"
            >
              <p className="font-semibold text-ocean-700 dark:text-ocean-400">
                {format.name}
              </p>
              <p className="mt-1 text-sm text-ink-muted dark:text-sand-400">
                {format.desc}
              </p>
              <p className="mt-2 text-xs text-ink-muted dark:text-sand-500">
                {format.use}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-ocean-200 bg-ocean-50/50 p-6 dark:border-ocean-800 dark:bg-ocean-950/30">
        <h2 className="text-lg font-semibold">Privacy First</h2>
        <p className="mt-2 text-sm text-ink-muted dark:text-sand-400">
          All conversions happen entirely in your browser using JavaScript. Your
          proxy list is never transmitted to our servers or any third party.
          Refresh the page to clear all data from memory.
        </p>
      </section>
    </div>
  );
}
