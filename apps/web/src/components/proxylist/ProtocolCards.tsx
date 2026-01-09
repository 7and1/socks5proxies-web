import Link from "next/link";
import type { FacetItem } from "../../types/proxy";

interface ProtocolCardsProps {
  protocols: FacetItem[];
}

const protocolMeta: Record<
  string,
  { label: string; href: string; description: string }
> = {
  socks5: {
    label: "SOCKS5",
    href: "/socks5-proxy-list",
    description: "Full TCP support for high-trust sessions.",
  },
  http: {
    label: "HTTP",
    href: "/http-proxy-list",
    description: "Lightweight proxies for web requests.",
  },
  https: {
    label: "HTTPS",
    href: "/https-proxy-list",
    description: "Encrypted HTTP proxies for secure browsing.",
  },
  socks4: {
    label: "SOCKS4",
    href: "/free-proxy-list/protocol/socks4",
    description: "Legacy sockets for compatibility.",
  },
};

export function ProtocolCards({ protocols }: ProtocolCardsProps) {
  const list = protocols.length > 0 ? protocols : [];

  return (
    <div className="grid gap-4 md:grid-cols-4">
      {list.map((protocol) => {
        const meta = protocolMeta[protocol.key] || {
          label: protocol.key.toUpperCase(),
          href: `/free-proxy-list/protocol/${protocol.key}`,
          description: "Browse proxies by protocol.",
        };
        return (
          <Link
            key={protocol.key}
            href={meta.href}
            className="group rounded-2xl border border-sand-200 bg-white/80 p-4 shadow-sm transition hover:-translate-y-0.5 hover:border-ocean-200 hover:shadow-md dark:border-sand-700 dark:bg-sand-900/70"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-ocean-600">
              {meta.label}
            </p>
            <p className="mt-2 text-sm font-semibold">
              {protocol.count.toLocaleString()} proxies
            </p>
            <p className="mt-2 text-xs text-ink-muted dark:text-sand-400">
              {meta.description}
            </p>
          </Link>
        );
      })}
    </div>
  );
}
