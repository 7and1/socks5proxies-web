export const ANONYMITY_LEVELS: Record<number, string> = {
  0: "Transparent",
  1: "Transparent",
  2: "Anonymous",
  3: "Anonymous",
  4: "Elite",
  5: "Elite",
};

export const ANONYMITY_GROUPS = {
  elite: [4, 5],
  anonymous: [2, 3],
  transparent: [0, 1],
} as const;

export const PROTOCOLS = [
  { slug: "http", name: "HTTP", key: "http" },
  { slug: "https", name: "HTTPS", key: "ssl" },
  { slug: "socks4", name: "SOCKS4", key: "socks4" },
  { slug: "socks5", name: "SOCKS5", key: "socks5" },
] as const;

export const COMMON_PORTS = [80, 443, 1080, 3128, 4145, 5555, 8080, 9090, 9999];

export const SPEED_THRESHOLDS = {
  fast: 500,
  medium: 2000,
  slow: 5000,
};

export const DEFAULT_PAGE_SIZE = 25;
export const MAX_PAGE_SIZE = 100;

export const SITEMAP_MAX_URLS = 50_000;
export const MIN_PROXIES_FOR_PAGE = 10;
