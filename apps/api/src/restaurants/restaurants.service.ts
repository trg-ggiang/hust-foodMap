import { Injectable, NotFoundException } from "@nestjs/common";
import type { DataEnvelope, Restaurant } from "@hust-foodmap/contracts";
import { matchesFoodGroup } from "@hust-foodmap/contracts/food-groups";
import { restaurants } from "./restaurant.fixtures";
import { RestaurantQueryDto } from "./restaurant-query.dto";
const normalize = (value: string) =>
  value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/gi, "d")
    .toLowerCase();
@Injectable()
export class RestaurantsService {
  list(query: RestaurantQueryDto): DataEnvelope<Restaurant[]> {
    const q = normalize(query.q || "");
    return {
      source: "sample",
      updatedAt: null,
      data: restaurants.filter(
        (r) =>
          (!q ||
            normalize(
              `${r.name} ${r.category} ${r.categories?.join(" ") ?? ""} ${r.address} ${r.menu.map((m) => m.name).join(" ")}`,
            ).includes(q)) &&
          (!query.category || matchesFoodGroup(r, query.category)) &&
          (query.maxPrice === undefined || r.price <= query.maxPrice) &&
          (query.openOnly !== "true" || r.open),
      ),
    };
  }
  get(id: string): DataEnvelope<Restaurant> {
    const restaurant = restaurants.find((r) => r.id === id);
    if (!restaurant) throw new NotFoundException("Restaurant not found");
    return { data: restaurant, source: "sample", updatedAt: null };
  }
}
