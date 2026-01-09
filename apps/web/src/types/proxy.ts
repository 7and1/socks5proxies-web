export interface ProxyData {
  host: string;
  ip: string;
  port: number;
  delay: number;
  country_code: string;
  country_name: string;
  city?: string;
  region?: string;
  asn?: number;
  asn_name?: string;
  org?: string;
  continent_code?: string;
  anon: number;
  http: number;
  ssl: number;
  socks4: number;
  socks5: number;
  protocols: string[];
  anonymity_level: string;
  uptime: number;
  checks_up: number;
  checks_down: number;
  last_seen?: string;
}

export interface ProxyListResponse {
  data: ProxyData[];
  meta: {
    total: number;
    limit: number;
    offset: number;
    cached: boolean;
    cache_age: number;
  };
}

export interface ProxyPreviewResponse {
  data: ProxyData[];
  meta?: {
    limit?: number;
    cached?: boolean;
    cache_age?: number;
    last_sync?: string;
  };
}

export interface ProxyStats {
  total: number;
  countries: number;
  avg_uptime: number;
  protocols: {
    http: number;
    https: number;
    socks4: number;
    socks5: number;
  };
}

export interface ProxyStatsResponse {
  data: ProxyStats;
  meta?: {
    cached?: boolean;
    cache_age?: number;
    last_sync?: string;
  };
}

export interface FacetItem {
  key: string;
  count: number;
  avg_delay?: number;
  metadata?: {
    name?: string;
    country_code?: string;
    country_name?: string;
    org?: string;
  };
}

export interface ASNDetails {
  asn: number;
  name?: string;
  org?: string;
  count: number;
  avg_delay: number;
  countries: Array<{
    code: string;
    name?: string;
    count: number;
    avg_delay: number;
  }>;
  protocols: {
    http: number;
    https: number;
    socks4: number;
    socks5: number;
  };
}
