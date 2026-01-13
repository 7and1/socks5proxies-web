import type { Metadata } from "next";
import Link from "next/link";
import { Header } from "../../components/layout/Header";
import { Footer } from "../../components/layout/Footer";

export const metadata: Metadata = {
  title: "Terms of Service",
  description:
    "Terms of Service for Socks5Proxies.com - Read our terms and conditions for using our proxy checking tools.",
  alternates: {
    canonical: "https://socks5proxies.com/terms",
  },
  openGraph: {
    title: "Terms of Service | Socks5Proxies.com",
    description:
      "Read the terms and conditions for using Socks5Proxies.com free proxy checking tools and services.",
    url: "https://socks5proxies.com/terms",
    siteName: "Socks5Proxies.com",
    type: "website",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Socks5Proxies.com Terms of Service",
      },
    ],
  },
};

export default function TermsPage() {
  return (
    <>
      <Header />
      <main className="min-h-screen bg-gradient-to-b from-sand-50 to-white dark:from-sand-950 dark:to-sand-900">
        <div className="mx-auto max-w-3xl px-6 py-16 lg:py-24">
          <h1 className="font-heading text-3xl font-bold text-ink dark:text-sand-100 lg:text-4xl">
            Terms of Service
          </h1>
          <p className="mt-4 text-sm text-ink-muted dark:text-sand-400">
            Last updated: January 2026
          </p>

          <div className="prose prose-sand mt-8 max-w-none dark:prose-invert">
            <section className="space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                1. Acceptance of Terms
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                By accessing and using Socks5Proxies.com, you accept and agree
                to be bound by these Terms of Service. If you do not agree to
                these terms, please do not use our services.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                2. Description of Service
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                Socks5Proxies.com provides free online tools for:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Bulk proxy checking and validation</li>
                <li>IP anonymity scoring and leak detection</li>
                <li>Proxy format conversion</li>
              </ul>
              <p className="text-ink-muted dark:text-sand-300">
                These services are provided &ldquo;as is&rdquo; without any
                warranties.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                3. Acceptable Use
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                You agree to use our services only for lawful purposes. You must
                not:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Use the service for any illegal or unauthorized purpose</li>
                <li>
                  Attempt to overload, disrupt, or attack our infrastructure
                </li>
                <li>
                  Bypass rate limits or abuse our API/WebSocket connections
                </li>
                <li>
                  Use automated tools to scrape or harvest data from our service
                </li>
                <li>Submit malicious data or injection attempts</li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                4. Rate Limits
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                To ensure fair usage for all users, we enforce rate limits:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Maximum 500 proxies per check request</li>
                <li>Daily check limits per IP address</li>
                <li>Concurrent WebSocket connection limits</li>
              </ul>
              <p className="text-ink-muted dark:text-sand-300">
                Abuse of these limits may result in temporary or permanent
                blocking.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                5. Disclaimer of Warranties
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                Our services are provided &ldquo;as is&rdquo; and &ldquo;as
                available&rdquo; without warranties of any kind. We do not
                guarantee:
              </p>
              <ul className="list-disc space-y-2 pl-6 text-ink-muted dark:text-sand-300">
                <li>Continuous, uninterrupted service availability</li>
                <li>Accuracy of proxy check results</li>
                <li>That proxies you check are legal to use</li>
              </ul>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                6. Limitation of Liability
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                Socks5Proxies.com shall not be liable for any indirect,
                incidental, special, consequential, or punitive damages
                resulting from your use of or inability to use our services.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                7. Third-Party Services
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We may recommend or link to third-party proxy providers. These
                recommendations are for informational purposes only. We are not
                responsible for third-party services, and any transactions with
                them are solely between you and the provider.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                8. Modifications
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                We reserve the right to modify these terms at any time.
                Continued use of the service after changes constitutes
                acceptance of the new terms.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                9. Governing Law
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                These terms shall be governed by and construed in accordance
                with applicable laws, without regard to conflict of law
                principles.
              </p>
            </section>

            <section className="mt-8 space-y-4">
              <h2 className="text-xl font-semibold text-ink dark:text-sand-200">
                10. Contact
              </h2>
              <p className="text-ink-muted dark:text-sand-300">
                For questions about these Terms of Service, contact us at{" "}
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
