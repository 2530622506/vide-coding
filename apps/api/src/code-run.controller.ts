import { Body, Controller, Inject, Post } from "@nestjs/common";
import { CodeRunService } from "./code-run.service.js";

@Controller("code-runs")
export class CodeRunController {
  constructor(@Inject(CodeRunService) private readonly codeRunService: CodeRunService) {}

  @Post("cpp")
  runCpp(@Body() body: unknown) {
    return this.codeRunService.runCpp(body);
  }
}
