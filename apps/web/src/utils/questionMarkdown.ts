const imageUrlPattern = /^(https?:\/\/image\.wanjuanwang\.com\/images\/\S+|https?:\/\/\S+\.(?:png|jpe?g|gif|webp|svg|image)(?:\?\S*)?)$/gim;
const codeStartPattern = /(#include\b|using\s+namespace\b|(?:int|long long|void|bool|double|float|char|string|auto)\s+\w+\s*\([^)]*\)\s*\{)/g;
const codeTailMarkerPattern = /关于上述|关于以上|对于上述|对于以上|下列|以下|描述不正确|描述正确|说法不正确|说法正确|输出结果|输出是|返回值为|时间复杂度|空间复杂度|执行后的输出|运行结果|输入描述|输出描述/;

export function normalizeQuestionMarkdown(rawValue: string) {
  const normalized = String(rawValue || "")
    .replace(/^:::[^\n]*(?:\n|$)/gm, "")
    .replace(/^:::$/gm, "")
    .replace(imageUrlPattern, "![]($1)")
    .trim();

  return injectCodeFences(normalized);
}

function injectCodeFences(value: string) {
  if (!value || value.includes("```")) return value;

  const segments: string[] = [];
  let cursor = 0;
  codeStartPattern.lastIndex = 0;

  while (true) {
    const match = codeStartPattern.exec(value);
    if (!match) break;

    const start = match.index;
    if (start < cursor) continue;

    const end = findCodeEnd(value, start);
    if (end <= start) continue;

    const before = value.slice(cursor, start).trim();
    if (before) segments.push(before);
    segments.push(`\`\`\`cpp\n${formatCodeBlock(value.slice(start, end))}\n\`\`\``);
    cursor = end;
  }

  const tail = value.slice(cursor).trim();
  if (tail) segments.push(tail);
  return segments.length ? segments.join("\n\n") : value;
}

function findCodeEnd(value: string, start: number) {
  const tail = value.slice(start);
  const markerOffset = tail.search(codeTailMarkerPattern);
  if (markerOffset > 0) {
    const markerIndex = start + markerOffset;
    const lastBrace = value.lastIndexOf("}", markerIndex);
    if (lastBrace >= start) return lastBrace + 1;
    return markerIndex;
  }

  const firstBrace = value.indexOf("{", start);
  if (firstBrace === -1) return start;

  let depth = 0;
  for (let i = firstBrace; i < value.length; i += 1) {
    if (value[i] === "{") depth += 1;
    else if (value[i] === "}") {
      depth -= 1;
      if (depth === 0) return i + 1;
    }
  }

  return value.length;
}

function formatCodeBlock(block: string) {
  const compact = block
    .replace(/\s+/g, " ")
    .replace(/\{\s*/g, "{\n")
    .replace(/\}\s*/g, "}\n")
    .replace(/;\s*/g, ";\n")
    .replace(/\belse if\b/g, "\nelse if")
    .replace(/\belse return\b/g, "\nelse return")
    .replace(/\breturn\b/g, (match, offset, text) => (offset > 0 && text[offset - 1] !== "\n" ? `\n${match}` : match))
    .replace(/\n{2,}/g, "\n")
    .trim();

  const lines = compact.split("\n").map((line) => line.trim()).filter(Boolean);
  let indent = 0;
  const formatted: string[] = [];

  for (const line of lines) {
    if (line.startsWith("}")) indent = Math.max(indent - 1, 0);
    formatted.push(`${"  ".repeat(indent)}${line}`);
    if (line.endsWith("{")) indent += 1;
  }

  return formatted.join("\n");
}
