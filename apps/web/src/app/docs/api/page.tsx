import type { Metadata } from "next";
import { Code, Terminal, Zap, Shield } from "lucide-react";

export const metadata: Metadata = {
  title: "Proxy Checker API Documentation - REST & WebSocket Endpoints",
  description:
    "REST API for bulk proxy checking, IP anonymity scoring, and format conversion. Includes WebSocket for real-time streaming results. Code examples in cURL, Python, and Node.js.",
  keywords: [
    "proxy api",
    "proxy checker api",
    "bulk proxy check api",
    "rest api proxy",
    "websocket proxy api",
    "proxy testing api",
  ],
  alternates: {
    canonical: "https://socks5proxies.com/docs/api",
  },
  openGraph: {
    title: "Proxy Checker API Documentation",
    description:
      "REST API for proxy checking with WebSocket streaming. Code examples in cURL, Python, and Node.js.",
    url: "https://socks5proxies.com/docs/api",
    type: "website",
  },
};

const endpoints = [
  {
    method: "POST",
    path: "/api/check",
    description:
      "Bulk check proxies for status (alive/dead), response latency, anonymity level (elite/anonymous/transparent), and geographic location",
    rateLimit: "100 requests/minute",
    params: "proxies[], timeout, protocol",
  },
  {
    method: "GET",
    path: "/api/score/:ip",
    description:
      "Get comprehensive IP anonymity analysis including WebRTC leak risk, header exposure score, and IP reputation data",
    rateLimit: "60 requests/minute",
    params: "ip (path parameter)",
  },
  {
    method: "POST",
    path: "/api/convert",
    description:
      "Transform proxy lists between formats: JSON for APIs, Clash config for proxy clients, cURL for shell scripts",
    rateLimit: "50 requests/minute",
    params: "proxies[], format (json|clash|curl)",
  },
  {
    method: "WebSocket",
    path: "/ws/check",
    description:
      "Stream real-time results as each proxy check completes. Ideal for large batch operations with live progress updates",
    rateLimit: "10 concurrent connections",
    params: "proxies[], timeout",
  },
];

const proxyListEndpoints = [
  {
    method: "GET",
    path: "/api/proxies",
    description:
      "Public proxy list with filters for country, protocol, port, anonymity, city, region, and ASN",
    rateLimit: "Rate limited per IP",
    params:
      "country, protocol, port, anonymity, city, region, asn, limit, offset",
  },
  {
    method: "GET",
    path: "/api/v1/proxies",
    description:
      "Authenticated proxy list endpoint for higher-volume access (Bearer API key required)",
    rateLimit: "Per API key per hour",
    params:
      "country, protocol, port, anonymity, city, region, asn, limit, offset",
  },
  {
    method: "GET",
    path: "/api/asn/:asn",
    description:
      "ASN details including proxy count, avg delay, protocol breakdown, and top countries",
    rateLimit: "Cached, fast responses",
    params: "asn (path parameter)",
  },
  {
    method: "GET",
    path: "/api/facets/countries",
    description: "Facet counts for countries",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
  {
    method: "GET",
    path: "/api/facets/ports",
    description: "Facet counts for ports",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
  {
    method: "GET",
    path: "/api/facets/protocols",
    description: "Facet counts for protocols",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
  {
    method: "GET",
    path: "/api/facets/cities",
    description: "Facet counts for cities",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
  {
    method: "GET",
    path: "/api/facets/regions",
    description: "Facet counts for regions",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
  {
    method: "GET",
    path: "/api/facets/asns",
    description: "Facet counts for ASNs",
    rateLimit: "Cached, fast responses",
    params: "limit, offset",
  },
];

const codeExamples = {
  curl: `curl -X POST https://socks5proxies.com/api/check \\
  -H "Content-Type: application/json" \\
  -d '{
    "proxies": ["103.152.112.120:1080", "185.162.231.166:1080"],
    "timeout": 5000
  }'`,

  proxyList: `curl "https://socks5proxies.com/api/proxies?country=US&protocol=socks5&limit=25"`,

  proxyListAuth: `curl "https://socks5proxies.com/api/v1/proxies?limit=50" \\
  -H "Authorization: Bearer YOUR_API_KEY"`,

  proxyListAsn: `curl "https://socks5proxies.com/api/asn/174"`,

  python: `import requests

response = requests.post(
    "https://socks5proxies.com/api/check",
    json={
        "proxies": ["103.152.112.120:1080", "185.162.231.166:1080"],
        "timeout": 5000
    }
)
results = response.json()`,

  nodejs: `const response = await fetch('https://socks5proxies.com/api/check', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    proxies: ['103.152.112.120:1080', '185.162.231.166:1080'],
    timeout: 5000
  })
});
const results = await response.json();`,
};

function CodeBlock({
  children,
  language,
}: {
  children: string;
  language: string;
}) {
  return (
    <div className="relative rounded-2xl bg-sand-900 p-4">
      <span className="absolute right-3 top-3 text-xs text-sand-400">
        {language}
      </span>
      <pre className="overflow-x-auto text-sm text-sand-100">
        <code>{children}</code>
      </pre>
    </div>
  );
}

export default function ApiDocsPage() {
  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-3xl font-semibold">API Documentation</h1>
        <p className="mt-2 text-ink-muted">
          REST endpoints and WebSocket for proxy checking, IP scoring, and
          format conversion.
        </p>
      </div>

      <section className="grid gap-6 md:grid-cols-2">
        <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
          <div className="flex items-center gap-3">
            <Zap className="h-8 w-8 text-sand-600" />
            <div>
              <h2 className="text-lg font-semibold">Quick Start</h2>
              <p className="text-sm text-ink-muted">
                Start checking proxies in seconds
              </p>
            </div>
          </div>
          <CodeBlock language="bash">
            {`curl https://socks5proxies.com/api/check \\
  -X POST -H "Content-Type: application/json" \\
  -d '{"proxies": ["IP:PORT"], "timeout": 5000}'`}
          </CodeBlock>
        </div>

        <div className="rounded-3xl border border-sand-200 bg-white/80 p-6">
          <div className="flex items-center gap-3">
            <Shield className="h-8 w-8 text-sand-600" />
            <div>
              <h2 className="text-lg font-semibold">Authentication</h2>
              <p className="text-sm text-ink-muted">
                API keys for high-volume proxy list access
              </p>
            </div>
          </div>
          <p className="mt-4 text-sm text-ink-muted">
            Public endpoints are rate limited per IP. Use{" "}
            <code className="font-mono">Authorization: Bearer &lt;key&gt;</code>{" "}
            on <code className="font-mono">/api/v1/proxies</code> for higher
            limits. Contact ops@socks5proxies.com for API keys.
          </p>
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Endpoints</h2>
        <div className="mt-4 space-y-3">
          {endpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="rounded-2xl border border-sand-200 bg-sand-50 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    endpoint.method === "GET"
                      ? "bg-green-100 text-green-700"
                      : endpoint.method === "POST"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-purple-100 text-purple-700"
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-ink">
                  {endpoint.path}
                </code>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {endpoint.description}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Rate limit: {endpoint.rateLimit}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Proxy List API</h2>
        <div className="mt-4 space-y-3">
          {proxyListEndpoints.map((endpoint) => (
            <div
              key={endpoint.path}
              className="rounded-2xl border border-sand-200 bg-sand-50 p-4"
            >
              <div className="flex items-center gap-3">
                <span
                  className={`rounded-full px-3 py-1 text-xs font-semibold ${
                    endpoint.method === "GET"
                      ? "bg-green-100 text-green-700"
                      : "bg-blue-100 text-blue-700"
                  }`}
                >
                  {endpoint.method}
                </span>
                <code className="text-sm font-mono text-ink">
                  {endpoint.path}
                </code>
              </div>
              <p className="mt-2 text-sm text-ink-muted">
                {endpoint.description}
              </p>
              <p className="mt-1 text-xs text-ink-muted">
                Rate limit: {endpoint.rateLimit}
              </p>
            </div>
          ))}
        </div>
      </section>

      <section>
        <h2 className="text-xl font-semibold">Code Examples</h2>

        <div className="mt-4 space-y-6">
          <div>
            <h3 className="font-semibold">cURL</h3>
            <CodeBlock language="bash">{codeExamples.curl}</CodeBlock>
          </div>
          <div>
            <h3 className="font-semibold">Proxy List (Public)</h3>
            <CodeBlock language="bash">{codeExamples.proxyList}</CodeBlock>
          </div>
          <div>
            <h3 className="font-semibold">Proxy List (API Key)</h3>
            <CodeBlock language="bash">{codeExamples.proxyListAuth}</CodeBlock>
          </div>
          <div>
            <h3 className="font-semibold">ASN Details</h3>
            <CodeBlock language="bash">{codeExamples.proxyListAsn}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold">Python</h3>
            <CodeBlock language="python">{codeExamples.python}</CodeBlock>
          </div>

          <div>
            <h3 className="font-semibold">Node.js</h3>
            <CodeBlock language="javascript">{codeExamples.nodejs}</CodeBlock>
          </div>
        </div>
      </section>

      <section className="rounded-3xl border border-sand-200 bg-sand-50 p-6">
        <h2 className="text-lg font-semibold">Response Format</h2>
        <CodeBlock language="json">{`{
  "success": true,
  "results": [
    {
      "proxy": "103.152.112.120:1080",
      "status": "alive",
      "latency": 245,
      "anonymity": "elite",
      "country": "US",
      "ip_score": 85
    }
  ],
  "checked_at": "2025-01-06T12:00:00Z"
}`}</CodeBlock>
      </section>
    </div>
  );
}
