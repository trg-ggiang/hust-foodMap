import { Controller, Get, Module } from "@nestjs/common";
import { RestaurantsModule } from "./restaurants/restaurants.module";
@Controller("health")
class HealthController {
  @Get() health() {
    return { status: "ok", service: "hust-foodmap-api", dataSource: "sample" };
  }
}
@Module({ imports: [RestaurantsModule], controllers: [HealthController] })
export class AppModule {}
