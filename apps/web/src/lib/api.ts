import type { DataEnvelope, Restaurant } from "@hust-foodmap/contracts";
const base = (process.env.NEXT_PUBLIC_API_URL || "/api").replace(/\/$/, "");
export async function loadRestaurants(
  signal?: AbortSignal,
): Promise<DataEnvelope<Restaurant[]>> {
  const response = await fetch(`${base}/restaurants`, {
    signal: signal
      ? AbortSignal.any([signal, AbortSignal.timeout(10000)])
      : AbortSignal.timeout(10000),
    cache: "no-store",
    headers: { Accept: "application/json" },
  });
  if (!response.ok) throw new Error(`Restaurant API: ${response.status}`);
  const envelope: DataEnvelope<Restaurant[]> = await response.json();
  if (!Array.isArray(envelope.data))
    throw new Error("Invalid restaurant response");
  return envelope;
}
