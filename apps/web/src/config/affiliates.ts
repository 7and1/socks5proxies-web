export type AffiliateProvider =
  | "brightdata"
  | "oxylabs"
  | "smartproxy"
  | "iproyal"
  | "proxySeller";

const affiliateIds = {
  brightdata: process.env.NEXT_PUBLIC_AFFILIATE_BRIGHTDATA ?? "",
  oxylabs: process.env.NEXT_PUBLIC_AFFILIATE_OXYLABS ?? "",
  smartproxy: process.env.NEXT_PUBLIC_AFFILIATE_SMARTPROXY ?? "",
  iproyal: process.env.NEXT_PUBLIC_AFFILIATE_IPROYAL ?? "",
  proxySeller: process.env.NEXT_PUBLIC_AFFILIATE_PROXYSELLER ?? "",
} as const;

const buildAffiliateLink = (base: string, param: string, id: string) => {
  if (!id) return base;
  try {
    const url = new URL(base);
    url.searchParams.set(param, id);
    return url.toString();
  } catch {
    return `${base}?${param}=${encodeURIComponent(id)}`;
  }
};

export const affiliateLinks: Record<AffiliateProvider, string> = {
  brightdata: buildAffiliateLink(
    "https://brightdata.com/",
    "ref",
    affiliateIds.brightdata,
  ),
  oxylabs: buildAffiliateLink(
    "https://oxylabs.io/",
    "ref",
    affiliateIds.oxylabs,
  ),
  smartproxy: buildAffiliateLink(
    "https://smartproxy.com/",
    "af",
    affiliateIds.smartproxy,
  ),
  iproyal: buildAffiliateLink(
    "https://iproyal.com/",
    "ref",
    affiliateIds.iproyal,
  ),
  proxySeller: buildAffiliateLink(
    "https://proxy-seller.com/",
    "ref",
    affiliateIds.proxySeller,
  ),
};
