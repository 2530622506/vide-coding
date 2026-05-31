import { mkdir, readFile, writeFile } from "node:fs/promises";
import { execFile } from "node:child_process";
import { setTimeout as sleep } from "node:timers/promises";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const canonicalPath = "data/canonical-problems/canonical-problem-alignment.json";
const detailsPath = "data/classification/problem-details.json";
const outputDir = "data/enrichment";
const outputPath = `${outputDir}/official-programming-oj-details.json`;

const defaultOptions = {
  limit: 4,
  delayMs: 1500,
  force: false
};

function parseArgs(argv) {
  const options = { ...defaultOptions };
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--limit") {
      options.limit = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--delay-ms") {
      options.delayMs = Number(argv[index + 1]);
      index += 1;
    } else if (arg === "--force") {
      options.force = true;
    }
  }
  return options;
}

async function readJson(path, fallback = null) {
  try {
    return JSON.parse(await readFile(path, "utf8"));
  } catch (error) {
    if (fallback !== null && error.code === "ENOENT") {
      return fallback;
    }
    throw error;
  }
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/[ \t]+\n/g, "\n")
    .trim();
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&quot;/g, "\"")
    .replace(/&#34;/g, "\"")
    .replace(/&#39;/g, "'")
    .replace(/&apos;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&amp;/g, "&")
    .replace(/&nbsp;/g, " ");
}

function sourceIdFromEntry(sourceEntryId) {
  const match = String(sourceEntryId || "").match(/luogu:([A-Z]?\d+)/i);
  return match ? match[1].toUpperCase() : null;
}

function sourceIdFromUrl(sourceUrl) {
  const match = String(sourceUrl || "").match(/\/problem\/([^/?#]+)/);
  return match ? match[1].toUpperCase() : null;
}

function selectTargets(canonical, details, existing, options) {
  const extractedIds = new Set((existing.records || [])
    .filter((record) => record.fetch_status === "source_extracted")
    .map((record) => record.canonical_problem_id));
  const detailById = new Map(details.records.map((detail) => [detail.canonical_problem_id, detail]));

  return canonical.canonical_problems
    .filter((problem) => problem.language === "C++" && problem.question_type === "programming")
    .map((problem) => {
      const source = (problem.source_versions || [])
        .find((item) => sourceIdFromEntry(item.source_entry_id));
      const ojId = sourceIdFromEntry(source?.source_entry_id);
      return {
        canonical_problem_id: problem.id,
        title: problem.title,
        level: problem.level,
        session: problem.session,
        source_url: ojId ? `https://www.luogu.com.cn/problem/${ojId}` : null,
        oj_id: ojId,
        source_title: source?.title || null,
        detail: detailById.get(problem.id)
      };
    })
    .filter((target) => target.source_url && target.detail)
    .filter((target) => options.force || !extractedIds.has(target.canonical_problem_id))
    .sort((a, b) => a.canonical_problem_id.localeCompare(b.canonical_problem_id))
    .slice(0, options.limit);
}

async function fetchHtml(url) {
  const headers = [
    "user-agent: Mozilla/5.0 (compatible; GESPClassificationCatalog/0.1; public-source-review)",
    "accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "accept-language: zh-CN,zh;q=0.9,en;q=0.7"
  ];
  try {
    const response = await fetch(url, {
      headers: Object.fromEntries(headers.map((header) => {
        const [key, ...rest] = header.split(":");
        return [key, rest.join(":").trim()];
      }))
    });
    const body = await response.text();
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`);
    }
    return body;
  } catch (error) {
    try {
      const { stdout } = await execFileAsync("curl", [
        "--location",
        "--max-time",
        "30",
        "--silent",
        "--show-error",
        "-H",
        headers[0],
        "-H",
        headers[1],
        "-H",
        headers[2],
        url
      ], { maxBuffer: 20 * 1024 * 1024 });
      return stdout;
    } catch (curlError) {
      throw new Error(`fetch failed; curl fallback failed: ${curlError.message || error.message}`);
    }
  }
}

function extractLuoguProblem(html) {
  const match = html.match(/<script[^>]*id=["']lentille-context["'][^>]*>([\s\S]*?)<\/script>/i);
  if (!match) {
    throw new Error("missing lentille-context script");
  }
  const context = JSON.parse(decodeHtmlEntities(match[1].trim()));
  const problem = context?.data?.problem;
  if (!problem) {
    throw new Error("missing problem payload");
  }
  const content = problem.content || problem.contenu || {};
  return { problem, content };
}

function section(id, title, markdown) {
  const normalized = normalizeText(markdown);
  return normalized ? { id, title, markdown: normalized } : null;
}

function statementFromContent(target, content) {
  const sections = [
    section("background", "题目背景", content.background),
    section("description", "题目描述", content.description),
    section("input", "输入格式", content.formatI),
    section("output", "输出格式", content.formatO),
    section("hint", "说明/提示", content.hint)
  ].filter(Boolean);

  return {
    status: sections.length > 0 ? "source_extracted" : "pending_collection",
    title: normalizeText(content.name || target.source_title || target.title),
    source_url: target.source_url,
    source_page: null,
    extraction_method: "luogu_lentille_context",
    storage_policy: "source_extracted_public_oj",
    source_terms_status: "needs_review",
    sections,
    notes: [
      "题面从公开 OJ 页面结构化抽取，未使用登录态。",
      "公开 OJ 题面仍需人工确认来源条款，不能覆盖官方来源优先规则。"
    ]
  };
}

function sampleCasesFromContent(problem, content) {
  const samples = Array.isArray(problem.samples) ? problem.samples : content.samples;
  const cases = Array.isArray(samples)
    ? samples
      .filter((sample) => Array.isArray(sample) && sample.length >= 2)
      .map((sample) => ({
        input: normalizeText(sample[0]),
        output: normalizeText(sample[1])
      }))
    : [];
  return {
    status: cases.length > 0 ? "source_extracted" : "none_found",
    cases,
    notes: cases.length > 0
      ? ["样例从公开 OJ 题面结构化字段抽取。"]
      : ["公开 OJ 题面结构化字段中未发现样例。"]
  };
}

function resolveAssetUrl(rawUrl, sourceUrl) {
  if (!rawUrl) {
    return null;
  }
  if (rawUrl.startsWith("//")) {
    return `https:${rawUrl}`;
  }
  try {
    return new URL(rawUrl, sourceUrl).toString();
  } catch {
    return rawUrl;
  }
}

function collectMarkdownImages(markdown, sourceUrl) {
  const images = [];
  const markdownPattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const htmlPattern = /<img[^>]+src=["']([^"']+)["'][^>]*(?:alt=["']([^"']*)["'])?[^>]*>/gi;
  let match = markdownPattern.exec(markdown);
  while (match) {
    const assetUrl = resolveAssetUrl(match[2], sourceUrl);
    if (assetUrl) {
      images.push({ asset_url: assetUrl, alt_text: normalizeText(match[1]) || "题面图片" });
    }
    match = markdownPattern.exec(markdown);
  }
  match = htmlPattern.exec(markdown);
  while (match) {
    const assetUrl = resolveAssetUrl(match[1], sourceUrl);
    if (assetUrl) {
      images.push({ asset_url: assetUrl, alt_text: normalizeText(match[2]) || "题面图片" });
    }
    match = htmlPattern.exec(markdown);
  }
  return images;
}

function visualAssetsFromContent(target, problem, content) {
  const markdown = [
    content.background,
    content.description,
    content.formatI,
    content.formatO,
    content.hint
  ].map((value) => normalizeText(value)).join("\n\n");
  const attachments = Array.isArray(problem.attachments) ? problem.attachments : content.attachments;
  const attachmentAssets = Array.isArray(attachments)
    ? attachments.flatMap((attachment) => {
      const rawUrl = typeof attachment === "string" ? attachment : attachment.url || attachment.href || attachment.link;
      const assetUrl = resolveAssetUrl(rawUrl, target.source_url);
      return assetUrl ? [{ asset_url: assetUrl, alt_text: normalizeText(attachment.name || attachment.title) || "题面附件" }] : [];
    })
    : [];
  const byUrl = new Map();
  for (const asset of [...collectMarkdownImages(markdown, target.source_url), ...attachmentAssets]) {
    byUrl.set(asset.asset_url, asset);
  }
  const assets = [...byUrl.values()].map((asset, index) => ({
    id: `asset:${target.canonical_problem_id}:${index + 1}`,
    asset_url: asset.asset_url,
    alt_text: asset.alt_text,
    source_url: target.source_url,
    source_page: null,
    source_kind: "statement_image",
    origin: "source_extracted",
    storage_policy: "remote_link_until_asset_storage_ready"
  }));
  return {
    status: assets.length > 0 ? "source_extracted" : "none_found",
    assets,
    source_hint: {
      source_url: target.source_url,
      source_page: null
    },
    notes: assets.length > 0
      ? ["图片链接从公开 OJ 题面抽取，当前保存远程 URL；后续可下载入对象存储。"]
      : [
        "公开 OJ 题面未发现图片或附件。",
        "如果人工确认题目需要示意图，可以生成 AI 图片，但必须标注 AI 生成并要求甄别。"
      ]
  };
}

function enrichRecord(target, html) {
  const { problem, content } = extractLuoguProblem(html);
  const statement = statementFromContent(target, content);
  const sample_cases = sampleCasesFromContent(problem, content);
  const visual_assets = visualAssetsFromContent(target, problem, content);
  return {
    canonical_problem_id: target.canonical_problem_id,
    title: statement.title || target.title,
    session: target.session,
    level: target.level,
    oj_system: "luogu",
    oj_id: problem.pid || target.oj_id || sourceIdFromUrl(target.source_url),
    source_url: target.source_url,
    fetched_at: new Date().toISOString(),
    fetch_status: statement.status === "source_extracted" ? "source_extracted" : "partial",
    extraction_method: "luogu_lentille_context",
    source_terms_status: "needs_review",
    review_status: "needs_review",
    statement,
    sample_cases,
    visual_assets,
    limits: problem.limits || null,
    attachments: Array.isArray(problem.attachments) ? problem.attachments : Array.isArray(content.attachments) ? content.attachments : []
  };
}

function summarize(records, failures) {
  return {
    attempted_count: records.length + failures.length,
    extracted_count: records.filter((record) => record.fetch_status === "source_extracted").length,
    failed_count: failures.length,
    statement_extracted_count: records.filter((record) => record.statement.status === "source_extracted").length,
    sample_extracted_count: records.filter((record) => record.sample_cases.status === "source_extracted").length,
    visual_asset_count: records.reduce((sum, record) => sum + record.visual_assets.assets.length, 0),
    visual_asset_source_extracted_count: records.filter((record) => record.visual_assets.status === "source_extracted").length,
    visual_asset_none_found_count: records.filter((record) => record.visual_assets.status === "none_found").length
  };
}

function mergeRecords(existing, nextRecords, nextFailures, options) {
  const byId = new Map((existing.records || []).map((record) => [record.canonical_problem_id, record]));
  for (const record of nextRecords) {
    byId.set(record.canonical_problem_id, record);
  }
  const failureKey = (failure) => `${failure.canonical_problem_id}:${failure.source_url}`;
  const failuresByKey = new Map((existing.failures || []).map((failure) => [failureKey(failure), failure]));
  for (const failure of nextFailures) {
    failuresByKey.set(failureKey(failure), failure);
  }
  for (const record of nextRecords) {
    failuresByKey.delete(`${record.canonical_problem_id}:${record.source_url}`);
  }
  const records = [...byId.values()].sort((a, b) => a.canonical_problem_id.localeCompare(b.canonical_problem_id));
  const failures = [...failuresByKey.values()].sort((a, b) => a.canonical_problem_id.localeCompare(b.canonical_problem_id));
  return {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/enrich-official-programming-oj-details.mjs",
    inputs: {
      canonical_alignment: canonicalPath,
      problem_details: detailsPath
    },
    request: {
      limit: options.limit,
      delay_ms: options.delayMs
    },
    crawl_policy: {
      public_pages_only: true,
      login_used: false,
      credentials_used: false,
      low_frequency_delay_ms: options.delayMs,
      source_terms_status: "needs_review",
      ai_fallback_policy: "未从公开来源抽取到答案、图片或讲解时，可以生成学习辅助内容，但必须标注 AI 生成并进入复核。"
    },
    summary: summarize(records, failures),
    records,
    failures
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const [canonical, details, existing] = await Promise.all([
    readJson(canonicalPath),
    readJson(detailsPath),
    readJson(outputPath, { records: [], failures: [] })
  ]);
  const targets = selectTargets(canonical, details, existing, options);
  const records = [];
  const failures = [];

  for (const [index, target] of targets.entries()) {
    try {
      const html = await fetchHtml(target.source_url);
      records.push(enrichRecord(target, html));
      console.log(`extracted ${target.canonical_problem_id} from ${target.source_url}`);
    } catch (error) {
      failures.push({
        canonical_problem_id: target.canonical_problem_id,
        title: target.title,
        source_url: target.source_url,
        fetched_at: new Date().toISOString(),
        fetch_status: "fetch_failed",
        error: error.message,
        review_status: "needs_review"
      });
      console.warn(`failed ${target.canonical_problem_id}: ${error.message}`);
    }
    if (index < targets.length - 1) {
      await sleep(options.delayMs);
    }
  }

  const output = mergeRecords(existing, records, failures, options);
  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`official programming OJ attempted count: ${records.length + failures.length}`);
  console.log(`official programming OJ extracted count: ${records.length}`);
  console.log(`visual asset count: ${output.summary.visual_asset_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Official programming OJ enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
