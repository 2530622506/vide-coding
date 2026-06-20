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
import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { ConsumerMobileService } from "./consumer-mobile.service.js";
let ConsumerMobileController = class ConsumerMobileController {
    consumerMobileService;
    constructor(consumerMobileService) {
        this.consumerMobileService = consumerMobileService;
    }
    getMobileContent(userKey) {
        return this.consumerMobileService.getMobileContent(userKey);
    }
    getMobileHomeContent(userKey) {
        return this.consumerMobileService.getMobileHomeContent(userKey);
    }
    getGespCatalog(domainId, level, problemTypeId, query) {
        return this.consumerMobileService.getGespCatalog({
            domainId,
            level: level ? Number(level) : undefined,
            problemTypeId,
            query
        });
    }
    getGespProblem(id) {
        return this.consumerMobileService.getGespProblem(id);
    }
    getAtCoderCatalog(difficulty, query) {
        return this.consumerMobileService.getAtCoderCatalog({ difficulty, query });
    }
    getAtCoderProblem(id) {
        return this.consumerMobileService.getAtCoderProblem(id);
    }
    searchProblems(query) {
        return this.consumerMobileService.searchProblems(query);
    }
    getProgress(userKey) {
        return this.consumerMobileService.getProgress(userKey);
    }
    recordProgressEvent(body, userKey) {
        return this.consumerMobileService.recordProgressEvent(body, userKey);
    }
    removeProgressEvent(body, userKey) {
        return this.consumerMobileService.removeProgressEvent(body, userKey);
    }
};
__decorate([
    Get(),
    __param(0, Headers("x-consumer-user-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getMobileContent", null);
__decorate([
    Get("home"),
    __param(0, Headers("x-consumer-user-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getMobileHomeContent", null);
__decorate([
    Get("gesp/catalog"),
    __param(0, Query("domainId")),
    __param(1, Query("level")),
    __param(2, Query("problemTypeId")),
    __param(3, Query("query")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String, String, String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getGespCatalog", null);
__decorate([
    Get("gesp/problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getGespProblem", null);
__decorate([
    Get("atcoder/catalog"),
    __param(0, Query("difficulty")),
    __param(1, Query("query")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getAtCoderCatalog", null);
__decorate([
    Get("atcoder/problems/:id"),
    __param(0, Param("id")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getAtCoderProblem", null);
__decorate([
    Get("search"),
    __param(0, Query("query")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "searchProblems", null);
__decorate([
    Get("progress"),
    __param(0, Headers("x-consumer-user-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "getProgress", null);
__decorate([
    Post("progress/events"),
    __param(0, Body()),
    __param(1, Headers("x-consumer-user-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "recordProgressEvent", null);
__decorate([
    Delete("progress/events"),
    __param(0, Body()),
    __param(1, Headers("x-consumer-user-key")),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, String]),
    __metadata("design:returntype", void 0)
], ConsumerMobileController.prototype, "removeProgressEvent", null);
ConsumerMobileController = __decorate([
    Controller("consumer-mobile"),
    __param(0, Inject(ConsumerMobileService)),
    __metadata("design:paramtypes", [ConsumerMobileService])
], ConsumerMobileController);
export { ConsumerMobileController };
