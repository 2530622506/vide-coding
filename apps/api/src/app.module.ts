import { Module } from "@nestjs/common";
import { AtCoderCatalogController } from "./atcoder-catalog.controller.js";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";
import { CodeRunController } from "./code-run.controller.js";
import { CodeRunService } from "./code-run.service.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";

@Module({
  controllers: [AtCoderCatalogController, CatalogController, CodeRunController],
  providers: [AtCoderCatalogService, CatalogService, CodeRunService]
})
export class AppModule {}
