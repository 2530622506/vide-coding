import { useEffect, useState } from "react";
import {
  fetchConsumerMobileAtCoderCatalog,
  fetchConsumerMobileAtCoderProblem,
  fetchConsumerMobileContent,
  fetchConsumerMobileGespCatalog,
  fetchConsumerMobileGespProblem,
  fetchConsumerMobileProgress,
  fetchConsumerMobileSearch,
  removeConsumerMobileProgress,
  recordConsumerMobileProgress
} from "../../services/consumerMobile";
import type { ConsumerMobileContent, ConsumerProblem, MobileAtCoderCatalog, MobileGespCatalog, MobileProgress, MobileProgressEvent, MobileSearchResult } from "./ConsumerMobileData";

export function useConsumerMobileContent() {
  const [content, setContent] = useState<ConsumerMobileContent | null>(null);
  const [gespCatalog, setGespCatalog] = useState<MobileGespCatalog | null>(null);
  const [atCoderCatalog, setAtCoderCatalog] = useState<MobileAtCoderCatalog | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ConsumerProblem | null>(null);
  const [progress, setProgress] = useState<MobileProgress | null>(null);
  const [searchResult, setSearchResult] = useState<MobileSearchResult | null>(null);
  const [loading, setLoading] = useState(true);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);

  async function loadContent() {
    setLoading(true);
    setError(null);
    try {
      const nextContent = await fetchConsumerMobileContent();
      setContent(nextContent);
      setSelectedProblem(nextContent.gesp.featured_problem);
      await Promise.all([
        loadGespCatalog({ level: nextContent.gesp.featured_problem ? Number.parseInt(nextContent.gesp.featured_problem.level, 10) : 5 }),
        loadAtCoderCatalog(),
        loadProgress()
      ]);
    } catch (currentError) {
      setContent(null);
      setError(currentError instanceof Error ? currentError.message : "C 端内容加载失败");
    } finally {
      setLoading(false);
    }
  }

  async function loadGespCatalog(params: { domainId?: string | null; level?: number; problemTypeId?: string | null; query?: string } = {}) {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setGespCatalog(await fetchConsumerMobileGespCatalog(params));
    } catch (currentError) {
      setCatalogError(currentError instanceof Error ? currentError.message : "GESP 目录加载失败");
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadAtCoderCatalog(params: { difficulty?: string; query?: string } = {}) {
    setCatalogLoading(true);
    setCatalogError(null);
    try {
      setAtCoderCatalog(await fetchConsumerMobileAtCoderCatalog(params));
    } catch (currentError) {
      setCatalogError(currentError instanceof Error ? currentError.message : "AtCoder 目录加载失败");
    } finally {
      setCatalogLoading(false);
    }
  }

  async function loadProgress() {
    setProgress(await fetchConsumerMobileProgress());
  }

  async function selectGespProblem(problemId: string) {
    const problem = await fetchConsumerMobileGespProblem(problemId);
    setSelectedProblem(problem);
    if (problem) {
      setProgress(await recordConsumerMobileProgress({
        problemId: problem.id,
        source: "gesp",
        title: problem.title,
        type: "view"
      }));
    }
    return problem;
  }

  async function selectAtCoderProblem(problemId: string) {
    const problem = await fetchConsumerMobileAtCoderProblem(problemId);
    setSelectedProblem(problem);
    if (problem) {
      setProgress(await recordConsumerMobileProgress({
        problemId: problem.id,
        source: "atcoder",
        title: problem.title,
        type: "view"
      }));
    }
    return problem;
  }

  async function recordProgress(event: MobileProgressEvent) {
    const nextProgress = await recordConsumerMobileProgress(event);
    setProgress(nextProgress);
    return nextProgress;
  }

  async function removeProgress(event: MobileProgressEvent) {
    const nextProgress = await removeConsumerMobileProgress(event);
    setProgress(nextProgress);
    return nextProgress;
  }

  async function searchProblems(query: string) {
    setSearchLoading(true);
    setSearchError(null);
    try {
      const result = await fetchConsumerMobileSearch(query);
      setSearchResult(result);
      return result;
    } catch (currentError) {
      setSearchError(currentError instanceof Error ? currentError.message : "搜索失败");
      return null;
    } finally {
      setSearchLoading(false);
    }
  }

  useEffect(() => {
    void loadContent();
  }, []);

  return {
    atCoderCatalog,
    catalogError,
    catalogLoading,
    content,
    error,
    gespCatalog,
    loading,
    loadAtCoderCatalog,
    loadGespCatalog,
    progress,
    recordProgress,
    removeProgress,
    reload: loadContent,
    searchError,
    searchLoading,
    searchProblems,
    searchResult,
    selectedProblem,
    selectAtCoderProblem,
    selectGespProblem
  };
}
