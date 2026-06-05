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
import { Body, Controller, Delete, Get, Inject, NotFoundException, Param, Post, Put, Res } from "@nestjs/common";
import { existsSync } from "node:fs";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";
let AtCoderCatalogController = class AtCoderCatalogController {
    atCoderCatalogService;
    constructor(atCoderCatalogService) {
        this.atCoderCatalogService = atCoderCatalogService;
    }
    async getCatalog() {
        return this.atCoderCatalogService.getCatalog();
    }
    async getProblem(id) {
        const problem = await this.atCoderCatalogService.getProblem(id);
        if (!problem) {
            throw new NotFoundException(`AtCoder problem ${id} not found`);
        }
        return problem;
    }
    async createProblem(body) {
        return this.atCoderCatalogService.createProblem(body);
    }
    async updateProblem(id, body) {
        const problem = await this.atCoderCatalogService.updateProblem(id, body);
        if (!problem) {
            throw new NotFoundException(`AtCoder problem ${id} not found`);
        }
        return problem;
    }
    async deleteProblem(id) {
        const deleted = await this.atCoderCatalogService.deleteProblem(id);
        if (!deleted) {
            throw new NotFoundException(`AtCoder problem ${id} not found`);
        }
        return { deleted: true };
    }
    getAsset(filename, response) {
        const assetPath = this.atCoderCatalogService.resolveAssetPath(filename);
        if (!assetPath || !existsSync(assetPath)) {
            throw new NotFoundException(`AtCoder asset ${filename} not found`);
        }
        return response.sendFile(assetPath);
    }
};
__decorate([
    Get(),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", Promise)
], AtCoderCatalogController.prototype, "getCatalog", null);
__decorate([
    Get("problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AtCoderCatalogController.prototype, "getProblem", null);
__decorate([
    Post("problems"),
    __param(0, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], AtCoderCatalogController.prototype, "createProblem", null);
__decorate([
    Put("problems/:id"),
    __param(0, Param("id")),
    __param(1, Body()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], AtCoderCatalogController.prototype, "updateProblem", null);
__decorate([
    Delete("problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], AtCoderCatalogController.prototype, "deleteProblem", null);
__decorate([
    Get("assets/:filename"),
    __param(0, Param("filename")),
    __param(1, Res()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", void 0)
], AtCoderCatalogController.prototype, "getAsset", null);
AtCoderCatalogController = __decorate([
    Controller("atcoder-catalog"),
    __param(0, Inject(AtCoderCatalogService)),
    __metadata("design:paramtypes", [AtCoderCatalogService])
], AtCoderCatalogController);
export { AtCoderCatalogController };
