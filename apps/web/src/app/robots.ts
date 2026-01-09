import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: ["/api/", "/new-tool-template", "/_next/", "/*/page/*"],
        crawlDelay: 1,
      },
      {
        userAgent: "Googlebot",
        allow: "/",
        disallow: ["/api/", "/new-tool-template", "/_next/", "/*/page/*"],
      },
      {
        userAgent: "Bingbot",
        allow: "/",
        disallow: ["/api/", "/new-tool-template", "/_next/", "/*/page/*"],
        crawlDelay: 2,
      },
    ],
    sitemap: "https://socks5proxies.com/sitemap-proxies-index.xml",
    host: "https://socks5proxies.com",
  };
}
