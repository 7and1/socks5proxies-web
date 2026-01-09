import type { Metadata } from "next";
import Link from "next/link";
import { Calendar, Tag, TrendingUp } from "lucide-react";

export const metadata: Metadata = {
  title: "Proxy Blog - SOCKS5 Tutorials, Tips & Industry News",
  description:
    "Latest articles on proxy technology, SOCKS5 best practices, WebRTC leak prevention, residential vs datacenter comparison, and proxy rotation strategies. Expert insights for proxy operators.",
  keywords: [
    "proxy blog",
    "socks5 tutorials",
    "proxy tips",
    "proxy news",
    "web scraping guides",
    "proxy rotation tutorial",
    "webrtc leak prevention",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/blog",
  },
  openGraph: {
    title: "Proxy Blog - SOCKS5 Tutorials & Industry News",
    description:
      "Expert articles on proxy technology, anonymity techniques, and best practices for proxy operators.",
    url: "https://socks5proxies.com/blog",
    type: "website",
  },
};

const categories = [
  { id: "all", name: "All Posts", count: 12 },
  { id: "tutorials", name: "Tutorials", count: 5 },
  { id: "comparison", name: "Comparisons", count: 3 },
  { id: "news", name: "Industry News", count: 4 },
];

const posts = [
  {
    id: "proxy-rotation-best-practices-2025",
    title: "Proxy Rotation Best Practices for 2025",
    excerpt:
      "Learn how to implement sticky sessions, random rotation, and header-based routing for large-scale scraping operations.",
    category: "tutorials",
    date: "2025-01-02",
    readTime: "8 min read",
    featured: true,
  },
  {
    id: "socks5-vs-http-deep-dive",
    title: "SOCKS5 vs HTTP Proxies: A Deep Dive",
    excerpt:
      "Understand the technical differences, use cases, and performance characteristics of each protocol.",
    category: "comparison",
    date: "2024-12-28",
    readTime: "6 min read",
    featured: true,
  },
  {
    id: "detecting-webrtc-leaks",
    title: "Detecting and Preventing WebRTC Leaks",
    excerpt:
      "WebRTC can expose your real IP even when using a proxy. Learn how to detect and fix these leaks.",
    category: "tutorials",
    date: "2024-12-20",
    readTime: "5 min read",
    featured: false,
  },
  {
    id: "residential-vs-datacenter-proxies",
    title: "Residential vs Datacenter Proxies: Which to Choose",
    excerpt:
      "Compare cost, performance, and detection rates across different proxy types for your use case.",
    category: "comparison",
    date: "2024-12-15",
    readTime: "7 min read",
    featured: false,
  },
  {
    id: "proxy-anonymity-levels-explained",
    title: "Proxy Anonymity Levels Explained",
    excerpt:
      "Elite, Anonymous, Transparent: what each level means and how to test your proxy's anonymity.",
    category: "tutorials",
    date: "2024-12-10",
    readTime: "4 min read",
    featured: false,
  },
  {
    id: "browser-fingerprinting-techniques",
    title: "Browser Fingerprinting: Beyond IP Address",
    excerpt:
      "Modern tracking uses canvas, fonts, and WebGL. Learn how to minimize your fingerprint.",
    category: "tutorials",
    date: "2024-12-05",
    readTime: "9 min read",
    featured: false,
  },
];

const categoryColors: Record<string, string> = {
  tutorials: "bg-blue-100 text-blue-700",
  comparison: "bg-purple-100 text-purple-700",
  news: "bg-green-100 text-green-700",
};

function PostCard({ post }: { post: (typeof posts)[0] }) {
  return (
    <Link
      href={`/blog/${post.id}`}
      className="group block rounded-3xl border border-sand-200 bg-white/80 p-6 transition hover:border-sand-400 hover:shadow-lg"
    >
      {post.featured && (
        <span className="mb-3 inline-flex items-center gap-1 rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-700">
          <TrendingUp className="h-3 w-3" />
          Featured
        </span>
      )}
      <span
        className={`inline-block rounded-full px-3 py-1 text-xs font-semibold ${categoryColors[post.category]}`}
      >
        {post.category}
      </span>
      <h3 className="mt-3 text-lg font-semibold group-hover:text-sand-700">
        {post.title}
      </h3>
      <p className="mt-2 text-sm text-ink-muted">{post.excerpt}</p>
      <div className="mt-4 flex items-center gap-4 text-xs text-ink-muted">
        <span className="flex items-center gap-1">
          <Calendar className="h-3 w-3" />
          {new Date(post.date).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
          })}
        </span>
        <span>{post.readTime}</span>
      </div>
    </Link>
  );
}

export default function BlogPage() {
  const featuredPosts = posts.filter((p) => p.featured);
  const regularPosts = posts.filter((p) => !p.featured);

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">Blog</h1>
        <p className="mt-2 text-ink-muted">
          Insights, tutorials, and news on proxy technology and web scraping.
        </p>
      </div>

      <section>
        <h2 className="text-lg font-semibold">Categories</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          {categories.map((cat) => (
            <button
              key={cat.id}
              className="rounded-full border border-sand-300 bg-white px-4 py-2 text-sm transition hover:border-sand-500 hover:bg-sand-50"
            >
              {cat.name} ({cat.count})
            </button>
          ))}
        </div>
      </section>

      {featuredPosts.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold">Featured Posts</h2>
          <div className="mt-4 grid gap-6 md:grid-cols-2">
            {featuredPosts.map((post) => (
              <PostCard key={post.id} post={post} />
            ))}
          </div>
        </section>
      )}

      <section>
        <h2 className="text-lg font-semibold">Latest Posts</h2>
        <div className="mt-4 grid gap-6 md:grid-cols-3">
          {regularPosts.map((post) => (
            <PostCard key={post.id} post={post} />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6">
        <h2 className="text-lg font-semibold">Subscribe to Updates</h2>
        <p className="mt-2 text-sm text-ink-muted">
          Get the latest proxy insights and tutorials delivered to your inbox.
          No spam, just signal.
        </p>
        <div className="mt-4 flex flex-wrap gap-3 sm:flex-nowrap">
          <input
            type="email"
            placeholder="ops@socks5proxies.com"
            className="flex-1 rounded-full border border-sand-300 bg-white px-4 py-2 text-sm focus:border-sand-500 focus:outline-none"
          />
          <button className="rounded-full bg-sand-600 px-6 py-2 text-sm font-semibold text-white transition hover:bg-sand-500">
            Subscribe
          </button>
        </div>
      </section>
    </div>
  );
}
