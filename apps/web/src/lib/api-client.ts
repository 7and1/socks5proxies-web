import { headers } from "next/headers";
import { env } from "./env";
import type {
  ProxyResult,
  CheckRequest,
  CheckResponse,
  HealthResponse,
} from "./schemas";
import type {
  ProxyListResponse,
  FacetItem,
  ASNDetails,
  ProxyStatsResponse,
  ProxyPreviewResponse,
} from "../types/proxy";

interface FacetResponse {
  data: FacetItem[];
  meta?: {
    total: number;
    limit: number;
    offset: number;
  };
}

// In-memory request cache for short-term deduplication
interface CacheEntry<T> {
  data: T;
  timestamp: number;
  expiresAt: number;
}

const DEFAULT_CACHE_TTL = 5000; // 5 seconds
const MAX_CACHE_SIZE = 100;

class RequestCache {
  private cache = new Map<string, CacheEntry<unknown>>();
  private pendingRequests = new Map<string, Promise<unknown>>();

  set<T>(key: string, data: T, ttl: number = DEFAULT_CACHE_TTL): void {
    if (this.cache.size >= MAX_CACHE_SIZE) {
      this.evictOldest();
    }
    const now = Date.now();
    this.cache.set(key, { data, timestamp: now, expiresAt: now + ttl });
  }

  get<T>(key: string): T | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return entry.data as T;
  }

  // Deduplicate in-flight requests
  async dedupe<T>(key: string, fn: () => Promise<T>): Promise<T> {
    const cached = this.get<T>(key);
    if (cached) return cached;

    const existing = this.pendingRequests.get(key) as Promise<T> | undefined;
    if (existing) return existing;

    const promise = fn().finally(() => {
      this.pendingRequests.delete(key);
    });
    this.pendingRequests.set(key, promise);

    return promise;
  }

  private evictOldest(): void {
    let oldestKey: string | null = null;
    let oldestTimestamp = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    if (oldestKey) {
      this.cache.delete(oldestKey);
    }
  }

  clear(): void {
    this.cache.clear();
    this.pendingRequests.clear();
  }

  // Invalidate by pattern
  invalidate(pattern: string): void {
    const regex = new RegExp(pattern);
    for (const key of this.cache.keys()) {
      if (regex.test(key)) {
        this.cache.delete(key);
      }
    }
  }
}

export const requestCache = new RequestCache();

export class ApiError extends Error {
  constructor(
    public message: string,
    public status?: number,
    public code?: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

interface ApiResponse<T> {
  data?: T;
  error?: string;
  status: number;
}

interface FetchOptions extends RequestInit {
  timeout?: number;
  retries?: number;
  retryDelay?: number;
}

class ApiClient {
  private readonly baseUrl: string;
  private readonly defaultTimeout: number = 10000;
  private readonly defaultRetries: number = 3;
  private readonly defaultRetryDelay: number = 1000;

  constructor() {
    this.baseUrl = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");
  }

  private async fetchWithTimeout(
    url: string,
    options: FetchOptions = {},
  ): Promise<Response> {
    const {
      timeout = this.defaultTimeout,
      retries = this.defaultRetries,
      retryDelay = this.defaultRetryDelay,
      ...fetchOptions
    } = options;

    let lastError: Error | null = null;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);

        const response = await fetch(url, {
          ...fetchOptions,
          signal: controller.signal,
        });

        clearTimeout(timeoutId);

        return response;
      } catch (err) {
        lastError = err as Error;

        if (attempt < retries) {
          await new Promise((resolve) =>
            setTimeout(resolve, retryDelay * (attempt + 1)),
          );
        }
      }
    }

    throw lastError;
  }

  private async request<T>(
    endpoint: string,
    options: FetchOptions = {},
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    const headers = {
      "Content-Type": "application/json",
      ...options.headers,
    };

    try {
      const response = await this.fetchWithTimeout(url, {
        ...options,
        headers,
      });

      let data: unknown;
      const contentType = response.headers.get("content-type");

      if (contentType?.includes("application/json")) {
        data = await response.json();
      }

      if (!response.ok) {
        throw new ApiError(
          (data as { message?: string })?.message || response.statusText,
          response.status,
          (data as { code?: string })?.code,
        );
      }

      return {
        data: data as T,
        status: response.status,
      };
    } catch (err) {
      if (err instanceof ApiError) {
        throw err;
      }
      throw new ApiError(
        err instanceof Error ? err.message : "Unknown error occurred",
        undefined,
        "NETWORK_ERROR",
      );
    }
  }

  async get<T>(endpoint: string, options?: FetchOptions): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: "GET",
    });
    return response.data as T;
  }

  async post<T>(
    endpoint: string,
    body: unknown,
    options?: FetchOptions,
  ): Promise<T> {
    const response = await this.request<T>(endpoint, {
      ...options,
      method: "POST",
      body: JSON.stringify(body),
    });
    return response.data as T;
  }

  async checkProxies(
    request: CheckRequest,
    options?: FetchOptions,
  ): Promise<CheckResponse> {
    return this.post<CheckResponse>("/check", request, options);
  }

  async getHealth(options?: FetchOptions): Promise<HealthResponse> {
    return this.get<HealthResponse>("/health", options);
  }
}

export const apiClient = new ApiClient();

const API_BASE = env.NEXT_PUBLIC_API_URL.replace(/\/$/, "");

function getForwardHeaders(): HeadersInit | undefined {
  if (typeof window !== "undefined") return undefined;
  try {
    const incoming = headers();
    const cfConnectingIP = incoming.get("cf-connecting-ip");
    const xForwardedFor = incoming.get("x-forwarded-for");
    const forwardedIP =
      cfConnectingIP ||
      (xForwardedFor ? xForwardedFor.split(",")[0].trim() : "");
    if (!forwardedIP) return undefined;
    return { "CF-Connecting-IP": forwardedIP };
  } catch {
    return undefined;
  }
}

// Helper to build cache key from params
function buildCacheKey(
  prefix: string,
  params?: Record<string, string | number | undefined>,
): string {
  const sortedParams = params
    ? Object.entries(params)
        .filter(([_, v]) => v !== undefined && v !== null && v !== "")
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([k, v]) => `${k}=${v}`)
        .join("&")
    : "";
  return sortedParams ? `${prefix}:${sortedParams}` : prefix;
}

export async function getProxyList(params?: {
  country?: string;
  protocol?: string;
  port?: number;
  anonymity?: string;
  city?: string;
  region?: string;
  asn?: number;
  limit?: number;
  offset?: number;
}): Promise<ProxyListResponse> {
  const cacheKey = buildCacheKey("proxies", params);

  return requestCache.dedupe(cacheKey, async () => {
    const searchParams = new URLSearchParams();
    if (params?.country) searchParams.set("country", params.country);
    if (params?.protocol) searchParams.set("protocol", params.protocol);
    if (params?.port) searchParams.set("port", String(params.port));
    if (params?.anonymity) searchParams.set("anonymity", params.anonymity);
    if (params?.city) searchParams.set("city", params.city);
    if (params?.region) searchParams.set("region", params.region);
    if (params?.asn) searchParams.set("asn", String(params.asn));
    if (params?.limit) searchParams.set("limit", String(params.limit));
    if (params?.offset) searchParams.set("offset", String(params.offset));

    const res = await fetch(`${API_BASE}/api/proxies?${searchParams}`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load proxies", res.status);
    }
    const data = await res.json();
    // Cache for 10 seconds for proxy lists
    requestCache.set(cacheKey, data, 10000);
    return data;
  });
}

export async function getProxyStats(): Promise<ProxyStatsResponse> {
  const cacheKey = "stats:proxies";

  return requestCache.dedupe(cacheKey, async () => {
    const res = await fetch(`${API_BASE}/api/proxies/stats`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load proxy stats", res.status);
    }
    const data = await res.json();
    // Cache stats for 30 seconds
    requestCache.set(cacheKey, data, 30000);
    return data;
  });
}

export async function getRecentProxies(
  limit = 10,
): Promise<ProxyPreviewResponse> {
  const cacheKey = `proxies:recent:${limit}`;

  return requestCache.dedupe(cacheKey, async () => {
    const params = new URLSearchParams();
    if (limit) params.set("limit", String(limit));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/proxies/recent${suffix}`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load recent proxies", res.status);
    }
    const data = await res.json();
    // Cache for 30 seconds
    requestCache.set(cacheKey, data, 30000);
    return data;
  });
}

export async function getRandomProxies(
  limit = 10,
): Promise<ProxyPreviewResponse> {
  // Random proxies are not cached to ensure randomness
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/proxies/random${suffix}`, {
    cache: "no-store",
    headers: getForwardHeaders(),
  });
  if (!res.ok) {
    throw new ApiError("Failed to load random proxies", res.status);
  }
  return res.json();
}

export async function getFacets(
  type: "countries" | "ports" | "protocols" | "cities" | "regions" | "asns",
  options?: { limit?: number; offset?: number },
): Promise<FacetItem[]> {
  const cacheKey = buildCacheKey(`facets:${type}`, options);

  return requestCache.dedupe(cacheKey, async () => {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/facets/${type}${suffix}`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load facets", res.status);
    }
    const payload = (await res.json()) as FacetResponse;
    const data = payload.data ?? [];
    // Cache facets for 60 seconds
    requestCache.set(cacheKey, data, 60000);
    return data;
  });
}

export async function getFacetPage(
  type: "countries" | "ports" | "protocols" | "cities" | "regions" | "asns",
  options?: { limit?: number; offset?: number },
): Promise<FacetResponse> {
  const cacheKey = buildCacheKey(`facetPage:${type}`, options);

  return requestCache.dedupe(cacheKey, async () => {
    const params = new URLSearchParams();
    if (options?.limit) params.set("limit", String(options.limit));
    if (options?.offset) params.set("offset", String(options.offset));
    const suffix = params.toString() ? `?${params.toString()}` : "";
    const res = await fetch(`${API_BASE}/api/facets/${type}${suffix}`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load facets", res.status);
    }
    const data = (await res.json()) as FacetResponse;
    // Cache facet pages for 60 seconds
    requestCache.set(cacheKey, data, 60000);
    return data;
  });
}

export async function getASNDetails(asn: number): Promise<ASNDetails | null> {
  const cacheKey = `asn:${asn}`;

  return requestCache.dedupe(cacheKey, async () => {
    const res = await fetch(`${API_BASE}/api/asn/${asn}`, {
      cache: "no-store",
      headers: getForwardHeaders(),
    });
    if (!res.ok) {
      throw new ApiError("Failed to load ASN details", res.status);
    }
    const payload = (await res.json()) as { data?: ASNDetails };
    const data = payload.data ?? null;
    // Cache ASN details for 5 minutes
    if (data) {
      requestCache.set(cacheKey, data, 300000);
    }
    return data;
  });
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private readonly url: string;
  private reconnectAttempts: number = 0;
  private readonly maxReconnectAttempts: number = 5;
  private reconnectTimeout: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.url = env.NEXT_PUBLIC_WS_URL;
  }

  connect(
    onMessage: (data: ProxyResult | { status: string; error?: string }) => void,
    onError?: (error: Event) => void,
    onClose?: () => void,
  ): WebSocket {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return this.ws;
    }

    this.ws = new WebSocket(this.url);

    this.ws.onopen = () => {
      this.reconnectAttempts = 0;
    };

    this.ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        onMessage(data);
      } catch {
        onMessage({ status: "error", error: "Invalid response format" });
      }
    };

    this.ws.onerror = (error) => {
      onError?.(error);
    };

    this.ws.onclose = () => {
      onClose?.();
      this.handleReconnect(onMessage, onError, onClose);
    };

    return this.ws;
  }

  private handleReconnect(
    onMessage: (data: ProxyResult | { status: string; error?: string }) => void,
    onError?: (error: Event) => void,
    onClose?: () => void,
  ): void {
    if (
      this.reconnectAttempts < this.maxReconnectAttempts &&
      !this.reconnectTimeout
    ) {
      this.reconnectAttempts++;
      const delay = Math.min(1000 * Math.pow(2, this.reconnectAttempts), 30000);

      this.reconnectTimeout = setTimeout(() => {
        this.reconnectTimeout = null;
        this.connect(onMessage, onError, onClose);
      }, delay);
    }
  }

  send(data: unknown): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  close(): void {
    if (this.reconnectTimeout) {
      clearTimeout(this.reconnectTimeout);
      this.reconnectTimeout = null;
    }

    if (this.ws) {
      this.reconnectAttempts = this.maxReconnectAttempts;
      this.ws.close();
      this.ws = null;
    }
  }

  get isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }
}

export function createWebSocketConnection(): WebSocketClient {
  return new WebSocketClient();
}
