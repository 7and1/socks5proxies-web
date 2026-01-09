import { Activity, ShieldCheck, RefreshCw } from "lucide-react";
import { affiliateLinks } from "./affiliates";

export const toolsConfig = [
  {
    id: "bulk-checker",
    title: "Bulk Proxy Checker",
    description:
      "Validate 500 proxies simultaneously with WebSocket streaming. Get latency, uptime, and anonymity level for each proxy in real time.",
    href: "/tools/bulk-checker",
    icon: Activity,
    status: "active" as const,
    relatedAffiliate: {
      provider: "Smartproxy",
      url: affiliateLinks.smartproxy,
      fallback: affiliateLinks.iproyal,
    },
  },
  {
    id: "ip-score",
    title: "IP Anonymity Score",
    description:
      "Expose WebRTC leaks, proxy-revealing headers, and browser fingerprint mismatches before they compromise your operations.",
    href: "/tools/ip-score",
    icon: ShieldCheck,
    status: "active" as const,
    relatedAffiliate: {
      provider: "Bright Data",
      url: affiliateLinks.brightdata,
      fallback: affiliateLinks.oxylabs,
    },
  },
  {
    id: "converter",
    title: "Proxy Format Converter",
    description:
      "Transform proxy lists to JSON, Clash, or cURL formats instantly. 100% client-side processing - your data never leaves the browser.",
    href: "/tools/converter",
    icon: RefreshCw,
    status: "beta" as const,
    relatedAffiliate: {
      provider: "IPRoyal",
      url: affiliateLinks.iproyal,
      fallback: affiliateLinks.proxySeller,
    },
  },
];
