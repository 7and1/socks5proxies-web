import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description:
    "Privacy Policy for Socks5Proxies.com - Learn how we collect, use, and protect your data when using our proxy checking tools.",
  alternates: {
    canonical: "https://socks5proxies.com/privacy",
  },
  openGraph: {
    title: "Privacy Policy | Socks5Proxies.com",
    description:
      "Learn how Socks5Proxies.com collects, uses, and protects your data when using our free proxy checking tools.",
    url: "https://socks5proxies.com/privacy",
    siteName: "Socks5Proxies.com",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Socks5Proxies.com Privacy Policy",
      },
    ],
  },
};

export default function PrivacyPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sand-50 to-white dark:from-sand-950 dark:to-sand-900">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
          <h1 className="font-heading text-3xl font-bold text-ink dark:text-sand-100 lg:text-4xl">
            Privacy Policy
          </h1>
          <p className="mt-4 text-sm text-ink-muted dark:text-sand-400">
            Last updated: January 2025
          </p>

          <div className="prose prose-sand mt-8 max-w-none dark:prose-invert">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                1. Information We Collect
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                When you use Socks5Proxies.com, we collect minimal information
                necessary to provide our services:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>
                  <strong>Proxy Data:</strong> The proxy addresses you submit
                  for checking are processed in real-time and not stored
                  permanently.
                </li>
                <li>
                  <strong>Usage Data:</strong> We collect anonymous usage
                  statistics to improve our services, including page views and
                  feature usage.
                </li>
                <li>
                  <strong>IP Address:</strong> Your IP address is used for rate
                  limiting purposes and is not stored long-term.
                </li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                2. How We Use Your Information
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We use the information we collect to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Provide and maintain our proxy checking services</li>
                <li>Improve and optimize our tools</li>
                <li>Prevent abuse and enforce rate limits</li>
                <li>Analyze usage patterns to enhance user experience</li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                3. Cookies and Analytics
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We use cookies and similar technologies for:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>
                  <strong>Essential Cookies:</strong> Required for the website
                  to function properly (e.g., theme preferences).
                </li>
                <li>
                  <strong>Analytics:</strong> We use privacy-focused analytics
                  to understand how our tools are used. You can opt out via the
                  cookie consent banner.
                </li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                4. Data Sharing
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We do not sell, trade, or rent your personal information to
                third parties. We may share data with:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Service providers who assist in operating our website</li>
                <li>
                  Law enforcement when required by law or to protect our rights
                </li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                5. Data Security
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We implement appropriate security measures to protect your data,
                including:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>HTTPS encryption for all data transmission</li>
                <li>Regular security audits</li>
                <li>Minimal data retention practices</li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                6. Your Rights
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                You have the right to:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Access information we hold about you</li>
                <li>Request deletion of your data</li>
                <li>Opt out of analytics tracking</li>
                <li>Contact us with privacy concerns</li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                7. Contact Us
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                If you have questions about this Privacy Policy, please contact
                us at{" "}
                <a
                  href="mailto:ops@socks5proxies.com"
                  className="text-ocean-600 hover:underline dark:text-ocean-400"
                >
                  ops@socks5proxies.com
                </a>
                .
              </p>
            </section>
          </div>

          <div className="mt-12 border-t border-sand-200 pt-8 dark:border-sand-700">
            <Link
              href="/"
              className="text-sm text-ocean-600 hover:underline dark:text-ocean-400"
            >
              &larr; Back to Home
            </Link>
          </div>
        </div>
      </main>
      <Footer />
    </>
  );
}
