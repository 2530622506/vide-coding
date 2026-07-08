import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { basename, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const inputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const outputPath = "data/classification/wanjuanwang-gesp-cpp-image-option-ocr.json";
const cacheDir = ".tmp/wanjuanwang-option-images";
const chromePath = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeText(value) {
  return String(value || "").replace(/\s+/g, " ").trim();
}

async function downloadImage(url) {
  const response = await fetch(url, {
    headers: {
      "User-Agent": "gesp-classification-catalog/0.1 (+wanjuanwang-image-ocr)",
      Referer: "https://www.wanjuanwang.com/"
    }
  });
  if (!response.ok) {
    throw new Error(`download failed ${response.status}`);
  }
  const contentType = response.headers.get("content-type") || "";
  const buffer = Buffer.from(await response.arrayBuffer());
  let filename = basename(new URL(url).pathname);
  if (contentType === "application/octet-stream" && isSvgLike(buffer) && !filename.endsWith(".svg")) {
    filename = `${filename}.svg`;
  }
  const filePath = join(cacheDir, filename);
  await writeFile(filePath, buffer);
  return {
    filePath,
    contentType,
    buffer
  };
}

async function ocrImage(filePath) {
  const { stdout } = await execFileAsync("/opt/homebrew/bin/tesseract", [filePath, "stdout"], {
    timeout: 15_000,
    maxBuffer: 1024 * 1024
  });
  return normalizeText(stdout);
}

function isSvgLike(buffer) {
  const text = buffer.toString("utf8", 0, Math.min(buffer.length, 256));
  return /<svg|<\?xml/i.test(text);
}

async function renderSvgForOcr(sourcePath, outputBase) {
  const wrapperPath = `${outputBase}.html`;
  const screenshotPath = `${outputBase}.png`;
  const html = `<!doctype html>
<html lang="zh-CN">
<head>
  <meta charset="utf-8">
  <style>
    html, body { margin: 0; background: #fff; }
    body { min-height: 100vh; display: flex; align-items: center; justify-content: center; }
    img { max-width: 1000px; max-height: 500px; object-fit: contain; }
  </style>
</head>
<body>
  <img src="file://${process.cwd()}/${sourcePath}" alt="option">
</body>
</html>`;
  await writeFile(wrapperPath, html);
  await execFileAsync(chromePath, [
    "--headless=new",
    "--disable-gpu",
    "--hide-scrollbars",
    "--window-size=1280,720",
    `--screenshot=${screenshotPath}`,
    `file://${process.cwd()}/${wrapperPath}`
  ], {
    timeout: 30_000,
    maxBuffer: 1024 * 1024
  });
  return screenshotPath;
}

async function main() {
  const artifact = await readJson(inputPath);
  const questions = artifact.pages
    .flatMap((page) => page.questions)
    .filter((question) => question.question_type === "selection" && question.choice_options.some((option) => /^https?:\/\//.test(option.text)));

  await mkdir(cacheDir, { recursive: true });
  const records = [];

  for (const question of questions) {
    const options = [];
    for (const option of question.choice_options) {
      if (!/^https?:\/\//.test(option.text)) {
        options.push({
          key: option.key,
          source: "text",
          text: option.text
        });
        continue;
      }
      let text = "";
      let error = null;
      try {
        const downloaded = await downloadImage(option.text);
        if (downloaded.contentType.startsWith("image/")) {
          text = await ocrImage(downloaded.filePath);
        } else if (downloaded.contentType === "application/octet-stream" && isSvgLike(downloaded.buffer)) {
          const screenshotPath = await renderSvgForOcr(downloaded.filePath, downloaded.filePath);
          text = await ocrImage(screenshotPath);
        } else {
          throw new Error(`unexpected content-type ${downloaded.contentType}`);
        }
      } catch (currentError) {
        error = currentError instanceof Error ? currentError.message : String(currentError);
      }
      options.push({
        key: option.key,
        source: "ocr",
        image_url: option.text,
        text,
        error
      });
    }
    records.push({
      canonical_problem_id: question.id,
      title: question.stem_text,
      options
    });
  }

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/ocr-wanjuanwang-gesp-cpp-image-options.mjs",
    input: inputPath,
    summary: {
      question_count: records.length
    },
    records
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang image-option ocr questions: ${records.length}`);
  console.log(`wrote ${outputPath}`);
  await rm(cacheDir, { recursive: true, force: true });
}

main().catch((error) => {
  console.error(`WanJuanWang image-option OCR failed: ${error.message}`);
  process.exitCode = 1;
});
