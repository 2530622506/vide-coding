import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";

const officialSourcesPath = "data/source-registry/sources.official.json";
const outputDir = "data/official-ingestion";
const outputPath = `${outputDir}/official-source-index.json`;
const allowedHost = "gesp.ccf.org.cn";
const maxPages = 180;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function sha256(buffer) {
  return createHash("sha256").update(buffer).digest("hex");
}

function unique(values) {
  return [...new Set(values)];
}

function normalizeWhitespace(value) {
  return value.replace(/\s+/g, " ").trim();
}

function extractTitle(html) {
  const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
  const h1Match = html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i);
  const stripTags = (value) => normalizeWhitespace(value.replace(/<[^>]+>/g, ""));
  return stripTags(h1Match?.[1] || titleMatch?.[1] || "");
}

function extractPublishedAt(html) {
  const normalized = normalizeWhitespace(html.replace(/<[^>]+>/g, " "));
  const isoMatch = normalized.match(/(20\d{2})[-/年](\d{1,2})[-/月](\d{1,2})日?/);
  if (!isoMatch) {
    return null;
  }
  const [, year, month, day] = isoMatch;
  return `${year}-${month.padStart(2, "0")}-${day.padStart(2, "0")}`;
}

function extractSession(title) {
  const match = title.match(/(20\d{2})年(\d{1,2})月/);
  if (!match) {
    return null;
  }
  return `${match[1]}-${match[2].padStart(2, "0")}`;
}

function extractLinks(html, baseUrl) {
  const links = [];
  const hrefPattern = /href\s*=\s*["']([^"']+)["']/gi;
  let match;

  while ((match = hrefPattern.exec(html)) !== null) {
    const rawHref = match[1].trim();
    if (!rawHref || rawHref.startsWith("#") || rawHref.startsWith("javascript:")) {
      continue;
    }

    try {
      const url = new URL(rawHref, baseUrl);
      if (url.hostname === allowedHost) {
        links.push(url.href);
      }
    } catch {
      // Ignore malformed links from upstream HTML.
    }
  }

  return unique(links);
}

function classifyDiscoveredUrl(url) {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith(".pdf")) {
    return "pdf_attachment";
  }
  if (parsed.pathname.includes("/attach/")) {
    return "attachment";
  }
  if (parsed.pathname.includes("/1010/")) {
    return "official_question_page";
  }
  if (parsed.pathname.includes("/1008/")) {
    return "official_syllabus_page";
  }
  return "official_page";
}

function shouldFetchDiscovered(url) {
  const parsed = new URL(url);
  if (parsed.pathname.endsWith(".pdf")) {
    return true;
  }
  if (parsed.pathname.includes("/1010/")) {
    return true;
  }
  if (parsed.pathname.includes("/1008/")) {
    return true;
  }
  return false;
}

function inferSourceIdFromUrl(url, fallbackSourceId) {
  const parsed = new URL(url);
  if (parsed.pathname.includes("/1010/10088")) {
    return "official-gesp-sample-questions";
  }
  if (parsed.pathname.includes("/1010/")) {
    return "official-gesp-true-questions";
  }
  if (parsed.pathname.includes("/1008/")) {
    return "official-gesp-syllabus";
  }
  return fallbackSourceId;
}

async function fetchBytes(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 30_000);
  const response = await fetch(url, {
    signal: controller.signal,
    headers: {
      "User-Agent": "gesp-classification-catalog/0.1 (+metadata-only)"
    }
  });
  try {
    const arrayBuffer = await response.arrayBuffer();
    return {
      status: response.status,
      ok: response.ok,
      final_url: response.url,
      headers: {
        content_type: response.headers.get("content-type"),
        last_modified: response.headers.get("last-modified"),
        etag: response.headers.get("etag")
      },
      buffer: Buffer.from(arrayBuffer)
    };
  } finally {
    clearTimeout(timeout);
  }
}

async function fetchDocument(url, sourceId, discoveredFrom = null) {
  const fetched = await fetchBytes(url);
  const contentType = fetched.headers.content_type || "";
  const isHtml = contentType.includes("text/html") || url.endsWith(".html");
  const isPdf = contentType.includes("application/pdf") || url.endsWith(".pdf");
  const html = isHtml ? fetched.buffer.toString("utf8") : "";
  const links = isHtml ? extractLinks(html, fetched.final_url) : [];

  return {
    source_id: sourceId,
    discovered_from: discoveredFrom,
    url,
    final_url: fetched.final_url,
    status: fetched.status,
    ok: fetched.ok,
    content_type: contentType || null,
    content_kind: isPdf ? "pdf" : isHtml ? "html" : "other",
    title: isHtml ? extractTitle(html) : "",
    published_at: isHtml ? extractPublishedAt(html) : null,
    session: isHtml ? extractSession(extractTitle(html)) : null,
    sha256: sha256(fetched.buffer),
    byte_length: fetched.buffer.length,
    last_modified: fetched.headers.last_modified,
    etag: fetched.headers.etag,
    discovered_links: links.map((link) => ({
      url: link,
      link_kind: classifyDiscoveredUrl(link)
    }))
  };
}

async function main() {
  const registry = await readJson(officialSourcesPath);
  const officialSources = registry.sources.filter((source) => source.trust_level === "canonical");
  const fetchedByUrl = new Map();
  const queue = [];

  for (const source of officialSources) {
    queue.push({
      url: source.url,
      sourceId: source.id,
      discoveredFrom: null,
      depth: 0
    });
  }

  for (let cursor = 0; cursor < queue.length && fetchedByUrl.size < maxPages; cursor += 1) {
    const item = queue[cursor];
    if (fetchedByUrl.has(item.url)) {
      continue;
    }

    const document = await fetchDocument(item.url, item.sourceId, item.discoveredFrom);
    fetchedByUrl.set(item.url, document);

    if (item.depth >= 2) {
      continue;
    }

    for (const link of document.discovered_links) {
      if (!shouldFetchDiscovered(link.url)) {
        continue;
      }
      if (fetchedByUrl.has(link.url) || queue.some((queued) => queued.url === link.url)) {
        continue;
      }
      queue.push({
        url: link.url,
        sourceId: inferSourceIdFromUrl(link.url, item.sourceId),
        discoveredFrom: document.url,
        depth: item.depth + 1
      });
    }
  }

  const documents = [...fetchedByUrl.values()].sort((a, b) => a.url.localeCompare(b.url));
  const pdfDocuments = documents.filter((document) => document.content_kind === "pdf");
  const htmlDocuments = documents.filter((document) => document.content_kind === "html");
  const failedDocuments = documents.filter((document) => !document.ok);
  const sessionEntries = documents
    .filter((document) => document.content_kind === "html" && document.session && document.source_id === "official-gesp-true-questions")
    .map((document) => {
      const attachments = pdfDocuments.filter((pdf) => pdf.discovered_from === document.url);
      return {
        session: document.session,
        title: document.title,
        url: document.url,
        published_at: document.published_at,
        pdf_count: attachments.length,
        pdf_urls: attachments.map((attachment) => attachment.url)
      };
    })
    .sort((a, b) => a.session.localeCompare(b.session) || a.url.localeCompare(b.url));
  const sampleAttachments = pdfDocuments
    .filter((document) => document.source_id === "official-gesp-sample-questions")
    .map((document) => document.url)
    .sort();

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/ingest-official-sources.mjs",
    storage_policy: "metadata-only; no full HTML or PDF body is stored",
    source_registry: officialSourcesPath,
    summary: {
      source_count: officialSources.length,
      document_count: documents.length,
      html_count: htmlDocuments.length,
      pdf_count: pdfDocuments.length,
      failed_count: failedDocuments.length,
      true_question_session_count: sessionEntries.length,
      sample_attachment_count: sampleAttachments.length
    },
    true_question_sessions: sessionEntries,
    sample_attachments: sampleAttachments,
    documents
  };

  await mkdir(outputDir, { recursive: true });
  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);

  console.log(`official source count: ${officialSources.length}`);
  console.log(`document count: ${documents.length}`);
  console.log(`html count: ${htmlDocuments.length}`);
  console.log(`pdf count: ${pdfDocuments.length}`);
  console.log(`true question session count: ${sessionEntries.length}`);
  console.log(`sample attachment count: ${sampleAttachments.length}`);
  console.log(`failed count: ${failedDocuments.length}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`Official source ingestion failed: ${error.message}`);
  process.exitCode = 1;
});
