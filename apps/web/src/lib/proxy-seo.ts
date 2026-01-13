import type { Metadata } from "next";
import { MIN_PROXIES_FOR_PAGE } from "../config/proxy-constants";
import { getProxyList } from "./api-client";

export async function getProxyListRobots(filters: {
  country?: string;
  protocol?: string;
  port?: number;
  anonymity?: string;
  city?: string;
  region?: string;
  asn?: number;
}): Promise<Metadata["robots"] | undefined> {
  const response = await getProxyList({
    ...filters,
    limit: 1,
    offset: 0,
  }).catch(() => null);
  const total = response?.meta?.total;
  if (typeof total !== "number") {
    return undefined;
  }
  if (total < MIN_PROXIES_FOR_PAGE) {
    return { index: false, follow: true };
  }
  return undefined;
}
