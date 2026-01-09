"use client";

import { useAnalytics } from "./AnalyticsProvider";
import { MouseEvent, ReactNode } from "react";

interface AnalyticsLinkProps {
  href: string;
  provider: string;
  placement: string;
  proxyQuality?: string;
  children: ReactNode;
  className?: string;
  target?: string;
}

export function AnalyticsLink({
  href,
  provider,
  placement,
  proxyQuality,
  children,
  className,
  target = "_blank",
}: AnalyticsLinkProps) {
  const { trackAffiliateClick } = useAnalytics();

  const handleClick = (e: MouseEvent<HTMLAnchorElement>) => {
    trackAffiliateClick({
      provider,
      placement,
      proxy_quality: proxyQuality,
    });
  };

  return (
    <a
      href={href}
      className={className}
      target={target}
      rel="noopener noreferrer"
      onClick={handleClick}
    >
      {children}
    </a>
  );
}
