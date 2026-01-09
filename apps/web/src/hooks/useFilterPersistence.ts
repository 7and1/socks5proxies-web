"use client";

import { useCallback, useEffect, useState } from "react";

const LATENCY_KEY = "socks5_latency_threshold";
const COUNTRY_KEY = "socks5_country_filter";

const DEFAULT_LATENCY = 1000;
const DEFAULT_COUNTRY = "";

export function useFilterPersistence() {
  const [latencyThreshold, setLatencyThreshold] = useState(DEFAULT_LATENCY);
  const [countryFilter, setCountryFilter] = useState(DEFAULT_COUNTRY);

  useEffect(() => {
    try {
      const storedLatency = localStorage.getItem(LATENCY_KEY);
      const storedCountry = localStorage.getItem(COUNTRY_KEY);
      if (storedLatency) setLatencyThreshold(Number(storedLatency));
      if (storedCountry) setCountryFilter(storedCountry);
    } catch {
      // Storage might be disabled
    }
  }, []);

  const updateLatencyThreshold = useCallback((value: number) => {
    setLatencyThreshold(value);
    try {
      localStorage.setItem(LATENCY_KEY, String(value));
    } catch {
      // Storage might be disabled
    }
  }, []);

  const updateCountryFilter = useCallback((value: string) => {
    setCountryFilter(value);
    try {
      localStorage.setItem(COUNTRY_KEY, value);
    } catch {
      // Storage might be disabled
    }
  }, []);

  const clearFilters = useCallback(() => {
    setLatencyThreshold(DEFAULT_LATENCY);
    setCountryFilter(DEFAULT_COUNTRY);
    try {
      localStorage.removeItem(LATENCY_KEY);
      localStorage.removeItem(COUNTRY_KEY);
    } catch {
      // Storage might be disabled
    }
  }, []);

  return {
    latencyThreshold,
    countryFilter,
    setLatencyThreshold: updateLatencyThreshold,
    setCountryFilter: updateCountryFilter,
    clearFilters,
  };
}
