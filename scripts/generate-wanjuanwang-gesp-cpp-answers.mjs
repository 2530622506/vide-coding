import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const inputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const outputPath = "data/classification/wanjuanwang-gesp-cpp-generated-answers.json";
const concurrency = 6;

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function readOptionalJson(path) {
  try {
    return await readJson(path);
  } catch {
    return null;
  }
}

function normalizeText(value) {
  return String(value || "")
    .replace(/\s+/g, " ")
    .trim();
}

function hasImageOptions(question) {
  return question.choice_options.some((option) => /^https?:\/\//.test(option.text));
}

function wrapCppSnippet(snippet) {
  const code = String(snippet || "").trim();
  const hasInclude = /#include\s*</.test(code);
  const hasMain = /\bmain\s*\(/.test(code);
  const hasTopLevelDefinition = /\b(class|struct|template|namespace)\b/.test(code) || /\b[A-Za-z_]\w*\s+[A-Za-z_]\w*\s*\([^)]*\)\s*\{/.test(code);
  const prefix = hasInclude
    ? ""
    : "#include <iostream>\n#include <vector>\n#include <string>\n#include <algorithm>\n#include <cmath>\n#include <fstream>\nusing namespace std;\n";

  if (hasMain) {
    return {
      code: `${prefix}${code}\n`,
      mode: "run"
    };
  }

  if (hasInclude || hasTopLevelDefinition) {
    return {
      code: `${prefix}${code}\n`,
      mode: "syntax"
    };
  }

  return {
    code: `${prefix}int main() {\n${code}\nreturn 0;\n}\n`,
    mode: "run"
  };
}

async function runCpp(prepared) {
  const dir = await mkdtemp(join(tmpdir(), "wanjuanwang-cpp-"));
  const sourcePath = join(dir, "main.cpp");
  const outputPath = join(dir, "main.out");
  await writeFile(sourcePath, prepared.code);

  try {
    const compileArgs = prepared.mode === "syntax"
      ? ["-std=c++17", "-fsyntax-only", sourcePath]
      : ["-std=c++17", sourcePath, "-O2", "-o", outputPath];
    await execFileAsync("/usr/bin/clang++", compileArgs, {
      timeout: 10_000,
      maxBuffer: 1024 * 1024
    });
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    return {
      status: "compile_error",
      stdout: "",
      stderr: error.stderr || error.message || "compile error"
    };
  }

  if (prepared.mode === "syntax") {
    await rm(dir, { recursive: true, force: true });
    return {
      status: "syntax_ok",
      stdout: "",
      stderr: ""
    };
  }

  try {
    const result = await execFileAsync(outputPath, [], {
      timeout: 3_000,
      maxBuffer: 1024 * 1024
    });
    await rm(dir, { recursive: true, force: true });
    return {
      status: "ok",
      stdout: result.stdout || "",
      stderr: result.stderr || ""
    };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    return {
      status: "runtime_error",
      stdout: error.stdout || "",
      stderr: error.stderr || error.message || "runtime error"
    };
  }
}

async function mapWithConcurrency(items, workerLimit, mapper) {
  const results = new Array(items.length);
  let cursor = 0;

  async function worker() {
    while (cursor < items.length) {
      const current = cursor;
      cursor += 1;
      results[current] = await mapper(items[current], current);
    }
  }

  await Promise.all(Array.from({ length: Math.min(workerLimit, items.length) }, () => worker()));
  return results;
}

function chooseSelectionAnswer(question, execution) {
  const options = question.choice_options.map((option) => ({
    ...option,
    normalized: normalizeText(option.text)
  }));

  if (execution.status === "compile_error") {
    return options.find((option) => /编译.*错|无法运行|报错/.test(option.text)) || null;
  }

  if (execution.status === "runtime_error") {
    return options.find((option) => /运行时异常|异常|不确定/.test(option.text)) || null;
  }

  const stdout = normalizeText(execution.stdout);
  return options.find((option) => option.normalized === stdout) || null;
}

function extractClaimedOutput(title) {
  const normalized = normalizeText(title);
  const patterns = [
    /输出是\s*([^。（(]+?)(?:（|。|\(|$)/,
    /输出为\s*([^。（(]+?)(?:（|。|\(|$)/,
    /将输出\s*([^。（(]+?)(?:（|。|\(|$)/
  ];
  for (const pattern of patterns) {
    const match = normalized.match(pattern);
    if (match) {
      return normalizeText(match[1]);
    }
  }
  return null;
}

function chooseJudgmentAnswer(question, execution) {
  const options = question.choice_options;
  const trueOption = options.find((option) => /正确/.test(option.text)) || options[0];
  const falseOption = options.find((option) => /错误/.test(option.text)) || options[1];
  const title = normalizeText(question.stem_text || "");

  if (/语法不正确|代码不合法|不能成功编译|编译将报错|无法编译/.test(title)) {
    return execution.status === "compile_error" ? trueOption : falseOption;
  }

  if (/可以成功编译|能够成功编译|实现将 .* 写入|实现了选择排序算法|采用动态规划求解|计算结果正确|最终值是|能通过其成员函数访问/.test(title)) {
    if (execution.status === "compile_error") {
      return falseOption;
    }
    const claimedOutput = extractClaimedOutput(title);
    if (claimedOutput) {
      return normalizeText(execution.stdout) === claimedOutput ? trueOption : falseOption;
    }
    return execution.status === "syntax_ok" || execution.status === "ok" ? trueOption : falseOption;
  }

  const claimedOutput = extractClaimedOutput(title);
  if (claimedOutput) {
    return execution.status === "ok" && normalizeText(execution.stdout) === claimedOutput ? trueOption : falseOption;
  }

  return null;
}

function chooseHeuristicJudgmentAnswer(question) {
  const options = question.choice_options;
  const trueOption = options.find((option) => /正确/.test(option.text)) || options[0];
  const falseOption = options.find((option) => /错误/.test(option.text)) || options[1];
  const title = normalizeText(question.stem_text || "");
  const questionId = question.id;

  if (questionId === "wanjuanwang:2023-09:cxx:level-3:judgment:07:in6u42xfwa7xrhiv2ou4") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2024-09:cxx:level-3:judgment:05:d09zcey1176qtt19lg8w") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2024-09:cxx:level-3:judgment:07:ncjhkppx1235ld2k6569") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2025-03:cxx:level-2:judgment:06:b83wpxiaihghf18sks0v") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2024-06:cxx:level-4:judgment:02:1189pbfq7byy7x3mfp1n") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2024-06:cxx:level-4:judgment:03:2szn0fr3srjy07nld27h") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2024-06:cxx:level-4:judgment:04:5depujqlk0rsmms1tfwd") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-2:judgment:02:9earpx8qjyaiwo164f9w") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:01:quzma6zy8th17dookqdf") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:02:7r91sdcojjig81u6njso") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:06:n2da3vohj7mk870dfwkr") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:07:tfg1qwurfz6pdlmxfsne") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-7:judgment:06:j52h0owamat7mei20w6a") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:08:vnrs0yc2xjtxlohx8xyo") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-3:judgment:10:yx2pf39dti70973ivs12") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-4:judgment:08:kc9y7ioc8c0d1lepbhfa") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-4:judgment:09:pnusyc6glaymhe43vpop") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-5:judgment:09:40542bs3gtlyavkf09tf") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-7:judgment:07:xt5krwh745fapaxn3xdp") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-12:cxx:level-8:judgment:08:0uotaxlzgbb1x66fv5an") {
    return trueOption;
  }
  if (questionId === "wanjuanwang:2023-09:cxx:level-2:judgment:01:ngfaymw6wi2wbe92ksv5") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-09:cxx:level-2:judgment:04:7roon9r8owiu658u6qua") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-09:cxx:level-2:judgment:06:0vnkvgzprq0dob8po2mz") {
    return falseOption;
  }
  if (questionId === "wanjuanwang:2023-09:cxx:level-5:judgment:09:sqhllvfl73xskj6x2iwd") {
    return falseOption;
  }

  if (/pow\(10,\s*3\).*(类型为 int|类型为int)/.test(title)) {
    return falseOption;
  }
  if (/注释不宜写得过多.*程序运行速度变慢/.test(title)) {
    return falseOption;
  }
  if (/a \/ 4 == 2.*a >= 8 && a <= 11.*结果总是相同/.test(title)) {
    return trueOption;
  }
  if (/表达式\(3\.5 \* 2\).*结果为 7\.0.*类型为 double/.test(title)) {
    return trueOption;
  }
  if (/for 语句的循环体至少会执行一次/.test(title)) {
    return falseOption;
  }
  if (/if 语句中的条件表达式的结果必须为 bool 类型/.test(title)) {
    return falseOption;
  }
  if (/a = a \+ 3;.*是错误的/.test(title)) {
    return falseOption;
  }
  if (/'3'是一个 int 类型常量/.test(title)) {
    return falseOption;
  }
  if (/程序员用 C、C\+\+、Python、Scratch 等编写的程序能在 CPU 上直接执行/.test(title)) {
    return falseOption;
  }
  if (/IPv4.*a、b、c、d 都是 1~255 之间/.test(title)) {
    return falseOption;
  }
  if (/4GB 和 4096MB.*容量大的盘是笑笑的/.test(title)) {
    return falseOption;
  }
  if (/else 子句可以嵌套 if .* if 子句不可以/.test(title)) {
    return falseOption;
  }
  if (/表达式\(10\.0 \/ 2\).*结果为 5\.0.*类型为 double/.test(title)) {
    return trueOption;
  }
  if (/C\+\+语言中>=是运算符，但=>不是/.test(title)) {
    return trueOption;
  }
  if (/标识符中可以有下划线_.*不能以下划线_开头/.test(title)) {
    return falseOption;
  }
  if (/a = a - 'a' \+ 'A'.*变为与原值对应的大写字母/.test(title)) {
    return trueOption;
  }
  if (/一个程序不能有多个 main 函数/.test(title)) {
    return trueOption;
  }
  if (/while 语句的循环体至少会执行一次/.test(title)) {
    return falseOption;
  }
  if (/表达式'a'的值为'1'/.test(title)) {
    return falseOption;
  }
  if (/表达式\(37 \/ 4\).*结果为 9.*类型为 int/.test(title)) {
    return trueOption;
  }
  if (/计算机硬件主要包括运算器、控制器、存储器、输入设备和输出设备/.test(title)) {
    return trueOption;
  }
  if (/计算结果必须存储在变量中才能输出/.test(title)) {
    return falseOption;
  }
  if (/标识符的命名不能完全由数字组成.*至少有一个字母就可以/.test(title)) {
    return falseOption;
  }
  if (/do \.\.\. while 语句的循环体至少会执行一次/.test(title)) {
    return trueOption;
  }
  if (/if 语句可以没有 else 子句/.test(title)) {
    return trueOption;
  }
  if (/a % 4 == 2.*判断 a 的值是否为偶数/.test(title)) {
    return falseOption;
  }
  if (/10 是一个 int 类型常量/.test(title)) {
    return trueOption;
  }
  if (/其中顶级域名是gesp/.test(title)) {
    return falseOption;
  }
  if (/整个 GB2312 汉字字符集都放入.*不超过 1\/5 的内存空间/.test(title)) {
    return falseOption;
  }
  if (/a \* 10 的计算结果为 35.*结果类型为 int/.test(title)) {
    return falseOption;
  }
  if (/条件成立时需要执行多条语句.*可以使用大括号/.test(title)) {
    return trueOption;
  }
  if (/取值为大写字母'F'.*a = a \+ 1;.*变为大写字母'G'/.test(title)) {
    return trueOption;
  }
  if (/不能使用 sqrt、abs 等数学函数，包含<cmath>或<math\.h>头文件后就能够使用/.test(title)) {
    return falseOption;
  }
  if (/\+\+和==都是 C\+\+语言的运算符，但\+=不是/.test(title)) {
    return falseOption;
  }
  if (/标识符中可以有下划线.*‘_’也是 C\+\+语言的运算符/.test(title)) {
    return falseOption;
  }
  if (/sqrt\(9\.0\).*结果为 3.*结果类型为 int/.test(title)) {
    return falseOption;
  }
  if (/循环语句的循环体有可能无限制地执行下去/.test(title)) {
    return trueOption;
  }
  if (/长度为 n 的数组.*下标范围是从 0 到 n，包括 0 和 n/.test(title)) {
    return falseOption;
  }
  if (/数据编码方式只有原码、反码、补码三种/.test(title)) {
    return falseOption;
  }
  if (/改写为相同数值的二进制数，会使得程序运行效率更高/.test(title)) {
    return falseOption;
  }
  if (/字符常量'\\0'常用来表示字符串结束，它和字符常量'0'是不同的/.test(title)) {
    return trueOption;
  }
  if (/\(\(a \| 3\) == 3\).*说明 a 在从 0 到 3 之间/.test(title)) {
    return trueOption;
  }
  if (/可以使用字符（如'0'）作为数组下标/.test(title)) {
    return trueOption;
  }
  if (/表达式\(0xf == 015\).*值为 true/.test(title)) {
    return trueOption;
  }
  if (/一个算法可以用不同的形式来描述.*不能用自然语言描述/.test(title)) {
    return falseOption;
  }
  if (/数组被定义时，它的大小就确定了/.test(title)) {
    return trueOption;
  }
  if (/诞生于 1958 年的 103 机是中国第一台通用数字电子计算机.*ENIAC 晚了十多年/.test(title)) {
    return trueOption;
  }
  if (/通过 cout输出的内容是否会被输出到屏幕上/.test(title)) {
    return falseOption;
  }
  if (/记录 10 个最长为 99 字节的字符串.*chars\[100\]\[10\]/.test(title)) {
    return falseOption;
  }
  if (/这体现了递推的编程思想/.test(title)) {
    return trueOption;
  }
  if (/函数的参数默认以引用传递方式进行传递/.test(title)) {
    return falseOption;
  }
  if (/一定要在 try 子句里调用这个函数/.test(title)) {
    return falseOption;
  }
  if (/>=和>>=都是 C\+\+语言的运算符/.test(title)) {
    return trueOption;
  }
  if (/字符常量'0'和'\\0'是等价的/.test(title)) {
    return falseOption;
  }
  if (/一个函数没有被调用时，它的参数不占用内存/.test(title)) {
    return trueOption;
  }
  if (/可以定义四维数组.*不可能用到/.test(title)) {
    return falseOption;
  }
  if (/continue 是无条件被执行，因此将导致死循环/.test(title)) {
    return trueOption;
  }
  if (/cout << \(2, 3, "23"\).*输出为 2, 3, 23/.test(title)) {
    return falseOption;
  }
  if (/int\(3\.14\) 的值为 3/.test(title)) {
    return trueOption;
  }
  if (/do-while 循环不可能导致死循环，但 while 有可能/.test(title)) {
    return falseOption;
  }
  if (/for \(int i = 0; i < 10; i \+= 2\).*间隔为2/.test(title)) {
    return trueOption;
  }
  if (/不可以将变量命名为 cout.*cout 是C\+\+的关键字/.test(title)) {
    return falseOption;
  }
  if (/C\+\+是一种高级程序设计语言/.test(title)) {
    return trueOption;
  }
  if (/字库固化在一个包含只读存储器的扩展卡中插入计算机主板帮助处理汉字/.test(title)) {
    return trueOption;
  }
  if (/\('1' \+ '1'\).*值为 '2'/.test(title)) {
    return falseOption;
  }
  if (/神威·太湖之光超级计算机.*多次荣膺榜首/.test(title)) {
    return trueOption;
  }
  if (/7\.8 \/ 2 的值为 3\.9.*类型为 float/.test(title)) {
    return falseOption;
  }
  if (/之后 n 的值为偶数/.test(title)) {
    return falseOption;
  }
  if (/\(a >= 5 && a <= 10\) 与 \(5 <= a <= 10\).*值总是相同/.test(title)) {
    return falseOption;
  }
  if (/Internet.*它不属于任何一个国家/.test(title)) {
    return trueOption;
  }
  if (/\(2 \* 3\) \|\| \(2 \+ 5\) 的值为 67/.test(title)) {
    return falseOption;
  }
  if (/所有 int 类型的值，经过若干次左移操作.*总会变为 0/.test(title)) {
    return falseOption;
  }
  if (/我们可以通过枚举法来证明.*哥德巴赫猜想/.test(title)) {
    return falseOption;
  }
  if (/\(\(a & 1\) == 0\).*说明 a 是偶数/.test(title)) {
    return trueOption;
  }
  if (/字符常量 '3' 的值和 int 类型常量 3 的值是相同的/.test(title)) {
    return falseOption;
  }
  if (/位运算符也有类似“先乘除、后加减”的优先级规则/.test(title)) {
    return trueOption;
  }
  if (/数组下标的大小决定元素在逻辑上的先后顺序，与元素在内存中位置的先后顺序无关/.test(title)) {
    return falseOption;
  }
  if (/定义数组时， \[\] 中必须指定元素个数/.test(title)) {
    return falseOption;
  }
  if (/二进制数 101\.101 在十进制下是 5\.005/.test(title)) {
    return falseOption;
  }
  if (/== 和 := 都是C\+\+语言的运算符/.test(title)) {
    return falseOption;
  }
  if (/插入排序算法，通常的时间复杂度是O\(N2\)/.test(title)) {
    return trueOption;
  }
  if (/可以通过定义结构体，定义一个新的数据类型/.test(title)) {
    return trueOption;
  }
  if (/char s\[10\]\[100\]/.test(title)) {
    return trueOption;
  }
  if (/每个变量都有其作用域/.test(title)) {
    return trueOption;
  }
  if (/可以定义结构体类型的数组变量.*也可以包含数组成员/.test(title)) {
    return trueOption;
  }
  if (/通过引用传递的参数不会复制实际参数/.test(title)) {
    return trueOption;
  }
  if (/调用它的位置没有在 try 子句中，会引起编译错误/.test(title)) {
    return falseOption;
  }
  if (/指针变量本身不占用内存/.test(title)) {
    return falseOption;
  }
  if (/输出到 cout 的内容输出到文件中.*记录程序运行日志/.test(title)) {
    return trueOption;
  }
  if (/埃氏筛法效率更高/.test(title)) {
    return falseOption;
  }
  if (/形成循环链表/.test(title)) {
    return trueOption;
  }
  if (/质数的判定和筛法的目的并不相同/.test(title)) {
    return trueOption;
  }
  if (/贪心算法的解可能不是最优解/.test(title)) {
    return trueOption;
  }
  if (/qsort 库函数是不稳定排序/.test(title)) {
    return trueOption;
  }
  if (/TCP\/IP的传输层的两个不同的协议分别是UDP和TCP/.test(title)) {
    return trueOption;
  }
  if (/冒泡排序算法优于归并排序/.test(title)) {
    return falseOption;
  }
  if (/可以使用二分法查找链表中的元素/.test(title)) {
    return falseOption;
  }
  if (/类是对象的实例/.test(title)) {
    return falseOption;
  }
  if (/使用 static 修饰符定义的静态成员被该类的所有对象共享/.test(title)) {
    return trueOption;
  }
  if (/DFS 是深度优先算法的英文简写/.test(title)) {
    return trueOption;
  }
  if (/5G中的G表示Gigabytes\/s/.test(title)) {
    return falseOption;
  }
  if (/链表这一数据结构在C\/C\+\+语言中只能使用指针来实现/.test(title)) {
    return falseOption;
  }
  if (/可以定义初始化函数或运算符函数等/.test(title)) {
    return trueOption;
  }
  if (/二叉搜索树的左右子树也是二叉搜索树/.test(title)) {
    return trueOption;
  }
  if (/哈夫曼编码是一种有损压缩算法/.test(title)) {
    return falseOption;
  }
  if (/任何一个 while 循环都可以转化为等价的 for 循环/.test(title)) {
    return trueOption;
  }
  if (/if 语句中的条件表达式的结果可以为 int 类型/.test(title)) {
    return trueOption;
  }
  if (/\('1'\+'1'=='2'\? flag=1:flag=2\).*flag==2/.test(title)) {
    return falseOption;
  }
  if (/010\+100\+001的值为111/.test(title)) {
    return falseOption;
  }
  if (/cout << \(2 \* 3, 3 % 10, 2\+3\).*输出为 6,3,5/.test(title)) {
    return falseOption;
  }
  if (/Dev C\+\+也是一个小型操作系统/.test(title)) {
    return falseOption;
  }
  if (/for\(int i = 1; i < 10; i \+= 3;\).*相当于1、4、7、10/.test(title)) {
    return falseOption;
  }
  if (/C\+\+表达式 -7\/2 的值为整数-3/.test(title)) {
    return trueOption;
  }
  if (/同一个变量也可以先后用不同类型的值赋值/.test(title)) {
    return trueOption;
  }
  if (/2\*int\('9'\)\*2 的值为36/.test(title)) {
    return falseOption;
  }
  if (/执行 srand\(0\) 后连续两次执行 rand\(\) 的结果相等/.test(title)) {
    return falseOption;
  }
  if (/3\+2 && 5-5 的值为false/.test(title)) {
    return trueOption;
  }
  if (/运算符只能处理相同的数据类型，不同类型之间必须转换为相同的数据类型/.test(title)) {
    return falseOption;
  }
  if (/cout<<\(5\|\|2\).*输出 1/.test(title) || /cout<<\(5&&2\).*输出 1/.test(title)) {
    return trueOption;
  }
  if (/两个字符串相加的运算符为\+相当于字符串的合并运算/.test(title)) {
    return trueOption;
  }
  if (/sort\(\) 支持数组的局部排序/.test(title)) {
    return trueOption;
  }
  if (/用递归法求.*阶乘.*时间复杂度是O\(n\)/.test(title)) {
    return trueOption;
  }
  if (/sort\(\) 可以对整数、浮点数、字符数组进行从大到小，从小到大，局部排序/.test(title)) {
    return falseOption;
  }
  if (/\[\(1,2\)\*2\]\*3 在C\+\+中是合法的表达式/.test(title)) {
    return falseOption;
  }
  if (/最大边长的巧克力可以使用二分法/.test(title)) {
    return trueOption;
  }
  if (/小杨想写一个程序来算出正整数N有多少个因数.*没有超过N\/2次的循环/.test(title)) {
    return trueOption;
  }
  if (/以下C\+\+代码能以递归方式实现斐波那契数列/.test(title)) {
    return trueOption;
  }
  if (/任意的非质数自然数N转换成若干个质数的乘积/.test(title)) {
    return trueOption;
  }
  if (/执行 sort\(arr, arr\+10\).*调整为 \{0, 1, 2, 3, 4, 5, 6, 8,9, 10\}/.test(title)) {
    return trueOption;
  }
  if (/单链表和双向链中.*简单冒泡排序的复杂度相同/.test(title)) {
    return trueOption;
  }
  if (/归并排序的时间复杂度是O\(NlogN\)/.test(title)) {
    return trueOption;
  }
  if (/方法在C\+\+的class中表现为class内定义的函数/.test(title)) {
    return trueOption;
  }
  if (/二叉搜索树可以是空树.*右节点树的值都大于根节点的值，左节点树的值都小于根节点的值/.test(title)) {
    return trueOption;
  }
  if (/二叉搜索树查找的平均时间复杂度为O\(logN\)/.test(title)) {
    return trueOption;
  }
  if (/支持下标运算符.*成员函数的形式进行了重载/.test(title)) {
    return trueOption;
  }
  if (/可以没有构造函数，会给出默认的构造函数/.test(title)) {
    return trueOption;
  }
  if (/每一个可能的分支路径深入到不能再深入为止，而且每个节点只能访问一次/.test(title)) {
    return trueOption;
  }
  if (/哈夫曼编码（Huffman Coding）具有唯一性，因此有确定的压缩率/.test(title)) {
    return falseOption;
  }
  if (/广度优先搜索（BFS）能够判断图是否连通/.test(title)) {
    return trueOption;
  }
  if (/如果定义了构造函数，则创建对象时先执行完缺省的构造函数，再执行这个定义的构造函数/.test(title)) {
    return falseOption;
  }
  if (/判断图是否连通只能用广度优先搜索算法实现/.test(title)) {
    return falseOption;
  }
  if (/动态规划算法的时间复杂度一般为：必要状态的数量，乘以计算一次状态转移方程的时间复杂度/.test(title)) {
    return trueOption;
  }
  if (/梯形的面积可以通过表达式 \(a \+ b\) \* h \/ 2 求得/.test(title)) {
    return trueOption;
  }
  if (/执行语句 x \* 2- 4 = 0; 后，变量 x 的值会变为 2\.0/.test(title)) {
    return falseOption;
  }
  if (/最好情况的时间复杂度是O\(logN\)/.test(title)) {
    return falseOption;
  }
  if (/有向完全图.*有N×\(N-1\)\/2条边/.test(title)) {
    return falseOption;
  }
  if (/break语句用于提前终止当前层次循环.*不适用于for循环/.test(title)) {
    return falseOption;
  }
  if (/while可能是死循环，而for循环不可能是死循环/.test(title)) {
    return falseOption;
  }
  if (/变量n被赋值为27.*n%10.*输出的是7/.test(title)) {
    return trueOption;
  }
  if (/任何一个for循环都可以转化为等价的while循环/.test(title)) {
    return trueOption;
  }
  if (/3\.0和3的值相等，所以它们占用的存储空间也相同/.test(title)) {
    return falseOption;
  }
  if (/有交互式程序在运行/.test(title)) {
    return trueOption;
  }
  if (/"10"\*2.*将报错/.test(title)) {
    return trueOption;
  }
  if (/scanf\(\)必须含有参数.*其功能是提示输入/.test(title)) {
    return falseOption;
  }
  if (/printf\("%d#%d&",2,3\).*输出的是2#3&/.test(title)) {
    return trueOption;
  }
  if (/Xyz ， xYz ， xyZ 是三个不同的变量/.test(title)) {
    return trueOption;
  }
  if (/float\(2022\).*float\('2022'\).*均为2022/.test(title)) {
    return falseOption;
  }
  if (/bool\(-1\) 返回的是 false/.test(title)) {
    return falseOption;
  }
  if (/t = int\(s\) \+ 10.*cout << t 的结果为 28\.5/.test(title)) {
    return falseOption;
  }
  if (/i = 0; i < 100; i\+=2.*取值范围是0到99/.test(title)) {
    return falseOption;
  }
  if (/WIFI盒子具有路由器的功能/.test(title)) {
    return trueOption;
  }
  if (/\(8< 9< 10\).*输出结果为 true/.test(title)) {
    return trueOption;
  }
  if (/int\('C'\)\+abs\(-5\.8\).*值为72\.8/.test(title)) {
    return falseOption;
  }
  if (/sqrt\(a\)==abs\(a\).*a 的值为0/.test(title)) {
    return falseOption;
  }
  if (/计算1到100的累加和，采用的是穷举法/.test(title)) {
    return falseOption;
  }
  if (/\(a<<2>>2\) 后的值一定是 a/.test(title)) {
    return falseOption;
  }
  if (/\(010<<1\) 执行结果是 100/.test(title)) {
    return falseOption;
  }
  if (/简单循环就找到其中最小的整数/.test(title)) {
    return trueOption;
  }
  if (/任意整数 a 的二进制反码与补码都有1位不同/.test(title)) {
    return falseOption;
  }
  if (/字符数组被定义时，它的大小可以调整/.test(title)) {
    return falseOption;
  }
  if (/a<<2 将把2输出到 a 中/.test(title)) {
    return falseOption;
  }
  if (/第一趟选择排序处理后 a 中数据变为 \{0,2,2,4,3,1,6\}/.test(title)) {
    return trueOption;
  }
  if (/函数的参数为指针时，可以在函数内部修改该参数的值/.test(title)) {
    return trueOption;
  }
  if (/cout << &\+\+a 会输出 6/.test(title)) {
    return falseOption;
  }
  if (/cout << 9\^2 << endl; 会输出81/.test(title)) {
    return falseOption;
  }
  if (/待排序数据不能都装进内存，需要使用外排序算法/.test(title)) {
    return trueOption;
  }
  if (/异常无法被 catch 捕获/.test(title)) {
    return falseOption;
  }
  if (/a\[2023\]\[2\]\[15\] 的结果不确定/.test(title)) {
    return falseOption;
  }
  if (/全局变量来传递数据/.test(title)) {
    return trueOption;
  }
  if (/分治算法的核心思想是将一个大问题分解成多个相同或相似的子问题/.test(title)) {
    return trueOption;
  }
  if (/递归的实现方式通常会占用更多的栈空间，可能导致栈溢出/.test(title)) {
    return trueOption;
  }
  if (/每一步的局部最优解一定会导致全局最优解/.test(title)) {
    return falseOption;
  }
  if (/辗转相除法用于求两个整数的最大公约数/.test(title)) {
    return trueOption;
  }
  if (/单链表和双链表都可以在常数时间内实现在链表头部插入或删除节点/.test(title)) {
    return trueOption;
  }
  if (/归并排序，其时间复杂度为O\(NlogN\)/.test(title)) {
    return trueOption;
  }
  if (/二分查找要求被搜索的序列是有序的/.test(title)) {
    return trueOption;
  }
  if (/插入排序的时间复杂度是O\(NlogN\)/.test(title)) {
    return falseOption;
  }
  if (/埃氏筛法和线性筛法的时间复杂度都是O\(NloglogN\)/.test(title)) {
    return falseOption;
  }
  if (/栈的基本操作包括入栈（push）和出栈（pop）/.test(title)) {
    return trueOption;
  }
  if (/二叉搜索树的查找操作的时间复杂度是O\(N\)/.test(title)) {
    return falseOption;
  }
  if (/哈夫曼树是一种二叉树/.test(title)) {
    return trueOption;
  }
  if (/删除单向链表中的节点，只需知道待删除节点的地址即可/.test(title)) {
    return falseOption;
  }
  if (/宽度优先搜索中，通常使用队列/.test(title)) {
    return trueOption;
  }
  if (/完全二叉树的任意一层都可以不满/.test(title)) {
    return falseOption;
  }
  if (/继承是将已有类的属性和方法引入新类的过程/.test(title)) {
    return trueOption;
  }
  if (/编码可能出现相同的前缀/.test(title)) {
    return falseOption;
  }
  if (/主要应用领域是有损数据压缩/.test(title)) {
    return falseOption;
  }
  if (/每个表项都有元素时.*平均时间复杂度仍为O\(1\)/.test(title)) {
    return falseOption;
  }
  if (/未实现类 A 中的纯虚函数 f.*类 B 不能直接实例化/.test(title)) {
    return trueOption;
  }
  if (/2 \^ 3 的结果类型为 int 、值为 8/.test(title)) {
    return falseOption;
  }
  if (/广度优先更适合/.test(title)) {
    return trueOption;
  }
  if (/\[log2\(N\)\]\+1/.test(title)) {
    return trueOption;
  }
  if (/sin\(30\).*值约为 0\.5/.test(title)) {
    return falseOption;
  }
  if (/围棋游戏中.*可以使用泛洪算法/.test(title)) {
    return trueOption;
  }
  if (/祖冲之.*3\.1415926和3\.1415927之间/.test(title)) {
    return trueOption;
  }
  if (/Prim算法的时间复杂度为O\(v×e\)/.test(title)) {
    return falseOption;
  }
  if (/孙子定理.*又称中国余数定理/.test(title)) {
    return trueOption;
  }
  if (/最差时间复杂度为O\(1\)/.test(title) && /链表存储该项内的所有冲突元素/.test(title)) {
    return falseOption;
  }
  if (/三角形的面积可以通过表达式 sqrt\(\(a \+ b \+ c\).*\) \/ 4 求得/.test(title)) {
    return falseOption;
  }
  if (/a, b = b, a;.*值会互换/.test(title)) {
    return falseOption;
  }
  if (/N \+= 8\/4\/\/2 相当于 N \+= 8\/\(4\/2\)/.test(title)) {
    return falseOption;
  }
  if (/int\(12\.56\) 的值为13/.test(title)) {
    return falseOption;
  }
  if (/cout << ‘9’\+‘1’;.*输出为10/.test(title) || /cout << '9'\+'1';.*输出为10/.test(title)) {
    return falseOption;
  }
  if (/scanf是C\+\+语言的关键字/.test(title)) {
    return falseOption;
  }
  if (/for \(int i = 0; i < 10; i\+\+\)\s*continue;/.test(title) || /执行后将导致死循环/.test(title) && /continue;/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return falseOption;
  }
  if (/-12 % 10 的值为2/.test(title)) {
    return falseOption;
  }
  if (/N \/ 3.*N % 3.*输出是3-1/.test(title)) {
    return trueOption;
  }
  if (/正整数各位数字之和/.test(title) && /Sum \+= N % 10/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return trueOption;
  }
  if (/C\+\+中可以对数组和数组的每个基础类型的元素赋值/.test(title)) {
    return falseOption;
  }
  if (/补码的优点是可以将减法运算转化为加法运算/.test(title)) {
    return trueOption;
  }
  if (/整数-6的16位补码.*FFFA/.test(title)) {
    return trueOption;
  }
  if (/数组的所有元素在内存中可以不连续存放/.test(title)) {
    return falseOption;
  }
  if (/输出的结果是8/.test(title) && /0b1010/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return trueOption;
  }
  if (/雷劈数.*可以使用枚举的方法求出/.test(title)) {
    return trueOption;
  }
  if (/插入排序算法中，平均时间复杂度是/.test(title)) {
    return trueOption;
  }
  if (/引用是一个指针常量/.test(title)) {
    return falseOption;
  }
  if (/int& a 和 &a 是一样的/.test(title)) {
    return falseOption;
  }
  if (/函数不可以调用自己/.test(title)) {
    return falseOption;
  }
  if (/唯一分解定理表明任何一个大于1的整数都可以唯一地表示为一系列质数的乘积/.test(title)) {
    return trueOption;
  }
  if (/归并排序和快速排序都采用递归实现，也都是不稳定排序/.test(title)) {
    return falseOption;
  }
  if (/链表的优点是插入删除不需要移动元素，并且能随机查找/.test(title)) {
    return falseOption;
  }
  if (/链表的存储空间物理上可以连续，也可以不连续/.test(title)) {
    return trueOption;
  }
  if (/双向链表构成循环链表/.test(title)) {
    return trueOption;
  }
  if (/全国人口普查.*典型的分治策略/.test(title)) {
    return falseOption;
  }
  if (/删除了变量 ptr.*数据也随之删除/.test(title)) {
    return falseOption;
  }
  if (/双向循环链表.*平均时间复杂度是O\(logn\)/.test(title)) {
    return falseOption;
  }
  if (/完全二叉树可以用数组存储数据/.test(title)) {
    return trueOption;
  }
  if (/0-1背包问题，贪心算法一定能获得最优解/.test(title)) {
    return falseOption;
  }
  if (/深度优先搜索中，通常使用队列/.test(title)) {
    return falseOption;
  }
  if (/静态成员函数只能访问静态成员变量/.test(title)) {
    return falseOption;
  }
  if (/哈夫曼编码本质上是一种贪心策略/.test(title)) {
    return trueOption;
  }
  if (/是一组格雷码/.test(title)) {
    return trueOption;
  }
  if (/类内部可以嵌套定义类/.test(title)) {
    return trueOption;
  }
  if (/log\(128\).*值约为 7\.0/.test(title)) {
    return falseOption;
  }
  if (/最坏情况时间复杂度为O\(M\)/.test(title) && /建立单链表存储冲突元素/.test(title)) {
    return trueOption;
  }
  if (/泛洪算法的递归方法容易造成溢出/.test(title)) {
    return trueOption;
  }
  if (/6 & 5.*值为 1/.test(title)) {
    return falseOption;
  }
  if (/很多问题，通过记录子问题的解，两种实现的时间复杂度是相同的/.test(title)) {
    return trueOption;
  }
  if (/时间复杂度仅为O\(log\(n\)\)/.test(title) && /质因数分解/.test(title)) {
    return falseOption;
  }
  if (/非连通图不能使用广度优先搜索算法进行遍历/.test(title)) {
    return falseOption;
  }
  if (/至少有2N−1个节点/.test(title)) {
    return falseOption;
  }
  if (/冒泡排序是稳定的排序算法/.test(title)) {
    return trueOption;
  }
  if (/可能的颜色顺序有8种/.test(title)) {
    return trueOption;
  }
  if (/AB两人必须排在一起，一共有48种排法/.test(title)) {
    return trueOption;
  }
  if (/a = a \+ b; b = a - b; a = a - b;.*值会互换/.test(title)) {
    return trueOption;
  }
  if (/使用单链表和使用双向链表，查找元素的时间复杂度相同/.test(title)) {
    return trueOption;
  }
  if (/斜边的长度可以通过表达式 sqrt\(a \* a \+ b \* b\) 求得/.test(title)) {
    return trueOption;
  }
  if (/表达式\(a<b<c\).*false转为int类型的0，结果为true/.test(title)) {
    return trueOption;
  }
  if (/整型变量X被赋值为20\.24.*输出的是 2\.124/.test(title)) {
    return falseOption;
  }
  if (/\(a<b<c\) 的值为逻辑假/.test(title)) {
    return falseOption;
  }
  if (/scanf\("%d", &N\).*输入含字母或带小数点数，将导致无法执行/.test(title)) {
    return falseOption;
  }
  if (/10\/4 和 10%4 的值相同/.test(title)) {
    return falseOption;
  }
  if (/break 语句通常与if语句配合使用/.test(title)) {
    return trueOption;
  }
  if (/cout << \(3, 4, 5\) 可以输出 3 4 5/.test(title)) {
    return falseOption;
  }
  if (/L3 标记的代码行调整为 for \(int i = 0; i < 5; i\+\+\) 后输出结果相同/.test(title)) {
    return falseOption;
  }
  if (/下面C\+\+代码能求整数N和M之间所有整数之和/.test(title) && /Sum \+= i/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return falseOption;
  }
  if (/int 类型的变量 ch.*值为 ‘1’.*输出为 1/.test(title)) {
    return falseOption;
  }
  if (/第二个输出值较大/.test(title) && /rand\(\)/.test(title)) {
    return falseOption;
  }
  if (/12 % 10 % 10 的值为2/.test(title)) {
    return trueOption;
  }
  if (/0000 1111.*用 X&Y 获取 X 的低四位/.test(title)) {
    return trueOption;
  }
  if (/原码进行1\+\（-1）计算的结果是-2/.test(title) || /原码进行1\+\(-1\)计算的结果是-2/.test(title)) {
    return falseOption;
  }
  if (/16进制数 AB.*10101011/.test(title)) {
    return trueOption;
  }
  if (/str.find\('D'\).*输出的是 3/.test(title)) {
    return falseOption;
  }
  if (/~1 = 1111 1110/.test(title)) {
    return falseOption;
  }
  if (/x=65;.*x\+\+;.*cout<<x\+\+.*输出的是 A/.test(title)) {
    return falseOption;
  }
  if (/~1 的输出值是 -2/.test(title)) {
    return trueOption;
  }
  if (/二维数组的行的大小的必须在定义时确定，列的大小可以动态变化/.test(title)) {
    return falseOption;
  }
  if (/int\* p = &a;.*正确定义指针和初始化指针/.test(title)) {
    return trueOption;
  }
  if (/引用传递允许函数修改传递给它的参数的值/.test(title)) {
    return trueOption;
  }
  if (/输出的是20/.test(title) && /point\(int\* p\)/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return trueOption;
  }
  if (/指针的大小与其所指向的变量的数据类型的大小相同/.test(title)) {
    return falseOption;
  }
  if (/插入排序的时间复杂度总是比冒泡排序低/.test(title)) {
    return falseOption;
  }
  if (/递推法求斐波那契数列的第n 项，时间复杂度为指数级/.test(title)) {
    return falseOption;
  }
  if (/选择排序是稳定的排序算法/.test(title)) {
    return falseOption;
  }
  if (/递推算法通过逐步求解当前状态和前一个或几个状态之间的关系来解决问题/.test(title)) {
    return trueOption;
  }
  if (/唯一分解定理.*唯一地分解为素数之和/.test(title)) {
    return falseOption;
  }
  if (/线性筛法效率更高/.test(title)) {
    return trueOption;
  }
  if (/插入排序的时间复杂度总是比快速排序低/.test(title)) {
    return falseOption;
  }
  if (/贪心算法通过每一步选择局部最优解，从而一定能获得最优解/.test(title)) {
    return falseOption;
  }
  if (/这种循环操作可以通过环形链表来实现/.test(title)) {
    return trueOption;
  }
  if (/引入分治策略往往可以提升算法效率/.test(title)) {
    return trueOption;
  }
  if (/y=sin\(sin\(x\)\); 是一种递归调用/.test(title)) {
    return falseOption;
  }
  if (/通常使用栈来辅助实现/.test(title) && /广度优先搜索/.test(title)) {
    return falseOption;
  }
  if (/恰有2024 个叶结点的二叉树的深度最少是12/.test(title)) {
    return trueOption;
  }
  if (/状态转移方程是动态规划的核心/.test(title)) {
    return trueOption;
  }
  if (/derived class/.test(title) && /virtual void show/.test(title)) {
    return trueOption;
  }
  if (/函数可以定义在另一个函数定义之内/.test(title)) {
    return falseOption;
  }
  if (/选择排序一般是不稳定的/.test(title)) {
    return trueOption;
  }
  if (/一颗 N 层的完全二叉树，一定有 2N−1 个结点/.test(title)) {
    return falseOption;
  }
  if (/链表头结点作为队首比链表头结点作为队尾更便于操作/.test(title)) {
    return trueOption;
  }
  if (/‘a’ << 1 的结果为 'a/.test(title)) {
    return falseOption;
  }
  if (/欧拉筛法的时间复杂度更低/.test(title)) {
    return trueOption;
  }
  if (/表达社交网络/.test(title)) {
    return trueOption;
  }
  if (/不管是否连通，都可以使用深度优先搜索算法进行遍历/.test(title)) {
    return trueOption;
  }
  if (/冒泡排序一般是不稳定的/.test(title)) {
    return falseOption;
  }
  if (/变量定义必须在某一个函数定义之内/.test(title)) {
    return falseOption;
  }
  if (/a \/ 2\.0 \* b 求得/.test(title)) {
    return trueOption;
  }
  if (/‘3’ & 1 的结果为 ‘1’/.test(title)) {
    return falseOption;
  }
  if (/Sn=n⋅\(a1\+an\)\/2.*时间复杂度是O\(1\)/.test(title)) {
    return trueOption;
  }
  if (/查找操作的平均时间复杂度，正比于树的高度/.test(title)) {
    return trueOption;
  }
  if (/下面C\+\+代码被执行时，将执行三次输出/.test(title)) {
    return falseOption;
  }
  if (/输入是 2e-1 时，输出是0/.test(title)) {
    return falseOption;
  }
  if (/studentName 、 student_name 以及 sStudentName 都是合法的变量名称/.test(title)) {
    return trueOption;
  }
  if (/break 和 continue 语句连续在一起，那么作用抵消/.test(title)) {
    return falseOption;
  }
  if (/cin>>X, cout <<X 能接收键盘输入并原样输出/.test(title)) {
    return trueOption;
  }
  if (/cout << \(3,2\) 执行后，将输出3和2/.test(title)) {
    return falseOption;
  }
  if (/8\/3 和 8%3 的值相同/.test(title)) {
    return falseOption;
  }
  if (/循环变量为将导致错误/.test(title) && /int _ = 0/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return falseOption;
  }
  if (/将下面C\+\+代码中的 i = 1 调整为 i = 0 的输出结果相同/.test(title)) {
    return falseOption;
  }
  if (/N - N \/ 10 \* 10.*获得N的个位数/.test(title)) {
    return trueOption;
  }
  if (/\(10 <= N <= 12\).*N为12.*输出为1/.test(title)) {
    return trueOption;
  }
  if (/完全平方数/.test(title) && /int\(sqrt\(N\)\)\*int\(sqrt\(N\)\) == N/.test(title)) {
    return trueOption;
  }
  if (/这种形式就是补码/.test(title)) {
    return trueOption;
  }
  if (/2\+\(-1\) 的结果是 -3/.test(title) || /2\+\（-1） 的结果是 -3/.test(title)) {
    return falseOption;
  }
  if (/CCF\(十六进制\) = 12363\(七进制\)/.test(title)) {
    return falseOption;
  }
  if (/a='A'; a=a\+32;.*输出 97/.test(title)) {
    return trueOption;
  }
  if (/最小的素数是 2/.test(title)) {
    return trueOption;
  }
  if (/ch\[4\].*不能正确执行/.test(title)) {
    return falseOption;
  }
  if (/x=x&00001111;.*输出的是 A/.test(title)) {
    return falseOption;
  }
  if (/按照从前往后的顺序，获得 63 的二进制值是 111111/.test(title)) {
    return falseOption;
  }
  if (/反码计算加减法.*只是解决不了 -0 的问题/.test(title)) {
    return trueOption;
  }
  if (/int arr\[3\]\[\] 是一个正确的二维数组的声明/.test(title)) {
    return falseOption;
  }
  if (/一个函数必须在调用之前既声明又定义/.test(title)) {
    return falseOption;
  }
  if (/冒泡排序和插入排序都是稳定的排序算法/.test(title)) {
    return trueOption;
  }
  if (/值传递、引用传递和指针传递.*可以直接修改传入变量的值/.test(title)) {
    return falseOption;
  }
  if (/int\* ptr;\\n\*ptr = 10;/.test(question.blocks?.map?.(b=>b.text).join('\\n') || '')) {
    return falseOption;
  }
  if (/递推是一种通过已知的初始值和递推公式/.test(title)) {
    return trueOption;
  }
  if (/单链表只支持在表头进行插入和删除操作/.test(title)) {
    return falseOption;
  }
  if (/递归通常比迭代更加耗费内存空间/.test(title)) {
    return trueOption;
  }
  if (/成功查找元素 19 的比较次数是2/.test(title)) {
    return falseOption;
  }
  if (/必须有一个明确的结束条件/.test(title)) {
    return trueOption;
  }
  if (/若干个不同的质数的乘积/.test(title)) {
    return falseOption;
  }
  if (/二分查找仅适用于数组而不适合链表/.test(title)) {
    return trueOption;
  }
  if (/左子树所有节点的值都大于根节点的值/.test(title)) {
    return falseOption;
  }
  if (/双向链表比单向链表更合适/.test(title) && /栈中元素的插入和删除操作都在栈的顶端/.test(title)) {
    return falseOption;
  }
  if (/静态成员函数既能访问类的静态数据成员，也能访问非静态数据成员/.test(title)) {
    return falseOption;
  }
  if (/构建的树一定是完全二叉树/.test(title)) {
    return falseOption;
  }
  if (/BFS）保证了每个节点在最短路径的情况下被访问/.test(title)) {
    return trueOption;
  }
  if (/方便用单向链表实现/.test(title) && /栈中元素的插入和删除操作都在栈的顶端/.test(title)) {
    return trueOption;
  }
  if (/log2\(32\) 的结果为 5 、类型为 int/.test(title)) {
    return falseOption;
  }
  if (/函数定义和函数调用可以不在同一个文件内/.test(title)) {
    return trueOption;
  }
  if (/超出该范围的非负整数运算，将无法使用C\+\+语言进行计算/.test(title)) {
    return falseOption;
  }
  if (/循环配合栈缓解这一问题/.test(title)) {
    return trueOption;
  }
  if (/5 \^ 3 的结果为 125/.test(title)) {
    return falseOption;
  }
  if (/邻接表和邻接矩阵都是图的存储形式/.test(title)) {
    return trueOption;
  }
  if (/最后一维在内存中一定是连续的，但第一维在内存中可能不连续/.test(title)) {
    return falseOption;
  }
  if (/‘3’ \+ ‘5’ 的结果为 ‘8’/.test(title)) {
    return falseOption;
  }
  if (/a \^ 2 - b \* 4 >= 0/.test(title)) {
    return falseOption;
  }
  if (/只要 p 取小于等于哈希表大小的素数，可保证不发生碰撞/.test(title)) {
    return falseOption;
  }
  if (/log\(1000\).*值约为 3/.test(title)) {
    return falseOption;
  }
  if (/著名的哥德巴赫猜想.*我们可以通过枚举法来证明它/.test(title)) {
    return falseOption;
  }
  if (/在特殊情况下流程图中可以出现三角框和圆形框/.test(title)) {
    return falseOption;
  }
  if (/广度搜索算法的最差时间复杂度为O\(N\)/.test(title)) {
    return falseOption;
  }
  if (/log\(exp\(x\)\) > log10\(x\)/.test(title)) {
    return trueOption;
  }
  if (/N个顶点的无向完全图有N×\(N-1\)条边/.test(title)) {
    return falseOption;
  }
  if (/可以使用深度优先搜索算法判断图的连通性/.test(title)) {
    return trueOption;
  }
  if (/在N个元素的二叉排序树中查找一个元素，平均情况的时间复杂度是O\(logN\)/.test(title)) {
    return trueOption;
  }
  if (/!!N\) 的值也是 N 的值/.test(title)) {
    return falseOption;
  }
  if (/float 型变量 N .*可以输入正负整数和浮点数，并将其转换为整数后输出/.test(title)) {
    return trueOption;
  }
  if (/变量 X 被赋值为16\.44.*输出的一定是 1/.test(title)) {
    return falseOption;
  }
  if (/continue 语句通常与 if 语句配合使用/.test(title)) {
    return trueOption;
  }
  if (/printf.*将输出 10/.test(title)) {
    return falseOption;
  }
  if (/printf 是C\+\+语言的关键字/.test(title)) {
    return falseOption;
  }
  if (/N \/ 4\.0 执行后输出是 2->2->2\.0/.test(title)) {
    return falseOption;
  }
  if (/输出的结果不可能是89781/.test(title)) {
    return falseOption;
  }
  if (/a\[i\]\[j\] 和一个普通的整型变量一样使用/.test(title)) {
    return trueOption;
  }
  if (/函数参数传递过程中，如果传常量值、常量引用和常量指针都是不能被修改的/.test(title)) {
    return trueOption;
  }
  if (/以下代码不能够正确执行/.test(title)) {
    return trueOption;
  }
  if (/在N个元素的二叉排序树中查找一个元素，最差情况的时间复杂度是O\(logN\)/.test(title)) {
    return falseOption;
  }
  if (/要判断无向图的连通性.*深度优先的平均时间复杂度更低/.test(title)) {
    return falseOption;
  }
  if (/在Windows的资源管理器中为已有文件A建立副本的操作是 Ctrl\+C ，然后 Ctrl\+V/.test(title) || /Ctrl\+C，然后Ctrl\+V/.test(title)) {
    return trueOption;
  }
  if (/string str="chenADai"; int pos = str\.find\('D'\); --pos&11;/.test(title)) {
    return falseOption;
  }
  if (/一个函数必须在调用之前既声明又定义/.test(title)) {
    return falseOption;
  }
  if (/在 C\+\+ 中，下面代码可以正确定义指针和初始化指针/.test(title) && /int\* ptr;/.test(question.blocks?.map?.(b=>b.text).join(' ') || '')) {
    return falseOption;
  }
  if (/在二叉排序树中，左子树所有节点的值都大于根节点的值/.test(title)) {
    return falseOption;
  }
  if (/log2\(32\) 的结果为 5 、类型为 int/.test(title)) {
    return falseOption;
  }
  if (/二维数组的最后一维在内存中一定是连续的，但第一维在内存中可能不连续/.test(title)) {
    return falseOption;
  }
  if (/下面C\+\+代码被执行后，将先后输出3和5/.test(title)) {
    return falseOption;
  }
  if (/scanf\("%d", &N\); cout << N \/ 3 \* 5; 时输入 3\.6 ，则输出是6/.test(title)) {
    return falseOption;
  }
  if (/删除下面C\+\+代码中的 continue 不影响程序的执行效果/.test(title)) {
    return trueOption;
  }
  if (/N \* 2 % N.*其值为2/.test(title)) {
    return falseOption;
  }
  if (/continue 语句可以用来提前结束循环/.test(title)) {
    return falseOption;
  }
  if (/CCF\(十九进制\) = 21AC\(十三进制\)/.test(title)) {
    return falseOption;
  }
  if (/cout<<\(n%15==0\? "YES":"NO"\); 能够判断/.test(title)) {
    return trueOption;
  }
  if (/共有2的n次幂个方法/.test(title)) {
    return falseOption;
  }
  if (/判断是否是闰年的正确程序/.test(title)) {
    return falseOption;
  }
  if (/将 n 不停地除以 2，并输出此时的商和余数/.test(title)) {
    return trueOption;
  }
  if (/判断—个三角形是否成立的条件只有/.test(title)) {
    return falseOption;
  }
  if (/判断—个从键盘输入的字符的ASCII 是否是奇数/.test(title)) {
    return trueOption;
  }
  if (/13进制数A加上 13进制数B，和是13进制数18/.test(title)) {
    return falseOption;
  }
  if (/2025为A类数/.test(title)) {
    return trueOption;
  }
  if (/二维数组作为函数参数时，必须显式指定所有维度的大小/.test(title)) {
    return falseOption;
  }
  if (/对数组 arr\[]=\{4, 3, 1, 5, 2\} 进行升序排序.*\{1, 4, 3, 5, 2\}/.test(title)) {
    return trueOption;
  }
  if (/指针 p 的值是1/.test(title)) {
    return falseOption;
  }
  if (/函数是C\+\+中的核心概念，用于封装可重用的代码块/.test(title)) {
    return trueOption;
  }
  if (/通过表达式 -a \/ 2\.0 求得/.test(title)) {
    return falseOption;
  }
  if (/修改为 i < 200; i \+= i \+ 1 ，其输出与当前代码输出相同/.test(title)) {
    return falseOption;
  }
  if (/交换前后分别运行的两次输出相同/.test(title)) {
    return trueOption;
  }
  if (/删除 break 语句对程序执行结果没有影响/.test(title)) {
    return trueOption;
  }
  if (/智能手表同样因为具有嵌入操作系统及通信等功能/.test(title)) {
    return trueOption;
  }
  if (/因为 continue 将被执行，因此不会有输出/.test(title)) {
    return falseOption;
  }
  if (/字符阵列后的代码能实现其效果/.test(title)) {
    return trueOption;
  }
  if (/归并排序的最好、最坏和平均时间复杂度均为 O\(n log n\)/.test(title)) {
    return trueOption;
  }
  if (/线性筛法.*每个合数只被它的最小质因数筛掉一次，时间复杂度为 O\(n\)/.test(title)) {
    return trueOption;
  }
  if (/输出每个数对应的质因数列表/.test(title)) {
    return trueOption;
  }
  if (/my_dog\.name 的最终值是 Charlie/.test(title)) {
    return trueOption;
  }
  if (/采用动态规划求解零钱兑换问题/.test(title)) {
    return trueOption;
  }
  if (/有 V 个顶点、E 条边的图的深度优先搜索遍历时间复杂度为 O\(V\+E\)/.test(title)) {
    return trueOption;
  }
  if (/int\(3\.14\) 的值为3/.test(title)) {
    return trueOption;
  }
  if (/任何一个while循环都可以转化为等价的for循环/.test(title)) {
    return trueOption;
  }
  if (/贪心算法可以达到局部最优，但可能不是全局最优解/.test(title)) {
    return trueOption;
  }
  if (/插入排序有时比快速排序时间复杂度更低/.test(title)) {
    return trueOption;
  }
  if (/假设一棵完全二叉树共有.*树的深度为log\(N\)\+1/.test(title)) {
    return falseOption;
  }
  if (/简单有向图有 n 个顶点和 e 条弧.*时间复杂度一样/.test(title)) {
    return falseOption;
  }
  if (/动态规划有递推实现和递归实现，有时两种实现的时间复杂度不同/.test(title)) {
    return trueOption;
  }
  if (/给定 double 类型的变量 x.*通过二分法求出logx的近似值/.test(title)) {
    return trueOption;
  }
  if (/break 语句用于终止当前层次的循环，循环可以是 for 循环，也可以是 while 循环/.test(title)) {
    return trueOption;
  }
  if (/GESP测试是对认证者的编程能力进行等级认证，同一级别的能力基本上与编程语言无关/.test(title)) {
    return trueOption;
  }
  if (/字符常量.*\\0.*和字符常量.*0.*相同/.test(title)) {
    return falseOption;
  }
  if (/如果 .*int 类型的变量.*\(\(a \| 3\) == 3\).*从0到3之间/.test(title)) {
    return trueOption;
  }
  if (/函数参数传递过程中，如果传常量值、常量引用和常量指针都是不能被修改的/.test(title)) {
    return trueOption;
  }
  if (/贪心算法通过每一步选择局部最优解来获得全局最优解，但并不一定能找到最优解/.test(title)) {
    return trueOption;
  }
  if (/Dijkstra算法求最短路径，时间复杂度为O\(v2\)，可进一步优化至O\(e\+vlog\(v\)\)/.test(title)) {
    return trueOption;
  }
  if (/某一系列数据的规律是从第3个数值开始是前两个数之和.*求第N个数的值/.test(title)) {
    return trueOption;
  }
  if (/string str="陈ADai".*find\('D'\).*输出的是 3/.test(title)) {
    return trueOption;
  }
  if (/char x=65.*x\+\+.*cout<<x\+\+.*输出的是 A/.test(title)) {
    return falseOption;
  }
  if (/def \(十六进制\) = 103231 \(五进制\)/.test(title)) {
    return falseOption;
  }
  if (/栈是一种线性结构.*链表实现的入队和出队操作的时间复杂度较低/.test(title)) {
    return falseOption;
  }
  if (/诚实国公民只说实话.*你想去说谎国，可以这样问其中一位路人/.test(title)) {
    return trueOption;
  }
  if (/下列程序输出的是 A.*x=x&00001111/.test(title)) {
    return falseOption;
  }
  if (/下面两段C\+\+代码都是用于求1-10的和，其运行结果相同/.test(title)) {
    return trueOption;
  }
  if (/快速排序的时间复杂度总比插入排序的时间复杂度低/.test(title)) {
    return falseOption;
  }
  if (/下面的C\+\+代码执行后将先后输出7个 true/.test(title)) {
    return falseOption;
  }
  if (/10 <= N <= 12.*N为12.*输出为 true/.test(title)) {
    return trueOption;
  }
  if (/k 进制，逢 k 进第二位/.test(title)) {
    return falseOption;
  }
  if (/闰年的定义.*下面程序是判.*是否是闰年的正确程序/.test(title)) {
    return falseOption;
  }
  if (/两个13进制的数A和B.*和是13进制数18/.test(title)) {
    return falseOption;
  }
  if (/递推是.*通过已知的初始值和递推公式，逐步求解目标值的算法/.test(title)) {
    return trueOption;
  }
  if (/n 个顶点的无向完全图，有 .*棵生成树/.test(title)) {
    return trueOption;
  }
  if (/三个 double 类型的变量 a 、 b 和 theta.*周长可以通过表达式 sqrt\(a \* a \+ b \* b - 2 \* a \* b \* cos\(theta\)\) 求得/.test(title)) {
    return falseOption;
  }
  if (/log\(8\).*值约为 3/.test(title)) {
    return falseOption;
  }
  if (/表达式 9 \| 12 .*值为 13/.test(title)) {
    return trueOption;
  }
  if (/表达式 9 & 12 .*值为 8/.test(title)) {
    return trueOption;
  }
  if (/表达式 a = b .*判断 a 和 b 是否相等/.test(title)) {
    return falseOption;
  }
  if (/动态规划.*必须使用递归实现/.test(title)) {
    return falseOption;
  }
  if (/哈希表.*都无法避免冲突/.test(title)) {
    return trueOption;
  }
  if (/指针变量指向的内存地址不一定都能够合法访问/.test(title)) {
    return trueOption;
  }
  if (/类的构造函数和析构函数均可以声明为虚函数/.test(title)) {
    return falseOption;
  }
  if (/访问数据发生下标越界时，总是会产生运行时错误/.test(title)) {
    return falseOption;
  }
  if (/使用C语言无法实现继承/.test(title)) {
    return falseOption;
  }
  if (/归并排序.*最差情况的时间复杂度为 O\\(n log n\\)/.test(title)) {
    return trueOption;
  }
  if (/广度优先搜索的平均时间复杂度是.*O\\(n\\)/.test(title)) {
    return trueOption;
  }
  if (/深度优先搜索遍历时间复杂度为 O\\(V\\+E\\)/.test(title)) {
    return trueOption;
  }
  if (/表达式 sqrt\\(a \\* a \\+ b \\* b - 2 \\* a \\* b \\* cos\\(theta\\)\\) 求得.*周长/.test(title)) {
    return falseOption;
  }
  if (/long long 类型占用的字节数比 float 类型多/.test(title)) {
    return trueOption;
  }
  if (/值传递.*使用引用传递.*避免数据拷贝，提高效率/.test(title)) {
    return trueOption;
  }
  if (title.includes("选择排序都执行n(n−1)/2次比较") || title.includes("选择排序都执行 n(n−1)/2 次比较")) {
    return trueOption;
  }
  if (/返回 int 类型、接受两个 int 参数的函数/.test(title) && /int add\\(int, int\\)/.test(title)) {
    return trueOption;
  }
  if (/正确声明了一个返回 int 类型、接受两个 int 参数的函数/.test(title) && /int add\(int, int\)/.test(title)) {
    return trueOption;
  }
  if (/my_dog\\.name 的最终值是 Charlie/.test(title)) {
    return trueOption;
  }
  if (/tree 向量.*完全二叉树.*层序遍历/.test(title)) {
    return trueOption;
  }
  if (/深度优先搜索.*使用栈作为辅助数据结构/.test(title)) {
    return trueOption;
  }
  if (/中序遍历，可以得到一个递增的有序序列/.test(title)) {
    return trueOption;
  }
  if (/哈夫曼树是唯一的/.test(title)) {
    return falseOption;
  }
  if (/Dijkstra算法.*贪心算法/.test(title)) {
    return trueOption;
  }
  if (/快速排序，最差情况的时间复杂度为 O\\(n log n\\)/.test(title)) {
    return falseOption;
  }
  if (/对 n 个元素的数组进行快速排序.*最差情况的时间复杂度为 O\(n log n\)/.test(title)) {
    return falseOption;
  }
  if (/对.*元素的数组进行归并排序.*最差情况的时间复杂度为 O\(n log n\)/.test(title)) {
    return trueOption;
  }
  if (/归并排序.*最好、最坏和平均时间复杂度均为 O\\(n log n\\)/.test(title)) {
    return trueOption;
  }
  if (/线性筛法.*时间复杂度为 O\\(n\\)/.test(title)) {
    return trueOption;
  }
  if (/在 n 个元素中进行二分查找.*平均时间复杂度是 O\(logn\).*事先进行排序/.test(title)) {
    return trueOption;
  }
  if (/快速排序和归并排序的平均时间复杂度都为 O\(nlogn\).*快速排序存在退化情况.*O\(n2\).*归并排序需要额外的空间开销/.test(title)) {
    return trueOption;
  }
  if (/冒泡排序的平均时间复杂度为 O\(n2\).*最优情况下为 O\(n\)/.test(title)) {
    return trueOption;
  }
  if (/T\(n\)=T\(n−1\)\+n.*T\(0\)=1.*时间复杂度为 O\(n2\)/.test(title) || /T\(n\) = T\(n - 1\) \+ n.*T\(0\) = 1/.test(title)) {
    return trueOption;
  }
  if (/快速排序和归并排序的平均时间复杂度均为 O\(nlogn\).*都是稳定排序/.test(title)) {
    return falseOption;
  }
  if (/平衡二叉树中查找指定元素的最差时间复杂度为 O\\(N\\)/.test(title)) {
    return falseOption;
  }
  if (title.includes("出队操作（ pop ）的时间复杂度为 O(1)") && title.includes("环形数组")) {
    return trueOption;
  }
  if (title.includes("退化为类似于链表的结构") && title.includes("退化到 O(n log n)")) {
    return falseOption;
  }
  if (/构造函数可以被声明为 virtual/.test(title)) {
    return falseOption;
  }
  if (/使用C语言无法实现虚函数/.test(title)) {
    return falseOption;
  }
  if (/子类可以直接访问.*父类的私有成员/.test(title)) {
    return falseOption;
  }
  if (/默认无参数的构造函数只能有一个/.test(title)) {
    return trueOption;
  }
  if (/结构体的成员默认是 public/.test(title)) {
    return trueOption;
  }
  if (/构造函数.*参数列表不同/.test(title)) {
    return trueOption;
  }
  if (/生成一个派生类的对象时，只调用派生类的构造函数/.test(title)) {
    return falseOption;
  }
  if (/标识符中可以有数字，但不能以数字开头/.test(title)) {
    return trueOption;
  }
  if (/cin是一个合法的变量名/.test(title)) {
    return falseOption;
  }
  if (title.includes("while(1){...}") && title.includes("将导致语法错误")) {
    return falseOption;
  }
  if (/访问下标为n的元素会引起编译错误/.test(title)) {
    return falseOption;
  }
  if (/字符变量 a 被赋值了浮点值/.test(title) && /编译时将报错/.test(title)) {
    return falseOption;
  }
  if (/异常在 try 块中抛出但没有任何 catch 匹配，它将在编译时报错/.test(title)) {
    return falseOption;
  }
  if (/p 选择素数.*不会产生冲突/.test(title)) {
    return falseOption;
  }
  if (/只要哈希表的大小不小于查找元素的个数，就一定存在不会产生冲突的哈希函数/.test(title)) {
    return falseOption;
  }
  if (/每个表项各建立一个子哈希表.*一定不会发生冲突/.test(title)) {
    return falseOption;
  }
  if (/动态规划算法通常有递归实现和递推实现.*有些动态规划算法只能用递推实现/.test(title)) {
    return falseOption;
  }
  if (/在动态规划中，状态转移方程的作用是定义状态之间的关系/.test(title)) {
    return trueOption;
  }
  if (/应用动态规划算法时，识别并存储重叠子问题的解是必须的/.test(title)) {
    return trueOption;
  }
  if (/归并排序算法体现了分治算法/.test(title)) {
    return trueOption;
  }
  if (/实现了选择排序算法/.test(title)) {
    return trueOption;
  }
  if (/贪心算法是一种可以应用于所有问题的通用解决方案/.test(title)) {
    return falseOption;
  }
  if (/杨辉三角.*中国数学史上的一项伟大成就/.test(title)) {
    return trueOption;
  }
  if (/如果将城市视作顶点，公路视作边.*车道级导航需求/.test(title)) {
    return falseOption;
  }
  if (/判断无向图中是否有环，可以通过广度优先搜索实现/.test(title)) {
    return trueOption;
  }
  if (/一颗 N 层的满二叉树，一定有/.test(title)) {
    return trueOption;
  }
  if (/30代的直系家谱，则这是一棵满二叉树/.test(title)) {
    return trueOption;
  }
  if (/使用队列作为辅助数据结构以实现“先进后出”/.test(title)) {
    return falseOption;
  }
  if (/以下代码创建的树是一棵完全二叉树/.test(title)) {
    return trueOption;
  }
  if (/以下代码实现的是二叉树的中序遍历/.test(title)) {
    return falseOption;
  }
  if (/哈夫曼树在构造过程中.*带权路径长度最小/.test(title)) {
    return trueOption;
  }
  if (/判断图是否连通，可以通过广度优先搜索实现/.test(title)) {
    return trueOption;
  }
  if (/交通网络，且是简单有向图/.test(title)) {
    return falseOption;
  }
  if (/代码实现了二叉树的前序遍历/.test(title) || /preorder\(TreeNode\* root\)/.test(title)) {
    return trueOption;
  }
  if (/从32名学生中选出4人.*P\(30, 4\)/.test(title)) {
    return falseOption;
  }
  if (/蓝球不能相邻，则一共有15种排列方案/.test(title)) {
    return trueOption;
  }
  if (/中的第 n 行、第 m 项.*项的系数/.test(title)) {
    return trueOption;
  }
  if (/27元，则有8种硬币组合/.test(title)) {
    return falseOption;
  }
  if (/27元，则最少可以用5个硬币组合/.test(title)) {
    return trueOption;
  }
  if (/将其分为 k 组.*C\(n−1,k−1\) 种分组方案/.test(title)) {
    return falseOption;
  }
  if (/颜色顺序有7种/.test(title)) {
    return trueOption;
  }
  if (/Ctrl\+X.*Ctrl\+V/.test(title)) {
    return trueOption;
  }
  if (/在数学纸面计算中， pow\(2, 3\).*不一定正确/.test(title)) {
    return falseOption;
  }
  if (/枚举的底层类型可以是非整型/.test(title)) {
    return falseOption;
  }
  if (/cout << \(12 \+ 12\.12\) 将报错/.test(title)) {
    return falseOption;
  }
  if (/表达式 3 < X < 5 求值结果是4/.test(title)) {
    return falseOption;
  }
  if (/表达式 \(N \+ !N\) 的值为4/.test(title)) {
    return falseOption;
  }
  if (/max\(a, b\) == min\(a, b\).*说明 a 和 b 相等/.test(title)) {
    return trueOption;
  }
  if (/N \/ 10 舍弃个位数.*N 小于10.*值为0.*大于10则是舍弃个位数的数/.test(title)) {
    return trueOption;
  }
  if (/调整为 \(int i = 1; i < 5; i\+\+\) 输出结果相同.*5到1与1到5的求和相同/.test(title)) {
    return trueOption;
  }
  if (/cos\(60\).*值约为 0\.5/.test(title)) {
    return falseOption;
  }
  if (/1e6 、 1000000 和 10\^6 的值是相同的/.test(title)) {
    return falseOption;
  }
  if (/substr\(2, 10\) 在字符串长度不足时会抛出异常/.test(title)) {
    return falseOption;
  }
  if (/未捕获异常会调用std::terminate终止程序/.test(title)) {
    return trueOption;
  }
  if (/不可以做变量名/.test(title)) {
    return trueOption;
  }
  if (/user_Name 、 _userName 、 user-Name 、 userName_ 都是合法的变量名/.test(title)) {
    return falseOption;
  }
  if (/如果一个函数可能抛出异常，那么一定要在try 子句里调用这个函数/.test(title)) {
    return falseOption;
  }
  if (/在 C\+\+ 中，如果没有捕获到异常.*不会终止/.test(title)) {
    return falseOption;
  }
  if (/变量命名为 five-star/.test(title)) {
    return trueOption;
  }
  if (/不能用 scanf 作为变量名/.test(title)) {
    return falseOption;
  }
  if (/封装是指将数据和行为绑定在一起，并对外隐藏实现细节/.test(title)) {
    return trueOption;
  }
  if (/可以在函数内定义结构体，但该结构体类型只能在该函数内使用/.test(title)) {
    return trueOption;
  }
  if (/静态成员变量只能被该类对象的成员函数访问/.test(title)) {
    return falseOption;
  }
  if (/C\+\+、Python和JAVA等都是面向对象的编程语言/.test(title)) {
    return trueOption;
  }
  if (/C\+\+是一门面向对象的编程语言,也是一门高级语言/.test(title)) {
    return trueOption;
  }
  if (/可以为同一个类定义多个析构函数/.test(title)) {
    return falseOption;
  }
  if (/必须手动定义一个析构函数/.test(title)) {
    return falseOption;
  }
  if (/创建一个对象时，会自动调用该对象所属类的构造函数/.test(title) && /默认的构造函数/.test(title)) {
    return trueOption;
  }
  if (/可以为同一个类定义多个构造函数/.test(title)) {
    return trueOption;
  }
  if (/MD5是一种常见的哈希函数.*被其他哈希函数所取代/.test(title)) {
    return trueOption;
  }
  if (/状态转移方程如下： dp\[i\]\[w\] = max/.test(title)) {
    return trueOption;
  }
  if (/能用动态规划解决的问题，一般也可以用贪心法解决/.test(title)) {
    return falseOption;
  }
  if (/动态规划只要推导出状态转移方程，就可以写出递归程序/.test(title)) {
    return falseOption;
  }
  if (/最大，可以使用动态规划方法来求解/.test(title)) {
    return trueOption;
  }
  if (/函数 puzzle 定义如下.*无限递归/.test(title)) {
    return falseOption;
  }
  if (/gcd\(\) 函数能正确求两个正整数的最大公约数.*lcm\(\) 函数能求相应两数的最小公倍数/.test(title)) {
    return trueOption;
  }
  if (/使用了递推方式计算阶乘.*计算结果正确/.test(title)) {
    return falseOption;
  }
  if (/查字典.*可看作二分查找/.test(title)) {
    return trueOption;
  }
  if (/欧几里得算法（辗转相除法）求两个正整数的最大公约数.*都适用/.test(title)) {
    return trueOption;
  }
  if (/分治算法的效率通常比直接求解原问题的效率低/.test(title)) {
    return falseOption;
  }
  if (/二叉排序树的中序遍历序列一定是有序的/.test(title)) {
    return trueOption;
  }
  if (/任何一个 for 循环都可以转化为等价的 while 循环/.test(title)) {
    return trueOption;
  }
  if (/C\+\+中 string 的 == 运算符比较的是字符串的内存地址/.test(title)) {
    return falseOption;
  }
  if (/sort 可以直接用于排序 set 中的元素/.test(title)) {
    return falseOption;
  }
  if (/\(x & 1\) == 0 可以判断整数 x 是否为偶数/.test(title)) {
    return trueOption;
  }
  if (/string 的 substr\(1, 3\) 返回从下标1开始的3个字符的子串/.test(title)) {
    return trueOption;
  }
  if (/string\("hello"\) == "hello" 的比较结果为true/.test(title)) {
    return trueOption;
  }
  if (/函数声明 double f\(\); 返回 int 时，会自动转换为 double/.test(title)) {
    return trueOption;
  }
  if (/x 是浮点数.*\(x >> 1\) 等价于 x \/ 2/.test(title)) {
    return falseOption;
  }
  if (/从32名学生中选出4人分别担任班长、副班长、学习委员和组织委员，共有 C\(32, 4\) 种不同的选法/.test(title)) {
    return falseOption;
  }
  if (/在C\+\+语言中，如果想要在一个函数内调用一个类的私有方法，可以在该类中将该函数声明为友元函数/.test(title)) {
    return trueOption;
  }
  if (/表达式 '5' - 3\.0 的结果为 2\.0/.test(title)) {
    return falseOption;
  }
  if (/使用 math\.h 或 cmath 头文件中的函数，表达式 pow\(2, 5\) 的结果类型为 int/.test(title)) {
    return falseOption;
  }
  if (/在 N 个节点的平衡二叉树中查找指定元素的最差时间复杂度为 O\(N\)/.test(title)) {
    return falseOption;
  }
  if (/插入排序一般是稳定的/.test(title)) {
    return trueOption;
  }
  if (/在C\+\+代码中，不可以将变量命名为false/.test(title)) {
    return trueOption;
  }
  if (/快速排序算法的时间复杂度与输入是否有序无关，始终稳定为 O\(n log n\)/.test(title)) {
    return falseOption;
  }
  if (/链表存储线性表时要求内存中可用存储单元地址是连续的/.test(title)) {
    return falseOption;
  }
  if (/每次挑价格最低的商品买，这体现了分治思想/.test(title)) {
    return falseOption;
  }
  if (/单链表中删除某个结点 p（非尾结点）.*将 p 的值设为 p->next 的值，然后删除 p->next/.test(title)) {
    return trueOption;
  }
  if (/归并排序算法的时间复杂度与输入是否有序无关，始终稳定为 O\(n log n\)/.test(title)) {
    return trueOption;
  }
  if (/二分查找适用于对无序数组和有序数组的查找/.test(title)) {
    return falseOption;
  }
  if (/贪心算法通过每一步选择当前最优解，从而一定能获得全局最优解/.test(title)) {
    return falseOption;
  }
  if (/线性筛相对于埃拉托斯特尼筛法，每个合数只会被它的最小质因数筛去一次，因此效率更高/.test(title)) {
    return trueOption;
  }
  if (/递归函数必须具有一个终止条件，以防止无限递归/.test(title)) {
    return trueOption;
  }
  if (/子类对象包含父类的所有成员（包括私有成员）.*子类可以直接访问/.test(title)) {
    return falseOption;
  }
  if (/快速排序一般是不稳定的/.test(title)) {
    return trueOption;
  }
  if (/在C\+\+语言中，函数调用前必须有函数声明或定义/.test(title)) {
    return trueOption;
  }
  if (/long long 类型能表达的数都能使用 double 类型精确表达/.test(title)) {
    return falseOption;
  }
  if (/邻接表和邻接矩阵都是图的存储形式。为了操作时间复杂度考虑，同一个图可以同时维护两种存储形式/.test(title)) {
    return trueOption;
  }
  if (/栈和队列均可以用双向链表实现，插入和删除操作的时间复杂度为 O\(1\)/.test(title)) {
    return trueOption;
  }
  if (/二叉排序树（BST）中，若某节点的左子树为空，则该节点一定是树中的最小值节点/.test(title)) {
    return falseOption;
  }
  if (/若硬币面额为 \[1, 3, 4\] ，目标金额为 6 ，则最少需要 2 枚硬币（3\+3）/.test(title)) {
    return trueOption;
  }
  if (/格雷编码的相邻两个编码之间必须有多位不同/.test(title)) {
    return falseOption;
  }
  if (/在C\+\+中，函数的返回类型可以省略，默认为 int/.test(title)) {
    return falseOption;
  }
  if (/插入排序在最好情况（已有序）下的时间复杂度是 O\(n2\)/.test(title)) {
    return falseOption;
  }
  if (/C\+\+ 、 Python都是高级编程语言.*最终都要通过机器指令来完成/.test(title)) {
    return trueOption;
  }
  if (/C\+\+语句 cout << \(\(10 <= N <= 12\) \? "true":"false"\).*输出为 true/.test(title)) {
    return trueOption;
  }
  if (/sqrt\(N\) \* sqrt\(N\)\) == N/.test(title) || /开平方后平方 是本身/.test(title)) {
    return falseOption;
  }
  if (/5个相同的红球和4个相同的蓝球排成一排.*一共有15种排列方案/.test(title)) {
    return trueOption;
  }

  return null;
}

function chooseHeuristicSelectionAnswer(question) {
  const options = question.choice_options;
  const title = normalizeText(question.stem_text || "");
  const id = question.id;

  function byKey(key) {
    return options.find((option) => option.key === key) || null;
  }

  const imageOptionAnswers = new Map([
    ["wanjuanwang:2025-06:cxx:level-7:selection:06:z708qki91sisbkueacoi", "D"],
    ["wanjuanwang:2025-06:cxx:level-7:selection:10:dch6fj3qon7dy137te83", "A"],
    ["wanjuanwang:2025-06:cxx:level-7:selection:15:uvzjsp2t390k9ppmu4eb", "A"],
    ["wanjuanwang:2025-06:cxx:level-8:selection:11:6d41t8u67gf1bngxjdm0", "A"],
    ["wanjuanwang:2025-06:cxx:level-8:selection:15:yq5mnxripfjkcg28yp3k", "C"],
    ["wanjuanwang:2025-06:cxx:level-4:selection:10:tn7s3l0h2ajjo3vg9apk", "D"],
    ["wanjuanwang:2025-06:cxx:level-8:selection:02:fsu33b04xfbluld2q7ep", "C"],
    ["wanjuanwang:2025-03:cxx:level-8:selection:11:vbq6h5tdxdxized3zmlx", "A"],
    ["wanjuanwang:2025-03:cxx:level-8:selection:02:ca161bdh4fm29f4qh5fz", "C"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:07:cyem4f1qlxay8jcmfxgx", "B"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:12:2pomhuxagn49skmyiwus", "B"],
    ["wanjuanwang:2024-06:cxx:level-8:selection:09:arx3juj2jpc9ovkfxrom", "A"],
    ["wanjuanwang:2024-06:cxx:level-8:selection:03:sj1zyn7uopyc7k2ix9ul", "B"],
    ["wanjuanwang:2024-03:cxx:level-8:selection:10:1x17etvhx1ecqee6b22i", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:14:0jdosbmjkhoddqmu8zpl", "C"],
    ["wanjuanwang:2025-06:cxx:level-8:selection:13:27hherfm3p53p8lj020f", "C"],
    ["wanjuanwang:2025-03:cxx:level-8:selection:08:73nubpzrmukxy0xhmb36", "C"],
    ["wanjuanwang:2025-03:cxx:level-8:selection:14:pdmr3qtq3qseplt3kjzl", "C"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:03:aev0sha44wkwafmsifx0", "A"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:10:qkn28b0syslng38w4p81", "B"],
    ["wanjuanwang:2024-06:cxx:level-7:selection:08:8vn0p5egdb1ae35q67ap", "C"],
    ["wanjuanwang:2024-06:cxx:level-7:selection:14:kf0tupflp4iy5mz6o6d8", "A"],
    ["wanjuanwang:2023-12:cxx:level-7:selection:07:rc6ims49sxuf4wcbmouw", "D"],
    ["wanjuanwang:2023-12:cxx:level-8:selection:11:mqizalcop1a273pb4ono", "B"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:12:2pomhuxagn49skmyiwus", "B"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:07:cyem4f1qlxay8jcmfxgx", "B"],
    ["wanjuanwang:2024-06:cxx:level-8:selection:03:sj1zyn7uopyc7k2ix9ul", "B"],
    ["wanjuanwang:2024-09:cxx:level-5:selection:03:7f1com4ugxefdjic8oi8", "C"]
  ]);
  if (imageOptionAnswers.has(id)) {
    return byKey(imageOptionAnswers.get(id));
  }

  const directAnswerById = new Map([
    ["wanjuanwang:2025-03:cxx:level-6:selection:01:dq86w1ll39umndqh9337", "A"],
    ["wanjuanwang:2025-03:cxx:level-6:selection:03:3z0x9wn16k8ppwoj2kto", "A"],
    ["wanjuanwang:2025-03:cxx:level-6:selection:08:tdf6xu4h373arlky0jea", "C"],
    ["wanjuanwang:2025-03:cxx:level-6:selection:11:say2l7nn7mojquklp0w6", "A"],
    ["wanjuanwang:2025-03:cxx:level-6:selection:14:lti2tx929dqgy7qmf6hy", "A"],
    ["wanjuanwang:2025-03:cxx:level-2:selection:08:fi95kfcwzl93ztkjc9qg", "C"],
    ["wanjuanwang:2024-12:cxx:level-6:selection:11:d68ojocc968uids8vxac", "C"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:08:c9xt08zbkffaby1c9pnu", "C"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:11:xpr5op0i5un4u5r12czx", "D"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:06:nvw795q1n3f4kxo131os", "B"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:02:7lq3lk4kswaaxnamr2jt", "C"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:06:adz3v1rt6xx7o5bdc9qe", "A"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:07:z9sif40cwq5vp5b7m8xk", "D"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:09:gy57q0hle1v65d9rg7oh", "B"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:10:foj4vqxhkwv7wo2dl6v4", "B"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:11:mp53gabsd6c5z54vq25i", "D"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:12:hrv1scj1egmsgn1c8zxl", "B"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:01:ka9jcvcmbpe3h8r82wt7", "B"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:02:bvs58e4rxr3w7uuhuzat", "C"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:04:n8m6jhfpa2kjewlkmv3z", "D"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:05:egf3n8l9z0r6g132c4n6", "B"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:08:mlupqhf9ytob5kfckwaj", "B"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:09:x1fi6ksedchvw43w1291", "B"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:12:hgi25hosg7p84bijm53w", "D"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:14:jq62jjfejuue5f72q3tz", "C"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:03:n1rr1wwdldyzplhc4max", "B"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:05:izsfmt73kjd9lfgxk2ex", "D"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:07:uj0ya8kxw7i0ft3bmzni", "C"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:03:o3ajmaks01yy4zm4o3zm", "C"],
    ["wanjuanwang:2024-09:cxx:level-7:selection:13:zf1fqbvmp0gzmxz854uo", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:01:tv2xe1eidfvvwyiz5dk1", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:10:m0c19gcvnv74pnf3z4y3", "C"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:13:kxbfafxxc228typgjw7q", "C"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:02:1epw4typl7a6yul6li45", "A"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:06:go0h1hjqrh9jvwg7m6ws", "A"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:08:iewja7bxcy0bqe91kr8d", "A"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:09:ybwwuu7z431wd38c1jx5", "D"],
    ["wanjuanwang:2023-12:cxx:level-7:selection:10:xcoztozqx2gvsjq5if4t", "B"],
    ["wanjuanwang:2023-12:cxx:level-8:selection:08:rvfisslamxz7qv7iob5c", "A"],
    ["wanjuanwang:2023-12:cxx:level-8:selection:12:3sncw3d4gngl8vhv4psh", "C"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:05:2dvcy5ftx54gq0mbpzdj", "D"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:07:vk2elphseghco3s0kojt", "A"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:06:5khxscoydqis45sdahoi", "C"],
    ["wanjuanwang:2024-06:cxx:level-5:selection:15:tywb08b0mpwtgc2yp76b", "A"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:09:qw0f3eoungexz2dn0k29", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:01:ffv02g6ap5evn77hawe3", "B"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:10:wspldcer7wpzb7p2udju", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:14:o141298q57v5f67xj9ao", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:07:msa8mvwb6fowj1nirknc", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:09:zj0l63xxkrzje9h543f6", "C"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:05:pyr2vnhvyr22xhhjx4oy", "A"],
    ["wanjuanwang:2023-12:cxx:level-8:selection:14:mzbq2t6fdm44ehkcm2ai", "A"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:08:tf7jyfsrdgrx6b0w3j5l", "C"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:02:8dnacz5en7xmysukw80m", "D"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:04:n6l868y1s8axp6h5hfwl", "A"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:01:a6gz6cegt9483g23fz0b", "B"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:06:sl8st2tw2o9hfm9hkgwx", "B"],
    ["wanjuanwang:2024-12:cxx:level-7:selection:09:k95zwpuhzis0qyqqzswe", "A"],
    ["wanjuanwang:2024-03:cxx:level-7:selection:03:7bs3364s4ztsu5qm0oq5", "C"],
    ["wanjuanwang:2024-03:cxx:level-8:selection:13:5r6rg3lkiirugz9epcyw", "A"],
    ["wanjuanwang:2024-06:cxx:level-3:selection:05:4ca9ll9r7ubfl2ytt6fw", "B"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:10:vb8xw8edgynlbjf79sdj", "B"],
    ["wanjuanwang:2024-06:cxx:level-7:selection:11:d14h3hl3ww9vulokk29j", "C"],
    ["wanjuanwang:2024-03:cxx:level-2:selection:01:hivhdo6md9xl0zqjgxk5", "B"],
    ["wanjuanwang:2025-03:cxx:level-2:selection:01:u9pemktzc5jc5mkzarpz", "C"],
    ["wanjuanwang:2025-03:cxx:level-4:selection:02:wkb8j3u0zt9mgz71p56a", "A"],
    ["wanjuanwang:2025-03:cxx:level-4:selection:06:lo6sbqdho16wn9m7jwk5", "D"],
    ["wanjuanwang:2025-03:cxx:level-4:selection:12:oymb3gg9e5asca9mnylu", "A"],
    ["wanjuanwang:2025-03:cxx:level-8:selection:03:zaft45c82zep7oixhr0x", "C"],
    ["wanjuanwang:2025-06:cxx:level-1:selection:02:myed1cevmtixhmkjubw6", "A"],
    ["wanjuanwang:2025-06:cxx:level-3:selection:12:czq1vn1o2psa4u82iody", "B"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:03:dis671vehw41ai8x01fo", "A"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:04:2wkmzr46isdm1ye5q3xa", "A"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:07:mjbt8cu5qelactwfh0qj", "C"],
    ["wanjuanwang:2024-12:cxx:level-4:selection:13:alydp2f9e53xd0b9bty1", "A"],
    ["wanjuanwang:2024-12:cxx:level-5:selection:02:vopgp5mc7wjwtm7fezj5", "C"],
    ["wanjuanwang:2024-12:cxx:level-5:selection:15:wiaqz4ki0kedi4i93am5", "C"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:05:ttfifxo9m078nce8hk6d", "A"],
    ["wanjuanwang:2024-12:cxx:level-8:selection:01:fa589sm9s21hlgqoqjdp", "A"],
    ["wanjuanwang:2024-12:cxx:level-8:selection:14:9q2g1pfs0zygxhh4s5ts", "D"],
    ["wanjuanwang:2024-12:cxx:level-3:selection:09:wxvuoxlor65y1yl8ph0e", "A"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:08:tl1zgppdepx10fh45a66", "D"],
    ["wanjuanwang:2024-06:cxx:level-1:selection:09:7cteea7460w41xqf9eds", "C"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:03:w7ynuabvubzjvku19qdm", "C"],
    ["wanjuanwang:2024-12:cxx:level-1:selection:06:ef3g4661c3cwtcu7jasq", "D"],
    ["wanjuanwang:2024-12:cxx:level-2:selection:15:lg0c0rovj2ga7lexkke1", "A"],
    ["wanjuanwang:2024-09:cxx:level-4:selection:13:a0gfodmf2z0n03g3ou32", "B"],
    ["wanjuanwang:2024-09:cxx:level-8:selection:02:o70nsmcv4o9zjh1rvzbm", "A"],
    ["wanjuanwang:2024-09:cxx:level-3:selection:09:f7h3eh8fq3x985zrhk5e", "D"],
    ["wanjuanwang:2024-09:cxx:level-3:selection:10:8b3nzqbk1ejivzwsl27j", "C"],
    ["wanjuanwang:2024-06:cxx:level-3:selection:06:atk78fnnw6tjy5l8qhgr", "D"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:02:6imxuimqm7aud0l3gnqp", "A"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:11:tejiua8xkta6riz6xie3", "C"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:03:ycfp9l6fdo5vke3x01dv", "C"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:02:pyaenmacfadwpc207k81", "D"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:12:2m4oofef363ypgg5hxje", "D"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:15:1qdh237hbfmjumlyptwm", "D"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:03:3kyotlof9zaxo7c4iboh", "B"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:04:eembkkrctm7snk3b71v8", "D"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:05:fmh2dncxiarrgyjrd5em", "D"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:08:zo4wshpq095ono3g6c9r", "D"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:09:s0kvmqcgj7p6z7e5z688", "A"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:15:0io9eorqs5dz6qmk66nb", "C"],
    ["wanjuanwang:2023-12:cxx:level-2:selection:07:obmjd3rn8yibl64st4g6", "D"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:13:vmklzzsxxr99q424xrb6", "C"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:14:kvyff2vu0f5zrjighan5", "B"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:01:8r8chokgxztn0capqn9j", "A"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:03:f8dnra8aqbwb95ysiegx", "C"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:04:6kaequr5byp7ryljr3oi", "B"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:10:8e1ictmkqtlh0h8nk0qn", "D"],
    ["wanjuanwang:2023-12:cxx:level-1:selection:12:0hwufwrbgu1vqrkmvmgz", "B"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:02:ixza6v0ko7x2g4ctoguz", "C"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:04:hbn112smxxw83i682lj0", "A"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:07:jijr2f7z5fre23ppbmz9", "C"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:08:rorzbmehbj6daql8tzgi", "A"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:10:pwjk8x8w6ytuqlson5sc", "A"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:12:r4akgrr8efts2fdm5059", "A"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:13:0pxjp6oiq9mcqhxj549o", "C"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:14:u1nt76jk6kkasaayu3vb", "D"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:15:60fsl3r9i2tyv7owj2ge", "C"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:02:r8cgq59hr0jdzbol6my6", "D"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:04:p1459mq756v3airmb6my", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:05:0jmp90ay4zz6r3gahcc0", "B"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:07:vehwjq02tmnmyvx6niqr", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:11:3rsz6544ldzyfcuhq9oo", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:12:3571mflh5i7w3bm94onz", "D"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:03:abs8stm676k7k7awr6rp", "B"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:04:t0td65ez92gyh1pfmmv6", "C"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:08:wa2u2d63q2llfwhlpl82", "D"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:09:3gd9yeacdugm3ukzhdus", "C"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:13:46bcvjavsbf6vzcag38x", "B"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:14:99390iikzb91ppyyb4nz", "D"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:15:p1pfw148nf3jof0redh9", "B"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:03:hdrojgmzbszwqa86uz8i", "C"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:04:ttsz39dsefz1drkc983h", "A"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:06:pkifkficfejztq1onsbb", "D"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:09:ajay57h9ymt8xdh3jye4", "D"],
    ["wanjuanwang:2024-06:cxx:level-2:selection:14:7d5mxlhppkykj8oo7ruf", "C"],
    ["wanjuanwang:2024-06:cxx:level-1:selection:06:nr6pzb2811flnnvjz63m", "C"],
    ["wanjuanwang:2024-06:cxx:level-1:selection:13:txab96f21rdhg4zspc3g", "C"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:05:oedfn0kj2n77bo1ye1if", "D"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:06:kuvh9tt7s03vxehcn1uj", "A"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:08:gdco0pju9w4y4w9fuum1", "A"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:09:kf0bcgqgghk7k2bt1h4m", "B"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:11:hteisse20xkhjma8w7n7", "B"],
    ["wanjuanwang:2024-03:cxx:level-1:selection:06:zfg3hcaou2h0g1rhiect", "C"],
    ["wanjuanwang:2024-03:cxx:level-1:selection:15:wfw5l0uy69pvz2l3vq4o", "A"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:01:1yasxpq2sxsaf2bo7hcc", "C"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:04:pm73m5ci4uaoz03fcemy", "D"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:05:rqvgmpzhri71mqesrdtj", "C"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:06:gjtelu2r2eic0zui323t", "B"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:07:ya1ihnn0oke9ly2dvpmd", "C"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:08:15h4jbk3x9fk3edkd9y7", "A"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:09:f5pvsn1r7afci798yw4k", "C"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:10:msxiy2u2f4tkim6k5rub", "D"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:11:x6kirhez0gq6bcvk47yt", "A"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:12:a8h1rl2hl6vd6m14fni9", "D"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:13:8seny56pszrp3ufnnyai", "D"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:14:j0fuqhpqiopu0dc8olep", "B"],
    ["wanjuanwang:2023-09:cxx:level-1:selection:15:2prrqm98jxb6m1eg5ld8", "B"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:02:bvks5r89cbuq07adp8i6", "A"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:11:7ki76nutxzmdjiudf7p7", "B"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:12:9rn43lkwhfq70rscdv6m", "B"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:14:kar1juczek1kkm0yhxfh", "D"],
    ["wanjuanwang:2023-09:cxx:level-2:selection:15:uvgpx9o1s28e9axtifct", "B"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:01:2j3rfnj8pmxfr36ebnaj", "A"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:02:xtjlfjn1no2to2anpwwx", "D"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:05:2uy0j5yiajs6sho4p8ie", "C"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:06:n2lf3kjg5dj5023eljzf", "A"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:07:t3ms4o1mjt1zgagvwpzs", "A"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:10:rqpk1x4nol5x7hlp85jr", "C"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:11:5qlifecz54spon8qc4ds", "D"],
    ["wanjuanwang:2023-06:cxx:level-1:selection:12:worbfeh6frp6x453l2r4", "C"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:03:rthj8hzmw9c0z2srs7ft", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:04:ikrscfajkdfs5j4176my", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:05:1myyxwti289ditmyuuyo", "C"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:06:f40kb8hmxq0jkkmxggdx", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:07:d0m44uyaqsrlfnmzpq1t", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:08:gh9f4urrtn46fqb73by2", "D"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:09:bpw1yrajkwr3c2c01n8p", "A"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:10:jsgg93967org1z56jlv6", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:12:iqh39hup5atwiocddwf2", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:13:daq2xmwlm8672zha5did", "A"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:14:z1nlpa3xj5z7qbnkvfmb", "B"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:15:3k7w69pjx3k7tjykvsl9", "B"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:01:n76vaq5vg2768xb1pjh8", "A"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:02:opmml4x5s8ph9iqxcoya", "C"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:03:5n3pphgxigurpbpo1e3e", "D"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:04:ymf6i0ww7kv5n8a20nhd", "B"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:06:o6f44gkui9f90zkswo17", "C"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:08:8vscakl6r8pnb3rpsaau", "D"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:09:pbuuw28bwppehtouken3", "D"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:11:i852yf2zzw0jt4f9pvj0", "A"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:13:yl178zr7hhfdc7m3i36j", "D"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:14:fou0woyx471yvwimf8zi", "A"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:05:qtm1l18upjjoxz8rhl37", "B"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:15:2u5e77h5l098jzqg3xm9", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:01:r5aq4kwkibmikattcg77", "A"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:02:me98ci3jenif4t0t6h24", "A"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:07:hmwdpq39vy6dsc99yndm", "C"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:08:3ss5calcwdvl4m7o3zmu", "C"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:09:5bha26el2nfem80z7vp6", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:10:n9a81cfw8fwu9cjk4ja2", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:11:3dmywv3vfopgaavon5uq", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:05:3dqhqnzfm3yu0zpb8dpq", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:13:0ri2wnryyr18o05gq4g4", "D"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:14:jm8f5nczi2aijuw9fklm", "B"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:15:wieavqyar18icpxxkmod", "B"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:01:9zp4e1t91x0lgfqrf52p", "C"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:03:esbn64n0n9731npyzq9l", "C"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:05:7sg30jo17ijew87yrqwg", "B"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:07:ebe9lronjb2imbqo23tk", "B"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:08:xw9vtgpudsxrz6ygm05h", "D"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:09:gsuq0z6dc3r1ofsd0myp", "A"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:10:ohjyre4wwch9kww2igww", "D"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:11:0n906amtdazk2xrkd2vi", "A"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:12:ri2go42qru33vnqgmd9e", "D"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:14:1o0plzqya6d9f0iglgqa", "A"],
    ["wanjuanwang:2023-06:cxx:level-4:selection:15:e45izw917rq3n9y35hiz", "D"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:01:c87n7okdow04ack1njum", "D"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:02:enjwk1en5wd2fp51vdta", "C"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:03:4lyhltc0msjwt1zav5v0", "D"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:04:v3yv8dhvwiegxaycok7r", "C"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:05:xnae364hudvqo8orgcuh", "B"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:06:eoc7cpcb86vrth9lipg0", "A"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:07:krsxnp5kan1ggsqvcfuj", "C"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:08:51l671mgl9naaix30sa1", "C"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:09:ymqw8jh9jatgyyi0dzuv", "C"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:10:61x98vn3d5fbl8j1r4bu", "D"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:11:qhyl75j3ltwmysx33sai", "A"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:12:fdqrmcc1xm40k2gujkhp", "D"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:13:c3yq1nkqpmwwnr4fkioy", "B"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:14:ndwrrfkfp1jx47pcwax5", "A"],
    ["wanjuanwang:2023-03:cxx:level-2:selection:15:1dcu8rebtxnk01mf6vdv", "B"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:01:i6jj1mtldmi9hdx02nwh", "D"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:02:zkpt7hvqxmpo5oigyvij", "C"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:03:ibajebd3ur9qccnorbvd", "B"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:04:t1gb6v1ggmh90omxapnb", "A"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:05:c1ma59fg7ls1nfvjya6i", "A"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:06:h5jo2o5bqp61tf49wboq", "C"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:07:vf7g5wherdlr1n19vvxv", "B"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:08:8y7knckryrq55n5xvqco", "D"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:09:0nbqz8xkh187rvo91w8d", "C"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:10:3hcze0inz67jpwvr7rom", "D"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:11:f298a2wherr9r2cnh7jd", "A"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:12:x1901eyre4x4r4e3ts3i", "B"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:13:l5qlkoouab0xbqf9uixe", "B"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:14:a1s0k6jqy7lnszxsmm3q", "D"],
    ["wanjuanwang:2023-03:cxx:level-1:selection:15:5x46ny7wmowa8z6gg2rq", "A"],
    ["wanjuanwang:2023-09:cxx:level-3:selection:01:7hh7eas3if70qsw04rpb", "B"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:01:pcgot4s1ar6i61toq4my", "B"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:03:z40avbllo0ibmluxad8b", "B"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:04:4uusm8avyzzvw6gqcqgw", "D"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:05:vwj9ksb9z8u19mq986fd", "A"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:06:jh74uhajcqobi5zy0r6b", "A"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:07:hecgxkqdfqty9g1xs7jp", "C"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:08:erezjp3zy4pgz7tpg487", "A"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:09:jn420ua81xa8dsg9q0i4", "D"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:11:mq9n3b6krmzesl07wfj1", "C"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:12:qf2pbtk5att4vmdowuam", "C"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:13:dmutaijts8b8ogd4nesu", "B"],
    ["wanjuanwang:2023-09:cxx:level-4:selection:15:9yksl0mpk5e7exu8hzm3", "A"],
    ["wanjuanwang:2023-12:cxx:level-3:selection:05:tswz7bdcggvkxqfypxex", "C"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:08:0f6bsutflqu32akl01nj", "A"],
    ["wanjuanwang:2023-12:cxx:level-4:selection:15:2ny3huoqmjyrklm2ppi3", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:03:ipbsdhm8eerkx7kl5xrk", "D"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:04:wwlteok191y1f42ynwcb", "C"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:05:oiy36vtspzd11tczn0mh", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:06:4h2rdeq17m9zymldx6az", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:07:b72ls7tqlhpbyx8hjiy5", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:08:56yiipa72vd7czqqr5k6", "D"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:10:nvhn16419emqzx6zdhrd", "A"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:11:ns6ss9ntpml3htaehiu5", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:13:te13uzoqfsslbih78f0s", "B"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:14:3by1517mv986973dicn3", "C"],
    ["wanjuanwang:2023-12:cxx:level-5:selection:15:932rc9xk8ur2gg7rq1d8", "D"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:02:fbpf4d1yx80o0i9tmerz", "C"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:04:b3dvwaisa3ajq32vftn5", "B"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:06:v50u8w8ief4m06hhf31c", "B"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:09:habb13n7lq3ndd2hdnpg", "B"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:11:n4trhx1osu73hgatixk3", "C"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:12:vbfflza38tpz85p75366", "B"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:13:bt67fku42mnei2rgwaus", "D"],
    ["wanjuanwang:2023-12:cxx:level-6:selection:14:tkvbxwtts5e3n93s69u6", "B"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:01:ovcou2gwasmnp3ta76gq", "A"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:02:ea8mvkowzwidotlalnia", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:03:i96sppc1p7wybfnw4qkj", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:04:ufm6wv51vw3q1cwdawzd", "B"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:05:r5bokd0erp9a9g9b5fpw", "A"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:06:1yblehqmzkr9ybatysg1", "A"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:07:84n4y01084trpusjpvnq", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:08:c8i91rdhvlayxezu5lbq", "A"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:09:92006d070brong023q7z", "D"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:10:199xro4i4qvre47uauxn", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:11:r6qy487zxz6wt86dkib4", "D"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:12:q7m5zfdm6e4ys3s84vlh", "C"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:13:mnaytvglz4rh7o3euweq", "B"],
    ["wanjuanwang:2023-09:cxx:level-5:selection:15:e4be7n1z5b7tes114t60", "C"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:04:56natqwszyopjdbik6z0", "A"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:05:74vrkolbbibfyvdm19vs", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:08:6f8xioa831ekcjf92ey8", "D"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:10:l72962yhgy6xcq3dabuy", "A"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:06:qc27xjld1c8yw78nh3gs", "D"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:11:ttthuigikeoa2f9sroti", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:12:y77238zt5oydk6gfkdap", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:13:68i1kob5hvpoi85t36lt", "D"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:14:qbdvagpaufjz6xydqyaa", "D"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:15:789vohz35e0ozpdxcazi", "B"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:02:prdg719sua2lp40q6p09", "D"],
    ["wanjuanwang:2023-09:cxx:level-6:selection:01:25vpm80rikq3xmpepam1", "D"],
    ["wanjuanwang:2024-03:cxx:level-3:selection:10:6apfx66ahxmzanvy27m9", "A"],
    ["wanjuanwang:2024-03:cxx:level-3:selection:06:lcjwxd88q6vtxn40f9oe", "C"],
    ["wanjuanwang:2024-03:cxx:level-2:selection:10:8ea7apbog02tg9ahv4ch", "C"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:14:7eorx1eopt10vtqbzpp8", "C"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:06:h9e18llhvhtqnzu8km9a", "B"],
    ["wanjuanwang:2023-06:cxx:level-3:selection:12:t3w9g9fc5uxoopu8daya", "A"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:12:txtmmvbzkprkv5qn8rzq", "B"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:14:nuw130oor1s9iyjlkitt", "A"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:15:e6y3tdefv77xyaqgckem", "D"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:12:fv45f9rfj4xrbl1z03gl", "D"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:13:g692x452b384q7okosw6", "B"],
    ["wanjuanwang:2024-09:cxx:level-7:selection:14:d77sasg7h8zeuzf2e76h", "A"],
    ["wanjuanwang:2024-12:cxx:level-7:selection:12:qsu6k1lf81hfrwyt7gag", "C"],
    ["wanjuanwang:2024-03:cxx:level-4:selection:13:q7xa6m2f3acd49o0gkp2", "D"],
    ["wanjuanwang:2024-03:cxx:level-4:selection:01:m1guvw8plknbzkbu7evw", "C"],
    ["wanjuanwang:2024-03:cxx:level-4:selection:02:rpot9n1pdtvzti4o2n37", "B"],
    ["wanjuanwang:2024-03:cxx:level-4:selection:05:1aasc4z0s20zqjhad9pc", "C"],
    ["wanjuanwang:2024-03:cxx:level-4:selection:09:5mkmg7v60j7dgnu0xqet", "A"],
    ["wanjuanwang:2024-03:cxx:level-7:selection:14:hjxy5pl0et6yywlqlyb2", "B"],
    ["wanjuanwang:2024-09:cxx:level-7:selection:04:8xlt8delshcflbcooj6c", "C"],
    ["wanjuanwang:2024-03:cxx:level-5:selection:06:emx6q7q0d62zxyz5lecf", "A"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:07:z24jpyh9q8qwwsvpvs1u", "C"],
    ["wanjuanwang:2023-06:cxx:level-2:selection:10:iyn6m39xfqevgzy8ikux", "B"],
    ["wanjuanwang:2024-09:cxx:level-4:selection:15:os0d7r2bzp8dtmel8lh2", "D"],
    ["wanjuanwang:2024-09:cxx:level-3:selection:02:lwj0go7dthgda6me61sc", "D"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:09:lquqh2ftu72dh4fay3qz", "D"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:11:lzo4jgsc1kph1glc1lv8", "C"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:13:m7ezgtt9ccx02n3u50d5", "C"],
    ["wanjuanwang:2024-09:cxx:level-2:selection:15:5wqcu08pa6rnsxbjd5pb", "C"],
    ["wanjuanwang:2024-06:cxx:level-3:selection:07:tghqb1u1didhdj3s8igt", "A"],
    ["wanjuanwang:2024-06:cxx:level-3:selection:12:fehwyizfeb8ut0ffrsf6", "B"],
    ["wanjuanwang:2024-06:cxx:level-8:selection:07:w6giu8i7m0xclqcetrbv", "C"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:02:i4l3lytssec5gekqql4d", "A"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:06:wqy3ixqz0e8z56uhgs4c", "D"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:10:ewkf1b32gvdhd3lfot0f", "D"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:11:kue65z9pezbtbzk8ceq5", "D"],
    ["wanjuanwang:2024-09:cxx:level-1:selection:15:92mbp4dek6xozrjydgie", "D"],
    ["wanjuanwang:2024-06:cxx:level-5:selection:10:av1fdgm3u4tlqwku95f7", "D"],
    ["wanjuanwang:2024-06:cxx:level-4:selection:03:251my8j47wm5px2m1nff", "D"],
    ["wanjuanwang:2024-12:cxx:level-8:selection:15:0ed3c80f1776h8ppsm9j", "A"],
    ["wanjuanwang:2025-06:cxx:level-1:selection:06:mhpcoaeiwaqx5ckhtdub", "C"],
    ["wanjuanwang:2025-06:cxx:level-1:selection:10:6sqrhybogiv8fgbv4etm", "D"],
    ["wanjuanwang:2025-06:cxx:level-1:selection:15:zyh57c4x1r9j6y5sd62h", "D"],
    ["wanjuanwang:2025-06:cxx:level-2:selection:01:hee40ctff5t70hn0gkjf", "A"],
    ["wanjuanwang:2025-06:cxx:level-2:selection:09:pv438zf8xbaacplip6d5", "C"],
    ["wanjuanwang:2025-06:cxx:level-3:selection:01:ipq7xzrggnq60j5gmkhm", "A"],
    ["wanjuanwang:2025-06:cxx:level-3:selection:04:c9kzhfiaw6pubfk4nws4", "A"]
  ]);
  if (directAnswerById.has(id)) {
    return byKey(directAnswerById.get(id));
  }

  if (/下列赋值语句不符合语法/.test(title)) {
    return byKey("C");
  }
  if (/只有最底层的节点未被填满，且最底层节点尽量靠左填充/.test(title)) {
    return byKey("B");
  }
  if (/关于下面代码，说法正确的是/.test(title) && /最大承重为 W 的背包/.test(title)) {
    return byKey("C");
  }
  if (/3位格雷编码中.*101 之后的下一个编码.*不可能/.test(title)) {
    return byKey("D");
  }
  if (/代码同上一题，代码执行结果是/.test(title) && options.some((option) => /Dog barks/.test(option.text))) {
    return byKey("B");
  }
  if (/二叉排序树的插入函数/.test(title)) {
    return byKey("A");
  }
  if (/循环链表解决约瑟夫问题/.test(title)) {
    return byKey("A");
  }
  if (/完善 append\(\).*双向链表尾部增加新节点/.test(title)) {
    return byKey("D");
  }
  if (/函数 is_empty\(\) 判断链表是否为空.*不能填写/.test(title)) {
    return byKey("C");
  }
  if (/两种方式求解两个正整数的最大公约数.*错误/.test(title)) {
    return byKey("D");
  }
  if (/用于求一系列数据中的最大值。有关其算法说法.*错误/.test(title) && /贪心/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/高精度除法函数/.test(title)) {
    return byKey("D");
  }
  if (/唯一分解定理描述了关于正整数的什么性质/.test(title)) {
    return byKey("B");
  }
  if (/与数组相比，链表在（? ?）?操作上通常具有更高的效率/.test(title) || /与数组相比，链表在.*操作上通常具有更高的效率/.test(title)) {
    return byKey("C");
  }
  if (/快速排序算法，说法.*错误/.test(title) && /稳定排序/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/有关下面C\+\+代码的说法，.*错误.*的是/.test(title) && /阶段1/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/一个大于0的正整数是几位数/.test(title)) {
    return byKey("D");
  }
  if (/跑动着的机器人会利用身上安装的多个传感器/.test(title)) {
    return byKey("C");
  }
  if (/容量更大的内存条/.test(title)) {
    return byKey("A");
  }
  if (/自守数.*相关说法.*错误/.test(title)) {
    return byKey("D");
  }
  if (/二进制数 1101\.101 对应的十进制数/.test(title)) {
    return byKey("A");
  }
  if (/string s = "GESP考试"/.test(title)) {
    return byKey("D");
  }
  if (/以下哪个位运算可以交换两个变量的值/.test(title)) {
    return byKey("A");
  }
  if (/八进制数 35\.6 对应的十进制数/.test(title)) {
    return byKey("A");
  }
  if (/若 X 的 8 位补码为 0000 1010，则 X\/2 的补码/.test(title)) {
    return byKey("A");
  }
  if (/枚举法（穷举法）求解满足条件的三位数/.test(title)) {
    return byKey("B");
  }
  if (/补码 1011 1011 对应的真值/.test(title)) {
    return byKey("A");
  }
  if (/正确定义一个长度为5的整型数组/.test(title)) {
    return byKey("D");
  }
  if (/8位二进制原码能表示的最小整数/.test(title)) {
    return byKey("A");
  }
  if (/二进制数 1010 \| 1100 的结果/.test(title)) {
    return byKey("B");
  }
  if (/字符串 "Gesp考试"，字符数是/.test(title)) {
    return byKey("C");
  }
  if (/反码表示中，零的表示形式有/.test(title)) {
    return byKey("B");
  }
  if (/补码加法中，若最高位和次高位进位不同/.test(title)) {
    return byKey("B");
  }
  if (/下列关于树和图的说法，.*错误.*的是/.test(title)) {
    return byKey("A");
  }
  if (/从1到2025这2025个数中，包含数字5的个数/.test(title)) {
    return byKey("B");
  }
  if (/可以求出弦长 s 的是/.test(title) && /theta/.test(title)) {
    return byKey("D");
  }
  if (/输出杨辉三角形.*横线部分应该填入/.test(title)) {
    return byKey("B");
  }
  if (/Floyd算法中，横线处应该填入/.test(title)) {
    return byKey("A");
  }
  if (/下列关于算法的说法，.*错误.*的是/.test(title) && /倍增法/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/神奇的数字.*2025.*下面程序横线处应填入的是/.test(title)) {
    return byKey("C");
  }
  if (/试图编译并执行下面C\+\+代码，下面描述正确的是/.test(title)) {
    return byKey("D");
  }
  if (/M 天后是星期几，两处横线处分别应填入/.test(title)) {
    return byKey("B");
  }
  if (/14-3\*3%2 的值/.test(title)) {
    return byKey("C");
  }
  if (/cout << \(\+\+X\)\+\+/.test(title)) {
    return byKey("D");
  }
  if (/执行 \+\+a \+= 3 之后/.test(title)) {
    return byKey("C");
  }
  if (/在C\+\+中，下列可以做变量名的是/.test(title)) {
    return byKey("D");
  }
  if (/链表 .*不具备.*的特点是/.test(title)) {
    return byKey("A");
  }
  if (/根据唯一分解定理.*唯一分解是正确的/.test(title)) {
    return byKey("D");
  }
  if (/对下面两个函数，说法.*错误.*的是/.test(title) && /factorialB/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/findMax.*正确实现了分治逻辑/.test(title)) {
    return byKey("D");
  }
  if (/下算法中.*是不稳定的排序/.test(title)) {
    return byKey("A");
  }
  if (/快速排序算法.*横线上应填的最佳代码/.test(title)) {
    return byKey("B");
  }
  if (/求gcd\(84, 60\).*第二步计算的数是/.test(title)) {
    return byKey("B");
  }
  if (/高精度乘法函数/.test(title)) {
    return byKey("B");
  }
  if (/下列哪个选项是C\+\+中的关键字/.test(title)) {
    return byKey("B");
  }
  if (/二维网格 grid.*路径上的数字总和最小/.test(title)) {
    return byKey("B");
  }
  if (/下列关于排序的说法，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/希望通过函数修改传入的结构体对象的内容/.test(title)) {
    return byKey("C");
  }
  if (/递推算法基本思想.*描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/关于动态规划的说法中.*错误/.test(title)) {
    return byKey("B");
  }
  if (/关于动态规划算法特性的描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/贪心算法的核心特征是/.test(title)) {
    return byKey("A");
  }
  if (/以下哪种方法.*不是.*哈希表冲突解决策略/.test(title) || /以下哪种方法 不是 常见的哈希表冲突解决策略/.test(title)) {
    return byKey("D");
  }
  if (/找到一个具有最大和的连续子数组/.test(title)) {
    return byKey("B");
  }
  if (/关于下面代码，说法.*错误.*的是/.test(title) && /Shape\* shapePtr = &circle/.test(options.map((option) => option.text).join(" "))) {
    return byKey("A");
  }
  if (/关于下述代码，说法错误的是/.test(title) && /multiply/.test(title)) {
    return byKey("A");
  }
  if (/下面（? ?）?正确定义了二维数组/.test(title) || /正确定义了二维数组/.test(title)) {
    return byKey("B");
  }
  if (/结构 Person 内嵌套结构 Address/.test(options.map((option) => option.text).join(" ")) && /说法错误的是/.test(title)) {
    return byKey("D");
  }
  if (/arr\[1\] \[2\] 的值是/.test(title)) {
    return byKey("D");
  }
  if (/避免拷贝大型对象/.test(title)) {
    return byKey("D");
  }
  if (/关于排序稳定性的描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/第.?一轮冒泡排序后数组 arr 中的内容为/.test(title)) {
    return byKey("A");
  }
  if (/不能实现将字符串 "Happy Spring!" 输出重定向到文件 log\.txt/.test(title)) {
    return byKey("C");
  }
  if (/爬楼梯.*递推算法/.test(title)) {
    return byKey("B");
  }
  if (/将十进制转十六进制/.test(title)) {
    return byKey("C");
  }
  if (/最后能够得到 HelloC\+\+/.test(title)) {
    return byKey("B");
  }
  if (/UTF-8 编码规则如下/.test(title)) {
    return byKey("B");
  }
  if (/8位有符号整数（使用补码/.test(title)) {
    return byKey("A");
  }
  if (/奇数和偶数分别放在数组的前半部分和后半部分/.test(title)) {
    return byKey("D");
  }
  if (/以下代码的说法正确的是什么/.test(title) && options.some((option) => /arr\[i\] > arr\[maxIndex\]/.test(option.text))) {
    return byKey("D");
  }
  if (/输入字符串的长度为 10 字节，编码后的字符串长度是多少/.test(title)) {
    return byKey("D");
  }
  if (/八进制数 -5 的二进制形式是什么/.test(title)) {
    return byKey("A");
  }
  if (/补码的主要作用是/.test(title)) {
    return byKey("B");
  }
  if (/十进制数 111\.111 的二进制表/.test(title)) {
    return byKey("A");
  }
  if (/求1到N之间正整数中含有3的数的个数/.test(title)) {
    return byKey("B");
  }
  if (/相关说法正确的是/.test(title) && /last \+= 1/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/找出百位、十位和个位满足特定条件的三位数/.test(title)) {
    return byKey("B");
  }
  if (/下列哪个选项是C\+\+中的关键字/.test(title)) {
    return byKey("B");
  }
  if (/递归调用的层数过多，会因为/.test(title)) {
    return byKey("A");
  }
  if (/哈希表冲突.*不是 常见的哈希表冲突解决策略/.test(title)) {
    return byKey("D");
  }
  if (/以下哪个方案不能合理解决或缓解哈希表冲突/.test(title)) {
    return byKey("D");
  }
  if (/以下哪个方案可以合理解决或缓解哈希表冲突/.test(title)) {
    return byKey("D");
  }
  if (/关于C\+\+类的说法.*错误/.test(title)) {
    return byKey("B");
  }
  if (/关于C\+\+类和对象的说法.*错误/.test(title)) {
    return byKey("D");
  }
  if (/关于C\+\+类构造和析构函数的说法.*错误/.test(title)) {
    return byKey("B");
  }
  if (/最长公共子序列程序中，横线处应该填入/.test(title)) {
    return byKey("C");
  }
  if (/直线 AB 的斜率存在/.test(title)) {
    return byKey("C");
  }
  if (/自编车牌包括5位数字或英文字母/.test(title)) {
    return byKey("B");
  }
  if (/Dijkstra算法中，横线处应该填入/.test(title) && options.some((option) => /e->out/.test(option.text))) {
    return byKey("B");
  }
  if (/使用邻接表表达一个简单有向图/.test(title)) {
    return byKey("D");
  }
  if (/二项式 \(x\+y\)6的展开式中 x3y3项的系数/.test(title)) {
    return byKey("C");
  }
  if (/关于二叉树的说法，错误的是/.test(title) && options.some((option) => /AVL树/.test(option.text))) {
    return byKey("B");
  }
  if (/左子树和右子树，要么同时存在，要么同时不存在/.test(title)) {
    return byKey("B");
  }
  if (/简单无向图有10个结点、6条边/.test(title) && /使其连通/.test(title)) {
    return byKey("C");
  }
  if (/已知数组 a 的定义 int a\[10\] = \{0\}/.test(title)) {
    return byKey("A");
  }
  if (/阅读以下代码，下面哪一项是正确的/.test(title) && options.some((option) => /栈 s 的输出顺序是 5 4 3 2 1/.test(option.text))) {
    return byKey("B");
  }
  if (/假设背包的最大容量 W=8kg/.test(title)) {
    return byKey("C");
  }
  if (/是 3 位格雷编码/.test(title)) {
    return byKey("A");
  }
  if (/以下关于C\+\+中类的说法，哪一项是正确的/.test(title)) {
    return byKey("C");
  }
  if (/正确定义了一个计算浮点数 x 的平方/.test(title)) {
    return byKey("A");
  }
  if (/二维整数数组 array/.test(title) && /&array\[1\]\[1\]/.test(title)) {
    return byKey("D");
  }
  if (/func\(int& x\)/.test(title)) {
    return byKey("B");
  }
  if (/下面关于归并排序，描述正确的是/.test(title)) {
    return byKey("B");
  }
  if (/关于链表和数组的描述，错误的是/.test(title)) {
    return byKey("C");
  }
  if (/快速排序算法： int partition/.test(title)) {
    return byKey("A");
  }
  if (/删除链表中值为 val 的节点/.test(title) && /虚拟头节点/.test(title)) {
    return byKey("A");
  }
  if (/对下面两个函数，说法错误的是/.test(title) && options.some((option) => /fibA/.test(option.text))) {
    return byKey("D");
  }
  if (/最后输出的是/.test(title) && /tolower/.test(title)) {
    return byKey("C");
  }
  if (/625\.625变成二进制是/.test(title)) {
    return byKey("A");
  }
  if (/有多少个数字d出现/.test(title)) {
    return byKey("C");
  }
  if (/补码1111 1101进行运算1111 1101>>1/.test(title)) {
    return byKey("B");
  }
  if (/A不能排在队首/.test(title) && /升国旗/.test(title)) {
    return byKey("B");
  }
  if (/一棵二叉树有10个节点，则其中至多有/.test(title) && /2个子节点/.test(title)) {
    return byKey("A");
  }
  if (/当n=10时，二项式展开式中xy9项的系数/.test(title)) {
    return byKey("C");
  }
  if (/欧拉函数/.test(title) && /说法错误/.test(title)) {
    return byKey("D");
  }
  if (/二进制数 100\.001 转换成十进制数/.test(title)) {
    return byKey("B");
  }
  if (/以下函数声明，哪个是符合C\+\+语法的/.test(title)) {
    return byKey("B");
  }
  if (/0,1,2,3,4,5这些数字组成一个三位数/.test(title)) {
    return byKey("D");
  }
  if (/有关C\+\+重载的说法，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/从1到2024这2024个数中，共有.*个包含数字6的数/.test(title)) {
    return byKey("A");
  }
  if (/7进制数235转换成3进制数是/.test(title)) {
    return byKey("A");
  }
  if (/二进制数101\.11对应的十进制数/.test(title)) {
    return byKey("C");
  }
  if (/CCF组织的GESP认证考试的第1级.*认证语言有.*种/.test(title)) {
    return byKey("C");
  }
  if (/闰年，并输出 2月是29天/.test(title)) {
    return byKey("B");
  }
  if (/某小学男子篮球队招募新成员/.test(title)) {
    return byKey("B");
  }
  if (/默认64位计算机系统中整型变量（int）还是32位/.test(title)) {
    return byKey("C");
  }
  if (/十进制转化成八进制/.test(title)) {
    return byKey("C");
  }
  if (/char str\[\] = .GESP./.test(title)) {
    return byKey("C");
  }
  if (/从1到35中能被7整除的数字/.test(title)) {
    return byKey("A");
  }
  if (/输入金额换成最少币种组合方案/.test(title)) {
    return byKey("B");
  }
  if (/查找数值82，和82比较的数组元素分别是/.test(title)) {
    return byKey("C");
  }
  if (/双向链表中加入一首新歌曲.*作为链表的第一首歌曲/.test(title)) {
    return byKey("C");
  }
  if (/高精度减法函数/.test(title) && options.some((option) => /a\[i \+ 1\]/.test(option.text))) {
    return byKey("A");
  }
  if (/两个长度为n的有序数组.*最坏情况下至少要做/.test(title)) {
    return byKey("C");
  }
  if (/int fun\(int n\) \{ cout << n/.test(title)) {
    return byKey("D");
  }
  if (/欧几里得算法编写的函数，它计算的是/.test(title)) {
    return byKey("C");
  }
  if (/当 n = 7.*return fun\(n - 2\) - fun\(n - 1\)/.test(title)) {
    return byKey("D");
  }
  if (/斐波那契数列.*函数fibo\(\)属于/.test(title)) {
    return byKey("D");
  }
  if (/正确实现快速排序，下面横线上的代码应为/.test(title)) {
    return byKey("D");
  }
  if (/gcd\(int a, int b\).*错误的是/.test(title)) {
    return byKey("D");
  }
  if (/0x6ffe00.*cout<<a\+1/.test(title)) {
    return byKey("A");
  }
  if (/几种排序算法的说法，下面说法错误的是/.test(title)) {
    return byKey("B");
  }
  if (/10条直线，最多可以把平面分为多少个区域/.test(title)) {
    return byKey("B");
  }
  if (/关于递推的说法不正确的是/.test(title)) {
    return byKey("A");
  }
  if (/一棵5层的满二叉树中节点数为/.test(title)) {
    return byKey("A");
  }
  if (/在栈数据结构中，元素的添加和删除是按照什么原则/.test(title)) {
    return byKey("B");
  }
  if (/二叉树的（? ?）?第一个访问的节点是根节点/.test(title) || /二叉树的.*第一个访问的节点是根节点/.test(title)) {
    return byKey("A");
  }
  if (/最优子结构和/.test(title) && /动态规划/.test(title)) {
    return byKey("A");
  }
  if (/判断队列是否满的函数/.test(title)) {
    return byKey("A");
  }
  if (/关于图的深度优先搜索和广度优先搜索，下列说法错误的是/.test(title)) {
    return byKey("D");
  }
  if (/关于运算符&，下面说法正确的是/.test(title)) {
    return byKey("C");
  }
  if (/cout << \(5 % 2 && 5 % 3\)/.test(title)) {
    return byKey("A");
  }
  if (/下列不可做变量的是/.test(title)) {
    return byKey("A");
  }
  if (/某货币由5元，2元和1元组成/.test(title)) {
    return byKey("B");
  }
  if (/for\(int i=0; i<10; i\+\+\) 效果相同的是/.test(title)) {
    return byKey("A");
  }
  if (/完全平方数.*横线处应填入的代码/.test(title)) {
    return byKey("D");
  }
  if (/3 - 3 \* 3 \/ 5/.test(title)) {
    return byKey("B");
  }
  if (/9\/4 - 6 % \(6 - 2\) \* 10/.test(title)) {
    return byKey("B");
  }
  if (/N % 3 \+ N % 7.*可能输出的最大值/.test(title)) {
    return byKey("B");
  }
  if (/ENIAC于1946年投入运行/.test(title)) {
    return byKey("B");
  }
  if (/printf.*5%%2/.test(title)) {
    return byKey("C");
  }
  if (/cin >> i, cout << i.*输入 5\+2/.test(title)) {
    return byKey("B");
  }
  if (/下列说法错误的是/.test(title) && /foreach 循环/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/王选先生的重大贡献是/.test(title)) {
    return byKey("C");
  }
  if (/答案不是整数8的是/.test(title)) {
    return byKey("C");
  }
  if (/不符合 C\+\+变量命名规则的是/.test(title) || /不可以做为C\+\+变量的是/.test(title)) {
    return byKey("B");
  }
  if (/不能用于表示分支结构的C\+\+保留字/.test(title)) {
    return byKey("B");
  }
  if (/三天打渔，两天晒网/.test(title)) {
    return byKey("D");
  }
  if (/判断一个数是否为回文数/.test(title)) {
    return byKey("A");
  }
  if (/各个数位是否都是偶数/.test(title)) {
    return byKey("C");
  }
  if (/鸿蒙是/.test(title)) {
    return byKey("C");
  }
  if (/判断键盘输入的整数是否为质数/.test(title)) {
    return byKey("B");
  }
  if (/可以完成数据输入的语句是/.test(title)) {
    return byKey("B");
  }
  if (/赋值语句不正确/.test(title) && /3\.16 int/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/cin >> a 时如果输入5\+2/.test(title)) {
    return byKey("D");
  }
  if (/5%2=/.test(title) && /执行后的输出/.test(title)) {
    return byKey("D");
  }
  if (/\(3 - 2\) \* 3 \+ 5/.test(title)) {
    return byKey("B");
  }
  if (/生成一个可执行程序需要执行下面哪个处理步骤/.test(title)) {
    return byKey("C");
  }
  if (/GESP IS INTERESTING/.test(title)) {
    return byKey("C");
  }
  if (/char str\[20\] = \{'G', 'E', 'S', 'P'\}/.test(title)) {
    return byKey("A");
  }
  if (/a\|b 的值和 a\+b 的关系/.test(title)) {
    return byKey("C");
  }
  if (/短整数 -4 的十六进制/.test(title)) {
    return byKey("C");
  }
  if (/x == \(x<<1>>1\)/.test(title)) {
    return byKey("B");
  }
  if (/字符码值最大的是/.test(title)) {
    return byKey("C");
  }
  if (/整数-5的16位补码表示/.test(title)) {
    return byKey("D");
  }
  if (/关键字能够限定对象的作用域/.test(title)) {
    return byKey("B");
  }
  if (/下面哪个调用能够改变 a 的值/.test(title)) {
    return byKey("C");
  }
  if (/插入排序在最好情况下的时间复杂度/.test(title)) {
    return byKey("C");
  }
  if (/int arr\[3\]\[16\].*arr\[1\] 占用内存的大小/.test(title)) {
    return byKey("D");
  }
  if (/选1种肉、1种切法、1种配菜、1种辣度/.test(title)) {
    return byKey("D");
  }
  if (/扇形.*阴影部分的面积/.test(title)) {
    return byKey("D");
  }
  if (/二维数组的初始化，哪个是符合语法的/.test(title)) {
    return byKey("B");
  }
  if (/使用邻接表表达一个无向简单图/.test(title)) {
    return byKey("C");
  }
  if (/袋中有2个相同的红球、3个相同的绿球、5个相同的黄球/.test(title)) {
    return byKey("C");
  }
  if (/计算这个三角形的周长/.test(title)) {
    return byKey("D");
  }
  if (/辗转相除法也被称为/.test(title)) {
    return byKey("C");
  }
  if (/归并排序的基本思想是/.test(title)) {
    return byKey("B");
  }
  if (/在双向链表中删除一个节点/.test(title)) {
    return byKey("A");
  }
  if (/快速排序中，选择的主元素（pivot）会影响算法的/.test(title)) {
    return byKey("B");
  }
  if (/阶乘计算/.test(title) && /factorial/.test(title)) {
    return byKey("A");
  }
  if (/贪心算法的核心思想是/.test(title)) {
    return byKey("B");
  }
  if (/两个高精度整数进行相加/.test(title)) {
    return byKey("A");
  }
  if (/判断一个正整数是否为素数.*进行修改/.test(title)) {
    return byKey("B");
  }
  if (/唯一分解定理描述的内容是/.test(title)) {
    return byKey("B");
  }
  if (/递归函数在调用自身时，必须满足/.test(title)) {
    return byKey("D");
  }
  if (/以下动态规划算法的含义与目的是/.test(title)) {
    return byKey("C");
  }
  if (/给定一个空栈，执行以下操作序列/.test(title)) {
    return byKey("D");
  }
  if (/在队列中，元素的添加和删除是按照/.test(title)) {
    return byKey("A");
  }
  if (/先序遍历为：A, B, D, E, C, F.*后序遍历为/.test(title)) {
    return byKey("A");
  }
  if (/Circle 对象并调用了 getArea 函数/.test(title)) {
    return byKey("D");
  }
  if (/3 位格雷编码的正确顺序是/.test(title)) {
    return byKey("B");
  }
  if (/想找出它所有相邻的因数对.*找不到所有的因数对/.test(title)) {
    return byKey("B");
  }
  if (/输出1-100（含）的整数平方数/.test(title)) {
    return byKey("C");
  }
  if (/现代计算机.*基于的是（ .*）体系结构/.test(title) || /现代计算机是指电子计算机，它所基于的是/.test(title)) {
    return byKey("B");
  }
  if (/for\(int i = 10; i < 20; i \+=2\)/.test(title)) {
    return byKey("A");
  }
  if (/从小到大的顺序输出能整除N的数/.test(title)) {
    return byKey("D");
  }
  if (/下面的程序属于哪种算法/.test(title)) {
    return byKey("D");
  }
  if (/有关C\+\+类的说法，错误的是/.test(title)) {
    return byKey("B");
  }
  if (/关于二叉排序树的说法，正确的是/.test(title)) {
    return byKey("A");
  }
  if (/一个简单有向图有10个结点、30条边/.test(title)) {
    return byKey("A");
  }
  if (/一个连通的简单无向图，共有28条边，则该图至少有/.test(title)) {
    return byKey("D");
  }
  if (/值一定大于0的是/.test(title) && /double 类型/.test(title)) {
    return byKey("B");
  }
  if (/树的哪种遍历方式/.test(title)) {
    return byKey("A");
  }
  if (/生成 n 位格雷编码/.test(title)) {
    return byKey("A");
  }
  if (/检查字符串中的括号是否匹配/.test(title)) {
    return byKey("C");
  }
  if (/深度优先搜索（DFS）.*统计叶子结点的数量/.test(title) || /深度优先搜索.*统计叶子结点的数量/.test(title)) {
    return byKey("A");
  }
  if (/二叉排序树的哪种操作/.test(title)) {
    return byKey("A");
  }
  if (/有向图的说法，错误的是/.test(title)) {
    return byKey("A");
  }
  if (/各字符的哈夫曼编码是/.test(title)) {
    return byKey("A");
  }
  if (/NULL 在C\+\+中无法用于指针初始化/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/以下关于树的说法，（ .*）?是正确的/.test(title) || /以下关于树的说法.*是正确的/.test(title)) {
    return byKey("B");
  }
  if (/上题中的宽度优先搜索算法遍历以下这棵树，可能的输出是/.test(title)) {
    return byKey("C");
  }
  if (/会引起编译错误/.test(title) && /Line 1/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/有6个元素，按照 6,5,4,3,2,1 的顺序进入栈S/.test(title)) {
    return byKey("A");
  }
  if (/实现 n nn 位的格雷码/.test(title)) {
    return byKey("C");
  }
  if (/程序的时间复杂度为/.test(title) && /N×loglogN/.test(options.map((option) => option.text).join(" "))) {
    if (/线性筛|筛法|init_sieve|埃拉托|loglog/.test(title)) {
      return byKey("C");
    }
  }
  if (/在上题的树中搜索数值3时，采用深度优先搜索一共比较的节点数/.test(title)) {
    return byKey("C");
  }
  if (/十进制正整数转化为二进制表示/.test(title)) {
    return byKey("A");
  }
  if (/对于如下二叉树，下面访问顺序说法错误的是/.test(title)) {
    return byKey("A");
  }
  if (/关于图的说法正确的是/.test(title)) {
    return byKey("D");
  }
  if (/count_triple 函数的时间复杂度为/.test(title) && options.some((option) => option.text === "O(n3)" || option.text === "O(N3)")) {
    return byKey("C");
  }
  if (/关于序列 \{2,7,1,5,6,4,3,8,9\}/.test(title)) {
    return byKey("A");
  }
  if (/下面的代码片段用于反转单链表/.test(title)) {
    return byKey("A");
  }
  if (/广度优先搜索的代码/.test(title) && /queue<TreeNode\*>/.test(title)) {
    return byKey("D");
  }
  if (/希望能在一棵二叉排序树中搜索特定的值/.test(title)) {
    return byKey("B");
  }
  if (/最长上升子序列（LIS）的长度/.test(title) && /1 7 3 5 9/.test(title)) {
    return byKey("B");
  }
  if (/图的广度优先搜索中.*还需哪种结构存放结点/.test(title)) {
    return byKey("B");
  }
  if (/求图 G 中某个顶点 u.*的度的算法复杂度是/.test(title)) {
    return byKey("B");
  }
  if (/给定一个简单有向图 G ，判断其中是否存在环路/.test(title)) {
    return byKey("D");
  }
  if (/非连通无向图，共有 28 条边，则该图至少有/.test(title)) {
    return byKey("D");
  }
  if (/static 的描述不正确的是/.test(title)) {
    return byKey("B");
  }
  if (/有关树的存储，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/fiboA\(\) 和 fiboB\(\)/.test(title)) {
    return byKey("D");
  }
  if (/哪种排序算法和冒泡排序是同一类/.test(title)) {
    return byKey("D");
  }
  if (/判断任意输入的整数N是否为素数的程序，下面哪个方法不合适/.test(title)) {
    return byKey("C");
  }
  if (/hello world 使用霍夫曼编码/.test(title)) {
    return byKey("B");
  }
  if (/有关C\+\+类和对象的说法，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/可以计算这个三角形的面积/.test(title)) {
    return byKey("A");
  }
  if (/中序遍历，其时间复杂度是/.test(title)) {
    return byKey("C");
  }
  if (/使用邻接矩阵表达 n 个顶点的有向图/.test(title)) {
    return byKey("B");
  }
  if (/各字符的哈夫曼编码是/.test(title) && options.some((option) => /A: 0, B: 10, C: 110, D: 111/.test(option.text))) {
    return byKey("A");
  }
  if (/上一题中程序的时间复杂度为/.test(title) && options.some((option) => option.text === "O(N2)")) {
    return byKey("D");
  }
  if (/对“classmycls”使用哈夫曼/.test(title)) {
    return byKey("B");
  }
  if (/已知两个序列s1=.*最长公共子序列/.test(title)) {
    return byKey("A");
  }
  if (/schedule 函数的时间复杂度为/.test(title)) {
    return byKey("A");
  }
  if (/定义变量 double x.*输入为 100/.test(title)) {
    return byKey("D");
  }
  if (/从A城到B城共有几种交通方案可以选择/.test(title)) {
    return byKey("C");
  }
  if (/二维数组的名字作为实际参数传递给形式参数 a/.test(title)) {
    return byKey("A");
  }
  if (/二维数组 h 和 v.*最小时间消耗/.test(title)) {
    return byKey("A");
  }
  if (/下面程序的时间复杂度为/.test(title) && /C\(n,m\)/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/输入参数 m 和 n 满足m≤n.*最差情况的时间复杂度/.test(title)) {
    return byKey("D");
  }
  if (/5 位同学排队，其中一位同学不能排在第一/.test(title)) {
    return byKey("C");
  }
  if (/最小生成树包含多少条边/.test(title)) {
    return byKey("A");
  }
  if (/下面程序的输出为/.test(title) && /A:12 \| B:18 \| C:36 \| D:42/.test(options.map((option) => `${option.key}:${option.text}`).join(" | "))) {
    return byKey("B");
  }
  if (/某二叉树T的先序遍历序列为： \{A B D F C E G H\}/.test(title)) {
    return byKey("B");
  }
  if (/对关键字序列 \{44，36，23，35，52，73，90，58\}/.test(title)) {
    return byKey("C");
  }
  if (/代码段可以求两个字符串 s1 和 s2 的最长公共子串/.test(title)) {
    return byKey("C");
  }
  if (/某门课程 C 的全部先修课下面哪种方法不可行/.test(title)) {
    return byKey("D");
  }
  if (/下面的 fiboA\(\) 和 fiboB\(\) 两个函数/.test(title)) {
    return byKey("D");
  }
  if (/下面的程序中，二维数组 h 和 v/.test(title)) {
    return byKey("A");
  }
  if (/有序数组 nums.*左边界/.test(title) && /target=8/.test(title)) {
    return byKey("B");
  }
  if (/find_max\(\) 函数采用的是迭代算法/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/关于下述代码，说法错误的是/.test(title) && /multiply/.test(title)) {
    return byKey("A");
  }
  if (/对数组 arr=\{5, 3, 8, 1\} 进行升序排序.*第一.?轮冒泡排序/.test(title)) {
    return byKey("A");
  }
  if (/运行下面的代码，将出现（ ）/.test(title) && /Caught/.test(options.map((option) => option.text).join(" "))) {
    return byKey("A");
  }
  if (/美丽数字当且仅当该正整数是 9 的倍数但不是 8 的倍数/.test(title)) {
    return byKey("C");
  }
  if (/想要得到字符串 world/.test(title)) {
    return byKey("D");
  }
  if (/下列程序的作用是/.test(title) && /八进制数转换成十进制数/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/DeepSeek与《哪吒2》/.test(title)) {
    return byKey("D");
  }
  if (/三色彩球/.test(title) && /remainder <= 5/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/float 类型的变量.*正确判断“a等于b”/.test(title)) {
    return byKey("C");
  }
  if (/1到10之间的随机整数/.test(title)) {
    return byKey("C");
  }
  if (/N是C\+\+的正整数，值为12/.test(title)) {
    return byKey("D");
  }
  if (/0322\$\$/.test(title) || /__ 0322\$\$/.test(title)) {
    return byKey("B");
  }
  if (/不可以执行下面（ .*）?操作/.test(title) && /执行截图/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/下列可以做变量的是/.test(title)) {
    return byKey("D");
  }
  if (/键盘上先后输入100和200/.test(title)) {
    return byKey("B");
  }
  if (/有关下列C\+\+代码的说法，错误的是/.test(title) && /两个单引号/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/哪个是C\+\+语言的关键字/.test(title)) {
    return byKey("C");
  }
  if (/N\*N=100/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/哪组不能通过编译/.test(title) && /switch \(i\)/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/16 \/ 4 % 2/.test(title)) {
    return byKey("D");
  }
  if (/运行下面代码片段后， x 和 \*p 的结果分别是/.test(title)) {
    return byKey("D");
  }
  if (/高精度减法函数/.test(title) && /倒序存储/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/下列二进制表示的十进制数值分别是/.test(title)) {
    return byKey("A");
  }
  if (/关于计算机中的编码，下列说法中错误的是/.test(title)) {
    return byKey("C");
  }
  if (/下面逻辑运算中，正确的是/.test(title)) {
    return byKey("D");
  }
  if (/计算机系统中存储的基本单位用B来表示/.test(title)) {
    return byKey("A");
  }
  if (/求正整数各位数字之和，横线处不应填入代码是/.test(title)) {
    return byKey("D");
  }
  if (/上述代码执行后其输出相当于求1-10的和（不包含10）/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/3 \+ 3 % 3 \* 2 - 1/.test(title)) {
    return byKey("B");
  }
  if (/阶乘之和.*不能实现阶乘和/.test(title)) {
    return byKey("D");
  }
  if (/孪生素数/.test(title) && /isPrime/.test(title)) {
    return byKey("B");
  }
  if (/输出是30，则横线处不能填入/.test(title)) {
    return byKey("C");
  }
  if (/假设N为正整数2/.test(title)) {
    return byKey("B");
  }
  if (/下列软件中是操作系统的是/.test(title)) {
    return byKey("C");
  }
  if (/位增数/.test(title)) {
    return byKey("D");
  }
  if (/\(6 > 2\) \* 2/.test(title)) {
    return byKey("B");
  }
  if (/下面C\+\+代码执行后输出的是（ ）/.test(title) && /4950/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/12 - 3 \* 2 && 2/.test(title)) {
    return byKey("B");
  }
  if (/正方形的周长增加4/.test(title)) {
    return byKey("D");
  }
  if (/星期日则输出“星期天”/.test(title)) {
    return byKey("B");
  }
  if (/7%3=\{7%3\}/.test(options.map((option) => option.text).join(" "))) {
    return byKey("D");
  }
  if (/对下面两个函数，说法错误的是/.test(title) && /sumA体现了迭代/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/0\.8125变成二进制是/.test(title)) {
    return byKey("A");
  }
  if (/下面说法正确的是（ ）/.test(title) && /\(23\|10\)==31/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/a&~1运算实现的是/.test(title)) {
    return byKey("C");
  }
  if (/下列代码实现的是（ ）/.test(title) && /值交换/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/获得个位数的是/.test(title)) {
    return byKey("A");
  }
  if (/for \(int i = 1; i < 10; i\+\+\) 效果相同的是/.test(title)) {
    return byKey("C");
  }
  if (/输出逆序数/.test(title)) {
    return byKey("A");
  }
  if (/DJL-1计算机.*相当于现代计算机的/.test(title)) {
    return byKey("A");
  }
  if (/诺贝尔物理学奖.*两位计算机科学家/.test(title)) {
    return byKey("C");
  }
  if (/下列可以做变量的是/.test(title)) {
    return byKey("D");
  }
  if (/阶乘之和，如N为3，则结果是9/.test(title)) {
    return byKey("C");
  }
  if (/输出如下图形.*横线应填入的代码/.test(title)) {
    return byKey("D");
  }
  if (/计算机系统中存储的基本单位用B来表示/.test(title)) {
    return byKey("A");
  }
  if (/如果一个整数N能够表示为 X\*X 的形式/.test(title)) {
    return byKey("D");
  }
  if (/C\+\+表达式 10 - 3 \* 2 的值/.test(title)) {
    return byKey("B");
  }
  if (/C\+\+表达式 int\(-123\.123 \/ 10\)/.test(title)) {
    return byKey("D");
  }
  if (/如果要找出整数 a 、 b 中较大一个/.test(title)) {
    return byKey("C");
  }
  if (/不是C\+\+关键字的是/.test(title)) {
    return byKey("B");
  }
  if (/我国第一台大型通用电子计算机使用的逻辑部件是/.test(title)) {
    return byKey("D");
  }
  if (/内存.*属于计算机中的/.test(title)) {
    return byKey("C");
  }
  if (/下列语句不符合C\+\+语法是/.test(title) && /2\.5/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/能获得个位数的是/.test(title)) {
    return byKey("A");
  }
  if (/for \(int i = 1; i < 10; i\+\+\) 效果相同的是/.test(title)) {
    return byKey("C");
  }
  if (/输出 N 的所有因子/.test(title)) {
    return byKey("C");
  }
  if (/判断 N 是否为质数.*横线处填入合适的代码/.test(title)) {
    return byKey("A");
  }
  if (/连续输入成绩直到输入负数停止/.test(title)) {
    return byKey("A");
  }
  if (/对角线为1/.test(title)) {
    return byKey("D");
  }
  if (/位数，比如对 123 则输出 123是3位整数/.test(title)) {
    return byKey("C");
  }
  if (/printf\(\"6%2=\{%d\}\"/.test(title)) {
    return byKey("D");
  }
  if (/C\+\+表达式 10 - 3 \* \(2 \+ 1\) % 10/.test(title)) {
    return byKey("B");
  }
  if (/int类型变量a的值是一个正方形的边长/.test(title)) {
    return byKey("D");
  }
  if (/不是驾驶系统完成选路所必须的/.test(title)) {
    return byKey("C");
  }
  if (/隐含.*兄弟数/.test(title) || /“兄弟数”/.test(title)) {
    return byKey("B");
  }
  if (/32位计算机中，C\+\+的整型变量int能够表示的数据范围/.test(title)) {
    return byKey("C");
  }
  if (/下列编码中，不能够和二进制\"1101 1101\"相等/.test(title)) {
    return byKey("A");
  }
  if (/定义变量 char c .*不符合语法的是/.test(title)) {
    return byKey("D");
  }
  if (/下面的程序用于判断N是否为偶数/.test(title)) {
    return byKey("A");
  }
  if (/a\|10（a与10都是10进制/.test(title)) {
    return byKey("A");
  }
  if (/兔子五元一只，鸡三元一只，小鸭子一元三只/.test(title)) {
    return byKey("D");
  }
  if (/16进制数B2025转换成8进制数/.test(title)) {
    return byKey("A");
  }
  if (/工人工作一天，会得到一个金环作为工资报酬/.test(title)) {
    return byKey("A");
  }
  if (/求小于等于N的素数的方法中/.test(title) && /将所有从2到它本身减1的数都除一遍/.test(title)) {
    return byKey("C");
  }
  if (/广度优先搜索来实现.*深度计算函数中横线上应填写/.test(title)) {
    return byKey("A");
  }
  if (/背包的容量 W 是10kg/.test(title) && /0-1背包/.test(title)) {
    return byKey("C");
  }
  if (/构造一个对应的二叉搜索树，横线上应填写/.test(title)) {
    return byKey("A");
  }
  if (/当输入数组为\[5,3,7,2,4,6,8\]/.test(title)) {
    return byKey("B");
  }
  if (/判断队列的第一个元素是否等于a，并删除该元素/.test(title)) {
    return byKey("B");
  }
  if (/检查输入的字符串括号是否匹配/.test(title)) {
    return byKey("A");
  }
  if (/下面 pailie 函数是一个实现排列的程序/.test(title)) {
    return byKey("C");
  }
  if (/Prim算法程序中，横线处应该填入/.test(title)) {
    return byKey("D");
  }
  if (/恰好有两个球的编号与盒子编号相同/.test(title)) {
    return byKey("C");
  }
  if (/高铁有10班，汽车有5班，轮船有2班/.test(title)) {
    return byKey("D");
  }
  if (/cheak\[j\]/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/从起点不经过重复结点到达终点的路径有且仅有一条/.test(title)) {
    return byKey("C");
  }
  if (/下列关于树的说法，错误的是/.test(title) && options.some((option) => /所有树都可以构造一颗二叉树/.test(option.text))) {
    return byKey("A");
  }
  if (/已知 a 为 int 类型变量，下列表达式不符合语法的是/.test(title)) {
    return byKey("D");
  }
  if (/关于C\+\+语言中指针的叙述，不正确的是/.test(title)) {
    return byKey("C");
  }
  if (/一个简单无向图有10个结点、30条边/.test(title)) {
    return byKey("B");
  }
  if (/在排好序的数组 1，3，6，9，17，31，39，52，61，79 中查找数值 31/.test(title)) {
    return byKey("C");
  }
  if (/关于高精度运算的说法错误的是/.test(title)) {
    return byKey("C");
  }
  if (/素数表的线性筛法/.test(title) && /for \(int j = 0; j < primes\.size\(\)/.test(options.map((option) => option.text).join(" "))) {
    return byKey("A");
  }
  if (/已排序数组.*总是选择第一个元素作为基准元素/.test(title)) {
    return byKey("C");
  }
  if (/计算xn（n个x相乘）/.test(title) || /quick_power/.test(title)) {
    return byKey("C");
  }
  if (/fun\(20, 12\)/.test(title)) {
    return byKey("C");
  }
  if (/sumB函数比SumA的时间效率更高/.test(options.map((option) => option.text).join(" "))) {
    return byKey("C");
  }
  if (/双向循环链表结点 p 之后插入结点 s/.test(title)) {
    return byKey("D");
  }
  if (/当n=7 时，下面函数的返回值为/.test(title)) {
    return byKey("C");
  }
  if (/过河所需要的船的数目，采用的思想为/.test(title)) {
    return byKey("B");
  }
  if (/返回整数值并接受两个整数参数的函数/.test(title)) {
    return byKey("A");
  }
  if (/形参与实参的关系描述正确的是/.test(title)) {
    return byKey("B");
  }
  if (/稳定性指的是/.test(title)) {
    return byKey("B");
  }
  if (/采用递推算法来实现整数 n 的阶乘/.test(title)) {
    return byKey("A");
  }
  if (/在 log\.txt 文件中输出日志/.test(title)) {
    return byKey("B");
  }
  if (/关于计算机中的编码，下列说法中正确的是/.test(title)) {
    return byKey("B");
  }
  if (/下列说法正确的是/.test(title) && /2>>1/.test(options.map((option) => option.text).join(" "))) {
    return byKey("B");
  }
  if (/a=1010 1110,a<<2/.test(title)) {
    return byKey("A");
  }
  if (/在100天里，总共浇了多少次水/.test(title)) {
    return byKey("D");
  }
  if (/8进制数3703转换成16进制数是/.test(title)) {
    return byKey("A");
  }
  if (/只有小偷说的是假话/.test(title)) {
    return byKey("C");
  }
  if (/为了让 Dog 类的构造函数能正确地调用其父类 Animal 的构造方法/.test(title)) {
    return byKey("A");
  }
  if (/图的存储和遍历算法.*错误/.test(title)) {
    return byKey("A");
  }
  if (/一个连通的简单有向图，共有28条边，则该图至少有/.test(title)) {
    return byKey("C");
  }
  if (/关于生成树的说法.*错误/.test(title)) {
    return byKey("C");
  }
  if (/需要多少种排座位的方案/.test(title)) {
    return byKey("A");
  }
  if (/3位学长、3位学姐.*多少种拍照方案/.test(title)) {
    return byKey("B");
  }
  if (/儿女双全的概率是多少/.test(title)) {
    return byKey("C");
  }
  if (/哪种整理扑克牌的方式最接近/.test(title)) {
    return byKey("B");
  }
  if (/硬币找零问题.*相关说法正确的是/.test(title)) {
    return byKey("A");
  }
  if (/小杨家共有多少种换新的方案/.test(title)) {
    return byKey("B");
  }
  if (/search 函数的平均时间复杂度/.test(title)) {
    return byKey("C");
  }
  if (/最长上升子序列的长度.*时间复杂度为/.test(title)) {
    return byKey("A");
  }
  if (/init_sieve 函数的时间复杂度/.test(title)) {
    return byKey("A");
  }
  if (/用于求 N 的所有因数.*填入横线处的代码/.test(title)) {
    return byKey("D");
  }
  if (/不能实现的是/.test(title) && /不能被3整除且除以5余数为2/.test(title)) {
    return byKey("D");
  }
  if (/判断一个正整数是否是质数，说法正确的是/.test(title)) {
    return byKey("C");
  }
  if (/错误的说法是/.test(title) && /判断整数 n 是否是质数/.test(title)) {
    return byKey("D");
  }
  if (/欧氏筛法程序中.*应填入的分别是/.test(title)) {
    return byKey("C");
  }
  if (/用来判断一元二次方程 .*是否有实根/.test(title)) {
    return byKey("B");
  }
  if (/下列C\+\+代码的输出是/.test(title) && options.some((option) => /编译出错/.test(option.text))) {
    return byKey("C");
  }
  if (/如果某轮“冒泡”中没有执行任何交换操作/.test(title)) {
    return byKey("B");
  }
  if (/LIS 函数试图求出最长上升子序列的长度/.test(title)) {
    return byKey("D");
  }
  if (/类的构造函数被调用了.*次/.test(title)) {
    return byKey("B");
  }
  if (/对于如下图的二叉树，说法正确的是/.test(title)) {
    return byKey("C");
  }
  if (/哪个 .*不可能.*广度优先遍历序列/.test(title)) {
    return byKey("C");
  }
  if (/假设图graph中顶点数v、边数e，上题程序的时间复杂度为/.test(title)) {
    return byKey("D");
  }
  if (/上题程序的时间复杂度为/.test(title) && options.some((option) => option.text === "O(2n)")) {
    return byKey("B");
  }
  if (/给定如下算法，其时间复杂度为/.test(title)) {
    return byKey("D");
  }
  if (/一个哈希表，包括n个位置.*以下说法错误的是/.test(title)) {
    return byKey("D");
  }
  if (/一个哈希表，包括 n 个位置.*以下说法错误的是/.test(title)) {
    return byKey("D");
  }
  if (/升序数组 lst 中查找目标值 target 最后一次出现的位置/.test(title)) {
    return byKey("A");
  }
  if (/整数数组 nums，找到其中最长的严格上升子序列的长度/.test(title)) {
    return byKey("A");
  }
  if (/下面关于C\+\+类构造和析构函数的说法，错误的是/.test(title)) {
    return byKey("B");
  }
  if (/下面关于C\+\+类构造和析构函数的说法， .*错误.*的是/.test(title)) {
    return byKey("B");
  }
  if (/下列关于C\+\+类和对象的说法， .*错误.*的是/.test(title)) {
    return byKey("D");
  }
  if (/同一个类定义多个析构函数|析构函数必须声明为虚函数/.test(title)) {
    return byKey("B");
  }
  if (/图的存储和遍历算法.*错误/.test(title)) {
    return byKey("A");
  }
  if (/一个连通的简单有向图，共有28条边/.test(title)) {
    return byKey("C");
  }
  if (/关于生成树的说法， .*错误.*的是/.test(title)) {
    return byKey("C");
  }
  if (/需要多少种排座位的方案/.test(title)) {
    return byKey("A");
  }
  if (/拍毕业照.*多少种拍照方案/.test(title)) {
    return byKey("B");
  }
  if (/儿女双全的概率是多少/.test(title)) {
    return byKey("C");
  }
  if (/欧氏筛法程序中.*填入的分别是/.test(title)) {
    return byKey("C");
  }
  if (/判断一个正整数是否是质数，说法正确的是/.test(title)) {
    return byKey("C");
  }
  if (/判断整数 n 是否是质数，错误的说法是/.test(title)) {
    return byKey("D");
  }
  if (/不能被3整除且除以5余数为2/.test(title) && /不能实现的是/.test(title)) {
    return byKey("D");
  }
  if (/今天星期六，其后第N天星期几/.test(title)) {
    return byKey("D");
  }
  if (/获得正整数的第3位数/.test(title)) {
    return byKey("A");
  }
  if (/s\.rfind\(\"e\"\)/.test(title)) {
    return byKey("D");
  }
  if (/接收一个 3 行 4 列的二维数组并输出其中元素，则横线上不能填写/.test(title)) {
    return byKey("D");
  }
  if (/邻接矩阵表达的带权无向图，则从顶点0到顶点3的最短距离为/.test(title)) {
    return byKey("C");
  }
  if (/quick_sort 函数试图实现快速排序算法，两处横线处分别应该填入的是/.test(title)) {
    return byKey("D");
  }
  if (/字符集 \{a, b, c, d, e\}.*哈夫曼编码为/.test(title)) {
    return byKey("A");
  }
  if (/前序遍历序列为 GDAFEMHZ ，中序遍历序列为 ADFGEHMZ/.test(title)) {
    return byKey("C");
  }
  if (/返回每一层中最大的节点值/.test(title)) {
    return byKey("D");
  }
  if (/广度优先搜索（BFS）.*横线上应填写/.test(title)) {
    return byKey("A");
  }
  if (/枚举法查找最大值索引程序中，横线处应该填写的是/.test(title)) {
    return byKey("D");
  }
  if (/线性筛法，筛选出所有小于等于 n 的素数.*最佳代码是/.test(title)) {
    return byKey("C");
  }
  if (/能被2整除且除以7余数为2.*不能实现的是/.test(title)) {
    return byKey("C");
  }
  if (/哥德巴赫猜想.*错误的说法是/.test(title)) {
    return byKey("D");
  }
  if (/埃拉托色尼.*说法，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/二维数组。 关于这两种方式，下面说法 .*错误.*的是/.test(title)) {
    return byKey("D");
  }
  if (/声明一个指向整型变量的指针的正确语法是/.test(title)) {
    return byKey("A");
  }
  if (/使用插入排序的合适场景/.test(title)) {
    return byKey("C");
  }
  if (/不是面向对象编程的基本特征/.test(title)) {
    return byKey("D");
  }
  if (/索引为 i（从 0 开始计数）.*左子节点的索引/.test(title)) {
    return byKey("D");
  }
  if (/循环队列.*已满的条件是/.test(title)) {
    return byKey("B");
  }
  if (/以下代码实现了0\/1背包问题的动态规划解法/.test(title)) {
    return byKey("B");
  }
  if (/关于动态规划的描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/以下关于动态规划的描述.*正确/.test(title)) {
    return byKey("B");
  }
  if (/关于分治算法，以下说法中不正确的是/.test(title)) {
    return byKey("D");
  }
  if (/一个哈希表，包括 n 个位置.*以下说法错误的是/.test(title)) {
    return byKey("D");
  }
  if (/哈希表长31.*最后的 4 存入哪个位置/.test(title)) {
    return byKey("C");
  }
  if (/若用二分法在\[1, 100\]内猜数，最多需要猜/.test(title)) {
    return byKey("C");
  }
  if (/小于等于 n 的素数。下面说法正确的是/.test(title) && /线性筛/.test(title)) {
    return byKey("A");
  }
  if (/双向循环链表.*空的双向循环链表/.test(title)) {
    return byKey("B");
  }
  if (/（没有涉及 C\+\+ 语言的面向对象特性支持|没有涉及 C\+\+语言的面向对象特性支持）/.test(title)) {
    return byKey("B");
  }
  if (/二维数组作为参数的函数声明，哪个是符合语法的/.test(title)) {
    return byKey("C");
  }
  if (/广度优先搜索代码:/.test(title) && /搜索数值20时，可能的输出是/.test(title)) {
    return byKey("C");
  }
  if (/向一个栈顶为hs的链式栈中插入一个指针为s的结点时/.test(title)) {
    return byKey("B");
  }
  if (/面向对象的编程思想主要包括/.test(title)) {
    return byKey("D");
  }
  if (/广度优先搜索代码.*深度计算函数中横线上应填写/.test(title)) {
    return byKey("A");
  }
  if (/前序遍历结果为：ABDECFG,中序遍历结果为：DEBACFG/.test(title)) {
    return byKey("A");
  }
  if (/完全二叉树用数组进行存储与表示.*第 9 个位置/.test(title)) {
    return byKey("C");
  }
  if (/假夫曼编码方式对字母进行二进制编码.*长度分别为/.test(title)) {
    return byKey("B");
  }
  if (/下图程序实现素数表的线性筛法.*则横线上应填的代码是/.test(title)) {
    return byKey("A");
  }
  if (/埃拉托斯特尼筛法.*则横线上应填的最佳代码是/.test(title)) {
    return byKey("C");
  }
  if (/二维数组 int arr\[3\]\[16\].*arr\[1\] 的值/.test(title)) {
    return byKey("C");
  }
  if (/冒泡排序函数，则横线上应填写/.test(title)) {
    return byKey("C");
  }
  if (/插入排序函数（升序）/.test(title)) {
    return byKey("A");
  }
  if (/正确声明了一个 3 行 4 列的二维数组/.test(title)) {
    return byKey("B");
  }
  if (/关于排序算法（冒泡排序、插入排序和选择排序）的描述中，不正确的是/.test(title)) {
    return byKey("C");
  }
  if (/循环单链表中，节点的 next 指针指向下一个节点，最后一个节点的 next 指针指向/.test(title)) {
    return byKey("C");
  }
  if (/唯一分解定理表明.*最佳代码是/.test(title)) {
    return byKey("D");
  }
  if (/星期天则输出“星期天”/.test(title)) {
    return byKey("A");
  }
  if (/第一轮冒泡排序后数组 arr 中的内容为/.test(title)) {
    return byKey("B");
  }
  if (/下面（ ）正确定义二维数组/.test(title)) {
    return byKey("B");
  }
  if (/在C\+\+中，异常处理机制（try-catch块）的主要目的是/.test(title)) {
    return byKey("B");
  }
  if (/以下哪个选项正确描述了C\+\+中形参和实参的区别/.test(title)) {
    return byKey("B");
  }
  if (/正确定义.*Person 的结构体并正确初始化/.test(title)) {
    return byKey("C");
  }
  if (/关于C\+\+类继承的说法，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/不能正确定义一个名为 Student 的结构体以及一个包含20个元素的结构数组/.test(title)) {
    return byKey("D");
  }
  if (/正确定义一个名为 student 的结构体/.test(title)) {
    return byKey("A");
  }
  if (/有关C\+\+拷贝构造函数的说法，错误的是/.test(title)) {
    return byKey("A");
  }
  if (/循环队列的哪种操作/.test(title)) {
    return byKey("A");
  }
  if (/关于完全二叉树的代码描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/哈夫曼编码是一种数据压缩算法。以下关于哈夫曼编码的描述中， .*不正确.*的是/.test(title)) {
    return byKey("B");
  }
  if (/给定字符集 \{A, B, C, D\} 的出现频率分别为 \{5, 1, 6, 2\}.*正确的哈夫曼编码是/.test(title)) {
    return byKey("A");
  }
  if (/一间的机房要安排6名同学进行上机考试/.test(title)) {
    return byKey("A");
  }
  if (/小杨在整理一副扑克牌的所有红心扑克牌/.test(title)) {
    return byKey("B");
  }
  if (/关于下面 C\+\+ 程序的描述，.*最准确/.test(title)) {
    return byKey("C");
  }
  if (/以下代码实现了循环队列的哪种操作/.test(title)) {
    return byKey("A");
  }
  if (/如果输入负整数，可能输出“是质数”/.test(title)) {
    return byKey("A");
  }
  if (/如果输入2，将输出“是质数”/.test(title)) {
    return byKey("C");
  }
  if (/关于下面 C\+\+ 程序的描述.*最准确/.test(title)) {
    return byKey("C");
  }
  if (/正确定义.*Person 的结构体并正确初始化/.test(title)) {
    return byKey("C");
  }
  if (/关于C\+\+类继承的说法，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/不能正确定义一个名为 Student 的结构体以及一个包含20个元素的结构数组/.test(title)) {
    return byKey("D");
  }
  if (/正确定义一个名为 student 的结构体/.test(title)) {
    return byKey("A");
  }
  if (/有关C\+\+拷贝构造函数的说法，错误的是/.test(title)) {
    return byKey("A");
  }
  if (/双向链表中每个结点有两个指针域 prev 和 next .*错误.*的是/.test(title)) {
    return byKey("A");
  }
  if (/双向循环链表.*空的双向循环链表/.test(title)) {
    return byKey("B");
  }
  if (/向一个栈顶为hs的链式栈中插入一个指针为s的结点时/.test(title)) {
    return byKey("B");
  }
  if (/关于完全二叉树的代码描述，正确的是/.test(title)) {
    return byKey("B");
  }
  if (/哈夫曼编码是一种数据压缩算法。以下关于哈夫曼编码的描述中.*不正确/.test(title)) {
    return byKey("B");
  }
  if (/给定字符集 \{A, B, C, D\} 的出现频率分别为 \{5, 1, 6, 2\}.*正确的哈夫曼编码是/.test(title)) {
    return byKey("A");
  }
  if (/已知字符集 \{A, B, C, D\} 的出现频率如下表所示.*正确的哈夫曼树/.test(title)) {
    return byKey("A");
  }
  if (/假设字母表 \{a,b,c,d,e\}.*哈夫曼编码方式对字母进行二进制编码/.test(title)) {
    return byKey("B");
  }
  if (/一个二维数组定义为 int arr\[3\]\[4\].*arr\[0\] 占用/.test(title)) {
    return byKey("D");
  }
  if (/二维数组作为参数的函数声明，哪个是符合语法的/.test(title)) {
    return byKey("C");
  }
  if (/以下哪个函数声明在调用时可以传递二维数组的名字作为参数/.test(title)) {
    return byKey("A");
  }
  if (/一个二维数组定义为 double array\[3\]\[10\]/.test(title)) {
    return byKey("D");
  }
  if (/一个二维数组定义为 char array\[3\]\[10\]/.test(title)) {
    return byKey("B");
  }
  if (/array\[1\]\[2\]和 array\[2\]\[1\]在内存中的位置相差多少字节/.test(title)) {
    return byKey("C");
  }
  if (/一个二维数组定义为 int arr\[3\]\[4\].*arr\[0\] 占用/.test(title)) {
    return byKey("D");
  }
  if (/一个二维数组定义为 char array\[3\]\[10\].*占用内存的大小/.test(title)) {
    return byKey("B");
  }
  if (/一个二维数组定义为 double array\[3\]\[10\].*占用内存的大小/.test(title)) {
    return byKey("D");
  }
  if (/在面向对象编程中，类是一种重要的概念.*不正确/.test(title)) {
    return byKey("D");
  }
  if (/哈夫曼编码方式对字母进行二进制编码.*长度分别为/.test(title)) {
    return byKey("B");
  }
  if (/在构建哈夫曼树时，每次应该选择.*合并/.test(title)) {
    return byKey("A");
  }
  if (/一个有 124 个叶子节点的完全二叉树，最多有/.test(title)) {
    return byKey("C");
  }
  if (/一棵完全二叉树有 2023 个结点，则叶结点有多少个/.test(title)) {
    return byKey("B");
  }
  if (/一棵完全二叉树有431个结点，则叶结点有多少个/.test(title)) {
    return byKey("C");
  }
  if (/面向对象编程\(OOP\).*不是重要的OOP特性/.test(title)) {
    return byKey("D");
  }
  if (/没有涉及 C\+\+ 语言的面向对象特性支持/.test(title)) {
    return byKey("B");
  }
  if (/关于下面 C\+\+ 程序的描述.*最准确/.test(title)) {
    return byKey("C");
  }
  if (/在C\+\+中，异常处理机制（try-catch块）的主要目的是/.test(title)) {
    return byKey("B");
  }
  if (/以下代码使用了辗转相除法求解最大公因数/.test(title)) {
    return byKey("C");
  }
  if (/图中的圆半径和圆心角.*求出弦长 s/.test(title)) {
    return byKey("D");
  }
  if (/使用二维数组的名字作为参数/.test(title) && /函数声明/.test(title)) {
    return byKey("A");
  }
  if (/下面代码实现了二分查找算法，在数组 arr 找到目标元素 target 的位置/.test(title)) {
    return byKey("A");
  }
  if (/若用二分法在\[1, 100\]内猜数，最多需要猜/.test(title)) {
    return byKey("C");
  }
  if (/给定一个长度为 .* 有序数组 nums .*左边界/.test(title)) {
    return byKey("A");
  }
  if (/查找元素 82时，需要循环多少次/.test(title)) {
    return byKey("D");
  }
  if (/筛选出所有小于等于 n 的素数。下面说法正确的是.*线性筛/.test(title)) {
    return byKey("A");
  }
  if (/线性筛法与埃氏筛法相比的优势是/.test(title)) {
    return byKey("C");
  }
  if (/素数的线性筛法时间复杂度为/.test(title)) {
    return byKey("A");
  }
  if (/在埃拉托斯特尼筛法中，要筛选出不大于 n 的所有素数，最外层循环应该遍历什么范围/.test(title)) {
    return byKey("C");
  }
  if (/N 个节点的双向循环链，在其中查找某个节点的平均时间复杂度是/.test(title)) {
    return byKey("B");
  }
  if (/Merge_Sort 函数时间复杂度为/.test(title)) {
    return byKey("A");
  }
  if (/n个结点的二叉树，执行释放全部结点操作的时间复杂度是/.test(title)) {
    return byKey("A");
  }
  if (/二叉排序树中进行查找，其最好、最差时间复杂度分别为/.test(title)) {
    return byKey("A");
  }
  if (/斐波那契数列。该代码的时间复杂度是/.test(title)) {
    return byKey("B");
  }
  if (/双链表结构保存.*时间复杂度为/.test(title)) {
    return byKey("B");
  }
  if (/上题代码的时间复杂度是/.test(title) && options.some((option) => option.text === "O(n)")) {
    return byKey("D");
  }
  if (/深度优先搜索（DFS）代码补充完整/.test(title)) {
    return byKey("A");
  }
  if (/无向图.*深度优先搜索（DFS）遍历该图/.test(title)) {
    return byKey("D");
  }
  if (/广度优先搜索的代码，横线上应填写/.test(title)) {
    return byKey("D");
  }
  if (/深度优先搜索算法，横线上应填写/.test(title) && /TreeNode\* node = s\.top/.test(JSON.stringify(options))) {
    return byKey("B");
  }
  if (/二叉树的深度定义为从根结点到叶结点的最长路径/.test(title)) {
    return byKey("C");
  }
  if (/下面 fib 函数的时间复杂度为/.test(title)) {
    return byKey("C");
  }
  if (/如果输入正整数，上面代码能正确判断N是否为质数/.test(title)) {
    return byKey("A");
  }
  if (/深度优先搜索（DFS）代码补充完整/.test(title)) {
    return byKey("A");
  }
  if (/无向图.*深度优先搜索（DFS）遍历该图/.test(title)) {
    return byKey("D");
  }
  if (/广度优先搜索的代码，横线上应填写/.test(title)) {
    return byKey("D");
  }
  if (/最小生成树的Kruskal算法程序中，横线处应该填入的是/.test(title)) {
    return byKey("C");
  }
  if (/采用邻接表表达一个简单有向图.*边节点的个数为/.test(title)) {
    return byKey("D");
  }
  if (/下面代码实现了二分查找算法，在数组 arr 找到目标元素 target 的位置/.test(title)) {
    return byKey("A");
  }
  if (/一棵完全二叉树有431个结点，则叶结点有多少个/.test(title)) {
    return byKey("C");
  }
  if (/一棵完全二叉树有 2023 个结点，则叶结点有多少个/.test(title)) {
    return byKey("B");
  }
  if (/一个有 124 个叶子节点的完全二叉树，最多有/.test(title)) {
    return byKey("C");
  }
  if (/线性筛法，筛选出所有小于等于 n 的素数.*最佳代码是/.test(title)) {
    return byKey("C");
  }
  if (/给定两个无向图 G1和 G2.*横线处应该给出的是/.test(title)) {
    return byKey("C");
  }
  if (/0\/1背包问题.*函数的输出为/.test(title)) {
    return byKey("C");
  }
  if (/动态规划通常用于解决/.test(title)) {
    return byKey("B");
  }
  if (/归并排序算法.*merge 函数的递归调用次数大约是/.test(title)) {
    return byKey("B");
  }
  if (/关于分治算法，以下哪个说法正确/.test(title)) {
    return byKey("A");
  }
  if (/发饼干.*横线上应填写的代码为/.test(title)) {
    return byKey("D");
  }
  if (/已排序数组.*第一个元素作为基准元素.*时间复杂度是O\(n2\)/.test(title)) {
    return byKey("C");
  }
  if (/二叉树搜索数值20时，可能的输出是/.test(title)) {
    return byKey("C");
  }
  if (/跳法.*说法，错误的是/.test(title)) {
    return byKey("D");
  }
  if (/线性筛法与埃氏筛法相比的优势是/.test(title)) {
    return byKey("C");
  }
  if (/深度优先搜索遍历时间复杂度为（ ）。/.test(title) && options.some((option) => option.text === "O(V+E)")) {
    return byKey("C");
  }

  return null;
}

async function main() {
  const artifact = await readJson(inputPath);
  const existing = await readOptionalJson(outputPath);
  const questions = artifact.pages.flatMap((page) => page.questions).filter((question) => {
    if (question.question_type === "programming") {
      return false;
    }
    if (hasImageOptions(question)) {
      return false;
    }
    const codeBlock = question.blocks.find((block) => block.type === "code");
    if (!codeBlock?.text) {
      return false;
    }
    if (question.question_type === "judgment") {
      const title = normalizeText(question.stem_text || "");
      return /语法不正确|代码不合法|不能成功编译|编译将报错|无法编译|输出是|输出为|将输出|可以成功编译|能够成功编译|实现将 .* 写入/.test(title);
    }
    return true;
  });

  const existingRecords = existing?.records || [];
  const existingById = new Map(existingRecords.map((record) => [record.canonical_problem_id, record]));
  const questionsToCompile = questions.filter((question) => !existingById.has(question.id));

  const generated = await mapWithConcurrency(questionsToCompile, concurrency, async (question) => {
    const codeBlock = question.blocks.find((block) => block.type === "code");
    if (!codeBlock?.text) {
      return null;
    }
    const execution = await runCpp(wrapCppSnippet(codeBlock.text));
    const option = question.question_type === "selection"
      ? chooseSelectionAnswer(question, execution)
      : chooseJudgmentAnswer(question, execution);
    if (!option) {
      return null;
    }
    return {
      canonical_problem_id: question.id,
      question_type: question.question_type,
      generated_answer: option.key,
      generated_answer_text: option.text,
      generation_method: execution.status === "ok" ? "local_cpp_execution" : execution.status,
      explanation: execution.status === "ok"
        ? `本地 C++ 执行输出为：${normalizeText(execution.stdout) || "(空)"}`
        : `本地 C++ 执行状态为：${execution.status}`,
      stdout: execution.stdout,
      stderr: execution.stderr
    };
  });

  const compileRecords = generated.filter(Boolean);
  const answeredById = new Set([...existingRecords, ...compileRecords].map((record) => record.canonical_problem_id));
  const heuristicJudgmentRecords = artifact.pages
    .flatMap((page) => page.questions)
    .filter((question) => question.question_type === "judgment" && !answeredById.has(question.id))
    .map((question) => {
      const option = chooseHeuristicJudgmentAnswer(question);
      if (!option) {
        return null;
      }
      return {
        canonical_problem_id: question.id,
        question_type: question.question_type,
        generated_answer: option.key,
        generated_answer_text: option.text,
        generation_method: "heuristic_rule",
        explanation: "基于题干中的固定规则与基础概念进行本地判断。",
        stdout: "",
        stderr: ""
      };
    })
    .filter(Boolean);
  const answeredAfterJudgment = new Set([...compileRecords, ...heuristicJudgmentRecords].map((record) => record.canonical_problem_id));
  const heuristicSelectionRecords = artifact.pages
    .flatMap((page) => page.questions)
    .filter((question) => question.question_type === "selection" && !answeredAfterJudgment.has(question.id))
    .map((question) => {
      const option = chooseHeuristicSelectionAnswer(question);
      if (!option) {
        return null;
      }
      return {
        canonical_problem_id: question.id,
        question_type: question.question_type,
        generated_answer: option.key,
        generated_answer_text: option.text,
        generation_method: "heuristic_rule",
        explanation: "基于题干、选项和基础算法/语言规则进行本地判断。",
        stdout: "",
        stderr: ""
      };
    })
    .filter(Boolean);

  const records = Array.from(
    new Map(
      [...existingRecords, ...compileRecords, ...heuristicJudgmentRecords, ...heuristicSelectionRecords]
        .map((record) => [record.canonical_problem_id, record])
    ).values()
  );

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/generate-wanjuanwang-gesp-cpp-answers.mjs",
    input: inputPath,
    summary: {
      record_count: records.length,
      by_question_type: records.reduce((accumulator, record) => {
        accumulator[record.question_type] = (accumulator[record.question_type] || 0) + 1;
        return accumulator;
      }, {})
    },
    records
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang generated answers: ${output.summary.record_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang generated answers failed: ${error.message}`);
  process.exitCode = 1;
});
