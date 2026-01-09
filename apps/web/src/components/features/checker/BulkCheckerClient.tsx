"use client";

import { useMemo, useEffect, useState, useRef } from "react";
import { useSearchParams } from "next/navigation";
import { useProxyChecker } from "../../../hooks/use-proxy-checker";
import { useScanHistory } from "../../../hooks/useScanHistory";
import { useFilterPersistence } from "../../../hooks/useFilterPersistence";
import { ProxyInput } from "../../shared/ProxyInput";
import { ResultTable } from "./ResultTable";
import { AffiliateAlert } from "../ads/AffiliateAlert";
import { parseProxyLines } from "../../../lib/validators";
import { affiliateLinks } from "../../../config/affiliates";
import clsx from "clsx";

function PauseIcon() {
  return (
    <svg
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
      <rect x="6" y="4" width="4" height="16" />
      <rect x="14" y="4" width="4" height="16" />
    </svg>
  );
}

function PlayIcon() {
  return (
    <svg
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
      <polygon points="5 3 19 12 5 21 5 3" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg
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
      <rect x="4" y="4" width="16" height="16" />
    </svg>
  );
}

function ClockIcon() {
  return (
    <svg
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
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function HistoryIcon() {
  return (
    <svg
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
      <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 12" />
      <path d="M3 3v9h9" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
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
      <path d="M3 6h18" />
      <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
      <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg
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
      <path d="M18 6 6 18" />
      <path d="m6 6 12 12" />
    </svg>
  );
}

function FilterIcon() {
  return (
    <svg
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
      <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
    </svg>
  );
}

export function BulkCheckerClient() {
  const searchParams = useSearchParams();
  const prefillList = searchParams.get("list") || "";
  const {
    results,
    isScanning,
    isPaused,
    error,
    startScan,
    stopScan,
    pauseScan,
    resumeScan,
    progress,
    totalProxies,
  } = useProxyChecker();
  const { history, addEntry, clearHistory, removeEntry } = useScanHistory();
  const { latencyThreshold, setLatencyThreshold } = useFilterPersistence();
  const [showStopConfirm, setShowStopConfirm] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  const [eta, setEta] = useState<string>("--");

  useEffect(() => {
    if (isScanning && !isPaused && progress > 0) {
      const elapsed = performance.now() - startTimeRef.current;
      const rate = results.length / (elapsed / 1000);
      const remaining = totalProxies - results.length;
      const etaSeconds = remaining / rate;
      setEta(formatTime(etaSeconds));
    }
  }, [results, totalProxies, isScanning, isPaused, progress]);

  const startTimeRef = useRef(performance.now());

  const handleCheck = (rawText: string) => {
    const { valid } = parseProxyLines(rawText, 500);
    startTimeRef.current = performance.now();
    startScan(valid);
    setShowBanner(true);
  };

  const handleStop = () => {
    if (showStopConfirm) {
      stopScan();
      setShowStopConfirm(false);
    } else {
      setShowStopConfirm(true);
    }
  };

  useEffect(() => {
    if (!isScanning && results.length > 0 && !error) {
      addEntry(results);
    }
  }, [isScanning, results, error, addEntry]);

  const filteredResults = useMemo(() => {
    return results.filter(
      (row) => row.status && row.latency <= latencyThreshold,
    );
  }, [results, latencyThreshold]);

  const metrics = useMemo(() => {
    const dead = results.filter((row) => !row.status).length;
    const alive = results.filter((row) => row.status).length;
    const slow = results.filter(
      (row) => row.status && row.latency > 1000,
    ).length;
    const avgLatency =
      alive > 0
        ? Math.round(
            results
              .filter((row) => row.status)
              .reduce((sum, row) => sum + row.latency, 0) / alive,
          )
        : 0;
    return { dead, alive, slow, total: results.length, avgLatency };
  }, [results]);

  const showAd =
    !isScanning && metrics.total > 0 && metrics.dead / metrics.total > 0.5;
  const showResultBanner = !isScanning && metrics.total > 0 && showBanner;
  const slowRate =
    metrics.total > 0
      ? Math.round(((metrics.slow + metrics.dead) / metrics.total) * 100)
      : 0;

  return (
    <div className="space-y-6">
      {/* Input Section */}
      <div className="card-hover rounded-3xl border border-sand-200/80 bg-white/90 p-6 shadow-sm backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold">Proxy List</h2>
          <span className="text-xs text-ink-muted dark:text-sand-400">
            Max 500 proxies per scan
          </span>
        </div>
        <ProxyInput
          onSubmit={handleCheck}
          isLoading={isScanning && !isPaused}
          initialValue={prefillList}
        />
      </div>

      {/* Error State */}
      {error && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950/50 dark:text-red-400"
        >
          <svg
            className="mt-0.5 h-5 w-5 flex-shrink-0"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
            />
          </svg>
          <div>
            <p className="font-semibold">Scan Error</p>
            <p className="mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Progress Section */}
      {(isScanning || (results.length > 0 && !isScanning)) && (
        <div className="rounded-2xl border border-sand-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
          <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                {isScanning && !isPaused && (
                  <span className="relative flex h-3 w-3">
                    <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-ocean-400 opacity-75"></span>
                    <span className="relative inline-flex h-3 w-3 rounded-full bg-ocean-500"></span>
                  </span>
                )}
                <span className="text-sm font-semibold">
                  {isScanning
                    ? isPaused
                      ? "Paused"
                      : "Scanning..."
                    : "Complete"}
                </span>
              </div>
              <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-medium text-ink-muted dark:bg-sand-800 dark:text-sand-400">
                {results.length} / {totalProxies} checked
              </span>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {isScanning && (
                <>
                  <button
                    type="button"
                    onClick={isPaused ? resumeScan : pauseScan}
                    className="flex items-center gap-1.5 rounded-full border border-sand-200 bg-white px-4 py-2 text-xs font-semibold transition-all hover:border-ocean-300 hover:bg-ocean-50 focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2 dark:border-sand-600 dark:bg-sand-800 dark:hover:border-ocean-600 dark:hover:bg-ocean-900/30"
                    aria-label={isPaused ? "Resume scan" : "Pause scan"}
                  >
                    {isPaused ? <PlayIcon /> : <PauseIcon />}
                    {isPaused ? "Resume" : "Pause"}
                  </button>
                  <button
                    type="button"
                    onClick={handleStop}
                    className={clsx(
                      "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-offset-2",
                      showStopConfirm
                        ? "bg-red-600 text-white hover:bg-red-700"
                        : "border border-red-200 text-red-600 hover:bg-red-50 dark:border-red-800 dark:hover:bg-red-900/30",
                    )}
                    aria-label={showStopConfirm ? "Confirm stop" : "Stop scan"}
                  >
                    <StopIcon />
                    {showStopConfirm ? "Confirm Stop" : "Stop"}
                  </button>
                </>
              )}
              <button
                type="button"
                onClick={() => setShowHistory(!showHistory)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-full px-4 py-2 text-xs font-semibold transition-all focus:outline-none focus:ring-2 focus:ring-ocean-500 focus:ring-offset-2",
                  showHistory
                    ? "bg-ocean-100 text-ocean-700 dark:bg-ocean-900/50 dark:text-ocean-400"
                    : "border border-sand-200 text-ink-muted hover:bg-sand-50 dark:border-sand-600 dark:text-sand-400 dark:hover:bg-sand-800",
                )}
                aria-expanded={showHistory}
                aria-label="Toggle scan history"
              >
                <HistoryIcon />
                History ({history.length})
              </button>
            </div>
          </div>

          {/* Progress Bar */}
          {(isScanning || results.length > 0) && (
            <div className="space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-ink-muted dark:text-sand-400">
                  Progress
                </span>
                <span className="font-mono font-semibold">{progress}%</span>
              </div>
              <div
                className="h-3 overflow-hidden rounded-full bg-sand-200 dark:bg-sand-700"
                role="progressbar"
                aria-valuenow={progress}
                aria-valuemin={0}
                aria-valuemax={100}
                aria-label="Scan progress"
              >
                <div
                  className={clsx(
                    "h-full rounded-full transition-all duration-500 ease-out",
                    isPaused
                      ? "bg-ocean-400"
                      : isScanning
                        ? "progress-animated"
                        : "bg-emerald-500",
                  )}
                  style={{ width: `${progress}%` }}
                />
              </div>
              {isScanning && (
                <div className="flex items-center justify-between text-xs text-ink-muted dark:text-sand-400">
                  <div className="flex items-center gap-1.5">
                    <ClockIcon />
                    <span>ETA: {eta}</span>
                  </div>
                  <span>
                    {Math.round(
                      (results.length /
                        (performance.now() - startTimeRef.current)) *
                        1000,
                    )}{" "}
                    proxies/sec
                  </span>
                </div>
              )}
            </div>
          )}

          {/* History Panel */}
          {showHistory && (
            <div className="mt-5 border-t border-sand-200 pt-5 dark:border-sand-700">
              <div className="mb-3 flex items-center justify-between">
                <span className="text-sm font-semibold">Recent Scans</span>
                {history.length > 0 && (
                  <button
                    type="button"
                    onClick={clearHistory}
                    className="flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium text-red-600 transition-colors hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-500 dark:text-red-400 dark:hover:bg-red-900/20"
                    aria-label="Clear all history"
                  >
                    <TrashIcon />
                    Clear All
                  </button>
                )}
              </div>
              {history.length === 0 ? (
                <p className="text-center text-sm text-ink-muted dark:text-sand-400 py-4">
                  No scan history yet
                </p>
              ) : (
                <div className="space-y-2 max-h-48 overflow-y-auto">
                  {history.slice(0, 5).map((entry) => (
                    <div
                      key={entry.id}
                      className="group flex items-center justify-between rounded-xl border border-sand-200 bg-sand-50/80 px-4 py-3 text-xs transition-all hover:border-ocean-200 hover:bg-ocean-50/50 dark:border-sand-700 dark:bg-sand-800/80 dark:hover:border-ocean-700"
                    >
                      <div className="flex items-center gap-3">
                        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-sand-200 text-xs font-bold text-sand-600 dark:bg-sand-700 dark:text-sand-300">
                          {Math.round(
                            (entry.stats.alive / entry.stats.total) * 100,
                          )}
                          %
                        </div>
                        <div>
                          <div className="font-mono font-medium">
                            {new Date(entry.timestamp).toLocaleString()}
                          </div>
                          <div className="text-ink-muted dark:text-sand-400">
                            <span className="text-emerald-600 dark:text-emerald-400">
                              {entry.stats.alive} alive
                            </span>{" "}
                            / {entry.stats.total} total
                          </div>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeEntry(entry.id)}
                        className="rounded-lg p-2 text-sand-400 opacity-0 transition-all hover:bg-red-50 hover:text-red-500 group-hover:opacity-100 focus:opacity-100 dark:hover:bg-red-900/30"
                        aria-label="Remove this entry"
                      >
                        <XIcon />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Metrics Grid */}
      {results.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <MetricCard
            label="Total Checked"
            value={metrics.total}
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"
                />
              </svg>
            }
            color="ocean"
          />
          <MetricCard
            label="Alive"
            value={metrics.alive}
            percentage={
              metrics.total > 0
                ? Math.round((metrics.alive / metrics.total) * 100)
                : 0
            }
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M5 13l4 4L19 7"
                />
              </svg>
            }
            color="emerald"
          />
          <MetricCard
            label="Dead"
            value={metrics.dead}
            percentage={
              metrics.total > 0
                ? Math.round((metrics.dead / metrics.total) * 100)
                : 0
            }
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            }
            color="red"
          />
          <MetricCard
            label="Avg Latency"
            value={`${metrics.avgLatency}ms`}
            icon={
              <svg
                className="h-5 w-5"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M13 10V3L4 14h7v7l9-11h-7z"
                />
              </svg>
            }
            color="sand"
          />
        </div>
      )}

      {/* Filter Controls */}
      {results.length > 0 && (
        <div className="flex flex-wrap items-center gap-4 rounded-xl border border-sand-200/80 bg-white/80 px-4 py-3 dark:border-sand-700 dark:bg-sand-900/80">
          <div className="flex items-center gap-2 text-sm text-ink-muted dark:text-sand-400">
            <FilterIcon />
            <span>Filters</span>
          </div>
          <label className="flex items-center gap-2 text-sm">
            <span>Max Latency:</span>
            <input
              type="number"
              value={latencyThreshold}
              onChange={(e) => setLatencyThreshold(Number(e.target.value))}
              className="w-24 rounded-lg border border-sand-200 bg-white px-3 py-1.5 text-center text-sm font-medium focus:border-ocean-400 focus:outline-none focus:ring-2 focus:ring-ocean-400/20 dark:border-sand-600 dark:bg-sand-800"
              min={0}
              step={100}
              aria-label="Maximum latency threshold in milliseconds"
            />
            <span className="text-xs text-ink-muted dark:text-sand-400">
              ms
            </span>
          </label>
          <span className="text-sm text-ink-muted dark:text-sand-400">
            Showing {filteredResults.length} of {metrics.alive} alive proxies
          </span>
        </div>
      )}

      {/* Affiliate Alert */}
      {showAd && (
        <AffiliateAlert
          title="Most of your proxies are dead."
          cta="Get 99.9% Uptime Proxies"
          provider="brightdata"
          placement="bulk-checker-results"
        />
      )}

      {/* Results Table */}
      {results.length > 0 && <ResultTable data={results} />}

      {/* Bottom Banner */}
      {showResultBanner && (
        <div className="fixed bottom-6 left-6 right-6 z-20 mx-auto max-w-4xl animate-fade-up rounded-2xl border border-sand-200/80 bg-white/95 p-4 shadow-2xl backdrop-blur-md dark:border-sand-700 dark:bg-sand-900/95">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div
                className={clsx(
                  "flex h-10 w-10 items-center justify-center rounded-full",
                  slowRate > 50
                    ? "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400"
                    : "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
                )}
              >
                {slowRate > 50 ? (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                    />
                  </svg>
                ) : (
                  <svg
                    className="h-5 w-5"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 13l4 4L19 7"
                    />
                  </svg>
                )}
              </div>
              <div>
                <p className="text-sm font-semibold">Scan Complete</p>
                <p className="text-xs text-ink-muted dark:text-sand-400">
                  {slowRate > 50
                    ? `${slowRate}% of proxies are slow or dead`
                    : `${100 - slowRate}% of proxies are healthy`}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setShowBanner(false)}
                className="rounded-lg px-3 py-2 text-xs font-medium text-ink-muted transition-colors hover:bg-sand-100 dark:text-sand-400 dark:hover:bg-sand-800"
                aria-label="Dismiss banner"
              >
                Dismiss
              </button>
              <a
                href={affiliateLinks.brightdata}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-glow inline-flex items-center gap-2 rounded-full bg-ocean-600 px-5 py-2.5 text-xs font-semibold text-white shadow-lg transition-all hover:-translate-y-0.5 hover:bg-ocean-500"
              >
                Upgrade Proxies
                <svg
                  className="h-3 w-3"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14"
                  />
                </svg>
              </a>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

interface MetricCardProps {
  label: string;
  value: number | string;
  percentage?: number;
  icon?: React.ReactNode;
  color?: "ocean" | "emerald" | "red" | "sand";
}

function MetricCard({
  label,
  value,
  percentage,
  icon,
  color = "ocean",
}: MetricCardProps) {
  const colorClasses = {
    ocean:
      "bg-ocean-100 text-ocean-600 dark:bg-ocean-900/50 dark:text-ocean-400",
    emerald:
      "bg-emerald-100 text-emerald-600 dark:bg-emerald-900/50 dark:text-emerald-400",
    red: "bg-red-100 text-red-600 dark:bg-red-900/50 dark:text-red-400",
    sand: "bg-sand-200 text-sand-600 dark:bg-sand-700 dark:text-sand-300",
  };

  return (
    <div className="card-hover rounded-2xl border border-sand-200/80 bg-white/90 p-5 shadow-sm backdrop-blur-sm dark:border-sand-700 dark:bg-sand-900/90">
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-ink-muted dark:text-sand-400">
            {label}
          </p>
          <p className="mt-2 text-3xl font-semibold tabular-nums">{value}</p>
          {percentage !== undefined && (
            <p className="mt-1 text-xs text-ink-muted dark:text-sand-400">
              {percentage}% of total
            </p>
          )}
        </div>
        {icon && (
          <div className={clsx("rounded-xl p-2.5", colorClasses[color])}>
            {icon}
          </div>
        )}
      </div>
    </div>
  );
}

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return "--";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600)
    return `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s`;
  return `${Math.floor(seconds / 3600)}h ${Math.floor((seconds % 3600) / 60)}m`;
}
