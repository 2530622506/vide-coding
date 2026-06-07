const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export type CodeRunStatus =
  | "accepted"
  | "wrong_answer"
  | "compile_error"
  | "runtime_error"
  | "time_limit_exceeded"
  | "judge_error";

export type CodeRunRequest = {
  problemId: string;
  code: string;
  stdin: string;
  expectedOutput?: string;
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

export async function runCppCode(request: CodeRunRequest) {
  const response = await fetch(`${API_BASE}/code-runs/cpp`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(request)
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<CodeRunResponse>;
}
