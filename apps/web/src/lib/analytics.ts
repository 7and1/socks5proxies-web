// Privacy-friendly analytics using Umami
// No IP storage, GDPR compliant, cookie-less tracking

export interface AnalyticsEvent {
  name: string;
  properties?: Record<string, string | number | boolean | undefined>;
}

// Tool Usage Events
export type ScanStartedEvent = {
  proxy_count: number;
  source_page: string;
  protocol: string;
};

export type ScanCompletedEvent = {
  duration: number;
  alive_count: number;
  dead_count: number;
  avg_latency: number;
};

export type ScanFailedEvent = {
  error_type: string;
};

// Conversion Events
export type AffiliateClickEvent = {
  provider: string;
  placement: string;
  proxy_quality?: string;
};

export type ExportTriggeredEvent = {
  format: string;
  result_count: number;
};

// Engagement Events
export type PageViewEvent = {
  page: string;
  referrer?: string;
};

export type ToolSwitchEvent = {
  from_tool: string;
  to_tool: string;
};

// Umami configuration
const UMAMI_WEBSITE_ID =
  process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "socks5proxies";
const UMAMI_SRC = "https://umami.expertbeacon.com/script.js";

// Check if analytics is enabled (respects user preference)
function isAnalyticsEnabled(): boolean {
  if (typeof window === "undefined") return false;
  const consent = localStorage.getItem("analytics-consent");
  return consent !== "false"; // Default to enabled unless explicitly disabled
}

// Track page view
export function trackPageView(url: string, referrer?: string): void {
  if (!isAnalyticsEnabled()) return;

  if (typeof window !== "undefined" && (window as any).umami) {
    (window as any).umami.track("pageview", {
      page: url,
      referrer: referrer || document.referrer,
    });
  }
}

// Track custom event
export function trackEvent(
  name: string,
  properties?: Record<string, string | number | boolean | undefined>,
): void {
  if (!isAnalyticsEnabled()) return;

  if (typeof window !== "undefined" && (window as any).umami) {
    (window as any).umami.track(name, properties || {});
  }
}

// Tool Usage Events
export function trackScanStarted(data: ScanStartedEvent): void {
  trackEvent("scan_started", data);
}

export function trackScanCompleted(data: ScanCompletedEvent): void {
  trackEvent("scan_completed", data);
}

export function trackScanFailed(data: ScanFailedEvent): void {
  trackEvent("scan_failed", data);
}

// Conversion Events
export function trackAffiliateClick(data: AffiliateClickEvent): void {
  trackEvent("affiliate_click", data);
}

export function trackExportTriggered(data: ExportTriggeredEvent): void {
  trackEvent("export_triggered", data);
}

// Engagement Events
export function trackPageViewEvent(data: PageViewEvent): void {
  trackEvent("page_view", data);
}

export function trackToolSwitch(data: ToolSwitchEvent): void {
  trackEvent("tool_switch", data);
}

// Consent management
export function setAnalyticsConsent(enabled: boolean): void {
  if (typeof window !== "undefined") {
    localStorage.setItem("analytics-consent", enabled ? "true" : "false");
  }
}

export function getAnalyticsConsent(): boolean {
  return isAnalyticsEnabled();
}

// Get Umami script configuration
export function getUmamiConfig(): { src: string; websiteId: string } | null {
  if (typeof window !== "undefined" && !isAnalyticsEnabled()) {
    return null;
  }
  return {
    src: UMAMI_SRC,
    websiteId: UMAMI_WEBSITE_ID,
  };
}
