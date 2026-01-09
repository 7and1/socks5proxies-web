"use client";

import { useState, useMemo, useCallback, memo } from "react";
import clsx from "clsx";

interface ResultRow {
  ip: string;
  port: string;
  protocol: string;
  status: boolean;
  latency: number;
  country?: string;
  anonymity?: string;
  error?: string;
}

interface ResultTableProps {
  data: ResultRow[];
}

function downloadFile(content: string, filename: string, type: string) {
  const blob = new Blob([content], { type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function exportToCSV(data: ResultRow[]): string {
  const headers = [
    "IP",
    "Port",
    "Protocol",
    "Status",
    "Latency",
    "Country",
    "Anonymity",
    "Error",
  ];
  const rows = data.map((row) => [
    row.ip,
    row.port,
    row.protocol,
    row.status ? "Alive" : "Dead",
    row.status ? row.latency.toString() : "",
    row.country || "",
    row.anonymity || "",
    row.error || "",
  ]);
  return [headers, ...rows].map((row) => row.join(",")).join("\n");
}

function exportToJSON(data: ResultRow[]): string {
  return JSON.stringify(data, null, 2);
}

function CopyIcon() {
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
    >
      <rect width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </svg>
  );
}

function CheckIcon() {
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
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function DownloadIcon() {
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
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="7 10 12 15 17 10" />
      <line x1="12" x2="12" y1="15" y2="3" />
    </svg>
  );
}

// Performance: Memoized row component to prevent unnecessary re-renders
const ResultRow = memo(function ResultRow({
  row,
  idx,
  isCopied,
  onCopy,
}: {
  row: ResultRow;
  idx: number;
  isCopied: boolean;
  onCopy: (row: ResultRow, idx: number) => void;
}) {
  const slow = row.status && row.latency > 1000;
  const rowClass = row.status
    ? slow
      ? "bg-amber-50 dark:bg-amber-950/30"
      : "bg-white dark:bg-sand-800"
    : "bg-red-50 dark:bg-red-950/30";

  return (
    <tr
      className={clsx(
        "border-t border-sand-100 dark:border-sand-700",
        rowClass,
      )}
    >
      <td className="px-4 py-3 font-mono text-xs">
        {row.ip}:{row.port}
        {row.error && (
          <div className="text-[10px] text-red-500">{row.error}</div>
        )}
      </td>
      <td className="px-4 py-3">{row.protocol}</td>
      <td className="px-4 py-3">{row.status ? `${row.latency} ms` : "--"}</td>
      <td className="px-4 py-3">{row.country || "--"}</td>
      <td className="px-4 py-3">{row.anonymity || "unknown"}</td>
      <td className="px-4 py-3">
        <span
          className={clsx(
            "rounded-full px-3 py-1 text-xs font-semibold",
            row.status
              ? "bg-ocean-100 text-ocean-700"
              : "bg-red-100 text-red-700",
          )}
        >
          {row.status ? "Alive" : "Dead"}
        </span>
      </td>
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={() => onCopy(row, idx)}
          className={clsx(
            "rounded-lg p-1.5 transition",
            isCopied
              ? "bg-ocean-100 text-ocean-700"
              : "text-sand-400 hover:bg-sand-100 hover:text-ink-muted",
          )}
          aria-label={isCopied ? "Copied proxy address" : "Copy proxy address"}
        >
          {isCopied ? <CheckIcon /> : <CopyIcon />}
        </button>
      </td>
    </tr>
  );
});

export function ResultTable({ data }: ResultTableProps) {
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [exportStatus, setExportStatus] = useState<"idle" | "csv" | "json">(
    "idle",
  );

  // Performance: Memoize copy handler
  const handleCopy = useCallback((row: ResultRow, idx: number) => {
    const proxyString = `${row.protocol}://${row.ip}:${row.port}`;
    navigator.clipboard.writeText(proxyString);
    const id = `${row.ip}-${row.port}-${idx}`;
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  }, []);

  const handleExportCSV = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(exportToCSV(data), `proxies-${timestamp}.csv`, "text/csv");
    setExportStatus("csv");
    setTimeout(() => setExportStatus("idle"), 2000);
  }, [data]);

  const handleExportJSON = useCallback(() => {
    const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
    downloadFile(
      exportToJSON(data),
      `proxies-${timestamp}.json`,
      "application/json",
    );
    setExportStatus("json");
    setTimeout(() => setExportStatus("idle"), 2000);
  }, [data]);

  // Performance: Only render visible rows for large datasets
  const displayData = useMemo(() => {
    return data.slice(0, 500); // Limit to 500 rows for performance
  }, [data]);

  if (data.length === 0) {
    return null;
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-sm font-semibold">Results ({data.length})</h3>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={handleExportCSV}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              exportStatus === "csv"
                ? "bg-ocean-100 text-ocean-700"
                : "border border-sand-200 bg-white/90 text-ink-muted hover:bg-sand-50",
            )}
          >
            {exportStatus === "csv" ? <CheckIcon /> : <DownloadIcon />}
            {exportStatus === "csv" ? "Copied!" : "Export CSV"}
          </button>
          <button
            type="button"
            onClick={handleExportJSON}
            className={clsx(
              "flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              exportStatus === "json"
                ? "bg-ocean-100 text-ocean-700"
                : "border border-sand-200 bg-white/90 text-ink-muted hover:bg-sand-50",
            )}
          >
            {exportStatus === "json" ? <CheckIcon /> : <DownloadIcon />}
            {exportStatus === "json" ? "Copied!" : "Export JSON"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-sand-200 bg-white/90 shadow-sm dark:border-sand-700 dark:bg-sand-900/90">
        <table className="w-full text-left text-sm">
          <thead className="bg-sand-100 text-xs uppercase text-ink-muted dark:bg-sand-800 dark:text-sand-400">
            <tr>
              <th scope="col" className="px-4 py-3">
                Proxy
              </th>
              <th scope="col" className="px-4 py-3">
                Protocol
              </th>
              <th scope="col" className="px-4 py-3">
                Latency
              </th>
              <th scope="col" className="px-4 py-3">
                Country
              </th>
              <th scope="col" className="px-4 py-3">
                Anonymity
              </th>
              <th scope="col" className="px-4 py-3">
                Status
              </th>
              <th scope="col" className="px-4 py-3">
                <span className="sr-only">Actions</span>
              </th>
            </tr>
          </thead>
          <tbody>
            {displayData.map((row, idx) => {
              const id = `${row.ip}-${row.port}-${idx}`;
              return (
                <ResultRow
                  key={id}
                  row={row}
                  idx={idx}
                  isCopied={copiedId === id}
                  onCopy={handleCopy}
                />
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
