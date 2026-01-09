import type { Metadata } from "next";
import { Fraunces, Sora, IBM_Plex_Mono } from "next/font/google";
import { Suspense } from "react";
import { AnalyticsProvider, AnalyticsConsent } from "../components/analytics";
import "./globals.css";

const heading = Fraunces({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
});

const body = Sora({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const mono = IBM_Plex_Mono({
  subsets: ["latin"],
  weight: ["400", "600"],
  variable: "--font-mono",
  display: "swap",
});

const siteUrl = "https://socks5proxies.com";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default:
      "Free SOCKS5 Proxy Checker & IP Anonymity Tools | Socks5Proxies.com",
    template: "%s | Socks5Proxies.com",
  },
  description:
    "Free online SOCKS5 proxy checker: test up to 500 proxies for speed, anonymity, and uptime. Includes IP anonymity scoring with WebRTC leak detection and instant proxy format converter. No registration required.",
  keywords: [
    "socks5 proxy checker",
    "free proxy checker",
    "bulk proxy checker",
    "proxy tester online",
    "ip anonymity score",
    "ip anonymity test",
    "webrtc leak test",
    "proxy format converter",
    "proxy tools",
    "clash config converter",
    "socks5 proxy tester",
    "proxy validation",
    "residential proxy checker",
    "proxy latency test",
    "anonymous proxy test",
  ],
  authors: [{ name: "Socks5Proxies.com", url: siteUrl }],
  creator: "Socks5Proxies.com",
  publisher: "Socks5Proxies.com",
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  alternates: {
    canonical: siteUrl,
  },

  // Open Graph / Facebook
  openGraph: {
    type: "website",
    locale: "en_US",
    url: siteUrl,
    title: "Free SOCKS5 Proxy Checker - Test 500+ Proxies Instantly",
    description:
      "Bulk proxy checker with live WebSocket results. Test speed, anonymity, and uptime for SOCKS5 proxies. Free IP anonymity scoring and format converter included.",
    siteName: "Socks5Proxies.com",
    images: [
      {
        url: "/og-image.svg",
        width: 1200,
        height: 630,
        alt: "Socks5Proxies.com - Free SOCKS5 Proxy Checker and IP Anonymity Tools",
        type: "image/svg+xml",
      },
    ],
  },

  // Twitter Card
  twitter: {
    card: "summary_large_image",
    site: "@socks5proxies",
    creator: "@socks5proxies",
    title: "Free SOCKS5 Proxy Checker - Test 500+ Proxies Instantly",
    description:
      "Bulk proxy checker with live results. Test speed, anonymity, and uptime. Free IP scoring and format converter.",
    images: [
      {
        url: "/og-image.svg",
        alt: "Socks5Proxies.com - Free Proxy Testing Tools",
      },
    ],
  },

  // Additional metadata
  applicationName: "Socks5Proxies.com",
  category: "Technology",
  classification: "Web Tools",

  // Icons
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon-16x16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32x32.png", sizes: "32x32", type: "image/png" },
    ],
    shortcut: "/favicon-16x16.png",
    apple: [
      { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },

  // Manifest
  manifest: "/site.webmanifest",

  // Other
  other: {
    "msapplication-TileColor": "#0ea5e9",
    "theme-color": "#fdf7f0",
  },
};

// JSON-LD Structured Data - WebSite schema with SearchAction
const websiteJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebSite",
  name: "Socks5Proxies.com",
  url: siteUrl,
  description:
    "Free online SOCKS5 proxy checker and IP anonymity testing tools",
  potentialAction: {
    "@type": "SearchAction",
    target: {
      "@type": "EntryPoint",
      urlTemplate: `${siteUrl}/free-proxy-list?q={search_term_string}`,
    },
    "query-input": "required name=search_term_string",
  },
};

// JSON-LD Structured Data - WebApplication schema
const appJsonLd = {
  "@context": "https://schema.org",
  "@type": "WebApplication",
  name: "Socks5Proxies.com Proxy Checker",
  description:
    "Free bulk SOCKS5 proxy checker with real-time WebSocket results. Test up to 500 proxies for speed, anonymity, and uptime.",
  url: siteUrl,
  applicationCategory: "UtilitiesApplication",
  operatingSystem: "Web Browser",
  offers: {
    "@type": "Offer",
    price: "0",
    priceCurrency: "USD",
    availability: "https://schema.org/InStock",
  },
  featureList: [
    "Bulk proxy checking up to 500 proxies simultaneously",
    "Real-time WebSocket streaming results",
    "IP anonymity scoring with leak detection",
    "WebRTC leak detection",
    "Proxy format conversion (JSON, Clash, cURL)",
    "IPv4 and IPv6 support",
    "No registration required",
  ],
  browserRequirements: "Requires JavaScript and WebSocket support",
  provider: {
    "@type": "Organization",
    name: "Socks5Proxies.com",
    url: siteUrl,
    email: "ops@socks5proxies.com",
    logo: {
      "@type": "ImageObject",
      url: `${siteUrl}/logo.png`,
    },
  },
};

// Organization schema for brand recognition
const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "Organization",
  name: "Socks5Proxies.com",
  url: siteUrl,
  logo: `${siteUrl}/logo.png`,
  email: "ops@socks5proxies.com",
  description:
    "Provider of free online proxy testing tools including bulk proxy checker, IP anonymity scoring, and format converter.",
  sameAs: [
    "https://twitter.com/socks5proxies",
    "https://github.com/socks5proxies",
  ],
  contactPoint: {
    "@type": "ContactPoint",
    email: "ops@socks5proxies.com",
    contactType: "customer support",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={`${heading.variable} ${body.variable} ${mono.variable}`}
    >
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link
          rel="preconnect"
          href="https://fonts.gstatic.com"
          crossOrigin="anonymous"
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(appJsonLd) }}
        />
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{
            __html: JSON.stringify(organizationJsonLd),
          }}
        />
      </head>
      <body>
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:absolute focus:left-4 focus:top-4 focus:z-50 focus:rounded-lg focus:bg-ocean-600 focus:px-4 focus:py-2 focus:text-white focus:outline-none"
        >
          Skip to main content
        </a>
        <Suspense fallback={null}>
          <AnalyticsProvider>
            {children}
            <AnalyticsConsent />
          </AnalyticsProvider>
        </Suspense>
      </body>
    </html>
  );
}
