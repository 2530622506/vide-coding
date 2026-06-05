import { Module } from "@nestjs/common";
import { AtCoderCatalogController } from "./atcoder-catalog.controller.js";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  controllers: [AtCoderCatalogController, CatalogController],
  providers: [AtCoderCatalogService, CatalogService]
})
export class AppModule {}
