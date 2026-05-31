import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { createHash } from "node:crypto";
import { spawn } from "node:child_process";

const officialIndexPath = "data/official-ingestion/official-source-index.json";
const outputDir = "data/problem-ingestion";
const outputPath = `${outputDir}/official-pdf-problems.json`;
const extractorPath = "scripts/pdfkit-extract-text.swift";
const parserVersion = "official-pdf-parser-v2";
const snippetLimit = 180;

function parseArgs(argv) {
  const args = {
    session: "latest",
    language: "C++",
    maxPdfs: null,
    output: outputPath
  };

  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === "--session") {
      args.session = argv[index + 1];
      index += 1;
    } else if (arg === "--all-sessions") {
      args.session = "all";
    } else if (arg === "--language") {
      args.language = argv[index + 1];
      index += 1;
    } else if (arg === "--all-languages") {
      args.language = "all";
    } else if (arg === "--max-pdfs") {
      args.maxPdfs = Number.parseInt(argv[index + 1], 10);
      index += 1;
    } else if (arg === "--output") {
      args.output = argv[index + 1];
      index += 1;
    }
  }

  return args;
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(value) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeText(value) {
  return value.replace(/\u00a0/g, " ").replace(/[ \t]+/g, " ").replace(/\n{3,}/g, "\n\n").trim();
}

function compactSnippet(value, limit = snippetLimit) {
  return normalizeText(value).replace(/\s+/g, " ").slice(0, limit);
}

function chineseLevelToNumber(value) {
  const levels = new Map([
    ["一", 1],
    ["二", 2],
    ["三", 3],
    ["四", 4],
    ["五", 5],
    ["六", 6],
    ["七", 7],
    ["八", 8]
  ]);
  return levels.get(value) || null;
}

function inferLanguage(text) {
  if (/C\+\+/i.test(text)) {
    return "C++";
  }
  if (/Python/i.test(text)) {
    return "Python";
  }
  if (/图形化编程|Scratch/i.test(text)) {
    return "图形化编程";
  }
  return "unknown";
}

function inferLevel(text) {
  const compact = text.replace(/\s+/g, "");
  const chineseMatch = compact.match(/([一二三四五六七八])级/);
  if (chineseMatch) {
    return chineseLevelToNumber(chineseMatch[1]);
  }
  const numberMatch = compact.match(/(?:level|等级)\s*([1-8])/i);
  if (numberMatch) {
    return Number.parseInt(numberMatch[1], 10);
  }
  return null;
}

function inferSession(text, fallbackSession) {
  const match = text.match(/(20\d{2})\s*年\s*(\d{1,2})\s*月/);
  if (!match) {
    return fallbackSession || null;
  }
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function normalizeTitle(rawTitle) {
  return rawTitle
    .replace(/[（(]\s*[）)]/g, "")
    .replace(/^\s*[、.．]\s*/, "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 80);
}

function collectQuestionBlock(lineEntries, startIndex, currentType) {
  const block = [lineEntries[startIndex].text];
  for (let offset = 1; offset <= 180 && startIndex + offset < lineEntries.length; offset += 1) {
    const line = lineEntries[startIndex + offset].text;
    if (sectionType(line)) {
      break;
    }
    if ((currentType === "selection" || currentType === "judgment") && /^第\s*\d{1,2}\s*题\s+/.test(line)) {
      break;
    }
    if (currentType === "programming" && /^3\.\d+\s+编程题/.test(line)) {
      break;
    }
    block.push(line);
  }
  return normalizeText(block.join(" "));
}

function normalizeOptionText(value) {
  return normalizeText(String(value || ""))
    .replace(/第\s*\d+\s*页\s*\/\s*共\s*\d+\s*页/g, "")
    .replace(/\s+/g, " ")
    .replace(/[。；;,\s]+$/g, "")
    .trim();
}

function extractChoiceOptions(questionBlock) {
  const normalized = normalizeText(questionBlock)
    .replace(/[ＡＢＣＤ]/g, (match) => String.fromCharCode(match.charCodeAt(0) - 0xfee0))
    .replace(/([ABCD])\s*[．、:：]/g, "$1.")
    .replace(/\s+/g, " ");
  const optionMatches = [...normalized.matchAll(/(?<!\S)([ABCD])\.\s*/g)];
  const uniqueKeys = [...new Set(optionMatches.map((match) => match[1]))];

  if (uniqueKeys.length < 4 || !["A", "B", "C", "D"].every((key) => uniqueKeys.includes(key))) {
    return {
      status: "needs_review",
      options: ["A", "B", "C", "D"].map((key) => ({
        key,
        text: "PDF 文本层未能稳定提取该选项，需查看原 PDF 或题面图片复核。",
        source_status: "needs_review"
      })),
      extraction_method: "pdf_text_option_regex",
      notes: ["PDF 题块中未能稳定识别完整 A/B/C/D 选项；已保留选项槽位，不能视为官方完整选项。"]
    };
  }

  const options = [];
  for (let index = 0; index < optionMatches.length; index += 1) {
    const match = optionMatches[index];
    const key = match[1];
    if (!["A", "B", "C", "D"].includes(key) || options.some((item) => item.key === key)) {
      continue;
    }
    const start = match.index + match[0].length;
    const end = index + 1 < optionMatches.length ? optionMatches[index + 1].index : normalized.length;
    const text = normalizeOptionText(normalized.slice(start, end));
    options.push({
      key,
      text: text || "PDF 文本层未能稳定提取该选项，需查看原 PDF 或题面图片复核。",
      source_status: text ? "source_extracted" : "needs_review"
    });
  }

  const complete = options.length === 4 && options.every((item) => item.source_status === "source_extracted");
  return {
    status: complete ? "source_extracted" : "needs_review",
    options,
    extraction_method: "pdf_text_option_regex",
    notes: complete
      ? ["选项从官方 PDF 文本层短题块抽取，仍需人工复核公式、图片和换行。"]
      : ["识别到 A/B/C/D 标记，但部分选项为空或不完整，需要人工复核。"]
  };
}

function findProgrammingTitle(lineEntries, startIndex, fallbackTitle) {
  for (let offset = 1; offset <= 80 && startIndex + offset < lineEntries.length; offset += 1) {
    const line = lineEntries[startIndex + offset].text;
    if (/^3\.\d+\s+编程题/.test(line)) {
      break;
    }
    const titleMatch = line.match(/试题名称\s*[：:]\s*(.+)$/);
    if (titleMatch) {
      return normalizeTitle(titleMatch[1]);
    }
  }
  return normalizeTitle(fallbackTitle);
}

function sectionType(line) {
  if (/^3\.\d+\s+编程题/.test(line)) {
    return null;
  }
  if (/单选题/.test(line)) {
    return "selection";
  }
  if (/判断题/.test(line)) {
    return "judgment";
  }
  if (/编程题|程序设计题/.test(line)) {
    return "programming";
  }
  return null;
}

function flattenPageLines(pages) {
  return pages.flatMap((page) =>
    normalizeText(page.text)
      .split(/\n+/)
      .map((text) => ({
        text,
        page_number: page.page_number
      }))
  );
}

function extractProblemsFromPages({ pages, pdfUrl, documentHash, sourceId, fallbackSession }) {
  const fullText = normalizeText(pages.map((page) => page.text).join("\n"));
  const headerText = normalizeText(pages.slice(0, 2).map((page) => page.text).join("\n"));
  const lineEntries = flattenPageLines(pages);
  const language = inferLanguage(headerText);
  const level = inferLevel(headerText);
  const session = inferSession(headerText, fallbackSession);
  const problems = [];
  let currentType = "unknown";
  const seenKeys = new Set();

  for (let lineIndex = 0; lineIndex < lineEntries.length; lineIndex += 1) {
      const line = lineEntries[lineIndex].text;
      const nextType = sectionType(line);
      if (nextType) {
        currentType = nextType;
        continue;
      }

      let questionNumber = null;
      let title = "";
      let evidenceLine = line;

      if (currentType === "selection" || currentType === "judgment") {
        const questionMatch = line.match(/^第\s*(\d{1,2})\s*题\s+(.{2,})$/);
        if (!questionMatch) {
          continue;
        }
        questionNumber = Number.parseInt(questionMatch[1], 10);
        title = normalizeTitle(questionMatch[2]);
      } else if (currentType === "programming") {
        const programmingMatch = line.match(/^3\.(\d{1,2})\s+编程题\s*(\d+)?/);
        if (!programmingMatch) {
          continue;
        }
        questionNumber = Number.parseInt(programmingMatch[1], 10);
        title = findProgrammingTitle(lineEntries, lineIndex, `编程题 ${questionNumber}`);
      } else {
        continue;
      }

      if (!title || /^(题号|答案|参考程序)\b/.test(title)) {
        continue;
      }

      const key = `${currentType}:${questionNumber}`;
      if (seenKeys.has(key)) {
        continue;
      }
      seenKeys.add(key);

      problems.push({
        id: [
          "official",
          session || "unknown-session",
          language.toLowerCase().replace(/[^a-z0-9+]+/gi, "-"),
          level ? `level-${level}` : "unknown-level",
          currentType,
          String(questionNumber).padStart(2, "0")
        ].join(":"),
        source_pdf_url: pdfUrl,
        source_document_sha256: documentHash,
        source_id: sourceId,
        session,
        language,
        level,
        question_type: currentType,
        question_number: questionNumber,
        title,
        page_start: lineEntries[lineIndex].page_number,
        evidence_snippet: compactSnippet(evidenceLine),
        choice_options: currentType === "selection"
          ? extractChoiceOptions(collectQuestionBlock(lineEntries, lineIndex, currentType))
          : null,
        parser_version: parserVersion,
        extraction_confidence: level && language !== "unknown" ? 0.72 : 0.48,
        review_status: "needs_review"
      });
  }

  return {
    metadata: {
      session,
      language,
      level,
      text_sha256: sha256(fullText),
      evidence_snippet: compactSnippet(headerText, 240)
    },
    problems
  };
}

function latestSession(sessions) {
  return sessions
    .filter((session) => session.pdf_count > 0)
    .map((session) => session.session)
    .sort()
    .at(-1);
}

function selectPdfDocuments(index, args) {
  const pdfByUrl = new Map(index.documents.filter((document) => document.content_kind === "pdf").map((document) => [document.url, document]));
  const selectedUrls = [];

  if (args.session === "all") {
    for (const session of index.true_question_sessions) {
      selectedUrls.push(...session.pdf_urls);
    }
  } else {
    const targetSession = args.session === "latest" ? latestSession(index.true_question_sessions) : args.session;
    const session = index.true_question_sessions.find((entry) => entry.session === targetSession);
    if (!session) {
      throw new Error(`No official true-question session found for ${targetSession}`);
    }
    selectedUrls.push(...session.pdf_urls);
  }

  const documents = [...new Set(selectedUrls)].map((url) => pdfByUrl.get(url)).filter(Boolean);
  return Number.isInteger(args.maxPdfs) && args.maxPdfs > 0 ? documents.slice(0, args.maxPdfs) : documents;
}

async function fetchPdfToFile(document, tempDir) {
  const response = await fetch(document.url, {
    headers: {
      "User-Agent": "gesp-classification-catalog/0.1 (+temporary-pdf-parser)"
    }
  });
  if (!response.ok) {
    throw new Error(`fetch failed with status ${response.status}`);
  }

  const buffer = Buffer.from(await response.arrayBuffer());
  const actualHash = sha256(buffer);
  if (actualHash !== document.sha256) {
    throw new Error(`sha256 mismatch: expected ${document.sha256}, got ${actualHash}`);
  }

  const path = join(tempDir, `${actualHash}.pdf`);
  await writeFile(path, buffer);
  return path;
}

function runSwiftExtractor(paths) {
  return new Promise((resolve, reject) => {
    const child = spawn("swift", [extractorPath, ...paths], {
      env: {
        ...process.env,
        CLANG_MODULE_CACHE_PATH: "/private/tmp/gesp-swift-module-cache"
      }
    });
    let stdout = "";
    let stderr = "";

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`swift extractor exited ${code}: ${stderr}`));
        return;
      }
      try {
        resolve(JSON.parse(stdout));
      } catch (error) {
        reject(new Error(`failed to parse swift extractor JSON: ${error.message}`));
      }
    });
  });
}

function summarizeProblems(documents) {
  const problems = documents.flatMap((document) => document.problems);
  const byQuestionType = {};
  const byLanguageLevel = {};

  for (const problem of problems) {
    byQuestionType[problem.question_type] = (byQuestionType[problem.question_type] || 0) + 1;
    const bucket = `${problem.language || "unknown"}:${problem.level || "unknown"}`;
    byLanguageLevel[bucket] = (byLanguageLevel[bucket] || 0) + 1;
  }

  return {
    problem_count: problems.length,
    cxx_level5_problem_count: problems.filter((problem) => problem.language === "C++" && problem.level === 5).length,
    by_question_type: byQuestionType,
    by_language_level: byLanguageLevel
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));
  const index = await readJson(officialIndexPath);
  const pdfDocuments = selectPdfDocuments(index, args);
  const tempDir = await mkdtemp(join(tmpdir(), "gesp-pdf-parser-"));
  const failures = [];
  const downloaded = [];

  try {
    for (const document of pdfDocuments) {
      try {
        const path = await fetchPdfToFile(document, tempDir);
        downloaded.push({ document, path });
      } catch (error) {
        failures.push({
          url: document.url,
          source_id: document.source_id,
          reason: error.message
        });
      }
    }

    const extracted = downloaded.length > 0 ? await runSwiftExtractor(downloaded.map((entry) => entry.path)) : [];
    const extractedByPath = new Map(extracted.map((document) => [document.path, document]));
    const parsedDocuments = [];

    for (const entry of downloaded) {
      const extractedDocument = extractedByPath.get(entry.path);
      if (!extractedDocument || extractedDocument.error) {
        failures.push({
          url: entry.document.url,
          source_id: entry.document.source_id,
          reason: extractedDocument?.error || "missing extractor output"
        });
        continue;
      }

      const parsed = extractProblemsFromPages({
        pages: extractedDocument.pages,
        pdfUrl: entry.document.url,
        documentHash: entry.document.sha256,
        sourceId: entry.document.source_id,
        fallbackSession: entry.document.session
      });

      const parsedDocument = {
        source_pdf_url: entry.document.url,
        source_id: entry.document.source_id,
        source_document_sha256: entry.document.sha256,
        byte_length: entry.document.byte_length,
        page_count: extractedDocument.page_count,
        inferred_session: parsed.metadata.session,
        inferred_language: parsed.metadata.language,
        inferred_level: parsed.metadata.level,
        text_sha256: parsed.metadata.text_sha256,
        evidence_snippet: parsed.metadata.evidence_snippet,
        problem_count: parsed.problems.length,
        problems: parsed.problems
      };

      if (args.language === "all" || parsedDocument.inferred_language === args.language) {
        parsedDocuments.push(parsedDocument);
      }
    }

    const problemSummary = summarizeProblems(parsedDocuments);
    const output = {
      schema_version: 1,
      generated_at: new Date().toISOString(),
      generator: "scripts/parse-official-pdfs.mjs",
      parser_version: parserVersion,
      source_index: officialIndexPath,
      storage_policy: "metadata and short evidence snippets only; full PDF text is not stored",
      extractor: {
        name: "macos-pdfkit-swift",
        script: extractorPath,
        fallback_plan: "replaceable with Docker poppler/pdftotext extractor when container image is introduced"
      },
      selection: {
        session: args.session,
        language: args.language,
        max_pdfs: args.maxPdfs,
        selected_pdf_count: pdfDocuments.length
      },
      summary: {
        pdf_considered_count: pdfDocuments.length,
        pdf_extracted_count: parsedDocuments.length,
        documents_with_problems_count: parsedDocuments.filter((document) => document.problem_count > 0).length,
        extraction_failure_count: failures.length,
        ...problemSummary
      },
      documents: parsedDocuments,
      failures
    };

    await mkdir(outputDir, { recursive: true });
    await writeFile(args.output, `${JSON.stringify(output, null, 2)}\n`);

    console.log(`official PDF considered count: ${output.summary.pdf_considered_count}`);
    console.log(`official PDF extracted count: ${output.summary.pdf_extracted_count}`);
    console.log(`official PDF problem count: ${output.summary.problem_count}`);
    console.log(`official PDF C++ level 5 problem count: ${output.summary.cxx_level5_problem_count}`);
    console.log(`official PDF extraction failure count: ${output.summary.extraction_failure_count}`);
    console.log(`wrote ${args.output}`);
  } finally {
    await rm(tempDir, { recursive: true, force: true });
  }
}

main().catch((error) => {
  console.error(`Official PDF parsing failed: ${error.message}`);
  process.exitCode = 1;
});
