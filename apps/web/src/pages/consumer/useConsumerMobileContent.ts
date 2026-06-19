import { useEffect, useState } from "react";
import { fetchConsumerMobileContent } from "../../services/consumerMobile";
import type { ConsumerMobileContent } from "./ConsumerMobileData";

export function useConsumerMobileContent() {
  const [content, setContent] = useState<ConsumerMobileContent | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function loadContent() {
    setLoading(true);
    setError(null);
    try {
      setContent(await fetchConsumerMobileContent());
    } catch (currentError) {
      setContent(null);
      setError(currentError instanceof Error ? currentError.message : "C 端内容加载失败");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  return {
    content,
    error,
    loading,
    reload: loadContent
  };
}
