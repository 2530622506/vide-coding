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
import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Patch, Post } from "@nestjs/common";
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
CatalogController = __decorate([
    Controller("catalog"),
    __param(0, Inject(CatalogService)),
    __metadata("design:paramtypes", [CatalogService])
], CatalogController);
export { CatalogController };
