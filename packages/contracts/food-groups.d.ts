import type { Restaurant } from "./index";
export declare function matchesFoodGroup(
  restaurant: Pick<Restaurant, "category" | "categories" | "menu">,
  category: string,
): boolean;
