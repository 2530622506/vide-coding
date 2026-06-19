import { fetchJson, requestJson } from "./catalog";
import type { ConsumerMobileContent, ConsumerProblem, MobileAtCoderCatalog, MobileGespCatalog, MobileProgress, MobileProgressEvent } from "../pages/consumer/ConsumerMobileData";

const CONSUMER_USER_KEY_STORAGE = "gesp-consumer-mobile-user-key";

export function fetchConsumerMobileContent() {
  return fetchJson<ConsumerMobileContent>("/consumer-mobile");
}

export function fetchConsumerMobileGespCatalog(params: { domainId?: string | null; level?: number; problemTypeId?: string | null; query?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.level) {
    searchParams.set("level", String(params.level));
  }
  if (params.domainId) {
    searchParams.set("domainId", params.domainId);
  }
  if (params.problemTypeId) {
    searchParams.set("problemTypeId", params.problemTypeId);
  }
  if (params.query?.trim()) {
    searchParams.set("query", params.query.trim());
  }
  const query = searchParams.toString();
  return fetchJson<MobileGespCatalog>(`/consumer-mobile/gesp/catalog${query ? `?${query}` : ""}`);
}

export function fetchConsumerMobileGespProblem(problemId: string) {
  return fetchJson<ConsumerProblem | null>(`/consumer-mobile/gesp/problems/${encodeURIComponent(problemId)}`);
}

export function fetchConsumerMobileAtCoderCatalog(params: { difficulty?: string; query?: string } = {}) {
  const searchParams = new URLSearchParams();
  if (params.difficulty) {
    searchParams.set("difficulty", params.difficulty);
  }
  if (params.query?.trim()) {
    searchParams.set("query", params.query.trim());
  }
  const query = searchParams.toString();
  return fetchJson<MobileAtCoderCatalog>(`/consumer-mobile/atcoder/catalog${query ? `?${query}` : ""}`);
}

export function fetchConsumerMobileAtCoderProblem(problemId: string) {
  return fetchJson<ConsumerProblem | null>(`/consumer-mobile/atcoder/problems/${encodeURIComponent(problemId)}`);
}

export function fetchConsumerMobileProgress() {
  return fetchJson<MobileProgress>("/consumer-mobile/progress", {
    headers: consumerMobileHeaders()
  });
}

export function recordConsumerMobileProgress(event: MobileProgressEvent) {
  return requestJson<MobileProgress>("/consumer-mobile/progress/events", {
    method: "POST",
    headers: consumerMobileHeaders(),
    body: JSON.stringify(event)
  });
}

function consumerMobileHeaders() {
  return {
    "X-Consumer-User-Key": getConsumerMobileUserKey()
  };
}

function getConsumerMobileUserKey() {
  const existing = window.localStorage.getItem(CONSUMER_USER_KEY_STORAGE);
  if (existing) {
    return existing;
  }
  const generated = `consumer-mobile-${crypto.randomUUID()}`;
  window.localStorage.setItem(CONSUMER_USER_KEY_STORAGE, generated);
  return generated;
}
