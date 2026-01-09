"use client";

import { useAnalytics } from "./AnalyticsProvider";
import { X, BarChart3 } from "lucide-react";
import { useState, useEffect } from "react";

export function AnalyticsConsent() {
  const { analyticsEnabled, setAnalyticsEnabled } = useAnalytics();
  const [showBanner, setShowBanner] = useState(false);

  useEffect(() => {
    // Only show banner if user hasn't made a choice
    const consent = localStorage.getItem("analytics-consent");
    if (consent === null) {
      setShowBanner(true);
    }
  }, []);

  if (!showBanner) return null;

  const handleAccept = () => {
    setAnalyticsEnabled(true);
    setShowBanner(false);
    localStorage.setItem("analytics-consent-dismissed", "true");
  };

  const handleDecline = () => {
    setAnalyticsEnabled(false);
    setShowBanner(false);
    localStorage.setItem("analytics-consent-dismissed", "true");
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-xl border border-sand-200 bg-white p-4 shadow-xl">
      <button
        onClick={() => setShowBanner(false)}
        className="absolute right-2 top-2 text-sand-400 hover:text-sand-600"
      >
        <X className="h-4 w-4" />
      </button>
      <div className="mb-3 flex items-center gap-2">
        <BarChart3 className="h-5 w-5 text-ocean-600" />
        <span className="font-semibold text-ink">Privacy Notice</span>
      </div>
      <p className="mb-4 text-sm text-sand-700">
        We use privacy-friendly analytics (Umami) to improve our tools. No IP
        addresses are stored, and no cookies are used without consent.
      </p>
      <div className="flex gap-2">
        <button
          onClick={handleAccept}
          className="flex-1 rounded-lg bg-ocean-600 px-3 py-2 text-sm font-medium text-white transition hover:bg-ocean-700"
        >
          Accept
        </button>
        <button
          onClick={handleDecline}
          className="flex-1 rounded-lg border border-sand-300 px-3 py-2 text-sm font-medium text-sand-700 transition hover:bg-sand-50"
        >
          Decline
        </button>
      </div>
    </div>
  );
}
