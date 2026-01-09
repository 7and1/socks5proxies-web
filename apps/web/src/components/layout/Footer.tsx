import Link from "next/link";
import { Github, Twitter, Mail } from "lucide-react";
import { site } from "../../config/site";

const footerLinks = {
  tools: [
    { label: "Free Proxy List", href: "/free-proxy-list" },
    { label: "Bulk Proxy Checker", href: "/tools/bulk-checker" },
    { label: "IP Anonymity Score", href: "/tools/ip-score" },
    { label: "Format Converter", href: "/tools/converter" },
  ],
  resources: [
    { label: "Free Proxy Guide", href: "/free-proxy-list/guide" },
    { label: "Proxy Comparison", href: "/proxy-comparison" },
    { label: "Proxy FAQ", href: "/faq" },
    { label: "Proxy Guides", href: "/docs/guides" },
    { label: "API Documentation", href: "/docs/api" },
    { label: "Blog", href: "/blog" },
  ],
  legal: [
    { label: "Privacy Policy", href: "/privacy" },
    { label: "Terms of Service", href: "/terms" },
  ],
  social: [
    {
      name: "Twitter",
      href: "https://twitter.com/socks5proxies",
      icon: Twitter,
    },
    { name: "GitHub", href: "https://github.com/socks5proxies", icon: Github },
  ],
};

export function Footer() {
  return (
    <footer
      className="border-t border-sand-200/80 bg-sand-50 dark:border-sand-700/80 dark:bg-sand-900"
      role="contentinfo"
    >
      {/* Main Footer Content */}
      <div className="mx-auto grid max-w-6xl gap-10 px-6 py-12 md:grid-cols-4 lg:grid-cols-5 lg:py-16">
        {/* Brand Column */}
        <div className="lg:col-span-2">
          <Link
            href="/"
            className="group inline-flex items-center gap-2 text-lg font-semibold transition-colors hover:text-ocean-600 dark:hover:text-ocean-400"
            aria-label={`${site.name} - Home`}
          >
            <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-ocean-600 text-sm font-bold text-white shadow-md transition-transform group-hover:scale-105">
              SP
            </span>
            {site.name}
          </Link>
          <p className="mt-4 max-w-sm text-sm leading-relaxed text-ink-muted dark:text-sand-400">
            {site.description}
          </p>

          {/* Social Links */}
          <div className="mt-6 flex items-center gap-3">
            {footerLinks.social.map((social) => {
              const Icon = social.icon;
              return (
                <a
                  key={social.name}
                  href={social.href}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex h-10 w-10 items-center justify-center rounded-full bg-sand-200 text-sand-600 transition-all hover:bg-ocean-100 hover:text-ocean-600 hover:scale-110 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:bg-sand-800 dark:text-sand-400 dark:hover:bg-ocean-900/50 dark:hover:text-ocean-400"
                  aria-label={`Follow us on ${social.name}`}
                >
                  <Icon className="h-4 w-4" aria-hidden="true" />
                </a>
              );
            })}
          </div>

          {/* Contact */}
          <a
            href="mailto:ops@socks5proxies.com"
            className="mt-4 inline-flex items-center gap-2 text-sm text-ink-muted transition-colors hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-400"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            ops@socks5proxies.com
          </a>
        </div>

        {/* Tools Column */}
        <nav aria-label="Tools navigation">
          <p className="text-sm font-semibold text-ink dark:text-sand-200">
            Tools
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {footerLinks.tools.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Resources Column */}
        <nav aria-label="Resources navigation">
          <p className="text-sm font-semibold text-ink dark:text-sand-200">
            Resources
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {footerLinks.resources.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>

        {/* Legal Column */}
        <nav aria-label="Legal navigation">
          <p className="text-sm font-semibold text-ink dark:text-sand-200">
            Legal
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {footerLinks.legal.map((item) => (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className="text-sm text-ink-muted transition-colors hover:text-ocean-600 dark:text-sand-400 dark:hover:text-ocean-400"
                >
                  {item.label}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-sand-200 dark:border-sand-700">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-6 py-6 sm:flex-row">
          <p className="text-center text-xs text-ink-muted dark:text-sand-500">
            {new Date().getFullYear()} {site.name}. All rights reserved.
          </p>
          <p className="flex items-center gap-1 text-center text-xs text-ink-muted dark:text-sand-500">
            Built for operators with
            <span className="text-ocean-600 dark:text-ocean-400">
              performance
            </span>
            in mind.
          </p>
        </div>
      </div>
    </footer>
  );
}
