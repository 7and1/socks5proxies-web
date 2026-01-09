"use client";

import { useCallback, useEffect, useState } from "react";
import type { ProxyResult } from "./use-proxy-checker";

export interface ScanHistoryEntry {
  id: string;
  timestamp: string;
  results: ProxyResult[];
  stats: {
    total: number;
    alive: number;
    dead: number;
    slow: number;
  };
}

const STORAGE_KEY = "socks5_scan_history";
const MAX_ENTRIES = 20;

export function useScanHistory() {
  const [history, setHistory] = useState<ScanHistoryEntry[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) {
        setHistory(JSON.parse(stored));
      }
    } catch {
      setHistory([]);
    }
  }, []);

  const addEntry = useCallback(
    (results: ProxyResult[]) => {
      if (results.length === 0) return;

      const stats = {
        total: results.length,
        alive: results.filter((r) => r.status).length,
        dead: results.filter((r) => !r.status).length,
        slow: results.filter((r) => r.status && r.latency > 1000).length,
      };

      const entry: ScanHistoryEntry = {
        id: crypto.randomUUID(),
        timestamp: new Date().toISOString(),
        results,
        stats,
      };

      const updated = [entry, ...history].slice(0, MAX_ENTRIES);
      setHistory(updated);

      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage might be full or disabled
      }
    },
    [history],
  );

  const clearHistory = useCallback(() => {
    setHistory([]);
    try {
      localStorage.removeItem(STORAGE_KEY);
    } catch {
      // Storage might be disabled
    }
  }, []);

  const removeEntry = useCallback(
    (id: string) => {
      const updated = history.filter((entry) => entry.id !== id);
      setHistory(updated);
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
      } catch {
        // Storage might be disabled
      }
    },
    [history],
  );

  return { history, addEntry, clearHistory, removeEntry };
}
