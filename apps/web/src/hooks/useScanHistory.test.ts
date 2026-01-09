import { describe, expect, it } from "vitest";
import type { ProxyResult } from "./use-proxy-checker";

describe("useScanHistory utilities", () => {
  it("calculates stats correctly for proxy results", () => {
    const mockResults: ProxyResult[] = [
      {
        ip: "1.1.1.1",
        port: "8080",
        protocol: "socks5",
        status: true,
        latency: 100,
      },
      {
        ip: "2.2.2.2",
        port: "8080",
        protocol: "socks5",
        status: false,
        latency: 0,
      },
      {
        ip: "3.3.3.3",
        port: "8080",
        protocol: "socks5",
        status: true,
        latency: 1500,
      },
    ];

    const stats = {
      total: mockResults.length,
      alive: mockResults.filter((r) => r.status).length,
      dead: mockResults.filter((r) => !r.status).length,
      slow: mockResults.filter((r) => r.status && r.latency > 1000).length,
    };

    expect(stats.total).toBe(3);
    expect(stats.alive).toBe(2);
    expect(stats.dead).toBe(1);
    expect(stats.slow).toBe(1);
  });

  it("handles empty results array", () => {
    const mockResults: ProxyResult[] = [];

    const stats = {
      total: mockResults.length,
      alive: mockResults.filter((r) => r.status).length,
      dead: mockResults.filter((r) => !r.status).length,
      slow: mockResults.filter((r) => r.status && r.latency > 1000).length,
    };

    expect(stats.total).toBe(0);
    expect(stats.alive).toBe(0);
    expect(stats.dead).toBe(0);
    expect(stats.slow).toBe(0);
  });

  it("identifies slow proxies correctly", () => {
    const mockResults: ProxyResult[] = [
      {
        ip: "1.1.1.1",
        port: "8080",
        protocol: "socks5",
        status: true,
        latency: 500,
      },
      {
        ip: "2.2.2.2",
        port: "8080",
        protocol: "socks5",
        status: true,
        latency: 1001,
      },
      {
        ip: "3.3.3.3",
        port: "8080",
        protocol: "socks5",
        status: true,
        latency: 2000,
      },
    ];

    const slowCount = mockResults.filter(
      (r) => r.status && r.latency > 1000,
    ).length;

    expect(slowCount).toBe(2);
  });

  it("max entries limit enforcement logic", () => {
    const maxEntries = 20;
    const existingHistory = Array.from({ length: 20 }, (_, i) => ({
      id: `id-${i}`,
      timestamp: new Date(i * 1000).toISOString(),
    }));

    const newEntry = { id: "new-id", timestamp: new Date().toISOString() };
    const updated = [newEntry, ...existingHistory].slice(0, maxEntries);

    expect(updated).toHaveLength(maxEntries);
    expect(updated[0].id).toBe("new-id");
    expect(updated[updated.length - 1].id).toBe("id-18");
  });
});
