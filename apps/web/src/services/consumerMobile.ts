import { fetchJson, requestJson } from "./catalog";
import type { ConsumerMobileContent, ConsumerProblem, MobileAtCoderCatalog, MobileGespCatalog, MobileProgress, MobileProgressEvent, MobileSearchResult } from "../pages/consumer/ConsumerMobileData";

const CONSUMER_USER_KEY_STORAGE = "gesp-consumer-mobile-user-key";
let consumerMobileHomeRequest: Promise<ConsumerMobileContent> | null = null;
const consumerMobileGespCatalogRequests = new Map<string, Promise<MobileGespCatalog>>();
const consumerMobileAtCoderCatalogRequests = new Map<string, Promise<MobileAtCoderCatalog>>();
let consumerMobileProgressRequest: Promise<MobileProgress> | null = null;

export function fetchConsumerMobileContent() {
  return fetchJson<ConsumerMobileContent>("/consumer-mobile", {
    headers: consumerMobileHeaders()
  });
}

export function fetchConsumerMobileHome() {
  consumerMobileHomeRequest ||= fetchJson<ConsumerMobileContent>("/consumer-mobile/home", {
    headers: consumerMobileHeaders()
  }).finally(() => {
    consumerMobileHomeRequest = null;
  });
  return consumerMobileHomeRequest;
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
  const path = `/consumer-mobile/gesp/catalog${query ? `?${query}` : ""}`;
  const existingRequest = consumerMobileGespCatalogRequests.get(path);
  if (existingRequest) {
    return existingRequest;
  }
  const request = fetchJson<MobileGespCatalog>(path).finally(() => {
    consumerMobileGespCatalogRequests.delete(path);
  });
  consumerMobileGespCatalogRequests.set(path, request);
  return request;
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
  const path = `/consumer-mobile/atcoder/catalog${query ? `?${query}` : ""}`;
  const existingRequest = consumerMobileAtCoderCatalogRequests.get(path);
  if (existingRequest) {
    return existingRequest;
  }
  const request = fetchJson<MobileAtCoderCatalog>(path).finally(() => {
    consumerMobileAtCoderCatalogRequests.delete(path);
  });
  consumerMobileAtCoderCatalogRequests.set(path, request);
  return request;
}

export function fetchConsumerMobileAtCoderProblem(problemId: string) {
  return fetchJson<ConsumerProblem | null>(`/consumer-mobile/atcoder/problems/${encodeURIComponent(problemId)}`);
}

export function fetchConsumerMobileSearch(query: string) {
  const searchParams = new URLSearchParams();
  if (query.trim()) {
    searchParams.set("query", query.trim());
  }
  return fetchJson<MobileSearchResult>(`/consumer-mobile/search${searchParams.toString() ? `?${searchParams.toString()}` : ""}`);
}

export function fetchConsumerMobileProgress() {
  consumerMobileProgressRequest ||= fetchJson<MobileProgress>("/consumer-mobile/progress", {
    headers: consumerMobileHeaders()
  }).finally(() => {
    consumerMobileProgressRequest = null;
  });
  return consumerMobileProgressRequest;
}

export function recordConsumerMobileProgress(event: MobileProgressEvent) {
  return requestJson<MobileProgress>("/consumer-mobile/progress/events", {
    method: "POST",
    headers: consumerMobileHeaders(),
    body: JSON.stringify(event)
  });
}

export function removeConsumerMobileProgress(event: MobileProgressEvent) {
  return requestJson<MobileProgress>("/consumer-mobile/progress/events", {
    method: "DELETE",
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
  const existing = readConsumerMobileUserKey();
  if (existing) {
    return existing;
  }
  const generated = `consumer-mobile-${createConsumerMobileId()}`;
  writeConsumerMobileUserKey(generated);
  return generated;
}

function readConsumerMobileUserKey() {
  try {
    return window.localStorage.getItem(CONSUMER_USER_KEY_STORAGE);
  } catch {
    return null;
  }
}

function writeConsumerMobileUserKey(value: string) {
  try {
    window.localStorage.setItem(CONSUMER_USER_KEY_STORAGE, value);
  } catch {
    // Some mobile browsers disable localStorage in private mode. The generated key still works for this session request.
  }
}

function createConsumerMobileId() {
  const cryptoApi = globalThis.crypto;
  if (typeof cryptoApi?.randomUUID === "function") {
    return cryptoApi.randomUUID();
  }
  if (typeof cryptoApi?.getRandomValues === "function") {
    const bytes = new Uint8Array(16);
    cryptoApi.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 0x0f) | 0x40;
    bytes[8] = (bytes[8] & 0x3f) | 0x80;
    return [...bytes].map((byte, index) => {
      const hex = byte.toString(16).padStart(2, "0");
      return index === 4 || index === 6 || index === 8 || index === 10 ? `-${hex}` : hex;
    }).join("");
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}-${Math.random().toString(36).slice(2, 10)}`;
}
