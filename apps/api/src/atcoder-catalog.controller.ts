import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Post, Put, Res } from "@nestjs/common";
import { existsSync } from "node:fs";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";

type FileResponse = {
  sendFile(path: string): unknown;
};

@Controller("atcoder-catalog")
export class AtCoderCatalogController {
  constructor(@Inject(AtCoderCatalogService) private readonly atCoderCatalogService: AtCoderCatalogService) {}

  @Get()
  async getCatalog() {
    return this.atCoderCatalogService.getCatalog();
  }

  @Get("problems/:id")
  async getProblem(@Param("id") id: string) {
    const problem = await this.atCoderCatalogService.getProblem(id);
    if (!problem) {
      throw new NotFoundException(`AtCoder problem ${id} not found`);
    }
    return problem;
  }

  @Post("problems")
  async createProblem(@Body() body: Record<string, unknown>) {
    return this.atCoderCatalogService.createProblem(body);
  }

  @Put("problems/:id")
  async updateProblem(@Param("id") id: string, @Body() body: Record<string, unknown>) {
    const problem = await this.atCoderCatalogService.updateProblem(id, body);
    if (!problem) {
      throw new NotFoundException(`AtCoder problem ${id} not found`);
    }
    return problem;
  }

  @Delete("problems/:id")
  async deleteProblem(@Param("id") id: string) {
    const deleted = await this.atCoderCatalogService.deleteProblem(id);
    if (!deleted) {
      throw new NotFoundException(`AtCoder problem ${id} not found`);
    }
    return { deleted: true };
  }

  @Get("assets/:filename")
  getAsset(@Param("filename") filename: string, @Res() response: FileResponse) {
    const assetPath = this.atCoderCatalogService.resolveAssetPath(filename);
    if (!assetPath || !existsSync(assetPath)) {
      throw new NotFoundException(`AtCoder asset ${filename} not found`);
    }
    return response.sendFile(assetPath);
  }
}
