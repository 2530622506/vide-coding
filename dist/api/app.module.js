var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
import { Module } from "@nestjs/common";
import { AtCoderCatalogController } from "./atcoder-catalog.controller.js";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";
import { CodeRunController } from "./code-run.controller.js";
import { CodeRunService } from "./code-run.service.js";
import { CatalogController } from "./catalog.controller.js";
import { CatalogService } from "./catalog.service.js";
let AppModule = class AppModule {
};
AppModule = __decorate([
    Module({
        controllers: [AtCoderCatalogController, CatalogController, CodeRunController],
        providers: [AtCoderCatalogService, CatalogService, CodeRunService]
    })
], AppModule);
export { AppModule };
