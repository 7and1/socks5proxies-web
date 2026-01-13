"use client";

import { memo, useMemo, useRef, useState, useEffect, useCallback } from "react";
import type { ProxyData } from "../../types/proxy";
import { ANONYMITY_LEVELS } from "../../config/proxy-constants";
import { countryCodeToFlag } from "../../lib/flags";
import { formatRelativeTime } from "../../lib/format";

interface ProxyTableProps {
  data: ProxyData[];
  selectedKeys: Set<string>;
  onSelectionChange: (next: Set<string>) => void;
}

type SortKey = "last_seen" | "delay" | "uptime" | "country";

interface SortState {
  key: SortKey;
  direction: "asc" | "desc";
}

function getFreshnessAgeSeconds(lastSeen?: string): number {
  if (!lastSeen) return Number.POSITIVE_INFINITY;
  const parsed = new Date(lastSeen);
  if (Number.isNaN(parsed.getTime())) return Number.POSITIVE_INFINITY;
  return Math.max(0, (Date.now() - parsed.getTime()) / 1000);
}

function getFreshnessStyle(ageSeconds: number) {
  if (ageSeconds <= 300) {
    return "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400";
  }
  if (ageSeconds <= 900) {
    return "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400";
  }
  return "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400";
}

function ProxyTableComponent({
  data,
  selectedKeys,
  onSelectionChange,
}: ProxyTableProps) {
  const [sortState, setSortState] = useState<SortState>({
    key: "last_seen",
    direction: "desc",
  });
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const selectAllRef = useRef<HTMLInputElement>(null);

  const sortedData = useMemo(() => {
    const sorted = [...data];
    sorted.sort((a, b) => {
      const direction = sortState.direction === "asc" ? 1 : -1;
      switch (sortState.key) {
        case "uptime":
          return direction * ((a.uptime ?? 0) - (b.uptime ?? 0));
        case "delay":
          return direction * ((a.delay ?? 0) - (b.delay ?? 0));
        case "country": {
          const aLabel = a.country_name || a.country_code || "";
          const bLabel = b.country_name || b.country_code || "";
          return direction * aLabel.localeCompare(bLabel);
        }
        case "last_seen":
        default: {
          const aTime = a.last_seen ? new Date(a.last_seen).getTime() : 0;
          const bTime = b.last_seen ? new Date(b.last_seen).getTime() : 0;
          const safeATime = Number.isFinite(aTime) ? aTime : 0;
          const safeBTime = Number.isFinite(bTime) ? bTime : 0;
          return direction * (safeATime - safeBTime);
        }
      }
    });
    return sorted;
  }, [data, sortState]);

  const allSelected = data.length > 0 && selectedKeys.size === data.length;
  const someSelected = selectedKeys.size > 0 && !allSelected;

  useEffect(() => {
    if (selectAllRef.current) {
      selectAllRef.current.indeterminate = someSelected;
    }
  }, [someSelected]);

  const toggleAll = useCallback(() => {
    if (allSelected) {
      onSelectionChange(new Set());
      return;
    }
    const next = new Set<string>();
    data.forEach((proxy) => next.add(`${proxy.ip}:${proxy.port}`));
    onSelectionChange(next);
  }, [allSelected, data, onSelectionChange]);

  const toggleRow = useCallback(
    (key: string) => {
      const next = new Set(selectedKeys);
      if (next.has(key)) {
        next.delete(key);
      } else {
        next.add(key);
      }
      onSelectionChange(next);
    },
    [selectedKeys, onSelectionChange],
  );

  const handleCopy = useCallback(async (value: string) => {
    try {
      if (navigator.clipboard?.writeText) {
        await navigator.clipboard.writeText(value);
      } else {
        const textarea = document.createElement("textarea");
        textarea.value = value;
        textarea.style.position = "fixed";
        textarea.style.opacity = "0";
        document.body.appendChild(textarea);
        textarea.select();
        document.execCommand("copy");
        textarea.remove();
      }
      setCopiedKey(value);
      window.setTimeout(() => setCopiedKey(null), 1500);
    } catch {
      setCopiedKey(null);
    }
  }, []);

  const handleSort = useCallback((key: SortKey) => {
    setSortState((prev) => {
      if (prev.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "desc" };
    });
  }, []);

  if (data.length === 0) {
    return (
      <div
        className="rounded-2xl border border-sand-200 bg-white/80 p-6 text-sm text-ink-muted dark:border-sand-700 dark:bg-sand-900/70 dark:text-sand-400"
        role="status"
        aria-live="polite"
      >
        No proxies match the current filters. Try adjusting your filters or
        clearing them.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="hidden md:block overflow-hidden rounded-3xl border border-sand-200 bg-white/90 shadow-lg dark:border-sand-700 dark:bg-sand-900/80">
        <div className="overflow-x-auto">
          <table
            className="min-w-full text-sm"
            role="grid"
            aria-label="Proxy list"
          >
            <thead className="bg-sand-100 text-xs uppercase tracking-widest text-ink-muted dark:bg-sand-800 dark:text-sand-400">
              <tr>
                <th className="px-4 py-3 text-left font-semibold">
                  <input
                    ref={selectAllRef}
                    type="checkbox"
                    checked={allSelected}
                    onChange={toggleAll}
                    aria-label="Select all proxies"
                  />
                </th>
                <th className="px-4 py-3 text-left font-semibold">Proxy</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("country")}
                    className="inline-flex items-center gap-1"
                  >
                    Country
                    <span className="text-[10px]">
                      {sortState.key === "country" &&
                        (sortState.direction === "asc" ? "↑" : "↓")}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">City</th>
                <th className="px-4 py-3 text-left font-semibold">ASN</th>
                <th className="px-4 py-3 text-left font-semibold">Protocols</th>
                <th className="px-4 py-3 text-left font-semibold">Anonymity</th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("uptime")}
                    className="inline-flex items-center gap-1"
                  >
                    Uptime
                    <span className="text-[10px]">
                      {sortState.key === "uptime" &&
                        (sortState.direction === "asc" ? "↑" : "↓")}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("delay")}
                    className="inline-flex items-center gap-1"
                  >
                    Delay
                    <span className="text-[10px]">
                      {sortState.key === "delay" &&
                        (sortState.direction === "asc" ? "↑" : "↓")}
                    </span>
                  </button>
                </th>
                <th className="px-4 py-3 text-left font-semibold">
                  <button
                    type="button"
                    onClick={() => handleSort("last_seen")}
                    className="inline-flex items-center gap-1"
                  >
                    Freshness
                    <span className="text-[10px]">
                      {sortState.key === "last_seen" &&
                        (sortState.direction === "asc" ? "↑" : "↓")}
                    </span>
                  </button>
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-sand-100 dark:divide-sand-800">
              {sortedData.map((proxy) => {
                const key = `${proxy.ip}:${proxy.port}`;
                const ageSeconds = getFreshnessAgeSeconds(proxy.last_seen);
                return (
                  <tr
                    key={key}
                    className="transition-colors hover:bg-sand-50/70 dark:hover:bg-sand-800/60"
                    onClick={(event) => {
                      const target = event.target as HTMLElement;
                      if (target.closest("button") || target.closest("input")) {
                        return;
                      }
                      handleCopy(key);
                    }}
                    role="button"
                  >
                    <td className="px-4 py-3">
                      <input
                        type="checkbox"
                        checked={selectedKeys.has(key)}
                        onChange={() => toggleRow(key)}
                        aria-label={`Select proxy ${key}`}
                      />
                    </td>
                    <td className="px-4 py-3 font-mono text-xs">
                      <div className="flex items-center gap-2">
                        <span>{key}</span>
                        {copiedKey === key && (
                          <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-semibold text-emerald-700">
                            Copied
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <span className="text-lg">
                          {countryCodeToFlag(proxy.country_code)}
                        </span>
                        <div>
                          <div className="text-sm font-medium">
                            {proxy.country_name || proxy.country_code || "--"}
                          </div>
                          <div className="text-xs text-ink-muted dark:text-sand-400">
                            {proxy.country_code || ""}
                          </div>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted dark:text-sand-400">
                      {proxy.city || "--"}
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm font-medium">
                        {proxy.asn ? `AS${proxy.asn}` : "--"}
                      </div>
                      <div className="text-xs text-ink-muted dark:text-sand-400">
                        {proxy.org || proxy.asn_name || ""}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap gap-1">
                        {proxy.protocols.map((protocol) => (
                          <span
                            key={`${key}-${protocol}`}
                            className="rounded-full bg-ocean-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ocean-700 dark:bg-ocean-900/40 dark:text-ocean-300"
                          >
                            {protocol}
                          </span>
                        ))}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-sand-100 px-3 py-1 text-xs font-semibold text-ink-muted dark:bg-sand-800 dark:text-sand-300">
                        {ANONYMITY_LEVELS[proxy.anon] || proxy.anonymity_level}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex items-center gap-2">
                        <div className="h-2 w-16 overflow-hidden rounded-full bg-sand-200 dark:bg-sand-700">
                          <div
                            className="h-full rounded-full bg-emerald-500"
                            style={{ width: `${proxy.uptime}%` }}
                          />
                        </div>
                        <span className="text-xs text-ink-muted dark:text-sand-400">
                          {proxy.uptime}%
                        </span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-ink-muted dark:text-sand-400">
                      {proxy.delay ? `${proxy.delay} ms` : "--"}
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded-full px-3 py-1 text-xs font-semibold ${getFreshnessStyle(
                          ageSeconds,
                        )}`}
                      >
                        {formatRelativeTime(proxy.last_seen)}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div className="grid gap-3 md:hidden">
        {sortedData.map((proxy) => {
          const key = `${proxy.ip}:${proxy.port}`;
          const ageSeconds = getFreshnessAgeSeconds(proxy.last_seen);
          return (
            <div
              key={key}
              className="relative overflow-hidden rounded-2xl border border-sand-200 bg-white/90 p-4 shadow-sm transition-shadow active:shadow-md dark:border-sand-700 dark:bg-sand-900/80"
              onClick={(event) => {
                const target = event.target as HTMLElement;
                if (
                  target.closest("button") ||
                  target.closest("input") ||
                  target.closest("label")
                ) {
                  return;
                }
                handleCopy(key);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === " ") {
                  event.preventDefault();
                  handleCopy(key);
                }
              }}
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 flex-1">
                  <span className="text-xl flex-shrink-0">
                    {countryCodeToFlag(proxy.country_code)}
                  </span>
                  <div className="ml-3 min-w-0 flex-1">
                    <p className="font-mono text-sm font-semibold text-ink dark:text-sand-100 truncate">
                      {key}
                    </p>
                    <p className="mt-0.5 text-xs text-ink-muted dark:text-sand-400 truncate">
                      {proxy.country_name || proxy.country_code || "Unknown"}
                      {proxy.city && `, ${proxy.city}`}
                    </p>
                  </div>
                </div>
                <label className="flex-shrink-0 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={selectedKeys.has(key)}
                    onChange={() => toggleRow(key)}
                    aria-label={`Select proxy ${key}`}
                    className="h-5 w-5 rounded border-sand-300 text-ocean-600 focus:ring-ocean-500 dark:border-sand-600 dark:bg-sand-800"
                  />
                </label>
              </div>

              <div className="mt-3 flex flex-wrap gap-1.5">
                {proxy.protocols.map((protocol) => (
                  <span
                    key={`${key}-${protocol}`}
                    className="rounded-full bg-ocean-100 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-widest text-ocean-700 dark:bg-ocean-900/40 dark:text-ocean-300"
                  >
                    {protocol}
                  </span>
                ))}
                <span
                  className={`rounded-full px-2.5 py-1 text-[10px] font-semibold ${
                    ageSeconds <= 300
                      ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-400"
                      : ageSeconds <= 900
                        ? "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-400"
                        : "bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-400"
                  }`}
                >
                  {formatRelativeTime(proxy.last_seen)}
                </span>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2 text-xs">
                <div className="rounded-lg bg-sand-50 p-2 dark:bg-sand-800/50">
                  <p className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-sand-500">
                    Anonymity
                  </p>
                  <p className="mt-0.5 font-semibold text-ink dark:text-sand-200">
                    {ANONYMITY_LEVELS[proxy.anon] || proxy.anonymity_level}
                  </p>
                </div>
                <div className="rounded-lg bg-sand-50 p-2 dark:bg-sand-800/50">
                  <p className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-sand-500">
                    Uptime
                  </p>
                  <p className="mt-0.5 font-semibold text-ink dark:text-sand-200">
                    {proxy.uptime}%
                  </p>
                </div>
                <div className="rounded-lg bg-sand-50 p-2 dark:bg-sand-800/50">
                  <p className="text-[10px] uppercase tracking-wider text-ink-muted dark:text-sand-500">
                    Delay
                  </p>
                  <p className="mt-0.5 font-semibold text-ink dark:text-sand-200">
                    {proxy.delay ? `${proxy.delay}ms` : "--"}
                  </p>
                </div>
              </div>

              {proxy.asn && (
                <div className="mt-2 text-xs text-ink-muted dark:text-sand-400">
                  <span className="font-mono">AS{proxy.asn}</span>
                  {proxy.org && ` · ${proxy.org}`}
                </div>
              )}

              {copiedKey === key && (
                <div className="absolute bottom-2 right-2 rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white shadow-lg">
                  Copied!
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export const ProxyTable = memo(ProxyTableComponent);
