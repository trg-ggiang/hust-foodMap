import { CatalogClient } from "@/features/discovery/components/catalog-client";
import { getRestaurantCatalog } from "@/lib/server/restaurants";

// Fetch at request time so a build never depends on a running NestJS process.
export const dynamic = "force-dynamic";

export default async function DiscoveryPage() {
  const restaurants = await getRestaurantCatalog();
  return <CatalogClient initialRestaurants={restaurants} />;
}
