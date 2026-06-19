import { fetchJson } from "./catalog";
import type { ConsumerMobileContent } from "../pages/consumer/ConsumerMobileData";

export function fetchConsumerMobileContent() {
  return fetchJson<ConsumerMobileContent>("/consumer-mobile");
}
