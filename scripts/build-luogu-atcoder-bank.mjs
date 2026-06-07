import { mkdir, readFile, writeFile } from "node:fs/promises";
import { createHash } from "node:crypto";
import { dirname, extname, join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const TARGET_DIFFICULTY = Number(process.env.LUOGU_TARGET_DIFFICULTY || 0);
const LIST_URL = TARGET_DIFFICULTY
  ? `https://www.luogu.com.cn/problem/list?type=AT&difficulty=${TARGET_DIFFICULTY}&page=`
  : "https://www.luogu.com.cn/problem/list?type=AT&page=";
const TAG_URL = "https://www.luogu.com.cn/_lfe/tags/zh-CN";
const OUTPUT_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";
const ASSET_DIR = "data/atcoder/assets";
const ASSET_ROUTE_PREFIX = "/api/atcoder-catalog/assets";
const TARGET_DIFFICULTIES = TARGET_DIFFICULTY ? new Set([TARGET_DIFFICULTY]) : new Set([2, 3, 4, 5]);
const CRAWL_DELAY_MS = Number(process.env.LUOGU_CRAWL_DELAY_MS || 400);
const DETAIL_LIMIT = Number(process.env.LUOGU_DETAIL_LIMIT || 0);
const REUSE_EXISTING_LIST = process.env.LUOGU_REUSE_EXISTING_LIST === "1";
const CHECKPOINT_INTERVAL = Number(process.env.LUOGU_CHECKPOINT_INTERVAL || 25);
const CACHE_DIR = process.env.LUOGU_CACHE_DIR || "";
const OFFLINE_CACHE = process.env.LUOGU_OFFLINE_CACHE === "1";
const LIST_ONLY = process.env.LUOGU_LIST_ONLY === "1";
const DIFFICULTY_LABELS = {
  2: "普及-",
  3: "普及/提高-",
  4: "普及+/提高",
  5: "提高+/省选-"
};
const execFileAsync = promisify(execFile);

const DOMAIN_FALLBACK = {
  id: "uncategorized",
  label: "待分类"
};

const DOMAIN_BY_ROOT = new Map([
  ["动态规划 DP", "动态规划"],
  ["字符串", "字符串"],
  ["图论", "图论"],
  ["搜索", "搜索"],
  ["数学", "数学"],
  ["数论", "数论"],
  ["数据结构", "数据结构"],
  ["树形数据结构", "数据结构"],
  ["线性数据结构", "数据结构"],
  ["树论", "树论"],
  ["计算几何", "计算几何"],
  ["组合数学", "组合数学"],
  ["线性代数", "线性代数"],
  ["博弈论", "博弈论"],
  ["贪心", "贪心"],
  ["排序", "排序"],
  ["二分", "二分"],
  ["递推", "递推"],
  ["模拟", "模拟"]
]);

const DIRECT_DOMAIN_NAMES = new Set([
  "模拟",
  "字符串",
  "动态规划 DP",
  "搜索",
  "数学",
  "图论",
  "贪心",
  "计算几何",
  "博弈论",
  "递推",
  "二分",
  "排序",
  "递归",
  "分治",
  "数论",
  "树论",
  "构造",
  "高精度",
  "枚举",
  "前缀和",
  "双指针 two-pointer"
]);

const KNOWLEDGE_TEMPLATES = {
  "动态规划": {
    answer: "建立状态、转移方程和边界条件，按依赖顺序填表或记忆化搜索。",
    points: ["状态定义", "状态转移", "边界初始化", "复杂度优化"]
  },
  "贪心": {
    answer: "找出局部选择准则，证明交换后不会变差，再按规则排序或扫描。",
    points: ["贪心选择性质", "交换论证", "排序后扫描"]
  },
  "字符串": {
    answer: "围绕字符匹配、计数、字典序或模式结构处理字符串。",
    points: ["字符遍历", "模式匹配", "字典序", "字符串构造"]
  },
  "排序": {
    answer: "抽取排序关键字，排序后扫描、统计或做相邻元素比较。",
    points: ["排序关键字", "稳定性与比较器", "排序后贪心/统计"]
  },
  "图论": {
    answer: "把关系建成点和边，再选择遍历、最短路、连通性或匹配模型。",
    points: ["建图", "图遍历", "连通性", "路径与环"]
  },
  "搜索": {
    answer: "设计搜索状态和转移，配合剪枝、BFS 层序或 DFS 回溯控制规模。",
    points: ["状态表示", "BFS/DFS", "剪枝", "访问标记"]
  },
  "数学": {
    answer: "将题意转化为公式、计数、数论或组合关系后计算。",
    points: ["公式推导", "边界处理", "取模/整除", "组合计数"]
  },
  "数论": {
    answer: "围绕 gcd、素数、同余、快速幂或筛法等数论工具建模。",
    points: ["gcd/lcm", "同余", "素数与筛法", "快速幂"]
  },
  "数据结构": {
    answer: "维护动态集合、区间、队列或树结构上的查询和更新。",
    points: ["查询更新", "区间维护", "栈/队列/堆", "树状数组/线段树"]
  },
  "树论": {
    answer: "利用树的父子关系、路径、子树信息或 DFS 序组织计算。",
    points: ["DFS 序", "子树统计", "树上路径", "LCA/树形 DP"]
  },
  "计算几何": {
    answer: "把点、向量、距离、角度或面积转为几何公式和精度处理。",
    points: ["向量", "叉积", "距离/面积", "精度控制"]
  },
  "构造": {
    answer: "从目标性质反推构造规则，并验证所有约束都被满足。",
    points: ["性质分析", "构造规则", "合法性验证"]
  },
  "模拟": {
    answer: "按题目规则逐步维护状态，重点处理边界和格式细节。",
    points: ["状态维护", "边界情况", "输入输出格式"]
  },
  "待分类": {
    answer: "洛谷列表未给出算法标签，需要打开原题面后人工补充分法。",
    points: ["题面分析", "约束规模", "样例推导"]
  }
};

function slugify(value) {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "_")
    .replace(/^_+|_+$/g, "") || "tag";
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchText(url) {
  const cached = await readCachedText(url);
  if (cached !== null) {
    return cached;
  }
  if (OFFLINE_CACHE) {
    throw new Error(`${url}: cache file not found`);
  }
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "text/html,application/json",
        "user-agent": "Mozilla/5.0 luogu-atcoder-bank-builder"
      },
      redirect: "follow"
    });
    if (!response.ok) {
      throw new Error(`${url}: ${response.status} ${response.statusText}`);
    }
    return response.text();
  } catch (error) {
    const { stdout } = await execFileAsync("curl", [
      "-fsSL",
      "--compressed",
      "--max-time",
      "30",
      "-A",
      "Mozilla/5.0 luogu-atcoder-bank-builder",
      url
    ], {
      maxBuffer: 8 * 1024 * 1024
    });
    if (!stdout.trim()) {
      throw error;
    }
    return stdout;
  }
}

async function fetchBuffer(url) {
  const cached = await readCachedBuffer(url);
  if (cached) {
    return cached;
  }
  if (OFFLINE_CACHE) {
    throw new Error(`${url}: cache file not found`);
  }
  try {
    const response = await fetch(url, {
      headers: {
        "accept": "image/avif,image/webp,image/apng,image/svg+xml,image/*,*/*;q=0.8",
        "user-agent": "Mozilla/5.0 luogu-atcoder-bank-builder"
      },
      redirect: "follow"
    });
    if (!response.ok) {
      throw new Error(`${url}: ${response.status} ${response.statusText}`);
    }
    return {
      buffer: Buffer.from(await response.arrayBuffer()),
      contentType: response.headers.get("content-type") || ""
    };
  } catch (error) {
    const { stdout } = await execFileAsync("curl", [
      "-fsSL",
      "--compressed",
      "--max-time",
      "30",
      "-A",
      "Mozilla/5.0 luogu-atcoder-bank-builder",
      url
    ], {
      encoding: "buffer",
      maxBuffer: 16 * 1024 * 1024
    });
    if (!stdout?.length) {
      throw error;
    }
    return {
      buffer: stdout,
      contentType: ""
    };
  }
}

function cachePathForUrl(url) {
  if (!CACHE_DIR) {
    return null;
  }
  const parsed = new URL(url);
  if (parsed.pathname === "/_lfe/tags/zh-CN") {
    return join(CACHE_DIR, "tags_zh-CN.json");
  }
  if (parsed.pathname === "/problem/list") {
    const difficulty = parsed.searchParams.get("difficulty");
    const difficultyPart = difficulty ? `_difficulty_${difficulty}` : "";
    return join(CACHE_DIR, `problem_list${difficultyPart}_page_${parsed.searchParams.get("page") || "1"}.html`);
  }
  const problemMatch = parsed.pathname.match(/^\/problem\/([^/]+)$/);
  if (problemMatch) {
    return join(CACHE_DIR, `problem_${problemMatch[1]}.html`);
  }
  const hash = createHash("sha256").update(url).digest("hex").slice(0, 24);
  const extension = extensionFromUrl(url, "") || ".bin";
  return join(CACHE_DIR, `asset_${hash}${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "_"));
}

async function readCachedText(url) {
  const cachePath = cachePathForUrl(url);
  if (!cachePath) {
    return null;
  }
  try {
    return await readFile(cachePath, "utf8");
  } catch {
    return null;
  }
}

async function readCachedBuffer(url) {
  const cachePath = cachePathForUrl(url);
  if (!cachePath) {
    return null;
  }
  try {
    return {
      buffer: await readFile(cachePath),
      contentType: ""
    };
  } catch {
    return null;
  }
}

function parseContext(html, url) {
  const match = html.match(/<script id="lentille-context" type="application\/json">([\s\S]*?)<\/script>/);
  if (!match) {
    throw new Error(`${url}: lentille-context not found`);
  }
  return JSON.parse(match[1]);
}

function normalizeSourceUrl(sourceUrl) {
  if (!sourceUrl) {
    return null;
  }
  if (sourceUrl.startsWith("//")) {
    return `https:${sourceUrl}`;
  }
  if (sourceUrl.startsWith("/")) {
    return `https://www.luogu.com.cn${sourceUrl}`;
  }
  return sourceUrl;
}

function extensionFromContentType(contentType) {
  if (contentType.includes("svg")) return ".svg";
  if (contentType.includes("png")) return ".png";
  if (contentType.includes("jpeg") || contentType.includes("jpg")) return ".jpg";
  if (contentType.includes("webp")) return ".webp";
  if (contentType.includes("gif")) return ".gif";
  return "";
}

function extensionFromUrl(sourceUrl, contentType) {
  const pathname = new URL(sourceUrl).pathname;
  const fromUrl = extname(pathname);
  if (fromUrl && fromUrl.length <= 8) {
    return fromUrl;
  }
  return extensionFromContentType(contentType) || ".bin";
}

function extractMarkdownImages(markdown, sectionId) {
  const assets = [];
  const imagePattern = /!\[([^\]]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  let match = imagePattern.exec(markdown || "");
  while (match) {
    const sourceUrl = normalizeSourceUrl(match[2]);
    if (sourceUrl) {
      assets.push({
        id: `${sectionId}_${assets.length + 1}`,
        section_id: sectionId,
        source_url: sourceUrl,
        alt_text: match[1] || "题面图片"
      });
    }
    match = imagePattern.exec(markdown || "");
  }
  return assets;
}

function attachmentAssets(attachments) {
  if (!Array.isArray(attachments)) {
    return [];
  }
  return attachments
    .map((attachment, index) => {
      const sourceUrl = normalizeSourceUrl(attachment.url || attachment.uri || attachment.href || attachment);
      if (!sourceUrl) {
        return null;
      }
      return {
        id: `attachment_${index + 1}`,
        section_id: "attachments",
        source_url: sourceUrl,
        alt_text: attachment.name || attachment.filename || "题面附件图片"
      };
    })
    .filter(Boolean);
}

async function downloadProblemAssets(problemId, assetCandidates) {
  const assets = [];
  const seen = new Set();
  await mkdir(ASSET_DIR, { recursive: true });

  for (const candidate of assetCandidates) {
    if (seen.has(candidate.source_url)) {
      continue;
    }
    seen.add(candidate.source_url);
    try {
      const { buffer, contentType } = await fetchBuffer(candidate.source_url);
      const hash = createHash("sha256").update(buffer).digest("hex").slice(0, 16);
      const extension = extensionFromUrl(candidate.source_url, contentType);
      const filename = `${problemId}_${hash}${extension}`.replace(/[^a-zA-Z0-9_.-]/g, "_");
      const localPath = join(ASSET_DIR, filename);
      await writeFile(localPath, buffer);
      assets.push({
        ...candidate,
        id: `${problemId}_${hash}`,
        status: "downloaded",
        local_path: localPath,
        asset_url: `${ASSET_ROUTE_PREFIX}/${filename}`,
        content_type: contentType || null,
        size_bytes: buffer.length
      });
    } catch (error) {
      assets.push({
        ...candidate,
        status: "download_failed",
        asset_url: candidate.source_url,
        local_path: null,
        error: error.message
      });
    }
  }
  return assets;
}

function tagChain(tag, tagById) {
  const chain = [];
  const seen = new Set();
  let cursor = tag;
  while (cursor && !seen.has(cursor.id)) {
    seen.add(cursor.id);
    chain.push(cursor);
    cursor = cursor.parent === null ? null : tagById.get(cursor.parent);
  }
  return chain;
}

function domainFromTag(tag, tagById) {
  if (!tag || tag.type !== 2) {
    return null;
  }
  if (DIRECT_DOMAIN_NAMES.has(tag.name)) {
    return normalizeDomain(tag.name);
  }
  for (const ancestor of tagChain(tag, tagById)) {
    const mapped = DOMAIN_BY_ROOT.get(ancestor.name);
    if (mapped) {
      return normalizeDomain(mapped);
    }
  }
  return normalizeDomain(tag.name);
}

function normalizeDomain(name) {
  const label = DOMAIN_BY_ROOT.get(name) || name.replace("动态规划 DP", "动态规划");
  return {
    id: slugify(label),
    label
  };
}

function uniqueById(items) {
  const seen = new Set();
  return items.filter((item) => {
    if (!item || seen.has(item.id)) {
      return false;
    }
    seen.add(item.id);
    return true;
  });
}

function buildStatement(problemContext, fallbackUrl) {
  const problem = problemContext.data.problem;
  const contenu = problem.contenu || problem.content || {};
  const sections = [
    {
      id: "description",
      title: "题目描述",
      markdown: contenu.description || ""
    },
    {
      id: "input",
      title: "输入格式",
      markdown: contenu.formatI || ""
    },
    {
      id: "output",
      title: "输出格式",
      markdown: contenu.formatO || ""
    },
    {
      id: "hint",
      title: "说明/提示",
      markdown: contenu.hint || ""
    }
  ].filter((section) => section.markdown.trim());

  return {
    status: sections.length ? "source_extracted" : "pending_collection",
    locale: contenu.locale || problemContext.locale || "zh-CN",
    source_terms_status: "needs_review",
    source_url: fallbackUrl,
    atcoder_url: problem.vjudge?.link || null,
    sections,
    samples: (problem.samples || []).map((sample, index) => ({
      id: `sample_${index + 1}`,
      input: sample[0] || "",
      output: sample[1] || ""
    })),
    limits: {
      time_ms: Array.isArray(problem.limits?.time) ? problem.limits.time[0] : null,
      memory_kb: Array.isArray(problem.limits?.memory) ? problem.limits.memory[0] : null
    },
    notes: [
      "题面来自洛谷公开单题页 lentille-context 结构化数据。",
      "公开来源题面需保留复核状态，不视为官方题解。"
    ]
  };
}

function pendingStatement(sourceUrl) {
  return {
    status: "pending_collection",
    locale: "zh-CN",
    source_terms_status: "needs_review",
    source_url: sourceUrl,
    atcoder_url: null,
    sections: [],
    samples: [],
    limits: {
      time_ms: null,
      memory_kb: null
    },
    notes: ["题面详情尚未抓取。"]
  };
}

function failedStatement(sourceUrl, error) {
  return {
    status: "pending_collection",
    locale: "zh-CN",
    source_terms_status: "needs_review",
    source_url: sourceUrl,
    atcoder_url: null,
    sections: [],
    samples: [],
    limits: {
      time_ms: null,
      memory_kb: null
    },
    notes: [`题面详情抓取失败，后续增量运行会继续重试：${error.message}`]
  };
}

function buildProgrammingSolution(problem, statement) {
  const hasSamples = statement.samples.length > 0;
  return {
    status: "pending_ai_generation",
    language: "C++17",
    code: null,
    content_origin: "pending_ai_generation",
    ai_generation_notice: "洛谷 AtCoder 题面通常没有官方参考解；该题等待 AI 根据题面生成 C++17 参考解，生成后必须编译并通过样例，仍需人工或 OJ 复核。",
    reference_answer: "暂无官方答案，等待 AI 生成并样例验证的 C++17 参考解。",
    algorithm: problem.answer_guidance.solution_outline,
    complexity: "",
    verification: null,
    notes: [
      hasSamples ? "已有公开样例，可用于 AI 参考解生成后的本地样例验证。" : "当前没有公开样例，AI 参考解生成后也不能标为样例通过。",
      "未生成或未验证前不得当作正式答案。"
    ]
  };
}

function problemWithPendingDetails(problem) {
  const statement = pendingStatement(problem.source_url);
  return {
    ...problem,
    statement,
    visual_assets: {
      status: "pending_collection",
      assets: [],
      notes: ["题面图片尚未抓取。"]
    },
    programming_solution: buildProgrammingSolution(problem, statement)
  };
}

function mergeExistingProblem(freshProblem, existingProblem) {
  if (!existingProblem) {
    return problemWithPendingDetails(freshProblem);
  }
  const statement = existingProblem.statement || pendingStatement(freshProblem.source_url);
  return {
    ...freshProblem,
    title_zh: existingProblem.title_zh || freshProblem.title,
    title_zh_source: existingProblem.title_zh_source,
    answer_guidance: existingProblem.answer_guidance
      ? {
        ...existingProblem.answer_guidance,
        source_url: freshProblem.source_url
      }
      : freshProblem.answer_guidance,
    statement: {
      ...statement,
      source_url: freshProblem.source_url
    },
    visual_assets: existingProblem.visual_assets || {
      status: "pending_collection",
      assets: [],
      notes: ["题面图片尚未抓取。"]
    },
    programming_solution: existingProblem.programming_solution || buildProgrammingSolution(freshProblem, statement),
    list_order: freshProblem.list_order
  };
}

async function enrichProblemDetail(problem) {
  const html = await fetchText(problem.source_url);
  const context = parseContext(html, problem.source_url);
  const statement = buildStatement(context, problem.source_url);
  const assetCandidates = [
    ...statement.sections.flatMap((section) => extractMarkdownImages(section.markdown, section.id)),
    ...attachmentAssets(context.data.problem.attachments),
    ...attachmentAssets(context.data.problem.contenu?.attachments),
    ...attachmentAssets(context.data.problem.content?.attachments)
  ];
  const visualAssets = await downloadProblemAssets(problem.id, assetCandidates);

  return {
    ...problem,
    statement,
    visual_assets: {
      status: visualAssets.length ? "source_extracted" : "none_found",
      assets: visualAssets,
      notes: visualAssets.length ? ["已下载题面图片资产到本地数据目录。"] : ["当前题面未发现图片资产。"]
    },
    programming_solution: buildProgrammingSolution(problem, statement)
  };
}

function buildProblem(raw, index, tagById) {
  const tags = raw.tags
    .map((id) => tagById.get(id))
    .filter(Boolean)
    .map((tag) => ({
      id: tag.id,
      name: tag.name.replace(/^\uFEFF/, ""),
      type: tag.type,
      parent: tag.parent
    }));
  const algorithmTags = tags.filter((tag) => tag.type === 2);
  const domains = uniqueById(algorithmTags.map((tag) => domainFromTag(tag, tagById))).filter(Boolean);
  const effectiveDomains = domains.length ? domains : [DOMAIN_FALLBACK];
  const primaryDomain = effectiveDomains[0].label;
  const template = KNOWLEDGE_TEMPLATES[primaryDomain] || KNOWLEDGE_TEMPLATES["待分类"];
  const knowledgePoints = uniqueById([
    ...algorithmTags.map((tag) => ({ id: slugify(tag.name), label: tag.name })),
    ...template.points.map((point) => ({ id: slugify(point), label: point }))
  ]);
  const sourceUrl = `https://www.luogu.com.cn/problem/${raw.pid}`;
  const acceptanceRate = raw.totalSubmit > 0 ? Number((raw.totalAccepted / raw.totalSubmit).toFixed(4)) : null;

  return {
    id: raw.pid,
    pid: raw.pid,
    title: raw.name,
    difficulty: raw.difficulty,
    difficulty_label: DIFFICULTY_LABELS[raw.difficulty],
    source_url: sourceUrl,
    total_submit: raw.totalSubmit,
    total_accepted: raw.totalAccepted,
    acceptance_rate: acceptanceRate,
    algorithm_domains: effectiveDomains,
    problem_type_tags: algorithmTags.length
      ? algorithmTags.map((tag) => ({ id: slugify(tag.name), label: tag.name }))
      : [{ id: "luogu_untagged", label: "洛谷未标注算法" }],
    knowledge_points: knowledgePoints,
    tags,
    answer_guidance: {
      status: "reference_link",
      answer: `这是编程题，答案不是固定文本；参考解应围绕「${primaryDomain}」建模并在洛谷原题提交验证。`,
      source: "luogu_problem_page",
      source_url: sourceUrl,
      solution_outline: template.answer,
      knowledge_points: knowledgePoints.map((point) => point.label),
      review_note: "由洛谷列表难度与算法标签自动生成，具体代码解需结合题面约束复核。"
    },
    list_order: index
  };
}

function groupCatalog(problems) {
  const domainMap = new Map();
  for (const problem of problems) {
    for (const domain of problem.algorithm_domains) {
      if (!domainMap.has(domain.id)) {
        domainMap.set(domain.id, {
          domain_id: domain.id,
          domain_label: domain.label,
          problem_count: 0,
          difficulty_counts: {},
          problem_types: new Map()
        });
      }
      const domainBucket = domainMap.get(domain.id);
      domainBucket.problem_count += 1;
      domainBucket.difficulty_counts[problem.difficulty_label] = (domainBucket.difficulty_counts[problem.difficulty_label] || 0) + 1;

      const types = problem.problem_type_tags.length ? problem.problem_type_tags : [{ id: "untagged", label: "待分类" }];
      for (const type of types) {
        if (!domainBucket.problem_types.has(type.id)) {
          domainBucket.problem_types.set(type.id, {
            problem_type_id: type.id,
            problem_type_label: type.label,
            problem_count: 0,
            knowledge_points: new Map(),
            problems: []
          });
        }
        const typeBucket = domainBucket.problem_types.get(type.id);
        typeBucket.problem_count += 1;
        for (const point of problem.knowledge_points) {
          typeBucket.knowledge_points.set(point.id, point);
        }
        typeBucket.problems.push(problem.id);
      }
    }
  }

  return [...domainMap.values()]
    .map((domain) => ({
      ...domain,
      problem_types: [...domain.problem_types.values()]
        .map((type) => ({
          ...type,
          knowledge_points: [...type.knowledge_points.values()].sort((a, b) => a.label.localeCompare(b.label, "zh-CN")),
          problems: type.problems
        }))
        .sort((a, b) => b.problem_count - a.problem_count || a.problem_type_label.localeCompare(b.problem_type_label, "zh-CN"))
    }))
    .sort((a, b) => {
      if (a.domain_id === DOMAIN_FALLBACK.id) {
        return 1;
      }
      if (b.domain_id === DOMAIN_FALLBACK.id) {
        return -1;
      }
      return b.problem_count - a.problem_count || a.domain_label.localeCompare(b.domain_label, "zh-CN");
    });
}

async function main() {
  if (REUSE_EXISTING_LIST) {
    await enrichExistingCatalog();
    return;
  }

  const existing = await readExistingCatalog();
  const tagData = JSON.parse(await fetchText(TAG_URL));
  const tagById = new Map(tagData.tags.map((tag) => [tag.id, tag]));
  const firstContext = parseContext(await fetchText(`${LIST_URL}1`), `${LIST_URL}1`);
  const perPage = firstContext.data.problems.perPage;
  const pageCount = Math.ceil(firstContext.data.problems.count / perPage);
  const rawProblems = [];

  for (let page = 1; page <= pageCount; page += 1) {
    const context = page === 1 ? firstContext : parseContext(await fetchText(`${LIST_URL}${page}`), `${LIST_URL}${page}`);
    rawProblems.push(...context.data.problems.result);
    if (page % 20 === 0 || page === pageCount) {
      console.log(`fetched ${page}/${pageCount}`);
    }
    // Luogu is an external public site; keep requests deliberately low frequency.
    if (page < pageCount && CRAWL_DELAY_MS > 0) {
      await sleep(CRAWL_DELAY_MS);
    }
  }

  const listedProblems = rawProblems
    .filter((problem) => TARGET_DIFFICULTIES.has(problem.difficulty))
    .map((problem, index) => buildProblem(problem, index + 1, tagById))
    .sort((a, b) => a.difficulty - b.difficulty || a.pid.localeCompare(b.pid));
  const existingById = new Map((existing?.problems || []).map((problem) => [problem.id, problem]));
  const listedProblemIds = new Set(listedProblems.map((problem) => problem.id));
  const retainedExistingProblems = TARGET_DIFFICULTY && existing?.problems
    ? existing.problems.filter((problem) => !TARGET_DIFFICULTIES.has(problem.difficulty) && !listedProblemIds.has(problem.id))
    : [];
  const problems = [
    ...retainedExistingProblems,
    ...listedProblems.map((problem) => mergeExistingProblem(problem, existingById.get(problem.id)))
  ].sort((a, b) => a.difficulty - b.difficulty || a.pid.localeCompare(b.pid));
  await writeCatalogCheckpoint({ existing, problems, firstContext, pageCount });
  console.log(`wrote list checkpoint ${OUTPUT_PATH}`);
  if (LIST_ONLY) {
    console.log("list-only crawl complete");
    console.log(`kept ${problems.length}/${rawProblems.length} problems`);
    return;
  }

  const pendingProblems = problems.filter((problem) => problem.statement?.status !== "source_extracted");
  const detailTargets = DETAIL_LIMIT > 0 ? pendingProblems.slice(0, DETAIL_LIMIT) : pendingProblems;
  const problemIndexById = new Map(problems.map((problem, index) => [problem.id, index]));
  let enrichedCount = 0;
  let failedCount = 0;

  for (const [index, problem] of detailTargets.entries()) {
    try {
      problems[problemIndexById.get(problem.id)] = await enrichProblemDetail(problem);
      enrichedCount += 1;
    } catch (error) {
      failedCount += 1;
      console.warn(`${problem.id}: detail fetch failed: ${error.message}`);
      const failed = failedStatement(problem.source_url, error);
      problems[problemIndexById.get(problem.id)] = {
        ...problem,
        statement: failed,
        visual_assets: {
          status: "pending_collection",
          assets: [],
          notes: [`题面图片尚未抓取，原因：${error.message}`]
        },
        programming_solution: buildProgrammingSolution(problem, failed)
      };
    }
    if ((index + 1) % CHECKPOINT_INTERVAL === 0 || index + 1 === detailTargets.length) {
      console.log(`fetched problem details ${index + 1}/${detailTargets.length}`);
      await writeCatalogCheckpoint({ existing, problems, firstContext, pageCount });
    }
    // Luogu is an external public site; keep single-problem detail requests deliberately low frequency.
    if (index + 1 < detailTargets.length && CRAWL_DELAY_MS > 0) {
      await sleep(CRAWL_DELAY_MS);
    }
  }

  await writeCatalogCheckpoint({ existing, problems, firstContext, pageCount });
  console.log(`enriched ${enrichedCount}/${pendingProblems.length} pending problem details`);
  console.log(`failed ${failedCount}/${detailTargets.length} problem details`);
  console.log(`kept ${problems.length}/${rawProblems.length} problems`);
}

async function readExistingCatalog() {
  try {
    return JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  } catch {
    return null;
  }
}

async function writeCatalogCheckpoint({ existing, problems, firstContext, pageCount }) {
  await mkdir(dirname(OUTPUT_PATH), { recursive: true });
  await writeFile(OUTPUT_PATH, `${JSON.stringify(buildCatalogOutput({ existing, problems, firstContext, pageCount }), null, 2)}\n`, "utf8");
  console.log(`wrote ${OUTPUT_PATH}`);
}

function buildCatalogOutput({ existing, problems, firstContext, pageCount }) {
  const difficultyCounts = {};
  for (const problem of problems) {
    difficultyCounts[problem.difficulty_label] = (difficultyCounts[problem.difficulty_label] || 0) + 1;
  }
  const catalog = groupCatalog(problems);
  return {
    ...(existing || {}),
    generated_at: new Date().toISOString(),
    source: {
      ...(existing?.source || {}),
      list_url: TARGET_DIFFICULTY
        ? `https://www.luogu.com.cn/problem/list?type=AT&page=1&difficulty=${TARGET_DIFFICULTY}`
        : "https://www.luogu.com.cn/problem/list?type=AT&page=1",
      tag_url: TAG_URL,
      total_source_problem_count: firstContext.data.problems.count,
      pages_crawled: pageCount,
      crawl_delay_ms: CRAWL_DELAY_MS,
      difficulty_filter: [...TARGET_DIFFICULTIES].map((difficulty) => ({
        difficulty,
        label: DIFFICULTY_LABELS[difficulty]
      })),
      notes: [
        "抓取洛谷公开题目列表中的 AtCoder 元数据，并按题目公开页补充题面、样例和图片资产。",
        "题面来自公开来源，保留 needs_review 状态。",
        "洛谷 AtCoder 题通常无官方参考解；C++ 答案由独立 AI 生成脚本补充，生成后仍需样例验证和人工/OJ 复核。"
      ]
    },
    summary: {
      ...(existing?.summary || {}),
      problem_count: problems.length,
      difficulty_counts: difficultyCounts,
      domain_count: catalog.length,
      knowledge_point_count: new Set(problems.flatMap((problem) => problem.knowledge_points.map((point) => point.id))).size,
      source_extracted_statement_count: problems.filter((problem) => problem.statement?.status === "source_extracted").length,
      pending_statement_count: problems.filter((problem) => problem.statement?.status !== "source_extracted").length,
      ai_sample_verified_solution_count: problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length,
      ai_compile_verified_solution_count: problems.filter((problem) => problem.programming_solution?.verification?.status === "compiled_no_samples").length,
      ai_not_verified_by_request_solution_count: problems.filter((problem) => problem.programming_solution?.verification?.status === "not_verified_by_request").length,
      pending_ai_generation_count: problems.filter((problem) => problem.programming_solution?.status === "pending_ai_generation").length,
      ai_unverified_reference_solution_count: problems.filter((problem) => problem.programming_solution?.content_origin === "ai_generated_unverified_reference").length,
      subagent_ai_reference_solution_count: problems.filter((problem) => problem.programming_solution?.content_origin === "subagent_ai_generated_reference").length,
      local_ai_answer_count: problems.filter((problem) => /AI 生成，仅供参考/.test(problem.answer_guidance?.answer || "")).length,
      title_zh_count: problems.filter((problem) => problem.title_zh).length
    },
    domains: catalog,
    problems
  };
}

async function enrichExistingCatalog() {
  const existing = JSON.parse(await readFile(OUTPUT_PATH, "utf8"));
  const pendingProblems = existing.problems.filter((problem) => problem.statement?.status !== "source_extracted");
  const detailTargets = DETAIL_LIMIT > 0 ? pendingProblems.slice(0, DETAIL_LIMIT) : pendingProblems;
  const problems = [...existing.problems];
  const problemIndexById = new Map(problems.map((problem, index) => [problem.id, index]));
  let enrichedCount = 0;
  let failedCount = 0;

  for (const [index, problem] of detailTargets.entries()) {
    try {
      const enriched = await enrichProblemDetail(problem);
      problems[problemIndexById.get(problem.id)] = enriched;
      enrichedCount += 1;
    } catch (error) {
      failedCount += 1;
      console.warn(`${problem.id}: detail fetch failed: ${error.message}`);
      problems[problemIndexById.get(problem.id)] = {
        ...problem,
        statement: failedStatement(problem.source_url, error),
        visual_assets: {
          status: "pending_collection",
          assets: [],
          notes: [`题面图片尚未抓取，原因：${error.message}`]
        },
        programming_solution: buildProgrammingSolution(problem, failedStatement(problem.source_url, error))
      };
    }
    if ((index + 1) % CHECKPOINT_INTERVAL === 0 || index + 1 === detailTargets.length) {
      console.log(`fetched problem details ${index + 1}/${detailTargets.length}`);
      await writeExistingCatalog(existing, problems);
    }
    if (index + 1 < detailTargets.length && CRAWL_DELAY_MS > 0) {
      await sleep(CRAWL_DELAY_MS);
    }
  }

  await writeExistingCatalog(existing, problems);
  console.log(`enriched ${enrichedCount}/${pendingProblems.length} pending problem details`);
  console.log(`failed ${failedCount}/${detailTargets.length} problem details`);
}

async function writeExistingCatalog(existing, problems) {
  const catalog = groupCatalog(problems);
  const difficultyCounts = {};
  for (const problem of problems) {
    difficultyCounts[problem.difficulty_label] = (difficultyCounts[problem.difficulty_label] || 0) + 1;
  }

  const output = {
    ...existing,
    generated_at: new Date().toISOString(),
    source: {
      ...existing.source,
      crawl_delay_ms: CRAWL_DELAY_MS,
      notes: [
        "抓取洛谷公开题目列表中的 AtCoder 元数据，并按题目公开页补充题面、样例和图片资产。",
        "题面来自公开来源，保留 needs_review 状态。",
        "洛谷 AtCoder 题通常无官方参考解；C++ 答案由独立 AI 生成脚本补充，生成后仍需样例验证和人工/OJ 复核。"
      ]
    },
    summary: {
      ...existing.summary,
      problem_count: problems.length,
      difficulty_counts: difficultyCounts,
      domain_count: catalog.length,
      knowledge_point_count: new Set(problems.flatMap((problem) => problem.knowledge_points.map((point) => point.id))).size,
      source_extracted_statement_count: problems.filter((problem) => problem.statement?.status === "source_extracted").length,
      pending_statement_count: problems.filter((problem) => problem.statement?.status !== "source_extracted").length,
      ai_sample_verified_solution_count: problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length,
      pending_ai_generation_count: problems.filter((problem) => problem.programming_solution?.status === "pending_ai_generation").length
    },
    domains: catalog,
    problems
  };

  await writeFile(OUTPUT_PATH, `${JSON.stringify(output, null, 2)}\n`, "utf8");
  console.log(`wrote ${OUTPUT_PATH}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
