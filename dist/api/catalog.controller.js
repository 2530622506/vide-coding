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
import { Controller, Get, Inject, NotFoundException, Param } from "@nestjs/common";
import { CatalogService } from "./catalog.service.js";
let CatalogController = class CatalogController {
    catalogService;
    constructor(catalogService) {
        this.catalogService = catalogService;
    }
    getLevels() {
        return this.catalogService.getLevels();
    }
    getLevelCatalog(levelParam) {
        const level = Number(levelParam);
        return this.catalogService.getLevelCatalog(level).then((catalog) => {
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
    getReviewQueueSummary() {
        return this.catalogService.getReviewQueueSummary();
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
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
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
    Get("review-queue/summary"),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], CatalogController.prototype, "getReviewQueueSummary", null);
CatalogController = __decorate([
    Controller("catalog"),
    __param(0, Inject(CatalogService)),
    __metadata("design:paramtypes", [CatalogService])
], CatalogController);
export { CatalogController };
