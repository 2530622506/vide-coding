import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post } from "@nestjs/common";
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

  @Post("problems")
  createProblem(@Body() body: unknown) {
    return this.catalogService.createProblem(body);
  }

  @Patch("problems/:id")
  updateProblem(@Param("id") id: string, @Body() body: unknown) {
    return this.catalogService.updateProblem(id, body).then((problem) => {
      if (!problem) {
        throw new NotFoundException(`Problem ${id} not found`);
      }
      return problem;
    });
  }

  @Delete("problems/:id")
  deleteProblem(@Param("id") id: string) {
    return this.catalogService.deleteProblem(id).then((deleted) => {
      if (!deleted) {
        throw new NotFoundException(`Problem ${id} not found`);
      }
      return { deleted: true, id };
    });
  }

  @Get("review-queue/summary")
  getReviewQueueSummary() {
    return this.catalogService.getReviewQueueSummary();
  }
}
