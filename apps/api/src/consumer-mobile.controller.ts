import { Controller, Get, Inject } from "@nestjs/common";
import { ConsumerMobileService } from "./consumer-mobile.service.js";

@Controller("consumer-mobile")
export class ConsumerMobileController {
  constructor(@Inject(ConsumerMobileService) private readonly consumerMobileService: ConsumerMobileService) {}

  @Get()
  getMobileContent() {
    return this.consumerMobileService.getMobileContent();
  }
}
