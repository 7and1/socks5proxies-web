"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";

interface WhoamiResponse {
  ip: string;
  headers: Record<string, string[]> | Record<string, string>;
  agent: string;
}

function GlobeIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
      <path d="M2 12h20" />
    </svg>
  );
}

function CopyIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function RefreshIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d="M21 12a9 9 0 1 1-9-9c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}

function AlertIcon({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      xmlns="http://www.w3.org/2000/svg"
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}

// Headers that may reveal proxy usage
const SUSPICIOUS_HEADERS = [
  "x-forwarded-for",
  "via",
  "x-real-ip",
  "forwarded",
  "x-proxy-id",
  "proxy-connection",
  "x-originating-ip",
];

export function WhoamiCard() {
  const [data, setData] = useState<WhoamiResponse | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  const fetchData = () => {
    setIsLoading(true);
    setError(null);
    const controller = new AbortController();
    const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8080";

    fetch(`${base}/api/whoami`, { signal: controller.signal })
      .then((res) => res.json())
      .then((payload) => {
        setData(payload);
        setIsLoading(false);
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          setError("Unable to reach whoami endpoint.");
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  };

  useEffect(() => {
    const cleanup = fetchData();
    return cleanup;
  }, []);

  const handleCopy = () => {
    if (data?.ip) {
      navigator.clipboard.writeText(data.ip);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Check for suspicious headers
  const suspiciousFound = data?.headers
    ? Object.keys(data.headers).filter((key) =>
        SUSPICIOUS_HEADERS.includes(key.toLowerCase()),
      )
    : [];

  return (
    <div className="card-hover rounded-2xl border border-sand-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-ocean-100 text-ocean-600 dark:bg-ocean-900/50 dark:text-ocean-400">
            <GlobeIcon className="h-5 w-5" />
          </div>
          <div>
            <h3 className="text-lg font-semibold">Header Exposure</h3>
            <p className="text-xs text-ink-muted dark:text-sand-400">
              HTTP headers visible to servers
            </p>
          </div>
        </div>
        <button
          type="button"
          onClick={fetchData}
          disabled={isLoading}
          className="rounded-lg p-2 text-ink-muted transition-all hover:bg-sand-100 hover:text-ink focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 disabled:opacity-50 dark:text-sand-400 dark:hover:bg-sand-800 dark:hover:text-sand-200"
          aria-label="Refresh data"
        >
          <RefreshIcon className={clsx(isLoading && "animate-spin")} />
        </button>
      </div>

      {/* Error State */}
      {error && (
        <div className="mt-5 rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-900/30 dark:text-red-400">
          {error}
        </div>
      )}

      {/* Loading State */}
      {!error && isLoading && (
        <div className="mt-5 space-y-3">
          <div className="h-8 w-40 animate-pulse rounded-lg bg-sand-200 dark:bg-sand-700"></div>
          <div className="h-4 w-full animate-pulse rounded-lg bg-sand-200 dark:bg-sand-700"></div>
          <div className="h-24 w-full animate-pulse rounded-lg bg-sand-200 dark:bg-sand-700"></div>
        </div>
      )}

      {/* Data Display */}
      {data && !isLoading && (
        <div className="mt-5 space-y-4">
          {/* IP Display */}
          <div className="flex flex-wrap items-center gap-3">
            <p className="text-2xl font-semibold font-mono tabular-nums text-ink dark:text-sand-100">
              {data.ip}
            </p>
            <button
              type="button"
              onClick={handleCopy}
              className={clsx(
                "flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2",
                copied
                  ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-400"
                  : "bg-sand-100 text-ink-muted hover:bg-sand-200 hover:text-ink dark:bg-sand-800 dark:text-sand-400 dark:hover:bg-sand-700 dark:hover:text-sand-200",
              )}
              aria-label={copied ? "Copied" : "Copy IP address"}
            >
              {copied ? (
                <>
                  <CheckIcon />
                  Copied
                </>
              ) : (
                <>
                  <CopyIcon />
                  Copy
                </>
              )}
            </button>
          </div>

          {/* User Agent */}
          <div className="rounded-xl border border-sand-200 bg-sand-50/80 p-3 dark:border-sand-700 dark:bg-sand-800/80">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-sand-400">
              User Agent
            </p>
            <p className="mt-1 text-sm truncate" title={data.agent}>
              {data.agent}
            </p>
          </div>

          {/* Suspicious Headers Warning */}
          {suspiciousFound.length > 0 && (
            <div className="rounded-xl border border-amber-200 bg-amber-50/80 p-3 dark:border-amber-800 dark:bg-amber-900/20">
              <div className="flex items-start gap-2">
                <AlertIcon className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600 dark:text-amber-400" />
                <div>
                  <p className="text-xs font-semibold text-amber-700 dark:text-amber-400">
                    Proxy-revealing headers detected
                  </p>
                  <p className="mt-0.5 text-xs text-amber-600 dark:text-amber-400/80">
                    {suspiciousFound.join(", ")}
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Headers Panel */}
          <div className="rounded-xl border border-sand-200 bg-sand-50/80 p-3 dark:border-sand-700 dark:bg-sand-800/80">
            <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted dark:text-sand-400">
              HTTP Headers
            </p>
            <div className="mt-3 max-h-40 space-y-2 overflow-auto text-xs">
              {Object.entries(data.headers || {}).map(([key, value]) => {
                const isSuspicious = SUSPICIOUS_HEADERS.includes(
                  key.toLowerCase(),
                );
                return (
                  <div
                    key={key}
                    className={clsx(
                      "flex flex-wrap gap-1 rounded px-2 py-1",
                      isSuspicious
                        ? "bg-amber-100/80 dark:bg-amber-900/30"
                        : "hover:bg-sand-100 dark:hover:bg-sand-700/50",
                    )}
                  >
                    <span
                      className={clsx(
                        "font-semibold",
                        isSuspicious
                          ? "text-amber-700 dark:text-amber-400"
                          : "text-ink dark:text-sand-200",
                      )}
                    >
                      {key}:
                    </span>
                    <span className="text-ink-muted dark:text-sand-400 break-all">
                      {Array.isArray(value) ? value.join(", ") : value}
                    </span>
                  </div>
                );
              })}
            </div>
            <p className="mt-3 text-[11px] text-ink-muted dark:text-sand-500">
              Headers highlighted in yellow may reveal proxy usage to target
              servers.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}
