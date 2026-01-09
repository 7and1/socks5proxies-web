"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { env } from "../lib/env";

export interface ProxyResult {
  ip: string;
  port: string;
  protocol: string;
  status: boolean;
  latency: number;
  country?: string;
  anonymity?: string;
  error?: string;
  checkedAt?: string;
}

// Performance: Batch state updates to reduce re-renders
const BATCH_SIZE = 20;
const BATCH_INTERVAL = 100; // ms

export function useProxyChecker() {
  const [results, setResults] = useState<ProxyResult[]>([]);
  const [isScanning, setIsScanning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [totalProxies, setTotalProxies] = useState(0);
  const ws = useRef<WebSocket | null>(null);
  const isPausedRef = useRef(isPaused);
  const resultBuffer = useRef<ProxyResult[]>([]);
  const batchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Keep ref in sync with state to avoid stale closure
  useEffect(() => {
    isPausedRef.current = isPaused;
  }, [isPaused]);

  const progress =
    totalProxies > 0 ? Math.round((results.length / totalProxies) * 100) : 0;

  // Performance: Flush batched results to state
  const flushResults = useCallback(() => {
    if (resultBuffer.current.length > 0) {
      const toFlush = [...resultBuffer.current];
      resultBuffer.current = [];
      setResults((prev) => [...prev, ...toFlush]);
    }
  }, []);

  // Cleanup batch timer and WebSocket on unmount
  useEffect(() => {
    return () => {
      if (batchTimer.current) {
        clearTimeout(batchTimer.current);
      }
      if (ws.current) {
        ws.current.close();
        ws.current = null;
      }
    };
  }, []);

  const startScan = useCallback((proxies: string[]) => {
    if (ws.current) {
      ws.current.close();
    }

    // Clear any pending batch
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
    resultBuffer.current = [];

    setIsScanning(true);
    setIsPaused(false);
    setResults([]);
    setError(null);
    setTotalProxies(proxies.length);

    ws.current = new WebSocket(env.NEXT_PUBLIC_WS_URL);

    ws.current.onopen = () => {
      ws.current?.send(JSON.stringify({ proxies }));
    };

    ws.current.onmessage = (event) => {
      // Use ref to get current pause state
      if (isPausedRef.current) return;

      try {
        const payload = JSON.parse(event.data) as
          | ProxyResult
          | { status?: string; error?: string };
        if (payload && "status" in payload && payload.status === "done") {
          // Flush any remaining results
          if (resultBuffer.current.length > 0) {
            const toFlush = [...resultBuffer.current];
            resultBuffer.current = [];
            setResults((prev) => [...prev, ...toFlush]);
          }
          setIsScanning(false);
          setIsPaused(false);
          ws.current?.close();
          return;
        }
        if (payload && "error" in payload) {
          setError(payload.error || "Scan failed.");
          setIsScanning(false);
          setIsPaused(false);
          return;
        }

        // Performance: Batch results to reduce re-renders
        resultBuffer.current.push(payload as ProxyResult);

        if (resultBuffer.current.length >= BATCH_SIZE) {
          const toFlush = [...resultBuffer.current];
          resultBuffer.current = [];
          setResults((prev) => [...prev, ...toFlush]);
        } else if (!batchTimer.current) {
          batchTimer.current = setTimeout(() => {
            if (resultBuffer.current.length > 0) {
              const toFlush = [...resultBuffer.current];
              resultBuffer.current = [];
              setResults((prev) => [...prev, ...toFlush]);
            }
            batchTimer.current = null;
          }, BATCH_INTERVAL);
        }
      } catch {
        setError("Invalid response from server.");
      }
    };

    ws.current.onerror = () => {
      setError("WebSocket connection failed.");
      setIsScanning(false);
      setIsPaused(false);
    };

    ws.current.onclose = () => {
      setIsScanning(false);
      setIsPaused(false);
    };
  }, []);

  const stopScan = useCallback(() => {
    if (batchTimer.current) {
      clearTimeout(batchTimer.current);
      batchTimer.current = null;
    }
    // Flush remaining results
    if (resultBuffer.current.length > 0) {
      const toFlush = [...resultBuffer.current];
      resultBuffer.current = [];
      setResults((prev) => [...prev, ...toFlush]);
    }
    ws.current?.close();
    setIsScanning(false);
    setIsPaused(false);
  }, []);

  const pauseScan = useCallback(() => {
    setIsPaused(true);
  }, []);

  const resumeScan = useCallback(() => {
    setIsPaused(false);
  }, []);

  return {
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
  };
}
