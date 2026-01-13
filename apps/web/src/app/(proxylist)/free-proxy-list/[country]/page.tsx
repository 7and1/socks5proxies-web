import { redirect } from "next/navigation";

export default function LegacyCountryProxyListPage({
  params,
  searchParams,
}: {
  params: { country: string };
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const paramsObj = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    const item = Array.isArray(value) ? value[0] : value;
    if (item) paramsObj.set(key, item);
  });
  const suffix = paramsObj.toString() ? `?${paramsObj.toString()}` : "";
  redirect(`/free-proxy-list/country/${params.country}${suffix}`);
}
