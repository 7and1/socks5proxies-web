"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  Suspense,
} from "react";
import Script from "next/script";
import { usePathname, useSearchParams } from "next/navigation";
import type {
  ScanStartedEvent,
  ScanCompletedEvent,
  ScanFailedEvent,
  AffiliateClickEvent,
  ExportTriggeredEvent,
  ToolSwitchEvent,
} from "../../lib/analytics";

const UMAMI_SRC =
  process.env.NEXT_PUBLIC_UMAMI_SRC ||
  "https://umami.expertbeacon.com/script.js";
const UMAMI_WEBSITE_ID = process.env.NEXT_PUBLIC_UMAMI_WEBSITE_ID || "";

interface AnalyticsContextValue {
  trackScanStarted: (data: ScanStartedEvent) => void;
  trackScanCompleted: (data: ScanCompletedEvent) => void;
  trackScanFailed: (data: ScanFailedEvent) => void;
  trackAffiliateClick: (data: AffiliateClickEvent) => void;
  trackExportTriggered: (data: ExportTriggeredEvent) => void;
  trackToolSwitch: (data: ToolSwitchEvent) => void;
  analyticsEnabled: boolean;
  setAnalyticsEnabled: (enabled: boolean) => void;
}

const AnalyticsContext = createContext<AnalyticsContextValue | undefined>(
  undefined,
);

export function useAnalytics() {
  const context = useContext(AnalyticsContext);
  if (!context) {
    // Return no-op functions for SSR or when provider is not available
    return {
      trackScanStarted: () => {},
      trackScanCompleted: () => {},
      trackScanFailed: () => {},
      trackAffiliateClick: () => {},
      trackExportTriggered: () => {},
      trackToolSwitch: () => {},
      analyticsEnabled: false,
      setAnalyticsEnabled: () => {},
    };
  }
  return context;
}

declare global {
  interface Window {
    umami?: {
      track: (event: string, data?: Record<string, unknown>) => void;
    };
  }
}

function AnalyticsInner({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [analyticsEnabled, setAnalyticsEnabled] = useState(true);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    // Load user's consent preference
    const consent = localStorage.getItem("analytics-consent");
    setAnalyticsEnabled(consent !== "false");
  }, []);

  // Track page views on route changes
  useEffect(() => {
    if (!mounted || !analyticsEnabled) return;

    const url =
      pathname +
      (searchParams?.toString() ? `?${searchParams.toString()}` : "");

    // Wait for umami to be available
    const trackView = () => {
      if (window.umami) {
        window.umami.track("pageview", { page: url });
      }
    };

    // Track immediately if umami is ready, otherwise wait
    if (window.umami) {
      trackView();
    } else {
      const timeout = setTimeout(trackView, 500);
      return () => clearTimeout(timeout);
    }
  }, [pathname, searchParams, mounted, analyticsEnabled]);

  const handleSetAnalyticsEnabled = (enabled: boolean) => {
    setAnalyticsEnabled(enabled);
    localStorage.setItem("analytics-consent", enabled ? "true" : "false");
  };

  const value: AnalyticsContextValue = {
    trackScanStarted: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("scan_started", data);
      }
    },
    trackScanCompleted: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("scan_completed", data);
      }
    },
    trackScanFailed: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("scan_failed", data);
      }
    },
    trackAffiliateClick: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("affiliate_click", data);
      }
    },
    trackExportTriggered: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("export_triggered", data);
      }
    },
    trackToolSwitch: (data) => {
      if (analyticsEnabled && window.umami) {
        window.umami.track("tool_switch", data);
      }
    },
    analyticsEnabled: mounted ? analyticsEnabled : true,
    setAnalyticsEnabled: handleSetAnalyticsEnabled,
  };

  return (
    <>
      {mounted && analyticsEnabled && UMAMI_WEBSITE_ID && (
        <Script
          src={UMAMI_SRC}
          data-website-id={UMAMI_WEBSITE_ID}
          strategy="afterInteractive"
        />
      )}
      <AnalyticsContext.Provider value={value}>
        {children}
      </AnalyticsContext.Provider>
    </>
  );
}

export function AnalyticsProvider({ children }: { children: React.ReactNode }) {
  return (
    <Suspense fallback={children}>
      <AnalyticsInner>{children}</AnalyticsInner>
    </Suspense>
  );
}
