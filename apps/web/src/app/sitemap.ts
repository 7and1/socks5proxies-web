import type { MetadataRoute } from "next";
import { toolsConfig } from "../config/tools";

export default function sitemap(): MetadataRoute.Sitemap {
  const base = "https://socks5proxies.com";
  const now = new Date();

  // Tool pages - supporting resources
  const toolPages = toolsConfig.map((tool) => ({
    url: `${base}${tool.href}`,
    lastModified: now,
    changeFrequency: "weekly" as const,
    priority: 0.7,
  }));

  // Static content pages
  const contentPages: MetadataRoute.Sitemap = [
    {
      url: base,
      lastModified: now,
      changeFrequency: "daily",
      priority: 1.0,
    },
    {
      url: `${base}/free-proxy-list`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/free-proxy-list/guide`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/socks5-proxy-list`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/http-proxy-list`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/https-proxy-list`,
      lastModified: now,
      changeFrequency: "hourly",
      priority: 0.9,
    },
    {
      url: `${base}/elite-proxy-list`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${base}/anonymous-proxy-list`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.85,
    },
    {
      url: `${base}/tools`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/proxy-comparison`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/docs/guides`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.8,
    },
    {
      url: `${base}/docs/api`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/docs/faq`,
      lastModified: now,
      changeFrequency: "weekly",
      priority: 0.7,
    },
    {
      url: `${base}/blog`,
      lastModified: now,
      changeFrequency: "daily",
      priority: 0.8,
    },
    {
      url: `${base}/privacy`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
    {
      url: `${base}/terms`,
      lastModified: now,
      changeFrequency: "yearly",
      priority: 0.3,
    },
  ];

  // Individual guide pages for deeper indexing
  const guidePages: MetadataRoute.Sitemap = [
    {
      url: `${base}/docs/guides/how-to-check-proxy-quality`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/docs/guides/understanding-proxy-anonymity-levels`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/docs/guides/socks5-vs-http-proxies`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
    {
      url: `${base}/docs/guides/proxy-rotation-strategies`,
      lastModified: now,
      changeFrequency: "monthly",
      priority: 0.7,
    },
  ];

  // Blog post pages
  const blogPosts: MetadataRoute.Sitemap = [
    {
      url: `${base}/blog/proxy-rotation-best-practices-2025`,
      lastModified: new Date("2025-01-02"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/blog/socks5-vs-http-deep-dive`,
      lastModified: new Date("2024-12-28"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/blog/detecting-webrtc-leaks`,
      lastModified: new Date("2024-12-20"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/blog/residential-vs-datacenter-proxies`,
      lastModified: new Date("2024-12-15"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/blog/proxy-anonymity-levels-explained`,
      lastModified: new Date("2024-12-10"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
    {
      url: `${base}/blog/browser-fingerprinting-techniques`,
      lastModified: new Date("2024-12-05"),
      changeFrequency: "yearly",
      priority: 0.6,
    },
  ];

  return [...contentPages, ...toolPages, ...guidePages, ...blogPosts];
}
