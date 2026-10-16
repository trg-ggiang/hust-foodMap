import "server-only";
import { cache } from "react";
import type { DataEnvelope, Restaurant } from "@hust-foodmap/contracts";

// Keep the private backend address on the server. Browser retries use /api.
export const getRestaurantCatalog = cache(
  async (): Promise<Restaurant[] | null> => {
    const origin = (
      process.env.API_INTERNAL_URL || "http://127.0.0.1:3000"
    ).replace(/\/$/, "");

    try {
      const response = await fetch(`${origin}/api/restaurants`, {
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        headers: { Accept: "application/json" },
      });
      if (!response.ok) return null;
      const catalog: DataEnvelope<Restaurant[]> = await response.json();
      return Array.isArray(catalog.data) ? catalog.data : null;
    } catch {
      // An unavailable API is recoverable from the rendered client error state.
      return null;
    }
  },
);
