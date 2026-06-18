import type { LevelCatalog, LevelSummary, ProblemDetailResponse } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL || "/api";

export async function fetchJson<T>(path: string): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`);
  if (!response.ok) {
    throw new Error(`${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export async function requestJson<T>(path: string, init: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      ...(init.headers || {})
    }
  });
  if (!response.ok) {
    const message = await response.text();
    throw new Error(message || `${response.status} ${response.statusText}`);
  }
  return response.json() as Promise<T>;
}

export function fetchLevels() {
  return fetchJson<{ levels: LevelSummary[] }>("/catalog/levels");
}

export function fetchLevelCatalog(level: number) {
  return fetchJson<LevelCatalog>(`/catalog/levels/${level}`);
}

export function fetchProblem(problemId: string) {
  return fetchJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(problemId)}`);
}

export function createProblem(payload: unknown) {
  return requestJson<ProblemDetailResponse>("/catalog/problems", {
    method: "POST",
    body: JSON.stringify(payload)
  });
}

export function updateProblem(problemId: string, payload: unknown) {
  return requestJson<ProblemDetailResponse>(`/catalog/problems/${encodeURIComponent(problemId)}`, {
    method: "PATCH",
    body: JSON.stringify(payload)
  });
}

export function deleteProblem(problemId: string) {
  return requestJson<{ deleted: boolean; id: string }>(`/catalog/problems/${encodeURIComponent(problemId)}`, {
    method: "DELETE"
  });
}
