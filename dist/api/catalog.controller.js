var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
import { BadRequestException, Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post, Query, Res } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
let CatalogController = class CatalogController {
    catalogService;
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    getLevels() {
        return this.catalogService.getLevels();
    }
    getLevelCatalog(levelParam, questionType, sourceKind) {
        const level = Number(levelParam);
        return this.catalogService.getLevelCatalog(level, questionType, sourceKind).then((catalog) => {
            if (!catalog) {
                throw new NotFoundException(`Level ${levelParam} catalog not found`);
            }
            return catalog;
        });
    }
    getProblem(id) {
        return this.catalogService.getProblem(id).then((problem) => {
            if (!problem) {
                throw new NotFoundException(`Problem ${id} not found`);
            }
            return problem;
        });
    }
    createProblem(body) {
        return this.catalogService.createProblem(body);
    }
    updateProblem(id, body) {
        return this.catalogService.updateProblem(id, body).then((problem) => {
            if (!problem) {
                throw new NotFoundException(`Problem ${id} not found`);
            }
            return problem;
        });
    }
    deleteProblem(id) {
        return this.catalogService.deleteProblem(id).then((deleted) => {
            if (!deleted) {
                throw new NotFoundException(`Problem ${id} not found`);
            }
            return { deleted: true, id };
        });
    }
    getReviewQueueSummary() {
        return this.catalogService.getReviewQueueSummary();
    }
    getReviewQueue() {
        return this.catalogService.getReviewQueue();
    }
    applyReviewAction(id, body) {
        return this.catalogService.applyReviewAction(id, body).then((result) => {
            if (!result) {
                throw new NotFoundException(`Review item ${id} not found`);
            }
            return result;
        });
    }
    getAuditSummary() {
        return this.catalogService.getAuditSummary();
    }
    getAuditEvents() {
        return this.catalogService.getAuditEvents();
    }
    async getRemoteAsset(assetUrl, response) {
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
};
__decorate([
    Get("levels"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getLevels", null);
__decorate([
    Get("levels/:level"),
    __param(0, Param("level")),
    __param(1, Query("question_type")),
    __param(2, Query("source_kind")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getLevelCatalog", null);
__decorate([
    Get("problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getProblem", null);
__decorate([
    Post("problems"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "createProblem", null);
__decorate([
    Patch("problems/:id"),
    __param(0, Param("id")),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "updateProblem", null);
__decorate([
    Delete("problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "deleteProblem", null);
__decorate([
    Get("review-queue/summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getReviewQueueSummary", null);
__decorate([
    Get("review-queue"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getReviewQueue", null);
__decorate([
    Post("review-queue/:id/actions"),
    __param(0, Param("id")),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "applyReviewAction", null);
__decorate([
    Get("audit/summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getAuditSummary", null);
__decorate([
    Get("audit/events"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getAuditEvents", null);
__decorate([
    Get("assets/remote"),
    __param(0, Query("url")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], CatalogController.prototype, "getRemoteAsset", null);
CatalogController = __decorate([
    Controller("catalog"),
    __param(0, Inject(CatalogService)),
    __metadata("design:paramtypes", [CatalogService])
], CatalogController);
export { CatalogController };
function normalizeRemoteAssetUrl(assetUrl) {
    if (!assetUrl) {
        throw new BadRequestException("Missing remote asset url");
    }
    let url;
    try {
        url = new URL(assetUrl);
    }
    catch {
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
function inferContentType(assetUrl) {
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
