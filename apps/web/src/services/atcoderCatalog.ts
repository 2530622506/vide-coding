import type { AtCoderCatalog, AtCoderProblem } from "../types/atcoder";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    throw new Error(await response.text() || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function fetchAtCoderCatalog() {
  return fetchJson<AtCoderCatalog>("/atcoder-catalog");
}

export function fetchAtCoderProblem(problemId: string) {
  return fetchJson<AtCoderProblem>(`/atcoder-catalog/problems/${encodeURIComponent(problemId)}`);
}

export function createAtCoderProblem(problem: Partial<AtCoderProblem>) {
  return requestJson<AtCoderProblem>("/atcoder-catalog/problems", {
    method: "POST",
    body: JSON.stringify(problem)
  });
}

export function updateAtCoderProblem(problemId: string, problem: Partial<AtCoderProblem>) {
  return requestJson<AtCoderProblem>(`/atcoder-catalog/problems/${encodeURIComponent(problemId)}`, {
    method: "PUT",
    body: JSON.stringify(problem)
  });
}

export function deleteAtCoderProblem(problemId: string) {
  return requestJson<{ deleted: boolean }>(`/atcoder-catalog/problems/${encodeURIComponent(problemId)}`, {
    method: "DELETE"
  });
}
