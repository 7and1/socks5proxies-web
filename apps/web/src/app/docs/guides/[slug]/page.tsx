import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, BookOpen, Zap, Shield, GitBranch } from "lucide-react";

// Guide data - in production, this would come from a CMS or database
const guides: Record<
  string,
  {
    id: string;
    title: string;
    description: string;
    content: string;
    icon: "Zap" | "Shield" | "GitBranch" | "BookOpen";
    category: string;
    readTime: string;
  }
> = {
  "how-to-check-proxy-quality": {
    id: "how-to-check-proxy-quality",
    title: "How to Check Proxy Quality",
    description:
      "Learn the key metrics for evaluating proxy performance: latency, uptime, anonymity level, and IP reputation.",
    content: `
## Introduction

A quality proxy is essential for reliable operations. This guide covers the key metrics you should evaluate when testing proxies.

## Key Quality Metrics

### 1. Latency (Response Time)

Latency measures how quickly the proxy responds to requests. Lower is better.

**Good**: < 500ms
**Acceptable**: 500ms - 1500ms
**Poor**: > 1500ms

Use our Bulk Checker to measure latency for up to 500 proxies simultaneously.

### 2. Uptime and Reliability

A proxy that frequently goes offline is useless for continuous operations.

**What to measure**:
- Connection success rate
- Average uptime percentage
- Consistency over 24-hour periods

### 3. Anonymity Level

Proxies fall into three anonymity categories:

**Elite (High Anonymous)**
- No proxy headers added
- Target cannot detect proxy usage
- Best for privacy-sensitive operations

**Anonymous**
- Hides your IP but reveals proxy usage
- Via header present
- Suitable for general scraping

**Transparent**
- Exposes your real IP
- Only useful for caching
- Avoid for privacy needs

### 4. IP Reputation

Some IPs are flagged due to previous abuse:

**Check for**:
- Blacklist presence
- CAPTCHA frequency
- Block rates on target sites

## Testing Process

### Step 1: Collect Your Proxies
Gather proxy list in IP:PORT format or with authentication.

### Step 2: Use Bulk Checker
1. Go to our Bulk Proxy Checker
2. Paste up to 500 proxies
3. Select protocol (SOCKS5 or HTTP)
4. Start check

### Step 3: Analyze Results
Export working proxies and sort by:
- Lowest latency
- Highest anonymity
- Geographic location

### Step 4: Monitor Over Time
Proxy quality changes. Set up regular checks to maintain a healthy pool.

## Quality Scoring Formula

We calculate quality scores using:

\`\`\`
Score = (Anonymity × 0.4) + (Speed × 0.3) + (Reliability × 0.3)
\`\`\`

Where:
- Anonymity: Elite = 100, Anonymous = 70, Transparent = 30
- Speed: 100 - (latency_ms / 30), capped at 0-100
- Reliability: Success rate × 100

## Conclusion

Quality proxy testing is an ongoing process. Use our tools to regularly evaluate your proxy pool and maintain optimal performance.
    `,
    icon: "Zap",
    category: "Performance",
    readTime: "5 min",
  },
  "understanding-proxy-anonymity-levels": {
    id: "understanding-proxy-anonymity-levels",
    title: "Understanding Proxy Anonymity Levels",
    description:
      "Elite, Anonymous, Transparent: what each level means for your fingerprint and when to use each type.",
    content: `
## The Three Anonymity Levels

Understanding proxy anonymity levels is crucial for choosing the right proxy for your use case.

## Level 1: Transparent Proxies

### What They Do
Transparent proxies pass your real IP address to the destination server. They make no attempt to hide your identity.

### Headers Added
\`\`\`http
X-Forwarded-For: 203.0.113.50
Via: 1.1 proxy.example.com
\`\`\`

### Use Cases
- **Corporate caching**: Reduce bandwidth by caching common requests
- **Content filtering**: Block access to certain websites
- **Load balancing**: Distribute traffic across servers

### Privacy Impact
**None** - Target servers see your real IP address.

## Level 2: Anonymous Proxies

### What They Do
Anonymous proxies hide your real IP but announce their presence as a proxy.

### Headers Added
\`\`\`http
Via: 1.1 proxy.example.com
\`\`\`

Note: X-Forwarded-For is either absent or contains the proxy's IP.

### Use Cases
- **General privacy**: Hide IP from casual observation
- **Geo-restriction bypass**: Access content from different regions
- **Basic web scraping**: Collect data without revealing your IP

### Privacy Impact
**Moderate** - Your IP is hidden but the server knows you're using a proxy.

## Level 3: Elite (High Anonymous) Proxies

### What They Do
Elite proxies completely hide the fact that you're using a proxy. No proxy-related headers are added.

### Headers Added
\`\`\`http
# None - appears like a regular browser request
\`\`\`

### Use Cases
- **Maximum privacy**: Critical when anonymity is essential
- **Sensitive scraping**: Sites that block known proxy traffic
- **Security testing**: Penetration testing and vulnerability research
- **Purchasing**: Sneaker bots, ticket purchasing, limited drops

### Privacy Impact
**High** - Server cannot distinguish from regular traffic.

## How We Detect Anonymity Levels

Our checker analyzes the response from a judge server:

1. **Compare visible IP**: Does it match your real IP?
2. **Check for proxy headers**: X-Forwarded-For, Via, Proxy-Connection
3. **Analyze request fingerprint**: Other revealing headers

## Anonymity Level Comparison Table

| Feature | Transparent | Anonymous | Elite |
|---------|-------------|-----------|-------|
| Hides IP | No | Yes | Yes |
| Hides proxy use | No | No | Yes |
| Detection difficulty | Easy | Medium | Hard |
| Use for scraping | Poor | Good | Excellent |
| Use for privacy | None | Moderate | High |

## Testing Your Proxy

Use our IP Anonymity Score tool to:
1. Check which headers are exposed
2. Detect WebRTC leaks
3. Identify DNS leaks
4. Get an overall anonymity score

## Recommendations

**For general browsing**: Anonymous proxies are sufficient
**For sensitive operations**: Always use Elite proxies
**For enterprise caching**: Transparent proxies are appropriate

## Conclusion

Match your anonymity requirements to your use case. When in doubt, opt for higher anonymity - the performance difference is usually minimal.
    `,
    icon: "Shield",
    category: "Security",
    readTime: "7 min",
  },
  "socks5-vs-http-proxies": {
    id: "socks5-vs-http-proxies",
    title: "SOCKS5 vs HTTP Proxies",
    description:
      "Deep comparison of protocols: UDP support, authentication, performance, and use case recommendations.",
    content: `
## Protocol Overview

SOCKS5 and HTTP are the two main proxy protocols. Each has distinct advantages depending on your use case.

## HTTP Proxies

### How They Work
HTTP proxies understand and interpret HTTP traffic. They can:
- Read and modify HTTP headers
- Cache responses
- Filter content based on URL or content

### Advantages
1. **Easy setup**: Widely supported by browsers and applications
2. **Content inspection**: Can cache and filter traffic
3. **CONNECT method**: Supports HTTPS tunneling
4. **Header manipulation**: Can add/remove/modify headers

### Limitations
1. **HTTP only**: Cannot proxy non-HTTP traffic (natively)
2. **Higher overhead**: Parses and potentially modifies each request
3. **No UDP**: Only supports TCP connections

### Best For
- Web scraping
- Browser-based applications
- Content caching
- Traffic inspection/logging

## SOCKS5 Proxies

### How They Work
SOCKS5 operates at a lower level, forwarding raw TCP/UDP packets without understanding the application protocol.

### Advantages
1. **Protocol agnostic**: Works with any TCP or UDP traffic
2. **UDP support**: Essential for DNS, gaming, VoIP
3. **Lower overhead**: No protocol parsing
4. **Better performance**: Less processing per packet
5. **Authentication**: Built-in username/password auth

### Limitations
1. **No caching**: Cannot cache responses
2. **No content filtering**: Cannot inspect payload
3. **Slightly more complex setup**: Some apps need configuration

### Best For
- Gaming
- VoIP applications
- P2P file sharing
- Any non-HTTP traffic
- Performance-critical applications

## Technical Comparison

### Connection Flow

**HTTP Proxy:**
\`\`\`
Client → HTTP CONNECT → Proxy → TCP → Target
         (HTTP parsed)
\`\`\`

**SOCKS5 Proxy:**
\`\`\`
Client → SOCKS5 handshake → Proxy → TCP/UDP → Target
         (bytes forwarded as-is)
\`\`\`

### Header Handling

| Aspect | HTTP | SOCKS5 |
|--------|------|--------|
| Can read headers | Yes | No |
| Can modify headers | Yes | No |
| Adds proxy headers | Sometimes | Never |
| Detectable | Often | Rarely |

### Performance Metrics

| Metric | HTTP | SOCKS5 |
|--------|------|--------|
| Connection overhead | Higher | Lower |
| Throughput | Moderate | Higher |
| Latency | +5-20ms | +1-5ms |
| Memory usage | Higher | Lower |

## Authentication

### HTTP Proxy Auth
Uses HTTP headers:
\`\`\`http
Proxy-Authorization: Basic base64(user:pass)
\`\`\`

### SOCKS5 Auth
Built into protocol:
\`\`\`
# During handshake
Username/Password method (0x02)
\`\`\`

## When to Choose What

### Choose HTTP When:
- Building web scrapers
- Need content caching
- Working with browser automation
- Require header manipulation

### Choose SOCKS5 When:
- Maximum performance needed
- Non-HTTP protocols (games, P2P)
- UDP traffic required
- Stealth is important (no proxy headers)

## Hybrid Approach

Many operations benefit from both:
- SOCKS5 for the transport layer
- Application-level HTTP handling

Our Bulk Checker supports both protocols - test your proxies regardless of type.

## Conclusion

SOCKS5 excels in performance and versatility. HTTP proxies offer better control over web traffic. Choose based on your specific requirements.
    `,
    icon: "GitBranch",
    category: "Comparison",
    readTime: "6 min",
  },
  "proxy-rotation-strategies": {
    id: "proxy-rotation-strategies",
    title: "Proxy Rotation Strategies",
    description:
      "How to implement sticky sessions, random rotation, and header-based routing for large-scale operations.",
    content: `
## Why Rotation Matters

Websites detect and block IPs that make too many requests. Rotation distributes your traffic across multiple IPs, avoiding detection.

## Rotation Strategies

### 1. Random Rotation

The simplest approach: pick a random proxy for each request.

**Pros:**
- Maximum distribution
- Simple implementation
- Good for stateless requests

**Cons:**
- Can't maintain sessions
- Inconsistent geographic location
- May trigger anti-bot systems

**When to use:**
- Simple data collection
- No login required
- High-volume, low-value requests

### 2. Sticky Sessions

Keep the same proxy for a series of related requests.

**Implementation:**
\`\`\`python
# Pseudo-code
session_proxies = {}

def get_proxy(session_id):
    if session_id not in session_proxies:
        session_proxies[session_id] = random.choice(proxy_pool)
    return session_proxies[session_id]
\`\`\`

**When to use:**
- Login flows
- Shopping carts
- Multi-page forms
- Maintaining cookies

### 3. Round-Robin Rotation

Cycle through proxies in order, ensuring even distribution.

**Pros:**
- Predictable distribution
- All proxies get equal use
- Easy to implement

**Cons:**
- Patterns may be detectable
- No preference for faster proxies

**When to use:**
- Need even distribution
- Testing proxy pool health
- Moderate-scale operations

### 4. Weighted Rotation

Prioritize better-performing proxies.

**Implementation:**
\`\`\`python
# Pseudo-code
weights = calculate_weights(proxy_metrics)
selected = random.choices(proxy_pool, weights=weights)[0]
\`\`\`

**Factors for weighting:**
- Response time
- Success rate
- Time since last use
- Geographic location

### 5. Backoff Rotation

Rotate when a proxy shows signs of blocking.

**Triggers:**
- HTTP 429 (Rate Limited)
- CAPTCHA detection
- Unusual response times
- Connection failures

**Implementation:**
\`\`\`python
# Pseudo-code
def on_failure(proxy):
    proxy.failures += 1
    proxy.cooldown_until = now() + backoff_time(proxy.failures)
    return get_fresh_proxy()
\`\`\`

## Best Practices

### Pool Size Guidelines

| Operation Scale | Minimum Pool Size |
|-----------------|-------------------|
| Light (< 1k/day) | 10 proxies |
| Medium (1k-10k/day) | 50 proxies |
| Heavy (10k-100k/day) | 200 proxies |
| Enterprise (100k+/day) | 500+ proxies |

### Health Monitoring

1. **Regular health checks**: Test all proxies every 15-30 minutes
2. **Remove dead proxies**: Auto-remove after 3 consecutive failures
3. **Track metrics**: Log latency, success rate, blocks per proxy

### Geographic Considerations

- Match proxy location to target site expectations
- Use local proxies for geo-restricted content
- Maintain location consistency during sessions

## Advanced Techniques

### 1. Fingerprint Rotation

Rotate more than just IP:
- User-Agent strings
- Browser fingerprints
- Request timing patterns

### 2. Time-Based Rotation

Vary rotation based on time:
- Slower rotation during off-peak hours
- Faster rotation when blocks increase

### 3. Request Pattern Analysis

Analyze your request patterns:
- Detect when blocks are likely
- Pre-emptively rotate before limits

## Measuring Success

Key metrics to track:
- **Success rate**: Target > 95%
- **Block rate**: Target < 5%
- **Latency**: Monitor for degradation
- **Cost per successful request**: Optimize for efficiency

## Conclusion

The right rotation strategy depends on your specific needs. Start simple, measure results, and iterate. Use our Bulk Checker to maintain a healthy proxy pool.
    `,
    icon: "BookOpen",
    category: "Advanced",
    readTime: "8 min",
  },
};

const iconMap = {
  Zap: Zap,
  Shield: Shield,
  GitBranch: GitBranch,
  BookOpen: BookOpen,
};

export async function generateStaticParams() {
  return Object.keys(guides).map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const guide = guides[slug];
  if (!guide) return {};

  return {
    title: guide.title,
    description: guide.description,
    keywords: [
      guide.category.toLowerCase(),
      "proxy guide",
      "socks5 tutorial",
      ...guide.title.toLowerCase().split(" "),
    ],
    alternates: {
      canonical: `https://socks5proxies.com/docs/guides/${guide.id}`,
    },
    openGraph: {
      title: guide.title,
      description: guide.description,
      type: "article",
      url: `https://socks5proxies.com/docs/guides/${guide.id}`,
    },
    twitter: {
      card: "summary_large_image",
      title: guide.title,
      description: guide.description,
    },
  };
}

export default async function GuidePage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const guide = guides[slug];
  if (!guide) notFound();

  const Icon = iconMap[guide.icon];

  const articleJsonLd = {
    "@context": "https://schema.org",
    "@type": "TechArticle",
    headline: guide.title,
    description: guide.description,
    author: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    publisher: {
      "@type": "Organization",
      name: "Socks5Proxies.com",
      url: "https://socks5proxies.com",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://socks5proxies.com/docs/guides/${guide.id}`,
    },
  };

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
        name: "Documentation",
        item: "https://socks5proxies.com/docs",
      },
      {
        "@type": "ListItem",
        position: 3,
        name: "Guides",
        item: "https://socks5proxies.com/docs/guides",
      },
      {
        "@type": "ListItem",
        position: 4,
        name: guide.title,
        item: `https://socks5proxies.com/docs/guides/${guide.id}`,
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(articleJsonLd) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbJsonLd) }}
      />

      <article className="mx-auto max-w-3xl space-y-8">
        <div className="space-y-4">
          <Link
            href="/docs/guides"
            className="inline-flex items-center gap-1 text-sm text-ink-muted hover:text-ink transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Guides
          </Link>

          <div className="flex items-start gap-4">
            <div className="rounded-full bg-sand-100 p-3">
              <Icon className="h-6 w-6 text-sand-600" />
            </div>
            <div className="flex-1">
              <span className="inline-block rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-sand-700">
                {guide.category}
              </span>
              <h1 className="mt-2 text-3xl font-bold leading-tight">
                {guide.title}
              </h1>
              <p className="mt-2 text-lg text-ink-muted">{guide.description}</p>
              <p className="mt-2 text-sm text-ink-muted">
                {guide.readTime} read
              </p>
            </div>
          </div>
        </div>

        <div className="prose prose-sand max-w-none">
          {guide.content.split("\n").map((paragraph, i) => {
            if (paragraph.startsWith("## ")) {
              return (
                <h2 key={i} className="mt-8 text-2xl font-semibold">
                  {paragraph.replace("## ", "")}
                </h2>
              );
            }
            if (paragraph.startsWith("### ")) {
              return (
                <h3 key={i} className="mt-6 text-xl font-semibold">
                  {paragraph.replace("### ", "")}
                </h3>
              );
            }
            if (paragraph.startsWith("- ") || paragraph.startsWith("* ")) {
              return (
                <li key={i} className="ml-4">
                  {paragraph.replace(/^[-*] /, "")}
                </li>
              );
            }
            if (paragraph.match(/^\d+\. /)) {
              return (
                <li key={i} className="ml-4 list-decimal">
                  {paragraph.replace(/^\d+\. /, "")}
                </li>
              );
            }
            if (paragraph.startsWith("```") || paragraph.startsWith("|")) {
              return null;
            }
            if (paragraph.startsWith("**") && paragraph.endsWith("**")) {
              return (
                <p key={i} className="mt-4 font-semibold">
                  {paragraph.replace(/\*\*/g, "")}
                </p>
              );
            }
            if (paragraph.trim() === "") {
              return null;
            }
            return (
              <p key={i} className="mt-4 text-ink-muted">
                {paragraph}
              </p>
            );
          })}
        </div>

        <div className="border-t border-sand-200 pt-8">
          <h3 className="text-lg font-semibold">Try Our Tools</h3>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              href="/tools/bulk-checker"
              className="rounded-full bg-sand-100 px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-200 transition"
            >
              Bulk Proxy Checker
            </Link>
            <Link
              href="/tools/ip-score"
              className="rounded-full bg-sand-100 px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-200 transition"
            >
              IP Anonymity Score
            </Link>
            <Link
              href="/tools/converter"
              className="rounded-full bg-sand-100 px-4 py-2 text-sm font-medium text-sand-700 hover:bg-sand-200 transition"
            >
              Format Converter
            </Link>
          </div>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-sand-50 p-6">
          <h3 className="text-lg font-semibold">Need More Help?</h3>
          <p className="mt-2 text-sm text-ink-muted">
            Check out our other guides or contact us at ops@socks5proxies.com
            for custom integration guidance.
          </p>
          <Link
            href="/docs/guides"
            className="mt-4 inline-flex items-center gap-1 text-sm font-medium text-sand-600 hover:text-sand-700"
          >
            View All Guides
            <ArrowLeft className="h-4 w-4 rotate-180" />
          </Link>
        </div>
      </article>
    </>
  );
}
