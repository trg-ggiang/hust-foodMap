import { Controller, Get, Param, Query } from "@nestjs/common";
import { RestaurantsService } from "./restaurants.service";
import { RestaurantQueryDto } from "./restaurant-query.dto";
@Controller("restaurants")
export class RestaurantsController {
  constructor(private readonly restaurants: RestaurantsService) {}
  @Get() list(@Query() query: RestaurantQueryDto) {
    return this.restaurants.list(query);
  }
  @Get(":id") get(@Param("id") id: string) {
    return this.restaurants.get(id);
  }
}
