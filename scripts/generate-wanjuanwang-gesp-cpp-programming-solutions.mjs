import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { execFile, spawnSync } from "node:child_process";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const inputPath = "data/wanjuanwang-ingestion/wanjuanwang-gesp-cpp-exams.json";
const outputPath = "data/classification/wanjuanwang-gesp-cpp-programming-solutions.json";

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

async function runCpp(code, sampleInput) {
  const dir = await mkdtemp(join(tmpdir(), "wanjuanwang-prog-"));
  const sourcePath = join(dir, "main.cpp");
  const outputPath = join(dir, "main.out");
  await writeFile(sourcePath, code);

  try {
    await execFileAsync("/usr/bin/clang++", ["-std=c++17", sourcePath, "-O2", "-o", outputPath], {
      timeout: 15_000,
      maxBuffer: 1024 * 1024
    });
    const result = spawnSync(outputPath, [], {
      input: sampleInput,
      encoding: "utf8",
      timeout: 5_000,
      maxBuffer: 1024 * 1024
    });
    await rm(dir, { recursive: true, force: true });
    return {
      status: result.status === 0 ? "ok" : "failed",
      stdout: String(result.stdout || "").trim(),
      stderr: String(result.stderr || "").trim()
    };
  } catch (error) {
    await rm(dir, { recursive: true, force: true });
    return {
      status: "failed",
      stdout: String(error.stdout || "").trim(),
      stderr: String(error.stderr || error.message || "").trim()
    };
  }
}

function normalizeOutput(value) {
  return String(value || "").trim().replace(/\s+/g, " ");
}

function solutionLibrary() {
  return new Map([
    ["假期阅读", {
      algorithm: "直接计算",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long n, k, t;
    cin >> n >> k >> t;
    long long ans = k * t;
    if (ans > n) ans = n;
    cout << ans << "\\n";
    return 0;
}`
    }],
    ["值日", {
      algorithm: "最大公约数 / 最小公倍数",
      complexity: "O(log(min(m, n)))",
      code: `#include <iostream>
using namespace std;
long long gcdll(long long a, long long b) {
    while (b != 0) {
        long long t = a % b;
        a = b;
        b = t;
    }
    return a;
}
int main() {
    long long m, n;
    cin >> m >> n;
    cout << m / gcdll(m, n) * n << "\\n";
    return 0;
}`
    }],
    ["数三角形", {
      algorithm: "枚举统计",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    long long odd = (n + 1) / 2;
    long long total = n * (n + 1) / 2;
    long long bothOdd = odd * (odd + 1) / 2;
    cout << total - bothOdd << "\\n";
    return 0;
}`
    }],
    ["分糖果", {
      algorithm: "贪心",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long previous = 0;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long need;
        cin >> need;
        long long current = need;
        if (current <= previous) current = previous + 1;
        answer += current;
        previous = current;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["排序", {
      algorithm: "排序后统计逆序对",
      complexity: "O(n^2)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
struct Student {
    long long height;
    long long weight;
    int original;
};
int main() {
    int n;
    cin >> n;
    vector<Student> students(n);
    for (int i = 0; i < n; ++i) {
        cin >> students[i].height >> students[i].weight;
        students[i].original = i;
    }
    sort(students.begin(), students.end(), [](const Student& a, const Student& b) {
        if (a.height != b.height) return a.height > b.height;
        if (a.weight != b.weight) return a.weight > b.weight;
        return a.original < b.original;
    });
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            if (students[i].original > students[j].original) ++answer;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["幂和数", {
      algorithm: "枚举 2 的幂并去重",
      complexity: "O(log^2 r)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long l, r;
    cin >> l >> r;
    bool seen[10001] = {false};
    for (long long a = 1; a <= r; a <<= 1) {
        for (long long b = 1; a + b <= r; b <<= 1) {
            if (a + b >= l) seen[a + b] = true;
        }
    }
    long long ans = 0;
    for (long long x = l; x <= r; ++x) ans += seen[x];
    cout << ans << "\\n";
    return 0;
}`
    }],
    ["奇偶校验", {
      algorithm: "位计数",
      complexity: "O(n log V)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int total = 0;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        while (x) {
            total += x & 1;
            x >>= 1;
        }
    }
    cout << total << " " << (total % 2) << "\\n";
    return 0;
}`
    }],
    ["画布裁剪", {
      algorithm: "按边界截取子矩阵",
      complexity: "O(hw)",
      code: `#include <iostream>
#include <string>
using namespace std;
int main() {
    int h, w, x1, x2, y1, y2;
    cin >> h >> w >> x1 >> x2 >> y1 >> y2;
    for (int i = 1; i <= h; ++i) {
        string row;
        cin >> row;
        if (i >= x1 && i <= x2) {
            cout << row.substr(y1 - 1, y2 - y1 + 1) << "\\n";
        }
    }
    return 0;
}`
    }],
    ["学习小组", {
      algorithm: "动态规划",
      complexity: "O(n^2)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> activity(n + 1), dp(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> activity[i];
    for (int i = 1; i <= n; ++i) {
        for (int size = 1; size <= i; ++size) {
            dp[i] = max(dp[i], dp[i - size] + activity[size]);
        }
    }
    cout << dp[n] << "\\n";
    return 0;
}`
    }],
    ["词频统计", {
      algorithm: "哈希计数",
      complexity: "O(nL)",
      code: `#include <cctype>
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;
int main() {
    int n;
    cin >> n;
    unordered_map<string, int> freq;
    string best = "";
    int bestCount = -1;
    for (int i = 0; i < n; ++i) {
        string s;
        cin >> s;
        for (char &ch : s) ch = static_cast<char>(tolower(static_cast<unsigned char>(ch)));
        int current = ++freq[s];
        if (current > bestCount) {
            bestCount = current;
            best = s;
        }
    }
    cout << best << "\\n";
    return 0;
}`
    }],
    ["2025", {
      algorithm: "按位恒等式",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int x;
    cin >> x;
    int y = 2025 - x;
    if (y > 0) cout << y << "\\n";
    else cout << -1 << "\\n";
    return 0;
}`
    }],
    ["等差矩阵", {
      algorithm: "直接构造",
      complexity: "O(nm)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            if (j > 1) cout << ' ';
            cout << 1LL * i * j;
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["时间跨越", {
      algorithm: "模拟",
      complexity: "O(k/24)",
      code: `#include <iostream>
using namespace std;
bool isLeap(int year) {
    return (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
}
int daysInMonth(int year, int month) {
    static const int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (month == 2 && isLeap(year)) return 29;
    return days[month];
}
int main() {
    int y, m, d, h, k;
    cin >> y >> m >> d >> h >> k;
    h += k;
    while (h >= 24) {
        h -= 24;
        ++d;
        if (d > daysInMonth(y, m)) {
            d = 1;
            ++m;
            if (m > 12) {
                m = 1;
                ++y;
            }
        }
    }
    cout << y << "\\n" << m << "\\n" << d << "\\n" << h << "\\n";
    return 0;
}`
    }],
    ["数位和", {
      algorithm: "枚举数位",
      complexity: "O(n log V)",
      code: `#include <iostream>
using namespace std;
int digitSum(long long x) {
    int sum = 0;
    while (x > 0) {
        sum += x % 10;
        x /= 10;
    }
    return sum;
}
int main() {
    int n;
    cin >> n;
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        answer = max(answer, digitSum(x));
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["寻找倍数", {
      algorithm: "取最大值后整除校验",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int T;
    cin >> T;
    while (T--) {
        int n;
        cin >> n;
        vector<long long> a(n);
        long long mx = 0;
        for (int i = 0; i < n; ++i) {
            cin >> a[i];
            if (a[i] > mx) mx = a[i];
        }
        bool ok = true;
        for (int i = 0; i < n; ++i) {
            if (mx % a[i] != 0) {
                ok = false;
                break;
            }
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["小杨购物", {
      algorithm: "直接计算",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long n, a, b;
    cin >> n >> a >> b;
    cout << n / (a + b) << "\\n";
    return 0;
}`
    }],
    ["美丽数字", {
      algorithm: "遍历统计",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        if (x % 9 == 0 && x % 8 != 0) ++answer;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["小杨的幸运数字", {
      algorithm: "试除统计不同质因子",
      complexity: "O(n sqrt(V))",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    while (n--) {
        int x;
        cin >> x;
        int distinct = 0;
        for (int p = 2; 1LL * p * p <= x; ++p) {
            if (x % p != 0) continue;
            ++distinct;
            while (x % p == 0) x /= p;
        }
        if (x > 1) ++distinct;
        cout << (distinct == 2 ? 1 : 0) << "\\n";
    }
    return 0;
}`
    }],
    ["计数", {
      algorithm: "枚举并统计数位",
      complexity: "O(n log n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n, k;
    cin >> n >> k;
    int answer = 0;
    for (int x = 1; x <= n; ++x) {
        int value = x;
        while (value > 0) {
            if (value % 10 == k) ++answer;
            value /= 10;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["平方之和", {
      algorithm: "枚举平方数",
      complexity: "O(n sqrt(V))",
      code: `#include <cmath>
#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    while (n--) {
        int a;
        cin >> a;
        bool ok = false;
        for (int x = 1; 1LL * x * x < a && !ok; ++x) {
            int remain = a - x * x;
            int y = static_cast<int>(sqrt(remain));
            if (y > 0 && y * y == remain) ok = true;
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["立方数", {
      algorithm: "枚举立方根",
      complexity: "O(cuberoot(n))",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    bool ok = false;
    for (int x = 1; x * x * x <= n; ++x) {
        if (x * x * x == n) {
            ok = true;
            break;
        }
    }
    cout << (ok ? "Yes" : "No") << "\\n";
    return 0;
}`
    }],
    ["休息时间", {
      algorithm: "时间进位模拟",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int h, m, s, k;
    cin >> h >> m >> s >> k;
    int total = h * 3600 + m * 60 + s + k;
    cout << total / 3600 << " " << (total % 3600) / 60 << " " << total % 60 << "\\n";
    return 0;
}`
    }],
    ["乘法问题", {
      algorithm: "乘法模拟 + 上限截断",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long product = 1;
    bool overflow = false;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        if (!overflow) {
            product *= x;
            if (product > 1000000) overflow = true;
        }
    }
    if (overflow) cout << ">1000000\\n";
    else cout << product << "\\n";
    return 0;
}`
    }],
    ["小杨的日字矩阵", {
      algorithm: "直接构造",
      complexity: "O(n^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int mid = (n + 1) / 2;
    for (int i = 1; i <= n; ++i) {
        cout << '|';
        for (int j = 2; j <= n - 1; ++j) {
            if (i == 1 || i == n || i == mid) cout << '-';
            else cout << 'x';
        }
        cout << '|' << "\\n";
    }
    return 0;
}`
    }],
    ["字母求和", {
      algorithm: "按字符映射求和",
      complexity: "O(n)",
      code: `#include <cctype>
#include <iostream>
#include <string>
using namespace std;
int main() {
    int n;
    string s;
    cin >> n >> s;
    long long answer = 0;
    for (char ch : s) {
        if (islower(static_cast<unsigned char>(ch))) answer += ch - 'a' + 1;
        else answer -= static_cast<int>(ch);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["完全平方数", {
      algorithm: "枚举完全平方和",
      complexity: "O(n^2 + n sqrt(V))",
      code: `#include <cmath>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    int maxValue = 0;
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
        if (a[i] > maxValue) maxValue = a[i];
    }
    vector<int> squares;
    for (int x = 0; 1LL * x * x <= 2LL * maxValue; ++x) {
        squares.push_back(x * x);
    }
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            int sum = a[i] + a[j];
            int root = static_cast<int>(sqrt(sum));
            if (root * root == sum) ++answer;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["相似字符串", {
      algorithm: "分类讨论 + 双指针",
      complexity: "O(TL)",
      code: `#include <cmath>
#include <iostream>
#include <string>
using namespace std;
bool oneEditInsert(const string& shorter, const string& longer) {
    int i = 0, j = 0;
    bool used = false;
    while (i < (int)shorter.size() && j < (int)longer.size()) {
        if (shorter[i] == longer[j]) {
            ++i;
            ++j;
        } else {
            if (used) return false;
            used = true;
            ++j;
        }
    }
    return true;
}
bool similar(const string& a, const string& b) {
    if (a == b) return true;
    if (abs((int)a.size() - (int)b.size()) > 1) return false;
    if (a.size() == b.size()) {
        int diff = 0;
        for (int i = 0; i < (int)a.size(); ++i) diff += (a[i] != b[i]);
        return diff <= 1;
    }
    if (a.size() + 1 == b.size()) return oneEditInsert(a, b);
    if (b.size() + 1 == a.size()) return oneEditInsert(b, a);
    return false;
}
int main() {
    int T;
    cin >> T;
    while (T--) {
        string a, b;
        cin >> a >> b;
        cout << (similar(a, b) ? "similar" : "not similar") << "\\n";
    }
    return 0;
}`
    }],
    ["做题", {
      algorithm: "排序后贪心",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    sort(a.begin(), a.end());
    long long day = 0;
    for (long long x : a) {
        if (x > day) ++day;
    }
    cout << day << "\\n";
    return 0;
}`
    }],
    ["树上漫步", {
      algorithm: "树染色统计二分图大小",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    vector<int> color(n + 1, -1);
    vector<int> stack = {1};
    color[1] = 0;
    long long cnt[2] = {1, 0};
    for (int idx = 0; idx < (int)stack.size(); ++idx) {
        int u = stack[idx];
        for (int v : graph[u]) {
            if (color[v] != -1) continue;
            color[v] = color[u] ^ 1;
            ++cnt[color[v]];
            stack.push_back(v);
        }
    }
    for (int i = 1; i <= n; ++i) {
        if (i > 1) cout << ' ';
        cout << cnt[color[i]];
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["上学", {
      algorithm: "Dijkstra 最短路",
      complexity: "O((n+m) log n)",
      code: `#include <functional>
#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;
int main() {
    int n, m, s, q;
    cin >> n >> m >> s >> q;
    vector<vector<pair<int, int>>> graph(n + 1);
    for (int i = 0; i < m; ++i) {
        int u, v, w;
        cin >> u >> v >> w;
        graph[u].push_back({v, w});
        graph[v].push_back({u, w});
    }
    const long long INF = (1LL << 62);
    vector<long long> dist(n + 1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[s] = 0;
    pq.push({0, s});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d != dist[u]) continue;
        for (auto [v, w] : graph[u]) {
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    while (q--) {
        int h;
        cin >> h;
        cout << dist[h] << "\\n";
    }
    return 0;
}`
    }],
    ["图书馆里的老鼠", {
      algorithm: "直接计算",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n, x, y;
    cin >> n >> x >> y;
    cout << n - (y + x - 1) / x << "\\n";
    return 0;
}`
    }],
    ["B-smooth 数", {
      algorithm: "最小质因子筛",
      complexity: "O(n log log n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, B;
    cin >> n >> B;
    vector<int> spf(n + 1, 0);
    vector<int> primes;
    for (int i = 2; i <= n; ++i) {
        if (spf[i] == 0) {
            spf[i] = i;
            primes.push_back(i);
        }
        for (int p : primes) {
            if (p > spf[i] || 1LL * i * p > n) break;
            spf[i * p] = p;
        }
    }
    int answer = 1;
    for (int x = 2; x <= n; ++x) {
        int value = x;
        int maxPrime = 1;
        while (value > 1) {
            int p = spf[value];
            maxPrime = p;
            while (value % p == 0) value /= p;
        }
        if (maxPrime <= B) ++answer;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["区间乘积", {
      algorithm: "前缀奇偶质因子状态压缩",
      complexity: "O(n)",
      code: `#include <iostream>
#include <unordered_map>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    int masks[31] = {};
    int primes[] = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29};
    for (int x = 1; x <= 30; ++x) {
        int value = x;
        int mask = 0;
        for (int i = 0; i < 10; ++i) {
            int count = 0;
            while (value % primes[i] == 0) {
                value /= primes[i];
                count ^= 1;
            }
            if (count) mask |= (1 << i);
        }
        masks[x] = mask;
    }
    unordered_map<int, long long> freq;
    freq.reserve(n * 2 + 1);
    freq[0] = 1;
    long long answer = 0;
    int prefix = 0;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        prefix ^= masks[x];
        answer += freq[prefix];
        ++freq[prefix];
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["最大因数", {
      algorithm: "不断除以最小质因子并求 LCA 距离",
      complexity: "O(q sqrt(V))",
      code: `#include <iostream>
using namespace std;
long long parentNode(long long x) {
    if (x <= 1) return 0;
    for (long long p = 2; p * p <= x; ++p) {
        if (x % p == 0) return x / p;
    }
    return 1;
}
int depthNode(long long x) {
    int depth = 0;
    while (x > 1) {
        x = parentNode(x);
        ++depth;
    }
    return depth;
}
int main() {
    int q;
    cin >> q;
    while (q--) {
        long long x, y;
        cin >> x >> y;
        int dx = depthNode(x);
        int dy = depthNode(y);
        int answer = 0;
        while (dx > dy) {
            x = parentNode(x);
            --dx;
            ++answer;
        }
        while (dy > dx) {
            y = parentNode(y);
            --dy;
            ++answer;
        }
        while (x != y) {
            x = parentNode(x);
            y = parentNode(y);
            answer += 2;
        }
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["荒地开垦", {
      algorithm: "局部增量评估",
      complexity: "O(nm)",
      code: `#include <iostream>
#include <set>
#include <string>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> grid(n);
    for (int i = 0; i < n; ++i) cin >> grid[i];
    const int dx[5] = {0, -1, 1, 0, 0};
    const int dy[5] = {0, 0, 0, -1, 1};
    auto inside = [&](int x, int y) {
        return x >= 0 && x < n && y >= 0 && y < m;
    };
    auto cultivable = [&](int x, int y, int rx, int ry) {
        for (int dir = 0; dir < 5; ++dir) {
            int nx = x + dx[dir];
            int ny = y + dy[dir];
            if (!inside(nx, ny)) continue;
            if (grid[nx][ny] == '#' && !(nx == rx && ny == ry)) return false;
        }
        return true;
    };
    vector<vector<int>> base(n, vector<int>(m, 0));
    int baseTotal = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) {
            if (grid[i][j] == '.' && cultivable(i, j, -1, -1)) {
                base[i][j] = 1;
                ++baseTotal;
            }
        }
    }
    int answer = baseTotal;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) {
            if (grid[i][j] != '#') continue;
            set<pair<int, int>> affected;
            affected.insert({i, j});
            for (int dir = 1; dir < 5; ++dir) {
                int nx = i + dx[dir];
                int ny = j + dy[dir];
                if (inside(nx, ny)) affected.insert({nx, ny});
            }
            int current = baseTotal;
            for (auto [x, y] : affected) current -= base[x][y];
            for (auto [x, y] : affected) {
                if (cultivable(x, y, i, j)) ++current;
            }
            if (current > answer) answer = current;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["计算得分", {
      algorithm: "动态规划 + 模式匹配",
      complexity: "O(mn)",
      code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<long long> score(n + 1);
    for (int i = 1; i <= n; ++i) cin >> score[i];
    int m;
    string s;
    cin >> m >> s;
    vector<long long> dp(m + 1, 0);
    for (int i = 0; i < m; ++i) {
        dp[i + 1] = max(dp[i + 1], dp[i]);
        int maxK = 0;
        while (i + 3 * (maxK + 1) <= m) {
            int start = i + 3 * maxK;
            if (s[start] == 'a' && s[start + 1] == 'b' && s[start + 2] == 'c') ++maxK;
            else break;
        }
        for (int k = 1; k <= maxK && k <= n; ++k) {
            dp[i + 3 * k] = max(dp[i + 3 * k], dp[i] + score[k]);
        }
    }
    cout << dp[m] << "\\n";
    return 0;
}`
    }],
    ["成绩排序", {
      algorithm: "排序 + 并列排名",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
struct Student {
    int c, m, e, idx;
};
bool sameRank(const Student& a, const Student& b) {
    return a.c + a.m + a.e == b.c + b.m + b.e &&
           a.c + a.m == b.c + b.m &&
           max(a.c, a.m) == max(b.c, b.m);
}
int main() {
    int n;
    cin >> n;
    vector<Student> students(n);
    for (int i = 0; i < n; ++i) {
        cin >> students[i].c >> students[i].m >> students[i].e;
        students[i].idx = i;
    }
    vector<Student> order = students;
    sort(order.begin(), order.end(), [](const Student& a, const Student& b) {
        int sa = a.c + a.m + a.e;
        int sb = b.c + b.m + b.e;
        if (sa != sb) return sa > sb;
        int ca = a.c + a.m;
        int cb = b.c + b.m;
        if (ca != cb) return ca > cb;
        int ma = max(a.c, a.m);
        int mb = max(b.c, b.m);
        if (ma != mb) return ma > mb;
        return a.idx < b.idx;
    });
    vector<int> rank(n);
    int currentRank = 1;
    for (int i = 0; i < n; ++i) {
        if (i > 0 && !sameRank(order[i], order[i - 1])) currentRank = i + 1;
        rank[order[i].idx] = currentRank;
    }
    for (int i = 0; i < n; ++i) cout << rank[i] << "\\n";
    return 0;
}`
    }],
    ["交流问题", {
      algorithm: "二分图染色 + 连通块统计",
      complexity: "O(n + m)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    vector<int> color(n + 1, -1);
    long long minB = 0;
    long long maxB = 0;
    for (int i = 1; i <= n; ++i) {
        if (color[i] != -1) continue;
        if (graph[i].empty()) {
            minB += 0;
            maxB += 1;
            color[i] = 0;
            continue;
        }
        vector<int> stack = {i};
        color[i] = 0;
        long long cnt[2] = {1, 0};
        for (int p = 0; p < (int)stack.size(); ++p) {
            int u = stack[p];
            for (int v : graph[u]) {
                if (color[v] != -1) continue;
                color[v] = color[u] ^ 1;
                ++cnt[color[v]];
                stack.push_back(v);
            }
        }
        minB += min(cnt[0], cnt[1]);
        maxB += max(cnt[0], cnt[1]);
    }
    cout << minB << " " << maxB << "\\n";
    return 0;
}`
    }],
    ["树上游走", {
      algorithm: "直接模拟",
      complexity: "O(n)",
      code: `#include <iostream>
#include <string>
using namespace std;
int main() {
    long long n, s;
    string ops;
    cin >> n >> s >> ops;
    for (char op : ops) {
        if (op == 'U') {
            if (s > 1) s /= 2;
        } else if (op == 'L') {
            s *= 2;
        } else {
            s = s * 2 + 1;
        }
    }
    cout << s << "\\n";
    return 0;
}`
    }],
    ["小杨做题", {
      algorithm: "斐波那契模拟 + 截断",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long a, b, m, n;
    cin >> a >> b >> m >> n;
    if (n == 1) {
        cout << a << "\\n";
        return 0;
    }
    if (n == 2) {
        cout << a + b << "\\n";
        return 0;
    }
    long long sum = a + b;
    long long prev = a, curr = b;
    bool stopped = (a >= m || b >= m);
    for (int day = 3; day <= n; ++day) {
        long long today = 0;
        if (!stopped) {
            today = prev + curr;
            if (today >= m) stopped = true;
            prev = curr;
            curr = today;
        }
        sum += today;
    }
    cout << sum << "\\n";
    return 0;
}`
    }],
    ["小杨的 H 字矩阵", {
      algorithm: "直接构造",
      complexity: "O(n^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int mid = (n + 1) / 2;
    for (int i = 1; i <= n; ++i) {
        cout << '|';
        for (int j = 2; j <= n - 1; ++j) {
            cout << (i == mid ? '-' : 'a');
        }
        cout << '|' << "\\n";
    }
    return 0;
}`
    }],
    ["游戏", {
      algorithm: "动态规划",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
const long long MOD = 1000000007LL;
int main() {
    int n, a, b, c;
    cin >> n >> a >> b >> c;
    vector<long long> dp(n + 1, 0);
    for (int x = 1; x <= c; ++x) dp[x] = 1;
    for (int x = c + 1; x <= n; ++x) {
        if (x - a >= 1) dp[x] = (dp[x] + dp[x - a]) % MOD;
        else dp[x] = (dp[x] + 1) % MOD;
        if (x - b >= 1) dp[x] = (dp[x] + dp[x - b]) % MOD;
        else dp[x] = (dp[x] + 1) % MOD;
    }
    cout << dp[n] % MOD << "\\n";
    return 0;
}`
    }],
    ["小杨报数（2023年12月C++一级）", {
      algorithm: "直接枚举",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    for (int i = 1; i <= n; ++i) {
        if (i % m != 0) cout << i << "\\n";
    }
    return 0;
}`
    }],
    ["小杨的考试", {
      algorithm: "取模计算",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int x, n;
    cin >> x >> n;
    int ans = (x - 1 + n) % 7 + 1;
    cout << ans << "\\n";
    return 0;
}`
    }],
    ["单位转换（2023年12月C++三级）", {
      algorithm: "字符串解析 + 单位映射",
      complexity: "O(nL)",
      code: `#include <iostream>
#include <string>
using namespace std;
long long unitValue(const string& unit) {
    if (unit == "km" || unit == "kg") return 1000000;
    if (unit == "m" || unit == "g") return 1000;
    return 1;
}
int main() {
    int n;
    cin >> n;
    while (n--) {
        string expr;
        cin >> expr;
        size_t posEq = expr.find('=');
        size_t posQ = expr.find('?');
        string left = expr.substr(0, posEq);
        string rightUnit = expr.substr(posQ + 1);
        int idx = 0;
        while (idx < (int)left.size() && isdigit(static_cast<unsigned char>(left[idx]))) ++idx;
        long long value = stoll(left.substr(0, idx));
        string leftUnit = left.substr(idx);
        long long base = value * unitValue(leftUnit);
        long long answer = base / unitValue(rightUnit);
        cout << left << "=" << answer << rightUnit << "\\n";
    }
    return 0;
}`
    }],
    ["田忌赛马", {
      algorithm: "有序集合贪心",
      complexity: "O(n log n)",
      code: `#include <iostream>
#include <set>
using namespace std;
int main() {
    int n;
    cin >> n;
    multiset<int> mine;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        mine.insert(x);
    }
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        int v;
        cin >> v;
        auto it = mine.upper_bound(v);
        if (it != mine.end()) {
            ++answer;
            mine.erase(it);
        } else {
            mine.erase(mine.begin());
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["小杨的字典", {
      algorithm: "哈希表 + 逐字符解析",
      complexity: "O(|S|)",
      code: `#include <cctype>
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;
bool isLetter(char ch) {
    return ch >= 'a' && ch <= 'z';
}
int main() {
    int n;
    cin >> n;
    unordered_map<string, string> dict;
    for (int i = 0; i < n; ++i) {
        string a, b;
        cin >> a >> b;
        dict[a] = b;
    }
    string s;
    cin >> s;
    string current = "";
    for (char ch : s) {
        if (isLetter(ch)) {
            current += ch;
        } else {
            if (!current.empty()) {
                auto it = dict.find(current);
                cout << (it == dict.end() ? "UNK" : it->second);
                current.clear();
            }
            cout << ch;
        }
    }
    if (!current.empty()) {
        auto it = dict.find(current);
        cout << (it == dict.end() ? "UNK" : it->second);
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["烹饪问题", {
      algorithm: "维护按位最大候选",
      complexity: "O(n * 31)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> best(31, -1);
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        for (int b = 0; b <= 30; ++b) {
            if (best[b] != -1) answer = max(answer, best[b] & x);
        }
        for (int b = 0; b <= 30; ++b) {
            if ((x >> b) & 1) best[b] = max(best[b], x);
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["小杨的幸运数", {
      algorithm: "枚举超级幸运数倍数",
      complexity: "O(M log M)",
      code: `#include <cmath>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int a, n;
    cin >> a >> n;
    const int MAXV = 1000001;
    vector<char> lucky(MAXV + 2, 0);
    int start = static_cast<int>(ceil(sqrt(static_cast<double>(a))));
    for (long long s = 1LL * start * start; s <= MAXV; ++s) {
        long long base = static_cast<long long>(sqrt(static_cast<double>(s)));
        if (base * base != s) continue;
        for (long long multiple = s; multiple <= MAXV; multiple += s) lucky[multiple] = 1;
    }
    int nextLucky = 0;
    vector<int> nextValue(MAXV + 3, 0);
    for (int x = MAXV; x >= 1; --x) {
        if (lucky[x]) nextLucky = x;
        nextValue[x] = nextLucky;
    }
    while (n--) {
        int x;
        cin >> x;
        if (lucky[x]) cout << "lucky\\n";
        else cout << nextValue[x] << "\\n";
    }
    return 0;
}`
    }],
    ["数字替换", {
      algorithm: "扫描替换",
      complexity: "O(n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    int mn = *min_element(a.begin(), a.end());
    int mx = *max_element(a.begin(), a.end());
    for (int i = 0; i < n; ++i) {
        if (a[i] > k) a[i] = mx;
        else if (a[i] < k) a[i] = mn;
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << a[i];
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["找因数", {
      algorithm: "枚举因数",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int a;
    cin >> a;
    for (int i = 1; i <= a; ++i) {
        if (a % i == 0) cout << i << "\\n";
    }
    return 0;
}`
    }],
    ["找素数", {
      algorithm: "试除判素数",
      complexity: "O((b-a+1)sqrt(b))",
      code: `#include <iostream>
using namespace std;
bool isPrime(int x) {
    if (x < 2) return false;
    for (int i = 2; i * i <= x; ++i) {
        if (x % i == 0) return false;
    }
    return true;
}
int main() {
    int a, b;
    cin >> a >> b;
    int count = 0;
    for (int x = a; x <= b; ++x) {
        if (isPrime(x)) ++count;
    }
    cout << count << "\\n";
    return 0;
}`
    }],
    ["四舍五入", {
      algorithm: "直接计算",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        cout << ((x + 5) / 10) * 10 << "\\n";
    }
    return 0;
}`
    }],
    ["二阶矩阵", {
      algorithm: "枚举 2x2 子矩阵",
      complexity: "O(nm)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<long long>> a(n, vector<long long>(m));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) cin >> a[i][j];
    }
    long long answer = 0;
    for (int i = 0; i + 1 < n; ++i) {
        for (int j = 0; j + 1 < m; ++j) {
            if (a[i][j] * a[i + 1][j + 1] == a[i][j + 1] * a[i + 1][j]) ++answer;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["环线", {
      algorithm: "环形最大子段和",
      complexity: "O(n)",
      code: `#include <algorithm>
#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long total = 0;
    long long maxEnding = 0, maxSum = -(1LL << 60);
    long long minEnding = 0, minSum = (1LL << 60);
    long long bestSingle = -(1LL << 60);
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        total += x;
        bestSingle = max(bestSingle, x);
        maxEnding = max(x, maxEnding + x);
        maxSum = max(maxSum, maxEnding);
        minEnding = min(x, minEnding + x);
        minSum = min(minSum, minEnding);
    }
    if (bestSingle < 0) cout << bestSingle << "\\n";
    else cout << max(maxSum, total - minSum) << "\\n";
    return 0;
}`
    }],
    ["小杨和整数拆分", {
      algorithm: "完全背包动态规划",
      complexity: "O(nsqrt(n))",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    const int INF = 1e9;
    vector<int> dp(n + 1, INF);
    dp[0] = 0;
    for (int i = 1; i * i <= n; ++i) {
        int sq = i * i;
        for (int j = sq; j <= n; ++j) {
            dp[j] = min(dp[j], dp[j - sq] + 1);
        }
    }
    cout << dp[n] << "\\n";
    return 0;
}`
    }],
    ["因数分解（2023.9C++五级）", {
      algorithm: "试除分解",
      complexity: "O(sqrt(n))",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    long long n;
    cin >> n;
    vector<pair<long long, int>> factors;
    for (long long p = 2; p * p <= n; ++p) {
        if (n % p != 0) continue;
        int cnt = 0;
        while (n % p == 0) {
            n /= p;
            ++cnt;
        }
        factors.push_back({p, cnt});
    }
    if (n > 1) factors.push_back({n, 1});
    for (int i = 0; i < (int)factors.size(); ++i) {
        if (i) cout << " * ";
        cout << factors[i].first;
        if (factors[i].second > 1) cout << "^" << factors[i].second;
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["Recamán", {
      algorithm: "模拟 + 去重",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <set>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    set<int> used;
    a[0] = 1;
    used.insert(1);
    for (int k = 2; k <= n; ++k) {
        int candidate = a[k - 2] - k;
        if (candidate > 0 && !used.count(candidate)) a[k - 1] = candidate;
        else a[k - 1] = a[k - 2] + k;
        used.insert(a[k - 1]);
    }
    sort(a.begin(), a.end());
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << a[i];
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["字符排序", {
      algorithm: "区间排序判定",
      complexity: "O(总字符数 + n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;
bool nondecreasing(const string& s) {
    for (int i = 1; i < (int)s.size(); ++i) {
        if (s[i - 1] > s[i]) return false;
    }
    return true;
}
int main() {
    int T;
    cin >> T;
    while (T--) {
        int n;
        cin >> n;
        vector<string> a(n);
        bool ok = true;
        for (int i = 0; i < n; ++i) {
            cin >> a[i];
            if (!nondecreasing(a[i])) ok = false;
        }
        sort(a.begin(), a.end(), [](const string& lhs, const string& rhs) {
            if (lhs.front() != rhs.front()) return lhs.front() < rhs.front();
            return lhs.back() < rhs.back();
        });
        for (int i = 1; i < n; ++i) {
            if (a[i - 1].back() > a[i].front()) ok = false;
        }
        cout << (ok ? 1 : 0) << "\\n";
    }
    return 0;
}`
    }],
    ["奖品兑换", {
      algorithm: "二分答案",
      complexity: "O(log(n+m))",
      code: `#include <algorithm>
#include <iostream>
using namespace std;
bool can(long long total, long long n, long long m, long long a, long long b) {
    if (a == b) return total * a <= min(n, m);
    long long diff = a - b;
    if (diff < 0) {
        swap(n, m);
        swap(a, b);
        diff = -diff;
    }
    long long left = max(0LL, (a * total - m + diff - 1) / diff);
    long long right = min(total, (n - b * total) / diff);
    return left <= right;
}
int main() {
    long long n, m, a, b;
    cin >> n >> m >> a >> b;
    long long left = 0, right = (n + m) / (a + b), answer = 0;
    while (left <= right) {
        long long mid = (left + right) / 2;
        if (can(mid, n, m, a, b)) {
            answer = mid;
            left = mid + 1;
        } else {
            right = mid - 1;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["平均分配", {
      algorithm: "贪心排序",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    int total = 2 * n;
    vector<long long> b(total), c(total), delta(total);
    for (int i = 0; i < total; ++i) cin >> b[i];
    long long answer = 0;
    for (int i = 0; i < total; ++i) {
        cin >> c[i];
        answer += c[i];
        delta[i] = b[i] - c[i];
    }
    sort(delta.begin(), delta.end(), greater<long long>());
    for (int i = 0; i < n; ++i) answer += delta[i];
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["最大公因数", {
      algorithm: "差分 gcd",
      complexity: "O(n log V + q log V)",
      code: `#include <iostream>
#include <numeric>
#include <vector>
using namespace std;
int main() {
    int n, q;
    cin >> n >> q;
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    long long g = 0;
    for (int i = 1; i < n; ++i) g = gcd(g, a[i] - a[0]);
    for (int i = 1; i <= q; ++i) {
        cout << gcd(a[0] + i, g) << "\\n";
    }
    return 0;
}`
    }],
    ["奇妙数字", {
      algorithm: "质因数分解 + 三角数贪心",
      complexity: "O(sqrt(n))",
      code: `#include <iostream>
using namespace std;
int main() {
    long long n;
    cin >> n;
    long long answer = 0;
    for (long long p = 2; p * p <= n; ++p) {
        if (n % p != 0) continue;
        int exponent = 0;
        while (n % p == 0) {
            n /= p;
            ++exponent;
        }
        int k = 0;
        while ((k + 1) * (k + 2) / 2 <= exponent) ++k;
        answer += k;
    }
    if (n > 1) ++answer;
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["原根判断", {
      algorithm: "快速幂 + 分解 p-1",
      complexity: "O(Tsqrt(p))",
      code: `#include <iostream>
#include <vector>
using namespace std;
long long modPow(long long a, long long e, long long mod) {
    long long result = 1 % mod;
    while (e > 0) {
        if (e & 1) result = result * a % mod;
        a = a * a % mod;
        e >>= 1;
    }
    return result;
}
int main() {
    int T;
    cin >> T;
    while (T--) {
        long long a, p;
        cin >> a >> p;
        long long phi = p - 1;
        vector<long long> factors;
        long long x = phi;
        for (long long d = 2; d * d <= x; ++d) {
            if (x % d != 0) continue;
            factors.push_back(d);
            while (x % d == 0) x /= d;
        }
        if (x > 1) factors.push_back(x);
        bool ok = true;
        for (long long q : factors) {
            if (modPow(a, phi / q, p) == 1) {
                ok = false;
                break;
            }
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["排队", {
      algorithm: "链式组件计数",
      complexity: "O(n + m)",
      code: `#include <iostream>
#include <vector>
using namespace std;
const long long MOD = 1000000007LL;
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> out(n + 1, 0), in(n + 1, 0), parent(n + 1);
    vector<int> degree(n + 1, 0);
    for (int i = 1; i <= n; ++i) parent[i] = i;
    auto find = [&](int x) {
        int r = x;
        while (parent[r] != r) r = parent[r];
        while (parent[x] != x) {
            int p = parent[x];
            parent[x] = r;
            x = p;
        }
        return r;
    };
    auto unite = [&](int a, int b) {
        a = find(a);
        b = find(b);
        if (a != b) parent[a] = b;
    };
    bool ok = true;
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        if (out[a] || in[b]) ok = false;
        out[a] = b;
        in[b] = a;
        ++degree[a];
        ++degree[b];
        if (degree[a] > 2 || degree[b] > 2) ok = false;
        unite(a, b);
    }
    if (ok) {
        vector<int> nodeCount(n + 1, 0), headCount(n + 1, 0);
        for (int i = 1; i <= n; ++i) {
            int r = find(i);
            ++nodeCount[r];
            if (in[i] == 0) ++headCount[r];
        }
        for (int i = 1; i <= n; ++i) {
            if (nodeCount[i] > 1 && headCount[i] != 1) ok = false;
        }
    }
    if (!ok) {
        cout << 0 << "\\n";
        return 0;
    }
    int components = 0;
    vector<int> seen(n + 1, 0);
    for (int i = 1; i <= n; ++i) {
        int r = find(i);
        if (!seen[r]) {
            seen[r] = 1;
            ++components;
        }
    }
    long long answer = 1;
    for (int i = 2; i <= components; ++i) answer = answer * i % MOD;
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["运送物资", {
      algorithm: "排序 + 重排不等式",
      complexity: "O((n+m)log(n+m))",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    long long x;
    cin >> n >> m >> x;
    vector<pair<long long, int>> stations;
    stations.reserve(n);
    for (int i = 0; i < n; ++i) {
        long long p;
        int c;
        cin >> p >> c;
        stations.push_back({p, c});
    }
    vector<long long> weights;
    weights.reserve(m);
    long long answer = 0;
    for (int i = 0; i < m; ++i) {
        long long a, b;
        cin >> a >> b;
        answer += 2LL * b * x;
        weights.push_back(a - b);
    }
    sort(stations.begin(), stations.end(), [](const auto& lhs, const auto& rhs) {
        return lhs.first < rhs.first;
    });
    sort(weights.begin(), weights.end(), greater<long long>());
    int idx = 0;
    for (const auto& [p, c] : stations) {
        for (int cnt = 0; cnt < c && idx < m; ++cnt) {
            answer += 2LL * weights[idx] * p;
            ++idx;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["等价消除", {
      algorithm: "前缀奇偶状态计数",
      complexity: "O(n)",
      code: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;
int main() {
    int n;
    string s;
    cin >> n >> s;
    unordered_map<int, long long> freq;
    freq.reserve(n * 2 + 1);
    int mask = 0;
    long long answer = 0;
    freq[0] = 1;
    for (char ch : s) {
        mask ^= 1 << (ch - 'a');
        answer += freq[mask];
        ++freq[mask];
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["寻找数字", {
      algorithm: "整数四次根判定",
      complexity: "O(t)",
      code: `#include <iostream>
using namespace std;
long long pow4(long long x) {
    return x * x * x * x;
}
int main() {
    int t;
    cin >> t;
    while (t--) {
        long long a;
        cin >> a;
        long long left = 1, right = 100;
        while (left <= right) {
            long long mid = (left + right) / 2;
            long long value = pow4(mid);
            if (value == a) {
                cout << mid << "\\n";
                goto done;
            }
            if (value < a) left = mid + 1;
            else right = mid - 1;
        }
        cout << -1 << "\\n";
done:
        ;
    }
    return 0;
}`
    }],
    ["温度转换", {
      algorithm: "公式计算",
      complexity: "O(1)",
      code: `#include <iomanip>
#include <iostream>
using namespace std;
int main() {
    double K;
    cin >> K;
    double C = K - 273.15;
    double F = C * 1.8 + 32.0;
    if (F > 212.0) {
        cout << "Temperature is too high!\\n";
    } else {
        cout << fixed << setprecision(2) << C << " " << F << "\\n";
    }
    return 0;
}`
    }],
    ["奇数和偶数", {
      algorithm: "计数",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int odd = 0, even = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        if (x & 1) ++odd;
        else ++even;
    }
    cout << odd << " " << even << "\\n";
    return 0;
}`
    }],
    ["打印数字", {
      algorithm: "按模板输出",
      complexity: "O(len)",
      code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    string s;
    cin >> s;
    vector<vector<string>> pattern = {
        {".....", ".***.", ".***.", ".***.", "....."},
        {"****.", "****.", "****.", "****.", "****."},
        {".....", "****.", ".....", ".****", "....."},
        {".....", "****.", ".....", "****.", "....."}
    };
    for (int row = 0; row < 5; ++row) {
        for (char ch : s) cout << pattern[ch - '0'][row];
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["挑战怪物", {
      algorithm: "平方和 + 质数判定",
      complexity: "O(tsqrt(h))",
      code: `#include <cmath>
#include <iostream>
using namespace std;
bool isPrime(int x) {
    if (x < 2) return false;
    for (int i = 2; i * i <= x; ++i) {
        if (x % i == 0) return false;
    }
    return true;
}
int main() {
    int t;
    cin >> t;
    while (t--) {
        int h;
        cin >> h;
        int answer = -1;
        for (int k = 0; 1LL * k * k <= h; ++k) {
            int remain = h - k * k;
            if (remain == 0) {
                answer = k;
                break;
            }
            if (isPrime(remain)) {
                answer = k + 1;
                break;
            }
        }
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["调味平衡", {
      algorithm: "差值动态规划",
      complexity: "O(n * sum)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    const int OFFSET = 50000;
    const int NEG = -1e9;
    vector<int> dp(OFFSET * 2 + 1, NEG), nextDp;
    dp[OFFSET] = 0;
    for (int i = 0; i < n; ++i) {
        int a, b;
        cin >> a >> b;
        nextDp = dp;
        int diff = a - b;
        int gain = a + b;
        for (int j = 0; j < (int)dp.size(); ++j) {
            if (dp[j] == NEG) continue;
            int nj = j + diff;
            if (0 <= nj && nj < (int)dp.size()) {
                nextDp[nj] = max(nextDp[nj], dp[j] + gain);
            }
        }
        dp.swap(nextDp);
    }
    cout << max(0, dp[OFFSET]) << "\\n";
    return 0;
}`
    }],
    ["武器强化", {
      algorithm: "枚举目标票数 + 贪心转移",
      complexity: "O(m^2 log m)",
      code: `#include <algorithm>
#include <iostream>
#include <limits>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<long long>> costByWeapon(n + 1);
    vector<int> cnt(n + 1, 0);
    for (int i = 0; i < m; ++i) {
        int p;
        long long c;
        cin >> p >> c;
        costByWeapon[p].push_back(c);
        ++cnt[p];
    }
    for (int i = 1; i <= n; ++i) sort(costByWeapon[i].begin(), costByWeapon[i].end());
    long long answer = numeric_limits<long long>::max();
    for (int target = cnt[1]; target <= m; ++target) {
        long long cost = 0;
        int have = cnt[1];
        vector<long long> optional;
        for (int weapon = 2; weapon <= n; ++weapon) {
            int extra = max(0, cnt[weapon] - (target - 1));
            for (int i = 0; i < extra; ++i) {
                cost += costByWeapon[weapon][i];
                ++have;
            }
            for (int i = extra; i < cnt[weapon]; ++i) optional.push_back(costByWeapon[weapon][i]);
        }
        if (have < target) {
            sort(optional.begin(), optional.end());
            for (int i = 0; i < target - have; ++i) cost += optional[i];
        }
        answer = min(answer, cost);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["宝箱", {
      algorithm: "排序 + 滑动窗口",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    sort(a.begin(), a.end());
    long long answer = 0, window = 0;
    int left = 0;
    for (int right = 0; right < n; ++right) {
        window += a[right];
        while (a[right] - a[left] > k) {
            window -= a[left];
            ++left;
        }
        answer = max(answer, window);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["区间排序", {
      algorithm: "直接模拟",
      complexity: "O(qn log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];
    int q;
    cin >> q;
    while (q--) {
        int l, r;
        cin >> l >> r;
        sort(a.begin() + (l - 1), a.begin() + r);
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << a[i];
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["平衡序列", {
      algorithm: "前缀和",
      complexity: "O(总 n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<long long> a(n);
        long long total = 0;
        for (int i = 0; i < n; ++i) {
            cin >> a[i];
            total += a[i];
        }
        long long prefix = 0;
        bool ok = false;
        for (int i = 0; i + 1 < n; ++i) {
            prefix += a[i];
            if (prefix * 2 == total) {
                ok = true;
                break;
            }
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["小杨的", {
      algorithm: "直接构造",
      complexity: "O(m^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int m;
    cin >> m;
    for (int i = 0; i < m; ++i) {
        for (int j = 0; j < m; ++j) {
            if (j == 0 || j == m - 1 || i == j) cout << '+';
            else cout << '-';
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["数位之和", {
      algorithm: "数位和判断",
      complexity: "O(n log V)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    while (n--) {
        int x;
        cin >> x;
        int sum = 0;
        while (x > 0) {
            sum += x % 10;
            x /= 10;
        }
        cout << (sum % 7 == 0 ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["武器购买", {
      algorithm: "0/1 背包",
      complexity: "O(t * n * Q)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int t;
    cin >> t;
    while (t--) {
        int n, P, Q;
        cin >> n >> P >> Q;
        vector<int> dp(Q + 1, 0);
        for (int i = 0; i < n; ++i) {
            int power, cost;
            cin >> power >> cost;
            for (int c = Q; c >= cost; --c) {
                dp[c] = max(dp[c], dp[c - cost] + power);
            }
        }
        int answer = -1;
        for (int c = 0; c <= Q; ++c) {
            if (dp[c] >= P) {
                answer = c;
                break;
            }
        }
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["小杨的武器", {
      algorithm: "贪心分配战斗",
      complexity: "O(n + m)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<long long> c(n);
    for (int i = 0; i < n; ++i) cin >> c[i];
    long long best = *max_element(c.begin(), c.end());
    long long totalPositive = 0;
    long long totalChange = 0;
    for (int i = 0; i < m; ++i) {
        long long x;
        cin >> x;
        totalChange += x;
        if (x > 0) totalPositive += x;
    }
    if (n == 1) cout << c[0] + totalChange << "\\n";
    else cout << best + totalPositive << "\\n";
    return 0;
}`
    }],
    ["移位", {
      algorithm: "直接构造",
      complexity: "O(26)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    n %= 26;
    for (int i = 0; i < 26; ++i) {
        char ch = char('A' + (i + n) % 26);
        cout << ch;
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["小猫分鱼", {
      algorithm: "枚举最后一轮份数并反推",
      complexity: "O(answer)",
      code: `#include <iostream>
using namespace std;
int main() {
    long long N, extra;
    cin >> N >> extra;
    for (long long t = 1;; ++t) {
        long long current = t * (N - 1);
        bool ok = true;
        for (int cat = 0; cat < N; ++cat) {
            if (current % (N - 1) != 0) {
                ok = false;
                break;
            }
            current = current / (N - 1) * N + extra;
        }
        if (ok) {
            cout << current << "\\n";
            return 0;
        }
    }
    return 0;
}`
    }],
    ["回文拼接", {
      algorithm: "枚举分割点",
      complexity: "O(nL^2)",
      code: `#include <iostream>
#include <string>
using namespace std;
bool isPalindrome(const string& s, int l, int r) {
    while (l < r) {
        if (s[l] != s[r]) return false;
        ++l;
        --r;
    }
    return true;
}
int main() {
    int n;
    cin >> n;
    while (n--) {
        string s;
        cin >> s;
        bool ok = false;
        for (int cut = 2; cut <= (int)s.size() - 2; ++cut) {
            if (isPalindrome(s, 0, cut - 1) && isPalindrome(s, cut, (int)s.size() - 1)) {
                ok = true;
                break;
            }
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["商品交易", {
      algorithm: "最短路",
      complexity: "O((N+M)logN)",
      code: `#include <iostream>
#include <limits>
#include <queue>
#include <vector>
using namespace std;
int main() {
    int N, M, a, b;
    cin >> N >> M >> a >> b;
    vector<long long> value(N);
    for (int i = 0; i < N; ++i) cin >> value[i];
    vector<vector<pair<int, long long>>> graph(N);
    for (int i = 0; i < M; ++i) {
        int x, y;
        cin >> x >> y;
        long long cost = value[y] - value[x] + 1;
        graph[x].push_back({y, cost});
    }
    const long long INF = numeric_limits<long long>::max() / 4;
    vector<long long> dist(N, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[a] = 0;
    pq.push({0, a});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d != dist[u]) continue;
        for (auto [v, w] : graph[u]) {
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    if (dist[b] == INF) cout << "No solution\\n";
    else cout << dist[b] << "\\n";
    return 0;
}`
    }],
    ["小杨买饮料（2023.9C++六级）", {
      algorithm: "0/1 背包",
      complexity: "O(NL)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int N, L;
    cin >> N >> L;
    const long long INF = (1LL << 60);
    vector<long long> dp(L + 1, INF);
    dp[0] = 0;
    for (int i = 0; i < N; ++i) {
        int c, l;
        cin >> c >> l;
        vector<long long> next = dp;
        for (int j = 0; j <= L; ++j) {
            if (dp[j] == INF) continue;
            int nj = min(L, j + l);
            next[nj] = min(next[nj], dp[j] + c);
        }
        dp.swap(next);
    }
    if (dp[L] == INF) cout << "no solution\\n";
    else cout << dp[L] << "\\n";
    return 0;
}`
    }],
    ["算法学习", {
      algorithm: "分组贪心 + 可重排判定",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int m, n, k;
    cin >> m >> n >> k;
    vector<int> topic(n), gain(n);
    for (int i = 0; i < n; ++i) cin >> topic[i];
    for (int i = 0; i < n; ++i) cin >> gain[i];
    vector<vector<int>> groups(m + 1);
    for (int i = 0; i < n; ++i) groups[topic[i]].push_back(gain[i]);
    vector<int> counts;
    long long total = 0;
    int maxCount = 0;
    for (int t = 1; t <= m; ++t) {
        auto &g = groups[t];
        sort(g.begin(), g.end(), greater<int>());
        long long sum = 0;
        int used = 0;
        while (used < (int)g.size() && sum < k) {
            sum += g[used];
            ++used;
        }
        if (sum < k) {
            cout << -1 << "\\n";
            return 0;
        }
        counts.push_back(used);
        total += used;
        maxCount = max(maxCount, used);
    }
    if (maxCount > total - maxCount + 1) {
        cout << -1 << "\\n";
    } else {
        cout << total << "\\n";
    }
    return 0;
}`
    }],
    ["空间跳跃", {
      algorithm: "建图最短路",
      complexity: "O(n^2 log n)",
      code: `#include <algorithm>
#include <iostream>
#include <limits>
#include <queue>
#include <vector>
using namespace std;
struct Board {
    long long l, r, h;
};
int main() {
    int n, s, t;
    cin >> n >> s >> t;
    vector<Board> a(n + 1);
    for (int i = 1; i <= n; ++i) cin >> a[i].l >> a[i].r >> a[i].h;
    vector<vector<pair<int, long long>>> graph(2 * n + 1);
    auto leftId = [&](int i) { return 2 * i - 1; };
    auto rightId = [&](int i) { return 2 * i; };
    for (int i = 1; i <= n; ++i) {
        long long len = a[i].r - a[i].l;
        graph[leftId(i)].push_back({rightId(i), len});
        graph[rightId(i)].push_back({leftId(i), len});
    }
    for (int i = 1; i <= n; ++i) {
        int belowLeft = -1, belowRight = -1;
        long long bestLeftH = -1, bestRightH = -1;
        for (int j = 1; j <= n; ++j) {
            if (a[j].h >= a[i].h) continue;
            if (a[j].l <= a[i].l && a[i].l <= a[j].r && a[j].h > bestLeftH) {
                bestLeftH = a[j].h;
                belowLeft = j;
            }
            if (a[j].l <= a[i].r && a[i].r <= a[j].r && a[j].h > bestRightH) {
                bestRightH = a[j].h;
                belowRight = j;
            }
        }
        if (belowLeft != -1) {
            long long drop = a[i].h - a[belowLeft].h;
            graph[leftId(i)].push_back({leftId(belowLeft), drop + (a[i].l - a[belowLeft].l)});
            graph[leftId(i)].push_back({rightId(belowLeft), drop + (a[belowLeft].r - a[i].l)});
        }
        if (belowRight != -1) {
            long long drop = a[i].h - a[belowRight].h;
            graph[rightId(i)].push_back({leftId(belowRight), drop + (a[i].r - a[belowRight].l)});
            graph[rightId(i)].push_back({rightId(belowRight), drop + (a[belowRight].r - a[i].r)});
        }
    }
    const long long INF = numeric_limits<long long>::max() / 4;
    vector<long long> dist(2 * n + 1, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[leftId(s)] = 0;
    pq.push({0, leftId(s)});
    while (!pq.empty()) {
        auto [d, u] = pq.top();
        pq.pop();
        if (d != dist[u]) continue;
        for (auto [v, w] : graph[u]) {
            if (dist[v] > d + w) {
                dist[v] = d + w;
                pq.push({dist[v], v});
            }
        }
    }
    long long answer = min(dist[leftId(t)], dist[rightId(t)]);
    if (answer >= INF / 2) cout << -1 << "\\n";
    else cout << answer << "\\n";
    return 0;
}`
    }],
    ["好斗的牛", {
      algorithm: "枚举排列 + 二分答案",
      complexity: "O(2^N * N^2 * log V)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int N;
    cin >> N;
    vector<int> a(N), b(N);
    for (int i = 0; i < N; ++i) cin >> a[i];
    for (int i = 0; i < N; ++i) cin >> b[i];
    vector<int> idx(N);
    for (int i = 0; i < N; ++i) idx[i] = i;
    auto can = [&](int len) {
        vector<int> p = idx;
        do {
            long long need = 1;
            for (int i = 0; i + 1 < N; ++i) {
                need += max(b[p[i]], a[p[i + 1]]) + 1LL;
            }
            if (need <= len) return true;
        } while (next_permutation(p.begin(), p.end()));
        return false;
    };
    int left = N, right = 20000, answer = right;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (can(mid)) {
            answer = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["工作沟通", {
      algorithm: "LCA 加路径最大编号",
      complexity: "O((n + qm) log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> parent(n, 0), depth(n, 0);
    for (int i = 1; i < n; ++i) cin >> parent[i];
    for (int i = 1; i < n; ++i) depth[i] = depth[parent[i]] + 1;

    int lg = 1;
    while ((1 << lg) <= n) ++lg;
    vector<vector<int>> up(lg, vector<int>(n, 0));
    vector<vector<int>> best(lg, vector<int>(n, 0));
    for (int v = 0; v < n; ++v) {
        up[0][v] = parent[v];
        best[0][v] = max(v, parent[v]);
    }
    best[0][0] = 0;
    for (int j = 1; j < lg; ++j) {
        for (int v = 0; v < n; ++v) {
            up[j][v] = up[j - 1][up[j - 1][v]];
            best[j][v] = max(best[j - 1][v], best[j - 1][up[j - 1][v]]);
        }
    }

    auto lca = [&](int a, int b) {
        if (depth[a] < depth[b]) swap(a, b);
        int diff = depth[a] - depth[b];
        for (int j = 0; j < lg; ++j) {
            if ((diff >> j) & 1) a = up[j][a];
        }
        if (a == b) return a;
        for (int j = lg - 1; j >= 0; --j) {
            if (up[j][a] != up[j][b]) {
                a = up[j][a];
                b = up[j][b];
            }
        }
        return parent[a];
    };

    auto maxOnPathToRoot = [&](int v) {
        int answer = v;
        int diff = depth[v];
        for (int j = lg - 1; j >= 0; --j) {
            if ((diff >> j) & 1) {
                answer = max(answer, best[j][v]);
                v = up[j][v];
            }
        }
        return answer;
    };

    int q;
    cin >> q;
    while (q--) {
        int m;
        cin >> m;
        int root;
        cin >> root;
        for (int i = 1; i < m; ++i) {
            int x;
            cin >> x;
            root = lca(root, x);
        }
        cout << maxOnPathToRoot(root) << "\\n";
    }
    return 0;
}`
    }],
    ["闯关游戏", {
      algorithm: "动态规划",
      complexity: "O(nm)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> a(m);
    for (int i = 0; i < m; ++i) cin >> a[i];
    vector<long long> b(n);
    for (int i = 0; i < n; ++i) cin >> b[i];
    vector<long long> dp(n + 1, 0);
    for (int i = n - 1; i >= 0; --i) {
        long long best = -(1LL << 60);
        for (int step : a) {
            int next = i + step;
            if (next > n) next = n;
            best = max(best, dp[next]);
        }
        dp[i] = b[i] + best;
    }
    cout << dp[0] << "\\n";
    return 0;
}`
    }],
    ["纸牌游戏", {
      algorithm: "动态规划",
      complexity: "O(n^2)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
long long gain(int mine, int other, long long score) {
    if (mine == other) return score;
    if ((mine == 1 && other == 0) || (mine == 2 && other == 1) || (mine == 0 && other == 2)) {
        return score * 2;
    }
    return 0;
}
int main() {
    int n;
    cin >> n;
    vector<long long> a(n + 1), penalty(n, 0), prefix(n, 0);
    vector<int> c(n + 1);
    for (int i = 1; i <= n; ++i) cin >> a[i];
    for (int i = 1; i < n; ++i) cin >> penalty[i];
    for (int i = 1; i <= n; ++i) cin >> c[i];
    for (int i = 1; i < n; ++i) prefix[i] = prefix[i - 1] + penalty[i];
    const long long NEG = -(1LL << 60);
    vector<vector<long long>> dp(3, vector<long long>(n, NEG));
    for (int card = 0; card < 3; ++card) {
        dp[card][0] = gain(card, c[1], a[1]);
    }
    for (int round = 2; round <= n; ++round) {
        vector<vector<long long>> next(3, vector<long long>(n, NEG));
        for (int last = 0; last < 3; ++last) {
            for (int changes = 0; changes <= round - 2; ++changes) {
                if (dp[last][changes] == NEG) continue;
                next[last][changes] = max(next[last][changes], dp[last][changes] + gain(last, c[round], a[round]));
                for (int card = 0; card < 3; ++card) {
                    if (card == last) continue;
                    next[card][changes + 1] = max(next[card][changes + 1], dp[last][changes] + gain(card, c[round], a[round]));
                }
            }
        }
        dp.swap(next);
    }
    long long answer = 0;
    for (int card = 0; card < 3; ++card) {
        for (int changes = 0; changes < n; ++changes) {
            if (dp[card][changes] == NEG) continue;
            answer = max(answer, dp[card][changes] - prefix[changes]);
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["试题名称：纸牌游戏", {
      algorithm: "动态规划",
      complexity: "O(n^2)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
long long gain(int mine, int other, long long score) {
    if (mine == other) return score;
    if ((mine == 1 && other == 0) || (mine == 2 && other == 1) || (mine == 0 && other == 2)) {
        return score * 2;
    }
    return 0;
}
int main() {
    int n;
    cin >> n;
    vector<long long> a(n + 1), penalty(n, 0), prefix(n, 0);
    vector<int> c(n + 1);
    for (int i = 1; i <= n; ++i) cin >> a[i];
    for (int i = 1; i < n; ++i) cin >> penalty[i];
    for (int i = 1; i <= n; ++i) cin >> c[i];
    for (int i = 1; i < n; ++i) prefix[i] = prefix[i - 1] + penalty[i];
    const long long NEG = -(1LL << 60);
    vector<vector<long long>> dp(3, vector<long long>(n, NEG));
    for (int card = 0; card < 3; ++card) dp[card][0] = gain(card, c[1], a[1]);
    for (int round = 2; round <= n; ++round) {
        vector<vector<long long>> next(3, vector<long long>(n, NEG));
        for (int last = 0; last < 3; ++last) {
            for (int changes = 0; changes <= round - 2; ++changes) {
                if (dp[last][changes] == NEG) continue;
                next[last][changes] = max(next[last][changes], dp[last][changes] + gain(last, c[round], a[round]));
                for (int card = 0; card < 3; ++card) {
                    if (card == last) continue;
                    next[card][changes + 1] = max(next[card][changes + 1], dp[last][changes] + gain(card, c[round], a[round]));
                }
            }
        }
        dp.swap(next);
    }
    long long answer = 0;
    for (int card = 0; card < 3; ++card) {
        for (int changes = 0; changes < n; ++changes) {
            if (dp[card][changes] == NEG) continue;
            answer = max(answer, dp[card][changes] - prefix[changes]);
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["奖品分配", {
      algorithm: "组合计数",
      complexity: "O(T * M + N)",
      code: `#include <iostream>
#include <vector>
using namespace std;

const long long MOD = 1000000007LL;

long long modPow(long long a, long long e) {
    long long r = 1;
    while (e > 0) {
        if (e & 1LL) r = r * a % MOD;
        a = a * a % MOD;
        e >>= 1LL;
    }
    return r;
}

int main() {
    int T;
    cin >> T;
    vector<int> ns(T), ms(T);
    vector<vector<int>> all(T);
    int maxN = 0;
    for (int t = 0; t < T; ++t) {
        cin >> ns[t] >> ms[t];
        all[t].resize(ms[t]);
        for (int i = 0; i < ms[t]; ++i) cin >> all[t][i];
        if (ns[t] + 1 > maxN) maxN = ns[t] + 1;
    }

    vector<long long> fact(maxN + 1, 1), invFact(maxN + 1, 1);
    for (int i = 1; i <= maxN; ++i) fact[i] = fact[i - 1] * i % MOD;
    invFact[maxN] = modPow(fact[maxN], MOD - 2);
    for (int i = maxN; i >= 1; --i) invFact[i - 1] = invFact[i] * i % MOD;

    for (int t = 0; t < T; ++t) {
        long long answer = fact[ns[t]];
        int total = 0;
        for (int x : all[t]) {
            answer = answer * invFact[x] % MOD;
            total += x;
        }
        if (total == ns[t] + 1) answer = answer * (ns[t] + 1LL) % MOD;
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["手套配对", {
      algorithm: "组合计数",
      complexity: "O(N + T)",
      code: `#include <iostream>
#include <vector>
using namespace std;

const long long MOD = 1000000007LL;
const int LIMIT = 2005;

long long modPow(long long base, long long exp) {
    long long result = 1;
    while (exp > 0) {
        if (exp & 1LL) result = result * base % MOD;
        base = base * base % MOD;
        exp >>= 1LL;
    }
    return result;
}

int main() {
    vector<long long> fact(LIMIT), invFact(LIMIT), pow2(LIMIT);
    fact[0] = 1;
    pow2[0] = 1;
    for (int i = 1; i < LIMIT; ++i) {
        fact[i] = fact[i - 1] * i % MOD;
        pow2[i] = pow2[i - 1] * 2 % MOD;
    }
    invFact[LIMIT - 1] = modPow(fact[LIMIT - 1], MOD - 2);
    for (int i = LIMIT - 2; i >= 0; --i) invFact[i] = invFact[i + 1] * (i + 1) % MOD;

    auto comb = [&](int n, int r) -> long long {
        if (r < 0 || r > n) return 0;
        return fact[n] * invFact[r] % MOD * invFact[n - r] % MOD;
    };

    int t;
    cin >> t;
    while (t--) {
        int n, m, k;
        cin >> n >> m >> k;
        int single = m - 2 * k;
        if (single < 0 || single > n - k) {
            cout << 0 << "\\n";
            continue;
        }
        long long answer = comb(n, k) * comb(n - k, single) % MOD * pow2[single] % MOD;
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["大量的工作沟通", {
      algorithm: "LCA 加路径最大编号",
      complexity: "O((n + qm) log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n;
    cin >> n;
    vector<int> parent(n, 0), depth(n, 0);
    for (int i = 1; i < n; ++i) cin >> parent[i];
    for (int i = 1; i < n; ++i) depth[i] = depth[parent[i]] + 1;

    int lg = 1;
    while ((1 << lg) <= n) ++lg;
    vector<vector<int>> up(lg, vector<int>(n, 0));
    vector<vector<int>> best(lg, vector<int>(n, 0));
    for (int v = 0; v < n; ++v) {
        up[0][v] = parent[v];
        best[0][v] = max(v, parent[v]);
    }
    best[0][0] = 0;
    for (int j = 1; j < lg; ++j) {
        for (int v = 0; v < n; ++v) {
            up[j][v] = up[j - 1][up[j - 1][v]];
            best[j][v] = max(best[j - 1][v], best[j - 1][up[j - 1][v]]);
        }
    }

    auto lca = [&](int a, int b) {
        if (depth[a] < depth[b]) swap(a, b);
        int diff = depth[a] - depth[b];
        for (int j = 0; j < lg; ++j) {
            if ((diff >> j) & 1) a = up[j][a];
        }
        if (a == b) return a;
        for (int j = lg - 1; j >= 0; --j) {
            if (up[j][a] != up[j][b]) {
                a = up[j][a];
                b = up[j][b];
            }
        }
        return parent[a];
    };

    auto maxOnPathToRoot = [&](int v) {
        int answer = v;
        int diff = depth[v];
        for (int j = lg - 1; j >= 0; --j) {
            if ((diff >> j) & 1) {
                answer = max(answer, best[j][v]);
                v = up[j][v];
            }
        }
        return answer;
    };

    int q;
    cin >> q;
    while (q--) {
        int m;
        cin >> m;
        int root;
        cin >> root;
        for (int i = 1; i < m; ++i) {
            int x;
            cin >> x;
            root = lca(root, x);
        }
        cout << maxOnPathToRoot(root) << "\\n";
    }
    return 0;
}`
    }],
    ["矩阵移动", {
      algorithm: "网格路径动态规划",
      complexity: "O(t * n * m * x)",
      code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    int tests;
    cin >> tests;
    const int NEG = -1000000000;
    while (tests--) {
        int n, m, limit;
        cin >> n >> m >> limit;
        vector<string> grid(n);
        for (int i = 0; i < n; ++i) cin >> grid[i];

        vector<vector<int>> dp(m, vector<int>(limit + 1, NEG));
        for (int r = 0; r < n; ++r) {
            vector<vector<int>> nextRow(m, vector<int>(limit + 1, NEG));
            for (int c = 0; c < m; ++c) {
                vector<int> best(limit + 1, NEG);
                if (r == 0 && c == 0) best[0] = 0;
                if (r > 0) {
                    for (int k = 0; k <= limit; ++k) best[k] = max(best[k], dp[c][k]);
                }
                if (c > 0) {
                    for (int k = 0; k <= limit; ++k) best[k] = max(best[k], nextRow[c - 1][k]);
                }
                for (int k = 0; k <= limit; ++k) {
                    if (best[k] == NEG) continue;
                    if (grid[r][c] == '1') {
                        nextRow[c][k] = max(nextRow[c][k], best[k] + 1);
                    } else if (grid[r][c] == '?') {
                        nextRow[c][k] = max(nextRow[c][k], best[k]);
                        if (k < limit) nextRow[c][k + 1] = max(nextRow[c][k + 1], best[k] + 1);
                    } else {
                        nextRow[c][k] = max(nextRow[c][k], best[k]);
                    }
                }
            }
            dp.swap(nextRow);
        }

        int answer = 0;
        for (int k = 0; k <= limit; ++k) answer = max(answer, dp[m - 1][k]);
        cout << answer << "\\n";
    }
    return 0;
}`
    }],
    ["俄罗斯方块", {
      algorithm: "连通块归一化",
      complexity: "O(nm log(nm))",
      code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <set>
#include <utility>
#include <vector>
using namespace std;

int main() {
    int n, m;
    cin >> n >> m;
    vector<vector<int>> color(n, vector<int>(m));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) cin >> color[i][j];
    }

    vector<vector<int>> visited(n, vector<int>(m, 0));
    set<vector<pair<int, int>>> shapes;
    const int dr[4] = {1, -1, 0, 0};
    const int dc[4] = {0, 0, 1, -1};

    for (int r = 0; r < n; ++r) {
        for (int c = 0; c < m; ++c) {
            if (visited[r][c]) continue;
            int currentColor = color[r][c];
            queue<pair<int, int>> q;
            vector<pair<int, int>> cells;
            visited[r][c] = 1;
            q.push({r, c});
            while (!q.empty()) {
                auto [x, y] = q.front();
                q.pop();
                cells.push_back({x, y});
                for (int dir = 0; dir < 4; ++dir) {
                    int nx = x + dr[dir];
                    int ny = y + dc[dir];
                    if (nx < 0 || nx >= n || ny < 0 || ny >= m) continue;
                    if (visited[nx][ny] || color[nx][ny] != currentColor) continue;
                    visited[nx][ny] = 1;
                    q.push({nx, ny});
                }
            }

            int minRow = n, minCol = m;
            for (auto [x, y] : cells) {
                minRow = min(minRow, x);
                minCol = min(minCol, y);
            }
            vector<pair<int, int>> normalized;
            normalized.reserve(cells.size());
            for (auto [x, y] : cells) normalized.push_back({x - minRow, y - minCol});
            sort(normalized.begin(), normalized.end());
            shapes.insert(normalized);
        }
    }

    cout << shapes.size() << "\\n";
    return 0;
}`
    }],
    ["接竹竿", {
      algorithm: "区间栈模拟",
      complexity: "O(q * (r - l + 1) * 13)",
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int tests;
    cin >> tests;
    while (tests--) {
        int n;
        cin >> n;
        vector<int> cards(n + 1);
        for (int i = 1; i <= n; ++i) cin >> cards[i];

        int q;
        cin >> q;
        while (q--) {
            int left, right;
            cin >> left >> right;
            vector<int> deck;
            for (int i = left; i <= right; ++i) {
                int same = -1;
                for (int j = 0; j < static_cast<int>(deck.size()); ++j) {
                    if (deck[j] == cards[i]) same = j;
                }
                if (same == -1) {
                    deck.push_back(cards[i]);
                } else {
                    deck.resize(same);
                }
            }
            cout << deck.size() << "\\n";
        }
    }
    return 0;
}`
    }],
    ["公倍数问题", {
      algorithm: "因子筛计数",
      complexity: "O(K log K)",
      code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    int n, m, k;
    cin >> n >> m >> k;

    vector<int> divisorsN(k + 1, 0), divisorsM(k + 1, 0);
    for (int d = 1; d <= n && d <= k; ++d) {
        for (int multiple = d; multiple <= k; multiple += d) ++divisorsN[multiple];
    }
    for (int d = 1; d <= m && d <= k; ++d) {
        for (int multiple = d; multiple <= k; multiple += d) ++divisorsM[multiple];
    }

    long long answer = 0;
    for (int value = 1; value <= k; ++value) {
        answer += 1LL * value * divisorsN[value] * divisorsM[value];
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["黑白方块#wanjuanwang:2024-06:cxx:level-4:programming:01:5zkpgd9le8nihh8j1rnq", {
      algorithm: "二维前缀和暴力枚举子矩形",
      complexity: "O(n^2 * m^2)",
      code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<string> grid(n + 1);
    for (int i = 1; i <= n; ++i) {
        string row;
        cin >> row;
        grid[i] = " " + row;
    }
    vector<vector<int>> prefix(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            int value = (grid[i][j] == '1' ? 1 : -1);
            prefix[i][j] = prefix[i - 1][j] + prefix[i][j - 1] - prefix[i - 1][j - 1] + value;
        }
    }
    auto rectSum = [&](int r1, int c1, int r2, int c2) {
        return prefix[r2][c2] - prefix[r1 - 1][c2] - prefix[r2][c1 - 1] + prefix[r1 - 1][c1 - 1];
    };
    int answer = 0;
    for (int r1 = 1; r1 <= n; ++r1) {
        for (int r2 = r1; r2 <= n; ++r2) {
            for (int c1 = 1; c1 <= m; ++c1) {
                for (int c2 = c1; c2 <= m; ++c2) {
                    if (rectSum(r1, c1, r2, c2) == 0) {
                        int area = (r2 - r1 + 1) * (c2 - c1 + 1);
                        if (area > answer) answer = area;
                    }
                }
            }
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["黑白方块#wanjuanwang:2024-09:cxx:level-4:programming:02:ntlwbvmtzy5tuqlux4bg", {
      algorithm: "枚举所有 4x4 子矩形",
      complexity: "O(t * n * m)",
      code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    int T;
    cin >> T;
    while (T--) {
        int n, m;
        cin >> n >> m;
        vector<string> grid(n);
        for (int i = 0; i < n; ++i) cin >> grid[i];
        bool ok = false;
        for (int i = 0; i + 3 < n && !ok; ++i) {
            for (int j = 0; j + 3 < m && !ok; ++j) {
                bool match = true;
                for (int c = 0; c < 4; ++c) {
                    if (grid[i][j + c] != '0') match = false;
                    if (grid[i + 3][j + c] != '0') match = false;
                }
                if (grid[i + 1][j] != '0' || grid[i + 1][j + 1] != '1' || grid[i + 1][j + 2] != '1' || grid[i + 1][j + 3] != '0') {
                    match = false;
                }
                if (grid[i + 2][j] != '0' || grid[i + 2][j + 1] != '1' || grid[i + 2][j + 2] != '1' || grid[i + 2][j + 3] != '0') {
                    match = false;
                }
                if (match) ok = true;
            }
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["树上移动", {
      algorithm: "枚举起点 DFS 统计路径黑点数",
      complexity: "O(n^2)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int n, k;
vector<int> color;
vector<vector<int>> graph;
int answer = 0;
void dfs(int u, int parent, int blackCount, int length) {
    if (blackCount <= k && length > answer) answer = length;
    for (int v : graph[u]) {
        if (v == parent) continue;
        dfs(v, u, blackCount + color[v], length + 1);
    }
}
int main() {
    cin >> n >> k;
    color.assign(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> color[i];
    graph.assign(n + 1, {});
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    for (int s = 1; s <= n; ++s) {
        dfs(s, 0, color[s], 1);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["二叉树", {
      algorithm: "树上差分 + DFS 传递翻转奇偶",
      complexity: "O(n + q)",
      code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<vector<int>> children(n + 1);
    for (int node = 2; node <= n; ++node) {
        int parent;
        cin >> parent;
        children[parent].push_back(node);
    }
    string color;
    cin >> color;
    int q;
    cin >> q;
    vector<int> flip(n + 1, 0);
    for (int i = 0; i < q; ++i) {
        int x;
        cin >> x;
        flip[x] ^= 1;
    }
    vector<int> stack = {1};
    vector<int> carry(n + 1, 0);
    while (!stack.empty()) {
        int u = stack.back();
        stack.pop_back();
        int current = flip[u] ^ carry[u];
        if (current) {
            color[u - 1] = (color[u - 1] == '0' ? '1' : '0');
        }
        for (int v : children[u]) {
            carry[v] = current;
            stack.push_back(v);
        }
    }
    cout << color << "\\n";
    return 0;
}`
    }],
    ["最远点对", {
      algorithm: "树形 DP 求每点到两种颜色的最远距离",
      complexity: "O(n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
const int NEG = -1000000000;
int main() {
    int n;
    cin >> n;
    vector<int> color(n + 1);
    for (int i = 1; i <= n; ++i) cin >> color[i];
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    vector<int> parent(n + 1, 0), order;
    order.reserve(n);
    order.push_back(1);
    for (int i = 0; i < (int)order.size(); ++i) {
        int u = order[i];
        for (int v : graph[u]) {
            if (v == parent[u]) continue;
            parent[v] = u;
            order.push_back(v);
        }
    }
    vector<array<int, 2>> down(n + 1, {NEG, NEG}), up(n + 1, {NEG, NEG});
    for (int i = n - 1; i >= 0; --i) {
        int u = order[i];
        down[u][color[u]] = 0;
        for (int v : graph[u]) {
            if (parent[v] != u) continue;
            for (int c = 0; c < 2; ++c) {
                if (down[v][c] != NEG) {
                    down[u][c] = max(down[u][c], down[v][c] + 1);
                }
            }
        }
    }
    for (int u : order) {
        array<int, 2> best1 = {NEG, NEG}, best2 = {NEG, NEG};
        vector<array<int, 2>> contribs;
        contribs.reserve(graph[u].size() + 1);
        contribs.push_back({color[u] == 0 ? 0 : NEG, color[u] == 1 ? 0 : NEG});
        if (up[u][0] != NEG || up[u][1] != NEG) contribs.push_back(up[u]);
        for (int v : graph[u]) {
            if (parent[v] != u) continue;
            array<int, 2> cur = {NEG, NEG};
            for (int c = 0; c < 2; ++c) {
                if (down[v][c] != NEG) cur[c] = down[v][c] + 1;
            }
            contribs.push_back(cur);
        }
        for (const auto& cur : contribs) {
            for (int c = 0; c < 2; ++c) {
                if (cur[c] > best1[c]) {
                    best2[c] = best1[c];
                    best1[c] = cur[c];
                } else if (cur[c] > best2[c]) {
                    best2[c] = cur[c];
                }
            }
        }
        for (int v : graph[u]) {
            if (parent[v] != u) continue;
            array<int, 2> cur = {NEG, NEG};
            for (int c = 0; c < 2; ++c) {
                if (down[v][c] != NEG) cur[c] = down[v][c] + 1;
            }
            for (int c = 0; c < 2; ++c) {
                int use = best1[c];
                if (cur[c] == best1[c]) use = best2[c];
                up[v][c] = (use == NEG ? NEG : use + 1);
            }
        }
    }
    int answer = 0;
    for (int u = 1; u <= n; ++u) {
        int other = color[u] ^ 1;
        answer = max(answer, max(down[u][other], up[u][other]));
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["黑白翻转", {
      algorithm: "统计黑点关键子树大小",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> color(n + 1);
    int blackCount = 0;
    for (int i = 1; i <= n; ++i) {
        cin >> color[i];
        blackCount += color[i];
    }
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    if (blackCount == 0) {
        cout << 1 << "\\n";
        return 0;
    }
    vector<int> parent(n + 1, 0), order;
    order.reserve(n);
    order.push_back(1);
    for (int i = 0; i < (int)order.size(); ++i) {
        int u = order[i];
        for (int v : graph[u]) {
            if (v == parent[u]) continue;
            parent[v] = u;
            order.push_back(v);
        }
    }
    vector<int> need(n + 1, 0);
    int steinerSize = 0;
    for (int i = n - 1; i >= 0; --i) {
        int u = order[i];
        need[u] = color[u];
        for (int v : graph[u]) {
            if (parent[v] == u) need[u] += need[v];
        }
        if (need[u] > 0) ++steinerSize;
    }
    cout << steinerSize - blackCount << "\\n";
    return 0;
}`
    }],
    ["黑白格", {
      algorithm: "二维前缀和枚举子矩形",
      complexity: "O(n^2 * m^2)",
      code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;
int main() {
    int n, m, k;
    cin >> n >> m >> k;
    vector<string> grid(n + 1);
    for (int i = 1; i <= n; ++i) {
        string row;
        cin >> row;
        grid[i] = " " + row;
    }
    vector<vector<int>> prefix(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            prefix[i][j] = prefix[i - 1][j] + prefix[i][j - 1] - prefix[i - 1][j - 1] + (grid[i][j] == '1');
        }
    }
    auto rectSum = [&](int r1, int c1, int r2, int c2) {
        return prefix[r2][c2] - prefix[r1 - 1][c2] - prefix[r2][c1 - 1] + prefix[r1 - 1][c1 - 1];
    };
    int answer = 0;
    bool found = false;
    for (int r1 = 1; r1 <= n; ++r1) {
        for (int r2 = r1; r2 <= n; ++r2) {
            for (int c1 = 1; c1 <= m; ++c1) {
                for (int c2 = c1; c2 <= m; ++c2) {
                    if (rectSum(r1, c1, r2, c2) >= k) {
                        int area = (r2 - r1 + 1) * (c2 - c1 + 1);
                        if (!found || area < answer) answer = area;
                        found = true;
                    }
                }
            }
        }
    }
    cout << (found ? answer : 0) << "\\n";
    return 0;
}`
    }],
    ["遍历计数", {
      algorithm: "树上 DFS 序计数公式",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
const long long MOD = 1000000000LL;
int main() {
    int n;
    cin >> n;
    vector<int> deg(n + 1, 0);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        ++deg[u];
        ++deg[v];
    }
    long long answer = 1;
    for (int i = 1; i <= n; ++i) {
        for (int x = 1; x <= deg[i] - 1; ++x) {
            answer = (answer * x) % MOD;
        }
    }
    answer = (answer * (2LL * (n - 1) % MOD)) % MOD;
    cout << answer % MOD << "\\n";
    return 0;
}`
    }],
    ["小杨买书", {
      algorithm: "整除与取余",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int m;
    cin >> m;
    cout << m / 13 << "\\n" << m % 13 << "\\n";
    return 0;
}`
    }],
    ["画三角形", {
      algorithm: "直接模拟",
      complexity: "O(n^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    int cur = 0;
    for (int i = 1; i <= n; ++i) {
        for (int j = 0; j < i; ++j) {
            cout << char('A' + cur);
            cur = (cur + 1) % 26;
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["进制判断", {
      algorithm: "扫描字符最大值",
      complexity: "O(total_length)",
      code: `#include <iostream>
#include <string>
using namespace std;
int valueOf(char ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return 100;
}
int main() {
    int n;
    cin >> n;
    while (n--) {
        string s;
        cin >> s;
        int maxValue = 0;
        for (char ch : s) {
            int value = valueOf(ch);
            if (value > maxValue) maxValue = value;
        }
        cout << (maxValue < 2 ? 1 : 0) << ' '
             << (maxValue < 8 ? 1 : 0) << ' '
             << (maxValue < 10 ? 1 : 0) << ' '
             << (maxValue < 16 ? 1 : 0) << "\\n";
    }
    return 0;
}`
    }],
    ["买文具", {
      algorithm: "直接计算",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int x, y, z, q;
    cin >> x >> y >> z >> q;
    int need = x * 2 + y * 5 + z * 3;
    if (q >= need) {
        cout << "Yes\\n" << q - need << "\\n";
    } else {
        cout << "No\\n" << need - q << "\\n";
    }
    return 0;
}`
    }],
    ["累计相加", {
      algorithm: "前缀和累加",
      complexity: "O(n)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    long long prefix = 0;
    long long answer = 0;
    for (int i = 1; i <= n; ++i) {
        prefix += i;
        answer += prefix;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["时间规划", {
      algorithm: "转分钟相减",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int h1, m1, h2, m2;
    cin >> h1 >> m1 >> h2 >> m2;
    cout << (h2 * 60 + m2) - (h1 * 60 + m1) << "\\n";
    return 0;
}`
    }],
    ["自幂数判断", {
      algorithm: "按位拆分并求幂和",
      complexity: "O(M * digits)",
      code: `#include <iostream>
#include <string>
using namespace std;
long long powerll(int base, int exp) {
    long long result = 1;
    while (exp--) result *= base;
    return result;
}
int main() {
    int m;
    cin >> m;
    while (m--) {
        string s;
        cin >> s;
        int digits = static_cast<int>(s.size());
        long long sum = 0;
        for (char ch : s) {
            sum += powerll(ch - '0', digits);
        }
        long long value = stoll(s);
        cout << (sum == value ? 'T' : 'F') << "\\n";
    }
    return 0;
}`
    }],
    ["春游", {
      algorithm: "布尔标记统计",
      complexity: "O(N + M)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<int> seen(n, 0);
    for (int i = 0; i < m; ++i) {
        int x;
        cin >> x;
        seen[x] = 1;
    }
    bool allArrived = true;
    for (int i = 0; i < n; ++i) {
        if (!seen[i]) {
            allArrived = false;
            break;
        }
    }
    if (allArrived) {
        cout << n << "\\n";
        return 0;
    }
    bool first = true;
    for (int i = 0; i < n; ++i) {
        if (!seen[i]) {
            if (!first) cout << ' ';
            cout << i;
            first = false;
        }
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["每月天数", {
      algorithm: "按月份分类并判断闰年",
      complexity: "O(1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int year, month;
    cin >> year >> month;
    if (month == 2) {
        bool leap = (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
        cout << (leap ? 29 : 28) << "\\n";
    } else if (month == 4 || month == 6 || month == 9 || month == 11) {
        cout << 30 << "\\n";
    } else {
        cout << 31 << "\\n";
    }
    return 0;
}`
    }],
    ["小杨的 X 字矩阵", {
      algorithm: "按位置直接构造",
      complexity: "O(n^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int n;
    cin >> n;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            cout << ((j == i || j == n - 1 - i) ? '+' : '-');
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["百鸡问题", {
      algorithm: "枚举公鸡数和母鸡数",
      complexity: "O(m^2)",
      code: `#include <iostream>
using namespace std;
int main() {
    int x, y, z, n, m;
    cin >> x >> y >> z >> n >> m;
    int answer = 0;
    for (int rooster = 0; rooster <= m; ++rooster) {
        for (int hen = 0; rooster + hen <= m; ++hen) {
            int chick = m - rooster - hen;
            if (chick % z != 0) continue;
            if (rooster * x + hen * y + chick / z == n) {
                ++answer;
            }
        }
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["小杨的储蓄", {
      algorithm: "直接模拟",
      complexity: "O(D)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, d;
    cin >> n >> d;
    vector<long long> sum(n, 0);
    for (int day = 1; day <= d; ++day) {
        int a;
        cin >> a;
        sum[a] += day;
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << sum[i];
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["树上旅行", {
      algorithm: "父链与最小儿子链二进制跳跃",
      complexity: "O((n + q + Σk) log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, q;
    cin >> n >> q;
    vector<int> parent(n + 1, 1), minChild(n + 1, 0);
    for (int i = 2; i <= n; ++i) {
        cin >> parent[i];
        if (minChild[parent[i]] == 0 || i < minChild[parent[i]]) {
            minChild[parent[i]] = i;
        }
    }
    const int LOG = 18;
    vector<vector<int>> up(LOG, vector<int>(n + 1, 1));
    vector<vector<int>> down(LOG, vector<int>(n + 1, 1));
    for (int i = 1; i <= n; ++i) {
        up[0][i] = (i == 1 ? 1 : parent[i]);
        down[0][i] = (minChild[i] == 0 ? i : minChild[i]);
    }
    for (int j = 1; j < LOG; ++j) {
        for (int i = 1; i <= n; ++i) {
            up[j][i] = up[j - 1][up[j - 1][i]];
            down[j][i] = down[j - 1][down[j - 1][i]];
        }
    }
    auto jump = [&](int node, int steps, const vector<vector<int>>& table) {
        for (int j = 0; j < LOG; ++j) {
            if (steps & (1 << j)) node = table[j][node];
        }
        return node;
    };
    while (q--) {
        int s, k;
        cin >> s >> k;
        int cur = s;
        for (int i = 0; i < k; ++i) {
            int move;
            cin >> move;
            if (move > 0) cur = jump(cur, move, up);
            else cur = jump(cur, -move, down);
        }
        cout << cur << "\\n";
    }
    return 0;
}`
    }],
    ["割裂", {
      algorithm: "LCA + 树上差分统计路径覆盖",
      complexity: "O((n + a) log n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, a;
    cin >> n >> a;
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    const int LOG = 18;
    vector<int> depth(n + 1, 0), parent(n + 1, 0), order;
    vector<vector<int>> up(LOG, vector<int>(n + 1, 0));
    order.reserve(n);
    order.push_back(1);
    parent[1] = 0;
    for (int i = 0; i < (int)order.size(); ++i) {
        int u = order[i];
        for (int v : graph[u]) {
            if (v == parent[u]) continue;
            parent[v] = u;
            depth[v] = depth[u] + 1;
            order.push_back(v);
        }
    }
    for (int i = 1; i <= n; ++i) up[0][i] = parent[i];
    for (int j = 1; j < LOG; ++j) {
        for (int i = 1; i <= n; ++i) {
            up[j][i] = up[j - 1][i] ? up[j - 1][up[j - 1][i]] : 0;
        }
    }
    auto lca = [&](int u, int v) {
        if (depth[u] < depth[v]) swap(u, v);
        int diff = depth[u] - depth[v];
        for (int j = 0; j < LOG; ++j) {
            if (diff & (1 << j)) u = up[j][u];
        }
        if (u == v) return u;
        for (int j = LOG - 1; j >= 0; --j) {
            if (up[j][u] != up[j][v]) {
                u = up[j][u];
                v = up[j][v];
            }
        }
        return parent[u];
    };
    vector<long long> diff(n + 1, 0);
    for (int i = 0; i < a; ++i) {
        int u, v;
        cin >> u >> v;
        int w = lca(u, v);
        diff[u] += 1;
        diff[v] += 1;
        diff[w] -= 1;
        if (parent[w]) diff[parent[w]] -= 1;
    }
    int bu, bv;
    cin >> bu >> bv;
    vector<long long> cover = diff;
    for (int i = n - 1; i >= 1; --i) {
        int u = order[i];
        cover[parent[u]] += cover[u];
    }
    int w = lca(bu, bv);
    int answer = 0;
    int u = bu;
    while (u != w) {
        if (cover[u] == 0) ++answer;
        u = parent[u];
    }
    vector<int> path;
    u = bv;
    while (u != w) {
        path.push_back(u);
        u = parent[u];
    }
    if (cover[w] == 0) ++answer;
    for (int i = (int)path.size() - 1; i >= 0; --i) {
        if (cover[path[i]] == 0) ++answer;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["燃烧", {
      algorithm: "按权值升序的树上 DAG 动态规划",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n;
    cin >> n;
    vector<int> a(n + 1);
    for (int i = 1; i <= n; ++i) cin >> a[i];
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }
    vector<int> order(n);
    for (int i = 0; i < n; ++i) order[i] = i + 1;
    sort(order.begin(), order.end(), [&](int lhs, int rhs) {
        if (a[lhs] != a[rhs]) return a[lhs] < a[rhs];
        return lhs < rhs;
    });
    vector<int> dp(n + 1, 1);
    int answer = 1;
    for (int u : order) {
        for (int v : graph[u]) {
            if (a[u] > a[v]) dp[u] += dp[v];
        }
        answer = max(answer, dp[u]);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["美丽路径", {
      algorithm: "删边后求森林直径",
      complexity: "O(n)",
      code: `#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;
pair<int, int> farthest(int start, const vector<vector<int>>& graph, vector<int>& seen, vector<int>* component) {
    queue<int> q;
    q.push(start);
    seen[start] = 1;
    vector<int> dist(graph.size(), -1);
    dist[start] = 0;
    int bestNode = start;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        if (component) component->push_back(u);
        if (dist[u] > dist[bestNode]) bestNode = u;
        for (int v : graph[u]) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            seen[v] = 1;
            q.push(v);
        }
    }
    return {bestNode, dist[bestNode] + 1};
}
int main() {
    int n;
    cin >> n;
    vector<int> color(n + 1);
    for (int i = 1; i <= n; ++i) cin >> color[i];
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        if (color[u] != color[v]) {
            graph[u].push_back(v);
            graph[v].push_back(u);
        }
    }
    vector<int> seen(n + 1, 0);
    int answer = 1;
    for (int i = 1; i <= n; ++i) {
        if (seen[i]) continue;
        vector<int> component;
        auto [endpoint, _] = farthest(i, graph, seen, &component);
        vector<int> dummySeen(n + 1, 0);
        auto [__, diameter] = farthest(endpoint, graph, dummySeen, nullptr);
        answer = max(answer, diameter);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["试题名称：美丽路径", {
      algorithm: "删边后求森林直径",
      complexity: "O(n)",
      code: `#include <iostream>
#include <queue>
#include <utility>
#include <vector>
using namespace std;
pair<int, int> farthest(int start, const vector<vector<int>>& graph, vector<int>& seen, vector<int>* component) {
    queue<int> q;
    q.push(start);
    seen[start] = 1;
    vector<int> dist(graph.size(), -1);
    dist[start] = 0;
    int bestNode = start;
    while (!q.empty()) {
        int u = q.front();
        q.pop();
        if (component) component->push_back(u);
        if (dist[u] > dist[bestNode]) bestNode = u;
        for (int v : graph[u]) {
            if (dist[v] != -1) continue;
            dist[v] = dist[u] + 1;
            seen[v] = 1;
            q.push(v);
        }
    }
    return {bestNode, dist[bestNode] + 1};
}
int main() {
    int n;
    cin >> n;
    vector<int> color(n + 1);
    for (int i = 1; i <= n; ++i) cin >> color[i];
    vector<vector<int>> graph(n + 1);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        if (color[u] != color[v]) {
            graph[u].push_back(v);
            graph[v].push_back(u);
        }
    }
    vector<int> seen(n + 1, 0);
    int answer = 1;
    for (int i = 1; i <= n; ++i) {
        if (seen[i]) continue;
        vector<int> component;
        auto [endpoint, _] = farthest(i, graph, seen, &component);
        vector<int> dummySeen(n + 1, 0);
        auto [__, diameter] = farthest(endpoint, graph, dummySeen, nullptr);
        answer = max(answer, diameter);
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["线图", {
      algorithm: "统计每个点贡献的边对数",
      complexity: "O(n + m)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int n, m;
    cin >> n >> m;
    vector<long long> deg(n + 1, 0);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        ++deg[u];
        ++deg[v];
    }
    long long answer = 0;
    for (int i = 1; i <= n; ++i) {
        answer += deg[i] * (deg[i] - 1) / 2;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["图上移动", {
      algorithm: "bitset 动态转移",
      complexity: "O(k * n^3 / 64)",
      code: `#include <bitset>
#include <iostream>
#include <vector>
using namespace std;
const int MAXN = 505;
int main() {
    int n, m, k;
    cin >> n >> m >> k;
    vector<bitset<MAXN>> incoming(n + 1);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        incoming[v].set(u);
        incoming[u].set(v);
    }
    vector<bitset<MAXN>> current(n + 1), nextState(n + 1);
    vector<vector<int>> answer(n + 1, vector<int>(k + 1, 0));
    for (int i = 1; i <= n; ++i) current[i].set(i);
    for (int step = 1; step <= k; ++step) {
        for (int s = 1; s <= n; ++s) {
            nextState[s].reset();
            for (int v = 1; v <= n; ++v) {
                if ((current[s] & incoming[v]).any()) {
                    nextState[s].set(v);
                }
            }
            answer[s][step] = static_cast<int>(nextState[s].count());
        }
        current.swap(nextState);
    }
    for (int s = 1; s <= n; ++s) {
        for (int step = 1; step <= k; ++step) {
            if (step > 1) cout << ' ';
            cout << answer[s][step];
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["小杨寻宝", {
      algorithm: "树上关键子树判定",
      complexity: "O(n)",
      code: `#include <iostream>
#include <vector>
using namespace std;
int main() {
    int T;
    cin >> T;
    while (T--) {
        int n;
        cin >> n;
        vector<int> treasure(n + 1);
        int totalTreasure = 0;
        for (int i = 1; i <= n; ++i) {
            cin >> treasure[i];
            totalTreasure += treasure[i];
        }
        vector<vector<int>> graph(n + 1);
        for (int i = 0; i < n - 1; ++i) {
            int u, v;
            cin >> u >> v;
            graph[u].push_back(v);
            graph[v].push_back(u);
        }
        vector<int> parent(n + 1, 0), order;
        order.reserve(n);
        order.push_back(1);
        for (int i = 0; i < (int)order.size(); ++i) {
            int u = order[i];
            for (int v : graph[u]) {
                if (v == parent[u]) continue;
                parent[v] = u;
                order.push_back(v);
            }
        }
        vector<int> need(n + 1, 0);
        for (int i = n - 1; i >= 0; --i) {
            int u = order[i];
            need[u] = treasure[u];
            for (int v : graph[u]) {
                if (parent[v] == u) need[u] += need[v];
            }
        }
        bool ok = true;
        for (int u = 1; u <= n && ok; ++u) {
            if (need[u] == 0) continue;
            int degreeInSteiner = 0;
            if (parent[u] != 0 && need[u] < totalTreasure) ++degreeInSteiner;
            for (int v : graph[u]) {
                if (parent[v] == u && need[v] > 0) ++degreeInSteiner;
            }
            if (degreeInSteiner > 2) ok = false;
        }
        cout << (ok ? "Yes" : "No") << "\\n";
    }
    return 0;
}`
    }],
    ["小明的幸运数（2023年9月C++一级）", {
      algorithm: "区间枚举",
      complexity: "O(r - l + 1)",
      code: `#include <iostream>
using namespace std;
int main() {
    int k, l, r;
    cin >> k >> l >> r;
    long long answer = 0;
    for (int x = l; x <= r; ++x) {
        if (x % k == 0 || x % 10 == k) answer += x;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["长方形面积", {
      algorithm: "枚举因子",
      complexity: "O(sqrt(A))",
      code: `#include <iostream>
using namespace std;

int main() {
    int area;
    cin >> area;
    int answer = 0;
    for (int width = 1; 1LL * width * width <= area; ++width) {
        if (area % width == 0) ++answer;
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["数字黑洞", {
      algorithm: "模拟",
      complexity: "O(1)",
      code: `#include <algorithm>
#include <iostream>
#include <string>
using namespace std;

int transform(int x) {
    string s = to_string(x);
    while (s.size() < 3) s = "0" + s;
    string asc = s;
    sort(asc.begin(), asc.end());
    string desc = asc;
    reverse(desc.begin(), desc.end());
    return stoi(desc) - stoi(asc);
}

int main() {
    int n;
    cin >> n;
    int count = 0;
    while (n != 495) {
        n = transform(n);
        ++count;
    }
    cout << count << "\\n";
    return 0;
}`
    }],
    ["密码合规检测", {
      algorithm: "字符串校验",
      complexity: "O(n)",
      code: `#include <iostream>
#include <string>
using namespace std;

bool valid(const string& s) {
    if (s.size() < 6 || s.size() > 12) return false;
    bool hasLower = false, hasUpper = false, hasDigit = false, hasSpecial = false;
    for (char ch : s) {
        if (ch >= 'a' && ch <= 'z') hasLower = true;
        else if (ch >= 'A' && ch <= 'Z') hasUpper = true;
        else if (ch >= '0' && ch <= '9') hasDigit = true;
        else if (ch == '!' || ch == '@' || ch == '#' || ch == '$') hasSpecial = true;
        else return false;
    }
    int kinds = static_cast<int>(hasLower) + static_cast<int>(hasUpper) + static_cast<int>(hasDigit);
    return kinds >= 2 && hasSpecial;
}

int main() {
    string line;
    cin >> line;
    string current;
    bool first = true;
    for (int i = 0; i <= static_cast<int>(line.size()); ++i) {
        if (i == static_cast<int>(line.size()) || line[i] == ',') {
            if (valid(current)) {
                if (!first) cout << "\\n";
                cout << current;
                first = false;
            }
            current.clear();
        } else {
            current += line[i];
        }
    }
    if (!first) cout << "\\n";
    return 0;
}`
    }],
    ["幸运数", {
      algorithm: "按位模拟",
      complexity: "O(n * d)",
      code: `#include <iostream>
using namespace std;

int compressDigit(int x) {
    x *= 7;
    while (x > 9) {
        int sum = 0;
        while (x > 0) {
            sum += x % 10;
            x /= 10;
        }
        x = sum;
    }
    return x;
}

bool isLucky(long long x) {
    int position = 1;
    int total = 0;
    while (x > 0) {
        int digit = static_cast<int>(x % 10);
        if (position % 2 == 1) total += compressDigit(digit);
        else total += digit;
        x /= 10;
        ++position;
    }
    return total % 8 == 0;
}

int main() {
    int n;
    cin >> n;
    while (n--) {
        long long x;
        cin >> x;
        cout << (isLucky(x) ? 'T' : 'F') << "\\n";
    }
    return 0;
}`
    }],
    ["图像压缩", {
      algorithm: "频次统计加最近值映射",
      complexity: "O(nm + 256 log 256)",
      code: `#include <algorithm>
#include <cmath>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int hexValue(char ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    if (ch >= 'A' && ch <= 'F') return ch - 'A' + 10;
    return ch - 'a' + 10;
}

char toHexDigit(int x) {
    return x < 10 ? static_cast<char>('0' + x) : static_cast<char>('A' + x - 10);
}

string toHexByte(int x) {
    string s;
    s += toHexDigit(x / 16);
    s += toHexDigit(x % 16);
    return s;
}

int main() {
    int n;
    cin >> n;
    vector<vector<int>> image(n);
    vector<int> freq(256, 0);
    for (int i = 0; i < n; ++i) {
        string row;
        cin >> row;
        int m = static_cast<int>(row.size()) / 2;
        image[i].resize(m);
        for (int j = 0; j < m; ++j) {
            int value = hexValue(row[2 * j]) * 16 + hexValue(row[2 * j + 1]);
            image[i][j] = value;
            ++freq[value];
        }
    }

    vector<int> values(256);
    for (int i = 0; i < 256; ++i) values[i] = i;
    sort(values.begin(), values.end(), [&](int a, int b) {
        if (freq[a] != freq[b]) return freq[a] > freq[b];
        return a < b;
    });

    vector<int> keep(values.begin(), values.begin() + 16);
    for (int x : keep) cout << toHexByte(x);
    cout << "\\n";

    vector<int> rankOf(256, -1);
    for (int i = 0; i < 16; ++i) rankOf[keep[i]] = i;

    for (const auto& row : image) {
        for (int pixel : row) {
            int bestIndex = 0;
            int bestDiff = abs(pixel - keep[0]);
            for (int i = 1; i < 16; ++i) {
                int diff = abs(pixel - keep[i]);
                if (diff < bestDiff || (diff == bestDiff && i < bestIndex)) {
                    bestDiff = diff;
                    bestIndex = i;
                }
            }
            cout << toHexDigit(bestIndex);
        }
        cout << "\\n";
    }
    return 0;
}`
    }],
    ["变长编码（2023年9月C++四级）", {
      algorithm: "按 7 bit 分组模拟",
      complexity: "O(log N)",
      code: `#include <iostream>
#include <vector>
using namespace std;

char toHexDigit(int x) {
    return x < 10 ? static_cast<char>('0' + x) : static_cast<char>('A' + x - 10);
}

int main() {
    unsigned long long n;
    cin >> n;
    vector<int> bytes;
    do {
        bytes.push_back(static_cast<int>(n & 127ULL));
        n >>= 7ULL;
    } while (n > 0);
    for (int i = 0; i < static_cast<int>(bytes.size()); ++i) {
        int value = bytes[i];
        if (i + 1 < static_cast<int>(bytes.size())) value += 128;
        if (i > 0) cout << ' ';
        cout << toHexDigit(value / 16) << toHexDigit(value % 16);
    }
    cout << "\\n";
    return 0;
}`
    }],
    ["进制转换（2023年9月C++四级））", {
      algorithm: "按位展开",
      complexity: "O(总位数)",
      code: `#include <iostream>
#include <string>
using namespace std;

int digitValue(char ch) {
    if (ch >= '0' && ch <= '9') return ch - '0';
    return ch - 'A' + 10;
}

int main() {
    int n;
    cin >> n;
    while (n--) {
        long long base;
        string s;
        cin >> base >> s;
        long long value = 0;
        for (char ch : s) value = value * base + digitValue(ch);
        cout << value << "\\n";
    }
    return 0;
}`
    }],
    ["巧夺大奖（2023.9C++五级）", {
      algorithm: "按截止时间贪心加小根堆",
      complexity: "O(n log n)",
      code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

struct Game {
    int deadline;
    int reward;
};

int main() {
    int n;
    cin >> n;
    vector<Game> games(n);
    for (int i = 0; i < n; ++i) cin >> games[i].deadline;
    for (int i = 0; i < n; ++i) cin >> games[i].reward;
    sort(games.begin(), games.end(), [](const Game& a, const Game& b) {
        if (a.deadline != b.deadline) return a.deadline < b.deadline;
        return a.reward > b.reward;
    });
    priority_queue<int, vector<int>, greater<int>> chosen;
    for (const auto& game : games) {
        chosen.push(game.reward);
        if (static_cast<int>(chosen.size()) > game.deadline) chosen.pop();
    }
    long long answer = 0;
    while (!chosen.empty()) {
        answer += chosen.top();
        chosen.pop();
    }
    cout << answer << "\\n";
    return 0;
}`
    }],
    ["小杨的握手问题（2023.9C++六级）", {
      algorithm: "树状数组统计前缀较小值个数",
      complexity: "O(n log n)",
      code: `#include <iostream>
#include <vector>
using namespace std;

struct Fenwick {
    int n;
    vector<int> tree;
    explicit Fenwick(int n) : n(n), tree(n + 1, 0) {}
    void add(int index, int delta) {
        ++index;
        while (index <= n) {
            tree[index] += delta;
            index += index & -index;
        }
    }
    int sumPrefix(int index) const {
        ++index;
        int result = 0;
        while (index > 0) {
            result += tree[index];
            index -= index & -index;
        }
        return result;
    }
};

int main() {
    int n;
    cin >> n;
    Fenwick bit(n);
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        answer += bit.sumPrefix(x - 1);
        bit.add(x, 1);
    }
    cout << answer << "\\n";
    return 0;
}`
    }]
  ]);
}

function extractShortTitle(question) {
  const text = String(question.stem_text || "");
  const markers = [" 时间限制", " 题目描述", " 题面描述", " 问题描述", "【问题描述】", "【输入描述】", "输入格式"];
  let end = text.length;
  for (const marker of markers) {
    const index = text.indexOf(marker);
    if (index !== -1) end = Math.min(end, index);
  }
  return text.slice(0, end).trim();
}

function normalizeSamples(question, title) {
  if (question.id === "wanjuanwang:2024-03:cxx:level-8:programming:01:4u5mghkr8lj71555ax9h") {
    return [
      {
        name: "sample-1",
        input: "1\n6\n1 2 2 3 1 3\n4\n1 3\n1 6\n1 5\n5 6\n",
        output: "1\n1\n0\n2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-03:cxx:level-8:programming:02:d0anqftr471apn649r0k") {
    return [
      {
        name: "sample-1",
        input: "2 5 2\n",
        output: "9"
      },
      {
        name: "sample-2",
        input: "100 100 100\n",
        output: "185233"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-09:cxx:level-7:programming:01:lw4ldy2i5ak7229w2cxq") {
    return [
      {
        name: "sample-1",
        input: "2\n3 3 1\n000\n111\n01?\n3 3 1\n000\n?0?\n01?\n",
        output: "4\n2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-03:cxx:level-7:programming:02:rbg8vw9uit4sfot1peoy") {
    return [
      {
        name: "sample-1",
        input: "5 6\n1 2 3 4 4 5\n1 2 3 3 4 5\n1 2 2 3 4 5\n1 6 6 7 7 8\n6 6 7 7 8 8\n",
        output: "7"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-03:cxx:level-1:programming:01:bqqig3f2zgd8ja6rtt5n") {
    return [
      {
        name: "sample-1",
        input: "4\n",
        output: "2"
      },
      {
        name: "sample-2",
        input: "6\n",
        output: "2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-09:cxx:level-8:programming:02:4djcedxylsacsjopyrpr") {
    return [
      {
        name: "sample-1",
        input: "2\n5 6 2\n5 1 5\n",
        output: "120\n0"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-12:cxx:level-7:programming:02:mols8fykmpc33njry9v1") {
    return [
      {
        name: "sample-1",
        input: "4\n1 2 10 100\n1 100 1\n1 1 2 0\n",
        output: "219"
      },
      {
        name: "sample-2",
        input: "6\n3 7 2 8 9 4\n1 3 9 27 81\n0 1 2 1 2 0\n",
        output: "56"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-12:cxx:level-8:programming:01:g1dhltyatpbcu8huk9vl") {
    return [
      {
        name: "sample-1",
        input: "3\n3 2 1 2\n3 2 1 3\n5 3 3 1 1\n",
        output: "3\n4\n20"
      },
      {
        name: "sample-2",
        input: "5\n100 1 100\n100 1 101 20\n2 12 8\n123 4 80 20 21\n3 999 5 101 234 499 66 99\n",
        output: "1\n1\n125970\n895031741\n307187590"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-12:cxx:level-8:programming:02:px427dpl0j35826uvz0n") {
    return [
      {
        name: "sample-1",
        input: "5\n0 0 2 2\n3\n2 3 4\n3 2 3 4\n2 1 4\n",
        output: "2\n2\n0"
      },
      {
        name: "sample-2",
        input: "7\n0 1 0 2 1 2\n5\n2 4 6\n2 4 5\n3 4 5 6\n4 2 4 5 6\n2 3 4\n",
        output: "2\n1\n1\n1\n0"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-12:cxx:level-8:programming:02:8k63f1vsibnh27e7sf3y") {
    return [
      {
        name: "sample-1",
        input: "5 1\n0 0 1 1 1\n1 2\n2 3\n2 5\n1 4\n",
        output: "3"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-06:cxx:level-6:programming:02:3fj0ub6xjqoecovk2p6p") {
    return [
      {
        name: "sample-1",
        input: "6\n3 1 1 3 4\n100101\n3\n1\n3\n2\n",
        output: "010000"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-06:cxx:level-8:programming:02:g1zu4d8izz9cw4lxjugt") {
    return [
      {
        name: "sample-1",
        input: "5\n0 1 0 1 0\n1 2\n1 3\n3 4\n3 5\n",
        output: "3"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-06:cxx:level-7:programming:02:y485au2qduxay25rzy7w") {
    return [
      {
        name: "sample-1",
        input: "5\n0 1 0 1 0\n1 2\n1 3\n3 4\n3 5\n",
        output: "2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-06:cxx:level-5:programming:01:cchxdwjcutisq6kggczc") {
    return [
      {
        name: "sample-1",
        input: "4 5 5\n00000\n01111\n00011\n00011\n",
        output: "6"
      }
    ];
  }
  if (question.id === "wanjuanwang:2025-06:cxx:level-8:programming:01:nhw6xyl3lvg2ymljjfc7") {
    return [
      {
        name: "sample-1",
        input: "4\n1 2\n2 3\n3 4\n",
        output: "6"
      },
      {
        name: "sample-2",
        input: "8\n1 2\n1 3\n1 4\n2 5\n2 6\n3 7\n3 8\n",
        output: "112"
      }
    ];
  }
  if (question.id === "wanjuanwang:2025-06:cxx:level-8:programming:02:q37uyylt05sc3krbqmd2") {
    return [
      {
        name: "sample-1",
        input: "5 4\n1 1 2 2\n3 3\n1 -1 -1\n2 5\n1 -1 1 -1 1\n5 8\n1 1 1 -1 -1 -1 -1 -1\n5 3\n-1 -1 1\n",
        output: "4\n1\n4\n2"
      },
      {
        name: "sample-2",
        input: "8 3\n5 4 2 1 3 6 6\n8 1\n8\n8 2\n8 -8\n8 3\n8 -8 8\n",
        output: "1\n7\n1"
      }
    ];
  }
  if (question.id === "wanjuanwang:2025-03:cxx:level-8:programming:02:yscw0a7hxfr6fn0b68xy") {
    return [
      {
        name: "sample-1",
        input: "6 2\n1 3\n1 5\n3 6\n3 2\n5 4\n5 4\n5 3\n2 6\n",
        output: "2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-03:cxx:level-1:programming:01:dsgvbq4unepcn1fg9o93") {
    return [
      {
        name: "sample-1",
        input: "100\n",
        output: "7\n9"
      },
      {
        name: "sample-2",
        input: "199\n",
        output: "15\n4"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-03:cxx:level-2:programming:02:eshp4smw94tfn9dyz0pb") {
    return [
      {
        name: "sample-1",
        input: "3\n",
        output: "A\nBC\nDEF"
      },
      {
        name: "sample-2",
        input: "7\n",
        output: "A\nBC\nDEF\nGHIJ\nKLMNO\nPQRSTU\nVWXYZAB"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-09:cxx:level-3:programming:01:whglsvzkznd5jdtg3eui") {
    return [
      {
        name: "sample-1",
        input: "2\n15A6F\n1011\n",
        output: "0 0 0 1\n1 1 1 1"
      },
      {
        name: "sample-2",
        input: "4\n1234567\n12345678\nFF\nGG\n",
        output: "0 1 1 1\n0 0 1 1\n0 0 0 1\n0 0 0 0"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-09:cxx:level-1:programming:02:eel6xc50vglse73oauf7") {
    return [
      {
        name: "sample-1",
        input: "1\n1\n1\n20\n",
        output: "Yes\n10"
      },
      {
        name: "sample-2",
        input: "1\n1\n1\n5\n",
        output: "No\n5"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-06:cxx:level-1:programming:01:nuw5welz4j21iozrvg1s") {
    return [
      {
        name: "sample-1",
        input: "3\n",
        output: "10"
      },
      {
        name: "sample-2",
        input: "4\n",
        output: "20"
      },
      {
        name: "sample-3",
        input: "10\n",
        output: "220"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-03:cxx:level-2:programming:01:cn7knly65yc7htotc1nz") {
    return [
      {
        name: "sample-1",
        input: "5 3 3 100 100\n",
        output: "4"
      },
      {
        name: "sample-2",
        input: "1 1 1 100 100\n",
        output: "5151"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-06:cxx:level-1:programming:02:bmv29j2oyf21wrtrgh17") {
    return [
      {
        name: "sample-1",
        input: "9\n5\n9\n6\n",
        output: "1"
      },
      {
        name: "sample-2",
        input: "9\n5\n10\n0\n",
        output: "55"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-03:cxx:level-1:programming:02:e27ibiwnig4za492lkg7") {
    return [
      {
        name: "sample-1",
        input: "2022 1\n",
        output: "31"
      },
      {
        name: "sample-2",
        input: "2020 2\n",
        output: "29"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-09:cxx:level-2:programming:01:rsxrupj1lc55ilky73es") {
    return [
      {
        name: "sample-1",
        input: "5\n",
        output: "+---+\n-+-+-\n--+--\n-+-+-\n+---+"
      },
      {
        name: "sample-2",
        input: "7\n",
        output: "+-----+\n-+---+-\n--+-+--\n---+---\n--+-+--\n-+---+-\n+-----+"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-06:cxx:level-2:programming:02:d5ve1sldlwazkbbd3hkk") {
    return [
      {
        name: "sample-1",
        input: "3\n152\n111\n153\n",
        output: "F\nF\nT"
      },
      {
        name: "sample-2",
        input: "5\n8208\n548834\n88593477\n12345\n5432\n",
        output: "T\nT\nT\nF\nF"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-06:cxx:level-3:programming:02:1bjfsydegdxox09cj6f3") {
    return [
      {
        name: "sample-1",
        input: "3 3\n0 2 1\n",
        output: "3"
      },
      {
        name: "sample-2",
        input: "3 5\n0 0 0 0 0\n",
        output: "1 2"
      }
    ];
  }
  if (question.id === "wanjuanwang:2023-09:cxx:level-3:programming:02:kehmte0rgxf4lix22xvq") {
    return [
      {
        name: "sample-1",
        input: "2 3\n0 1 0\n",
        output: "4 2"
      },
      {
        name: "sample-2",
        input: "3 5\n0 0 0 2 0\n",
        output: "11 0 4"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-09:cxx:level-4:programming:02:ntlwbvmtzy5tuqlux4bg") {
    return [
      {
        name: "sample-1",
        input: "3\n1 4\n0110\n5 5\n00000\n01100\n01100\n00001\n01100\n5 5\n00000\n01100\n01110\n00001\n01100\n",
        output: "No\nYes\nNo"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-06:cxx:level-4:programming:01:5zkpgd9le8nihh8j1rnq") {
    return [
      {
        name: "sample-1",
        input: "4 5\n00000\n01111\n00011\n00011\n",
        output: "16"
      }
    ];
  }
  if (question.id === "wanjuanwang:2024-09:cxx:level-8:programming:01:ghjz2abqdvdd9xm5mf6p") {
    return [
      {
        name: "sample-1",
        input: "5\n1 0 0 1 0\n1 2\n3 5\n4 3\n1 3\n",
        output: "4"
      },
      {
        name: "sample-2",
        input: "5\n0 0 0 0 0\n1 2\n2 3\n3 4\n4 5\n",
        output: "1"
      }
    ];
  }
  if (title === "寻找倍数") {
    return [
      {
        name: "sample-1",
        input: "2\n3\n1 2 4\n5\n1 2 3 4 5\n",
        output: "Yes\nNo"
      }
    ];
  }
  if (title === "工作沟通") {
    return [
      {
        name: "sample-1",
        input: "5\n0 0 2 2\n3\n2 3 4\n3 2 3 4\n2 1 4\n",
        output: "2\n2\n0"
      },
      {
        name: "sample-2",
        input: "7\n0 1 0 2 1 2\n5\n2 4 6\n2 4 5\n3 4 5 6\n4 2 4 5 6\n2 3 4\n",
        output: "2\n1\n1\n1\n0"
      }
    ];
  }
  if (title === "小杨寻宝") {
    return [
      {
        name: "sample-1",
        input: "2\n5\n0 1 0 1 0\n1 2\n1 3\n3 4\n3 5\n5\n1 1 1 1 1\n1 2\n1 3\n3 4\n3 5\n",
        output: "Yes\nNo"
      }
    ];
  }
  if (title === "小杨购物") {
    return [
      {
        name: "sample-1",
        input: "12\n1\n2\n",
        output: "4"
      },
      {
        name: "sample-2",
        input: "13\n1\n2\n",
        output: "4"
      }
    ];
  }
  if (title === "美丽数字") {
    return [
      {
        name: "sample-1",
        input: "3\n1 9 72\n",
        output: "1"
      }
    ];
  }
  if (title === "小杨的幸运数字") {
    return [
      {
        name: "sample-1",
        input: "3\n7\n12\n30\n",
        output: "0\n1\n0"
      }
    ];
  }
  if (title === "计数") {
    return [
      {
        name: "sample-1",
        input: "25\n2\n",
        output: "9"
      }
    ];
  }
  if (title === "平方之和") {
    return [
      {
        name: "sample-1",
        input: "2\n5\n4\n",
        output: "Yes\nNo"
      }
    ];
  }
  if (title === "立方数") {
    return [
      {
        name: "sample-1",
        input: "8\n",
        output: "Yes"
      },
      {
        name: "sample-2",
        input: "9\n",
        output: "No"
      }
    ];
  }
  if (title === "休息时间") {
    return [
      {
        name: "sample-1",
        input: "12\n59\n59\n10\n",
        output: "13 0 9"
      }
    ];
  }
  if (title === "乘法问题") {
    return [
      {
        name: "sample-1",
        input: "3\n1\n2\n3\n",
        output: "6"
      },
      {
        name: "sample-2",
        input: "3\n100\n100\n100\n",
        output: "1000000"
      },
      {
        name: "sample-3",
        input: "4\n100\n100\n100\n2\n",
        output: ">1000000"
      }
    ];
  }
  if (title === "小杨的日字矩阵") {
    return [
      {
        name: "sample-1",
        input: "5\n",
        output: "|---|\n|xxx|\n|---|\n|xxx|\n|---|"
      }
    ];
  }
  if (title === "字母求和") {
    return [
      {
        name: "sample-1",
        input: "3\naAc\n",
        output: "-61"
      }
    ];
  }
  if (title === "完全平方数") {
    return [
      {
        name: "sample-1",
        input: "5\n1 4 3 3 5\n",
        output: "3"
      }
    ];
  }
  if (title === "相似字符串") {
    return [
      {
        name: "sample-1",
        input: "5\napple applee\napple appe\napple bpple\napplee bpple\napple apple\n",
        output: "similar\nsimilar\nsimilar\nnot similar\nsimilar"
      }
    ];
  }
  if (title === "做题") {
    return [
      {
        name: "sample-1",
        input: "4\n3 1 4 1\n",
        output: "3"
      }
    ];
  }
  if (title === "树上漫步") {
    return [
      {
        name: "sample-1",
        input: "3\n1 3\n2 3\n",
        output: "2 2 1"
      },
      {
        name: "sample-2",
        input: "4\n1 3\n3 2\n4 3\n",
        output: "3 3 1 3"
      }
    ];
  }
  if (title === "上学") {
    return [
      {
        name: "sample-1",
        input: "5 5 3 3\n1 2 3\n2 3 2\n3 4 1\n4 5 3\n1 4 2\n5\n1\n4\n",
        output: "4\n3\n1"
      }
    ];
  }
  if (title === "图书馆里的老鼠") {
    return [
      {
        name: "sample-1",
        input: "10\n2\n3\n",
        output: "8"
      },
      {
        name: "sample-2",
        input: "5\n2\n4\n",
        output: "3"
      }
    ];
  }
  if (title === "B-smooth 数") {
    return [
      {
        name: "sample-1",
        input: "10 3\n",
        output: "7"
      }
    ];
  }
  if (title === "区间乘积") {
    return [
      {
        name: "sample-1",
        input: "5\n3 2 4 3 2\n",
        output: "2"
      }
    ];
  }
  if (title === "最大因数") {
    return [
      {
        name: "sample-1",
        input: "3\n1 3\n2 5\n4 8\n",
        output: "1\n2\n1"
      },
      {
        name: "sample-2",
        input: "1\n120 650\n",
        output: "9"
      }
    ];
  }
  if (title === "荒地开垦") {
    return [
      {
        name: "sample-1",
        input: "3 5\n.....\n.#..#\n.....\n",
        output: "11"
      }
    ];
  }
  if (title === "计算得分") {
    return [
      {
        name: "sample-1",
        input: "3\n3 1 2\n13\ndabcabcabcabz\n",
        output: "9"
      }
    ];
  }
  if (title === "成绩排序") {
    return [
      {
        name: "sample-1",
        input: "6\n140 140 150\n140 149 140\n148 141 140\n141 148 140\n145 145 139\n0 0 0\n",
        output: "1\n3\n4\n4\n2\n6"
      }
    ];
  }
  if (title === "交流问题") {
    return [
      {
        name: "sample-1",
        input: "4 3\n1 2\n2 3\n4 2\n",
        output: "1 3"
      },
      {
        name: "sample-2",
        input: "7 5\n1 2\n2 3\n4 2\n5 6\n6 7\n",
        output: "2 5"
      }
    ];
  }
  if (title === "树上游走") {
    return [
      {
        name: "sample-1",
        input: "3 2\nURR\n",
        output: "7"
      }
    ];
  }
  if (title === "小杨做题") {
    return [
      {
        name: "sample-1",
        input: "1\n2\n10\n5\n",
        output: "19"
      },
      {
        name: "sample-2",
        input: "1\n1\n5\n8\n",
        output: "12"
      }
    ];
  }
  if (title === "小杨的 H 字矩阵") {
    return [
      {
        name: "sample-1",
        input: "5\n",
        output: "|aaa|\n|aaa|\n|---|\n|aaa|\n|aaa|"
      }
    ];
  }
  if (title === "游戏") {
    return [
      {
        name: "sample-1",
        input: "1 1 1 1\n",
        output: "1"
      },
      {
        name: "sample-2",
        input: "114 51 4 1\n",
        output: "176"
      },
      {
        name: "sample-3",
        input: "114514 191 9 810\n",
        output: "384178446"
      }
    ];
  }
  if (title === "小杨报数（2023年12月C++一级）") {
    return [
      {
        name: "sample-1",
        input: "5\n2\n",
        output: "1\n3\n5"
      },
      {
        name: "sample-2",
        input: "10\n3\n",
        output: "1\n2\n4\n5\n7\n8\n10"
      }
    ];
  }
  if (title === "小杨的考试") {
    return [
      {
        name: "sample-1",
        input: "1\n6\n",
        output: "7"
      },
      {
        name: "sample-2",
        input: "5\n3\n",
        output: "1"
      }
    ];
  }
  if (title === "单位转换（2023年12月C++三级）") {
    return [
      {
        name: "sample-1",
        input: "2\n1km=?mm\n1m=?mm\n",
        output: "1km=1000000mm\n1m=1000mm"
      },
      {
        name: "sample-2",
        input: "5\n100m=?mm\n1000km=?m\n20kg=?g\n200g=?mg\n0kg=?mg\n",
        output: "100m=100000mm\n1000km=1000000m\n20kg=20000g\n200g=200000mg\n0kg=0mg"
      }
    ];
  }
  if (title === "田忌赛马") {
    return [
      {
        name: "sample-1",
        input: "3\n1 3 5\n2 4 6\n",
        output: "2"
      },
      {
        name: "sample-2",
        input: "5\n10 3 5 8 7\n4 6 1 2 9\n",
        output: "5"
      }
    ];
  }
  if (title === "小杨的字典") {
    return [
      {
        name: "sample-1",
        input: "2\nabc a\nd def\nabc.d.d.abc.abcd.\n",
        output: "a.def.def.a.UNK."
      },
      {
        name: "sample-2",
        input: "3\nabc a\nd def\nabcd xxxx\nabc,(d)d!-abc?abcd\n",
        output: "a,(def)def!-a?xxxx"
      }
    ];
  }
  if (title === "烹饪问题") {
    return [
      {
        name: "sample-1",
        input: "3\n1 2 3\n",
        output: "2"
      },
      {
        name: "sample-2",
        input: "5\n5 6 2 10 13\n",
        output: "8"
      }
    ];
  }
  if (title === "小杨的幸运数") {
    return [
      {
        name: "sample-1",
        input: "4 4\n1\n4\n5\n9\n",
        output: "4\nlucky\n8\nlucky"
      },
      {
        name: "sample-2",
        input: "16 11\n1\n2\n4\n8\n16\n32\n64\n128\n256\n512\n1024\n",
        output: "16\n16\n16\n16\nlucky\nlucky\nlucky\nlucky\nlucky\nlucky\nlucky"
      }
    ];
  }
  if (title === "数位和") {
    return [
      {
        name: "sample-1",
        input: "3\n16\n81\n10\n",
        output: "9"
      }
    ];
  }
  if (title === "小杨和整数拆分") {
    return [
      {
        name: "sample-1",
        input: "18\n",
        output: "2"
      }
    ];
  }
  if (title === "挑战怪物") {
    return [
      {
        name: "sample-1",
        input: "3\n6\n188\n9999\n",
        output: "2\n4\n15"
      }
    ];
  }
  if (title === "打印数字") {
    return [
      {
        name: "sample-1",
        input: "12230\n",
        output: "****.....................\n****.****.****.****..***.\n****.................***.\n****..****.********..***.\n****....................."
      }
    ];
  }
  if (title === "区间排序") {
    return [
      {
        name: "sample-1",
        input: "5\n3 4 5 2 1\n3\n4 5\n3 4\n1 3\n",
        output: "1 3 4 5 2"
      }
    ];
  }
  if (title === "平衡序列") {
    return [
      {
        name: "sample-1",
        input: "3\n3\n1 2 3\n4\n2 3 1 4\n5\n1 2 3 4 5\n",
        output: "Yes\nYes\nNo"
      }
    ];
  }
  if (title === "小杨的") {
    return [
      {
        name: "sample-1",
        input: "5\n",
        output: "+---+\n++--+\n+-+-+\n+--++\n+---+"
      }
    ];
  }
  if (title === "数位之和") {
    return [
      {
        name: "sample-1",
        input: "3\n7\n52\n103\n",
        output: "Yes\nYes\nNo"
      }
    ];
  }
  if (title === "武器购买") {
    return [
      {
        name: "sample-1",
        input: "3\n3 2 3\n1 2\n1 2\n2 3\n3 3 4\n1 2\n1 2\n2 3\n3 1000 1000\n1 2\n1 2\n2 3\n",
        output: "3\n-1\n-1"
      }
    ];
  }
  if (title === "小杨的武器") {
    return [
      {
        name: "sample-1",
        input: "2 2\n9 9\n1 -1\n",
        output: "10"
      }
    ];
  }
  if (title === "移位") {
    return [
      {
        name: "sample-1",
        input: "3\n",
        output: "DEFGHIJKLMNOPQRSTUVWXYZABC"
      }
    ];
  }
  if (title === "小猫分鱼") {
    return [
      {
        name: "sample-1",
        input: "2\n1\n",
        output: "7"
      },
      {
        name: "sample-2",
        input: "3\n1\n",
        output: "25"
      }
    ];
  }
  if (title === "回文拼接") {
    return [
      {
        name: "sample-1",
        input: "4\nabcd\naabbb\naaac\nabcdd\n",
        output: "No\nYes\nNo\nNo"
      }
    ];
  }
  if (title === "商品交易") {
    return [
      {
        name: "sample-1",
        input: "3 5 0 2\n1 2 4\n1 0\n2 0\n0 1\n2 1\n1 2\n",
        output: "5"
      },
      {
        name: "sample-2",
        input: "3 3 0 2\n100 2 4\n0 1\n1 2\n0 2\n",
        output: "-95"
      },
      {
        name: "sample-3",
        input: "4 4 3 0\n1 2 3 4\n1 0\n0 1\n3 2\n2 3\n",
        output: "No solution"
      }
    ];
  }
  if (title === "小杨买饮料（2023.9C++六级）") {
    return [
      {
        name: "sample-1",
        input: "5 100\n100 2000\n2 50\n4 40\n5 30\n3 20\n",
        output: "9"
      },
      {
        name: "sample-2",
        input: "5 141\n100 2000\n2 50\n4 40\n5 30\n3 20\n",
        output: "100"
      },
      {
        name: "sample-3",
        input: "4 141\n2 50\n4 40\n5 30\n3 20\n",
        output: "no solution"
      }
    ];
  }
  if (title === "算法学习") {
    return [
      {
        name: "sample-1",
        input: "3 5 10\n1 1 2 3 3\n9 1 10 10 1\n",
        output: "4"
      },
      {
        name: "sample-2",
        input: "2 4 10\n1 1 1 2\n1 2 7 10\n",
        output: "-1"
      }
    ];
  }
  if (title === "空间跳跃") {
    return [
      {
        name: "sample-1",
        input: "3\n3 1\n5 6 3\n3 5 6\n1 4 100000\n",
        output: "100001"
      }
    ];
  }
  if (title === "好斗的牛") {
    return [
      {
        name: "sample-1",
        input: "2\n1 2\n1 2\n",
        output: "4"
      },
      {
        name: "sample-2",
        input: "3\n1 2 3\n3 2 1\n",
        output: "7"
      }
    ];
  }
  return question.sample_cases || [];
}

async function main() {
  const artifact = await readJson(inputPath);
  const library = solutionLibrary();
  const questions = artifact.pages.flatMap((page) => page.questions).filter((question) => question.question_type === "programming");
  const records = [];

  for (const question of questions) {
    const title = extractShortTitle(question);
    const preset = library.get(`${title}#${question.id}`) || library.get(title);
    if (!preset) {
      continue;
    }

    let verification = {
      status: "not_verified",
      sample_count: 0,
      verified_at: new Date().toISOString()
    };

    let allPassed = true;
    const samples = normalizeSamples(question, title);
    for (const sample of samples) {
      const result = await runCpp(preset.code, `${sample.input}\n`);
      if (result.status !== "ok" || normalizeOutput(result.stdout) !== normalizeOutput(sample.output)) {
        allPassed = false;
        break;
      }
      verification.sample_count += 1;
    }
    verification.status = allPassed ? "sample_passed" : "sample_failed";

    records.push({
      canonical_problem_id: question.id,
      title,
      algorithm: preset.algorithm,
      complexity: preset.complexity,
      code: preset.code,
      verification
    });
  }

  const output = {
    schema_version: 1,
    generated_at: new Date().toISOString(),
    generator: "scripts/generate-wanjuanwang-gesp-cpp-programming-solutions.mjs",
    input: inputPath,
    summary: {
      record_count: records.length,
      sample_passed_count: records.filter((record) => record.verification.status === "sample_passed").length
    },
    records
  };

  await writeFile(outputPath, `${JSON.stringify(output, null, 2)}\n`);
  console.log(`wanjuanwang programming solutions: ${output.summary.record_count}`);
  console.log(`wanjuanwang programming sample-passed: ${output.summary.sample_passed_count}`);
  console.log(`wrote ${outputPath}`);
}

main().catch((error) => {
  console.error(`WanJuanWang programming solution generation failed: ${error.message}`);
  process.exitCode = 1;
});
