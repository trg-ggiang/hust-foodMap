import type { Restaurant } from "@hust-foodmap/contracts";
import { matchesFoodGroup } from "@hust-foodmap/contracts/food-groups";

export type View = "explore" | "saved" | "plans";

export interface Filters {
  budget: number;
  walk: number;
  available: number;
  rating: number;
  open: boolean;
  quiet: boolean;
  amenity: string;
}

export interface DiscoveryQueryState {
  query: string;
  category: string;
  view: View;
  sort: string;
  filters: Filters;
  origin: number;
  returnOrigin: number;
  selected: string | null;
}

export const defaultFilters: Filters = {
  budget: 100000,
  walk: 0,
  available: 0,
  rating: 0,
  open: false,
  quiet: false,
  amenity: "",
};

export const discoveryCategories = [
  "Tất cả", "Cơm", "Bún & phở", "Ăn nhanh", "Ăn chay", "Đồ uống",
] as const;

const sorts = ["match", "rating", "price", "walk", "fast"];
const amenities = ["Điều hòa", "Chỗ để xe", "Mang về"];

export function createDefaultDiscoveryQuery(): DiscoveryQueryState {
  return {
    query: "", category: "Tất cả", view: "explore", sort: "match",
    filters: { ...defaultFilters }, origin: 0, returnOrigin: 0, selected: null,
  };
}

/** Only known filter values and restaurant IDs may enter state through a URL. */
export function parseDiscoveryQuery(
  search: string,
  restaurantIds: readonly string[] = [],
): DiscoveryQueryState {
  const params = new URLSearchParams(search);
  const state = createDefaultDiscoveryQuery();
  const numeric = (key: string, allowed: readonly number[], fallback: number) => {
    const raw = params.get(key);
    const value = Number(raw);
    return raw !== null && raw.trim() !== "" && allowed.includes(value)
      ? value
      : fallback;
  };
  const category = params.get("category");
  const view = params.get("view");
  const sort = params.get("sort");
  const selected = params.get("restaurant");
  const amenity = params.get("amenity");
  state.query = params.get("q") || "";
  if (category && discoveryCategories.some((name) => name === category))
    state.category = category;
  if (view === "saved" || view === "plans") state.view = view;
  if (sort && sorts.includes(sort)) state.sort = sort;
  if (selected && restaurantIds.includes(selected)) state.selected = selected;
  state.filters = {
    budget: numeric("budget", Array.from({ length: 17 }, (_, i) => 20000 + i * 5000), defaultFilters.budget),
    walk: numeric("walk", [0, 5, 10, 15], defaultFilters.walk),
    available: numeric("time", [0, 30, 45, 60, 90], defaultFilters.available),
    rating: numeric("rating", [0, 4.5, 4.7], defaultFilters.rating),
    open: params.get("open") === "true",
    quiet: params.get("quiet") === "true",
    amenity: amenity && amenities.includes(amenity) ? amenity : "",
  };
  state.origin = numeric("origin", [0, 1, 2], 0);
  state.returnOrigin = numeric("return", [0, 1, 2], 0);
  return state;
}

/** Canonical query string, without a leading question mark or default values. */
export function serializeDiscoveryQuery(state: DiscoveryQueryState): string {
  const params = new URLSearchParams();
  if (state.query) params.set("q", state.query);
  if (state.category !== "Tất cả") params.set("category", state.category);
  if (state.selected) params.set("restaurant", state.selected);
  if (state.view !== "explore") params.set("view", state.view);
  if (state.sort !== "match") params.set("sort", state.sort);
  for (const key of ["budget", "walk", "rating"] as const)
    if (state.filters[key] !== defaultFilters[key])
      params.set(key, String(state.filters[key]));
  if (state.filters.available !== defaultFilters.available)
    params.set("time", String(state.filters.available));
  if (state.filters.open) params.set("open", "true");
  if (state.filters.quiet) params.set("quiet", "true");
  if (state.filters.amenity) params.set("amenity", state.filters.amenity);
  if (state.origin) params.set("origin", String(state.origin));
  if (state.returnOrigin) params.set("return", String(state.returnOrigin));
  return params.toString();
}

export function getActiveFilterCount(filters: Filters): number {
  return Number(filters.budget < defaultFilters.budget)
    + Number(filters.walk > 0)
    + Number(filters.available > 0)
    + Number(filters.rating > 0)
    + Number(filters.open)
    + Number(filters.quiet)
    + Number(Boolean(filters.amenity));
}

export function getWalkingMinutes(restaurant: Restaurant, origin: number, position?: [number, number] | null): number {
  if (position) {
    const rad = (n: number) => n * Math.PI / 180;
    const [lng, lat] = position;
    const [toLng, toLat] = restaurant.coordinate;
    const a = Math.sin(rad(toLat - lat) / 2) ** 2 + Math.cos(rad(lat)) * Math.cos(rad(toLat)) * Math.sin(rad(toLng - lng) / 2) ** 2;
    const metres = 6371000 * 2 * Math.asin(Math.sqrt(Math.min(1, a)));
    // Straight-line estimate at 80 m/min; not a routed walking itinerary.
    return Math.max(1, Math.ceil(metres / 80));
  }
  return Math.max(1, restaurant.walk + (origin === 1 ? 2 : origin === 2 ? 1 : 0));
}

export function getMealMinutes(
  restaurant: Restaurant,
  origin: number,
  returnOrigin: number,
  position?: [number, number] | null,
): number {
  return getWalkingMinutes(restaurant, origin, position) + restaurant.walk
    + restaurant.wait + 20 + (returnOrigin === 1 ? 2 : returnOrigin === 2 ? 1 : 0);
}

function normalizeText(value: string): string {
  return value.normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d").toLowerCase();
}

export function selectDiscoveryRestaurants(
  restaurants: readonly Restaurant[],
  state: DiscoveryQueryState,
  options: {
    savedIds?: readonly string[];
    position?: [number, number] | null;
    bounds?: { contains(coordinate: [number, number]): boolean } | null;
  } = {},
): Restaurant[] {
  const query = normalizeText(state.query);
  const saved = new Set(options.savedIds);
  const { filters, origin, returnOrigin } = state;
  return restaurants.filter((restaurant) =>
    (state.view !== "saved" || saved.has(restaurant.id))
    && matchesFoodGroup(restaurant, state.category)
    && (!query || normalizeText(
      `${restaurant.name} ${restaurant.category} ${restaurant.categories?.join(" ") ?? ""} ${restaurant.address} ${restaurant.menu.map((item) => item.name).join(" ")}`,
    ).includes(query))
    && restaurant.price <= filters.budget
    && (!filters.walk || getWalkingMinutes(restaurant, origin, options.position) <= filters.walk)
    && (!filters.available || getMealMinutes(restaurant, origin, returnOrigin, options.position) <= filters.available)
    && restaurant.rating >= filters.rating
    && (!filters.open || restaurant.open)
    && (!filters.quiet || restaurant.crowd === "Vắng")
    && (!filters.amenity || restaurant.amenities.includes(filters.amenity))
    && (!options.bounds || options.bounds.contains(restaurant.coordinate)),
  ).sort((a, b) => {
    switch (state.sort) {
      case "price": return a.price - b.price;
      case "walk": return getWalkingMinutes(a, origin, options.position) - getWalkingMinutes(b, origin, options.position);
      case "fast": return getMealMinutes(a, origin, returnOrigin, options.position) - getMealMinutes(b, origin, returnOrigin, options.position);
      default: return b.rating - a.rating;
    }
  });
}
