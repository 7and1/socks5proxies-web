import { redirect } from "next/navigation";

export default function LegacyConverterPage({
  searchParams,
}: {
  searchParams: Record<string, string | string[] | undefined>;
}) {
  const params = new URLSearchParams();
  Object.entries(searchParams).forEach(([key, value]) => {
    if (value === undefined) return;
    const item = Array.isArray(value) ? value[0] : value;
    if (item) params.set(key, item);
  });
  const suffix = params.toString() ? `?${params.toString()}` : "";
  redirect(`/tools/converter${suffix}`);
}
