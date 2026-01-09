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
  });
  if (!res.ok) {
    throw new ApiError("Failed to load proxies", res.status);
  }
  return res.json();
}

export async function getProxyStats(): Promise<ProxyStatsResponse> {
  const res = await fetch(`${API_BASE}/api/proxies/stats`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError("Failed to load proxy stats", res.status);
  }
  return res.json();
}

export async function getRecentProxies(
  limit = 10,
): Promise<ProxyPreviewResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/proxies/recent${suffix}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError("Failed to load recent proxies", res.status);
  }
  return res.json();
}

export async function getRandomProxies(
  limit = 10,
): Promise<ProxyPreviewResponse> {
  const params = new URLSearchParams();
  if (limit) params.set("limit", String(limit));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/proxies/random${suffix}`, {
    cache: "no-store",
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
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/facets/${type}${suffix}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError("Failed to load facets", res.status);
  }
  const payload = (await res.json()) as FacetResponse;
  return payload.data ?? [];
}

export async function getFacetPage(
  type: "countries" | "ports" | "protocols" | "cities" | "regions" | "asns",
  options?: { limit?: number; offset?: number },
): Promise<FacetResponse> {
  const params = new URLSearchParams();
  if (options?.limit) params.set("limit", String(options.limit));
  if (options?.offset) params.set("offset", String(options.offset));
  const suffix = params.toString() ? `?${params.toString()}` : "";
  const res = await fetch(`${API_BASE}/api/facets/${type}${suffix}`, {
    cache: "no-store",
  });
  if (!res.ok) {
    throw new ApiError("Failed to load facets", res.status);
  }
  return (await res.json()) as FacetResponse;
}

export async function getASNDetails(asn: number): Promise<ASNDetails | null> {
  const res = await fetch(`${API_BASE}/api/asn/${asn}`, { cache: "no-store" });
  if (!res.ok) {
    throw new ApiError("Failed to load ASN details", res.status);
  }
  const payload = (await res.json()) as { data?: ASNDetails };
  return payload.data ?? null;
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
