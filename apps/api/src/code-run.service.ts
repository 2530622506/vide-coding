import { BadRequestException, Injectable, InternalServerErrorException, RequestTimeoutException } from "@nestjs/common";

type CodeRunStatus =
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "judge_error";

type CodeRunRequest = {
  problemId?: string;
  code?: string;
  stdin?: string;
  expectedOutput?: string;
};

type Judge0Response = {
  stdout?: string | null;
  stderr?: string | null;
  compile_output?: string | null;
  message?: string | null;
  time?: string | null;
  memory?: number | null;
  status?: {
    id?: number;
    description?: string;
  };
};

export type CodeRunResponse = {
  problemId: string | null;
  status: CodeRunStatus;
  passed: boolean | null;
  stdout: string;
  stderr: string;
  compileOutput: string;
  message: string;
  expectedOutput: string | null;
  time: string | null;
  memory: number | null;
  judgeStatus: {
    id: number | null;
    description: string;
  };
};

@Injectable()
export class CodeRunService {
  async runCpp(body: unknown): Promise<CodeRunResponse> {
    const request = this.parseRequest(body);
    const config = this.getConfig();
    this.assertWithinLimit("code", request.code, config.maxSourceBytes);
    this.assertWithinLimit("stdin", request.stdin, config.maxStdinBytes);

    const response = await this.submitToJudge0(request, config);
    const stdout = this.truncate(response.stdout || "", config.maxOutputBytes);
    const stderr = this.truncate(response.stderr || "", config.maxOutputBytes);
    const compileOutput = this.truncate(response.compile_output || "", config.maxOutputBytes);
    const message = this.truncate(response.message || "", config.maxOutputBytes);
    const judgeStatus = {
      id: response.status?.id ?? null,
      description: response.status?.description || "Unknown"
    };
    const status = this.mapStatus(judgeStatus.id, Boolean(request.expectedOutput), stdout, request.expectedOutput || "");
    const passed = request.expectedOutput === undefined
      ? null
      : status === "accepted" && this.outputsMatch(stdout, request.expectedOutput);

    return {
      problemId: request.problemId || null,
      status,
      passed,
      stdout,
      stderr,
      compileOutput,
      message,
      expectedOutput: request.expectedOutput ?? null,
      time: response.time ?? null,
      memory: response.memory ?? null,
      judgeStatus
    };
  }

  private parseRequest(body: unknown): Required<Pick<CodeRunRequest, "code" | "stdin">> & CodeRunRequest {
    if (!body || typeof body !== "object") {
      throw new BadRequestException("Request body is required");
    }
    const record = body as Record<string, unknown>;
    const code = this.optionalString(record.code);
    if (!code.trim()) {
      throw new BadRequestException("code is required");
    }
    return {
      problemId: this.optionalString(record.problemId),
      code,
      stdin: this.optionalString(record.stdin),
      expectedOutput: record.expectedOutput === undefined ? undefined : this.optionalString(record.expectedOutput)
    };
  }

  private getConfig() {
    const endpoint = process.env.JUDGE0_ENDPOINT?.replace(/\/+$/, "");
    const apiKey = process.env.JUDGE0_API_KEY || "";
    const apiHost = process.env.JUDGE0_API_HOST || "";
    const authMode = process.env.JUDGE0_AUTH_MODE || "rapidapi";
    const languageId = this.numberFromEnv("JUDGE0_CPP_LANGUAGE_ID", 76);
    if (!endpoint) {
      throw new InternalServerErrorException("JUDGE0_ENDPOINT is not configured");
    }
    if (authMode === "rapidapi" && (!apiKey || !apiHost)) {
      throw new InternalServerErrorException("Judge0 RapidAPI credentials are not configured");
    }
    return {
      endpoint,
      apiKey,
      apiHost,
      authMode,
      languageId,
      timeoutMs: this.numberFromEnv("JUDGE0_TIMEOUT_MS", 10000),
      maxStdinBytes: this.numberFromEnv("CODE_RUN_MAX_STDIN_BYTES", 20000),
      maxSourceBytes: this.numberFromEnv("CODE_RUN_MAX_SOURCE_BYTES", 100000),
      maxOutputBytes: this.numberFromEnv("CODE_RUN_MAX_OUTPUT_BYTES", 50000)
    };
  }

  private async submitToJudge0(
    request: Required<Pick<CodeRunRequest, "code" | "stdin">> & CodeRunRequest,
    config: ReturnType<CodeRunService["getConfig"]>
  ) {
    const controller = new AbortController();
    const timeout = windowlessSetTimeout(() => controller.abort(), config.timeoutMs);
    try {
      const response = await fetch(`${config.endpoint}/submissions?base64_encoded=false&wait=true`, {
        method: "POST",
        headers: this.buildHeaders(config),
        body: JSON.stringify({
          language_id: config.languageId,
          source_code: request.code,
          stdin: request.stdin
        }),
        signal: controller.signal
      });
      if (!response.ok) {
        throw new InternalServerErrorException(`Judge0 request failed with status ${response.status}`);
      }
      return await response.json() as Judge0Response;
    } catch (error) {
      if (error instanceof InternalServerErrorException) {
        throw error;
      }
      if (error instanceof Error && error.name === "AbortError") {
        throw new RequestTimeoutException("Judge0 request timed out");
      }
      throw new InternalServerErrorException("Judge0 request failed");
    } finally {
      clearTimeout(timeout);
    }
  }

  private buildHeaders(config: ReturnType<CodeRunService["getConfig"]>) {
    const headers: Record<string, string> = {
      "Content-Type": "application/json"
    };
    if (config.authMode === "rapidapi") {
      headers["x-rapidapi-key"] = config.apiKey;
      headers["x-rapidapi-host"] = config.apiHost;
      return headers;
    }
    if (config.apiKey) {
      headers["X-Auth-Token"] = config.apiKey;
    }
    return headers;
  }

  private mapStatus(id: number | null, hasExpectedOutput: boolean, stdout: string, expectedOutput: string): CodeRunStatus {
    if (id === 3) {
      return hasExpectedOutput && !this.outputsMatch(stdout, expectedOutput) ? "wrong_answer" : "accepted";
    }
    if (id === 4) {
      return "wrong_answer";
    }
    if (id === 5) {
      return "time_limit_exceeded";
    }
    if (id === 6) {
      return "compile_error";
    }
    if (id !== null && id >= 7 && id <= 12) {
      return "runtime_error";
    }
    return "judge_error";
  }

  private outputsMatch(actual: string, expected: string) {
    return this.normalizeOutput(actual) === this.normalizeOutput(expected);
  }

  private normalizeOutput(value: string) {
    return value.replace(/\r\n/g, "\n").trimEnd();
  }

  private optionalString(value: unknown) {
    return typeof value === "string" ? value : "";
  }

  private numberFromEnv(name: string, fallback: number) {
    const value = Number(process.env[name]);
    return Number.isFinite(value) && value > 0 ? value : fallback;
  }

  private assertWithinLimit(label: string, value: string, maxBytes: number) {
    if (Buffer.byteLength(value, "utf8") > maxBytes) {
      throw new BadRequestException(`${label} exceeds ${maxBytes} bytes`);
    }
  }

  private truncate(value: string, maxBytes: number) {
    if (Buffer.byteLength(value, "utf8") <= maxBytes) {
      return value;
    }
    return `${Buffer.from(value, "utf8").subarray(0, maxBytes).toString("utf8")}\n...[truncated]`;
  }
}

function windowlessSetTimeout(callback: () => void, timeoutMs: number) {
  return setTimeout(callback, timeoutMs);
}
