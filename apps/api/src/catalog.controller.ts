import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get("levels")
  getLevels() {
    return this.catalogService.getLevels();
  }

  @Get("levels/:level")
  getLevelCatalog(@Param("level") levelParam: string) {
    const level = Number(levelParam);
    return this.catalogService.getLevelCatalog(level).then((catalog) => {
      if (!catalog) {
        throw new NotFoundException(`Level ${levelParam} catalog not found`);
      }
      return catalog;
    });
  }

  @Get("problems/:id")
  getProblem(@Param("id") id: string) {
    return this.catalogService.getProblem(id).then((problem) => {
      if (!problem) {
        throw new NotFoundException(`Problem ${id} not found`);
      }
      return problem;
    });
  }

  @Get("review-queue/summary")
  getReviewQueueSummary() {
    return this.catalogService.getReviewQueueSummary();
  }
}
