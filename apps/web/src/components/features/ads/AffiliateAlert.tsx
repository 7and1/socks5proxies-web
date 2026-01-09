"use client";

import { AlertTriangle, ExternalLink } from "lucide-react";
import { AnalyticsLink } from "../../analytics";
import {
  affiliateLinks,
  type AffiliateProvider,
} from "../../../config/affiliates";

interface AffiliateAlertProps {
  title: string;
  cta: string;
  link?: string;
  provider?: AffiliateProvider;
  placement?: string;
  proxyQuality?: string;
}

export function AffiliateAlert({
  title,
  cta,
  link,
  provider,
  placement = "unknown",
  proxyQuality,
}: AffiliateAlertProps) {
  const affiliateUrl = provider ? affiliateLinks[provider] : link;

  if (!affiliateUrl) {
    return null;
  }

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-sand-300 bg-sand-100 p-4 text-sm">
      <div className="flex items-center gap-3 text-sand-800">
        <AlertTriangle className="h-5 w-5 text-sand-600" />
        <span className="font-semibold">{title}</span>
      </div>
      <AnalyticsLink
        href={affiliateUrl}
        provider={provider || "unknown"}
        placement={placement}
        proxyQuality={proxyQuality}
        className="inline-flex items-center gap-1 rounded-full bg-sand-600 px-4 py-2 text-xs font-semibold text-white shadow-lg shadow-sand-600/30 transition hover:-translate-y-0.5 hover:bg-sand-500"
      >
        {cta}
        <ExternalLink className="h-3 w-3" />
      </AnalyticsLink>
    </div>
  );
}
