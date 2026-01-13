"use client";

import Link from "next/link";
import { memo, useMemo, useState, useCallback } from "react";
import type { ProxyData } from "../../types/proxy";

function escapeCsv(value: string | number | undefined | null) {
  if (value === undefined || value === null) return "";
  const text = String(value);
  const escaped = text.replace(/"/g, '""');
  return /[",\n]/.test(escaped) ? `"${escaped}"` : escaped;
}

function buildCsv(data: ProxyData[]) {
  const header = [
    "ip",
    "port",
    "country_code",
    "country_name",
    "city",
    "region",
    "asn",
    "asn_name",
    "org",
    "protocols",
    "anonymity",
    "uptime",
    "delay_ms",
    "last_seen",
  ];
  const rows = data.map((proxy) => [
    proxy.ip,
    proxy.port,
    proxy.country_code,
    proxy.country_name,
    proxy.city,
    proxy.region,
    proxy.asn,
    proxy.asn_name,
    proxy.org,
    proxy.protocols.join("|"),
    proxy.anonymity_level,
    proxy.uptime,
    proxy.delay,
    proxy.last_seen,
  ]);

  return [header, ...rows]
    .map((row) => row.map((cell) => escapeCsv(cell)).join(","))
    .join("\n");
}

function buildPlainList(data: ProxyData[]) {
  return data.map((proxy) => `${proxy.ip}:${proxy.port}`).join("\n");
}

function buildClashConfig(data: ProxyData[]) {
  const lines = ["proxies:"];
  data.forEach((proxy, index) => {
    const type = proxy.socks5 ? "socks5" : proxy.socks4 ? "socks4" : "http";
    const tls = !proxy.socks5 && !proxy.socks4 && proxy.ssl === 1;
    lines.push(`  - name: \"proxy-${index + 1}-${proxy.ip}\"`);
    lines.push(`    type: ${type}`);
    lines.push(`    server: ${proxy.ip}`);
    lines.push(`    port: ${proxy.port}`);
    if (tls) {
      lines.push("    tls: true");
    }
  });
  return lines.join("\n");
}

function buildSurfsharkList(data: ProxyData[]) {
  return data
    .map((proxy) => {
      if (proxy.socks5) return `socks5://${proxy.ip}:${proxy.port}`;
      if (proxy.socks4) return `socks4://${proxy.ip}:${proxy.port}`;
      if (proxy.ssl) return `https://${proxy.ip}:${proxy.port}`;
      return `http://${proxy.ip}:${proxy.port}`;
    })
    .join("\n");
}

type ExportFormat = "txt" | "csv" | "json" | "clash" | "surfshark";
const SERVER_EXPORT_LIMIT = 5000;

interface ProxyExportActionsProps {
  data: ProxyData[];
  selected?: ProxyData[];
  basePath: string;
  query?: Record<string, string | number | undefined>;
  onClearSelection?: () => void;
}

function ProxyExportActions({
  data,
  selected,
  basePath,
  query,
  onClearSelection,
}: ProxyExportActionsProps) {
  const [status, setStatus] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>("csv");

  const exportData = selected && selected.length > 0 ? selected : data;
  const selectionCount = selected?.length ?? 0;

  const csv = useMemo(() => buildCsv(exportData), [exportData]);
  const plain = useMemo(() => buildPlainList(exportData), [exportData]);
  const json = useMemo(() => JSON.stringify(exportData, null, 2), [exportData]);
  const clash = useMemo(() => buildClashConfig(exportData), [exportData]);
  const surfshark = useMemo(() => buildSurfsharkList(exportData), [exportData]);

  const filenameBase = useMemo(() => {
    const date = new Date().toISOString().slice(0, 10);
    const safe = basePath
      .replace(/\/+/g, "-")
      .replace(/[^a-zA-Z0-9-]/g, "")
      .replace(/^-+|-+$/g, "");
    return `${safe || "proxy-list"}-${date}`;
  }, [basePath]);

  const setTemporaryStatus = useCallback((message: string) => {
    setStatus(message);
    window.setTimeout(() => setStatus(null), 2400);
  }, []);

  const handleCopy = useCallback(async () => {
    if (!plain) {
      setTemporaryStatus("No proxies to copy.");
      return;
    }
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(plain);
        setTemporaryStatus("Copied to clipboard.");
        return;
      }
      throw new Error("Clipboard unavailable");
    } catch {
      try {
        const textarea = document.createElement("textarea");
        textarea.value = plain;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
        setTemporaryStatus("Copied to clipboard.");
      } catch {
        setTemporaryStatus("Copy failed.");
      }
    }
  }, [plain, setTemporaryStatus]);

  const handleDownload = useCallback(() => {
    if (!exportData.length) {
      setTemporaryStatus("No proxies to export.");
      return;
    }

    let content = "";
    let extension = format;
    let mime = "text/plain;charset=utf-8;";

    switch (format) {
      case "txt":
        content = plain;
        break;
      case "json":
        content = json;
        mime = "application/json;charset=utf-8;";
        break;
      case "clash":
        content = clash;
        mime = "text/yaml;charset=utf-8;";
        break;
      case "surfshark":
        content = surfshark;
        break;
      case "csv":
      default:
        content = csv;
        mime = "text/csv;charset=utf-8;";
        extension = "csv";
        break;
    }

    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${filenameBase}.${extension}`;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
    setTemporaryStatus("Export started.");
  }, [
    csv,
    json,
    clash,
    surfshark,
    plain,
    format,
    filenameBase,
    exportData.length,
    setTemporaryStatus,
  ]);

  const queryParams = useMemo(() => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null && value !== "") {
          params.set(key, String(value));
        }
      });
    }
    return params.toString();
  }, [query]);

  const apiBase = (
    process.env.NEXT_PUBLIC_API_URL || "https://api.socks5proxies.com"
  ).replace(/\/$/, "");
  const apiUrl = `${apiBase}/api/proxies${queryParams ? `?${queryParams}` : ""}`;
  const serverExportUrl = useMemo(() => {
    const params = new URLSearchParams();
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value === undefined || value === null || value === "") return;
        if (key === "offset" || key === "limit") return;
        params.set(key, String(value));
      });
    }
    params.set("limit", String(SERVER_EXPORT_LIMIT));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    return `${apiBase}/api/proxies/export/${format}${suffix}`;
  }, [apiBase, format, query]);

  const selectedPlain = useMemo(
    () => (selectionCount > 0 ? buildPlainList(selected || []) : ""),
    [selectionCount, selected],
  );
  const checkHref = useMemo(
    () =>
      selectionCount
        ? `/tools/bulk-checker?list=${encodeURIComponent(selectedPlain)}`
        : "",
    [selectionCount, selectedPlain],
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-sand-200 bg-white/80 px-4 py-3 text-xs shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
        <div>
          <div className="font-semibold text-ink">Export current page</div>
          <div className="text-ink-muted dark:text-sand-400">
            {selectionCount > 0
              ? `${selectionCount} selected • Copy or export.`
              : "Download or copy the visible proxies."}
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleCopy}
            className="rounded-full border border-sand-200 bg-sand-50 px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-sand-300 hover:bg-sand-100 dark:border-sand-700 dark:bg-sand-800 dark:text-sand-100 dark:hover:border-sand-600"
          >
            Copy IP:PORT
          </button>
          <select
            value={format}
            onChange={(event) => setFormat(event.target.value as ExportFormat)}
            className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink dark:border-sand-700 dark:bg-sand-900 dark:text-sand-100"
            aria-label="Select export format"
          >
            <option value="csv">CSV</option>
            <option value="txt">TXT</option>
            <option value="json">JSON</option>
            <option value="clash">Clash</option>
            <option value="surfshark">Surfshark</option>
          </select>
          <button
            type="button"
            onClick={handleDownload}
            className="rounded-full border border-ocean-200 bg-ocean-50 px-3 py-1.5 text-xs font-semibold text-ocean-700 transition hover:border-ocean-300 hover:bg-ocean-100 dark:border-ocean-800 dark:bg-ocean-950 dark:text-ocean-200 dark:hover:border-ocean-700"
          >
            Download
          </button>
          <a
            href={serverExportUrl}
            className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink transition hover:border-sand-300 hover:bg-sand-50 dark:border-sand-700 dark:bg-sand-900 dark:text-sand-200 dark:hover:border-sand-600"
          >
            Full Export
          </a>
          {selectionCount > 0 ? (
            <Link
              href={checkHref}
              className="rounded-full bg-emerald-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500"
            >
              Check Selected
            </Link>
          ) : (
            <button
              type="button"
              disabled
              className="rounded-full bg-sand-200 px-3 py-1.5 text-xs font-semibold text-sand-500 dark:bg-sand-800 dark:text-sand-500"
            >
              Check Selected
            </button>
          )}
          {selectionCount > 0 && onClearSelection && (
            <button
              type="button"
              onClick={onClearSelection}
              className="rounded-full border border-sand-200 bg-white px-3 py-1.5 text-xs font-semibold text-ink-muted hover:border-sand-300 dark:border-sand-700 dark:bg-sand-900"
            >
              Clear
            </button>
          )}
          {status && <span className="text-xs text-ink-muted">{status}</span>}
        </div>
      </div>

      <div className="rounded-2xl border border-sand-200 bg-white/80 px-4 py-3 text-xs shadow-sm dark:border-sand-700 dark:bg-sand-900/70">
        <div className="flex items-center justify-between gap-2">
          <p className="font-semibold text-ink">API snippet</p>
          <span className="text-ink-muted dark:text-sand-400">
            Pull this list programmatically
          </span>
        </div>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <pre className="rounded-xl bg-sand-100 p-3 text-[11px] text-ink-muted dark:bg-sand-800 dark:text-sand-300 overflow-x-auto">
            {`curl "${apiUrl}"`}
          </pre>
          <pre className="rounded-xl bg-sand-100 p-3 text-[11px] text-ink-muted dark:bg-sand-800 dark:text-sand-300 overflow-x-auto">
            {"import requests\n"}
            {`print(requests.get(\"${apiUrl}\").json())`}
          </pre>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-[11px] text-ink-muted dark:text-sand-400">
          <span>Need more than one page?</span>
          <span>
            Server export (up to {SERVER_EXPORT_LIMIT.toLocaleString()}{" "}
            proxies):
          </span>
          <code className="break-all rounded bg-sand-100 px-2 py-1 text-[10px] text-ink dark:bg-sand-800 dark:text-sand-100">
            {serverExportUrl}
          </code>
        </div>
      </div>
    </div>
  );
}

export default memo(ProxyExportActions);
