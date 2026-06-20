var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var ConsumerMobileService_1;
import { BadRequestException, Inject, Injectable, Logger } from "@nestjs/common";
import mysql from "mysql2/promise";
import { AtCoderCatalogService } from "./atcoder-catalog.service.js";
import { CatalogService } from "./catalog.service.js";
let ConsumerMobileService = ConsumerMobileService_1 = class ConsumerMobileService {
    catalogService;
    atCoderCatalogService;
    logger = new Logger(ConsumerMobileService_1.name);
    defaultProgressUserKey = "anonymous";
    viewedProblems = new Map();
    favoriteProblems = new Map();
    reviewedProblems = new Map();
    progressSchemaReady = false;
    consumerSummaryCacheTtlMs = 5 * 60 * 1000;
    weakPointsCache = null;
    constructor(catalogService, atCoderCatalogService) {
        this.catalogService = catalogService;
        this.atCoderCatalogService = atCoderCatalogService;
    }
    async getMobileHomeContent(userKey) {
        const [levelsResponse, atCoderCatalog] = await Promise.all([
            this.catalogService.getLevels(),
            this.atCoderCatalogService.getCatalog()
        ]);
        const levels = this.buildLightLevels(levelsResponse);
        const defaultLevel = levels.find((level) => level.level === 5)?.level || levels[0]?.level || 1;
        const defaultCatalog = await this.catalogService.getLevelCatalog(defaultLevel);
        const defaultProblemTypes = defaultCatalog
            ? this.dedupeLevelProblemTypes(defaultCatalog.domains.flatMap((domain) => this.buildLevelProblemTypes(defaultCatalog, domain)))
            : [];
        const progressStore = await this.getProgress(userKey);
        const nextSummary = this.pickNextGespProblem(defaultCatalog ? [defaultCatalog] : [], progressStore);
        const nextProblem = nextSummary ? await this.catalogService.getProblem(nextSummary.id) : null;
        const nextMobileProblem = nextProblem ? this.buildGespFeaturedProblem(nextProblem) : null;
        const continueTask = this.buildContinueTask(progressStore, nextMobileProblem);
        const todayTask = this.buildTodayTask(progressStore, defaultProblemTypes, nextMobileProblem);
        const atCoderTracks = this.buildAtCoderTracks(atCoderCatalog);
        const totalGespCount = this.sum(levels.map((level) => level.count));
        const progressPct = progressStore.mastery_pct ?? progressStore.progress_pct;
        return {
            generated_at: new Date().toISOString(),
            data_source: {
                gesp: levelsResponse.data_source,
                atcoder: atCoderCatalog.source,
                progress: progressStore.data_source
            },
            learning: {
                viewed_count: progressStore.counts.viewed,
                saved_code_count: progressStore.counts.favorite,
                reviewed_count: progressStore.counts.reviewed,
                progress_pct: progressPct,
                weak_points: progressStore.weak_points.map((point) => point.name),
                recommendation: this.buildRecommendation(defaultProblemTypes, atCoderCatalog)
            },
            gesp: {
                total_count: totalGespCount,
                levels,
                domains: [],
                problem_types: [],
                featured_problem: nextMobileProblem
            },
            atcoder: {
                total_count: atCoderCatalog.summary.problem_count,
                tag_count: atCoderCatalog.summary.knowledge_point_count,
                statement_count: atCoderCatalog.summary.source_extracted_statement_count ?? 0,
                tracks: atCoderTracks,
                featured_problem: null
            },
            home: {
                today_task: todayTask,
                continue_task: continueTask,
                library_cards: [
                    {
                        source: "gesp",
                        title: "GESP 全等级",
                        count: totalGespCount,
                        subtitle: `${levels.length} 个等级 · 官方分类目录`
                    },
                    {
                        source: "atcoder",
                        title: "AtCoder",
                        count: atCoderCatalog.summary.problem_count,
                        subtitle: `${atCoderTracks.length} 个难度轨道 · 独立算法题库`
                    }
                ],
                knowledge_progress: progressStore.weak_points
            },
            catalog_summary: {
                default_level: defaultLevel,
                levels,
                atcoder_total_count: atCoderCatalog.summary.problem_count
            },
            progress_summary: {
                counts: progressStore.counts,
                mastery_pct: progressPct,
                weak_points: progressStore.weak_points,
                recent_events: progressStore.recent_events
            },
            profile_summary: {
                counts: progressStore.counts,
                favorites: progressStore.favorites,
                review_plan: progressStore.review_plan,
                recent_events: progressStore.recent_events
            }
        };
    }
    async getMobileContent(userKey) {
        const [levelsResponse, atCoderCatalog] = await Promise.all([
            this.catalogService.getLevels(),
            this.atCoderCatalogService.getCatalog()
        ]);
        const catalogs = (await Promise.all(levelsResponse.levels.map((level) => this.catalogService.getLevelCatalog(level.level)))).filter((catalog) => Boolean(catalog));
        const featuredSummary = this.pickFeaturedGespProblem(catalogs);
        const featuredProblem = featuredSummary ? await this.catalogService.getProblem(featuredSummary.id) : null;
        const atCoderFeaturedSummary = this.flattenAtCoderProblems(atCoderCatalog)[0]?.problem || null;
        const atCoderFeatured = atCoderFeaturedSummary ? await this.atCoderCatalogService.getProblem(atCoderFeaturedSummary.id) : null;
        const levels = this.buildLevels(levelsResponse, catalogs);
        const domains = this.buildDomains(catalogs);
        const problemTypes = this.buildProblemTypes(catalogs);
        const progress = this.average(levels.map((level) => level.progress));
        const weakPoints = domains.filter((domain) => domain.tone !== "good").slice(0, 3).map((domain) => domain.name);
        const legacyContent = {
            generated_at: new Date().toISOString(),
            data_source: {
                gesp: levelsResponse.data_source,
                atcoder: atCoderCatalog.source
            },
            learning: {
                viewed_count: this.sum(levels.map((level) => level.count)),
                saved_code_count: problemTypes.filter((type) => type.progress >= 60).length,
                reviewed_count: problemTypes.filter((type) => type.progress >= 70).length,
                progress_pct: progress,
                weak_points: weakPoints,
                recommendation: this.buildRecommendation(problemTypes, atCoderCatalog)
            },
            gesp: {
                total_count: this.sum(levels.map((level) => level.count)),
                levels,
                domains,
                problem_types: problemTypes,
                featured_problem: featuredProblem ? this.buildGespFeaturedProblem(featuredProblem) : null
            },
            atcoder: {
                total_count: atCoderCatalog.summary.problem_count,
                tag_count: atCoderCatalog.summary.knowledge_point_count,
                statement_count: atCoderCatalog.summary.source_extracted_statement_count ?? 0,
                tracks: this.buildAtCoderTracks(atCoderCatalog),
                featured_problem: atCoderFeatured ? this.buildAtCoderFeaturedProblem(atCoderFeatured) : null
            }
        };
        const progressStore = await this.getProgress(userKey);
        const featuredMobileProblem = legacyContent.gesp.featured_problem;
        const nextSummary = this.pickNextGespProblem(catalogs, progressStore);
        const nextProblem = nextSummary ? await this.catalogService.getProblem(nextSummary.id) : null;
        const nextMobileProblem = nextProblem ? this.buildGespFeaturedProblem(nextProblem) : featuredMobileProblem;
        const continueTask = this.buildContinueTask(progressStore, nextMobileProblem);
        const todayTask = this.buildTodayTask(progressStore, problemTypes, nextMobileProblem);
        return {
            ...legacyContent,
            data_source: {
                ...legacyContent.data_source,
                progress: progressStore.data_source
            },
            home: {
                today_task: todayTask,
                continue_task: continueTask,
                library_cards: [
                    {
                        source: "gesp",
                        title: "GESP 全等级",
                        count: legacyContent.gesp.total_count,
                        subtitle: `${levels.length} 个等级 · 官方分类目录`
                    },
                    {
                        source: "atcoder",
                        title: "AtCoder",
                        count: legacyContent.atcoder.total_count,
                        subtitle: `${legacyContent.atcoder.tracks.length} 个难度轨道 · 独立算法题库`
                    }
                ],
                knowledge_progress: progressStore.weak_points
            },
            catalog_summary: {
                default_level: levels.find((level) => level.level === 5)?.level || levels[0]?.level || 1,
                levels,
                atcoder_total_count: legacyContent.atcoder.total_count
            },
            progress_summary: {
                counts: progressStore.counts,
                mastery_pct: progressStore.mastery_pct,
                weak_points: progressStore.weak_points,
                recent_events: progressStore.recent_events
            },
            profile_summary: {
                counts: progressStore.counts,
                favorites: progressStore.favorites,
                review_plan: progressStore.review_plan,
                recent_events: progressStore.recent_events
            },
            legacy: legacyContent
        };
    }
    async getGespCatalog(params) {
        const levelsResponse = await this.catalogService.getLevels();
        const requestedLevel = params.level && Number.isFinite(params.level) ? params.level : (levelsResponse.levels.find((level) => level.level === 5)?.level || levelsResponse.levels[0]?.level || 1);
        const catalog = await this.catalogService.getLevelCatalog(requestedLevel);
        const catalogs = catalog ? [catalog] : [];
        const levels = this.buildLevels(levelsResponse, catalogs);
        const domains = catalog ? this.buildLevelDomains(catalog) : [];
        const selectedDomain = params.domainId
            ? domains.find((domain) => domain.id === params.domainId) || null
            : null;
        const domainGroup = catalog?.domains.find((domain) => domain.domain_id === selectedDomain?.id) || null;
        const problemTypes = catalog
            ? domainGroup
                ? this.buildLevelProblemTypes(catalog, domainGroup)
                : this.dedupeLevelProblemTypes(catalog.domains.flatMap((domain) => this.buildLevelProblemTypes(catalog, domain)))
            : [];
        const selectedProblemType = params.problemTypeId
            ? problemTypes.find((type) => type.id === params.problemTypeId) || null
            : null;
        const problems = this.buildGespProblemList(catalog, {
            domainId: selectedDomain?.id || undefined,
            problemTypeId: selectedProblemType?.id,
            query: params.query
        });
        return {
            selected_level: requestedLevel,
            selected_domain_id: selectedDomain?.id || null,
            selected_problem_type_id: selectedProblemType?.id || null,
            levels,
            domains,
            problem_types: problemTypes,
            problems
        };
    }
    async getGespProblem(id) {
        const problem = await this.catalogService.getProblem(id);
        return problem ? this.buildGespFeaturedProblem(problem) : null;
    }
    async getAtCoderProblem(id) {
        const problem = await this.atCoderCatalogService.getProblem(id);
        return problem ? this.buildAtCoderFeaturedProblem(problem) : null;
    }
    async getAtCoderCatalog(params) {
        const catalog = await this.atCoderCatalogService.getCatalog();
        const tracks = this.buildAtCoderTracks(catalog);
        const selectedDifficulty = params.difficulty || tracks[0]?.difficulty || "all";
        const problems = this.flattenAtCoderProblems(catalog)
            .filter(({ problem }) => selectedDifficulty === "all" || this.atCoderDifficultyMeta(problem.difficulty).shortLabel === selectedDifficulty)
            .filter(({ problem }) => this.matchQuery([
            problem.pid,
            problem.title,
            problem.title_zh,
            problem.difficulty_label,
            ...problem.knowledge_points.map((point) => point.label)
        ], params.query))
            .slice(0, 80)
            .map(({ problem }) => this.buildAtCoderProblemListItem(problem));
        return {
            selected_difficulty: selectedDifficulty,
            tracks,
            problems
        };
    }
    async searchProblems(query = "") {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return {
                query: "",
                total_count: 0,
                gesp: [],
                atcoder: []
            };
        }
        const [levelsResponse, atCoderCatalog] = await Promise.all([
            this.catalogService.getLevels(),
            this.atCoderCatalogService.getCatalog()
        ]);
        const catalogs = (await Promise.all(levelsResponse.levels.map((level) => this.catalogService.getLevelCatalog(level.level)))).filter((catalog) => Boolean(catalog));
        const gesp = this.dedupeMobileProblemItems(catalogs
            .flatMap((catalog) => this.buildGespProblemList(catalog, { query: trimmedQuery }))).slice(0, 30);
        const atcoder = this.flattenAtCoderProblems(atCoderCatalog)
            .filter(({ problem }) => this.matchQuery([
            problem.pid,
            problem.title,
            problem.title_zh,
            problem.difficulty_label,
            ...problem.knowledge_points.map((point) => point.label)
        ], trimmedQuery))
            .slice(0, 30)
            .map(({ problem }) => this.buildAtCoderProblemListItem(problem));
        return {
            query: trimmedQuery,
            total_count: gesp.length + atcoder.length,
            gesp,
            atcoder
        };
    }
    async getProgress(userKey) {
        const normalizedUserKey = this.normalizeProgressUserKey(userKey);
        const mysqlProgress = await this.getMysqlProgress(normalizedUserKey);
        return this.enrichProgressStore(mysqlProgress || this.getMemoryProgress(normalizedUserKey));
    }
    async recordProgressEvent(body, userKey) {
        const normalizedUserKey = this.normalizeProgressUserKey(userKey);
        const event = this.normalizeProgressEvent(body);
        const mysqlProgress = await this.recordMysqlProgressEvent(normalizedUserKey, event);
        if (mysqlProgress) {
            return this.enrichProgressStore(mysqlProgress);
        }
        this.recordMemoryProgressEvent(event);
        return this.enrichProgressStore(this.getMemoryProgress(normalizedUserKey));
    }
    async removeProgressEvent(body, userKey) {
        const normalizedUserKey = this.normalizeProgressUserKey(userKey);
        const event = this.normalizeProgressEvent(body);
        const mysqlProgress = await this.removeMysqlProgressEvent(normalizedUserKey, event);
        if (mysqlProgress) {
            return this.enrichProgressStore(mysqlProgress);
        }
        this.removeMemoryProgressEvent(event);
        return this.enrichProgressStore(this.getMemoryProgress(normalizedUserKey));
    }
    async getMysqlProgress(userKey) {
        const connection = await this.createProgressMysqlConnection();
        if (!connection) {
            return null;
        }
        try {
            await this.ensureProgressSchema(connection);
            return await this.readMysqlProgress(connection, userKey);
        }
        catch (error) {
            this.logger.warn(`Falling back to in-memory consumer progress read: ${this.errorMessage(error)}`);
            return null;
        }
        finally {
            await connection.end();
        }
    }
    async recordMysqlProgressEvent(userKey, event) {
        const connection = await this.createProgressMysqlConnection();
        if (!connection) {
            return null;
        }
        try {
            await this.ensureProgressSchema(connection);
            const normalized = this.toStoredProgressEvent(event, new Date());
            await connection.execute(`INSERT INTO consumer_mobile_progress_events (
          user_key,
          problem_source,
          problem_id,
          event_type,
          title,
          event_json
        ) VALUES (?, ?, ?, ?, ?, CAST(? AS JSON))
        ON DUPLICATE KEY UPDATE
          title = VALUES(title),
          event_json = VALUES(event_json),
          updated_at = CURRENT_TIMESTAMP`, [
                userKey,
                normalized.source,
                normalized.problemId,
                normalized.type,
                normalized.title,
                JSON.stringify(normalized)
            ]);
            return await this.readMysqlProgress(connection, userKey);
        }
        catch (error) {
            this.logger.warn(`Falling back to in-memory consumer progress write: ${this.errorMessage(error)}`);
            return null;
        }
        finally {
            await connection.end();
        }
    }
    async removeMysqlProgressEvent(userKey, event) {
        const connection = await this.createProgressMysqlConnection();
        if (!connection) {
            return null;
        }
        try {
            await this.ensureProgressSchema(connection);
            await connection.execute(`DELETE FROM consumer_mobile_progress_events
         WHERE user_key = ? AND problem_source = ? AND problem_id = ? AND event_type = ?`, [
                userKey,
                event.source === "atcoder" ? "atcoder" : "gesp",
                event.problemId,
                event.type
            ]);
            return await this.readMysqlProgress(connection, userKey);
        }
        catch (error) {
            this.logger.warn(`Falling back to in-memory consumer progress delete: ${this.errorMessage(error)}`);
            return null;
        }
        finally {
            await connection.end();
        }
    }
    async readMysqlProgress(connection, userKey) {
        const [rows] = await connection.query(`SELECT problem_source, problem_id, event_type, title, event_json, updated_at
       FROM consumer_mobile_progress_events
       WHERE user_key = ?
       ORDER BY updated_at DESC, problem_id ASC`, [userKey]);
        const events = rows.map((row) => this.progressRowToEvent(row));
        return this.buildProgressStore("mysql", userKey, events);
    }
    recordMemoryProgressEvent(event) {
        if (event.type === "favorite") {
            this.favoriteProblems.set(event.problemId, event);
        }
        else if (event.type === "review") {
            this.reviewedProblems.set(event.problemId, event);
        }
        else {
            this.viewedProblems.set(event.problemId, event);
        }
    }
    removeMemoryProgressEvent(event) {
        if (event.type === "favorite") {
            this.favoriteProblems.delete(event.problemId);
        }
        else if (event.type === "review") {
            this.reviewedProblems.delete(event.problemId);
        }
        else {
            this.viewedProblems.delete(event.problemId);
        }
    }
    getMemoryProgress(userKey) {
        const viewed = [...this.viewedProblems.values()].map((event) => this.toStoredProgressEvent(event, new Date()));
        const favorites = [...this.favoriteProblems.values()].map((event) => this.toStoredProgressEvent(event, new Date()));
        const reviewed = [...this.reviewedProblems.values()].map((event) => this.toStoredProgressEvent(event, new Date()));
        return this.buildProgressStore("memory", userKey, [...viewed, ...favorites, ...reviewed]);
    }
    buildProgressStore(dataSource, userKey, events) {
        const viewed = events.filter((event) => event.type === "view");
        const favorites = events.filter((event) => event.type === "favorite");
        const reviewed = events.filter((event) => event.type === "review");
        const weeklyViewed = viewed.filter((event) => this.isCurrentWeek(event.recordedAt));
        const weeklyFavorites = favorites.filter((event) => this.isCurrentWeek(event.recordedAt));
        const weeklyReviewed = reviewed.filter((event) => this.isCurrentWeek(event.recordedAt));
        const weeklyScore = weeklyViewed.length + weeklyFavorites.length * 2 + weeklyReviewed.length * 3;
        const weeklyActionCount = weeklyViewed.length + weeklyFavorites.length + weeklyReviewed.length;
        const progressPct = Math.min(100, Math.round((weeklyScore / 12) * 100));
        const recentEvents = this.sortProgressEvents(events).slice(0, 8);
        return {
            data_source: dataSource,
            user_key: userKey,
            counts: {
                viewed: viewed.length,
                favorite: favorites.length,
                reviewed: reviewed.length,
                weekly_actions: weeklyActionCount
            },
            activity_count: events.length,
            mastery_pct: progressPct,
            progress_pct: progressPct,
            weekly_action_count: weeklyActionCount,
            viewed_count: viewed.length,
            favorite_count: favorites.length,
            reviewed_count: reviewed.length,
            weekly_viewed_count: weeklyViewed.length,
            weekly_favorite_count: weeklyFavorites.length,
            weekly_reviewed_count: weeklyReviewed.length,
            viewed,
            favorites,
            reviewed,
            weak_points: [],
            recent_events: recentEvents,
            review_plan: this.buildReviewPlan([], { viewed, favorites, reviewed, recentEvents })
        };
    }
    async enrichProgressStore(store) {
        const weakPoints = await this.buildProgressWeakPoints();
        return {
            ...store,
            weak_points: weakPoints,
            review_plan: this.buildReviewPlan(weakPoints, {
                viewed: store.viewed,
                favorites: store.favorites,
                reviewed: store.reviewed,
                recentEvents: store.recent_events
            })
        };
    }
    async buildProgressWeakPoints() {
        if (this.weakPointsCache && this.weakPointsCache.expiresAt > Date.now()) {
            return this.weakPointsCache.value;
        }
        try {
            const levelsResponse = await this.catalogService.getLevels();
            const catalogs = (await Promise.all(levelsResponse.levels.map((level) => this.catalogService.getLevelCatalog(level.level)))).filter((catalog) => Boolean(catalog));
            const weakPoints = catalogs.flatMap((catalog) => this.buildLevelDomains(catalog))
                .filter((domain) => domain.tone !== "good")
                .sort((a, b) => a.progress - b.progress || b.count - a.count)
                .slice(0, 5)
                .map((domain) => ({
                id: domain.id,
                name: domain.name,
                description: domain.description || `${domain.count} 道题`,
                count: domain.count,
                level: domain.level,
                progress: domain.progress,
                suggested_count: domain.progress < 45 ? 2 : 1,
                tone: domain.tone
            }));
            this.weakPointsCache = {
                expiresAt: Date.now() + this.consumerSummaryCacheTtlMs,
                value: weakPoints
            };
            return weakPoints;
        }
        catch (error) {
            this.logger.warn(`Unable to build consumer weak points: ${this.errorMessage(error)}`);
            return [];
        }
    }
    buildContinueTask(progress, featuredProblem) {
        const recent = progress.recent_events[0];
        if (recent) {
            return this.learningTaskFromEvent(recent, "continue", "继续学习", 90);
        }
        return featuredProblem ? this.learningTaskFromProblem(featuredProblem, "featured", "开始练习", 70) : null;
    }
    buildTodayTask(progress, problemTypes, featuredProblem) {
        const weakPoint = progress.weak_points[0];
        if (weakPoint) {
            return {
                id: `weak:${weakPoint.id}`,
                kind: "weak_point",
                title: `先补${weakPoint.name}`,
                subtitle: `${weakPoint.count} 道相关题 · 建议完成 ${weakPoint.suggested_count} 道`,
                domain_id: weakPoint.id,
                level: weakPoint.level ?? null,
                problem_id: featuredProblem?.id || null,
                source: featuredProblem?.source || "gesp",
                cta_label: "开始复习",
                priority: 100
            };
        }
        const weakType = [...problemTypes].sort((a, b) => a.progress - b.progress)[0];
        if (weakType) {
            return {
                id: `type:${weakType.id}`,
                kind: "weak_point",
                title: `先做${weakType.name}`,
                subtitle: `${weakType.level} · ${weakType.count} 题 · ${weakType.description}`,
                problem_id: featuredProblem?.id || null,
                source: featuredProblem?.source || "gesp",
                cta_label: "开始练习",
                priority: 95
            };
        }
        return featuredProblem ? this.learningTaskFromProblem(featuredProblem, "featured", "开始练习", 80) : null;
    }
    buildReviewPlan(weakPoints, progress) {
        const reviewedKeys = new Set(progress.reviewed.map((event) => `${event.source}:${event.problemId}`));
        const favoriteTasks = this.sortProgressEvents(progress.favorites)
            .filter((event) => !reviewedKeys.has(`${event.source}:${event.problemId}`))
            .slice(0, 2)
            .map((event, index) => this.learningTaskFromEvent(event, "review", "复习", 80 - index));
        const viewedTasks = this.sortProgressEvents(progress.viewed)
            .filter((event) => !reviewedKeys.has(`${event.source}:${event.problemId}`))
            .filter((event) => !favoriteTasks.some((task) => task.problem_id === event.problemId && task.source === event.source))
            .slice(0, Math.max(0, 3 - favoriteTasks.length))
            .map((event, index) => this.learningTaskFromEvent(event, "review", "继续", 60 - index));
        const weakTasks = weakPoints.slice(0, Math.max(0, 3 - favoriteTasks.length - viewedTasks.length)).map((point, index) => ({
            id: `weak:${point.id}`,
            kind: "weak_point",
            title: point.name,
            subtitle: `${point.count} 道题 · 建议完成 ${point.suggested_count} 道`,
            domain_id: point.id,
            level: point.level ?? null,
            problem_id: null,
            source: "gesp",
            cta_label: "去补弱项",
            priority: 50 - index
        }));
        const items = [...favoriteTasks, ...viewedTasks, ...weakTasks].slice(0, 3);
        const basis = [];
        if (favoriteTasks.length) {
            basis.push("favorites");
        }
        if (viewedTasks.length) {
            basis.push("viewed");
        }
        if (weakTasks.length) {
            basis.push("weak_points");
        }
        return {
            generated_at: new Date().toISOString(),
            status: items.length ? "ready" : "empty",
            basis,
            items
        };
    }
    learningTaskFromEvent(event, kind, ctaLabel, priority) {
        return {
            id: `${kind}:${event.source}:${event.problemId}`,
            kind,
            title: event.title || event.problemId,
            subtitle: `${event.source === "atcoder" ? "AtCoder" : "GESP"} · ${this.progressEventTypeLabel(event.type)} · ${this.formatEventDate(event.recordedAt)}`,
            problem_id: event.problemId,
            source: event.source,
            cta_label: ctaLabel,
            priority
        };
    }
    learningTaskFromProblem(problem, kind, ctaLabel, priority) {
        return {
            id: `${kind}:${problem.source}:${problem.id}`,
            kind,
            title: problem.title,
            subtitle: `${problem.level} · ${problem.domain} · ${problem.problem_type}`,
            problem_id: problem.id,
            source: problem.source,
            cta_label: ctaLabel,
            priority
        };
    }
    sortProgressEvents(events) {
        return [...events].sort((a, b) => new Date(b.recordedAt).getTime() - new Date(a.recordedAt).getTime() || a.problemId.localeCompare(b.problemId));
    }
    progressEventTypeLabel(type) {
        if (type === "favorite") {
            return "已收藏";
        }
        if (type === "review") {
            return "已复习";
        }
        return "已查看";
    }
    formatEventDate(recordedAt) {
        const date = new Date(recordedAt);
        if (Number.isNaN(date.getTime())) {
            return "最近";
        }
        return date.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
    }
    progressRowToEvent(row) {
        const eventJson = this.parseJson(row.event_json);
        return this.toStoredProgressEvent({
            problemId: this.asString(eventJson.problemId) || row.problem_id,
            source: eventJson.source === "atcoder" ? "atcoder" : row.problem_source,
            title: this.asString(eventJson.title) || row.title,
            type: eventJson.type === "favorite" || eventJson.type === "review" ? eventJson.type : row.event_type
        }, row.updated_at);
    }
    toStoredProgressEvent(event, recordedAt) {
        return {
            problemId: event.problemId,
            source: event.source === "atcoder" ? "atcoder" : "gesp",
            title: this.asString(event.title) || event.problemId,
            type: event.type === "favorite" || event.type === "review" ? event.type : "view",
            recordedAt: this.toIsoString(recordedAt)
        };
    }
    isCurrentWeek(recordedAt) {
        const date = new Date(recordedAt);
        if (Number.isNaN(date.getTime())) {
            return false;
        }
        const now = new Date();
        const startOfWeek = new Date(now);
        const day = startOfWeek.getDay() || 7;
        startOfWeek.setHours(0, 0, 0, 0);
        startOfWeek.setDate(startOfWeek.getDate() - day + 1);
        return date >= startOfWeek && date <= now;
    }
    async ensureProgressSchema(connection) {
        if (this.progressSchemaReady) {
            return;
        }
        await connection.query(`
      CREATE TABLE IF NOT EXISTS consumer_mobile_progress_events (
        user_key VARCHAR(120) NOT NULL DEFAULT 'anonymous',
        problem_source VARCHAR(32) NOT NULL,
        problem_id VARCHAR(180) NOT NULL,
        event_type VARCHAR(32) NOT NULL,
        title VARCHAR(512) NOT NULL,
        event_json JSON NOT NULL,
        created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
        PRIMARY KEY (user_key, problem_source, problem_id, event_type),
        INDEX idx_consumer_progress_user_type (user_key, event_type, updated_at),
        INDEX idx_consumer_progress_problem (problem_source, problem_id)
      ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci
    `);
        this.progressSchemaReady = true;
    }
    buildLevels(levelsResponse, catalogs) {
        const catalogByLevel = new Map(catalogs.map((catalog) => [catalog.level, catalog]));
        return levelsResponse.levels.map((level) => {
            const catalog = catalogByLevel.get(level.level);
            const progress = this.statusProgress(level.status_counts.confirmed + level.status_counts.candidate, level.problem_count);
            const topDomains = (catalog?.domains || []).slice(0, 2).map((domain) => domain.domain_label);
            return {
                level: level.level,
                label: `${level.level} 级`,
                title: topDomains.length ? topDomains.join(" / ") : "待分类题型",
                description: topDomains.length ? `${topDomains.join("、")} 等 ${level.domain_count} 个算法范畴` : "后端暂未归类算法范畴",
                count: level.problem_count,
                progress,
                tone: this.toneFromProgress(progress)
            };
        });
    }
    buildLightLevels(levelsResponse) {
        return levelsResponse.levels.map((level) => {
            const progress = this.statusProgress(level.status_counts.confirmed + level.status_counts.candidate, level.problem_count);
            return {
                level: level.level,
                label: `${level.level} 级`,
                title: `${level.domain_count} 个算法范畴`,
                description: `${level.problem_count} 道题 · ${level.domain_count} 个知识域`,
                count: level.problem_count,
                progress,
                tone: this.toneFromProgress(progress)
            };
        });
    }
    buildDomains(catalogs) {
        const domainMap = new Map();
        for (const catalog of catalogs) {
            for (const domain of catalog.domains) {
                const bucket = domainMap.get(domain.domain_id) || {
                    id: domain.domain_id,
                    name: domain.domain_label,
                    count: 0,
                    ready: 0,
                    knowledge: new Set()
                };
                bucket.count += domain.problem_count;
                bucket.ready += domain.status_counts.confirmed + domain.status_counts.candidate;
                for (const problemType of domain.problem_types) {
                    for (const point of problemType.knowledge_points) {
                        bucket.knowledge.add(point.label);
                    }
                }
                domainMap.set(domain.domain_id, bucket);
            }
        }
        return [...domainMap.values()]
            .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
            .slice(0, 8)
            .map((domain) => {
            const progress = this.statusProgress(domain.ready, domain.count);
            return {
                id: domain.id,
                name: domain.name,
                description: [...domain.knowledge].slice(0, 3).join("、") || `${domain.count} 道题`,
                count: domain.count,
                progress,
                tone: this.toneFromProgress(progress)
            };
        });
    }
    buildProblemTypes(catalogs) {
        const types = catalogs.flatMap((catalog) => (catalog.domains.flatMap((domain) => (domain.problem_types.map((problemType) => ({
            id: `${catalog.level}:${domain.domain_id}:${problemType.problem_type_id}`,
            count: problemType.problem_count,
            name: problemType.problem_type_label,
            description: problemType.knowledge_points.slice(0, 3).map((point) => point.label).join("、") || domain.domain_label,
            level: `${catalog.level} 级`,
            source: "GESP",
            progress: this.statusProgress(domain.status_counts.confirmed + domain.status_counts.candidate, domain.problem_count)
        }))))));
        return types
            .sort((a, b) => b.count - a.count || a.level.localeCompare(b.level))
            .slice(0, 12);
    }
    buildAtCoderTracks(catalog) {
        const flatProblems = this.flattenAtCoderProblems(catalog);
        const buckets = new Map();
        for (const item of flatProblems) {
            const bucket = buckets.get(item.problem.difficulty) || { count: 0, tags: new Map() };
            bucket.count += 1;
            for (const point of item.problem.knowledge_points) {
                bucket.tags.set(point.label, (bucket.tags.get(point.label) || 0) + 1);
            }
            buckets.set(item.problem.difficulty, bucket);
        }
        return [2, 3, 4, 5].map((difficulty) => {
            const bucket = buckets.get(difficulty) || { count: 0, tags: new Map() };
            const meta = this.atCoderDifficultyMeta(difficulty);
            return {
                count: bucket.count,
                difficulty: meta.shortLabel,
                name: meta.name,
                description: meta.description,
                tags: [...bucket.tags.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([tag]) => tag)
            };
        }).filter((track) => track.count > 0);
    }
    buildLevelDomains(catalog) {
        return catalog.domains.map((domain) => {
            const progress = this.statusProgress(domain.status_counts.confirmed + domain.status_counts.candidate, domain.problem_count);
            const knowledge = new Set();
            for (const problemType of domain.problem_types) {
                for (const point of problemType.knowledge_points) {
                    knowledge.add(point.label);
                }
            }
            return {
                id: domain.domain_id,
                name: domain.domain_label,
                description: [...knowledge].slice(0, 3).join("、") || `${domain.problem_count} 道题`,
                count: domain.problem_count,
                level: catalog.level,
                progress,
                tone: this.toneFromProgress(progress)
            };
        });
    }
    buildLevelProblemTypes(catalog, domain) {
        return domain.problem_types.map((problemType) => ({
            id: problemType.problem_type_id,
            count: problemType.problem_count,
            name: problemType.problem_type_label,
            description: problemType.knowledge_points.slice(0, 3).map((point) => point.label).join("、") || domain.domain_label,
            level: `${catalog.level} 级`,
            source: "GESP",
            progress: this.statusProgress(domain.status_counts.confirmed + domain.status_counts.candidate, domain.problem_count)
        }));
    }
    dedupeLevelProblemTypes(problemTypes) {
        const typeById = new Map();
        for (const type of problemTypes) {
            const existing = typeById.get(type.id);
            if (!existing) {
                typeById.set(type.id, { ...type });
                continue;
            }
            existing.count += type.count;
            existing.progress = Math.round((existing.progress + type.progress) / 2);
            if (!existing.description.includes(type.description)) {
                existing.description = [existing.description, type.description].filter(Boolean).slice(0, 2).join("、");
            }
        }
        return [...typeById.values()].sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));
    }
    buildGespProblemList(catalog, filters) {
        if (!catalog) {
            return [];
        }
        const deduped = new Map();
        for (const item of catalog.domains
            .filter((domain) => !filters.domainId || domain.domain_id === filters.domainId)
            .flatMap((domain) => (domain.problem_types
            .filter((problemType) => !filters.problemTypeId || problemType.problem_type_id === filters.problemTypeId)
            .flatMap((problemType) => (problemType.problems.map((problem) => ({ domain, problemType, problem }))))))
            .filter(({ problem, domain, problemType }) => this.matchQuery([
            problem.title,
            problem.official_problem_id,
            problem.session,
            domain.domain_label,
            problemType.problem_type_label,
            ...problem.knowledge_point_tags.map((tag) => tag.label)
        ], filters.query))) {
            if (!deduped.has(item.problem.id)) {
                deduped.set(item.problem.id, item);
            }
        }
        return [...deduped.values()]
            .slice(0, 80)
            .map(({ domain, problem, problemType }) => this.buildGespProblemListItem(catalog, domain, problemType, problem));
    }
    buildGespProblemListItem(catalog, domain, problemType, problem) {
        return {
            id: problem.id,
            title: problem.title,
            subtitle: `${problem.session} · ${this.questionTypeLabel(problem.question_type)}`,
            level: `${catalog.level} 级`,
            domain: domain.domain_label,
            problem_type: problemType.problem_type_label,
            knowledge_points: problem.knowledge_point_tags.slice(0, 4).map((tag) => tag.label),
            answer_status: problem.answer_guidance?.reference_answer.status || problem.status,
            has_code: Boolean(problem.detail_completeness && !problem.detail_completeness.needs_programming_solution)
        };
    }
    dedupeMobileProblemItems(items) {
        const itemById = new Map();
        for (const item of items) {
            if (!itemById.has(item.id)) {
                itemById.set(item.id, item);
            }
        }
        return [...itemById.values()];
    }
    buildAtCoderProblemListItem(problem) {
        return {
            id: problem.id,
            title: problem.title_zh || problem.title,
            subtitle: `${problem.pid} · ${problem.difficulty_label}`,
            level: problem.difficulty_label,
            domain: "AtCoder",
            problem_type: problem.knowledge_points[0]?.label || "算法题",
            knowledge_points: problem.knowledge_points.slice(0, 4).map((point) => point.label),
            answer_status: problem.acceptance_rate == null ? "needs_review" : `${Math.round(problem.acceptance_rate * 100)}% AC`,
            has_code: false
        };
    }
    pickFeaturedGespProblem(catalogs) {
        return catalogs
            .flatMap((catalog) => catalog.domains.flatMap((domain) => domain.problem_types.flatMap((type) => type.problems)))
            .find((problem) => problem.detail_completeness?.has_reference_answer || problem.answer_guidance?.understanding_example.steps.length)
            || catalogs[0]?.domains[0]?.problem_types[0]?.problems[0]
            || null;
    }
    pickNextGespProblem(catalogs, progress) {
        const completedKeys = new Set([
            ...progress.reviewed.map((event) => event.problemId),
            ...progress.recent_events.slice(0, 6).map((event) => event.problemId)
        ]);
        const weakDomainNames = new Set(progress.weak_points.slice(0, 3).map((point) => point.name));
        const candidates = new Map();
        for (const catalog of catalogs) {
            for (const domain of catalog.domains) {
                for (const problemType of domain.problem_types) {
                    for (const problem of problemType.problems) {
                        if (!candidates.has(problem.id)) {
                            candidates.set(problem.id, { domainName: domain.domain_label, problem });
                        }
                    }
                }
            }
        }
        const available = [...candidates.values()]
            .filter(({ problem }) => !completedKeys.has(problem.id))
            .sort((a, b) => {
            const weakA = weakDomainNames.has(a.domainName) ? 0 : 1;
            const weakB = weakDomainNames.has(b.domainName) ? 0 : 1;
            return weakA - weakB || a.problem.title.localeCompare(b.problem.title);
        });
        const pool = available.length ? available : [...candidates.values()];
        if (!pool.length) {
            return null;
        }
        const rotationSeed = `${progress.user_key}:${new Date().toISOString().slice(0, 10)}:${progress.activity_count}`;
        return pool[this.hashIndex(rotationSeed, pool.length)]?.problem || null;
    }
    buildGespFeaturedProblem(problem) {
        const domain = problem.resolved_algorithm_domains[0]?.label || "未分类";
        const problemType = problem.resolved_problem_type_tags[0]?.label || "待抽取题型";
        const knowledgePoints = problem.resolved_knowledge_point_tags.map((tag) => tag.label);
        const statementSections = (problem.detail?.statement.sections || [])
            .filter((section) => section.markdown.trim())
            .map((section) => ({
            id: section.id,
            title: section.title || "题目描述",
            markdown: section.markdown
        }));
        const statement = problem.detail?.statement.stem
            || statementSections[0]?.markdown
            || problem.answer_guidance?.understanding_example.summary
            || "后端暂未收录完整题面，仅展示分类与来源信息。";
        const sourceLinks = this.dedupeSourceLinks([
            ...(problem.detail?.source_links || []),
            ...(problem.answer_guidance?.reference_links || [])
        ]).slice(0, 4);
        return {
            id: problem.id,
            source: "gesp",
            title: problem.title,
            subtitle: `${problem.session} · C++ ${problem.level} 级 · ${this.questionTypeLabel(problem.question_type)}`,
            level: `${problem.level} 级`,
            question_type: this.questionTypeLabel(problem.question_type),
            domain,
            problem_type: problemType,
            knowledge_points: knowledgePoints,
            statement,
            statement_sections: statementSections.length ? statementSections : [{
                    id: "statement",
                    title: "题目描述",
                    markdown: statement
                }],
            sample_cases: (problem.detail?.sample_cases.cases || []).map((sample) => ({
                input: sample.input,
                output: sample.output
            })),
            answer_status: problem.answer_guidance?.reference_answer.status || problem.detail?.programming_solution.status || "needs_review",
            confidence: problem.answer_guidance?.reference_answer.confidence ?? null,
            code: problem.detail?.programming_solution.code || null,
            code_filename: `${problem.id.replace(/[^a-zA-Z0-9_-]/g, "_")}.cpp`,
            algorithm: problem.detail?.programming_solution.algorithm || null,
            complexity: problem.detail?.programming_solution.complexity || null,
            steps: problem.answer_guidance?.understanding_example.steps || problem.detail?.programming_solution.notes || [],
            source_links: sourceLinks.map((link, index) => ({
                title: this.asString(link.title) || this.asString(link.role) || this.asString(link.source_kind) || `来源 ${index + 1}`,
                url: this.asString(link.url) || this.asString(link.source_url) || null,
                tag: this.asString(link.trust_level) || this.asString(link.reference_kind) || this.asString(link.source_kind) || "source",
                tone: index === 0 ? "good" : "normal"
            }))
        };
    }
    buildAtCoderFeaturedProblem(problem) {
        const statementSections = problem.statement.sections
            .filter((section) => section.markdown.trim())
            .map((section) => ({
            id: section.id,
            title: section.title || "题目描述",
            markdown: section.markdown
        }));
        const statement = statementSections[0]?.markdown || "后端暂未收录题面段落。";
        return {
            id: problem.id,
            source: "atcoder",
            title: problem.title_zh || problem.title,
            subtitle: `AtCoder · ${problem.difficulty_label} · ${problem.pid}`,
            level: problem.difficulty_label,
            question_type: "programming",
            domain: problem.algorithm_domains[0]?.label || "AtCoder",
            problem_type: problem.problem_type_tags[0]?.label || "算法题",
            knowledge_points: problem.knowledge_points.map((point) => point.label),
            statement,
            statement_sections: statementSections.length ? statementSections : [{
                    id: "statement",
                    title: "题目描述",
                    markdown: statement
                }],
            sample_cases: problem.statement.samples.map((sample) => ({
                input: sample.input,
                output: sample.output
            })),
            answer_status: problem.programming_solution.status,
            confidence: problem.acceptance_rate,
            code: problem.programming_solution.code,
            code_filename: `${problem.pid}.cpp`,
            algorithm: problem.programming_solution.algorithm,
            complexity: problem.programming_solution.complexity,
            steps: problem.programming_solution.notes,
            source_links: [{
                    title: "AtCoder / 洛谷公开题面",
                    url: problem.statement.source_url || problem.source_url,
                    tag: problem.statement.status,
                    tone: "good"
                }]
        };
    }
    flattenAtCoderProblems(catalog) {
        const problemById = new Map();
        for (const domain of catalog.domains) {
            for (const problemType of domain.problem_types) {
                for (const problem of problemType.problems) {
                    if (!problemById.has(problem.id)) {
                        problemById.set(problem.id, { problem });
                    }
                }
            }
        }
        return [...problemById.values()];
    }
    buildRecommendation(problemTypes, atCoderCatalog) {
        const weakType = [...problemTypes].sort((a, b) => a.progress - b.progress)[0];
        const atCoderCount = atCoderCatalog.summary.problem_count;
        if (!weakType) {
            return `GESP 目录已接入后端，可从 AtCoder ${atCoderCount} 道题中补充算法训练。`;
        }
        return `优先补 ${weakType.level}「${weakType.name}」，再从 AtCoder ${atCoderCount} 道题中筛选同类算法训练。`;
    }
    atCoderDifficultyMeta(difficulty) {
        const map = {
            2: { shortLabel: "A-B", name: "入门实现", description: "条件、循环、数学小结论，适合一级到三级补速度。" },
            3: { shortLabel: "C", name: "基础算法", description: "枚举、贪心、二分、前缀和，适合四级到五级巩固。" },
            4: { shortLabel: "D", name: "DP / 图论", description: "状态转移、最短路、树和并查集，衔接六级以上。" },
            5: { shortLabel: "E+", name: "挑战训练", description: "组合优化和复杂数据结构，作为拔高题库入口。" }
        };
        return map[difficulty] || { shortLabel: String(difficulty), name: "其他难度", description: "按后端题库难度聚合。" };
    }
    questionTypeLabel(type) {
        const map = {
            judgment: "判断题",
            programming: "编程题",
            selection: "选择题"
        };
        return map[type] || type;
    }
    statusProgress(confirmed, total) {
        if (!total) {
            return 0;
        }
        return Math.round((confirmed / total) * 100);
    }
    toneFromProgress(progress) {
        if (progress >= 75) {
            return "good";
        }
        if (progress >= 45) {
            return "normal";
        }
        return "weak";
    }
    average(values) {
        if (!values.length) {
            return 0;
        }
        return Math.round(this.sum(values) / values.length);
    }
    sum(values) {
        return values.reduce((total, value) => total + value, 0);
    }
    matchQuery(values, query) {
        const normalizedQuery = query?.trim().toLowerCase();
        if (!normalizedQuery) {
            return true;
        }
        return values.some((value) => value.toLowerCase().includes(normalizedQuery));
    }
    hashIndex(value, size) {
        let hash = 0;
        for (let index = 0; index < value.length; index += 1) {
            hash = (hash * 31 + value.charCodeAt(index)) >>> 0;
        }
        return size ? hash % size : 0;
    }
    normalizeProgressEvent(body) {
        const candidate = body && typeof body === "object" ? body : {};
        const problemId = this.asString(candidate.problemId);
        if (!problemId) {
            throw new BadRequestException("problemId is required");
        }
        const type = candidate.type === "favorite" || candidate.type === "review" ? candidate.type : "view";
        const source = candidate.source === "atcoder" ? "atcoder" : "gesp";
        return {
            problemId,
            source,
            title: this.asString(candidate.title) || problemId,
            type
        };
    }
    normalizeProgressUserKey(value) {
        const rawValue = this.asString(value).trim();
        if (!rawValue) {
            return this.defaultProgressUserKey;
        }
        const normalized = rawValue.replace(/[^a-zA-Z0-9:_-]/g, "_").slice(0, 120);
        return normalized || this.defaultProgressUserKey;
    }
    parseJson(value) {
        if (typeof value === "string") {
            try {
                return JSON.parse(value);
            }
            catch {
                return {};
            }
        }
        if (value && typeof value === "object") {
            return value;
        }
        return {};
    }
    toIsoString(value) {
        if (value instanceof Date) {
            return value.toISOString();
        }
        const date = new Date(value);
        return Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString();
    }
    errorMessage(error) {
        return error instanceof Error ? error.message : String(error);
    }
    asString(value) {
        return typeof value === "string" ? value : "";
    }
    async createProgressMysqlConnection() {
        try {
            return await mysql.createConnection({
                host: process.env.MYSQL_HOST || "127.0.0.1",
                port: Number(process.env.MYSQL_PORT || 3310),
                database: process.env.MYSQL_DATABASE || "gesp_catalog",
                user: process.env.MYSQL_USER || "gesp",
                password: process.env.MYSQL_PASSWORD || "gesp_dev_password",
                charset: "utf8mb4"
            });
        }
        catch (error) {
            this.logger.warn(`Unable to connect to consumer progress MySQL: ${this.errorMessage(error)}`);
            return null;
        }
    }
    dedupeSourceLinks(links) {
        const seen = new Set();
        return links.filter((link) => {
            const key = [
                this.asString(link.title) || this.asString(link.role) || this.asString(link.source_kind),
                this.asString(link.url) || this.asString(link.source_url)
            ].join("::");
            if (seen.has(key)) {
                return false;
            }
            seen.add(key);
            return true;
        });
    }
};
ConsumerMobileService = ConsumerMobileService_1 = __decorate([
    Injectable(),
    __param(0, Inject(CatalogService)),
    __param(1, Inject(AtCoderCatalogService)),
    __metadata("design:paramtypes", [CatalogService,
        AtCoderCatalogService])
], ConsumerMobileService);
export { ConsumerMobileService };
