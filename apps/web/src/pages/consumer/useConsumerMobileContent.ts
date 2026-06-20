import { useEffect, useState } from "react";
import {
  fetchConsumerMobileAtCoderCatalog,
  fetchConsumerMobileAtCoderProblem,
  fetchConsumerMobileContent,
  fetchConsumerMobileGespCatalog,
  fetchConsumerMobileGespProblem,
  fetchConsumerMobileHome,
  fetchConsumerMobileProgress,
  fetchConsumerMobileSearch,
  removeConsumerMobileProgress,
  recordConsumerMobileProgress
} from "../../services/consumerMobile";
import type { ConsumerMobileContent, ConsumerProblem, ConsumerView, MobileAtCoderCatalog, MobileGespCatalog, MobileProgress, MobileProgressEvent, MobileSearchResult } from "./ConsumerMobileData";

const CONSUMER_HOME_CACHE_KEY = "gesp-consumer-mobile-home-cache";
const CONSUMER_HOME_CACHE_MAX_AGE = 5 * 60 * 1000;

type ConsumerHomeCache = {
  cachedAt: number;
  content: ConsumerMobileContent;
  progress: MobileProgress | null;
};

export function useConsumerMobileContent(view: ConsumerView) {
  const cachedHome = readConsumerHomeCache();
  const [content, setContent] = useState<ConsumerMobileContent | null>(() => cachedHome?.content ?? null);
  const [gespCatalog, setGespCatalog] = useState<MobileGespCatalog | null>(null);
  const [atCoderCatalog, setAtCoderCatalog] = useState<MobileAtCoderCatalog | null>(null);
  const [selectedProblem, setSelectedProblem] = useState<ConsumerProblem | null>(() => cachedHome?.content.gesp.featured_problem ?? null);
  const [progress, setProgress] = useState<MobileProgress | null>(() => cachedHome?.progress ?? null);
  const [searchResult, setSearchResult] = useState<MobileSearchResult | null>(null);
  const [loading, setLoading] = useState(!cachedHome);
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [catalogError, setCatalogError] = useState<string | null>(null);
  const [searchError, setSearchError] = useState<string | null>(null);
  const [progressLoaded, setProgressLoaded] = useState(false);

  async function loadContent() {
    setLoading(!content);
    setError(null);
    try {
      const nextContent = await fetchConsumerMobileHome().catch(() => fetchConsumerMobileContent());
      const nextProgress = progressFromContent(nextContent);
      setContent(nextContent);
      setSelectedProblem(nextContent.gesp.featured_problem);
      setProgress(nextProgress);
      writeConsumerHomeCache(nextContent, nextProgress);
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
    setProgressLoaded(true);
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
      setProgressLoaded(true);
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
      setProgressLoaded(true);
    }
    return problem;
  }

  async function recordProgress(event: MobileProgressEvent) {
    const nextProgress = await recordConsumerMobileProgress(event);
    setProgress(nextProgress);
    setProgressLoaded(true);
    return nextProgress;
  }

  async function removeProgress(event: MobileProgressEvent) {
    const nextProgress = await removeConsumerMobileProgress(event);
    setProgress(nextProgress);
    setProgressLoaded(true);
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

  useEffect(() => {
    if (!content) {
      return;
    }
    if (view === "catalog" && !gespCatalog && !catalogLoading) {
      void loadGespCatalog({ level: defaultGespLevel(content) });
    }
    if (view === "atcoder" && !atCoderCatalog && !catalogLoading) {
      void loadAtCoderCatalog();
    }
    if ((view === "progress" || view === "profile" || view === "favorites" || view === "settings" || view === "weak-points") && !progressLoaded) {
      void loadProgress();
    }
  }, [atCoderCatalog, catalogLoading, content, gespCatalog, progressLoaded, view]);

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

function defaultGespLevel(content: ConsumerMobileContent) {
  if (content.catalog_summary?.default_level) {
    return content.catalog_summary.default_level;
  }
  if (content.gesp.featured_problem) {
    return Number.parseInt(content.gesp.featured_problem.level, 10) || 5;
  }
  return content.gesp.levels.find((level) => level.level === 5)?.level || content.gesp.levels[0]?.level || 5;
}

function progressFromContent(content: ConsumerMobileContent): MobileProgress | null {
  const counts = content.progress_summary?.counts || content.profile_summary?.counts;
  const weakPoints = content.progress_summary?.weak_points || content.home?.knowledge_progress || [];
  const recentEvents = content.progress_summary?.recent_events || content.profile_summary?.recent_events || [];
  const favorites = content.profile_summary?.favorites || [];
  const reviewPlan = content.profile_summary?.review_plan;
  if (!counts && !weakPoints.length && !recentEvents.length && !favorites.length && !reviewPlan) {
    return null;
  }
  return {
    data_source: content.data_source.progress === "mysql" ? "mysql" : "memory",
    user_key: "cached",
    counts,
    activity_count: recentEvents.length,
    mastery_pct: content.progress_summary?.mastery_pct ?? content.learning.progress_pct,
    progress_pct: content.progress_summary?.mastery_pct ?? content.learning.progress_pct,
    weekly_action_count: counts?.weekly_actions ?? 0,
    viewed_count: counts?.viewed ?? content.learning.viewed_count,
    favorite_count: counts?.favorite ?? favorites.length,
    reviewed_count: counts?.reviewed ?? content.learning.reviewed_count,
    weekly_viewed_count: 0,
    weekly_favorite_count: 0,
    weekly_reviewed_count: 0,
    viewed: [],
    favorites,
    reviewed: [],
    weak_points: weakPoints,
    recent_events: recentEvents,
    review_plan: reviewPlan
  };
}

function readConsumerHomeCache(): ConsumerHomeCache | null {
  try {
    const rawValue = window.sessionStorage.getItem(CONSUMER_HOME_CACHE_KEY);
    if (!rawValue) {
      return null;
    }
    const parsed = JSON.parse(rawValue) as ConsumerHomeCache;
    if (!parsed.cachedAt || Date.now() - parsed.cachedAt > CONSUMER_HOME_CACHE_MAX_AGE || !parsed.content) {
      window.sessionStorage.removeItem(CONSUMER_HOME_CACHE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function writeConsumerHomeCache(content: ConsumerMobileContent, progress: MobileProgress | null) {
  try {
    window.sessionStorage.setItem(CONSUMER_HOME_CACHE_KEY, JSON.stringify({
      cachedAt: Date.now(),
      content,
      progress
    }));
  } catch {
    // Mobile browsers can evict or block sessionStorage. Fresh network data remains the source of truth.
  }
}
