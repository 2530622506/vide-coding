import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const secondarySourcesPath = "data/source-registry/sources.secondary.json";
const officialProblemsPath = "data/problem-ingestion/official-pdf-problems.json";
const outputDir = "data/oj-ingestion";
const outputPath = `${outputDir}/mirror-problem-candidates.json`;
const generator = "scripts/ingest-oj-mirrors.mjs";
const maxLuoguPages = Number.parseInt(process.env.LUOGU_MAX_PAGES || "12", 10);
const snippetLimit = 220;
const githubTreeApiPath = "/git/trees/main?recursive=1";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeWhitespace(value) {
  return value.replace(/\u00a0/g, " ").replace(/\s+/g, " ").trim();
}

function stripTags(value) {
  return normalizeWhitespace(value.replace(/<script[\s\S]*?<\/script>/gi, " ").replace(/<style[\s\S]*?<\/style>/gi, " ").replace(/<[^>]+>/g, " "));
}

function decodeHtml(value) {
  return value
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&#x27;/g, "'")
    .replace(/&#39;/g, "'");
}

function compactSnippet(value, limit = snippetLimit) {
  return normalizeWhitespace(decodeHtml(stripTags(value))).slice(0, limit);
}

function extractTitle(html) {
  const ogTitle = html.match(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i)?.[1];
  const h1 = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i)?.[1];
  const title = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1];
  return decodeHtml(compactSnippet(ogTitle || h1 || title || ""));
}

function extractLinks(html, baseUrl) {
  const links = [];
  const pattern = /<a\b[^>]*href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi;
  let match;

  while ((match = pattern.exec(html)) !== null) {
    const rawHref = decodeHtml(match[1].trim());
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      continue;
    }
    try {
      const url = new URL(rawHref, baseUrl).href;
      links.push({
        url,
        text: compactSnippet(match[2])
      });
    } catch {
      // Ignore malformed third-party links.
    }
  }

  const seen = new Set();
  return links.filter((link) => {
    const key = `${link.url}\n${link.text}`;
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

function extractLentilleContext(html) {
  const match = html.match(/<script[^>]+id=["']lentille-context["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) {
    return null;
  }
  try {
    return JSON.parse(decodeHtml(match[1]));
  } catch {
    return null;
  }
}

function levelFromText(value) {
  const compact = normalizeWhitespace(value).replace(/\s+/g, "");
  const chinese = compact.match(/([一二三四五六七八])级/);
  const map = new Map([
    ["一", 1],
    ["二", 2],
    ["三", 3],
    ["四", 4],
    ["五", 5],
    ["六", 6],
    ["七", 7],
    ["八", 8]
  ]);
  if (chinese) {
    return map.get(chinese[1]) || null;
  }
  const numericChinese = compact.match(/([1-8])级/);
  if (numericChinese) {
    return Number.parseInt(numericChinese[1], 10);
  }
  const numeric = compact.match(/(?:level|等级)([1-8])/i);
  return numeric ? Number.parseInt(numeric[1], 10) : null;
}

function sessionFromText(value) {
  const match = value.match(/GESP\s*(20\d{2})(\d{2})/i)
    || value.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月/)
    || value.match(/(20\d{2})[.+-](\d{1,2})/);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function normalizeProblemTitle(value) {
  return normalizeWhitespace(value)
    .replace(/^#?[A-Z]*\d+\s*[:：.]?\s*/i, "")
    .replace(/\[[^\]]*GESP[^\]]*\]/gi, "")
    .replace(/GESP\s*\d{6}/gi, "")
    .replace(/[一二三四五六七八]级/g, "")
    .replace(/题目详情\s*-\s*/g, "")
    .replace(/\s*-\s*(洛谷|Hydro).*$/i, "")
    .replace(/^[:：.\-\s]+/, "")
    .trim()
    .toLowerCase();
}

function cleanTitle(value) {
  return normalizeWhitespace(value)
    .replace(/^题目详情\s*-\s*/g, "")
    .replace(/\s*-\s*(洛谷|Hydro).*$/i, "")
    .replace(/^#?[A-Z]*\d+\.\s*/i, "")
    .trim();
}

function inferOjSystem(url) {
  const parsed = new URL(url);
  if (parsed.hostname.includes("luogu.com.cn")) {
    return "luogu";
  }
  if (parsed.hostname.includes("zqiceberg.com")) {
    return "zqiceberg";
  }
  if (parsed.hostname.includes("wenjian.club")) {
    return "hydro";
  }
  if (parsed.hostname.includes("aijieoj.cn")) {
    return "aijieoj";
  }
  if (parsed.hostname.includes("cspoj.com")) {
    return "cspoj";
  }
  if (parsed.hostname.includes("acgo.cn")) {
    return "acgo";
  }
  if (parsed.hostname.includes("czos.cn")) {
    return "dongfangboyi";
  }
  if (parsed.hostname.includes("xwjedu.cn")) {
    return "xinchuan";
  }
  if (parsed.hostname.includes("yurunapp.cn")) {
    return "yurun";
  }
  if (parsed.hostname.includes("github.com")) {
    return "github";
  }
  return parsed.hostname.replace(/^www\./, "");
}

function inferOjId(url, fallbackText = "") {
  const parsed = new URL(url);
  const text = `${url} ${fallbackText}`;
  if (parsed.hostname.includes("luogu.com.cn")) {
    return text.match(/\b([A-Z]\d{3,6})\b/)?.[1] || null;
  }
  if (parsed.hostname.includes("wenjian.club")) {
    return parsed.pathname.match(/\/p\/([^/?#]+)/)?.[1] || text.match(/\b(GESP\d+)\b/)?.[1] || null;
  }
  if (parsed.hostname.includes("aijieoj.cn") || parsed.hostname.includes("cspoj.com")) {
    return parsed.searchParams.get("id") || null;
  }
  if (parsed.hostname.includes("acgo.cn")) {
    return parsed.pathname.match(/\/(?:problemset\/info|problem)\/([^/?#]+)/)?.[1] || null;
  }
  if (parsed.hostname.includes("yurunapp.cn")) {
    return parsed.pathname.match(/\/p\/([^/?#]+)/)?.[1] || null;
  }
  return text.match(/\b(GESP\d+|[A-Z]\d{3,6})\b/)?.[1] || null;
}

function looksLikeProblemLink(link) {
  const parsed = new URL(link.url);
  return /\/problem\/[A-Z]\d+/.test(parsed.pathname)
    || /\/p\/[^/?#]+/.test(parsed.pathname)
    || /problem\.php/.test(parsed.pathname)
    || /problemset\/info/.test(parsed.pathname)
    || /GESP/i.test(link.text)
    || /GESP/i.test(link.url);
}

function createEntry({ source, url, title, ojId, extractionMethod, evidenceSnippet, communityTags = [], status = "active" }) {
  const normalizedTitle = normalizeProblemTitle(title);
  return {
    id: `mirror:${source.id}:${inferOjSystem(url)}:${ojId || sha256(url).slice(0, 10)}`,
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    url,
    title: cleanTitle(title),
    normalized_title: normalizedTitle,
    oj_system: inferOjSystem(url),
    oj_id: ojId || inferOjId(url, title),
    source_type: source.source_type,
    trust_level: source.trust_level,
    language_hint: source.language_scope,
    level_hint: levelFromText(title) || (source.level_scope.length === 1 && source.level_scope[0] !== "unknown" ? Number.parseInt(source.level_scope[0], 10) : null),
    session_hint: sessionFromText(title),
    community_tags: communityTags,
    evidence_snippet: compactSnippet(evidenceSnippet || title),
    extraction_method: extractionMethod,
    confidence: source.trust_level === "mirror" ? 0.64 : source.trust_level === "practice" ? 0.58 : 0.48,
    status,
    review_status: "needs_alignment"
  };
}

async function fetchHtml(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "User-Agent": "gesp-classification-catalog/0.1 (+metadata-only-oj-ingestion)"
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const contentType = response.headers.get("content-type") || "";
    return {
      url,
      final_url: response.url,
      status: response.status,
      ok: response.ok,
      content_type: contentType,
      byte_length: buffer.length,
      sha256: sha256(buffer),
      html: contentType.includes("text/html") || contentType.includes("application/xhtml") || url.includes("luogu.com.cn")
        ? buffer.toString("utf8")
        : ""
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchJson(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  try {
    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        "Accept": "application/vnd.github+json",
        "User-Agent": "gesp-classification-catalog/0.1 (+metadata-only-oj-ingestion)"
      }
    });
    const buffer = Buffer.from(await response.arrayBuffer());
    const text = buffer.toString("utf8");
    let json = null;
    try {
      json = JSON.parse(text);
    } catch {
      json = null;
    }
    return {
      url,
      final_url: response.url,
      status: response.status,
      ok: response.ok,
      content_type: response.headers.get("content-type") || "",
      byte_length: buffer.length,
      sha256: sha256(buffer),
      json
    };
  } finally {
    clearTimeout(timeout);
  }
}

function buildDocument(source, fetched, discoveredFrom = null) {
  const title = fetched.html ? extractTitle(fetched.html) : "";
  const context = fetched.html ? extractLentilleContext(fetched.html) : null;
  return {
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    discovered_from: discoveredFrom,
    url: fetched.url,
    final_url: fetched.final_url,
    status: fetched.status,
    ok: fetched.ok,
    content_type: fetched.content_type || null,
    content_kind: fetched.html ? "html" : "other",
    title,
    sha256: fetched.sha256,
    byte_length: fetched.byte_length,
    trust_level: source.trust_level,
    source_type: source.source_type,
    access_note: context?.status === 401 ? "login_required" : context?.status === 404 ? "not_found" : null
  };
}

function buildJsonDocument(source, fetched, discoveredFrom = null) {
  return {
    source_id: source.id,
    source_name: source.name,
    source_url: source.url,
    discovered_from: discoveredFrom,
    url: fetched.url,
    final_url: fetched.final_url,
    status: fetched.status,
    ok: fetched.ok,
    content_type: fetched.content_type || null,
    content_kind: "json",
    title: source.name,
    sha256: fetched.sha256,
    byte_length: fetched.byte_length,
    trust_level: source.trust_level,
    source_type: source.source_type,
    access_note: fetched.status === 403 ? "rate_limited_or_forbidden" : fetched.status === 404 ? "not_found" : null
  };
}

function entriesFromLuoguContext(source, fetched) {
  const context = extractLentilleContext(fetched.html);
  const problems = context?.data?.problems?.result || context?.data?.training?.problems;
  if (!Array.isArray(problems)) {
    return [];
  }
  return problems.map((problem) => createEntry({
    source,
    url: `https://www.luogu.com.cn/problem/${problem.pid}`,
    title: problem.name,
    ojId: problem.pid,
    communityTags: Array.isArray(problem.tags) ? problem.tags.map(String) : [],
    evidenceSnippet: problem.name,
    extractionMethod: "luogu_lentille_problem_list"
  }));
}

function luoguPaginationUrls(source, fetched) {
  const context = extractLentilleContext(fetched.html);
  const problems = context?.data?.problems;
  if (!problems?.count || !problems?.perPage) {
    return [];
  }
  const pageCount = Math.min(Math.ceil(problems.count / problems.perPage), maxLuoguPages);
  const urls = [];
  const base = new URL(source.url);
  for (let page = 2; page <= pageCount; page += 1) {
    const next = new URL(base.href);
    next.searchParams.set("page", String(page));
    urls.push(next.href);
  }
  return urls;
}

function entriesFromLinks(source, fetched) {
  if (!fetched.html) {
    return [];
  }
  return extractLinks(fetched.html, fetched.final_url)
    .filter(looksLikeProblemLink)
    .map((link) => {
      const ojId = inferOjId(link.url, link.text);
      return createEntry({
        source,
        url: link.url,
        title: link.text || extractTitle(fetched.html),
        ojId,
        evidenceSnippet: link.text || extractTitle(fetched.html),
        extractionMethod: "html_anchor_problem_link"
      });
    })
    .filter((entry) => entry.oj_id || /GESP/i.test(entry.title) || /GESP/i.test(entry.url));
}

function entryFromDetailPage(source, fetched) {
  if (!["oj_mirror", "solution_article"].includes(source.source_type)) {
    return null;
  }
  const title = extractTitle(fetched.html);
  const ojId = inferOjId(fetched.final_url, title);
  if (!title && !ojId) {
    return null;
  }
  if (source.source_type === "solution_article" && !/GESP/i.test(title)) {
    return null;
  }
  return createEntry({
    source,
    url: fetched.final_url,
    title: title || source.name,
    ojId,
    evidenceSnippet: title || source.name,
    extractionMethod: "html_detail_page"
  });
}

function githubTreeApiUrl(sourceUrl) {
  const parsed = new URL(sourceUrl);
  const parts = parsed.pathname.split("/").filter(Boolean);
  if (parsed.hostname !== "github.com" || parts.length < 2) {
    return null;
  }
  return `https://api.github.com/repos/${parts[0]}/${parts[1]}${githubTreeApiPath}`;
}

function githubBlobUrl(sourceUrl, path) {
  const parsed = new URL(sourceUrl);
  const basePath = parsed.pathname.replace(/\/$/, "");
  const encodedPath = path.split("/").map((segment) => encodeURIComponent(segment)).join("/");
  return `https://github.com${basePath}/blob/main/${encodedPath}`;
}

function githubReferenceKind(path) {
  if (path.startsWith("03-历年真题【题库】/C++/")) {
    return "past_exam_pdf";
  }
  if (path.startsWith("02-样题/C++/")) {
    return "sample_pdf";
  }
  if (path.startsWith("04-历年真题【解析】/") && path.includes("/C++/")) {
    return "solution_pdf";
  }
  return null;
}

function isGitHubCxxReference(path) {
  const kind = githubReferenceKind(path);
  if (!kind) {
    return false;
  }
  return !path.includes("/Python/") && !path.includes("/Scratch/") && !path.includes("/图形化/");
}

function titleFromGitHubPath(path) {
  const filename = path.split("/").at(-1) || path;
  return normalizeWhitespace(filename
    .replace(/\.pdf$/i, "")
    .replace(/C\+\+/g, "CPP_LANG")
    .replace(/\+/g, " ")
    .replace(/CPP_LANG/g, "C++"));
}

function entriesFromGitHubTree(source, fetched) {
  const tree = fetched.json?.tree;
  if (!Array.isArray(tree)) {
    return [];
  }

  return tree
    .filter((item) => item.type === "blob" && /\.pdf$/i.test(item.path) && isGitHubCxxReference(item.path))
    .map((item) => {
      const title = titleFromGitHubPath(item.path);
      const entry = createEntry({
        source,
        url: githubBlobUrl(source.url, item.path),
        title,
        ojId: `github-${item.sha.slice(0, 12)}`,
        evidenceSnippet: item.path,
        extractionMethod: "github_tree_cxx_pdf_metadata"
      });
      return {
        ...entry,
        reference_kind: githubReferenceKind(item.path),
        repository_path: item.path,
        github_sha: item.sha,
        file_size: item.size,
        language_hint: ["C++"],
        review_status: "needs_alignment"
      };
    });
}

function dedupeEntries(entries) {
  const best = new Map();
  for (const entry of entries) {
    const key = entry.id;
    if (!best.has(key)) {
      best.set(key, entry);
    }
  }
  return [...best.values()].sort((a, b) => a.source_id.localeCompare(b.source_id) || a.oj_system.localeCompare(b.oj_system) || (a.oj_id || "").localeCompare(b.oj_id || ""));
}

function loadOfficialProblemIndex(officialProblems) {
  const officialEntries = [];
  for (const document of officialProblems.documents || []) {
    for (const problem of document.problems || []) {
      if (problem.question_type !== "programming") {
        continue;
      }
      if (problem.language !== "C++") {
        continue;
      }
      officialEntries.push({
        id: problem.id,
        title: problem.title,
        normalized_title: normalizeProblemTitle(problem.title),
        session: problem.session,
        level: problem.level,
        language: problem.language,
        source_pdf_url: problem.source_pdf_url
      });
    }
  }
  return officialEntries;
}

function buildDuplicateCandidates(entries, officialEntries) {
  const duplicates = [];
  const byTitle = new Map();
  for (const entry of entries) {
    if (!entry.normalized_title) {
      continue;
    }
    if (!byTitle.has(entry.normalized_title)) {
      byTitle.set(entry.normalized_title, []);
    }
    byTitle.get(entry.normalized_title).push(entry);
  }

  const officialByTitle = new Map();
  for (const official of officialEntries) {
    if (!official.normalized_title) {
      continue;
    }
    if (!officialByTitle.has(official.normalized_title)) {
      officialByTitle.set(official.normalized_title, []);
    }
    officialByTitle.get(official.normalized_title).push(official);
  }

  for (const [title, candidateEntries] of byTitle.entries()) {
    const sameTitleOfficial = officialByTitle.get(title) || [];
    const officialMatches = sameTitleOfficial.filter((official) => candidateEntries.some((entry) => {
      const sessionMatches = entry.session_hint && official.session ? entry.session_hint === official.session : true;
      const levelMatches = entry.level_hint && official.level ? entry.level_hint === official.level : true;
      return sessionMatches && levelMatches;
    }));
    if (candidateEntries.length < 2 && officialMatches.length === 0) {
      continue;
    }
    duplicates.push({
      normalized_title: title,
      title: candidateEntries[0].title,
      candidate_entry_ids: candidateEntries.map((entry) => entry.id),
      official_problem_ids: officialMatches.map((entry) => entry.id),
      match_basis: officialMatches.length > 0 ? "normalized_title_matches_official_programming_problem" : "normalized_title_shared_by_mirror_entries",
      confidence: officialMatches.length > 0 ? 0.78 : 0.62,
      review_status: "needs_review"
    });
  }

  return duplicates.sort((a, b) => b.confidence - a.confidence || a.normalized_title.localeCompare(b.normalized_title));
}

function summarize(entries, documents, duplicates) {
  const bySource = {};
  const byTrustLevel = {};
  const byOjSystem = {};
  for (const entry of entries) {
    bySource[entry.source_id] = (bySource[entry.source_id] || 0) + 1;
    byTrustLevel[entry.trust_level] = (byTrustLevel[entry.trust_level] || 0) + 1;
    byOjSystem[entry.oj_system] = (byOjSystem[entry.oj_system] || 0) + 1;
  }
  return {
    source_count: documents.length,
    fetched_source_count: documents.filter((document) => document.ok).length,
    restricted_source_count: documents.filter((document) => document.access_note === "login_required").length,
    entry_count: entries.length,
    duplicate_candidate_count: duplicates.length,
    by_source: bySource,
    by_trust_level: byTrustLevel,
    by_oj_system: byOjSystem
  };
}

async function ingestSource(source) {
  const documents = [];
  const entries = [];
  const failures = [];

  try {
    if (source.id === "github-jonaslgtm-gesp-exam-questions") {
      const treeUrl = githubTreeApiUrl(source.url);
      if (!treeUrl) {
        throw new Error(`invalid GitHub repository URL: ${source.url}`);
      }
      const fetched = await fetchJson(treeUrl);
      documents.push(buildJsonDocument(source, fetched));
      if (fetched.ok) {
        entries.push(...entriesFromGitHubTree(source, fetched));
      }
      return { documents, entries, failures };
    }

    const fetched = await fetchHtml(source.url);
    documents.push(buildDocument(source, fetched));
    entries.push(...entriesFromLuoguContext(source, fetched));
    entries.push(...entriesFromLinks(source, fetched));
    const detailEntry = entryFromDetailPage(source, fetched);
    if (detailEntry) {
      entries.push(detailEntry);
    }

    if (source.id === "luogu-gesp-problem-search" && fetched.ok) {
      for (const pageUrl of luoguPaginationUrls(source, fetched)) {
        try {
          const pageFetched = await fetchHtml(pageUrl);
          documents.push(buildDocument(source, pageFetched, source.url));
          entries.push(...entriesFromLuoguContext(source, pageFetched));
          entries.push(...entriesFromLinks(source, pageFetched));
        } catch (error) {
          failures.push({
            source_id: source.id,
            url: pageUrl,
            reason: error.message
          });
        }
      }
    }
  } catch (error) {
    failures.push({
      source_id: source.id,
      url: source.url,
      reason: error.message
    });
  }

  return { documents, entries, failures };
}

async function main() {
  const secondaryRegistry = await readJson(secondarySourcesPath);
  const officialProblems = await readJson(officialProblemsPath);
  const sources = secondaryRegistry.sources.filter((source) => ["training_list", "oj_mirror", "solution_article"].includes(source.source_type));
  const documents = [];
  const rawEntries = [];
  const failures = [];

  for (const source of sources) {
    const result = await ingestSource(source);
    documents.push(...result.documents);
    rawEntries.push(...result.entries);
    failures.push(...result.failures);
  }

  const entries = dedupeEntries(rawEntries)
    .filter((entry) => entry.title || entry.oj_id)
    .filter((entry) => entry.oj_id)
    .filter((entry) => entry.trust_level !== "canonical");
  const officialEntries = loadOfficialProblemIndex(officialProblems);
  const duplicateCandidates = buildDuplicateCandidates(entries, officialEntries);
  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator,
    source_registry: secondarySourcesPath,
    official_problem_index: officialProblemsPath,
    storage_policy: "metadata and short evidence snippets only; no full mirror statements or full HTML bodies are stored",
    summary: summarize(entries, documents, duplicateCandidates),
    documents,
    entries,
    duplicate_candidates: duplicateCandidates,
    failures
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`OJ source document count: ${documents.length}`);
  console.log(`OJ mirror entry count: ${entries.length}`);
  console.log(`OJ duplicate candidate count: ${duplicateCandidates.length}`);
  console.log(`OJ restricted source count: ${output.summary.restricted_source_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`OJ mirror ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
