import { Body, Controller, Delete, Get, Headers, Inject, Param, Post, Query } from "@nestjs/common";
import { ConsumerMobileService } from "./consumer-mobile.service.js";

@Controller("consumer-mobile")
export class ConsumerMobileController {
  constructor(@Inject(ConsumerMobileService) private readonly consumerMobileService: ConsumerMobileService) {}

  @Get()
  getMobileContent(@Headers("x-consumer-user-key") userKey?: string) {
    return this.consumerMobileService.getMobileContent(userKey);
  }

  @Get("home")
  getMobileHomeContent(@Headers("x-consumer-user-key") userKey?: string) {
    return this.consumerMobileService.getMobileHomeContent(userKey);
  }

  @Get("gesp/catalog")
  getGespCatalog(
    @Query("domainId") domainId?: string,
    @Query("level") level?: string,
    @Query("problemTypeId") problemTypeId?: string,
    @Query("query") query?: string
  ) {
    return this.consumerMobileService.getGespCatalog({
      domainId,
      level: level ? Number(level) : undefined,
      problemTypeId,
      query
    });
  }

  @Get("gesp/problems/:id")
  getGespProblem(@Param("id") id: string) {
    return this.consumerMobileService.getGespProblem(id);
  }

  @Get("atcoder/catalog")
  getAtCoderCatalog(@Query("difficulty") difficulty?: string, @Query("query") query?: string) {
    return this.consumerMobileService.getAtCoderCatalog({ difficulty, query });
  }

  @Get("atcoder/problems/:id")
  getAtCoderProblem(@Param("id") id: string) {
    return this.consumerMobileService.getAtCoderProblem(id);
  }

  @Get("search")
  searchProblems(@Query("query") query?: string) {
    return this.consumerMobileService.searchProblems(query);
  }

  @Get("progress")
  getProgress(@Headers("x-consumer-user-key") userKey?: string) {
    return this.consumerMobileService.getProgress(userKey);
  }

  @Post("progress/events")
  recordProgressEvent(@Body() body: unknown, @Headers("x-consumer-user-key") userKey?: string) {
    return this.consumerMobileService.recordProgressEvent(body, userKey);
  }

  @Delete("progress/events")
  removeProgressEvent(@Body() body: unknown, @Headers("x-consumer-user-key") userKey?: string) {
    return this.consumerMobileService.removeProgressEvent(body, userKey);
  }
}
