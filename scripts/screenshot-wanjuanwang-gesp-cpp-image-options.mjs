import { mkdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const reviewPath = "data/exports/wanjuanwang-gesp-cpp-image-option-review.json";
const catalogPath = "data/classification/wanjuanwang-gesp-cpp-problems.json";
const outputDir = "data/exports/wanjuanwang-image-option-screenshots";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function isImageUrl(value) {
  const text = String(value || "");
  return /^https?:\/\/.+\.(png|jpe?g|gif|webp|svg|image)(?:\?.*)?$/i.test(text)
    || /^https?:\/\/image\.wanjuanwang\.com\/images\/.+/i.test(text);
}

async function main() {
  const [review, catalog] = await Promise.all([
    readJson(reviewPath),
    readJson(catalogPath)
  ]);
  const detailById = new Map((catalog.problem_details || []).map((detail) => [detail.canonical_problem_id, detail]));
  await mkdir(outputDir, { recursive: true });

  for (const question of review.questions) {
    const detail = detailById.get(question.canonical_problem_id);
    const options = detail?.choice_options?.options || [];
    const screenshotPath = join(outputDir, `${question.canonical_problem_id.replace(/[:/]/g, "_")}.png`);
    const htmlPath = join(outputDir, `${question.canonical_problem_id.replace(/[:/]/g, "_")}.html`);
    const safeTitle = question.title
      .replaceAll("&", "&amp;")
      .replaceAll("<", "&lt;")
      .replaceAll(">", "&gt;");
    const rows = options.map((option) => {
      const imageContent = isImageUrl(option.text)
        ? `<img src="${option.text}" alt="${option.key}">`
        : option.text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
      const ocrText = option.ocr_text
        ? `<small>OCR：${option.ocr_text.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</small>`
        : "";
      const ocrError = option.ocr_error
        ? `<small>OCR 失败：${option.ocr_error.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;")}</small>`
        : "";
      return `<div>${option.key}</div><div class="item">${imageContent}${ocrText}${ocrError}</div>`;
    }).join("");
    const html = `<!doctype html>
<html lang="zh-CN">
<head>
<meta charset="utf-8">
<title>${question.canonical_problem_id}</title>
<style>
body { margin: 0; padding: 24px; font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif; background: #f7f8fa; color: #1f2937; }
.card { background: #fff; border: 1px solid #d9dee7; border-radius: 12px; padding: 20px; max-width: 1000px; margin: 0 auto; }
h1 { font-size: 20px; margin: 0 0 12px; }
.grid { display: grid; grid-template-columns: 48px 1fr; gap: 12px; margin-top: 16px; }
.item { border: 1px solid #d9dee7; border-radius: 8px; padding: 12px; background: #fff; }
.item img { max-width: 100%; max-height: 180px; object-fit: contain; display:block; }
small { color: #6b7280; display: block; margin-top: 6px; }
</style>
</head>
<body>
<div class="card">
  <h1>${safeTitle}</h1>
  <small>${question.canonical_problem_id}</small>
  <div class="grid">${rows}</div>
</div>
</body>
</html>
`;
    await writeFile(htmlPath, html);

    await execFileAsync(chromePath, [
      "--headless=new",
      "--disable-gpu",
      "--disable-background-networking",
      "--no-first-run",
      "--allow-file-access-from-files",
      "--hide-scrollbars",
      "--window-size=1280,1200",
      `--screenshot=${screenshotPath}`,
      `file://${process.cwd()}/${htmlPath}`
    ], {
      timeout: 30_000,
      maxBuffer: 1024 * 1024
    });
  }

  console.log(`wanjuanwang image-option screenshots: ${review.questions.length}`);
  console.log(`wrote ${outputDir}`);
}

main().catch((error) => {
  console.error(`WanJuanWang image-option screenshot export failed: ${error.message}`);
  process.exitCode = 1;
});
