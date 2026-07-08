import { createHash } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import { dirname } from "node:path";

const defaultSeedUrl = "https://www.wanjuanwang.com/kjjs/gecc/";
const defaultOutputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const defaultTimeoutMs = 30_000;
const defaultHtmlConcurrency = 2;
const acceptedLevels = new Set([1, 2, 3, 4, 5, 6, 7, 8]);
const userAgent = "gesp-classification-catalog/0.1 (+wanjuanwang-gesp-cxx-ingestion)";

function parseArgs(argv) {
  const options = {
    seedUrl: defaultSeedUrl,
    outputPath: defaultOutputPath,
    htmlConcurrency: defaultHtmlConcurrency,
    timeoutMs: defaultTimeoutMs,
    levelUrls: [],
    skipRelatedDiscovery: false,
    maxListPages: 12
  };

  for (let index = 0; index < argv.length; index += 1) {
    const value = argv[index];
    const nextValue = argv[index + 1];

    if (value === "--seed" && nextValue) {
      options.seedUrl = nextValue;
      index += 1;
      continue;
    }
    if (value === "--out" && nextValue) {
      options.outputPath = nextValue;
      index += 1;
      continue;
    }
    if (value === "--html-concurrency" && nextValue) {
      options.htmlConcurrency = Math.max(1, Number(nextValue) || defaultHtmlConcurrency);
      index += 1;
      continue;
    }
    if (value === "--timeout-ms" && nextValue) {
      options.timeoutMs = Math.max(1_000, Number(nextValue) || defaultTimeoutMs);
      index += 1;
      continue;
    }
    if (value === "--level-url" && nextValue) {
      options.levelUrls.push(nextValue);
      index += 1;
      continue;
    }
    if (value === "--skip-related-discovery") {
      options.skipRelatedDiscovery = true;
    }
    if (value === "--max-list-pages" && nextValue) {
      options.maxListPages = Math.max(1, Number(nextValue) || options.maxListPages);
      index += 1;
    }
  }

  return options;
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function decodeHtmlEntities(value) {
  return String(value || "")
    .replace(/&nbsp;|&#160;/gi, " ")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, "\"")
    .replace(/&#39;/gi, "'")
    .replace(/&#x([0-9a-f]+);/gi, (_, hex) => String.fromCodePoint(Number.parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code) => String.fromCodePoint(Number.parseInt(code, 10)));
}

function stripTags(value) {
  return decodeHtmlEntities(String(value || "").replace(/<[^>]+>/g, " "));
}

function normalizeWhitespace(value) {
  return stripTags(value).replace(/\s+/g, " ").trim();
}

function normalizeInnerHtml(value) {
  return decodeHtmlEntities(String(value || ""))
    .replace(/\r/g, "")
    .replace(/\u00a0/g, " ")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function absolutizeUrl(url) {
  return new URL(url, "https://www.wanjuanwang.com/").href;
}

function slugify(value) {
  return normalizeWhitespace(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

async function fetchHtml(url, timeoutMs) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": userAgent
    }
  });

  try {
    const html = await response.text();
    return {
      ok: response.ok,
      status: response.status,
      finalUrl: response.url,
      html
    };
  } finally {
    clearTimeout(timeout);
  }
}

function examInfoFromTitle(title) {
  const text = normalizeWhitespace(title);
  const sessionMatch = text.match(/(20\d{2})年(\d{1,2})月/);
  const levelMatch = text.match(/GESP（C\+\+([一二三四五六七八]|\d+)级）/);

  return {
    title: text,
    session: sessionMatch ? `${sessionMatch[1]}-${String(Number(sessionMatch[2])).padStart(2, "0")}` : null,
    level: levelMatch ? parseChineseLevel(levelMatch[1]) : null
  };
}

function parseChineseLevel(rawLevel) {
  const cleaned = String(rawLevel || "").replace(/[^\d一二三四五六七八]/g, "");
  const chineseMap = new Map([
    ["一", 1],
    ["二", 2],
    ["三", 3],
    ["四", 4],
    ["五", 5],
    ["六", 6],
    ["七", 7],
    ["八", 8]
  ]);
  if (/^\d+$/.test(cleaned)) {
    return Number(cleaned);
  }
  return chineseMap.get(cleaned) || null;
}

function extractPageTitle(html) {
  const match = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  return normalizeWhitespace(match?.[1] || "");
}

function isListingPage(url, html) {
  const normalizedUrl = String(url || "");
  return normalizedUrl.includes("/kjjs/gecc") && html.includes("list-cont kjjs-list");
}

function extractListPageMeta(html) {
  const totalMatch = html.match(/<li><a>共(\d+)条<\/a><\/li>/);
  const pageLinks = [];
  const linkPattern = /href="([^"]*\/kjjs\/gecc\/\d+\/)"[^>]*data-ci-pagination-page="(\d+)"/g;
  let match;
  while ((match = linkPattern.exec(html)) !== null) {
    pageLinks.push({
      url: absolutizeUrl(match[1]),
      page: Number(match[2])
    });
  }
  return {
    total: totalMatch ? Number(totalMatch[1]) : null,
    pageLinks: dedupeBy(pageLinks, (item) => item.url).sort((left, right) => left.page - right.page)
  };
}

function extractExamEntriesFromList(html) {
  const entries = [];
  const pattern = /<div class="list-item[\s\S]*?<a class="high_light view-tracker-flag" href="([^"]+)" title="([^"]+)">/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = absolutizeUrl(match[1]);
    const title = normalizeWhitespace(match[2]);
    if (!title.includes("GESP") || !title.includes("C++")) {
      continue;
    }
    const info = examInfoFromTitle(title);
    if (!info.level || !acceptedLevels.has(info.level)) {
      continue;
    }
    entries.push({
      url,
      title,
      session: info.session,
      level: info.level
    });
  }
  return dedupeBy(entries, (item) => item.url);
}

function extractPublishedAt(html) {
  const normalized = stripTags(html).replace(/\s+/g, " ");
  const match = normalized.match(/(20\d{2})-(\d{2})-(\d{2})\s+(\d{2}:\d{2}:\d{2})/);
  return match ? `${match[1]}-${match[2]}-${match[3]} ${match[4]}` : null;
}

function extractQuestionStats(html) {
  const stats = {};
  const pattern = /<a href="#tx\d+" class="item[^"]*">\s*<span>([^<]+)<\/span>\s*<b>(\d+)道<\/b>/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    stats[normalizeWhitespace(match[1])] = Number(match[2]);
  }
  return stats;
}

function extractRelatedExamLinks(html, expectedSession) {
  const urls = [];
  const pattern = /<a class="name" href="([^"]*\/kjjs\/[^"]*?\.html)\s*" title="([^"]+)"/g;
  let match;
  while ((match = pattern.exec(html)) !== null) {
    const url = absolutizeUrl(match[1]);
    const title = normalizeWhitespace(match[2]);
    if (!title.includes("GESP")) {
      continue;
    }
    if (!title.includes("C++")) {
      continue;
    }
    const info = examInfoFromTitle(title);
    if (!info.level || !acceptedLevels.has(info.level)) {
      continue;
    }
    if (expectedSession && info.session !== expectedSession) {
      continue;
    }
    urls.push({ url, title, session: info.session, level: info.level });
  }
  return dedupeBy(urls, (item) => item.url).sort((left, right) => left.level - right.level);
}

function dedupeBy(items, keyFn) {
  const seen = new Set();
  const output = [];
  for (const item of items) {
    const key = keyFn(item);
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    output.push(item);
  }
  return output;
}

function mapQuestionType(sectionTitle) {
  const normalized = normalizeWhitespace(sectionTitle);
  if (normalized.includes("单选题")) {
    return "selection";
  }
  if (normalized.includes("判断题")) {
    return "judgment";
  }
  if (normalized.includes("编程题")) {
    return "programming";
  }
  return "unknown";
}

function extractSectionChunks(html) {
  const examListMatch = html.match(/<section class="exam-list">([\s\S]*?)<\/section>\s*<\/article>/i);
  const examList = examListMatch?.[1] || "";
  const sections = [];
  const pattern = /<h4[^>]*class="sec-title[^"]*"[^>]*>\s*<span>([\s\S]*?)<\/span>[\s\S]*?<\/h4>\s*([\s\S]*?)(?=<h4[^>]*class="sec-title|$)/g;
  let match;
  while ((match = pattern.exec(examList)) !== null) {
    sections.push({
      title: normalizeWhitespace(match[1]),
      html: match[2]
    });
  }
  return sections;
}

function extractQuestionNodes(sectionHtml) {
  const questions = [];
  const pattern = /<div class="[^"]*tk-quest-item[^"]*"[^>]*questionid="([^"]+)"[\s\S]*?<div class="exam-item__cnt question-img">([\s\S]*?)<\/div>\s*<div class="exam-item__opt"[\s\S]*?<\/div>[\s\S]*?<div class="exam-item__info clearfix">[\s\S]*?<a class="show-btn" target="_blank" href="([^"]*\/tiku\/[^"]+)"/g;
  let match;
  while ((match = pattern.exec(sectionHtml)) !== null) {
    questions.push({
      questionId: match[1],
      contentHtml: match[2],
      detailUrl: absolutizeUrl(match[3])
    });
  }
  return questions;
}

function extractDetailQuestionContentHtml(html) {
  const match = html.match(/<div class="quest-cnt question-img">([\s\S]*?)<\/div>\s*<\/div>\s*<div class="exam-item__info">/i);
  return match?.[1]?.trim() || "";
}

function extractQuestionNumber(contentHtml) {
  const match = contentHtml.match(/^\s*<b>(\d+)[．\.]<\/b>/);
  return match ? Number(match[1]) : null;
}

function removeLeadingQuestionNumber(contentHtml) {
  return String(contentHtml || "").replace(/^\s*<b>\d+[．\.]<\/b>/, "").trim();
}

function extractOptions(contentHtml) {
  const tableMatch = contentHtml.match(/<table name="optionsTable"[\s\S]*?>([\s\S]*?)<\/table>/i);
  if (!tableMatch) {
    return [];
  }
  const options = [];
  const cellPattern = /<td>\s*<b>([A-Z])．<\/b>\s*([\s\S]*?)<\/td>/g;
  let cellMatch;
  while ((cellMatch = cellPattern.exec(tableMatch[1])) !== null) {
    const optionHtml = cellMatch[2];
    const imageUrls = extractImages(optionHtml, null).map((item) => item.asset_url);
    const text = normalizeWhitespace(optionHtml);
    options.push({
      key: cellMatch[1],
      text: text || imageUrls.join(" ")
    });
  }
  return options;
}

function extractImages(contentHtml, sourceUrl) {
  const images = [];
  const pattern = /<img[^>]*src="([^"]+)"[^>]*>/g;
  let match;
  while ((match = pattern.exec(contentHtml)) !== null) {
    const url = absolutizeUrl(match[1]);
    images.push({
      id: `image-${sha256(url).slice(0, 12)}`,
      asset_url: url,
      source_url: sourceUrl,
      alt_text: "WanJuanWang GESP question image"
    });
  }
  return dedupeBy(images, (item) => item.asset_url);
}

function extractBlocks(contentHtml) {
  const blocks = [];
  const withoutTable = String(contentHtml || "").replace(/<table name="optionsTable"[\s\S]*?<\/table>/gi, "");
  const pattern = /<(p|pre)[^>]*>([\s\S]*?)<\/\1>|<img[^>]*src="([^"]+)"[^>]*>/g;
  let match;

  while ((match = pattern.exec(withoutTable)) !== null) {
    if (match[1] === "p") {
      const text = normalizeWhitespace(match[2]);
      if (text) {
        blocks.push({ type: "paragraph", text });
      }
      continue;
    }
    if (match[1] === "pre") {
      blocks.push({
        type: "code",
        text: normalizeInnerHtml(match[2])
      });
      continue;
    }
    if (match[3]) {
      blocks.push({
        type: "image",
        asset_url: absolutizeUrl(match[3])
      });
    }
  }

  return blocks;
}

function splitMarkerParagraphBlocks(blocks) {
  const markerPattern = /(【[^】]+】)/g;
  const nextBlocks = [];

  for (const block of blocks) {
    if (block.type !== "paragraph") {
      nextBlocks.push(block);
      continue;
    }
    const text = String(block.text || "");
    if (!markerPattern.test(text) || text.startsWith("【") && text.endsWith("】")) {
      markerPattern.lastIndex = 0;
      nextBlocks.push(block);
      continue;
    }
    markerPattern.lastIndex = 0;
    const parts = text.split(markerPattern).map((item) => item.trim()).filter(Boolean);
    for (const part of parts) {
      nextBlocks.push({
        type: "paragraph",
        text: part
      });
    }
  }

  return nextBlocks;
}

function extractProgrammingSections(blocks) {
  const sections = [];
  let currentSection = null;

  for (const block of blocks) {
    if (block.type === "paragraph") {
      const headingMatch = block.text.match(/^【(.+?)】$/);
      if (headingMatch) {
        currentSection = {
          title: headingMatch[1],
          content: []
        };
        sections.push(currentSection);
        continue;
      }
    }

    if (!currentSection) {
      currentSection = {
        title: "题面",
        content: []
      };
      sections.push(currentSection);
    }
    currentSection.content.push(block);
  }

  return sections.map((section) => ({
    title: section.title,
    text: section.content
      .map((item) => ("text" in item ? item.text : item.asset_url))
      .filter(Boolean)
      .join("\n")
      .trim()
  }));
}

function extractSampleCases(programmingSections) {
  const samples = [];
  const byTitle = new Map(programmingSections.map((section) => [section.title, section.text]));

  for (const [title, text] of byTitle.entries()) {
    const inputMatch = title.match(/^样例输入(\d+)?$/);
    if (!inputMatch) {
      continue;
    }
    const suffix = inputMatch[1] || "";
    const outputText = byTitle.get(`样例输出${suffix}`) || "";
    samples.push({
      name: suffix ? `sample-${suffix}` : `sample-1`,
      input: text,
      output: outputText
    });
  }

  const inlineSamples = extractInlineSampleCases(programmingSections);
  for (const inlineSample of inlineSamples) {
    if (!samples.some((sample) => sample.name === inlineSample.name)) {
      samples.push(inlineSample);
    }
  }

  return samples;
}

function extractInlineSampleCases(programmingSections) {
  const text = programmingSections
    .map((section) => `${section.title}\n${section.text}`)
    .join("\n")
    .replace(/\r/g, "\n");
  const markerPattern = /(输入样例|样例输入|输出样例|样例输出)[ \t]*(\d+)?/g;
  const markers = [];
  let match;

  while ((match = markerPattern.exec(text)) !== null) {
    markers.push({
      kind: match[1].includes("输入") ? "input" : "output",
      index: match[2] || null,
      start: match.index,
      end: markerPattern.lastIndex
    });
  }

  if (markers.length === 0) {
    return [];
  }

  const samplesByName = new Map();
  let inputOrdinal = 0;
  let outputOrdinal = 0;

  for (let index = 0; index < markers.length; index += 1) {
    const marker = markers[index];
    const nextMarker = markers[index + 1];
    const content = cleanInlineSampleText(text.slice(marker.end, nextMarker ? nextMarker.start : text.length));
    if (!content) {
      continue;
    }

    const ordinal = marker.kind === "input" ? ++inputOrdinal : ++outputOrdinal;
    const sampleIndex = marker.index || String(ordinal);
    const name = `sample-${sampleIndex}`;
    const sample = samplesByName.get(name) || { name, input: "", output: "" };
    sample[marker.kind] = content;
    samplesByName.set(name, sample);
  }

  return [...samplesByName.values()]
    .filter((sample) => sample.input || sample.output)
    .sort((left, right) => Number(left.name.replace("sample-", "")) - Number(right.name.replace("sample-", "")));
}

function cleanInlineSampleText(value) {
  return String(value || "")
    .replace(/\s*(样例解释\s*\d*|数据范围|提示|说明|约定|对于(?:全部|所有|\d+%).*)[\s\S]*$/u, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

function buildQuestionRecord({ sectionTitle, questionNode, pageMeta }) {
  const questionType = mapQuestionType(sectionTitle);
  const number = extractQuestionNumber(questionNode.contentHtml);
  const bodyHtml = removeLeadingQuestionNumber(questionNode.contentHtml);
  const options = extractOptions(bodyHtml);
  const blocks = splitMarkerParagraphBlocks(extractBlocks(bodyHtml));
  const images = extractImages(bodyHtml, pageMeta.url);
  const programmingSections = questionType === "programming" ? extractProgrammingSections(blocks) : [];
  const samples = questionType === "programming" ? extractSampleCases(programmingSections) : [];
  const broadKnowledgeLabels = pageMeta.knowledgeLabels || [];
  const stemText = blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text)
    .join(" ")
    .trim();

  return {
    id: `wanjuanwang:${pageMeta.session || "unknown"}:cxx:level-${pageMeta.level || "unknown"}:${questionType}:${String(number || 0).padStart(2, "0")}:${questionNode.questionId}`,
    questionid: questionNode.questionId,
    level: pageMeta.level,
    session: pageMeta.session,
    language: "C++",
    question_type: questionType,
    question_number: number,
    page_title: pageMeta.title,
    section_title: sectionTitle,
    stem_text: stemText,
    stem_html: bodyHtml,
    blocks,
    choice_options: questionType === "selection"
      ? options
      : questionType === "judgment"
        ? [
          { key: "T", text: "正确" },
          { key: "F", text: "错误" }
        ]
        : [],
    programming_sections: programmingSections,
    sample_cases: samples,
    images,
    source: {
      source_kind: "wanjuanwang_exam",
      source_url: pageMeta.url,
      detail_url: questionNode.detailUrl,
      source_id: questionNode.questionId,
      fetched_at: pageMeta.fetchedAt,
      content_hash: sha256(bodyHtml),
      trust_level: "needs_review"
    },
    knowledge_labels: broadKnowledgeLabels
  };
}

function rebuildQuestionContent(question, bodyHtml, sourceUrl) {
  const options = extractOptions(bodyHtml);
  const blocks = splitMarkerParagraphBlocks(extractBlocks(bodyHtml));
  const images = extractImages(bodyHtml, sourceUrl);
  const programmingSections = question.question_type === "programming" ? extractProgrammingSections(blocks) : [];
  const samples = question.question_type === "programming" ? extractSampleCases(programmingSections) : [];
  const stemText = blocks
    .filter((block) => block.type === "paragraph")
    .map((block) => block.text)
    .join(" ")
    .trim();

  return {
    ...question,
    stem_text: stemText,
    stem_html: bodyHtml,
    blocks,
    choice_options: question.question_type === "selection"
      ? options
      : question.question_type === "judgment"
        ? [
          { key: "T", text: "正确" },
          { key: "F", text: "错误" }
        ]
        : [],
    programming_sections: programmingSections,
    sample_cases: samples,
    images,
    source: {
      ...question.source,
      content_hash: sha256(bodyHtml)
    }
  };
}

function shouldUseDetailContent(question, rebuiltFromDetail) {
  if (question.question_type !== "programming") {
    return false;
  }
  if (!rebuiltFromDetail.stem_text) {
    return false;
  }
  return rebuiltFromDetail.sample_cases.length > question.sample_cases.length
    || rebuiltFromDetail.blocks.length > question.blocks.length
    || rebuiltFromDetail.stem_text.length > question.stem_text.length;
}

async function enrichProgrammingQuestionsFromDetail(pages, timeoutMs, htmlConcurrency) {
  const programmingQuestions = pages.flatMap((page) => page.questions.filter((question) => question.question_type === "programming"));
  const enrichedQuestions = await mapWithConcurrency(programmingQuestions, htmlConcurrency, async (question) => {
    const response = await fetchHtml(question.source.detail_url, timeoutMs);
    if (!response.ok) {
      return question;
    }
    const detailHtml = extractDetailQuestionContentHtml(response.html);
    if (!detailHtml) {
      return question;
    }
    const rebuilt = rebuildQuestionContent(question, detailHtml, question.source.detail_url);
    return shouldUseDetailContent(question, rebuilt) ? rebuilt : question;
  });

  const enrichedById = new Map(enrichedQuestions.map((question) => [question.id, question]));
  return pages.map((page) => ({
    ...page,
    questions: page.questions.map((question) => enrichedById.get(question.id) || question)
  }));
}

function extractKnowledgeLabels(questionNodeHtml) {
  const labels = [];
  const pattern = /<span class="knowledge-name font-item">([\s\S]*?)<\/span>/g;
  let match;
  while ((match = pattern.exec(questionNodeHtml)) !== null) {
    const label = normalizeWhitespace(match[1]);
    if (label) {
      labels.push(label);
    }
  }
  return dedupeBy(labels, (item) => item);
}

function parseExamPage(url, html) {
  const title = extractPageTitle(html);
  const examInfo = examInfoFromTitle(title);
  const fetchedAt = new Date().toISOString();
  const questionStats = extractQuestionStats(html);
  const sections = extractSectionChunks(html);
  const questions = [];

  for (const section of sections) {
    const questionNodes = extractQuestionNodes(section.html);
    for (const questionNode of questionNodes) {
      const knowledgeLabels = extractKnowledgeLabels(section.html);
      questions.push(buildQuestionRecord({
        sectionTitle: section.title,
        questionNode,
        pageMeta: {
          url,
          title,
          level: examInfo.level,
          session: examInfo.session,
          fetchedAt,
          knowledgeLabels
        }
      }));
    }
  }

  return {
    source_url: url,
    title,
    published_at: extractPublishedAt(html),
    session: examInfo.session,
    level: examInfo.level,
    language: "C++",
    fetched_at: fetchedAt,
    content_hash: sha256(html),
    question_stats: questionStats,
    related_exams: extractRelatedExamLinks(html, examInfo.session),
    questions
  };
}

async function mapWithConcurrency(items, concurrency, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  const workers = Array.from({ length: Math.min(concurrency, items.length) }, () => worker());
  await Promise.all(workers);
  return results;
}

function chooseLevelUrls(seedPage, explicitLevelUrls, skipRelatedDiscovery) {
  if (explicitLevelUrls.length > 0) {
    return dedupeBy(explicitLevelUrls.map((url) => ({ url, title: "", session: null, level: null })), (item) => item.url);
  }
  if (skipRelatedDiscovery) {
    return [{ url: seedPage.source_url, title: seedPage.title, session: seedPage.session, level: seedPage.level }];
  }
  return dedupeBy([
    { url: seedPage.source_url, title: seedPage.title, session: seedPage.session, level: seedPage.level },
    ...seedPage.related_exams
  ], (item) => item.url);
}

function summarizePages(pages) {
  const levels = new Map();
  const questionTypeCounts = { selection: 0, judgment: 0, programming: 0, unknown: 0 };

  for (const page of pages) {
    if (page.level) {
      levels.set(page.level, (levels.get(page.level) || 0) + page.questions.length);
    }
    for (const question of page.questions) {
      questionTypeCounts[question.question_type] = (questionTypeCounts[question.question_type] || 0) + 1;
    }
  }

  return {
    page_count: pages.length,
    level_count: levels.size,
    levels: [...levels.entries()]
      .sort((left, right) => left[0] - right[0])
      .map(([level, questionCount]) => ({ level, question_count: questionCount })),
    question_count: pages.reduce((sum, page) => sum + page.questions.length, 0),
    question_type_counts: questionTypeCounts
  };
}

async function main() {
  const options = parseArgs(process.argv.slice(2));
  const seedFetch = await fetchHtml(options.seedUrl, options.timeoutMs);
  if (!seedFetch.ok) {
    throw new Error(`Seed page fetch failed: ${seedFetch.status} ${options.seedUrl}`);
  }

  let levelTargets;
  let discovery = {};

  if (isListingPage(seedFetch.finalUrl, seedFetch.html)) {
    const listMeta = extractListPageMeta(seedFetch.html);
    const listPages = [
      { url: seedFetch.finalUrl, html: seedFetch.html, page: 1 },
      ...(await mapWithConcurrency(
        listMeta.pageLinks.slice(0, Math.max(0, options.maxListPages - 1)),
        options.htmlConcurrency,
        async (target) => {
          const response = await fetchHtml(target.url, options.timeoutMs);
          if (!response.ok) {
            throw new Error(`List page fetch failed: ${response.status} ${target.url}`);
          }
          return { url: response.finalUrl, html: response.html, page: target.page };
        }
      ))
    ];
    levelTargets = dedupeBy(listPages.flatMap((page) => extractExamEntriesFromList(page.html)), (item) => item.url);
    discovery = {
      list_total: listMeta.total,
      list_page_count: listPages.length,
      discovered_exam_count: levelTargets.length,
      discovered_exam_urls: levelTargets
    };
  } else {
    const seedPage = parseExamPage(seedFetch.finalUrl, seedFetch.html);
    levelTargets = chooseLevelUrls(seedPage, options.levelUrls, options.skipRelatedDiscovery);
    discovery = {
      seed_page: {
        source_url: seedPage.source_url,
        title: seedPage.title,
        session: seedPage.session,
        level: seedPage.level
      },
      discovered_level_urls: levelTargets
    };
  }

  const pages = await mapWithConcurrency(levelTargets, options.htmlConcurrency, async (target) => {
    const response = await fetchHtml(target.url, options.timeoutMs);
    if (!response.ok) {
      throw new Error(`Exam page fetch failed: ${response.status} ${target.url}`);
    }
    return parseExamPage(response.finalUrl, response.html);
  });

  const enrichedPages = await enrichProgrammingQuestionsFromDetail(pages, options.timeoutMs, options.htmlConcurrency);

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/ingest-wanjuanwang-gesp-cpp.mjs",
    storage_policy: {
      source_scope: "public WanJuanWang exam HTML only",
      answer_policy: "no login-protected answers or analysis are scraped",
      asset_policy: "question image URLs are collected as metadata; binary download is deferred"
    },
    run_config: {
      seed_url: options.seedUrl,
      html_concurrency: options.htmlConcurrency,
      timeout_ms: options.timeoutMs,
      explicit_level_url_count: options.levelUrls.length,
      skip_related_discovery: options.skipRelatedDiscovery,
      max_list_pages: options.maxListPages
    },
    discovery,
    summary: summarizePages(enrichedPages),
    pages: enrichedPages
  };

  await mkdir(dirname(options.outputPath), { recursive: true });
  await writeFile(options.outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`wanjuanwang page count: ${output.summary.page_count}`);
  console.log(`wanjuanwang level count: ${output.summary.level_count}`);
  console.log(`wanjuanwang question count: ${output.summary.question_count}`);
  console.log(`wanjuanwang selection count: ${output.summary.question_type_counts.selection}`);
  console.log(`wanjuanwang judgment count: ${output.summary.question_type_counts.judgment}`);
  console.log(`wanjuanwang programming count: ${output.summary.question_type_counts.programming}`);
  console.log(`wrote ${options.outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang GESP C++ ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
