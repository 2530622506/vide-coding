import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";

type AssetProxyResponse = {
  setHeader(name: string, value: string): unknown;
  status(code: number): AssetProxyResponse;
  send(body: string | Uint8Array): unknown;
};

@Controller("catalog")
export class CatalogController {
  constructor(@Inject(CatalogService) private readonly catalogService: CatalogService) {}

  @Get("levels")
  getLevels() {
    return this.catalogService.getLevels();
  }

  @Get("levels/:level")
  getLevelCatalog(@Param("level") levelParam: string, @Query("question_type") questionType?: string, @Query("source_kind") sourceKind?: string) {
    const level = Number(levelParam);
    return this.catalogService.getLevelCatalog(level, questionType, sourceKind).then((catalog) => {
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

  @Get("review-queue")
  getReviewQueue() {
    return this.catalogService.getReviewQueue();
  }

  @Post("review-queue/:id/actions")
  applyReviewAction(@Param("id") id: string, @Body() body: unknown) {
    return this.catalogService.applyReviewAction(id, body).then((result) => {
      if (!result) {
        throw new NotFoundException(`Review item ${id} not found`);
      }
      return result;
    });
  }

  @Get("audit/summary")
  getAuditSummary() {
    return this.catalogService.getAuditSummary();
  }

  @Get("audit/events")
  getAuditEvents() {
    return this.catalogService.getAuditEvents();
  }

  @Get("assets/remote")
  async getRemoteAsset(@Query("url") assetUrl: string | undefined, @Res() response: AssetProxyResponse) {
    const normalizedUrl = normalizeRemoteAssetUrl(assetUrl);
    const upstream = await fetch(normalizedUrl, {
      headers: {
        "User-Agent": "gesp-classification-catalog/0.1"
      }
    });
    if (!upstream.ok) {
      throw new NotFoundException(`Remote asset unavailable: ${upstream.status}`);
    }

    const contentType = upstream.headers.get("content-type") || inferContentType(normalizedUrl);
    const cacheControl = upstream.headers.get("cache-control") || "public, max-age=86400";
    const bytes = new Uint8Array(await upstream.arrayBuffer());
    response.setHeader("Content-Type", contentType);
    response.setHeader("Cache-Control", cacheControl);
    return response.send(bytes);
  }
}

function normalizeRemoteAssetUrl(assetUrl: string | undefined) {
  if (!assetUrl) {
    throw new BadRequestException("Missing remote asset url");
  }

  let url: URL;
  try {
    url = new URL(assetUrl);
  } catch {
    throw new BadRequestException("Invalid remote asset url");
  }

  if (url.protocol !== "https:") {
    throw new BadRequestException("Only https remote assets are allowed");
  }

  const host = url.hostname.toLowerCase();
  if (host !== "image.wanjuanwang.com" && host !== "www.wanjuanwang.com") {
    throw new BadRequestException("Unsupported remote asset host");
  }

  const pathname = url.pathname.toLowerCase();
  if (!pathname.includes("/images/") && !/\.(png|jpe?g|gif|webp|svg|image)$/.test(pathname)) {
    throw new BadRequestException("Unsupported remote asset path");
  }

  return url.toString();
}

function inferContentType(assetUrl: string) {
  const normalized = assetUrl.toLowerCase();
  if (normalized.endsWith(".png")) {
    return "image/png";
  }
  if (normalized.endsWith(".jpg") || normalized.endsWith(".jpeg")) {
    return "image/jpeg";
  }
  if (normalized.endsWith(".gif")) {
    return "image/gif";
  }
  if (normalized.endsWith(".webp")) {
    return "image/webp";
  }
  if (normalized.endsWith(".svg") || normalized.endsWith(".image")) {
    return "image/svg+xml";
  }
  return "application/octet-stream";
}
