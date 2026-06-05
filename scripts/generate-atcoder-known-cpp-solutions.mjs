import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const DATA_PATH = "data/atcoder/luogu-atcoder-problem-bank.json";
const LIMIT = Number(process.env.ATCODER_KNOWN_CPP_LIMIT || 0);
const CPP_INCLUDES = `#include <algorithm>
#include <array>
#include <cctype>
#include <cmath>
#include <deque>
#include <functional>
#include <iomanip>
#include <iostream>
#include <limits>
#include <map>
#include <numeric>
#include <queue>
#include <set>
#include <stack>
#include <string>
#include <tuple>
#include <utility>
#include <vector>`;

const KNOWN_SOLUTIONS = new Map([
  ["AT_abc003_4", {
    algorithm: "先固定被墙围住的 X×Y 矩形位置。矩形内部用四条边界不能为空的容斥统计被占用格子，再乘以从占用格中选择桌子位置的组合数。",
    complexity: "O(1)，组合数预处理 O((RC)^2)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int r, c, x, y, d, l;
    cin >> r >> c >> x >> y >> d >> l;
    int maxN = r * c;
    vector<vector<long long>> comb(maxN + 1, vector<long long>(maxN + 1, 0));
    for (int i = 0; i <= maxN; ++i) {
        comb[i][0] = comb[i][i] = 1;
        for (int j = 1; j < i; ++j) comb[i][j] = (comb[i - 1][j - 1] + comb[i - 1][j]) % MOD;
    }

    long long occupiedWays = 0;
    for (int mask = 0; mask < 16; ++mask) {
        int top = mask & 1;
        int bottom = (mask >> 1) & 1;
        int left = (mask >> 2) & 1;
        int right = (mask >> 3) & 1;
        int rows = x - top - bottom;
        int cols = y - left - right;
        if (rows <= 0 || cols <= 0) continue;
        long long ways = comb[rows * cols][d + l];
        if (__builtin_popcount((unsigned)mask) % 2) occupiedWays = (occupiedWays - ways + MOD) % MOD;
        else occupiedWays = (occupiedWays + ways) % MOD;
    }

    long long positions = 1LL * (r - x + 1) * (c - y + 1) % MOD;
    long long answer = positions * occupiedWays % MOD * comb[d + l][d] % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc009_3", {
    algorithm: "从左到右贪心确定答案。每次尝试放最小可用字符，用剩余字符和原串后缀能达到的最小不同位置数判断是否仍可满足 K。",
    complexity: "O(26N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    string s;
    cin >> n >> k >> s;
    vector<int> remain(26, 0);
    for (char ch : s) remain[ch - 'a']++;

    string answer;
    int fixedMismatch = 0;
    for (int i = 0; i < n; ++i) {
        for (int ch = 0; ch < 26; ++ch) {
            if (remain[ch] == 0) continue;
            remain[ch]--;
            int mismatch = fixedMismatch + (ch != s[i] - 'a');
            vector<int> suffix(26, 0);
            for (int j = i + 1; j < n; ++j) suffix[s[j] - 'a']++;
            int matches = 0;
            for (int t = 0; t < 26; ++t) matches += min(remain[t], suffix[t]);
            int minFutureMismatch = (n - i - 1) - matches;
            if (mismatch + minFutureMismatch <= k) {
                answer.push_back(char('a' + ch));
                fixedMismatch = mismatch;
                break;
            }
            remain[ch]++;
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc016_4", {
    algorithm: "统计劈开的线段与多边形边的交点数。线段每穿过多边形一次产生两个交点，所以被分成 crossing/2+1 段。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Point {
    long long x, y;
};

long long cross(Point a, Point b, Point c) {
    long long x1 = b.x - a.x, y1 = b.y - a.y;
    long long x2 = c.x - a.x, y2 = c.y - a.y;
    return x1 * y2 - y1 * x2;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    Point a, b;
    cin >> a.x >> a.y >> b.x >> b.y;
    int n;
    cin >> n;
    vector<Point> p(n);
    for (auto &point : p) cin >> point.x >> point.y;

    int crossings = 0;
    for (int i = 0; i < n; ++i) {
        Point c = p[i], d = p[(i + 1) % n];
        long long s1 = cross(a, b, c);
        long long s2 = cross(a, b, d);
        long long t1 = cross(c, d, a);
        long long t2 = cross(c, d, b);
        if (((s1 > 0 && s2 < 0) || (s1 < 0 && s2 > 0)) &&
            ((t1 > 0 && t2 < 0) || (t1 < 0 && t2 > 0))) {
            crossings++;
        }
    }
    cout << crossings / 2 + 1 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc021_c", {
    algorithm: "无权图 BFS。第一次到达节点时记录距离和路径数，同层再次到达时累加最短路径条数。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, a, b, m;
    cin >> n >> a >> b >> m;
    --a; --b;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int x, y;
        cin >> x >> y;
        --x; --y;
        g[x].push_back(y);
        g[y].push_back(x);
    }

    vector<int> dist(n, -1);
    vector<long long> ways(n, 0);
    queue<int> q;
    dist[a] = 0;
    ways[a] = 1;
    q.push(a);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : g[v]) {
            if (dist[to] == -1) {
                dist[to] = dist[v] + 1;
                ways[to] = ways[v];
                q.push(to);
            } else if (dist[to] == dist[v] + 1) {
                ways[to] = (ways[to] + ways[v]) % MOD;
            }
        }
    }
    cout << ways[b] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc024_c", {
    algorithm: "每个民族独立模拟天数。当前所在可达区间若与当天开放区间相交，就把可达区间扩展到并集，首次覆盖目标城市即为答案。",
    complexity: "O(DK)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    int d, k;
    cin >> n >> d >> k;
    vector<long long> l(d), r(d);
    for (int i = 0; i < d; ++i) cin >> l[i] >> r[i];
    while (k--) {
        long long s, t;
        cin >> s >> t;
        long long left = s, right = s;
        for (int day = 0; day < d; ++day) {
            if (r[day] < left || right < l[day]) continue;
            left = min(left, l[day]);
            right = max(right, r[day]);
            if (left <= t && t <= right) {
                cout << day + 1 << '\\n';
                break;
            }
        }
    }
    return 0;
}
`
  }],
  ["AT_abc028_d", {
    algorithm: "中位数为 K 的三元组个数为 1 个全等于 K，加上两项等于 K 的情况，以及一项为 K 且另两项分别在 K 两侧的排列。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long double n, k;
    cin >> n >> k;
    long double less = k - 1;
    long double greater = n - k;
    long double favorable = 1 + 3 * less + 3 * greater + 6 * less * greater;
    long double total = n * n * n;
    cout << fixed << setprecision(20) << (double)(favorable / total) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc029_d", {
    algorithm: "按十进制每一位分别统计 1 出现次数。对高位、当前位、低位分类计算该位贡献。",
    complexity: "O(log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long answer = 0;
    for (long long base = 1; base <= n; base *= 10) {
        long long high = n / (base * 10);
        long long current = (n / base) % 10;
        long long low = n % base;
        answer += high * base;
        if (current == 1) answer += low + 1;
        else if (current > 1) answer += base;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc031_c", {
    algorithm: "枚举高桥选择的位置，再枚举青木位置并按规则计算两人分数；青木取自己分数最大的位置，高桥在这些结果中取最大。",
    complexity: "O(N^3)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &value : a) cin >> value;

    int answer = -1000000000;
    for (int taka = 0; taka < n; ++taka) {
        int bestAoki = -1000000000;
        int takaScoreWhenBest = -1000000000;
        for (int aoki = 0; aoki < n; ++aoki) {
            if (aoki == taka) continue;
            int l = min(taka, aoki), r = max(taka, aoki);
            int takaScore = 0, aokiScore = 0;
            for (int i = l; i <= r; ++i) {
                if ((i - l) % 2 == 0) takaScore += a[i];
                else aokiScore += a[i];
            }
            if (aokiScore > bestAoki) {
                bestAoki = aokiScore;
                takaScoreWhenBest = takaScore;
            }
        }
        answer = max(answer, takaScoreWhenBest);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc039_d", {
    algorithm: "先反推原图：只有某格周围 3×3 全是黑色时该格才能为黑。再把反推图膨胀一次，与目标图一致则可行。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> target(h);
    for (string &row : target) cin >> row;
    vector<string> original(h, string(w, '.'));
    int dy[9] = {-1,-1,-1,0,0,0,1,1,1};
    int dx[9] = {-1,0,1,-1,0,1,-1,0,1};

    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            bool ok = true;
            for (int dir = 0; dir < 9; ++dir) {
                int ny = y + dy[dir], nx = x + dx[dir];
                if (0 <= ny && ny < h && 0 <= nx && nx < w && target[ny][nx] == '.') ok = false;
            }
            if (ok) original[y][x] = '#';
        }
    }

    vector<string> restored(h, string(w, '.'));
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (original[y][x] != '#') continue;
            for (int dir = 0; dir < 9; ++dir) {
                int ny = y + dy[dir], nx = x + dx[dir];
                if (0 <= ny && ny < h && 0 <= nx && nx < w) restored[ny][nx] = '#';
            }
        }
    }
    if (restored != target) {
        cout << "impossible\\n";
    } else {
        cout << "possible\\n";
        for (string &row : original) cout << row << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc054_d", {
    algorithm: "二维背包。dp[a][b] 表示达到 A 总量 a、B 总量 b 的最小代价，最后枚举满足 a:b=Ma:Mb 的状态。",
    complexity: "O(N·400^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, ma, mb;
    cin >> n >> ma >> mb;
    const int MAX = 400;
    const int INF = 1000000000;
    vector<vector<int>> dp(MAX + 1, vector<int>(MAX + 1, INF));
    dp[0][0] = 0;
    for (int i = 0; i < n; ++i) {
        int a, b, c;
        cin >> a >> b >> c;
        auto next = dp;
        for (int x = 0; x + a <= MAX; ++x) {
            for (int y = 0; y + b <= MAX; ++y) {
                if (dp[x][y] == INF) continue;
                next[x + a][y + b] = min(next[x + a][y + b], dp[x][y] + c);
            }
        }
        dp.swap(next);
    }

    int answer = INF;
    for (int k = 1; ma * k <= MAX && mb * k <= MAX; ++k) {
        answer = min(answer, dp[ma * k][mb * k]);
    }
    cout << (answer == INF ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc061_d", {
    algorithm: "Bellman-Ford 求最大路。第 N 轮仍能松弛且该点能到达终点，说明存在可影响答案的正环，输出 inf。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Edge {
    int a, b;
    long long c;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<Edge> edges(m);
    vector<vector<int>> rev(n);
    for (auto &e : edges) {
        cin >> e.a >> e.b >> e.c;
        --e.a; --e.b;
        rev[e.b].push_back(e.a);
    }

    vector<int> reachGoal(n, 0);
    queue<int> q;
    reachGoal[n - 1] = 1;
    q.push(n - 1);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : rev[v]) {
            if (!reachGoal[to]) {
                reachGoal[to] = 1;
                q.push(to);
            }
        }
    }

    const long long NEG = -(1LL << 60);
    vector<long long> dist(n, NEG);
    dist[0] = 0;
    for (int i = 0; i < n; ++i) {
        bool updated = false;
        for (auto e : edges) {
            if (dist[e.a] == NEG) continue;
            if (dist[e.b] < dist[e.a] + e.c) {
                dist[e.b] = dist[e.a] + e.c;
                updated = true;
                if (i == n - 1 && reachGoal[e.b]) {
                    cout << "inf\\n";
                    return 0;
                }
            }
        }
        if (!updated) break;
    }
    cout << dist[n - 1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc075_c", {
    algorithm: "N 很小，逐条删除边后 BFS 判断图是否仍连通，不连通的边就是桥。",
    complexity: "O(M(N+M))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<pair<int, int>> edges(m);
    for (auto &e : edges) {
        cin >> e.first >> e.second;
        --e.first; --e.second;
    }

    int answer = 0;
    for (int banned = 0; banned < m; ++banned) {
        vector<vector<int>> g(n);
        for (int i = 0; i < m; ++i) {
            if (i == banned) continue;
            auto [a, b] = edges[i];
            g[a].push_back(b);
            g[b].push_back(a);
        }
        vector<int> seen(n, 0);
        queue<int> q;
        seen[0] = 1;
        q.push(0);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int to : g[v]) if (!seen[to]) {
                seen[to] = 1;
                q.push(to);
            }
        }
        if (count(seen.begin(), seen.end(), 1) != n) answer++;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc079_d", {
    algorithm: "10 个数字之间先用 Floyd-Warshall 求最短转换代价，再把墙上每个非 -1 数字转换为 1 的代价累加。",
    complexity: "O(10^3+HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<vector<int>> cost(10, vector<int>(10));
    for (int i = 0; i < 10; ++i) for (int j = 0; j < 10; ++j) cin >> cost[i][j];
    for (int k = 0; k < 10; ++k) {
        for (int i = 0; i < 10; ++i) {
            for (int j = 0; j < 10; ++j) {
                cost[i][j] = min(cost[i][j], cost[i][k] + cost[k][j]);
            }
        }
    }

    long long answer = 0;
    for (int i = 0; i < h * w; ++i) {
        int a;
        cin >> a;
        if (a != -1) answer += cost[a][1];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc080_c", {
    algorithm: "枚举 10 个时间段的所有非空营业方案。对每家店统计重叠时间段数，查收益表求总收益最大值。",
    complexity: "O(2^10·N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> f(n, 0);
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < 10; ++j) {
            int bit;
            cin >> bit;
            if (bit) f[i] |= 1 << j;
        }
    }
    vector<vector<int>> profit(n, vector<int>(11));
    for (int i = 0; i < n; ++i) for (int j = 0; j <= 10; ++j) cin >> profit[i][j];

    int answer = -1000000000;
    for (int mask = 1; mask < (1 << 10); ++mask) {
        int score = 0;
        for (int i = 0; i < n; ++i) {
            int overlap = __builtin_popcount((unsigned)(mask & f[i]));
            score += profit[i][overlap];
        }
        answer = max(answer, score);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc085_d", {
    algorithm: "普通挥动只需要最大 a。所有伤害大于最大 a 的投掷按伤害从大到小优先使用，剩余血量再用最大 a 补足。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long h;
    cin >> n >> h;
    long long bestSwing = 0;
    vector<long long> throws;
    for (int i = 0; i < n; ++i) {
        long long a, b;
        cin >> a >> b;
        bestSwing = max(bestSwing, a);
        throws.push_back(b);
    }
    sort(throws.rbegin(), throws.rend());
    long long answer = 0;
    for (long long damage : throws) {
        if (damage <= bestSwing) break;
        h -= damage;
        answer++;
        if (h <= 0) {
            cout << answer << '\\n';
            return 0;
        }
    }
    answer += (h + bestSwing - 1) / bestSwing;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc089_d", {
    algorithm: "按数值模 D 分组预处理移动代价前缀。每次查询 L 到 R 的答案就是同组前缀差。",
    complexity: "预处理 O(HW)，每次查询 O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, d;
    cin >> h >> w >> d;
    int total = h * w;
    vector<pair<int, int>> pos(total + 1);
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            int a;
            cin >> a;
            pos[a] = {i, j};
        }
    }
    vector<long long> cost(total + 1, 0);
    for (int value = d + 1; value <= total; ++value) {
        auto [x1, y1] = pos[value];
        auto [x0, y0] = pos[value - d];
        cost[value] = cost[value - d] + abs(x1 - x0) + abs(y1 - y0);
    }
    int q;
    cin >> q;
    while (q--) {
        int l, r;
        cin >> l >> r;
        cout << cost[r] - cost[l] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc105_d", {
    algorithm: "连续区间和能被 M 整除等价于两个前缀和模 M 相同。扫描前缀余数并累计已出现次数。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long m;
    cin >> n >> m;
    map<long long, long long> count;
    count[0] = 1;
    long long prefix = 0;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        prefix = (prefix + a) % m;
        answer += count[prefix];
        count[prefix]++;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc112_d", {
    algorithm: "若最大公约数为 g，则 M/g 至少要能分给 N 个正整数，所以找 M 的最大约数 g 且 g <= M/N。",
    complexity: "O(sqrt(M))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, m;
    cin >> n >> m;
    long long limit = m / n;
    long long answer = 1;
    for (long long x = 1; x * x <= m; ++x) {
        if (m % x != 0) continue;
        if (x <= limit) answer = max(answer, x);
        long long y = m / x;
        if (y <= limit) answer = max(answer, y);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc115_d", {
    algorithm: "预处理每级汉堡总层数和肉饼数。递归判断吃掉的 X 层落在下半汉堡、中间肉饼还是上半汉堡。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long x;
    cin >> n >> x;
    vector<long long> len(n + 1), patty(n + 1);
    len[0] = patty[0] = 1;
    for (int i = 1; i <= n; ++i) {
        len[i] = len[i - 1] * 2 + 3;
        patty[i] = patty[i - 1] * 2 + 1;
    }

    auto solve = [&](auto &&self, int level, long long eaten) -> long long {
        if (eaten <= 0) return 0;
        if (level == 0) return 1;
        if (eaten == 1) return 0;
        if (eaten <= 1 + len[level - 1]) return self(self, level - 1, eaten - 1);
        if (eaten == 2 + len[level - 1]) return patty[level - 1] + 1;
        if (eaten <= 2 + 2 * len[level - 1]) {
            return patty[level - 1] + 1 + self(self, level - 1, eaten - 2 - len[level - 1]);
        }
        return patty[level];
    };

    cout << solve(solve, n, x) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc124_d", {
    algorithm: "滑动窗口维护窗口内 0 的连续段数量不超过 K。窗口右端扩张，超限时左端收缩。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    string s;
    cin >> n >> k >> s;
    int left = 0, zeroGroups = 0, answer = 0;
    for (int right = 0; right < n; ++right) {
        if (s[right] == '0' && (right == 0 || s[right - 1] == '1')) zeroGroups++;
        while (zeroGroups > k) {
            if (s[left] == '0' && (left + 1 > right || s[left + 1] == '1')) zeroGroups--;
            left++;
        }
        answer = max(answer, right - left + 1);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc126_e", {
    algorithm: "每条条件只会把两个位置的奇偶关系绑定起来。每个连通块只需询问一个位置，因此答案为连通块数量。",
    complexity: "O((N+M) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    for (int i = 0; i < m; ++i) {
        int x, y, z;
        cin >> x >> y >> z;
        dsu.unite(x - 1, y - 1);
    }
    set<int> roots;
    for (int i = 0; i < n; ++i) roots.insert(dsu.find(i));
    cout << roots.size() << '\\n';
    return 0;
}
`
  }],
  ["AT_abc127_d", {
    algorithm: "把原数组升序排列，替换操作按 C 从大到小处理。只要 C 大于当前最小元素，就用它替换。",
    complexity: "O((N+M) log(N+M))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &value : a) cin >> value;
    vector<pair<long long, long long>> ops(m);
    for (auto &op : ops) cin >> op.second >> op.first;
    sort(a.begin(), a.end());
    sort(ops.rbegin(), ops.rend());
    int index = 0;
    for (auto [c, b] : ops) {
        while (b-- > 0 && index < n && a[index] < c) {
            a[index++] = c;
        }
    }
    cout << accumulate(a.begin(), a.end(), 0LL) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc129_d", {
    algorithm: "分别预处理每个空格所在横向连续空段长度和纵向连续空段长度，答案为两者之和减一。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> s(h);
    for (string &row : s) cin >> row;
    vector<vector<int>> horizontal(h, vector<int>(w, 0)), vertical(h, vector<int>(w, 0));

    for (int i = 0; i < h; ++i) {
        int j = 0;
        while (j < w) {
            if (s[i][j] == '#') { j++; continue; }
            int start = j;
            while (j < w && s[i][j] == '.') j++;
            for (int k = start; k < j; ++k) horizontal[i][k] = j - start;
        }
    }
    for (int j = 0; j < w; ++j) {
        int i = 0;
        while (i < h) {
            if (s[i][j] == '#') { i++; continue; }
            int start = i;
            while (i < h && s[i][j] == '.') i++;
            for (int k = start; k < i; ++k) vertical[k][j] = i - start;
        }
    }
    int answer = 0;
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            if (s[i][j] == '.') answer = max(answer, horizontal[i][j] + vertical[i][j] - 1);
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc133_d", {
    algorithm: "设第 i 座山雨量为 ans[i]，则 ans[i]+ans[i+1]=2A[i]。N 为奇数，可由交错和唯一确定 ans[0]，再递推全部答案。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n), answer(n);
    for (long long &value : a) cin >> value;
    long long first = 0;
    for (int i = 0; i < n; ++i) first += (i % 2 == 0 ? a[i] : -a[i]);
    answer[0] = first;
    for (int i = 0; i + 1 < n; ++i) answer[i + 1] = 2 * a[i] - answer[i];
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc134_e", {
    algorithm: "贪心维护每个颜色序列的末尾值。对当前数放入末尾值小于它且最大的序列，否则新开一种颜色。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    multiset<int> tops;
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        auto it = tops.lower_bound(a);
        if (it == tops.begin()) {
            tops.insert(a);
        } else {
            --it;
            tops.erase(it);
            tops.insert(a);
        }
    }
    cout << tops.size() << '\\n';
    return 0;
}
`
  }],
  ["AT_abc135_d", {
    algorithm: "从左到右做模 13 的数位 DP。遇到 ? 时枚举 0 到 9，最后取余数为 5 的方案数。",
    complexity: "O(13*10*|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    vector<long long> dp(13, 0);
    dp[0] = 1;
    for (char ch : s) {
        vector<long long> next(13, 0);
        for (int r = 0; r < 13; ++r) {
            for (int digit = 0; digit <= 9; ++digit) {
                if (ch != '?' && digit != ch - '0') continue;
                next[(r * 10 + digit) % 13] = (next[(r * 10 + digit) % 13] + dp[r]) % MOD;
            }
        }
        dp.swap(next);
    }
    cout << dp[5] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc144_d", {
    algorithm: "根据水量是否不超过半个水壶分两种几何形状，用直角三角形关系求临界倾角。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long double a, b, x;
    cin >> a >> b >> x;
    long double pi = acosl(-1.0L);
    long double angle;
    if (2 * x <= a * a * b) {
        angle = atanl(a * b * b / (2 * x));
    } else {
        angle = atanl(2 * (a * a * b - x) / (a * a * a));
    }
    cout << fixed << setprecision(12) << (double)(angle * 180.0L / pi) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc144_e", {
    algorithm: "排序后让小消化代价配大难吃度。二分最大耗时，检查把所有 A_i 降到 floor(mid/F_i) 以内所需训练次数。",
    complexity: "O(N log N + N log 1e18)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n), f(n);
    for (long long &value : a) cin >> value;
    for (long long &value : f) cin >> value;
    sort(a.begin(), a.end());
    sort(f.rbegin(), f.rend());

    long long low = -1, high = (long long)4e18;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        long long need = 0;
        for (int i = 0; i < n; ++i) {
            long long allowed = mid / f[i];
            if (a[i] > allowed) need += a[i] - allowed;
            if (need > k) break;
        }
        if (need <= k) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc145_d", {
    algorithm: "设两种移动次数分别为 p、q，解线性方程 p+2q=X、2p+q=Y。若非负整数解存在，答案为 C(p+q,p)。",
    complexity: "O(X+Y)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long x, y;
    cin >> x >> y;
    long long pNum = 2 * y - x;
    long long qNum = 2 * x - y;
    if (pNum < 0 || qNum < 0 || pNum % 3 != 0 || qNum % 3 != 0) {
        cout << 0 << '\\n';
        return 0;
    }
    long long p = pNum / 3, q = qNum / 3;
    long long total = p + q;
    vector<long long> fact(total + 1), invFact(total + 1);
    fact[0] = 1;
    for (int i = 1; i <= total; ++i) fact[i] = fact[i - 1] * i % MOD;
    invFact[total] = modPow(fact[total], MOD - 2);
    for (int i = (int)total; i >= 1; --i) invFact[i - 1] = invFact[i] * i % MOD;
    cout << fact[total] * invFact[p] % MOD * invFact[q] % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc148_e", {
    algorithm: "N 为奇数时双阶乘没有因子 10。N 为偶数时 f(N)=2^(N/2)*(N/2)!，末尾 0 数量等于 (N/2)! 中因子 5 的数量。",
    complexity: "O(log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    if (n % 2 == 1) {
        cout << 0 << '\\n';
        return 0;
    }
    long long m = n / 2;
    long long answer = 0;
    while (m > 0) {
        m /= 5;
        answer += m;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc149_d", {
    algorithm: "每一轮若选择克制机器的手势即可得分；但如果与 K 轮前相同且那轮已采用该手势，则本轮放弃得分。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    long long r, s, p;
    string t;
    cin >> n >> k >> r >> s >> p >> t;
    vector<char> used(n, '?');
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        char hand;
        long long score;
        if (t[i] == 'r') { hand = 'p'; score = p; }
        else if (t[i] == 's') { hand = 'r'; score = r; }
        else { hand = 's'; score = s; }
        if (i >= k && used[i - k] == hand) continue;
        used[i] = hand;
        answer += score;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc152_d", {
    algorithm: "统计每个数字的首位和末位组合 cnt[first][last]，答案为 sum cnt[i][j]*cnt[j][i]。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<long long>> count(10, vector<long long>(10, 0));
    for (int value = 1; value <= n; ++value) {
        int last = value % 10;
        int first = value;
        while (first >= 10) first /= 10;
        count[first][last]++;
    }
    long long answer = 0;
    for (int i = 1; i <= 9; ++i) {
        for (int j = 1; j <= 9; ++j) answer += count[i][j] * count[j][i];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc154_e", {
    algorithm: "数位 DP，状态为已经处理到的位置、非零数字个数、是否仍贴着上界 N。",
    complexity: "O(|N|*K*10)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string n;
    int k;
    cin >> n >> k;
    vector<vector<long long>> dp(k + 2, vector<long long>(2, 0));
    dp[0][1] = 1;
    for (char ch : n) {
        vector<vector<long long>> next(k + 2, vector<long long>(2, 0));
        int limitDigit = ch - '0';
        for (int used = 0; used <= k; ++used) {
            for (int tight = 0; tight <= 1; ++tight) {
                int upper = tight ? limitDigit : 9;
                for (int digit = 0; digit <= upper; ++digit) {
                    int nextUsed = used + (digit != 0);
                    if (nextUsed > k) continue;
                    int nextTight = tight && (digit == upper);
                    next[nextUsed][nextTight] += dp[used][tight];
                }
            }
        }
        dp.swap(next);
    }
    cout << dp[k][0] + dp[k][1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc156_d", {
    algorithm: "所有非空花束为 2^n-1，再减去大小为 a 和 b 的组合数。由于 a、b 较小，直接连乘计算 C(n,k)。",
    complexity: "O(a+b+log n)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

long long modPow2(long long a, long long e) {
    long long result = 1;
    while (e) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

long long combLargeN(long long n, long long k) {
    long long result = 1;
    for (long long i = 1; i <= k; ++i) {
        result = result * ((n - i + 1) % MOD) % MOD;
        result = result * modPow2(i, MOD - 2) % MOD;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, a, b;
    cin >> n >> a >> b;
    long long answer = (modPow2(2, n) - 1 - combLargeN(n, a) - combLargeN(n, b)) % MOD;
    if (answer < 0) answer += MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc157_d", {
    algorithm: "用并查集求关注关系连通块。每个人候选数为所在连通块大小减自己、减直接好友、减同连通块内拉黑人数。",
    complexity: "O((N+M+K) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    DSU dsu(n);
    vector<int> friendCount(n, 0), blockCount(n, 0);
    vector<pair<int, int>> friends(m), blocks(k);
    for (auto &e : friends) {
        cin >> e.first >> e.second;
        --e.first; --e.second;
        dsu.unite(e.first, e.second);
        friendCount[e.first]++;
        friendCount[e.second]++;
    }
    for (auto &e : blocks) {
        cin >> e.first >> e.second;
        --e.first; --e.second;
    }
    for (auto [a, b] : blocks) {
        if (dsu.find(a) == dsu.find(b)) {
            blockCount[a]++;
            blockCount[b]++;
        }
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << dsu.sz[dsu.find(i)] - 1 - friendCount[i] - blockCount[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc163_d", {
    algorithm: "长度为 k 的子序列和最小值是 0+...+(k-1)，最大值是 (N-k+1)+...+N。枚举长度并累加区间方案数。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, k;
    cin >> n >> k;
    long long answer = 0;
    for (long long len = k; len <= n + 1; ++len) {
        long long mn = len * (len - 1) / 2;
        long long mx = len * (2 * n - len + 1) / 2;
        answer = (answer + mx - mn + 1) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc165_c", {
    algorithm: "N、M 很小，DFS 枚举所有非降序序列，对每个序列计算满足条件得到的得分最大值。",
    complexity: "O(C(N+M-1,N)Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, q;
    cin >> n >> m >> q;
    vector<int> a(q), b(q), c(q), d(q);
    for (int i = 0; i < q; ++i) {
        cin >> a[i] >> b[i] >> c[i] >> d[i];
        --a[i]; --b[i];
    }
    vector<int> seq;
    int answer = 0;
    auto dfs = [&](auto &&self, int pos, int last) -> void {
        if (pos == n) {
            int score = 0;
            for (int i = 0; i < q; ++i) if (seq[b[i]] - seq[a[i]] == c[i]) score += d[i];
            answer = max(answer, score);
            return;
        }
        for (int value = last; value <= m; ++value) {
            seq.push_back(value);
            self(self, pos + 1, value);
            seq.pop_back();
        }
    };
    dfs(dfs, 0, 1);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc166_e", {
    algorithm: "条件 i < j 且 i+A_i = j-A_j。扫描 j，统计之前出现过的 i+A_i 值即可。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<long long, long long> count;
    long long answer = 0;
    for (int i = 1; i <= n; ++i) {
        long long a;
        cin >> a;
        answer += count[i - a];
        count[i + a]++;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc169_d", {
    algorithm: "分解质因数。每个质因数指数 e 可以依次消耗 1、2、3... 个，能做的次数是最大 t 使 t(t+1)/2 <= e。",
    complexity: "O(sqrt(N))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long answer = 0;
    for (long long p = 2; p * p <= n; ++p) {
        if (n % p != 0) continue;
        int exponent = 0;
        while (n % p == 0) {
            n /= p;
            exponent++;
        }
        for (int need = 1; exponent >= need; ++need) {
            exponent -= need;
            answer++;
        }
    }
    if (n > 1) answer++;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc170_d", {
    algorithm: "统计每个数出现次数，并用倍数筛标记能被其他输入数整除的值。只出现一次且没有被其他数整除的数计入答案。",
    complexity: "O(V log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int mx = 0;
    for (int &value : a) {
        cin >> value;
        mx = max(mx, value);
    }
    vector<int> freq(mx + 1, 0), bad(mx + 1, 0);
    for (int value : a) freq[value]++;
    for (int value = 1; value <= mx; ++value) {
        if (freq[value] == 0) continue;
        for (int multiple = value * 2; multiple <= mx; multiple += value) bad[multiple] = 1;
        if (freq[value] > 1) bad[value] = 1;
    }
    int answer = 0;
    for (int value : a) if (!bad[value]) answer++;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc171_e", {
    algorithm: "所有 B_i 的异或值等于全部 A_i 的异或值。由 B_i = total_xor xor A_i 直接得到答案。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    long long total = 0;
    for (long long &value : a) {
        cin >> value;
        total ^= value;
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << (total ^ a[i]);
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc174_e", {
    algorithm: "二分最终最大木段长度 X。每根木头长度 a 需要切 (a-1)/X 次，若总次数不超过 K 则可行。",
    complexity: "O(N log maxA)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    long long high = 0;
    for (long long &value : a) {
        cin >> value;
        high = max(high, value);
    }
    long long low = 0;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        long long cuts = 0;
        for (long long value : a) {
            cuts += (value - 1) / mid;
            if (cuts > k) break;
        }
        if (cuts <= k) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc176_d", {
    algorithm: "把普通上下左右移动看作代价 0，5x5 范围内魔法移动看作代价 1，使用 0-1 BFS 求最少魔法次数。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, ch, cw, dh, dw;
    cin >> h >> w >> ch >> cw >> dh >> dw;
    --ch; --cw; --dh; --dw;
    vector<string> grid(h);
    for (string &row : grid) cin >> row;
    const int INF = 1e9;
    vector<vector<int>> dist(h, vector<int>(w, INF));
    deque<pair<int, int>> dq;
    dist[ch][cw] = 0;
    dq.push_back({ch, cw});
    int dy4[4] = {-1, 1, 0, 0};
    int dx4[4] = {0, 0, -1, 1};
    while (!dq.empty()) {
        auto [y, x] = dq.front();
        dq.pop_front();
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy4[dir], nx = x + dx4[dir];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] == '#') continue;
            if (dist[ny][nx] > dist[y][x]) {
                dist[ny][nx] = dist[y][x];
                dq.push_front({ny, nx});
            }
        }
        for (int dy = -2; dy <= 2; ++dy) {
            for (int dx = -2; dx <= 2; ++dx) {
                int ny = y + dy, nx = x + dx;
                if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] == '#') continue;
                if (dist[ny][nx] > dist[y][x] + 1) {
                    dist[ny][nx] = dist[y][x] + 1;
                    dq.push_back({ny, nx});
                }
            }
        }
    }
    cout << (dist[dh][dw] == INF ? -1 : dist[dh][dw]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc176_e", {
    algorithm: "统计每行和每列的炸弹数。枚举炸弹数最多的行列组合，若存在一个交点没有炸弹则为 rowMax+colMax，否则减一。",
    complexity: "O(H+W+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, m;
    cin >> h >> w >> m;
    vector<int> row(h, 0), col(w, 0);
    set<pair<int, int>> bombs;
    for (int i = 0; i < m; ++i) {
        int y, x;
        cin >> y >> x;
        --y; --x;
        row[y]++;
        col[x]++;
        bombs.insert({y, x});
    }
    int rowMax = *max_element(row.begin(), row.end());
    int colMax = *max_element(col.begin(), col.end());
    vector<int> rows, cols;
    for (int i = 0; i < h; ++i) if (row[i] == rowMax) rows.push_back(i);
    for (int j = 0; j < w; ++j) if (col[j] == colMax) cols.push_back(j);
    long long pairs = 1LL * rows.size() * cols.size();
    long long blocked = 0;
    for (auto [y, x] : bombs) {
        if (row[y] == rowMax && col[x] == colMax) blocked++;
    }
    cout << rowMax + colMax - (blocked == pairs ? 1 : 0) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc177_e", {
    algorithm: "先用整体 gcd 判断 not coprime。若整体 gcd 为 1，再检查每个质因数是否在多个数中出现，判断 pairwise/setwise。",
    complexity: "O(V log log V + N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int mx = 0, allGcd = 0;
    for (int &value : a) {
        cin >> value;
        mx = max(mx, value);
        allGcd = gcd(allGcd, value);
    }
    if (allGcd != 1) {
        cout << "not coprime\\n";
        return 0;
    }
    vector<int> spf(mx + 1);
    for (int i = 0; i <= mx; ++i) spf[i] = i;
    for (long long p = 2; p * p <= mx; ++p) {
        if (spf[p] != p) continue;
        for (long long x = p * p; x <= mx; x += p) if (spf[x] == x) spf[x] = (int)p;
    }
    vector<int> used(mx + 1, 0);
    for (int value : a) {
        int x = value;
        vector<int> factors;
        while (x > 1) {
            int p = spf[x];
            factors.push_back(p);
            while (x % p == 0) x /= p;
        }
        for (int p : factors) {
            if (used[p]) {
                cout << "setwise coprime\\n";
                return 0;
            }
            used[p] = 1;
        }
    }
    cout << "pairwise coprime\\n";
    return 0;
}
`
  }],
  ["AT_abc179_d", {
    algorithm: "DP 表示到达每个位置的方案数。每个位置把 dp[i] 用差分方式加到所有可跳达区间，整体 O(NK)。",
    complexity: "O(NK)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> l(k), r(k);
    for (int i = 0; i < k; ++i) cin >> l[i] >> r[i];
    vector<long long> diff(n + 2, 0), dp(n + 1, 0);
    diff[1] = 1;
    diff[2] = MOD - 1;
    long long current = 0;
    for (int i = 1; i <= n; ++i) {
        current = (current + diff[i]) % MOD;
        if (current < 0) current += MOD;
        dp[i] = current;
        for (int j = 0; j < k; ++j) {
            int left = i + l[j], right = min(n, i + r[j]);
            if (left > n) continue;
            diff[left] = (diff[left] + dp[i]) % MOD;
            diff[right + 1] = (diff[right + 1] - dp[i]) % MOD;
        }
    }
    cout << dp[n] % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc179_e", {
    algorithm: "记录每个值首次出现位置和前缀和。遇到循环后，把剩余项拆成整段循环加循环前缀。",
    complexity: "O(min(N,M))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, x, m;
    cin >> n >> x >> m;
    vector<long long> first(m, -1), values, prefix(1, 0);
    long long cur = x;
    for (long long i = 0; i < n; ++i) {
        if (first[cur] != -1) {
            long long start = first[cur];
            long long cycleLen = i - start;
            long long cycleSum = prefix[i] - prefix[start];
            long long remaining = n - i;
            long long answer = prefix[i] + remaining / cycleLen * cycleSum;
            long long extra = remaining % cycleLen;
            answer += prefix[start + extra] - prefix[start];
            cout << answer << '\\n';
            return 0;
        }
        first[cur] = i;
        values.push_back(cur);
        prefix.push_back(prefix.back() + cur);
        cur = cur * cur % m;
    }
    cout << prefix[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc181_e", {
    algorithm: "学生身高排序，预处理相邻配对的前缀/后缀代价。每个老师二分插入位置，根据奇偶选择跨过插入点的组合。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> h(n), w(m);
    for (long long &value : h) cin >> value;
    for (long long &value : w) cin >> value;
    sort(h.begin(), h.end());
    vector<long long> pref(n + 1, 0), suff(n + 1, 0);
    for (int i = 0; i + 1 < n; i += 2) pref[i + 2] = pref[i] + h[i + 1] - h[i];
    for (int i = n - 2; i >= 0; i -= 2) suff[i] = suff[i + 2] + h[i + 1] - h[i];
    long long answer = (1LL << 62);
    for (long long teacher : w) {
        int pos = lower_bound(h.begin(), h.end(), teacher) - h.begin();
        if (pos % 2 == 0) {
            answer = min(answer, pref[pos] + llabs(h[pos] - teacher) + suff[pos + 1]);
        } else {
            answer = min(answer, pref[pos - 1] + llabs(h[pos - 1] - teacher) + suff[pos]);
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc184_c", {
    algorithm: "按棋子移动规则分类：同点为 0，一步可达看同对角线或曼哈顿不超过 3；两步可达用奇偶和距离条件判断，否则 3 步。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long r1, c1, r2, c2;
    cin >> r1 >> c1 >> r2 >> c2;
    long long dr = llabs(r1 - r2), dc = llabs(c1 - c2);
    if (dr == 0 && dc == 0) cout << 0 << '\\n';
    else if (dr + dc <= 3 || dr == dc) cout << 1 << '\\n';
    else if ((r1 + c1) % 2 == (r2 + c2) % 2 || dr + dc <= 6 || llabs(dr - dc) <= 3) cout << 2 << '\\n';
    else cout << 3 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc185_f", {
    algorithm: "线段树维护区间异或。单点更新为异或一个值，区间查询返回 [l,r) 异或和。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    int size = 1;
    while (size < n) size <<= 1;
    vector<long long> seg(2 * size, 0);
    for (int i = 0; i < n; ++i) cin >> seg[size + i];
    for (int i = size - 1; i >= 1; --i) seg[i] = seg[2 * i] ^ seg[2 * i + 1];
    auto pointXor = [&](int index, long long value) {
        index += size;
        seg[index] ^= value;
        while (index >>= 1) seg[index] = seg[2 * index] ^ seg[2 * index + 1];
    };
    auto rangeXor = [&](int left, int right) {
        long long result = 0;
        left += size;
        right += size;
        while (left < right) {
            if (left & 1) result ^= seg[left++];
            if (right & 1) result ^= seg[--right];
            left >>= 1;
            right >>= 1;
        }
        return result;
    };
    while (q--) {
        int t, x;
        long long y;
        cin >> t >> x >> y;
        --x;
        if (t == 1) pointXor(x, y);
        else cout << rangeXor(x, (int)y) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc188_d", {
    algorithm: "把每个订阅区间转为差分事件。按日期扫描相邻事件之间的天数，累计 min(当天费用,C)*天数。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long cap;
    cin >> n >> cap;
    map<long long, long long> events;
    for (int i = 0; i < n; ++i) {
        long long a, b, c;
        cin >> a >> b >> c;
        events[a] += c;
        events[b + 1] -= c;
    }
    long long answer = 0;
    long long current = 0;
    long long prev = events.begin()->first;
    for (auto [day, delta] : events) {
        answer += min(current, cap) * (day - prev);
        current += delta;
        prev = day;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc188_e", {
    algorithm: "按编号顺序处理有向边，维护到达每个点前可以买入的最小价格，并用当前卖出价减最小买入价更新答案。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &value : a) cin >> value;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int x, y;
        cin >> x >> y;
        --x; --y;
        g[x].push_back(y);
    }
    const long long INF = (1LL << 60);
    vector<long long> best(n, INF);
    long long answer = -(1LL << 60);
    for (int v = 0; v < n; ++v) {
        if (best[v] != INF) answer = max(answer, a[v] - best[v]);
        long long nextBest = min(best[v], a[v]);
        for (int to : g[v]) best[to] = min(best[to], nextBest);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc145_e", {
    algorithm: "把最后一道菜单独考虑。DP 维护在点最后一道菜前、总用时小于 T 的最大美味度；枚举每道菜作为最后一道并更新答案。",
    complexity: "O(NT)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, t;
    cin >> n >> t;
    vector<int> a(n), b(n);
    for (int i = 0; i < n; ++i) cin >> a[i] >> b[i];
    const int NEG = -1000000000;
    vector<int> dp(t, NEG);
    dp[0] = 0;
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        for (int time = 0; time < t; ++time) {
            if (dp[time] != NEG) answer = max(answer, dp[time] + b[i]);
        }
        for (int time = t - 1 - a[i]; time >= 0; --time) {
            if (dp[time] == NEG) continue;
            dp[time + a[i]] = max(dp[time + a[i]], dp[time] + b[i]);
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc147_e", {
    algorithm: "路径上每格可选择差值正负。用集合 DP 维护到每个格子可能出现的差值集合，最后取绝对值最小者。",
    complexity: "O(HW·S)，S 为可达差值数量",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<vector<int>> a(h, vector<int>(w)), b(h, vector<int>(w));
    for (int i = 0; i < h; ++i) for (int j = 0; j < w; ++j) cin >> a[i][j];
    for (int i = 0; i < h; ++i) for (int j = 0; j < w; ++j) cin >> b[i][j];

    vector<vector<set<int>>> dp(h, vector<set<int>>(w));
    int d0 = abs(a[0][0] - b[0][0]);
    dp[0][0].insert(d0);
    dp[0][0].insert(-d0);
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            int diff = abs(a[i][j] - b[i][j]);
            if (i == 0 && j == 0) continue;
            auto addFrom = [&](int pi, int pj) {
                if (pi < 0 || pj < 0) return;
                for (int value : dp[pi][pj]) {
                    dp[i][j].insert(value + diff);
                    dp[i][j].insert(value - diff);
                }
            };
            addFrom(i - 1, j);
            addFrom(i, j - 1);
        }
    }
    int answer = 1000000000;
    for (int value : dp[h - 1][w - 1]) answer = min(answer, abs(value));
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc161_e", {
    algorithm: "从左到右贪心得到每个工作序号最早能选的位置，从右到左得到最晚能选的位置。两者相同的位置必选。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k, c;
    string s;
    cin >> n >> k >> c >> s;
    vector<int> left(k), right(k);
    int idx = 0;
    for (int i = 0; i < n && idx < k; ++i) {
        if (s[i] == 'o') {
            left[idx++] = i;
            i += c;
        }
    }
    idx = k - 1;
    for (int i = n - 1; i >= 0 && idx >= 0; --i) {
        if (s[i] == 'o') {
            right[idx--] = i;
            i -= c;
        }
    }
    for (int i = 0; i < k; ++i) {
        if (left[i] == right[i]) cout << left[i] + 1 << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc162_f", {
    algorithm: "需要选 floor(N/2) 个不相邻元素。按位置扫描做 DP，状态为已选数量和当前是否选择该位置。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int need = n / 2;
    const long long NEG = -(1LL << 60);
    vector<vector<long long>> dp(need + 1, vector<long long>(2, NEG));
    dp[0][0] = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        vector<vector<long long>> next(need + 1, vector<long long>(2, NEG));
        for (int used = 0; used <= need; ++used) {
            for (int prev = 0; prev < 2; ++prev) {
                if (dp[used][prev] == NEG) continue;
                next[used][0] = max(next[used][0], dp[used][prev]);
                if (!prev && used < need) next[used + 1][1] = max(next[used + 1][1], dp[used][prev] + a);
            }
        }
        dp.swap(next);
    }
    cout << max(dp[need][0], dp[need][1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc182_e", {
    algorithm: "分别从四个方向扫描。灯光会沿空格传播，被墙阻断；任意方向被照亮的空格计入答案。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, n, m;
    cin >> h >> w >> n >> m;
    vector<string> grid(h, string(w, '.'));
    for (int i = 0; i < n; ++i) {
        int a, b;
        cin >> a >> b;
        grid[a - 1][b - 1] = 'L';
    }
    for (int i = 0; i < m; ++i) {
        int c, d;
        cin >> c >> d;
        grid[c - 1][d - 1] = '#';
    }
    vector<vector<int>> lit(h, vector<int>(w, 0));
    for (int i = 0; i < h; ++i) {
        bool on = false;
        for (int j = 0; j < w; ++j) {
            if (grid[i][j] == '#') on = false;
            else {
                if (grid[i][j] == 'L') on = true;
                if (on) lit[i][j] = 1;
            }
        }
        on = false;
        for (int j = w - 1; j >= 0; --j) {
            if (grid[i][j] == '#') on = false;
            else {
                if (grid[i][j] == 'L') on = true;
                if (on) lit[i][j] = 1;
            }
        }
    }
    for (int j = 0; j < w; ++j) {
        bool on = false;
        for (int i = 0; i < h; ++i) {
            if (grid[i][j] == '#') on = false;
            else {
                if (grid[i][j] == 'L') on = true;
                if (on) lit[i][j] = 1;
            }
        }
        on = false;
        for (int i = h - 1; i >= 0; --i) {
            if (grid[i][j] == '#') on = false;
            else {
                if (grid[i][j] == 'L') on = true;
                if (on) lit[i][j] = 1;
            }
        }
    }
    int answer = 0;
    for (int i = 0; i < h; ++i) for (int j = 0; j < w; ++j) answer += lit[i][j];
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc183_e", {
    algorithm: "网格路径 DP，同时维护从左、上、左上三个方向来的前缀和，遇到障碍清零。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 1000000007;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> s(h);
    for (string &row : s) cin >> row;
    vector<vector<long long>> dp(h, vector<long long>(w, 0)), row(h, vector<long long>(w, 0)), col(h, vector<long long>(w, 0)), diag(h, vector<long long>(w, 0));
    dp[0][0] = 1;
    row[0][0] = col[0][0] = diag[0][0] = 1;
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            if (s[i][j] == '#') continue;
            if (i == 0 && j == 0) continue;
            long long value = 0;
            if (j > 0) value += row[i][j - 1];
            if (i > 0) value += col[i - 1][j];
            if (i > 0 && j > 0) value += diag[i - 1][j - 1];
            dp[i][j] = value % MOD;
            row[i][j] = ((j > 0 ? row[i][j - 1] : 0) + dp[i][j]) % MOD;
            col[i][j] = ((i > 0 ? col[i - 1][j] : 0) + dp[i][j]) % MOD;
            diag[i][j] = ((i > 0 && j > 0 ? diag[i - 1][j - 1] : 0) + dp[i][j]) % MOD;
        }
    }
    cout << dp[h - 1][w - 1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc184_d", {
    algorithm: "期望 DP。状态为当前金币数量，转移到某一种金币加一，直到任一种数量达到 100。",
    complexity: "O(100^3)",
    code: `${CPP_INCLUDES}
using namespace std;

double memo[101][101][101];
bool seen[101][101][101];

double solve(int a, int b, int c) {
    if (a == 100 || b == 100 || c == 100) return 0.0;
    if (seen[a][b][c]) return memo[a][b][c];
    seen[a][b][c] = true;
    double total = a + b + c;
    double value = 1.0;
    value += a / total * solve(a + 1, b, c);
    value += b / total * solve(a, b + 1, c);
    value += c / total * solve(a, b, c + 1);
    return memo[a][b][c] = value;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b, c;
    cin >> a >> b >> c;
    cout << fixed << setprecision(12) << solve(a, b, c) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc190_d", {
    algorithm: "连续整数和为 N 等价于 2N = len*(2a+len-1)。枚举 len 的因子并检查首项 a 是否为整数。",
    complexity: "O(sqrt(N))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long target = 2 * n;
    long long answer = 0;
    for (long long len = 1; len * len <= target; ++len) {
        if (target % len != 0) continue;
        auto check = [&](long long l) {
            long long value = target / l - l + 1;
            if (value % 2 == 0) answer++;
        };
        check(len);
        if (len * len != target) check(target / len);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc192_e", {
    algorithm: "Dijkstra。到达车站后若当前时间不是 K 的倍数，需要等待到下一班车，再加上行驶时间。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Edge {
    int to;
    long long t, k;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, x, y;
    cin >> n >> m >> x >> y;
    --x; --y;
    vector<vector<Edge>> g(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        long long t, k;
        cin >> a >> b >> t >> k;
        --a; --b;
        g[a].push_back({b, t, k});
        g[b].push_back({a, t, k});
    }
    const long long INF = (1LL << 62);
    vector<long long> dist(n, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[x] = 0;
    pq.push({0, x});
    while (!pq.empty()) {
        auto [time, v] = pq.top();
        pq.pop();
        if (time != dist[v]) continue;
        for (auto e : g[v]) {
            long long depart = ((time + e.k - 1) / e.k) * e.k;
            long long next = depart + e.t;
            if (next < dist[e.to]) {
                dist[e.to] = next;
                pq.push({next, e.to});
            }
        }
    }
    cout << (dist[y] == INF ? -1 : dist[y]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc193_d", {
    algorithm: "枚举高桥和青木最后抽到的数字，按剩余牌数计算概率，再比较最终分数。",
    complexity: "O(9^2)",
    code: `${CPP_INCLUDES}
using namespace std;

long long score(string s) {
    vector<int> cnt(10, 0);
    for (char ch : s) if ('1' <= ch && ch <= '9') cnt[ch - '0']++;
    long long result = 0;
    for (int d = 1; d <= 9; ++d) {
        long long pow10 = 1;
        for (int i = 0; i < cnt[d]; ++i) pow10 *= 10;
        result += d * pow10;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long k;
    string s, t;
    cin >> k >> s >> t;
    vector<long long> remain(10, k);
    for (char ch : s) if ('1' <= ch && ch <= '9') remain[ch - '0']--;
    for (char ch : t) if ('1' <= ch && ch <= '9') remain[ch - '0']--;
    long double win = 0;
    long double total = (9 * k - 8) * (9 * k - 9);
    for (int a = 1; a <= 9; ++a) {
        if (remain[a] <= 0) continue;
        remain[a]--;
        for (int b = 1; b <= 9; ++b) {
            if (remain[b] <= 0) continue;
            string ss = s, tt = t;
            ss[4] = char('0' + a);
            tt[4] = char('0' + b);
            if (score(ss) > score(tt)) win += (remain[a] + 1) * remain[b];
        }
        remain[a]++;
    }
    cout << fixed << setprecision(12) << (double)(win / total) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc194_e", {
    algorithm: "维护长度为 M 的滑动窗口内每个数出现次数，同时用 set 保存当前没有出现的数，窗口滑动时更新 mex。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> a(n), count(n + 2, 0);
    for (int &value : a) cin >> value;
    set<int> missing;
    for (int i = 0; i <= n + 1; ++i) missing.insert(i);
    for (int i = 0; i < m; ++i) {
        if (++count[a[i]] == 1) missing.erase(a[i]);
    }
    int answer = *missing.begin();
    for (int i = m; i < n; ++i) {
        if (--count[a[i - m]] == 0) missing.insert(a[i - m]);
        if (++count[a[i]] == 1) missing.erase(a[i]);
        answer = min(answer, *missing.begin());
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc196_d", {
    algorithm: "回溯填格。每次找第一个空格，可以放单格榻榻米，也可以向右或向下放一个双格榻榻米。",
    complexity: "O(分支搜索)",
    code: `${CPP_INCLUDES}
using namespace std;

int h, w, a, b;
vector<vector<int>> used;

long long dfs(int pos, int domino, int single) {
    while (pos < h * w && used[pos / w][pos % w]) pos++;
    if (pos == h * w) return 1;
    int y = pos / w, x = pos % w;
    long long result = 0;
    if (single > 0) {
        used[y][x] = 1;
        result += dfs(pos + 1, domino, single - 1);
        used[y][x] = 0;
    }
    if (domino > 0) {
        if (x + 1 < w && !used[y][x + 1]) {
            used[y][x] = used[y][x + 1] = 1;
            result += dfs(pos + 1, domino - 1, single);
            used[y][x] = used[y][x + 1] = 0;
        }
        if (y + 1 < h && !used[y + 1][x]) {
            used[y][x] = used[y + 1][x] = 1;
            result += dfs(pos + 1, domino - 1, single);
            used[y][x] = used[y + 1][x] = 0;
        }
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    cin >> h >> w >> a >> b;
    used.assign(h, vector<int>(w, 0));
    cout << dfs(0, a, b) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc197_d", {
    algorithm: "正 N 边形相对顶点给出圆心。将第一个点绕圆心旋转 2π/N 得到相邻顶点。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    double x0, y0, xh, yh;
    cin >> n >> x0 >> y0 >> xh >> yh;
    double cx = (x0 + xh) / 2.0;
    double cy = (y0 + yh) / 2.0;
    double angle = 2.0 * acos(-1.0) / n;
    double vx = x0 - cx, vy = y0 - cy;
    double x = cx + vx * cos(angle) - vy * sin(angle);
    double y = cy + vx * sin(angle) + vy * cos(angle);
    cout << fixed << setprecision(12) << x << ' ' << y << '\\n';
    return 0;
}
`
  }],
  ["AT_abc198_e", {
    algorithm: "树上 DFS 维护当前根到节点路径上每种颜色出现次数。若当前颜色此前未出现，则该节点是好节点。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> color(n);
    for (int &value : color) cin >> value;
    vector<vector<int>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
    }
    map<int, int> count;
    vector<int> answer;
    auto dfs = [&](auto &&self, int v, int parent) -> void {
        if (count[color[v]] == 0) answer.push_back(v + 1);
        count[color[v]]++;
        for (int to : g[v]) if (to != parent) self(self, to, v);
        count[color[v]]--;
    };
    dfs(dfs, 0, -1);
    sort(answer.begin(), answer.end());
    for (int value : answer) cout << value << '\\n';
    return 0;
}
`
  }],
  ["AT_abc216_e", {
    algorithm: "二分最终取到的最低快乐值阈值。先取所有大于阈值的完整等差段，剩余次数都取阈值。",
    complexity: "O(N log maxA)",
    code: `${CPP_INCLUDES}
using namespace std;

long long sumRange(long long low, long long high) {
    return (low + high) * (high - low + 1) / 2;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &value : a) cin >> value;
    long long totalRides = 0;
    for (long long value : a) totalRides += value;
    k = min(k, totalRides);
    long long low = 1, high = *max_element(a.begin(), a.end()) + 1;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        long long count = 0;
        for (long long value : a) if (value >= mid) count += value - mid + 1;
        if (count >= k) low = mid;
        else high = mid;
    }
    long long answer = 0;
    long long used = 0;
    for (long long value : a) {
        if (value > low) {
            answer += sumRange(low + 1, value);
            used += value - low;
        }
    }
    answer += (k - used) * low;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc217_d", {
    algorithm: "用 set 维护切割点。查询木块长度时找到 x 右侧第一个切点和它前一个切点，相减即答案。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int l, q;
    cin >> l >> q;
    set<int> cuts = {0, l};
    while (q--) {
        int c, x;
        cin >> c >> x;
        if (c == 1) {
            cuts.insert(x);
        } else {
            auto right = cuts.upper_bound(x);
            auto left = prev(right);
            cout << *right - *left << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc218_c", {
    algorithm: "提取两个图形中 # 的坐标并归一化。对 S 连续旋转四次，每次归一化后与 T 比较。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

vector<pair<int, int>> normalize(vector<pair<int, int>> cells) {
    int minY = 1000000, minX = 1000000;
    for (auto [y, x] : cells) {
        minY = min(minY, y);
        minX = min(minX, x);
    }
    for (auto &cell : cells) {
        cell.first -= minY;
        cell.second -= minX;
    }
    sort(cells.begin(), cells.end());
    return cells;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<string> s(n), t(n);
    for (string &row : s) cin >> row;
    for (string &row : t) cin >> row;
    vector<pair<int, int>> target;
    for (int i = 0; i < n; ++i) for (int j = 0; j < n; ++j) if (t[i][j] == '#') target.push_back({i, j});
    target = normalize(target);
    vector<pair<int, int>> cells;
    for (int i = 0; i < n; ++i) for (int j = 0; j < n; ++j) if (s[i][j] == '#') cells.push_back({i, j});
    for (int rot = 0; rot < 4; ++rot) {
        if (normalize(cells) == target) {
            cout << "Yes\\n";
            return 0;
        }
        for (auto &cell : cells) {
            int y = cell.first, x = cell.second;
            cell = {x, n - 1 - y};
        }
    }
    cout << "No\\n";
    return 0;
}
`
  }],
  ["AT_abc219_d", {
    algorithm: "二维 0-1 背包。状态为已达到的章鱼烧、鲷鱼烧数量，超过目标的维度截断到目标值。",
    complexity: "O(NXY)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, x, y;
    cin >> n >> x >> y;
    const int INF = 1000000000;
    vector<vector<int>> dp(x + 1, vector<int>(y + 1, INF));
    dp[0][0] = 0;
    for (int i = 0; i < n; ++i) {
        int a, b;
        cin >> a >> b;
        auto next = dp;
        for (int cx = 0; cx <= x; ++cx) {
            for (int cy = 0; cy <= y; ++cy) {
                if (dp[cx][cy] == INF) continue;
                int nx = min(x, cx + a);
                int ny = min(y, cy + b);
                next[nx][ny] = min(next[nx][ny], dp[cx][cy] + 1);
            }
        }
        dp.swap(next);
    }
    cout << (dp[x][y] == INF ? -1 : dp[x][y]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc225_d", {
    algorithm: "维护每节车厢的前驱和后继。连接、断开都是 O(1)，查询时从当前车厢向前找到车头，再顺着后继输出整列。",
    complexity: "O(Q+输出长度总和)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> prevCar(n + 1, 0), nextCar(n + 1, 0);
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            int x, y;
            cin >> x >> y;
            nextCar[x] = y;
            prevCar[y] = x;
        } else if (type == 2) {
            int x, y;
            cin >> x >> y;
            nextCar[x] = 0;
            prevCar[y] = 0;
        } else {
            int x;
            cin >> x;
            while (prevCar[x]) x = prevCar[x];
            vector<int> train;
            while (x) {
                train.push_back(x);
                x = nextCar[x];
            }
            cout << train.size();
            for (int car : train) cout << ' ' << car;
            cout << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc228_d", {
    algorithm: "用 set 保存仍为空的位置。插入时找到 h=x mod 2^20 之后第一个空位，若没有则回到开头。",
    complexity: "O(Q log 2^20)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const int N = 1 << 20;
    int q;
    cin >> q;
    vector<long long> a(N, -1);
    set<int> empty;
    for (int i = 0; i < N; ++i) empty.insert(i);
    while (q--) {
        int t;
        long long x;
        cin >> t >> x;
        int h = x % N;
        if (t == 1) {
            auto it = empty.lower_bound(h);
            if (it == empty.end()) it = empty.begin();
            a[*it] = x;
            empty.erase(it);
        } else {
            cout << a[h] << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc229_e", {
    algorithm: "反向加点。当前新增一个点会让连通块数加一，再与已经加入的邻点并查集合并，记录每一步的连通块数。",
    complexity: "O((N+M) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
    }
    DSU dsu(n);
    vector<long long> answer(n);
    vector<int> active(n, 0);
    long long components = 0;
    for (int v = n - 1; v >= 0; --v) {
        answer[v] = components;
        active[v] = 1;
        components++;
        for (int to : g[v]) {
            if (active[to] && dsu.unite(v, to)) components--;
        }
    }
    for (long long value : answer) cout << value << '\\n';
    return 0;
}
`
  }],
  ["AT_abc233_e", {
    algorithm: "答案等于所有前缀数之和。按十进制从低位到高位维护剩余数字和与进位，逐位构造结果。",
    complexity: "O(|X|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string x;
    cin >> x;
    long long digitSum = 0;
    for (char ch : x) digitSum += ch - '0';
    string answer;
    long long carry = 0;
    for (int i = (int)x.size() - 1; i >= 0; --i) {
        long long current = digitSum + carry;
        answer.push_back(char('0' + current % 10));
        carry = current / 10;
        digitSum -= x[i] - '0';
    }
    while (carry > 0) {
        answer.push_back(char('0' + carry % 10));
        carry /= 10;
    }
    while (answer.size() > 1 && answer.back() == '0') answer.pop_back();
    reverse(answer.begin(), answer.end());
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc234_e", {
    algorithm: "枚举所有首位和公差能形成的等差数列数字，排序后取不小于 X 的最小值。",
    complexity: "O(常数)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long x;
    cin >> x;
    vector<long long> candidates;
    for (int first = 1; first <= 9; ++first) {
        for (int diff = -9; diff <= 9; ++diff) {
            long long value = 0;
            int digit = first;
            for (int len = 1; len <= 18; ++len) {
                if (digit < 0 || digit > 9) break;
                value = value * 10 + digit;
                candidates.push_back(value);
                digit += diff;
            }
        }
    }
    sort(candidates.begin(), candidates.end());
    candidates.erase(unique(candidates.begin(), candidates.end()), candidates.end());
    cout << *lower_bound(candidates.begin(), candidates.end(), x) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc235_d", {
    algorithm: "把整数看作图节点，从 1 开始 BFS。边为乘以 a 和将末位非零数字旋转到首位，搜索到目标即为最少步数。",
    complexity: "O(10^6)",
    code: `${CPP_INCLUDES}
using namespace std;

int rotateValue(int x) {
    if (x < 10 || x % 10 == 0) return -1;
    string s = to_string(x);
    char last = s.back();
    s.pop_back();
    s = last + s;
    return stoi(s);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, n;
    cin >> a >> n;
    const int LIMIT = 1000000;
    vector<int> dist(LIMIT, -1);
    queue<int> q;
    dist[1] = 0;
    q.push(1);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        long long multiplied = 1LL * v * a;
        if (multiplied < LIMIT && dist[multiplied] == -1) {
            dist[multiplied] = dist[v] + 1;
            q.push((int)multiplied);
        }
        int rotated = rotateValue(v);
        if (rotated != -1 && rotated < LIMIT && dist[rotated] == -1) {
            dist[rotated] = dist[v] + 1;
            q.push(rotated);
        }
    }
    cout << dist[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc236_d", {
    algorithm: "回溯配对。每次选最小的未配对成员，与另一个未配对成员成对，递归维护异或值最大值。",
    complexity: "O((2N-1)!!)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int total = 2 * n;
    vector<vector<int>> a(total, vector<int>(total, 0));
    for (int i = 0; i < total; ++i) {
        for (int j = i + 1; j < total; ++j) cin >> a[i][j];
    }
    vector<int> used(total, 0);
    int answer = 0;
    auto dfs = [&](auto &&self, int value) -> void {
        int first = -1;
        for (int i = 0; i < total; ++i) if (!used[i]) {
            first = i;
            break;
        }
        if (first == -1) {
            answer = max(answer, value);
            return;
        }
        used[first] = 1;
        for (int j = first + 1; j < total; ++j) {
            if (used[j]) continue;
            used[j] = 1;
            self(self, value ^ a[first][j]);
            used[j] = 0;
        }
        used[first] = 0;
    };
    dfs(dfs, 0);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc237_e", {
    algorithm: "把上坡的额外损失作为边权跑 Dijkstra。到每点的最大快乐值为 H_start-H_v-额外上坡损失。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> h(n);
    for (long long &value : h) cin >> value;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    const long long INF = (1LL << 60);
    vector<long long> dist(n, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [cost, v] = pq.top();
        pq.pop();
        if (cost != dist[v]) continue;
        for (int to : g[v]) {
            long long extra = max(0LL, h[to] - h[v]);
            if (dist[to] > dist[v] + extra) {
                dist[to] = dist[v] + extra;
                pq.push({dist[to], to});
            }
        }
    }
    long long answer = 0;
    for (int i = 0; i < n; ++i) answer = max(answer, h[0] - h[i] - dist[i]);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc239_e", {
    algorithm: "DFS 合并子树内较大值列表。每个节点只保留前 20 大，因为查询 K 不超过 20。",
    complexity: "O(N*20 log 20 + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> x(n);
    for (int &value : x) cin >> value;
    vector<vector<int>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
    }
    vector<vector<int>> top(n);
    auto dfs = [&](auto &&self, int v, int parent) -> void {
        top[v].push_back(x[v]);
        for (int to : g[v]) {
            if (to == parent) continue;
            self(self, to, v);
            for (int value : top[to]) top[v].push_back(value);
        }
        sort(top[v].rbegin(), top[v].rend());
        if ((int)top[v].size() > 20) top[v].resize(20);
    };
    dfs(dfs, 0, -1);
    while (q--) {
        int v, k;
        cin >> v >> k;
        cout << top[v - 1][k - 1] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc240_e", {
    algorithm: "DFS 给每个叶子按访问顺序编号。每个节点的区间就是其子树所有叶子编号的最小值和最大值。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    vector<pair<int, int>> ans(n);
    int leaf = 0;
    auto dfs = [&](auto &&self, int v, int parent) -> void {
        bool isLeaf = true;
        int left = 1000000000, right = -1;
        for (int to : g[v]) {
            if (to == parent) continue;
            isLeaf = false;
            self(self, to, v);
            left = min(left, ans[to].first);
            right = max(right, ans[to].second);
        }
        if (isLeaf) {
            ++leaf;
            ans[v] = {leaf, leaf};
        } else {
            ans[v] = {left, right};
        }
    };
    dfs(dfs, 0, -1);
    for (auto [l, r] : ans) cout << l << ' ' << r << '\\n';
    return 0;
}
`
  }],
  ["AT_abc241_d", {
    algorithm: "离线收集所有出现的数并坐标压缩，用 Fenwick 维护频次，再通过二分前缀和找到第 k 个数。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Fenwick {
    int n;
    vector<long long> bit;
    Fenwick(int n) : n(n), bit(n + 1, 0) {}
    void add(int idx, long long value) {
        for (++idx; idx <= n; idx += idx & -idx) bit[idx] += value;
    }
    long long sumPrefix(int idx) {
        long long result = 0;
        for (++idx; idx > 0; idx -= idx & -idx) result += bit[idx];
        return result;
    }
    int kth(long long k) {
        int idx = 0;
        int step = 1;
        while (step * 2 <= n) step *= 2;
        for (; step; step >>= 1) {
            int next = idx + step;
            if (next <= n && bit[next] < k) {
                idx = next;
                k -= bit[next];
            }
        }
        return idx;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    vector<tuple<int, long long, long long>> queries(q);
    vector<long long> values;
    for (auto &[t, x, k] : queries) {
        cin >> t >> x;
        if (t != 1) cin >> k;
        values.push_back(x);
    }
    sort(values.begin(), values.end());
    values.erase(unique(values.begin(), values.end()), values.end());
    Fenwick fw(values.size());
    for (auto [t, x, k] : queries) {
        int pos = lower_bound(values.begin(), values.end(), x) - values.begin();
        if (t == 1) {
            fw.add(pos, 1);
        } else if (t == 2) {
            long long count = fw.sumPrefix(pos);
            if (count < k) cout << -1 << '\\n';
            else cout << values[fw.kth(count - k + 1)] << '\\n';
        } else {
            long long before = pos == 0 ? 0 : fw.sumPrefix(pos - 1);
            long long total = fw.sumPrefix((int)values.size() - 1);
            if (total - before < k) cout << -1 << '\\n';
            else cout << values[fw.kth(before + k)] << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc243_d", {
    algorithm: "先化简操作串：遇到 U 可以抵消前面一个 L/R。剩余操作再从 X 开始模拟二叉树编号变化。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long x;
    string s;
    cin >> n >> x >> s;
    string ops;
    for (char ch : s) {
        if (ch == 'U' && !ops.empty() && ops.back() != 'U') ops.pop_back();
        else ops.push_back(ch);
    }
    for (char ch : ops) {
        if (ch == 'U') x /= 2;
        else if (ch == 'L') x *= 2;
        else x = x * 2 + 1;
    }
    cout << x << '\\n';
    return 0;
}
`
  }],
  ["AT_abc244_e", {
    algorithm: "DP 记录步数、当前点、经过 X 的奇偶次数。走到 X 时翻转奇偶，最后取终点且偶数次的方案数。",
    complexity: "O(KM)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k, s, t, x;
    cin >> n >> m >> k >> s >> t >> x;
    --s; --t; --x;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        g[u].push_back(v);
        g[v].push_back(u);
    }
    vector<vector<long long>> dp(n, vector<long long>(2, 0));
    dp[s][0] = 1;
    for (int step = 0; step < k; ++step) {
        vector<vector<long long>> next(n, vector<long long>(2, 0));
        for (int v = 0; v < n; ++v) {
            for (int parity = 0; parity < 2; ++parity) {
                for (int to : g[v]) {
                    int np = parity ^ (to == x);
                    next[to][np] = (next[to][np] + dp[v][parity]) % MOD;
                }
            }
        }
        dp.swap(next);
    }
    cout << dp[t][0] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc246_d", {
    algorithm: "枚举 a，用二分找最小 b 使 f(a,b) 不小于 N，并更新答案。",
    complexity: "O(10^6 log 10^6)",
    code: `${CPP_INCLUDES}
using namespace std;

long long f(long long a, long long b) {
    return a * a * a + a * a * b + a * b * b + b * b * b;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long answer = (1LL << 62);
    for (long long a = 0; a <= 1000000; ++a) {
        long long low = -1, high = 1000001;
        while (high - low > 1) {
            long long mid = (low + high) / 2;
            if (f(a, mid) >= n) high = mid;
            else low = mid;
        }
        answer = min(answer, f(a, high));
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc247_e", {
    algorithm: "扫描数组，记录最近的不合法位置、最近出现 X 的位置、最近出现 Y 的位置。每个右端点贡献 min(lastX,lastY)-lastBad。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long x, y;
    cin >> n >> x >> y;
    long long answer = 0;
    int lastBad = -1, lastX = -1, lastY = -1;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        if (a < y || a > x) lastBad = i;
        if (a == x) lastX = i;
        if (a == y) lastY = i;
        int usable = min(lastX, lastY);
        if (usable > lastBad) answer += usable - lastBad;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc251_e", {
    algorithm: "环上不能有连续两个点都不选。分别固定第一个点选或不选，转化为线性 DP 取最小费用。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

long long solveLinear(const vector<long long> &a, int firstChosen) {
    int n = a.size();
    const long long INF = (1LL << 60);
    vector<vector<long long>> dp(n, vector<long long>(2, INF));
    dp[0][firstChosen] = firstChosen ? a[0] : 0;
    for (int i = 1; i < n; ++i) {
        dp[i][1] = min(dp[i - 1][0], dp[i - 1][1]) + a[i];
        dp[i][0] = dp[i - 1][1];
    }
    if (firstChosen) return min(dp[n - 1][0], dp[n - 1][1]);
    return dp[n - 1][1];
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &value : a) cin >> value;
    cout << min(solveLinear(a, 0), solveLinear(a, 1)) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc253_e", {
    algorithm: "DP 按长度转移。用前缀和快速求与当前值距离至少 K 的上一位方案数；K=0 时所有值都可转移。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<long long> dp(m + 1, 1);
    for (int len = 2; len <= n; ++len) {
        vector<long long> prefix(m + 1, 0), next(m + 1, 0);
        for (int i = 1; i <= m; ++i) prefix[i] = (prefix[i - 1] + dp[i]) % MOD;
        for (int value = 1; value <= m; ++value) {
            if (k == 0) {
                next[value] = prefix[m];
            } else {
                if (value - k >= 1) next[value] = (next[value] + prefix[value - k]) % MOD;
                if (value + k <= m) next[value] = (next[value] + prefix[m] - prefix[value + k - 1] + MOD) % MOD;
            }
        }
        dp.swap(next);
    }
    long long answer = 0;
    for (int i = 1; i <= m; ++i) answer = (answer + dp[i]) % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc015_3", {
    algorithm: "对每一行选择一个数，枚举所有 k^n 种组合，并维护当前异或值。只要存在异或结果为 0 的组合，答案就是 Found。",
    complexity: "O(k^n n)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<vector<int>> t(n, vector<int>(k));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < k; ++j) cin >> t[i][j];
    }

    bool found = false;
    auto dfs = [&](auto &&self, int row, int value) -> void {
        if (row == n) {
            if (value == 0) found = true;
            return;
        }
        for (int x : t[row]) {
            self(self, row + 1, value ^ x);
        }
    };

    dfs(dfs, 0, 0);
    cout << (found ? "Found" : "Nothing") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc026_c", {
    algorithm: "公司关系是一棵树。递归计算每个员工工资：没有下属为 1，否则为下属工资最大值加最小值再加 1。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> children(n);
    for (int i = 1; i < n; ++i) {
        int b;
        cin >> b;
        children[b - 1].push_back(i);
    }

    auto salary = [&](auto &&self, int v) -> long long {
        if (children[v].empty()) return 1LL;
        long long low = numeric_limits<long long>::max();
        long long high = 0;
        for (int to : children[v]) {
            long long value = self(self, to);
            low = min(low, value);
            high = max(high, value);
        }
        return low + high + 1;
    };

    cout << salary(salary, 0) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc027_b", {
    algorithm: "若总人口不能被岛数整除则无解。否则从左到右维护前缀人口，当前缀人口不等于平均值乘以前缀岛数时，这条边必须保留为连通段内部的一部分。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int sum = 0;
    for (int &x : a) {
        cin >> x;
        sum += x;
    }

    if (sum % n != 0) {
        cout << -1 << '\\n';
        return 0;
    }

    int avg = sum / n;
    int prefix = 0;
    int answer = 0;
    for (int i = 0; i < n - 1; ++i) {
        prefix += a[i];
        if (prefix != avg * (i + 1)) ++answer;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc030_c", {
    algorithm: "用两个指针模拟搭乘 A->B 与 B->A 的往返过程。每次在当前时间之后找到能乘坐的最早航班。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    long long x, y;
    cin >> n >> m >> x >> y;
    vector<long long> a(n), b(m);
    for (long long &v : a) cin >> v;
    for (long long &v : b) cin >> v;

    long long time = 0;
    int i = 0, j = 0, answer = 0;
    while (true) {
        while (i < n && a[i] < time) ++i;
        if (i == n) break;
        time = a[i] + x;
        ++i;

        while (j < m && b[j] < time) ++j;
        if (j == m) break;
        time = b[j] + y;
        ++j;
        ++answer;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc033_c", {
    algorithm: "表达式只包含加号和乘号。按加号分割后，每一段只要不含数字 0，整段乘积就非零，统计这样的段数。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    int answer = 0;
    bool hasZero = false;
    for (char ch : s) {
        if (ch == '+') {
            if (!hasZero) ++answer;
            hasZero = false;
        } else if (ch == '0') {
            hasZero = true;
        }
    }
    if (!hasZero) ++answer;

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc035_b", {
    algorithm: "确定移动先得到曼哈顿距离 d，问号数量为 q。最大距离直接加 q；最小距离若 q 可以抵消 d 则为 d-q，否则只剩奇偶振荡。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    int t;
    cin >> s >> t;
    int x = 0, y = 0, q = 0;
    for (char ch : s) {
        if (ch == 'L') --x;
        else if (ch == 'R') ++x;
        else if (ch == 'U') ++y;
        else if (ch == 'D') --y;
        else ++q;
    }

    int distance = abs(x) + abs(y);
    if (t == 1) {
        cout << distance + q << '\\n';
    } else {
        cout << (distance >= q ? distance - q : (q - distance) % 2) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc035_c", {
    algorithm: "区间翻转只关心每个位置被翻转次数的奇偶。用差分数组记录每次操作，最后前缀和取奇偶输出。",
    complexity: "O(N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> diff(n + 1, 0);
    for (int i = 0; i < q; ++i) {
        int l, r;
        cin >> l >> r;
        --l;
        diff[l] ^= 1;
        diff[r] ^= 1;
    }

    int cur = 0;
    for (int i = 0; i < n; ++i) {
        cur ^= diff[i];
        cout << cur;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc037_c", {
    algorithm: "每个长度为 k 的连续子数组求和。先求初始窗口，再滑动窗口更新总和。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    long long window = 0;
    for (int i = 0; i < k; ++i) window += a[i];
    long long answer = window;
    for (int i = k; i < n; ++i) {
        window += a[i] - a[i - k];
        answer += window;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc040_c", {
    algorithm: "经典 Frog DP。dp[i] 表示到达第 i 根柱子的最小代价，从 i-1 或 i-2 转移。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> h(n);
    for (int &x : h) cin >> x;

    const int INF = 1e9;
    vector<int> dp(n, INF);
    dp[0] = 0;
    for (int i = 1; i < n; ++i) {
        dp[i] = min(dp[i], dp[i - 1] + abs(h[i] - h[i - 1]));
        if (i >= 2) dp[i] = min(dp[i], dp[i - 2] + abs(h[i] - h[i - 2]));
    }

    cout << dp[n - 1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc045_b", {
    algorithm: "模拟三个人依次出牌。当前玩家没有牌时该玩家获胜，否则取出牌顶字符作为下一位玩家。",
    complexity: "O(|A| + |B| + |C|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<string> s(3);
    cin >> s[0] >> s[1] >> s[2];
    vector<int> pos(3, 0);
    int turn = 0;
    while (pos[turn] < (int)s[turn].size()) {
        int next = s[turn][pos[turn]++] - 'a';
        turn = next;
    }

    cout << char('A' + turn) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc054_b", {
    algorithm: "枚举大图中每个可能的左上角，逐格比较是否与小图完全一致。",
    complexity: "O(N^2 M^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<string> a(n), b(m);
    for (string &row : a) cin >> row;
    for (string &row : b) cin >> row;

    for (int y = 0; y + m <= n; ++y) {
        for (int x = 0; x + m <= n; ++x) {
            bool ok = true;
            for (int i = 0; i < m; ++i) {
                for (int j = 0; j < m; ++j) {
                    if (a[y + i][x + j] != b[i][j]) ok = false;
                }
            }
            if (ok) {
                cout << "Yes" << '\\n';
                return 0;
            }
        }
    }

    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc054_c", {
    algorithm: "N 很小，固定从 1 号点出发，枚举剩余点的全排列，统计相邻点之间都有边的排列数。",
    complexity: "O(N! N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> edge(n, vector<int>(n, 0));
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        edge[a][b] = edge[b][a] = 1;
    }

    vector<int> p;
    for (int i = 1; i < n; ++i) p.push_back(i);
    int answer = 0;
    do {
        int prev = 0;
        bool ok = true;
        for (int v : p) {
            if (!edge[prev][v]) ok = false;
            prev = v;
        }
        if (ok) ++answer;
    } while (next_permutation(p.begin(), p.end()));

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc057_b", {
    algorithm: "对每个学生枚举所有检查点，计算曼哈顿距离，选择距离最小且编号最小的检查点。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<pair<int, int>> student(n), checkpoint(m);
    for (auto &[x, y] : student) cin >> x >> y;
    for (auto &[x, y] : checkpoint) cin >> x >> y;

    for (auto [sx, sy] : student) {
        int bestIndex = 0;
        int bestDistance = numeric_limits<int>::max();
        for (int i = 0; i < m; ++i) {
            int d = abs(sx - checkpoint[i].first) + abs(sy - checkpoint[i].second);
            if (d < bestDistance) {
                bestDistance = d;
                bestIndex = i;
            }
        }
        cout << bestIndex + 1 << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc057_c", {
    algorithm: "枚举 N 的因子 a，令 b=N/a，答案取 max(位数(a), 位数(b)) 的最小值。",
    complexity: "O(sqrt(N))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    int answer = 20;
    for (long long a = 1; a * a <= n; ++a) {
        if (n % a != 0) continue;
        long long b = n / a;
        int digits = max((int)to_string(a).size(), (int)to_string(b).size());
        answer = min(answer, digits);
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc070_c", {
    algorithm: "所有时钟再次同时响起的时间是所有周期的最小公倍数，依次用 gcd 合并即可。",
    complexity: "O(N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long answer = 1;
    for (int i = 0; i < n; ++i) {
        long long t;
        cin >> t;
        answer = answer / gcd(answer, t) * t;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc076_c", {
    algorithm: "枚举把 T 放入 S 的位置，要求非问号字符一致。为了字典序最小，从所有可行结果中取最小，并把剩余问号替换为 a。",
    complexity: "O(|S||T|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s, t;
    cin >> s >> t;
    string best = "";
    for (int start = 0; start + (int)t.size() <= (int)s.size(); ++start) {
        bool ok = true;
        string cur = s;
        for (int i = 0; i < (int)t.size(); ++i) {
            if (cur[start + i] != '?' && cur[start + i] != t[i]) ok = false;
            cur[start + i] = t[i];
        }
        if (!ok) continue;
        for (char &ch : cur) {
            if (ch == '?') ch = 'a';
        }
        if (best.empty() || cur < best) best = cur;
    }

    cout << (best.empty() ? "UNRESTORABLE" : best) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc103_c", {
    algorithm: "对每个 ai 取模 ai 时最大余数为 ai-1，各数互不影响，因此答案是 sum(ai-1)。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        answer += a - 1;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc110_c", {
    algorithm: "需要 S 到 T 以及 T 到 S 都是一一映射。维护两个方向的字符映射，若发现冲突则不可变换。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s, t;
    cin >> s >> t;
    vector<int> st(26, -1), ts(26, -1);
    for (int i = 0; i < (int)s.size(); ++i) {
        int a = s[i] - 'a';
        int b = t[i] - 'a';
        if ((st[a] != -1 && st[a] != b) || (ts[b] != -1 && ts[b] != a)) {
            cout << "No" << '\\n';
            return 0;
        }
        st[a] = b;
        ts[b] = a;
    }

    cout << "Yes" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc112_c", {
    algorithm: "枚举中心 (cx, cy) 的 101x101 种可能。由高度非零的观测点确定候选 H，再检查所有观测点是否满足 max(H-|x-cx|-|y-cy|,0)。",
    complexity: "O(101^2 N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<tuple<int, int, int>> points(n);
    for (auto &[x, y, h] : points) cin >> x >> y >> h;

    for (int cx = 0; cx <= 100; ++cx) {
        for (int cy = 0; cy <= 100; ++cy) {
            int height = -1;
            for (auto [x, y, h] : points) {
                if (h > 0) {
                    height = h + abs(x - cx) + abs(y - cy);
                    break;
                }
            }
            if (height < 0) height = 0;

            bool ok = true;
            for (auto [x, y, h] : points) {
                int expected = max(height - abs(x - cx) - abs(y - cy), 0);
                if (expected != h) ok = false;
            }
            if (ok) {
                cout << cx << ' ' << cy << ' ' << height << '\\n';
                return 0;
            }
        }
    }
    return 0;
}
`
  }],
  ["AT_abc113_c", {
    algorithm: "每个市的编号由所属县内按年份排序的位置决定。按县收集城市并排序后生成 6 位县号 + 6 位序号。",
    complexity: "O(M log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> p(m), y(m);
    vector<vector<pair<int, int>>> byPrefecture(n);
    for (int i = 0; i < m; ++i) {
        cin >> p[i] >> y[i];
        byPrefecture[p[i] - 1].push_back({y[i], i});
    }

    vector<int> order(m);
    for (int i = 0; i < n; ++i) {
        sort(byPrefecture[i].begin(), byPrefecture[i].end());
        for (int j = 0; j < (int)byPrefecture[i].size(); ++j) {
            order[byPrefecture[i][j].second] = j + 1;
        }
    }

    for (int i = 0; i < m; ++i) {
        cout << setw(6) << setfill('0') << p[i]
             << setw(6) << setfill('0') << order[i] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc114_c", {
    algorithm: "只由 3、5、7 组成的数数量很少，用 DFS 生成所有不超过 N 的数，并统计同时包含 3、5、7 的数。",
    complexity: "O(3^digits)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    int answer = 0;
    auto dfs = [&](auto &&self, long long value, bool has3, bool has5, bool has7) -> void {
        if (value > n) return;
        if (has3 && has5 && has7) ++answer;
        self(self, value * 10 + 3, true, has5, has7);
        self(self, value * 10 + 5, has3, true, has7);
        self(self, value * 10 + 7, has3, has5, true);
    };

    dfs(dfs, 0, false, false, false);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc121_d", {
    algorithm: "利用 0 到 x 的异或和每 4 个数循环一次，答案为 f(B) xor f(A-1)。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

long long prefixXor(long long x) {
    if (x < 0) return 0;
    if (x % 4 == 0) return x;
    if (x % 4 == 1) return 1;
    if (x % 4 == 2) return x + 1;
    return 0;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b;
    cin >> a >> b;
    cout << (prefixXor(b) ^ prefixXor(a - 1)) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc122_c", {
    algorithm: "预处理前缀和，prefix[i] 表示前 i 个字符内出现的 AC 个数。每个询问用 prefix[r]-prefix[l] 回答。",
    complexity: "O(N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    string s;
    cin >> n >> q >> s;
    vector<int> prefix(n + 1, 0);
    for (int i = 0; i + 1 < n; ++i) {
        prefix[i + 1] = prefix[i] + (s[i] == 'A' && s[i + 1] == 'C');
    }
    prefix[n] = prefix[n - 1];

    while (q--) {
        int l, r;
        cin >> l >> r;
        --l; --r;
        cout << prefix[r] - prefix[l] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc125_c", {
    algorithm: "分别求前缀 gcd 和后缀 gcd。删除第 i 个数后的 gcd 为 gcd(prefix[i], suffix[i+1])，取最大值。",
    complexity: "O(N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    vector<int> pref(n + 1, 0), suff(n + 1, 0);
    for (int i = 0; i < n; ++i) pref[i + 1] = gcd(pref[i], a[i]);
    for (int i = n - 1; i >= 0; --i) suff[i] = gcd(suff[i + 1], a[i]);

    int answer = 0;
    for (int i = 0; i < n; ++i) {
        answer = max(answer, gcd(pref[i], suff[i + 1]));
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc125_d", {
    algorithm: "如果负数个数为偶数，所有数都可变正；否则必须留下绝对值最小的数为负。答案为绝对值总和减去必要时的两倍最小绝对值。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long sum = 0;
    long long minAbs = numeric_limits<long long>::max();
    int negatives = 0;
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        if (x < 0) ++negatives;
        sum += llabs(x);
        minAbs = min(minAbs, llabs(x));
    }

    if (negatives % 2) sum -= 2 * minAbs;
    cout << sum << '\\n';
    return 0;
}
`
  }],
  ["AT_abc126_d", {
    algorithm: "树上从 1 号点 DFS，边权为偶数则两端同色，奇数则异色。输出的 0/1 颜色可以整体翻转，因此使用题目专用校验器验证边约束。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, long long>>> graph(n);
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        --u; --v;
        graph[u].push_back({v, w});
        graph[v].push_back({u, w});
    }

    vector<int> color(n, -1);
    color[0] = 0;
    stack<int> st;
    st.push(0);
    while (!st.empty()) {
        int v = st.top();
        st.pop();
        for (auto [to, w] : graph[v]) {
            if (color[to] != -1) continue;
            color[to] = color[v] ^ (w % 2);
            st.push(to);
        }
    }

    for (int c : color) cout << c << '\\n';
    return 0;
}
`
  }],
  ["AT_abc130_d", {
    algorithm: "所有元素为正，使用双指针维护当前区间和。对每个左端点找到最小右端点后，后续所有右端点都满足条件。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    long long answer = 0;
    long long sum = 0;
    int right = 0;
    for (int left = 0; left < n; ++left) {
        while (right < n && sum < k) {
            sum += a[right++];
        }
        if (sum >= k) answer += n - right + 1;
        sum -= a[left];
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc134_d", {
    algorithm: "从后往前决定盒子是否放球。对每个 i，统计 i 的倍数位置当前球数奇偶，若不等于目标 ai 就在 i 放球。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n + 1), ball(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> a[i];

    vector<int> answer;
    for (int i = n; i >= 1; --i) {
        int parity = 0;
        for (int j = i * 2; j <= n; j += i) parity ^= ball[j];
        if (parity != a[i]) {
            ball[i] = 1;
            answer.push_back(i);
        }
    }

    sort(answer.begin(), answer.end());
    cout << answer.size() << '\\n';
    for (int i = 0; i < (int)answer.size(); ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    if (!answer.empty()) cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc137_c", {
    algorithm: "异位词排序后相同。把每个字符串排序作为 key，已有相同 key 的数量都能与当前字符串配对。",
    complexity: "O(N L log L)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<string, long long> count;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        string s;
        cin >> s;
        sort(s.begin(), s.end());
        answer += count[s];
        ++count[s];
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc138_d", {
    algorithm: "把每个查询的加值累加到对应节点，再从根 DFS，把祖先累积值传给子节点。",
    complexity: "O(N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<vector<int>> graph(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }

    vector<long long> value(n, 0);
    while (q--) {
        int p;
        long long x;
        cin >> p >> x;
        value[p - 1] += x;
    }

    stack<pair<int, int>> st;
    st.push({0, -1});
    while (!st.empty()) {
        auto [v, parent] = st.top();
        st.pop();
        for (int to : graph[v]) {
            if (to == parent) continue;
            value[to] += value[v];
            st.push({to, v});
        }
    }

    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << value[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc140_d", {
    algorithm: "初始幸福度为相邻字符相同的边数。一次操作最多让幸福度增加 2，因此答案为 min(n-1, initial+2k)。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    string s;
    cin >> n >> k >> s;
    int happy = 0;
    for (int i = 0; i + 1 < n; ++i) {
        if (s[i] == s[i + 1]) ++happy;
    }

    cout << min(n - 1, happy + 2 * k) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc142_d", {
    algorithm: "答案是 gcd(A,B) 的不同质因子个数再加 1，其中加 1 表示公因子 1。",
    complexity: "O(sqrt(g))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b;
    cin >> a >> b;
    long long g = gcd(a, b);
    int answer = 1;
    for (long long p = 2; p * p <= g; ++p) {
        if (g % p != 0) continue;
        ++answer;
        while (g % p == 0) g /= p;
    }
    if (g > 1) ++answer;

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc146_c", {
    algorithm: "购买价格随整数 N 单调不减，二分最大的可购买整数。",
    complexity: "O(log 1e9)",
    code: `${CPP_INCLUDES}
using namespace std;

int digits(long long x) {
    return (int)to_string(x).size();
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b, x;
    cin >> a >> b >> x;
    long long low = 0, high = 1000000001LL;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        long long cost = a * mid + b * digits(mid);
        if (cost <= x) low = mid;
        else high = mid;
    }

    cout << low << '\\n';
    return 0;
}
`
  }],
  ["AT_abc147_c", {
    algorithm: "N 很小，枚举诚实者集合。若集合中每个诚实者的证言都与集合一致，则更新最大诚实人数。",
    complexity: "O(2^N * statements)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, int>>> testimony(n);
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        testimony[i].resize(a);
        for (auto &[x, y] : testimony[i]) {
            cin >> x >> y;
            --x;
        }
    }

    int answer = 0;
    for (int mask = 0; mask < (1 << n); ++mask) {
        bool ok = true;
        for (int i = 0; i < n; ++i) {
            if (!(mask >> i & 1)) continue;
            for (auto [x, y] : testimony[i]) {
                if (((mask >> x) & 1) != y) ok = false;
            }
        }
        if (ok) answer = max(answer, __builtin_popcount((unsigned)mask));
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc147_d", {
    algorithm: "逐位统计 1 的个数 c 和 0 的个数 n-c，该位对答案贡献为 c*(n-c)*2^bit。",
    complexity: "O(N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 1000000007LL;
    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    long long answer = 0;
    long long pow2 = 1;
    for (int bit = 0; bit < 60; ++bit) {
        long long ones = 0;
        for (long long x : a) {
            if (x >> bit & 1LL) ++ones;
        }
        long long zeros = n - ones;
        answer = (answer + ones % MOD * (zeros % MOD) % MOD * pow2) % MOD;
        pow2 = pow2 * 2 % MOD;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc153_e", {
    algorithm: "完全背包 DP。dp[x] 表示造成至少 x 点伤害的最小魔力，伤害超过 H 时截断到 H。",
    complexity: "O(HM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, n;
    cin >> h >> n;
    vector<int> damage(n), cost(n);
    for (int i = 0; i < n; ++i) cin >> damage[i] >> cost[i];

    const int INF = 1e9;
    vector<int> dp(h + 1, INF);
    dp[0] = 0;
    for (int current = 0; current <= h; ++current) {
        for (int i = 0; i < n; ++i) {
            int next = min(h, current + damage[i]);
            dp[next] = min(dp[next], dp[current] + cost[i]);
        }
    }

    cout << dp[h] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc158_d", {
    algorithm: "用 deque 维护字符串，并用一个反转标记表示当前方向。追加时根据方向决定加入头部还是尾部，最后按方向输出。",
    complexity: "O(|S| + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    deque<char> dq(s.begin(), s.end());
    bool reversed = false;
    int q;
    cin >> q;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            reversed = !reversed;
        } else {
            int f;
            char c;
            cin >> f >> c;
            bool front = (f == 1);
            if (reversed) front = !front;
            if (front) dq.push_front(c);
            else dq.push_back(c);
        }
    }

    if (reversed) {
        for (auto it = dq.rbegin(); it != dq.rend(); ++it) cout << *it;
    } else {
        for (char c : dq) cout << c;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc161_d", {
    algorithm: "Lunlun 数可从小到大用队列生成：每次取出 x，再追加末位差不超过 1 的数字。",
    complexity: "O(K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int k;
    cin >> k;
    queue<long long> q;
    for (int i = 1; i <= 9; ++i) q.push(i);
    long long answer = 0;
    for (int count = 0; count < k; ++count) {
        answer = q.front();
        q.pop();
        int last = answer % 10;
        for (int d = max(0, last - 1); d <= min(9, last + 1); ++d) {
            q.push(answer * 10 + d);
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc162_d", {
    algorithm: "先统计所有不同颜色三元组数量，再减去等间距且三色不同的非法三元组。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    long long r = 0, g = 0, b = 0;
    for (char c : s) {
        if (c == 'R') ++r;
        else if (c == 'G') ++g;
        else ++b;
    }
    long long answer = r * g * b;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            int k = 2 * j - i;
            if (k >= n) continue;
            if (s[i] != s[j] && s[j] != s[k] && s[i] != s[k]) --answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc164_d", {
    algorithm: "从右向左维护后缀模 2019 的值。两个位置后缀模相同，则中间子串能被 2019 整除。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    vector<long long> count(2019, 0);
    count[0] = 1;
    int current = 0;
    int power = 1;
    long long answer = 0;
    for (int i = (int)s.size() - 1; i >= 0; --i) {
        current = (current + (s[i] - '0') * power) % 2019;
        answer += count[current];
        ++count[current];
        power = power * 10 % 2019;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc167_d", {
    algorithm: "不断沿传送点前进并记录第一次到达时间，发现环后把 K 对环长取模定位最终位置。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<int> a(n);
    for (int &x : a) {
        cin >> x;
        --x;
    }

    vector<int> seen(n, -1), order;
    int v = 0;
    while (seen[v] == -1) {
        seen[v] = order.size();
        order.push_back(v);
        v = a[v];
    }

    if (k < (long long)order.size()) {
        cout << order[k] + 1 << '\\n';
    } else {
        int start = seen[v];
        int length = order.size() - start;
        long long index = start + (k - start) % length;
        cout << order[index] + 1 << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc168_d", {
    algorithm: "从 1 号点 BFS，记录每个点第一次被访问时的父节点。父节点答案不唯一，因此使用题目专用校验器验证输出构成合法指示树。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }

    vector<int> parent(n, -1);
    queue<int> q;
    q.push(0);
    parent[0] = 0;
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : graph[v]) {
            if (parent[to] != -1) continue;
            parent[to] = v;
            q.push(to);
        }
    }

    cout << "Yes" << '\\n';
    for (int i = 1; i < n; ++i) cout << parent[i] + 1 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc172_c", {
    algorithm: "分别求两摞书的前缀耗时。枚举 A 取几本，用二分在 B 中找还能取的最多本数。",
    complexity: "O(N log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    long long k;
    cin >> n >> m >> k;
    vector<long long> a(n + 1, 0), b(m + 1, 0);
    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        a[i + 1] = a[i] + x;
    }
    for (int i = 0; i < m; ++i) {
        long long x;
        cin >> x;
        b[i + 1] = b[i] + x;
    }

    int answer = 0;
    for (int i = 0; i <= n; ++i) {
        if (a[i] > k) break;
        int j = upper_bound(b.begin(), b.end(), k - a[i]) - b.begin() - 1;
        answer = max(answer, i + j);
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc172_d", {
    algorithm: "每个 i 对答案贡献 i * divisor_count(i)。用筛法统计每个数的约数个数后求和。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> divisors(n + 1, 0);
    for (int d = 1; d <= n; ++d) {
        for (int multiple = d; multiple <= n; multiple += d) ++divisors[multiple];
    }

    long long answer = 0;
    for (int i = 1; i <= n; ++i) answer += 1LL * i * divisors[i];
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc173_d", {
    algorithm: "最大的人先放入。之后按降序把每个人的值作为可贡献亲密度的槽位加入两次，依次取最大的槽位贡献。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    sort(a.rbegin(), a.rend());

    priority_queue<long long> pq;
    pq.push(a[0]);
    long long answer = 0;
    for (int i = 1; i < n; ++i) {
        long long value = pq.top();
        pq.pop();
        answer += value;
        pq.push(a[i]);
        pq.push(a[i]);
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc177_d", {
    algorithm: "朋友关系构成无向图，用并查集合并每条边，最大连通块大小就是答案。",
    complexity: "O((N + M) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size;
    DSU(int n) : parent(n), size(n, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        if (parent[x] == x) return x;
        return parent[x] = find(parent[x]);
    }
    void unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        dsu.unite(a - 1, b - 1);
    }

    int answer = 1;
    for (int i = 0; i < n; ++i) answer = max(answer, dsu.size[dsu.find(i)]);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc178_d", {
    algorithm: "设每段至少为 3。dp[x] 表示总和为 x 的方案数，转移为选择最后一段长度 3..x。",
    complexity: "O(S^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 1000000007LL;
    int s;
    cin >> s;
    vector<long long> dp(s + 1, 0);
    dp[0] = 1;
    for (int sum = 0; sum <= s; ++sum) {
        for (int add = 3; sum + add <= s; ++add) {
            dp[sum + add] = (dp[sum + add] + dp[sum]) % MOD;
        }
    }

    cout << dp[s] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc178_e", {
    algorithm: "曼哈顿距离可转化为 max(|(x+y)差|, |(x-y)差|)，分别维护两种值的最大最小。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long maxSum = -(1LL << 60), minSum = (1LL << 60);
    long long maxDiff = -(1LL << 60), minDiff = (1LL << 60);
    for (int i = 0; i < n; ++i) {
        long long x, y;
        cin >> x >> y;
        maxSum = max(maxSum, x + y);
        minSum = min(minSum, x + y);
        maxDiff = max(maxDiff, x - y);
        minDiff = min(minDiff, x - y);
    }

    cout << max(maxSum - minSum, maxDiff - minDiff) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc180_d", {
    algorithm: "在乘法仍比加法更划算且不会达到目标前尽量乘，之后用加法补足剩余经验。",
    complexity: "O(log Y)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long x, y, a, b;
    cin >> x >> y >> a >> b;
    long long answer = 0;
    while (x < y && x <= (y - 1) / a && x * a < x + b) {
        x *= a;
        ++answer;
    }
    answer += (y - 1 - x) / b;

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc182_d", {
    algorithm: "路径位置等于已走前缀和，过程中最高点由当前总位置加上本轮前缀最大值决定。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    long long prefix = 0;
    long long bestPrefix = 0;
    long long position = 0;
    long long answer = 0;
    for (long long x : a) {
        prefix += x;
        bestPrefix = max(bestPrefix, prefix);
        answer = max(answer, position + bestPrefix);
        position += prefix;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc185_e", {
    algorithm: "编辑距离 DP。dp[i][j] 表示把 A 前 i 个变成 B 前 j 个的最小操作数，支持删除、插入、替换/匹配。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> a(n), b(m);
    for (int &x : a) cin >> x;
    for (int &x : b) cin >> x;

    const int INF = 1e9;
    vector<vector<int>> dp(n + 1, vector<int>(m + 1, INF));
    dp[0][0] = 0;
    for (int i = 0; i <= n; ++i) {
        for (int j = 0; j <= m; ++j) {
            if (i < n) dp[i + 1][j] = min(dp[i + 1][j], dp[i][j] + 1);
            if (j < m) dp[i][j + 1] = min(dp[i][j + 1], dp[i][j] + 1);
            if (i < n && j < m) {
                dp[i + 1][j + 1] = min(dp[i + 1][j + 1], dp[i][j] + (a[i] != b[j]));
            }
        }
    }

    cout << dp[n][m] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc189_d", {
    algorithm: "维护当前表达式为 true/false 的赋值数量。遇到 AND 或 OR 时按真值表转移。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long falseCount = 1, trueCount = 1;
    for (int i = 0; i < n; ++i) {
        string op;
        cin >> op;
        long long nf, nt;
        if (op == "AND") {
            nt = trueCount;
            nf = falseCount * 2 + trueCount;
        } else {
            nt = trueCount * 2 + falseCount;
            nf = falseCount;
        }
        falseCount = nf;
        trueCount = nt;
    }

    cout << trueCount << '\\n';
    return 0;
}
`
  }],
  ["AT_abc191_c", {
    algorithm: "观察每个 2x2 小方块，如果其中黑格数量为 1 或 3，则轮廓在这里转弯一次。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> s(h);
    for (string &row : s) cin >> row;

    int answer = 0;
    for (int i = 0; i + 1 < h; ++i) {
        for (int j = 0; j + 1 < w; ++j) {
            int black = 0;
            for (int dy = 0; dy < 2; ++dy) {
                for (int dx = 0; dx < 2; ++dx) {
                    black += s[i + dy][j + dx] == '#';
                }
            }
            if (black == 1 || black == 3) ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc194_d", {
    algorithm: "已经访问 i 个点时，访问新点的概率为 (N-i)/N，期望等待 N/(N-i)。对 i=1..N-1 求和。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    double answer = 0.0;
    for (int i = 1; i < n; ++i) {
        answer += (double)n / (n - i);
    }

    cout << fixed << setprecision(12) << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc197_c", {
    algorithm: "枚举相邻位置是否切分。每段内部取 OR，所有段结果取 XOR，取最小值。",
    complexity: "O(2^(N-1) N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;

    int answer = numeric_limits<int>::max();
    for (int mask = 0; mask < (1 << (n - 1)); ++mask) {
        int xr = 0;
        int currentOr = 0;
        for (int i = 0; i < n; ++i) {
            currentOr |= a[i];
            if (i == n - 1 || (mask >> i & 1)) {
                xr ^= currentOr;
                currentOr = 0;
            }
        }
        answer = min(answer, xr);
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc202_d", {
    algorithm: "按字典序构造。若以 a 开头的字符串数量不少于 K，就放 a；否则跳过这些字符串放 b，并减少 K。",
    complexity: "O(A + B)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    long long k;
    cin >> a >> b >> k;

    vector<vector<long long>> comb(a + b + 1, vector<long long>(a + b + 1, 0));
    for (int i = 0; i <= a + b; ++i) {
        comb[i][0] = comb[i][i] = 1;
        for (int j = 1; j < i; ++j) {
            comb[i][j] = min((long long)4e18, comb[i - 1][j - 1] + comb[i - 1][j]);
        }
    }

    string answer;
    while (a > 0 || b > 0) {
        if (a == 0) {
            answer.push_back('b');
            --b;
        } else if (b == 0) {
            answer.push_back('a');
            --a;
        } else {
            long long countAFirst = comb[a + b - 1][a - 1];
            if (k <= countAFirst) {
                answer.push_back('a');
                --a;
            } else {
                answer.push_back('b');
                --b;
                k -= countAFirst;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc204_d", {
    algorithm: "把菜分给两台烤箱。做子集和 DP，选择不超过总和一半且可达的最大时间，答案为 max(x,total-x)。",
    complexity: "O(N * sumT)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> t(n);
    int total = 0;
    for (int &x : t) {
        cin >> x;
        total += x;
    }

    vector<int> dp(total + 1, 0);
    dp[0] = 1;
    for (int x : t) {
        for (int s = total - x; s >= 0; --s) {
            if (dp[s]) dp[s + x] = 1;
        }
    }

    int answer = total;
    for (int s = 0; s <= total; ++s) {
        if (dp[s]) answer = min(answer, max(s, total - s));
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc205_d", {
    algorithm: "第 i 个给定数之前缺失的正整数数量为 A[i]-(i+1)。二分找到第一个缺失数量不少于 K 的位置，再从前一个位置推算答案。",
    complexity: "O(Q log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    while (q--) {
        long long k;
        cin >> k;
        int low = -1, high = n;
        while (high - low > 1) {
            int mid = (low + high) / 2;
            long long missing = a[mid] - (mid + 1);
            if (missing >= k) high = mid;
            else low = mid;
        }
        if (high == 0) {
            cout << k << '\\n';
        } else {
            long long previousValue = a[high - 1];
            long long previousMissing = previousValue - high;
            cout << previousValue + (k - previousMissing) << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc206_d", {
    algorithm: "要让序列回文，位置 i 和 n-1-i 的值最终必须相同。把这些值用并查集合并，每次成功合并代表需要一次改值。",
    complexity: "O(N alpha V)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size;
    DSU(int n) : parent(n), size(n, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    }
    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int maxValue = 0;
    for (int &x : a) {
        cin >> x;
        maxValue = max(maxValue, x);
    }

    DSU dsu(maxValue + 1);
    int answer = 0;
    for (int i = 0; i < n / 2; ++i) {
        if (dsu.unite(a[i], a[n - 1 - i])) ++answer;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc209_c", {
    algorithm: "按可选数量从小到大排序。第 i 个数已经有 i 个不同值被占用，因此有 c[i]-i 种选择，逐项相乘取模。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 1000000007LL;
    int n;
    cin >> n;
    vector<long long> c(n);
    for (long long &x : c) cin >> x;
    sort(c.begin(), c.end());

    long long answer = 1;
    for (int i = 0; i < n; ++i) {
        answer = answer * max(0LL, c[i] - i) % MOD;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc211_d", {
    algorithm: "BFS 求从 1 号点出发的最短距离，同时统计到每个点的最短路条数；遇到同层最短转移时累加方案数。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 1000000007LL;
    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }

    vector<int> dist(n, -1);
    vector<long long> ways(n, 0);
    queue<int> q;
    dist[0] = 0;
    ways[0] = 1;
    q.push(0);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : graph[v]) {
            if (dist[to] == -1) {
                dist[to] = dist[v] + 1;
                ways[to] = ways[v];
                q.push(to);
            } else if (dist[to] == dist[v] + 1) {
                ways[to] = (ways[to] + ways[v]) % MOD;
            }
        }
    }

    cout << ways[n - 1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc212_d", {
    algorithm: "维护全局偏移 add。插入 x 时存 x-add；整体加时只改 add；取最小值时弹出堆顶再加回 add。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    priority_queue<long long, vector<long long>, greater<long long>> heap;
    long long add = 0;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            long long x;
            cin >> x;
            heap.push(x - add);
        } else if (type == 2) {
            long long x;
            cin >> x;
            add += x;
        } else {
            cout << heap.top() + add << '\\n';
            heap.pop();
        }
    }
    return 0;
}
`
  }],
  ["AT_abc213_d", {
    algorithm: "把树的邻接表排序后做 DFS 欧拉序。进入节点输出一次，从子树返回父节点时再输出父节点。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> graph(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }
    for (auto &neighbors : graph) sort(neighbors.begin(), neighbors.end());

    vector<int> answer;
    vector<tuple<int, int, int>> st;
    st.push_back({0, -1, 0});
    answer.push_back(1);
    while (!st.empty()) {
        auto &[v, parent, index] = st.back();
        if (index == (int)graph[v].size()) {
            st.pop_back();
            if (parent != -1) answer.push_back(parent + 1);
            continue;
        }
        int to = graph[v][index++];
        if (to == parent) continue;
        answer.push_back(to + 1);
        st.push_back({to, v, 0});
    }

    for (int i = 0; i < (int)answer.size(); ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc215_d", {
    algorithm: "把所有 A_i 的质因子标记为禁用，再把这些质因子的倍数从 1..M 中筛掉，剩余数字与所有 A_i 都互质。",
    complexity: "O((maxA + M) log maxA)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> a(n);
    int maxA = 0;
    for (int &x : a) {
        cin >> x;
        maxA = max(maxA, x);
    }

    vector<int> badPrime(max(maxA, m) + 1, 0);
    for (int x : a) {
        int value = x;
        for (int p = 2; 1LL * p * p <= value; ++p) {
            if (value % p != 0) continue;
            badPrime[p] = 1;
            while (value % p == 0) value /= p;
        }
        if (value > 1) badPrime[value] = 1;
    }

    vector<int> ok(m + 1, 1);
    for (int p = 2; p < (int)badPrime.size(); ++p) {
        if (!badPrime[p]) continue;
        for (int multiple = p; multiple <= m; multiple += p) ok[multiple] = 0;
    }

    vector<int> answer;
    for (int x = 1; x <= m; ++x) {
        if (ok[x]) answer.push_back(x);
    }
    cout << answer.size() << '\\n';
    for (int x : answer) cout << x << '\\n';
    return 0;
}
`
  }],
  ["AT_abc216_d", {
    algorithm: "维护每个颜色当前位于哪些筒顶。若某颜色同时在两个筒顶，就移除这两个球并更新对应筒的新顶部。",
    complexity: "O(N + total balls)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> tubes(m);
    vector<int> pos(m, 0);
    for (int i = 0; i < m; ++i) {
        int k;
        cin >> k;
        tubes[i].resize(k);
        for (int &x : tubes[i]) {
            cin >> x;
            --x;
        }
    }

    vector<vector<int>> topColor(n);
    queue<int> ready;
    auto addTop = [&](int tube) {
        if (pos[tube] >= (int)tubes[tube].size()) return;
        int color = tubes[tube][pos[tube]];
        topColor[color].push_back(tube);
        if (topColor[color].size() == 2) ready.push(color);
    };

    for (int i = 0; i < m; ++i) addTop(i);
    int removed = 0;
    while (!ready.empty()) {
        int color = ready.front();
        ready.pop();
        if (topColor[color].size() < 2) continue;
        int a = topColor[color][0];
        int b = topColor[color][1];
        topColor[color].clear();
        ++pos[a];
        ++pos[b];
        removed += 2;
        addTop(a);
        addTop(b);
    }

    cout << (removed == 2 * n ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc217_e", {
    algorithm: "未排序插入的数放在队列中。执行排序操作时把队列全部倒入最小堆；取出时优先从堆取，否则从队列头取。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    queue<long long> fifo;
    priority_queue<long long, vector<long long>, greater<long long>> sorted;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            long long x;
            cin >> x;
            fifo.push(x);
        } else if (type == 2) {
            if (!sorted.empty()) {
                cout << sorted.top() << '\\n';
                sorted.pop();
            } else {
                cout << fifo.front() << '\\n';
                fifo.pop();
            }
        } else {
            while (!fifo.empty()) {
                sorted.push(fifo.front());
                fifo.pop();
            }
        }
    }
    return 0;
}
`
  }],
  ["AT_abc218_d", {
    algorithm: "按 x 坐标分组，枚举同一列中任意两个 y。之前出现过相同 y 对的列数，就是能与当前列组成的矩形数。",
    complexity: "O(sum column_size^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<int, vector<int>> ysByX;
    for (int i = 0; i < n; ++i) {
        int x, y;
        cin >> x >> y;
        ysByX[x].push_back(y);
    }

    map<pair<int, int>, long long> seenPair;
    long long answer = 0;
    for (auto &[x, ys] : ysByX) {
        sort(ys.begin(), ys.end());
        for (int i = 0; i < (int)ys.size(); ++i) {
            for (int j = i + 1; j < (int)ys.size(); ++j) {
                pair<int, int> key = {ys[i], ys[j]};
                answer += seenPair[key];
                ++seenPair[key];
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc218_e", {
    algorithm: "Kruskal 构造最小生成森林。形成环的正权边可以删除并贡献其权值，非正边删除不会降低成本目标。",
    complexity: "O(M log M)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size;
    DSU(int n) : parent(n), size(n, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    }
    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<tuple<long long, int, int>> edges;
    for (int i = 0; i < m; ++i) {
        int a, b;
        long long c;
        cin >> a >> b >> c;
        edges.push_back({c, a - 1, b - 1});
    }
    sort(edges.begin(), edges.end());

    DSU dsu(n);
    long long answer = 0;
    for (auto [c, a, b] : edges) {
        if (!dsu.unite(a, b) && c > 0) answer += c;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc221_d", {
    algorithm: "对每个玩家在线区间 [A,A+B) 做差分事件。按时间扫描，相邻事件时间差累加到当前在线人数对应答案。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<long long, long long> events;
    for (int i = 0; i < n; ++i) {
        long long a, b;
        cin >> a >> b;
        events[a] += 1;
        events[a + b] -= 1;
    }

    vector<long long> answer(n + 1, 0);
    long long prevTime = 0;
    long long active = 0;
    bool first = true;
    for (auto [time, delta] : events) {
        if (!first) answer[active] += time - prevTime;
        first = false;
        active += delta;
        prevTime = time;
    }

    for (int i = 1; i <= n; ++i) {
        if (i > 1) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc222_d", {
    algorithm: "dp[v] 表示当前位取 v 的方案数。每一层用前缀和优化非降约束，只保留 A_i..B_i 范围。",
    complexity: "O(NV)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353LL;
    const int V = 3000;
    int n;
    cin >> n;
    vector<int> a(n), b(n);
    for (int &x : a) cin >> x;
    for (int &x : b) cin >> x;

    vector<long long> dp(V + 1, 0);
    for (int v = a[0]; v <= b[0]; ++v) dp[v] = 1;
    for (int i = 1; i < n; ++i) {
        vector<long long> prefix(V + 1, 0), next(V + 1, 0);
        prefix[0] = dp[0];
        for (int v = 1; v <= V; ++v) prefix[v] = (prefix[v - 1] + dp[v]) % MOD;
        for (int v = a[i]; v <= b[i]; ++v) next[v] = prefix[v];
        dp.swap(next);
    }

    long long answer = 0;
    for (long long value : dp) answer = (answer + value) % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc223_d", {
    algorithm: "用最小堆维护当前入度为 0 的点，执行字典序最小拓扑排序。若无法输出所有点则有环。",
    complexity: "O((N + M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    vector<int> indegree(n, 0);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        ++indegree[b];
    }

    priority_queue<int, vector<int>, greater<int>> heap;
    for (int i = 0; i < n; ++i) {
        if (indegree[i] == 0) heap.push(i);
    }

    vector<int> order;
    while (!heap.empty()) {
        int v = heap.top();
        heap.pop();
        order.push_back(v);
        for (int to : graph[v]) {
            if (--indegree[to] == 0) heap.push(to);
        }
    }

    if ((int)order.size() != n) {
        cout << -1 << '\\n';
    } else {
        for (int i = 0; i < n; ++i) {
            if (i) cout << ' ';
            cout << order[i] + 1;
        }
        cout << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc226_d", {
    algorithm: "两点间方向向量除以 gcd 后归一化。题目要求有向方向，因此枚举所有有序点对并去重。",
    complexity: "O(N^2 log C)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<long long, long long>> p(n);
    for (auto &[x, y] : p) cin >> x >> y;

    set<pair<long long, long long>> directions;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (i == j) continue;
            long long dx = p[j].first - p[i].first;
            long long dy = p[j].second - p[i].second;
            long long g = gcd(llabs(dx), llabs(dy));
            directions.insert({dx / g, dy / g});
        }
    }

    cout << directions.size() << '\\n';
    return 0;
}
`
  }],
  ["AT_abc227_c", {
    algorithm: "枚举 A 和 B，满足 A<=B 且 A*B*B<=N。此时 C 可以取 B..floor(N/(A*B))。",
    complexity: "O(sqrt(N) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long answer = 0;
    for (long long a = 1; a * a * a <= n; ++a) {
        for (long long b = a; a * b * b <= n; ++b) {
            answer += n / (a * b) - b + 1;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc229_d", {
    algorithm: "滑动窗口维护窗口内点号数量不超过 K，窗口长度最大值就是答案。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    int k;
    cin >> s >> k;
    int dots = 0;
    int right = 0;
    int answer = 0;
    for (int left = 0; left < (int)s.size(); ++left) {
        while (right < (int)s.size() && dots + (s[right] == '.') <= k) {
            dots += s[right] == '.';
            ++right;
        }
        answer = max(answer, right - left);
        if (s[left] == '.') --dots;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc230_d", {
    algorithm: "按右端点排序。遇到尚未被当前打孔区间覆盖的墙，就在其右端点开始打一次，覆盖到 R+D-1。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long d;
    cin >> n >> d;
    vector<pair<long long, long long>> walls(n);
    for (auto &[r, l] : walls) cin >> l >> r;
    sort(walls.begin(), walls.end());

    long long coveredUntil = -(1LL << 60);
    int answer = 0;
    for (auto [r, l] : walls) {
        if (l <= coveredUntil) continue;
        ++answer;
        coveredUntil = r + d - 1;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc231_d", {
    algorithm: "每个点度数不能超过 2，并且图中不能有环。用并查集检测加边时是否连接了同一连通块。",
    complexity: "O((N + M) alpha N)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size;
    DSU(int n) : parent(n), size(n, 1) {
        iota(parent.begin(), parent.end(), 0);
    }
    int find(int x) {
        return parent[x] == x ? x : parent[x] = find(parent[x]);
    }
    bool unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return false;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    vector<int> degree(n, 0);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        ++degree[a];
        ++degree[b];
        if (degree[a] > 2 || degree[b] > 2 || !dsu.unite(a, b)) {
            cout << "No" << '\\n';
            return 0;
        }
    }

    cout << "Yes" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc233_d", {
    algorithm: "设前缀和为 s。以当前位置结尾、和为 K 的区间数量等于此前出现过的前缀和 s-K 的次数。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    map<long long, long long> count;
    count[0] = 1;
    long long prefix = 0;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        prefix += a;
        answer += count[prefix - k];
        ++count[prefix];
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc238_d", {
    algorithm: "若 x+y=S 且 x&y=A，则剩余无进位部分为 S-2A。需要非负，并且不能与 A 的 1 位重叠。",
    complexity: "O(T)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        long long a, s;
        cin >> a >> s;
        long long rest = s - 2 * a;
        cout << (rest >= 0 && (rest & a) == 0 ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc003_3", {
    algorithm: "选择最大的 k 个评分，并按从小到大的顺序依次取平均。较大的评分越晚参与平均，权重越高，因此排序后取后 k 个顺序计算。",
    complexity: "O(n log n)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<double> r(n);
    for (double &x : r) cin >> x;

    sort(r.begin(), r.end());
    double cur = 0.0;
    for (int i = n - k; i < n; ++i) {
        cur = (cur + r[i]) / 2.0;
    }

    cout << fixed << setprecision(12) << cur << '\\n';
    return 0;
}
`
  }],
  ["AT_abc007_3", {
    algorithm: "把迷宫格子看成无权图，从起点做 BFS，第一次到达终点时的层数就是最短步数。",
    complexity: "O(RC)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int r, c, sy, sx, gy, gx;
    cin >> r >> c >> sy >> sx >> gy >> gx;
    --sy; --sx; --gy; --gx;

    vector<string> grid(r);
    for (string &row : grid) cin >> row;

    vector<vector<int>> dist(r, vector<int>(c, -1));
    queue<pair<int, int>> q;
    dist[sy][sx] = 0;
    q.push({sy, sx});

    const int dy[4] = {1, -1, 0, 0};
    const int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front();
        q.pop();
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy[dir], nx = x + dx[dir];
            if (ny < 0 || ny >= r || nx < 0 || nx >= c) continue;
            if (grid[ny][nx] == '#' || dist[ny][nx] != -1) continue;
            dist[ny][nx] = dist[y][x] + 1;
            q.push({ny, nx});
        }
    }

    cout << dist[gy][gx] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc012_4", {
    algorithm: "用 Floyd-Warshall 求任意两点最短路。对每个点计算到所有点的最长最短路，取其中最小值。",
    complexity: "O(N^3)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    const long long INF = (1LL << 60);
    vector<vector<long long>> dist(n, vector<long long>(n, INF));
    for (int i = 0; i < n; ++i) dist[i][i] = 0;

    for (int i = 0; i < m; ++i) {
        int a, b;
        long long t;
        cin >> a >> b >> t;
        --a; --b;
        dist[a][b] = min(dist[a][b], t);
        dist[b][a] = min(dist[b][a], t);
    }

    for (int k = 0; k < n; ++k) {
        for (int i = 0; i < n; ++i) {
            for (int j = 0; j < n; ++j) {
                dist[i][j] = min(dist[i][j], dist[i][k] + dist[k][j]);
            }
        }
    }

    long long ans = INF;
    for (int i = 0; i < n; ++i) {
        long long worst = 0;
        for (int j = 0; j < n; ++j) worst = max(worst, dist[i][j]);
        ans = min(ans, worst);
    }

    cout << ans << '\\n';
    return 0;
}
`
  }],
  ["AT_abc099_c", {
    algorithm: "把 1、6 的幂、9 的幂作为硬币面额，做完全背包 DP，dp[x] 表示凑出 x 的最少硬币数。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> coins = {1};
    for (int x = 6; x <= n; x *= 6) coins.push_back(x);
    for (int x = 9; x <= n; x *= 9) coins.push_back(x);

    const int INF = 1e9;
    vector<int> dp(n + 1, INF);
    dp[0] = 0;
    for (int i = 1; i <= n; ++i) {
        for (int coin : coins) {
            if (coin <= i) dp[i] = min(dp[i], dp[i - coin] + 1);
        }
    }

    cout << dp[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_dp_c", {
    algorithm: "线性 DP。dp[i][j] 表示第 i 天选择活动 j 时，前 i 天的最大幸福值，转移时从前一天不同活动取最大值。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<array<long long, 3>> dp(n);
    for (int i = 0; i < n; ++i) {
        long long a, b, c;
        cin >> a >> b >> c;
        if (i == 0) {
            dp[i] = {a, b, c};
        } else {
            dp[i][0] = a + max(dp[i - 1][1], dp[i - 1][2]);
            dp[i][1] = b + max(dp[i - 1][0], dp[i - 1][2]);
            dp[i][2] = c + max(dp[i - 1][0], dp[i - 1][1]);
        }
    }

    cout << max({dp[n - 1][0], dp[n - 1][1], dp[n - 1][2]}) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc088_d", {
    algorithm: "先 BFS 求从左上到右下的最短路长度。若不可达输出 -1；否则答案为白格总数减去最短路径占用格子数。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> s(h);
    int white = 0;
    for (string &row : s) {
        cin >> row;
        for (char ch : row) if (ch == '.') ++white;
    }

    vector<vector<int>> dist(h, vector<int>(w, -1));
    queue<pair<int, int>> q;
    dist[0][0] = 0;
    q.push({0, 0});

    const int dy[4] = {1, -1, 0, 0};
    const int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front();
        q.pop();
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy[dir], nx = x + dx[dir];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
            if (s[ny][nx] == '#' || dist[ny][nx] != -1) continue;
            dist[ny][nx] = dist[y][x] + 1;
            q.push({ny, nx});
        }
    }

    if (dist[h - 1][w - 1] == -1) {
        cout << -1 << '\\n';
    } else {
        cout << white - (dist[h - 1][w - 1] + 1) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc103_d", {
    algorithm: "按区间右端点从小到大排序。每次遇到当前切点无法覆盖的区间，就在该区间右端点前切一刀，这是标准区间贪心。",
    complexity: "O(M log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<pair<int, int>> seg(m);
    for (auto &[b, a] : seg) {
        cin >> a >> b;
    }
    sort(seg.begin(), seg.end());

    int answer = 0;
    int cut = 0;
    for (auto [b, a] : seg) {
        if (a >= cut) {
            ++answer;
            cut = b;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc070_d", {
    algorithm: "树上从 K 出发做一次 DFS/Dijkstra 得到 dist[v]。树上 x 到 y 经由 K 的距离就是 dist[x] + dist[y]。",
    complexity: "O(N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, long long>>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        long long c;
        cin >> a >> b >> c;
        --a; --b;
        g[a].push_back({b, c});
        g[b].push_back({a, c});
    }

    int q, k;
    cin >> q >> k;
    --k;

    vector<long long> dist(n, -1);
    stack<int> st;
    dist[k] = 0;
    st.push(k);
    while (!st.empty()) {
        int v = st.top();
        st.pop();
        for (auto [to, cost] : g[v]) {
            if (dist[to] != -1) continue;
            dist[to] = dist[v] + cost;
            st.push(to);
        }
    }

    while (q--) {
        int x, y;
        cin >> x >> y;
        --x; --y;
    cout << dist[x] + dist[y] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc241_e", {
    algorithm: "糖果总数对 N 取模后只有 N 种状态。记录每个余数首次出现的步数和糖果总数，遇到循环后一次性跳过完整循环，再模拟剩余步数。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    vector<long long> seenStep(n, -1), seenCandy(n, 0);
    long long step = 0, candy = 0;
    while (step < k) {
        int r = candy % n;
        if (seenStep[r] != -1) {
            long long cycleSteps = step - seenStep[r];
            long long cycleCandy = candy - seenCandy[r];
            long long times = (k - step) / cycleSteps;
            candy += cycleCandy * times;
            step += cycleSteps * times;
            if (step == k) break;
        } else {
            seenStep[r] = step;
            seenCandy[r] = candy;
        }
        candy += a[candy % n];
        ++step;
    }

    cout << candy << '\\n';
    return 0;
}
`
  }],
  ["AT_abc242_d", {
    algorithm: "把 A/B/C 看成 0/1/2。若追溯 t 层到原串位置，左子节点字符加 1，右子节点字符加 2；当 t 很大时最多追溯到 k 的二进制长度即可。",
    complexity: "O(Q log K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    int q;
    cin >> q;
    while (q--) {
        long long t, k;
        cin >> t >> k;
        --k;
        long long add = 0;
        while (t > 0 && k > 0) {
            add += (k % 2 == 0 ? 1 : 2);
            k /= 2;
            --t;
        }
        add += t % 3;
        int base = s[k] - 'A';
        cout << char('A' + (base + add) % 3) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc245_d", {
    algorithm: "从最高次项开始做多项式除法。C 的最高未确定项只会由 A_N 与当前 B_j 贡献，因此可反向求出每个 B_j，并从 C 中减去贡献。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n + 1), c(n + m + 1), b(m + 1);
    for (long long &x : a) cin >> x;
    for (long long &x : c) cin >> x;

    for (int j = m; j >= 0; --j) {
        b[j] = c[n + j] / a[n];
        for (int i = 0; i <= n; ++i) {
            c[i + j] -= a[i] * b[j];
        }
    }

    for (int i = 0; i <= m; ++i) {
        if (i) cout << ' ';
        cout << b[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc248_c", {
    algorithm: "dp[i][s] 表示已经选 i 个数且总和为 s 的方案数，每次追加 1..M 的点数，最后统计总和不超过 K 的方案。",
    complexity: "O(NKM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    int n, m, k;
    cin >> n >> m >> k;
    vector<vector<long long>> dp(n + 1, vector<long long>(k + 1, 0));
    dp[0][0] = 1;
    for (int i = 0; i < n; ++i) {
        for (int sum = 0; sum <= k; ++sum) {
            if (!dp[i][sum]) continue;
            for (int x = 1; x <= m && sum + x <= k; ++x) {
                dp[i + 1][sum + x] = (dp[i + 1][sum + x] + dp[i][sum]) % MOD;
            }
        }
    }

    long long answer = 0;
    for (int sum = 0; sum <= k; ++sum) answer = (answer + dp[n][sum]) % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc248_d", {
    algorithm: "为每个数值保存它出现的位置有序表。查询 [L,R] 中 X 的出现次数时，在 X 的位置表中二分统计落在区间内的下标数。",
    complexity: "O((N + Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> pos(n + 1);
    for (int i = 1; i <= n; ++i) {
        int a;
        cin >> a;
        pos[a].push_back(i);
    }

    int q;
    cin >> q;
    while (q--) {
        int l, r, x;
        cin >> l >> r >> x;
        auto left = lower_bound(pos[x].begin(), pos[x].end(), l);
        auto right = upper_bound(pos[x].begin(), pos[x].end(), r);
        cout << right - left << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc249_d", {
    algorithm: "统计每个值出现次数。枚举 a 和 b，只要 a*b 在范围内，就把 cnt[a]*cnt[b]*cnt[a*b] 加入答案。",
    complexity: "O(V log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    const int MAXV = 200000;
    vector<long long> cnt(MAXV + 1, 0);
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        ++cnt[a];
    }

    long long answer = 0;
    for (int a = 1; a <= MAXV; ++a) {
        if (!cnt[a]) continue;
        for (int c = a; c <= MAXV; c += a) {
            int b = c / a;
            if (cnt[b] && cnt[c]) answer += cnt[a] * cnt[b] * cnt[c];
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc250_d", {
    algorithm: "先筛出质数。枚举较大的质数 q，统计满足 p<q 且 p*q^3<=N 的质数 p 个数。",
    complexity: "O(P log P)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    const int LIMIT = 1000000;
    vector<int> primes;
    vector<bool> isPrime(LIMIT + 1, true);
    isPrime[0] = isPrime[1] = false;
    for (int i = 2; i <= LIMIT; ++i) {
        if (!isPrime[i]) continue;
        primes.push_back(i);
        if ((long long)i * i <= LIMIT) {
            for (long long j = 1LL * i * i; j <= LIMIT; j += i) isPrime[j] = false;
        }
    }

    long long answer = 0;
    for (int qi = 0; qi < (int)primes.size(); ++qi) {
        long long q = primes[qi];
        long long q3 = q * q * q;
        if (q3 > n) break;
        long long maxP = n / q3;
        int bound = (int)min(maxP, q - 1);
        int count = upper_bound(primes.begin(), primes.begin() + qi, bound) - primes.begin();
        answer += count;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc252_d", {
    algorithm: "按数值统计出现次数。枚举中间值，左侧数量乘当前数量乘右侧数量，就是选出三个互不相同数值的方案数。",
    complexity: "O(N + V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    const int MAXV = 200000;
    vector<long long> cnt(MAXV + 1, 0);
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        ++cnt[a];
    }

    long long left = 0, right = n, answer = 0;
    for (int value = 1; value <= MAXV; ++value) {
        right -= cnt[value];
        answer += left * cnt[value] * right;
        left += cnt[value];
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc254_d", {
    algorithm: "把每个数除去平方因子得到平方自由核。i*j 是完全平方数当且仅当二者平方自由核相同，按核分组统计配对数。",
    complexity: "O(N sqrt N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<int, long long> count;
    for (int x = 1; x <= n; ++x) {
        int v = x;
        for (int p = 2; p * p <= v; ++p) {
            while (v % (p * p) == 0) v /= p * p;
        }
        ++count[v];
    }

    long long answer = 0;
    for (auto [_, c] : count) answer += c * c;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc255_d", {
    algorithm: "排序并求前缀和。对每个 X 二分分成小于 X 和不小于 X 的两部分，分别计算把它们变成 X 的总代价。",
    complexity: "O((N + Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<long long> a(n), prefix(n + 1, 0);
    for (long long &x : a) cin >> x;
    sort(a.begin(), a.end());
    for (int i = 0; i < n; ++i) prefix[i + 1] = prefix[i] + a[i];

    while (q--) {
        long long x;
        cin >> x;
        int idx = lower_bound(a.begin(), a.end(), x) - a.begin();
        long long left = x * idx - prefix[idx];
        long long right = (prefix[n] - prefix[idx]) - x * (n - idx);
        cout << left + right << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc254_e", {
    algorithm: "由于每个点度数不超过 3 且查询半径 k 不超过 3，每个查询只需从 x 做一层数很小的 BFS，访问距离不超过 k 的点并累加编号。",
    complexity: "O(Q * 3^K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }

    int q;
    cin >> q;
    vector<int> seen(n, 0), dist(n, 0);
    int stamp = 0;
    while (q--) {
        int x, k;
        cin >> x >> k;
        --x;
        ++stamp;
        queue<int> que;
        que.push(x);
        seen[x] = stamp;
        dist[x] = 0;
        long long sum = 0;
        while (!que.empty()) {
            int v = que.front();
            que.pop();
            sum += v + 1;
            if (dist[v] == k) continue;
            for (int to : graph[v]) {
                if (seen[to] == stamp) continue;
                seen[to] = stamp;
                dist[to] = dist[v] + 1;
                que.push(to);
            }
        }
        cout << sum << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc254_f", {
    algorithm: "矩形内任意值都可由左上角 A[h1]+B[w1] 与行列相邻差分的 gcd 共同决定。对 A、B 的相邻差分建 gcd 线段树，每个询问合并三部分 gcd。",
    complexity: "O((N + Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

struct GcdSegTree {
    int size = 1;
    vector<long long> data;
    GcdSegTree(const vector<long long> &values) {
        while (size < (int)values.size()) size <<= 1;
        data.assign(size * 2, 0);
        for (int i = 0; i < (int)values.size(); ++i) data[size + i] = values[i];
        for (int i = size - 1; i >= 1; --i) data[i] = gcd(data[i * 2], data[i * 2 + 1]);
    }
    long long query(int l, int r) const {
        long long result = 0;
        l += size;
        r += size;
        while (l < r) {
            if (l & 1) result = gcd(result, data[l++]);
            if (r & 1) result = gcd(result, data[--r]);
            l >>= 1;
            r >>= 1;
        }
        return result;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<long long> a(n + 1), b(n + 1), da(n + 1, 0), db(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> a[i];
    for (int i = 1; i <= n; ++i) cin >> b[i];
    for (int i = 1; i < n; ++i) {
        da[i] = llabs(a[i + 1] - a[i]);
        db[i] = llabs(b[i + 1] - b[i]);
    }
    GcdSegTree segA(da), segB(db);

    while (q--) {
        int h1, h2, w1, w2;
        cin >> h1 >> h2 >> w1 >> w2;
        long long answer = a[h1] + b[w1];
        answer = gcd(answer, segA.query(h1, h2));
        answer = gcd(answer, segB.query(w1, w2));
        cout << answer << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc256_e", {
    algorithm: "每个点只有一条出边。先用入度为 0 的点剥掉所有不在环上的点，剩下的点正好位于若干有向环中；每个环至少付出环上最小代价。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> x(n), indeg(n, 0);
    for (int i = 0; i < n; ++i) {
        cin >> x[i];
        --x[i];
        ++indeg[x[i]];
    }
    vector<long long> c(n);
    for (long long &v : c) cin >> v;

    queue<int> que;
    vector<int> removed(n, 0);
    for (int i = 0; i < n; ++i) {
        if (indeg[i] == 0) que.push(i);
    }
    while (!que.empty()) {
        int v = que.front();
        que.pop();
        removed[v] = 1;
        int to = x[v];
        if (--indeg[to] == 0) que.push(to);
    }

    long long answer = 0;
    vector<int> visited(n, 0);
    for (int i = 0; i < n; ++i) {
        if (removed[i] || visited[i]) continue;
        long long best = c[i];
        int v = i;
        do {
            visited[v] = 1;
            best = min(best, c[v]);
            v = x[v];
        } while (v != i);
        answer += best;
    }

    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc257_d", {
    algorithm: "二分最小训练次数 S。固定 S 后，从每个点尝试出发，若 P_i*S 能覆盖到另一点的曼哈顿距离就连边，检查是否存在一个起点可达所有点。",
    complexity: "O(N^3 log C)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> x(n), y(n), p(n);
    for (int i = 0; i < n; ++i) cin >> x[i] >> y[i] >> p[i];

    auto can = [&](long long s) {
        for (int start = 0; start < n; ++start) {
            vector<int> seen(n, 0);
            queue<int> que;
            seen[start] = 1;
            que.push(start);
            int count = 0;
            while (!que.empty()) {
                int v = que.front();
                que.pop();
                ++count;
                for (int to = 0; to < n; ++to) {
                    if (seen[to]) continue;
                    long long dist = llabs(x[v] - x[to]) + llabs(y[v] - y[to]);
                    if (dist <= p[v] * s) {
                        seen[to] = 1;
                        que.push(to);
                    }
                }
            }
            if (count == n) return true;
        }
        return false;
    };

    long long low = 0, high = 4000000000LL;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        if (can(mid)) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc257_e", {
    algorithm: "先用最低花费确定最大位数，再从高位到低位贪心尝试放 9 到 1 中最大的可行数字，保证剩余预算还能填满剩余位数。",
    complexity: "O(位数 * 9)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> cost(10);
    int minCost = numeric_limits<int>::max();
    for (int d = 1; d <= 9; ++d) {
        cin >> cost[d];
        minCost = min(minCost, cost[d]);
    }

    int length = n / minCost;
    int remaining = n;
    string answer;
    for (int pos = 0; pos < length; ++pos) {
        for (int d = 9; d >= 1; --d) {
            int rest = remaining - cost[d];
            if (rest < 0) continue;
            if (rest / minCost >= length - pos - 1) {
                answer.push_back(char('0' + d));
                remaining = rest;
                break;
            }
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc258_e", {
    algorithm: "对每个起点用总和整轮数和前缀和二分算出本次装入土豆数以及下一个起点。起点转移形成函数图，从 0 出发找环后回答第 K 次查询。",
    complexity: "O(N log N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    long long x;
    cin >> n >> q >> x;
    vector<long long> w(n), prefix(2 * n + 1, 0);
    long long total = 0;
    for (long long &v : w) {
        cin >> v;
        total += v;
    }
    for (int i = 0; i < 2 * n; ++i) prefix[i + 1] = prefix[i] + w[i % n];

    vector<long long> count(n);
    vector<int> nextStart(n);
    long long full = x / total;
    long long rest = x % total;
    for (int i = 0; i < n; ++i) {
        int extra = 0;
        if (rest > 0) {
            int j = lower_bound(prefix.begin(), prefix.end(), prefix[i] + rest) - prefix.begin();
            extra = j - i;
        }
        count[i] = full * n + extra;
        nextStart[i] = (i + count[i]) % n;
    }

    vector<int> seen(n, -1), order;
    int cur = 0;
    while (seen[cur] == -1) {
        seen[cur] = (int)order.size();
        order.push_back(cur);
        cur = nextStart[cur];
    }
    int cycleStart = seen[cur];
    int cycleLength = (int)order.size() - cycleStart;

    while (q--) {
        long long k;
        cin >> k;
        --k;
        int index;
        if (k < (long long)order.size()) {
            index = order[k];
        } else {
            k -= cycleStart;
            index = order[cycleStart + k % cycleLength];
        }
        cout << count[index] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc259_e", {
    algorithm: "统计每个质因子的最大指数及达到最大指数的个数。若某个数独占至少一个质因子的最大指数，则它对应一种必要 LCM；所有非必要数至多再贡献一种相同结果。",
    complexity: "O(输入质因子总数 log P)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, int>>> factors(n);
    map<int, pair<int, int>> best;
    for (int i = 0; i < n; ++i) {
        int m;
        cin >> m;
        factors[i].resize(m);
        for (auto &[p, e] : factors[i]) {
            cin >> p >> e;
            auto &entry = best[p];
            if (e > entry.first) entry = {e, 1};
            else if (e == entry.first) ++entry.second;
        }
    }

    int necessary = 0;
    for (int i = 0; i < n; ++i) {
        bool unique = false;
        for (auto [p, e] : factors[i]) {
            auto [mx, cnt] = best[p];
            if (e == mx && cnt == 1) unique = true;
        }
        if (unique) ++necessary;
    }
    cout << necessary + (necessary < n ? 1 : 0) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc260_d", {
    algorithm: "用有序 map 维护每堆当前顶牌。每张牌放到顶牌不小于它的最小牌堆上；若堆大小达到 K，则该堆所有牌答案为当前轮次。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> answer(n + 1, -1);
    vector<vector<int>> piles;
    map<int, int> topToPile;

    for (int turn = 1; turn <= n; ++turn) {
        int p;
        cin >> p;
        int pileIndex;
        auto it = topToPile.lower_bound(p);
        if (it == topToPile.end()) {
            pileIndex = (int)piles.size();
            piles.push_back({});
        } else {
            pileIndex = it->second;
            topToPile.erase(it);
        }
        piles[pileIndex].push_back(p);
        if ((int)piles[pileIndex].size() == k) {
            for (int card : piles[pileIndex]) answer[card] = turn;
        } else {
            topToPile[p] = pileIndex;
        }
    }

    for (int card = 1; card <= n; ++card) cout << answer[card] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc261_e", {
    algorithm: "把连续位运算看成对每一位的函数。分别维护输入位为 0 和 1 时经过所有已处理操作后的输出，每加入一次操作就合成函数并计算当前 C。",
    complexity: "O(N log C)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long c;
    cin >> n >> c;
    vector<int> zero(31, 0), one(31, 1);
    for (int i = 0; i < n; ++i) {
        int t;
        long long a;
        cin >> t >> a;
        for (int bit = 0; bit < 31; ++bit) {
            int b = (a >> bit) & 1LL;
            if (t == 1) {
                zero[bit] &= b;
                one[bit] &= b;
            } else if (t == 2) {
                zero[bit] |= b;
                one[bit] |= b;
            } else {
                zero[bit] ^= b;
                one[bit] ^= b;
            }
        }

        long long next = 0;
        for (int bit = 0; bit < 31; ++bit) {
            int current = (c >> bit) & 1LL;
            int value = current ? one[bit] : zero[bit];
            if (value) next |= 1LL << bit;
        }
        c = next;
        cout << c << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc262_d", {
    algorithm: "枚举选出的元素个数 m。对每个 m 做计数 DP，dp[j][r] 表示已选 j 个且和模 m 为 r 的方案数，累加 dp[m][0]。",
    complexity: "O(N^4)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &v : a) cin >> v;

    long long answer = 0;
    for (int m = 1; m <= n; ++m) {
        vector<vector<long long>> dp(m + 1, vector<long long>(m, 0));
        dp[0][0] = 1;
        for (int value : a) {
            int add = value % m;
            for (int chosen = m - 1; chosen >= 0; --chosen) {
                for (int r = 0; r < m; ++r) {
                    dp[chosen + 1][(r + add) % m] += dp[chosen][r];
                    dp[chosen + 1][(r + add) % m] %= MOD;
                }
            }
        }
        answer = (answer + dp[m][0]) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc262_e", {
    algorithm: "只需要考虑原图中度数为奇数的点数 odd。选出的 K 个点里奇度点数量为偶数时满足条件，用组合数枚举奇度点选择数量。",
    complexity: "O(N^2 + M)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<int> degree(n, 0);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        ++degree[u];
        ++degree[v];
    }
    int odd = 0;
    for (int d : degree) odd += d % 2;
    int even = n - odd;

    vector<vector<long long>> comb(n + 1, vector<long long>(n + 1, 0));
    for (int i = 0; i <= n; ++i) {
        comb[i][0] = comb[i][i] = 1;
        for (int j = 1; j < i; ++j) comb[i][j] = (comb[i - 1][j - 1] + comb[i - 1][j]) % MOD;
    }

    long long answer = 0;
    for (int takeOdd = 0; takeOdd <= k; takeOdd += 2) {
        int takeEven = k - takeOdd;
        if (takeOdd <= odd && takeEven <= even) {
            answer = (answer + comb[odd][takeOdd] * comb[even][takeEven]) % MOD;
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc263_e", {
    algorithm: "设 dp[i] 为从格 i 到终点的期望操作数。倒序转移时需要后续一段 dp 的和，用后缀和维护，并乘以 A_i 的模逆。",
    complexity: "O(N log MOD)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n - 1);
    for (int &v : a) cin >> v;

    vector<long long> dp(n, 0), suffix(n + 1, 0);
    for (int i = n - 2; i >= 0; --i) {
        long long sum = (suffix[i + 1] - suffix[i + a[i] + 1] + MOD) % MOD;
        dp[i] = (sum + a[i] + 1) % MOD * modPow(a[i], MOD - 2) % MOD;
        suffix[i] = (suffix[i + 1] + dp[i]) % MOD;
    }
    cout << dp[0] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc264_e", {
    algorithm: "删边问题逆序处理。先加入所有不会被删除的边，再反向逐条加回删除边；并查集维护每个连通块是否含发电站以及其中城市数量。",
    complexity: "O((N + M + E + Q) α(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size, cityCount, powered;
    long long current = 0;
    DSU(int n, int cityN) : parent(n), size(n, 1), cityCount(n, 0), powered(n, 0) {
        iota(parent.begin(), parent.end(), 0);
        for (int i = 0; i < cityN; ++i) cityCount[i] = 1;
        for (int i = cityN; i < n; ++i) powered[i] = 1;
    }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
    void unite(int a, int b) {
        a = find(a);
        b = find(b);
        if (a == b) return;
        long long before = (powered[a] ? cityCount[a] : 0) + (powered[b] ? cityCount[b] : 0);
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        cityCount[a] += cityCount[b];
        powered[a] = powered[a] || powered[b];
        long long after = powered[a] ? cityCount[a] : 0;
        current += after - before;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, e;
    cin >> n >> m >> e;
    vector<pair<int, int>> edges(e);
    for (auto &[u, v] : edges) {
        cin >> u >> v;
        --u; --v;
    }
    int q;
    cin >> q;
    vector<int> x(q), removed(e, 0);
    for (int i = 0; i < q; ++i) {
        cin >> x[i];
        --x[i];
        removed[x[i]] = 1;
    }

    DSU dsu(n + m, n);
    for (int i = 0; i < e; ++i) {
        if (!removed[i]) dsu.unite(edges[i].first, edges[i].second);
    }

    vector<long long> answer(q);
    for (int i = q - 1; i >= 0; --i) {
        answer[i] = dsu.current;
        dsu.unite(edges[x[i]].first, edges[x[i]].second);
    }
    for (long long v : answer) cout << v << '\\n';
    return 0;
}
`
  }],
  ["AT_abc265_d", {
    algorithm: "所有 A_i 为正数，前缀和严格递增。枚举起点前缀 s，检查 s+P、s+P+Q、s+P+Q+R 是否都在前缀和集合中。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long p, q, r;
    cin >> n >> p >> q >> r;
    vector<long long> prefix(n + 1, 0);
    set<long long> values;
    values.insert(0);
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        prefix[i + 1] = prefix[i] + a;
        values.insert(prefix[i + 1]);
    }
    for (long long s : prefix) {
        if (values.count(s + p) && values.count(s + p + q) && values.count(s + p + q + r)) {
            cout << "Yes" << '\\n';
            return 0;
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc265_e", {
    algorithm: "按步数做坐标 DP。每一步从当前可达坐标转移三种移动，若目标坐标是障碍则跳过，用 map 聚合相同坐标的方案数。",
    complexity: "O(N^3 log N)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> dx(3), dy(3);
    for (int i = 0; i < 3; ++i) cin >> dx[i] >> dy[i];
    set<pair<long long, long long>> blocked;
    for (int i = 0; i < m; ++i) {
        long long x, y;
        cin >> x >> y;
        blocked.insert({x, y});
    }

    map<pair<long long, long long>, long long> dp;
    dp[{0, 0}] = 1;
    for (int step = 0; step < n; ++step) {
        map<pair<long long, long long>, long long> next;
        for (auto [pos, ways] : dp) {
            for (int move = 0; move < 3; ++move) {
                pair<long long, long long> to = {pos.first + dx[move], pos.second + dy[move]};
                if (blocked.count(to)) continue;
                next[to] += ways;
                next[to] %= MOD;
            }
        }
        dp.swap(next);
    }

    long long answer = 0;
    for (auto [_, ways] : dp) answer = (answer + ways) % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc266_d", {
    algorithm: "时间最多到 1e5，位置只有 0 到 4。按时间推进 DP，每秒可停留或左右移动一格，到达有奖励的位置就加上奖励。",
    complexity: "O(T)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    const int MAXT = 100000;
    vector<array<long long, 5>> gain(MAXT + 1);
    int lastTime = 0;
    for (int i = 0; i < n; ++i) {
        int t, x;
        long long a;
        cin >> t >> x >> a;
        gain[t][x] += a;
        lastTime = max(lastTime, t);
    }

    const long long NEG = -4e18;
    array<long long, 5> dp;
    dp.fill(NEG);
    dp[0] = 0;
    for (int t = 1; t <= lastTime; ++t) {
        array<long long, 5> next;
        next.fill(NEG);
        for (int x = 0; x < 5; ++x) {
            for (int prev = max(0, x - 1); prev <= min(4, x + 1); ++prev) {
                next[x] = max(next[x], dp[prev]);
            }
            if (next[x] > NEG / 2) next[x] += gain[t][x];
        }
        dp = next;
    }

    cout << *max_element(dp.begin(), dp.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc266_e", {
    algorithm: "设当前期望最优值为 e。再掷一次骰子后会选择 max(e, 点数)，因此从后向前重复 n 次更新 e = average(max(e,1..6))。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    double expected = 0.0;
    for (int i = 0; i < n; ++i) {
        double next = 0.0;
        for (int face = 1; face <= 6; ++face) next += max(expected, (double)face);
        expected = next / 6.0;
    }
    cout << fixed << setprecision(12) << expected << '\\n';
    return 0;
}
`
  }],
  ["AT_abc267_e", {
    algorithm: "每个点当前删除代价是相邻未删点权值和。总是删除当前代价最小的点，用优先队列懒删除维护代价，答案是删除过程中出现过的最大代价。",
    complexity: "O((N + M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n), cost(n, 0);
    for (long long &v : a) cin >> v;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        graph[u].push_back(v);
        graph[v].push_back(u);
        cost[u] += a[v];
        cost[v] += a[u];
    }

    priority_queue<pair<long long, int>> pq;
    for (int i = 0; i < n; ++i) pq.push({-cost[i], i});
    vector<int> removed(n, 0);
    long long answer = 0;
    while (!pq.empty()) {
        auto [negCost, v] = pq.top();
        pq.pop();
        long long current = -negCost;
        if (removed[v] || current != cost[v]) continue;
        removed[v] = 1;
        answer = max(answer, current);
        for (int to : graph[v]) {
            if (removed[to]) continue;
            cost[to] -= a[v];
            pq.push({-cost[to], to});
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc270_d", {
    algorithm: "令 dp[i] 为当前玩家面对 i 个石子时最多能拿到的石子数。枚举本次拿走的数量 a，剩余 i-a 中对手最多拿 dp[i-a]，当前玩家得到 i-dp[i-a]。",
    complexity: "O(NK)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> a(k);
    for (int &v : a) cin >> v;
    vector<int> dp(n + 1, 0);
    for (int stones = 1; stones <= n; ++stones) {
        for (int take : a) {
            if (take <= stones) dp[stones] = max(dp[stones], stones - dp[stones - take]);
        }
    }
    cout << dp[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc270_e", {
    algorithm: "二分能完整吃掉的轮数 t，使 sum(min(A_i,t)) 不超过 K。先批量扣除这些轮数，再从左到右吃掉剩余的少量苹果。",
    complexity: "O(N log maxA)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &v : a) cin >> v;

    auto eaten = [&](long long rounds) {
        long long sum = 0;
        for (long long v : a) {
            sum += min(v, rounds);
            if (sum > k) return sum;
        }
        return sum;
    };

    long long low = 0, high = 4000000000000LL;
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        if (eaten(mid) <= k) low = mid;
        else high = mid;
    }

    long long used = 0;
    for (long long &v : a) {
        long long take = min(v, low);
        v -= take;
        used += take;
    }
    k -= used;
    for (long long &v : a) {
        if (k > 0 && v > 0) {
            --v;
            --k;
        }
    }

    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << a[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc271_c", {
    algorithm: "用 multiset 保存所有漫画卷。若当前目标卷存在就读掉它；否则卖掉两本当前最大卷换目标卷。无法凑出两本时结束。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    multiset<int> books;
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        books.insert(a);
    }

    int want = 1;
    while (!books.empty()) {
        auto it = books.find(want);
        if (it != books.end()) {
            books.erase(it);
            ++want;
            continue;
        }
        if ((int)books.size() < 2) break;
        auto last = prev(books.end());
        books.erase(last);
        last = prev(books.end());
        books.erase(last);
        ++want;
    }

    cout << want - 1 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc271_e", {
    algorithm: "按给定边序列做一次动态规划。dp[v] 表示当前处理到这里时到 v 的最短距离，遇到一条可用边 u->v 就尝试用 dp[u]+w 更新 dp[v]。",
    complexity: "O(M + K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<int> a(m), b(m);
    vector<long long> c(m);
    for (int i = 0; i < m; ++i) {
        cin >> a[i] >> b[i] >> c[i];
        --a[i]; --b[i];
    }
    const long long INF = 4e18;
    vector<long long> dp(n, INF);
    dp[0] = 0;
    for (int i = 0; i < k; ++i) {
        int e;
        cin >> e;
        --e;
        if (dp[a[e]] != INF) dp[b[e]] = min(dp[b[e]], dp[a[e]] + c[e]);
    }
    cout << (dp[n - 1] == INF ? -1 : dp[n - 1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc272_d", {
    algorithm: "预先枚举所有满足 dx^2+dy^2=M 的跳跃偏移，然后从 (0,0) 在 N×N 网格上 BFS，得到每个格子的最短步数。",
    complexity: "O(N^2 sqrt M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<pair<int, int>> moves;
    for (int dx = -n; dx <= n; ++dx) {
        for (int dy = -n; dy <= n; ++dy) {
            if (dx * dx + dy * dy == m) moves.push_back({dx, dy});
        }
    }

    vector<vector<int>> dist(n, vector<int>(n, -1));
    queue<pair<int, int>> que;
    dist[0][0] = 0;
    que.push({0, 0});
    while (!que.empty()) {
        auto [x, y] = que.front();
        que.pop();
        for (auto [dx, dy] : moves) {
            int nx = x + dx;
            int ny = y + dy;
            if (nx < 0 || nx >= n || ny < 0 || ny >= n || dist[nx][ny] != -1) continue;
            dist[nx][ny] = dist[x][y] + 1;
            que.push({nx, ny});
        }
    }

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (j) cout << ' ';
            cout << dist[i][j];
        }
        cout << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc273_d", {
    algorithm: "按行保存墙的列坐标、按列保存墙的行坐标。每次移动用二分找到该方向最近的墙，再把位置限制在墙前或边界内。",
    complexity: "O((N + Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, rs, cs;
    cin >> h >> w >> rs >> cs;
    int n;
    cin >> n;
    map<int, vector<int>> rowWalls, colWalls;
    for (int i = 0; i < n; ++i) {
        int r, c;
        cin >> r >> c;
        rowWalls[r].push_back(c);
        colWalls[c].push_back(r);
    }
    for (auto &[_, v] : rowWalls) sort(v.begin(), v.end());
    for (auto &[_, v] : colWalls) sort(v.begin(), v.end());

    int q;
    cin >> q;
    while (q--) {
        char d;
        int l;
        cin >> d >> l;
        if (d == 'L') {
            int limit = 1;
            auto itMap = rowWalls.find(rs);
            if (itMap != rowWalls.end()) {
                auto it = lower_bound(itMap->second.begin(), itMap->second.end(), cs);
                if (it != itMap->second.begin()) limit = *prev(it) + 1;
            }
            cs = max(limit, cs - l);
        } else if (d == 'R') {
            int limit = w;
            auto itMap = rowWalls.find(rs);
            if (itMap != rowWalls.end()) {
                auto it = upper_bound(itMap->second.begin(), itMap->second.end(), cs);
                if (it != itMap->second.end()) limit = *it - 1;
            }
            cs = min(limit, cs + l);
        } else if (d == 'U') {
            int limit = 1;
            auto itMap = colWalls.find(cs);
            if (itMap != colWalls.end()) {
                auto it = lower_bound(itMap->second.begin(), itMap->second.end(), rs);
                if (it != itMap->second.begin()) limit = *prev(it) + 1;
            }
            rs = max(limit, rs - l);
        } else {
            int limit = h;
            auto itMap = colWalls.find(cs);
            if (itMap != colWalls.end()) {
                auto it = upper_bound(itMap->second.begin(), itMap->second.end(), rs);
                if (it != itMap->second.end()) limit = *it - 1;
            }
            rs = min(limit, rs + l);
        }
        cout << rs << ' ' << cs << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc273_e", {
    algorithm: "把当前数组看成持久化链表节点。ADD 新建一个节点指向当前节点；DELETE 回到父节点；SAVE/LOAD 在笔记本中保存或恢复当前节点编号。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    vector<int> parent(1, 0), value(1, -1);
    map<int, int> notebook;
    int current = 0;
    for (int i = 0; i < q; ++i) {
        string op;
        cin >> op;
        if (op == "ADD") {
            int x;
            cin >> x;
            parent.push_back(current);
            value.push_back(x);
            current = (int)value.size() - 1;
        } else if (op == "DELETE") {
            current = parent[current];
        } else if (op == "SAVE") {
            int y;
            cin >> y;
            notebook[y] = current;
        } else {
            int z;
            cin >> z;
            current = notebook.count(z) ? notebook[z] : 0;
        }
        if (i) cout << ' ';
        cout << value[current];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc274_d", {
    algorithm: "第一段移动固定朝 +x。之后移动方向在 x/y 轴间交替，每段可取正负，用集合分别维护 x 轴和 y 轴可达坐标。",
    complexity: "O(N * 可达坐标数)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, x, y;
    cin >> n >> x >> y;
    vector<int> a(n);
    for (int &v : a) cin >> v;

    set<int> xs, ys;
    xs.insert(a[0]);
    ys.insert(0);
    for (int i = 1; i < n; ++i) {
        set<int> next;
        if (i % 2 == 0) {
            for (int pos : xs) {
                next.insert(pos + a[i]);
                next.insert(pos - a[i]);
            }
            xs.swap(next);
        } else {
            for (int pos : ys) {
                next.insert(pos + a[i]);
                next.insert(pos - a[i]);
            }
            ys.swap(next);
        }
    }

    cout << (xs.count(x) && ys.count(y) ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc275_c", {
    algorithm: "枚举黑点构成的一条有向边，将边向量旋转 90 度得到另外两个顶点。若四点都是黑点则得到一个正方形，最后除以 4 去重。",
    complexity: "O(81^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<string> s(9);
    for (string &row : s) cin >> row;
    vector<pair<int, int>> points;
    for (int i = 0; i < 9; ++i) {
        for (int j = 0; j < 9; ++j) {
            if (s[i][j] == '#') points.push_back({i, j});
        }
    }

    int count = 0;
    for (auto [x1, y1] : points) {
        for (auto [x2, y2] : points) {
            if (x1 == x2 && y1 == y2) continue;
            int dx = x2 - x1;
            int dy = y2 - y1;
            int x3 = x1 - dy, y3 = y1 + dx;
            int x4 = x2 - dy, y4 = y2 + dx;
            if (0 <= x3 && x3 < 9 && 0 <= y3 && y3 < 9 &&
                0 <= x4 && x4 < 9 && 0 <= y4 && y4 < 9 &&
                s[x3][y3] == '#' && s[x4][y4] == '#') {
                ++count;
            }
        }
    }
    cout << count / 4 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc275_e", {
    algorithm: "做 K 步概率 DP。若已在终点 N，则保持在 N；否则按骰子移动，超过 N 时按规则反弹到 2N-next。",
    complexity: "O(KNM)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    long long invM = modPow(m, MOD - 2);
    vector<long long> dp(n + 1, 0);
    dp[0] = 1;
    for (int step = 0; step < k; ++step) {
        vector<long long> next(n + 1, 0);
        next[n] = dp[n];
        for (int pos = 0; pos < n; ++pos) {
            if (!dp[pos]) continue;
            for (int roll = 1; roll <= m; ++roll) {
                int to = pos + roll;
                if (to > n) to = 2 * n - to;
                next[to] = (next[to] + dp[pos] * invM) % MOD;
            }
        }
        dp.swap(next);
    }
    cout << dp[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc276_e", {
    algorithm: "从起点 S 的每个相邻空格作为不同颜色同时扩展，禁止回到 S。如果某次扩展遇到其他颜色访问过的格子，说明存在从 S 出发再回到 S 的环。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    int sx = -1, sy = -1;
    for (int i = 0; i < h; ++i) {
        cin >> grid[i];
        for (int j = 0; j < w; ++j) {
            if (grid[i][j] == 'S') {
                sx = i;
                sy = j;
            }
        }
    }

    vector<vector<int>> color(h, vector<int>(w, -1));
    queue<pair<int, int>> que;
    int dx[4] = {1, -1, 0, 0};
    int dy[4] = {0, 0, 1, -1};
    int id = 0;
    for (int dir = 0; dir < 4; ++dir) {
        int nx = sx + dx[dir], ny = sy + dy[dir];
        if (nx < 0 || nx >= h || ny < 0 || ny >= w || grid[nx][ny] == '#') continue;
        color[nx][ny] = id++;
        que.push({nx, ny});
    }

    while (!que.empty()) {
        auto [x, y] = que.front();
        que.pop();
        for (int dir = 0; dir < 4; ++dir) {
            int nx = x + dx[dir], ny = y + dy[dir];
            if (nx < 0 || nx >= h || ny < 0 || ny >= w || grid[nx][ny] == '#') continue;
            if (nx == sx && ny == sy) continue;
            if (color[nx][ny] == -1) {
                color[nx][ny] = color[x][y];
                que.push({nx, ny});
            } else if (color[nx][ny] != color[x][y]) {
                cout << "Yes" << '\\n';
                return 0;
            }
        }
    }

    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc277_d", {
    algorithm: "同数值卡牌可一起保留，相邻数值以及 0 与 M-1 可以连成一组。求环上连续组的最大权值，总和减去它就是最小丢弃和。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long m;
    cin >> n >> m;
    map<long long, long long> sumByValue;
    long long total = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        sumByValue[a] += a;
        total += a;
    }

    vector<pair<long long, long long>> values(sumByValue.begin(), sumByValue.end());
    vector<long long> groups;
    long long current = values[0].second;
    for (int i = 1; i < (int)values.size(); ++i) {
        if (values[i].first == values[i - 1].first + 1) current += values[i].second;
        else {
            groups.push_back(current);
            current = values[i].second;
        }
    }
    groups.push_back(current);
    if (values.size() >= 2 && values.front().first == 0 && values.back().first == m - 1 && groups.size() >= 2) {
        groups[0] += groups.back();
        groups.pop_back();
    }

    long long keep = 0;
    for (long long v : groups) keep = max(keep, v);
    cout << total - keep << '\\n';
    return 0;
}
`
  }],
  ["AT_abc278_e", {
    algorithm: "对每种颜色建立二维前缀和。枚举每个 h×w 子矩形，统计有多少颜色的总出现次数大于该子矩形内出现次数。",
    complexity: "O(NHW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, n, subH, subW;
    cin >> h >> w >> n >> subH >> subW;
    vector<vector<int>> a(h, vector<int>(w));
    vector<int> total(n + 1, 0);
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            cin >> a[i][j];
            ++total[a[i][j]];
        }
    }

    vector<vector<vector<int>>> pref(n + 1, vector<vector<int>>(h + 1, vector<int>(w + 1, 0)));
    for (int color = 1; color <= n; ++color) {
        for (int i = 0; i < h; ++i) {
            for (int j = 0; j < w; ++j) {
                pref[color][i + 1][j + 1] = pref[color][i + 1][j] + pref[color][i][j + 1] - pref[color][i][j] + (a[i][j] == color);
            }
        }
    }

    for (int top = 0; top + subH <= h; ++top) {
        for (int left = 0; left + subW <= w; ++left) {
            int bottom = top + subH;
            int right = left + subW;
            int answer = 0;
            for (int color = 1; color <= n; ++color) {
                int inside = pref[color][bottom][right] - pref[color][top][right] - pref[color][bottom][left] + pref[color][top][left];
                if (total[color] > inside) ++answer;
            }
            if (left) cout << ' ';
            cout << answer;
        }
        cout << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc279_d", {
    algorithm: "目标函数 B*x + A/sqrt(x+1) 对整数 x 呈凸形。二分查找满足 f(x) <= f(x+1) 的最小位置，并在附近取最小值。",
    complexity: "O(log C)",
    code: `${CPP_INCLUDES}
using namespace std;

long double value(long double a, long double b, long long x) {
    return b * x + a / sqrt((long double)x + 1.0L);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long double a, b;
    cin >> a >> b;
    long long low = 0, high = 4000000000000000000LL / 4;
    while (low + 3 < high) {
        long long mid = (low + high) / 2;
        if (value(a, b, mid) <= value(a, b, mid + 1)) high = mid + 1;
        else low = mid;
    }
    long double answer = value(a, b, low);
    for (long long x = low; x <= high; ++x) answer = min(answer, value(a, b, x));
    cout << fixed << setprecision(12) << (double)answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc280_e", {
    algorithm: "设 dp[i] 为打掉 i 点 HP 的期望攻击次数。一次攻击后以两种概率转移到 i-1 或 i-2，因此 dp[i]=1+(1-p)dp[i-1]+p dp[i-2]。",
    complexity: "O(N log MOD)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long p;
    cin >> n >> p;
    long long inv100 = modPow(100, MOD - 2);
    long long critical = p * inv100 % MOD;
    long long normal = (100 - p) * inv100 % MOD;
    vector<long long> dp(n + 1, 0);
    for (int hp = 1; hp <= n; ++hp) {
        dp[hp] = (1 + normal * dp[hp - 1]) % MOD;
        if (hp >= 2) dp[hp] = (dp[hp] + critical * dp[hp - 2]) % MOD;
    }
    cout << dp[n] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc259_d", {
    algorithm: "圆周相交或相切时可互相移动，用并查集连接所有相交圆。起点和终点分别落在哪些圆周上，若任意起点圆与终点圆连通则可达。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

long long sq(long long x) { return x * x; }

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long sx, sy, tx, ty;
    cin >> sx >> sy >> tx >> ty;
    vector<long long> x(n), y(n), r(n);
    for (int i = 0; i < n; ++i) cin >> x[i] >> y[i] >> r[i];

    DSU dsu(n);
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            long long d2 = sq(x[i] - x[j]) + sq(y[i] - y[j]);
            long long low = sq(r[i] - r[j]);
            long long high = sq(r[i] + r[j]);
            if (low <= d2 && d2 <= high) dsu.unite(i, j);
        }
    }

    vector<int> starts, goals;
    for (int i = 0; i < n; ++i) {
        if (sq(sx - x[i]) + sq(sy - y[i]) == sq(r[i])) starts.push_back(i);
        if (sq(tx - x[i]) + sq(ty - y[i]) == sq(r[i])) goals.push_back(i);
    }
    for (int a : starts) {
        for (int b : goals) {
            if (dsu.find(a) == dsu.find(b)) {
                cout << "Yes" << '\\n';
                return 0;
            }
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc261_d", {
    algorithm: "dp[j] 表示当前连续正面次数为 j 时的最大收益。掷正面转到 j+1 并加硬币和奖励，掷反面转到 0。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> x(n + 1), bonus(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> x[i];
    for (int i = 0; i < m; ++i) {
        int c;
        long long y;
        cin >> c >> y;
        bonus[c] = y;
    }

    const long long NEG = -4e18;
    vector<long long> dp(n + 1, NEG);
    dp[0] = 0;
    for (int i = 1; i <= n; ++i) {
        vector<long long> next(n + 1, NEG);
        for (int j = 0; j < i; ++j) {
            if (dp[j] == NEG) continue;
            next[0] = max(next[0], dp[j]);
            next[j + 1] = max(next[j + 1], dp[j] + x[i] + bonus[j + 1]);
        }
        dp.swap(next);
    }

    cout << *max_element(dp.begin(), dp.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc263_d", {
    algorithm: "预处理把前 i 个数全部变成 L 的最小代价，以及把后缀全部变成 R 的最小代价。枚举左右分界点合并两个代价。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long l, r;
    cin >> n >> l >> r;
    vector<long long> a(n), left(n + 1, 0), right(n + 1, 0);
    for (long long &x : a) cin >> x;
    for (int i = 0; i < n; ++i) {
        left[i + 1] = min(left[i] + a[i], l * (i + 1));
    }
    for (int i = n - 1; i >= 0; --i) {
        right[i] = min(right[i + 1] + a[i], r * (n - i));
    }

    long long answer = numeric_limits<long long>::max();
    for (int i = 0; i <= n; ++i) answer = min(answer, left[i] + right[i]);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc264_c", {
    algorithm: "H1、W1 很小，枚举保留的行集合和列集合，按顺序抽出的矩阵若等于 B 就输出 Yes。",
    complexity: "O(2^H 2^W HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h1, w1;
    cin >> h1 >> w1;
    vector<vector<int>> a(h1, vector<int>(w1));
    for (auto &row : a) for (int &x : row) cin >> x;
    int h2, w2;
    cin >> h2 >> w2;
    vector<vector<int>> b(h2, vector<int>(w2));
    for (auto &row : b) for (int &x : row) cin >> x;

    for (int rm = 0; rm < (1 << h1); ++rm) {
        if (__builtin_popcount((unsigned)rm) != h2) continue;
        for (int cm = 0; cm < (1 << w1); ++cm) {
            if (__builtin_popcount((unsigned)cm) != w2) continue;
            bool ok = true;
            int bi = 0;
            for (int i = 0; i < h1; ++i) if (rm >> i & 1) {
                int bj = 0;
                for (int j = 0; j < w1; ++j) if (cm >> j & 1) {
                    if (a[i][j] != b[bi][bj]) ok = false;
                    ++bj;
                }
                ++bi;
            }
            if (ok) {
                cout << "Yes" << '\\n';
                return 0;
            }
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc266_c", {
    algorithm: "按给定顺序检查四个连续三点的叉积。凸四边形要求所有转向方向一致且没有 180 度退化。",
    complexity: "O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

long long cross(pair<long long, long long> a, pair<long long, long long> b, pair<long long, long long> c) {
    long long x1 = b.first - a.first;
    long long y1 = b.second - a.second;
    long long x2 = c.first - b.first;
    long long y2 = c.second - b.second;
    return x1 * y2 - y1 * x2;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<pair<long long, long long>> p(4);
    for (auto &[x, y] : p) cin >> x >> y;
    bool positive = true, negative = true;
    for (int i = 0; i < 4; ++i) {
        long long value = cross(p[i], p[(i + 1) % 4], p[(i + 2) % 4]);
        positive = positive && value > 0;
        negative = negative && value < 0;
    }
    cout << (positive || negative ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc267_d", {
    algorithm: "dp[j] 表示已经选了 j 个数时的最大得分。枚举 A_i 时倒序转移，若它作为第 j 个被选中的数，贡献为 j*A_i。",
    complexity: "O(NM)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    const long long NEG = -4e18;
    vector<long long> dp(m + 1, NEG);
    dp[0] = 0;
    for (long long x : a) {
        for (int j = m; j >= 1; --j) {
            if (dp[j - 1] != NEG) dp[j] = max(dp[j], dp[j - 1] + x * j);
        }
    }
    cout << dp[m] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc271_d", {
    algorithm: "背包 DP 记录前 i 张卡能否凑出和 s，并保存从 H/T 哪一面转移而来。若能凑出目标 S，再反向恢复方案。",
    complexity: "O(NS)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, s;
    cin >> n >> s;
    vector<int> a(n), b(n);
    for (int i = 0; i < n; ++i) cin >> a[i] >> b[i];
    vector<vector<char>> prev(n + 1, vector<char>(s + 1, 0));
    vector<vector<int>> ok(n + 1, vector<int>(s + 1, 0));
    ok[0][0] = 1;
    for (int i = 0; i < n; ++i) {
        for (int sum = 0; sum <= s; ++sum) {
            if (!ok[i][sum]) continue;
            if (sum + a[i] <= s && !ok[i + 1][sum + a[i]]) {
                ok[i + 1][sum + a[i]] = 1;
                prev[i + 1][sum + a[i]] = 'H';
            }
            if (sum + b[i] <= s && !ok[i + 1][sum + b[i]]) {
                ok[i + 1][sum + b[i]] = 1;
                prev[i + 1][sum + b[i]] = 'T';
            }
        }
    }
    if (!ok[n][s]) {
        cout << "No" << '\\n';
        return 0;
    }

    string answer;
    int cur = s;
    for (int i = n; i >= 1; --i) {
        char ch = prev[i][cur];
        answer.push_back(ch);
        cur -= (ch == 'H' ? a[i - 1] : b[i - 1]);
    }
    reverse(answer.begin(), answer.end());
    cout << "Yes" << '\\n' << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc276_d", {
    algorithm: "每个数只能除以 2 或 3。先去掉所有 2 和 3 的因子，剩余部分必须相同；然后把所有 2/3 指数降到全体最小值，操作数为指数差之和。",
    complexity: "O(N log A)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> c2(n), c3(n);
    vector<long long> rest(n);
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        while (a % 2 == 0) {
            ++c2[i];
            a /= 2;
        }
        while (a % 3 == 0) {
            ++c3[i];
            a /= 3;
        }
        rest[i] = a;
    }
    for (int i = 1; i < n; ++i) {
        if (rest[i] != rest[0]) {
            cout << -1 << '\\n';
            return 0;
        }
    }
    int min2 = *min_element(c2.begin(), c2.end());
    int min3 = *min_element(c3.begin(), c3.end());
    int answer = 0;
    for (int i = 0; i < n; ++i) answer += c2[i] - min2 + c3[i] - min3;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc278_d", {
    algorithm: "维护最近一次全体赋值 base，以及之后发生过单点加法的增量表。查询值就是 base+delta[i]；全体赋值时清空增量表。",
    complexity: "O(Q log Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n + 1);
    for (int i = 1; i <= n; ++i) cin >> a[i];
    long long base = 0;
    bool hasBase = false;
    map<int, long long> delta;

    int q;
    cin >> q;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            cin >> base;
            hasBase = true;
            delta.clear();
        } else if (type == 2) {
            int i;
            long long x;
            cin >> i >> x;
            if (hasBase) delta[i] += x;
            else a[i] += x;
        } else {
            int i;
            cin >> i;
            cout << (hasBase ? base + delta[i] : a[i]) << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc280_d", {
    algorithm: "分解 K。对每个质因子 p^e，二分最小 n 使得 n! 中 p 的指数不少于 e；答案是所有质因子的这个最小 n 的最大值。",
    complexity: "O(sqrt K log K)",
    code: `${CPP_INCLUDES}
using namespace std;

long long countFactor(long long n, long long p) {
    long long count = 0;
    while (n) {
        n /= p;
        count += n;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long k;
    cin >> k;
    long long answer = 1;
    for (long long p = 2; p * p <= k; ++p) {
        if (k % p != 0) continue;
        int exponent = 0;
        while (k % p == 0) {
            k /= p;
            ++exponent;
        }
        long long low = 1, high = p * exponent;
        while (low < high) {
            long long mid = (low + high) / 2;
            if (countFactor(mid, p) >= exponent) high = mid;
            else low = mid + 1;
        }
        answer = max(answer, low);
    }
    if (k > 1) answer = max(answer, k);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc281_d", {
    algorithm: "dp[i][r] 表示已选 i 个数且模 D 为 r 的最大和。枚举每个数时倒序转移，最后取 dp[K][0]。",
    complexity: "O(NKD)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k, d;
    cin >> n >> k >> d;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    const long long NEG = -4e18;
    vector<vector<long long>> dp(k + 1, vector<long long>(d, NEG));
    dp[0][0] = 0;
    for (long long x : a) {
        for (int used = k - 1; used >= 0; --used) {
            for (int r = 0; r < d; ++r) {
                if (dp[used][r] == NEG) continue;
                int nr = (r + x) % d;
                dp[used + 1][nr] = max(dp[used + 1][nr], dp[used][r] + x);
            }
        }
    }
    cout << (dp[k][0] < 0 ? -1 : dp[k][0]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc285_d", {
    algorithm: "用户名变更形成有向图。若出现有向环，则环上的每个人都无法先让出名字；否则按拓扑顺序可以完成。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<string, int> id;
    vector<pair<int, int>> edges;
    auto get = [&](const string &s) -> int {
        auto it = id.find(s);
        if (it != id.end()) return it->second;
        int value = id.size();
        id[s] = value;
        return value;
    };
    for (int i = 0; i < n; ++i) {
        string s, t;
        cin >> s >> t;
        edges.push_back({get(s), get(t)});
    }

    int v = id.size();
    vector<vector<int>> g(v);
    vector<int> indeg(v, 0);
    for (auto [a, b] : edges) {
        g[a].push_back(b);
        ++indeg[b];
    }

    queue<int> q;
    for (int i = 0; i < v; ++i) if (indeg[i] == 0) q.push(i);
    int seen = 0;
    while (!q.empty()) {
        int cur = q.front();
        q.pop();
        ++seen;
        for (int to : g[cur]) if (--indeg[to] == 0) q.push(to);
    }
    cout << (seen == v ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc281_e", {
    algorithm: "滑动窗口维护两个 multiset：small 保存窗口内最小的 K 个数并维护其和，large 保存其余数。每次窗口移动后重平衡两个集合。",
    complexity: "O(N log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;

    multiset<long long> small, large;
    long long sumSmall = 0;

    auto rebalance = [&]() {
        while ((int)small.size() < k && !large.empty()) {
            auto it = large.begin();
            sumSmall += *it;
            small.insert(*it);
            large.erase(it);
        }
        while ((int)small.size() > k) {
            auto it = prev(small.end());
            sumSmall -= *it;
            large.insert(*it);
            small.erase(it);
        }
        while (!small.empty() && !large.empty() && *prev(small.end()) > *large.begin()) {
            auto itS = prev(small.end());
            auto itL = large.begin();
            long long x = *itS, y = *itL;
            sumSmall += y - x;
            small.erase(itS);
            large.erase(itL);
            small.insert(y);
            large.insert(x);
        }
    };

    auto add = [&](long long x) {
        if (!small.empty() && x <= *prev(small.end())) {
            small.insert(x);
            sumSmall += x;
        } else {
            large.insert(x);
        }
        rebalance();
    };

    auto remove = [&](long long x) {
        auto it = small.find(x);
        if (it != small.end()) {
            sumSmall -= x;
            small.erase(it);
        } else {
            it = large.find(x);
            large.erase(it);
        }
        rebalance();
    };

    for (int i = 0; i < m; ++i) add(a[i]);
    cout << sumSmall;
    for (int right = m; right < n; ++right) {
        remove(a[right - m]);
        add(a[right]);
        cout << ' ' << sumSmall;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc282_d", {
    algorithm: "逐连通块二分染色。若某块不是二分图则答案为 0；否则可加边数为全体未连边点对减去同色点对，按块累计。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        graph[u].push_back(v);
        graph[v].push_back(u);
    }

    vector<int> color(n, -1);
    long long sameColorPairs = 0;
    for (int s = 0; s < n; ++s) {
        if (color[s] != -1) continue;
        queue<int> que;
        que.push(s);
        color[s] = 0;
        long long count[2] = {1, 0};
        while (!que.empty()) {
            int v = que.front();
            que.pop();
            for (int to : graph[v]) {
                if (color[to] == -1) {
                    color[to] = color[v] ^ 1;
                    ++count[color[to]];
                    que.push(to);
                } else if (color[to] == color[v]) {
                    cout << 0 << '\\n';
                    return 0;
                }
            }
        }
        sameColorPairs += count[0] * (count[0] - 1) / 2 + count[1] * (count[1] - 1) / 2;
    }

    long long totalPairs = 1LL * n * (n - 1) / 2;
    cout << totalPairs - m - sameColorPairs << '\\n';
    return 0;
}
`
  }],
  ["AT_abc282_e", {
    algorithm: "两点 i,j 的边权为 A_i^A_j + A_j^A_i mod M。建完全图后跑最大生成树，得到最大总得分。",
    complexity: "O(N^2 log N)",
    code: `${CPP_INCLUDES}
using namespace std;

long long modPow(long long a, long long e, long long mod) {
    long long result = 1 % mod;
    a %= mod;
    while (e > 0) {
        if (e & 1) result = result * a % mod;
        a = a * a % mod;
        e >>= 1;
    }
    return result;
}

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    vector<tuple<long long, int, int>> edges;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            long long w = (modPow(a[i], a[j], m) + modPow(a[j], a[i], m)) % m;
            edges.push_back({w, i, j});
        }
    }
    sort(edges.rbegin(), edges.rend());
    DSU dsu(n);
    long long answer = 0;
    for (auto [w, u, v] : edges) {
        if (dsu.unite(u, v)) answer += w;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc283_e", {
    algorithm: "每行是否翻转只影响相邻三行。枚举行 i-1 与 i 的翻转状态，转移选择 i+1 的翻转状态，并检查第 i 行是否所有格子都有同值邻居。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<vector<int>> a(h, vector<int>(w));
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) cin >> a[i][j];
    }

    auto value = [&](int row, int col, int flip) {
        return a[row][col] ^ flip;
    };

    auto okRow = [&](int row, int prevFlip, int curFlip, int nextFlip) {
        for (int col = 0; col < w; ++col) {
            int v = value(row, col, curFlip);
            bool good = false;
            if (col > 0 && value(row, col - 1, curFlip) == v) good = true;
            if (col + 1 < w && value(row, col + 1, curFlip) == v) good = true;
            if (row > 0 && value(row - 1, col, prevFlip) == v) good = true;
            if (row + 1 < h && value(row + 1, col, nextFlip) == v) good = true;
            if (!good) return false;
        }
        return true;
    };

    const int INF = 1e9;
    int dp[2][2];
    for (auto &row : dp) for (int &x : row) x = INF;
    for (int f0 = 0; f0 < 2; ++f0) {
        for (int f1 = 0; f1 < 2; ++f1) {
            if (h == 1 || okRow(0, 0, f0, f1)) dp[f0][f1] = f0 + (h > 1 ? f1 : 0);
        }
    }
    if (h == 1) {
        int ans = min(dp[0][0], dp[1][0]);
        cout << (ans >= INF ? -1 : ans) << '\\n';
        return 0;
    }

    for (int row = 1; row + 1 < h; ++row) {
        int nextDp[2][2];
        for (auto &arr : nextDp) for (int &x : arr) x = INF;
        for (int prev = 0; prev < 2; ++prev) {
            for (int cur = 0; cur < 2; ++cur) {
                if (dp[prev][cur] >= INF) continue;
                for (int nxt = 0; nxt < 2; ++nxt) {
                    if (okRow(row, prev, cur, nxt)) {
                        nextDp[cur][nxt] = min(nextDp[cur][nxt], dp[prev][cur] + nxt);
                    }
                }
            }
        }
        for (int i = 0; i < 2; ++i) for (int j = 0; j < 2; ++j) dp[i][j] = nextDp[i][j];
    }

    int answer = INF;
    for (int prev = 0; prev < 2; ++prev) {
        for (int cur = 0; cur < 2; ++cur) {
            if (okRow(h - 1, prev, cur, 0)) answer = min(answer, dp[prev][cur]);
        }
    }
    cout << (answer >= INF ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc285_f", {
    algorithm: "维护每个字符的 Fenwick 计数，以及相邻逆序位置的 Fenwick。子串有序需无相邻逆序；同时首尾字符之间的所有字符必须全部包含在子串中。",
    complexity: "O((N + Q) log N * 26)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Fenwick {
    int n;
    vector<int> bit;
    Fenwick(int n = 0) : n(n), bit(n + 1, 0) {}
    void add(int index, int value) {
        for (++index; index <= n; index += index & -index) bit[index] += value;
    }
    int sumPrefix(int index) const {
        int result = 0;
        for (++index; index > 0; index -= index & -index) result += bit[index];
        return result;
    }
    int rangeSum(int l, int r) const {
        if (r < l) return 0;
        return sumPrefix(r) - (l ? sumPrefix(l - 1) : 0);
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    vector<Fenwick> chars(26, Fenwick(n));
    Fenwick bad(n);
    vector<int> isBad(n, 0);
    for (int i = 0; i < n; ++i) chars[s[i] - 'a'].add(i, 1);
    auto setBad = [&](int i) {
        if (i < 0 || i + 1 >= n) return;
        int next = s[i] > s[i + 1];
        if (next != isBad[i]) {
            bad.add(i, next - isBad[i]);
            isBad[i] = next;
        }
    };
    for (int i = 0; i + 1 < n; ++i) setBad(i);

    int q;
    cin >> q;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            int x;
            char c;
            cin >> x >> c;
            --x;
            if (s[x] != c) {
                chars[s[x] - 'a'].add(x, -1);
                s[x] = c;
                chars[s[x] - 'a'].add(x, 1);
                setBad(x - 1);
                setBad(x);
            }
        } else {
            int l, r;
            cin >> l >> r;
            --l; --r;
            bool ok = bad.rangeSum(l, r - 1) == 0;
            int first = -1, last = -1;
            for (int c = 0; c < 26; ++c) {
                if (chars[c].rangeSum(l, r) > 0) {
                    if (first == -1) first = c;
                    last = c;
                }
            }
            for (int c = first + 1; ok && c < last; ++c) {
                if (chars[c].rangeSum(l, r) != chars[c].rangeSum(0, n - 1)) ok = false;
            }
            cout << (ok ? "Yes" : "No") << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc286_e", {
    algorithm: "先用 Floyd-Warshall 求最少航班数；当航班数相同时，维护能获得的最大纪念品总和。",
    complexity: "O(N^3)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    vector<string> s(n);
    for (string &row : s) cin >> row;

    const long long INF = 4e18;
    vector<vector<long long>> dist(n, vector<long long>(n, INF));
    vector<vector<long long>> value(n, vector<long long>(n, -INF));
    for (int i = 0; i < n; ++i) {
        dist[i][i] = 0;
        value[i][i] = a[i];
        for (int j = 0; j < n; ++j) {
            if (s[i][j] == 'Y') {
                dist[i][j] = 1;
                value[i][j] = a[i] + a[j];
            }
        }
    }

    for (int k = 0; k < n; ++k) {
        for (int i = 0; i < n; ++i) {
            for (int j = 0; j < n; ++j) {
                if (dist[i][k] == INF || dist[k][j] == INF) continue;
                long long nd = dist[i][k] + dist[k][j];
                long long nv = value[i][k] + value[k][j] - a[k];
                if (nd < dist[i][j] || (nd == dist[i][j] && nv > value[i][j])) {
                    dist[i][j] = nd;
                    value[i][j] = nv;
                }
            }
        }
    }

    int q;
    cin >> q;
    while (q--) {
        int u, v;
        cin >> u >> v;
        --u; --v;
        if (dist[u][v] == INF) cout << "Impossible" << '\\n';
        else cout << dist[u][v] << ' ' << value[u][v] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc288_d", {
    algorithm: "一次长度 K 的操作会对每个下标模 K 的类各影响一个元素，因此查询区间可清零当且仅当区间内各模类元素和相等。用按模类前缀和回答。",
    complexity: "O((N + Q)K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<vector<long long>> prefix(k, vector<long long>(n + 1, 0));
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        for (int r = 0; r < k; ++r) prefix[r][i + 1] = prefix[r][i];
        prefix[i % k][i + 1] += a;
    }

    int q;
    cin >> q;
    while (q--) {
        int l, r;
        cin >> l >> r;
        --l;
        vector<long long> sums(k);
        for (int mod = 0; mod < k; ++mod) sums[mod] = prefix[mod][r] - prefix[mod][l];
        cout << (all_of(sums.begin(), sums.end(), [&](long long x) { return x == sums[0]; }) ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc289_e", {
    algorithm: "状态为两人当前所在顶点 (u,v)。两人同时沿边移动，只有目标顶点颜色不同才可转移；在状态图上 BFS 到 (N,1)。",
    complexity: "O(T * (N^2 + M^2))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tc;
    cin >> tc;
    while (tc--) {
        int n, m;
        cin >> n >> m;
        vector<int> color(n);
        for (int &c : color) cin >> c;
        vector<vector<int>> graph(n);
        for (int i = 0; i < m; ++i) {
            int u, v;
            cin >> u >> v;
            --u; --v;
            graph[u].push_back(v);
            graph[v].push_back(u);
        }

        vector<vector<int>> dist(n, vector<int>(n, -1));
        queue<pair<int, int>> que;
        dist[0][n - 1] = 0;
        que.push({0, n - 1});
        while (!que.empty()) {
            auto [a, b] = que.front();
            que.pop();
            for (int na : graph[a]) {
                for (int nb : graph[b]) {
                    if (color[na] == color[nb] || dist[na][nb] != -1) continue;
                    dist[na][nb] = dist[a][b] + 1;
                    que.push({na, nb});
                }
            }
        }
        cout << dist[n - 1][0] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc291_e", {
    algorithm: "拓扑排序时若任一步入度为 0 的点不唯一，则排列不唯一。否则按弹出顺序给每个点赋排名并输出。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    vector<int> indeg(n, 0);
    for (int i = 0; i < m; ++i) {
        int x, y;
        cin >> x >> y;
        --x; --y;
        graph[x].push_back(y);
        ++indeg[y];
    }

    queue<int> que;
    for (int i = 0; i < n; ++i) if (indeg[i] == 0) que.push(i);
    vector<int> answer(n, 0);
    for (int rank = 1; rank <= n; ++rank) {
        if ((int)que.size() != 1) {
            cout << "No" << '\\n';
            return 0;
        }
        int v = que.front();
        que.pop();
        answer[v] = rank;
        for (int to : graph[v]) {
            if (--indeg[to] == 0) que.push(to);
        }
    }
    cout << "Yes" << '\\n';
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc293_e", {
    algorithm: "用分治同时计算 A^n 与 1+A+...+A^{n-1}。偶数拆成两半，奇数在 n-1 的结果后追加一项 A^{n-1}。",
    complexity: "O(log X)",
    code: `${CPP_INCLUDES}
using namespace std;

pair<long long, long long> powerAndSum(long long a, long long n, long long mod) {
    if (n == 0) return {1 % mod, 0};
    if (n % 2 == 0) {
        auto [p, s] = powerAndSum(a, n / 2, mod);
        return {p * p % mod, s * (1 + p) % mod};
    }
    auto [p, s] = powerAndSum(a, n - 1, mod);
    return {p * (a % mod) % mod, (s + p) % mod};
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, x, m;
    cin >> a >> x >> m;
    cout << powerAndSum(a, x, m).second % m << '\\n';
    return 0;
}
`
  }],
  ["AT_abc298_e", {
    algorithm: "分别计算两名玩家每次掷骰后到达终点的累计概率。高桥在第 t 次首次到达且青木在 t-1 次后尚未到达时获胜，累加这些概率。",
    complexity: "O(N^2(P+Q))",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

vector<vector<long long>> buildDistribution(int n, int start, int dice) {
    long long inv = modPow(dice, MOD - 2);
    vector<vector<long long>> dp(n + 1, vector<long long>(n + 1, 0));
    dp[0][start] = 1;
    for (int step = 0; step < n; ++step) {
        dp[step + 1][n] = (dp[step + 1][n] + dp[step][n]) % MOD;
        for (int pos = 0; pos < n; ++pos) {
            if (!dp[step][pos]) continue;
            for (int roll = 1; roll <= dice; ++roll) {
                int to = min(n, pos + roll);
                dp[step + 1][to] = (dp[step + 1][to] + dp[step][pos] * inv) % MOD;
            }
        }
    }
    return dp;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, a, b, p, q;
    cin >> n >> a >> b >> p >> q;
    auto taka = buildDistribution(n, a, p);
    auto aoki = buildDistribution(n, b, q);
    long long answer = 0;
    for (int turn = 1; turn <= n; ++turn) {
        long long firstReach = (taka[turn][n] - taka[turn - 1][n] + MOD) % MOD;
        long long aokiNotYet = (1 - aoki[turn - 1][n] + MOD) % MOD;
        answer = (answer + firstReach * aokiNotYet) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc287_d", {
    algorithm: "分别预处理前缀和后缀是否可匹配，字符相等或任意一方为 ? 即匹配。枚举分割位置 x，检查前 x 和后 |T|-x 是否都可匹配。",
    complexity: "O(|S| + |T|)",
    code: `${CPP_INCLUDES}
using namespace std;

bool match(char a, char b) {
    return a == b || a == '?' || b == '?';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s, t;
    cin >> s >> t;
    int n = s.size(), m = t.size();
    vector<int> pref(m + 1, 0), suff(m + 1, 0);
    pref[0] = 1;
    for (int i = 0; i < m; ++i) pref[i + 1] = pref[i] && match(s[i], t[i]);
    suff[0] = 1;
    for (int i = 0; i < m; ++i) suff[i + 1] = suff[i] && match(s[n - 1 - i], t[m - 1 - i]);
    for (int x = 0; x <= m; ++x) {
        cout << (pref[x] && suff[m - x] ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc287_e", {
    algorithm: "按字典序排序字符串。某个字符串与其他字符串的最长公共前缀，只可能来自排序后相邻的两个字符串，取左右相邻 LCP 最大值。",
    complexity: "O(N log N + 总长度)",
    code: `${CPP_INCLUDES}
using namespace std;

int lcp(const string &a, const string &b) {
    int len = min(a.size(), b.size());
    int i = 0;
    while (i < len && a[i] == b[i]) ++i;
    return i;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<string, int>> s(n);
    for (int i = 0; i < n; ++i) {
        cin >> s[i].first;
        s[i].second = i;
    }
    sort(s.begin(), s.end());
    vector<int> answer(n, 0);
    for (int i = 0; i + 1 < n; ++i) {
        int value = lcp(s[i].first, s[i + 1].first);
        answer[s[i].second] = max(answer[s[i].second], value);
        answer[s[i + 1].second] = max(answer[s[i + 1].second], value);
    }
    for (int x : answer) cout << x << '\\n';
    return 0;
}
`
  }],
  ["AT_abc290_d", {
    algorithm: "每隔 D 标记一个位置会在长度 N/gcd(N,D) 的环内循环。第 K 次标记的位置由环内偏移和完整环次数共同决定。",
    complexity: "O(T log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        long long n, d, k;
        cin >> n >> d >> k;
        --k;
        long long cycle = n / gcd(n, d);
        cout << (k * d + k / cycle) % n << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc291_d", {
    algorithm: "dp[i][side] 表示第 i 张卡选某一面且相邻值不同的方案数，从上一张两种选择转移。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    int n;
    cin >> n;
    vector<array<int, 2>> card(n);
    for (auto &c : card) cin >> c[0] >> c[1];
    array<long long, 2> dp = {1, 1};
    for (int i = 1; i < n; ++i) {
        array<long long, 2> next = {0, 0};
        for (int prev = 0; prev < 2; ++prev) {
            for (int cur = 0; cur < 2; ++cur) {
                if (card[i - 1][prev] != card[i][cur]) {
                    next[cur] = (next[cur] + dp[prev]) % MOD;
                }
            }
        }
        dp = next;
    }
    cout << (dp[0] + dp[1]) % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc292_e", {
    algorithm: "对每个起点做 BFS 统计能到达的点数。所有可达有序点对减去原有边数，就是需要补充的传递边数量。",
    complexity: "O(N(N+M))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        g[u - 1].push_back(v - 1);
    }
    long long reachable = 0;
    for (int s = 0; s < n; ++s) {
        vector<int> seen(n, 0);
        queue<int> q;
        seen[s] = 1;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int to : g[v]) {
                if (seen[to]) continue;
                seen[to] = 1;
                q.push(to);
            }
        }
        reachable += accumulate(seen.begin(), seen.end(), 0) - 1;
    }
    cout << reachable - m << '\\n';
    return 0;
}
`
  }],
  ["AT_abc293_d", {
    algorithm: "绳子连接形成无向图。每个连通块若边数等于点数就是一个环形块，否则是非环形块。",
    complexity: "O((N+M) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    vector<pair<int, int>> edges;
    for (int i = 0; i < m; ++i) {
        int a, c;
        char b, d;
        cin >> a >> b >> c >> d;
        --a; --c;
        dsu.unite(a, c);
        edges.push_back({a, c});
    }
    vector<int> vertices(n, 0), edgeCount(n, 0);
    for (int i = 0; i < n; ++i) ++vertices[dsu.find(i)];
    for (auto [a, _] : edges) ++edgeCount[dsu.find(a)];
    int cycle = 0, other = 0;
    for (int i = 0; i < n; ++i) {
        if (vertices[i] == 0) continue;
        if (vertices[i] == edgeCount[i]) ++cycle;
        else ++other;
    }
    cout << cycle << ' ' << other << '\\n';
    return 0;
}
`
  }],
  ["AT_abc294_e", {
    algorithm: "两行都是游程编码。用双指针同步推进当前段，重叠长度为两段剩余长度的较小值，值相等时累加。",
    complexity: "O(N1 + N2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long l;
    int n1, n2;
    cin >> l >> n1 >> n2;
    vector<pair<long long, long long>> a(n1), b(n2);
    for (auto &[v, len] : a) cin >> v >> len;
    for (auto &[v, len] : b) cin >> v >> len;

    int i = 0, j = 0;
    long long remA = a[0].second, remB = b[0].second, answer = 0;
    while (i < n1 && j < n2) {
        long long take = min(remA, remB);
        if (a[i].first == b[j].first) answer += take;
        remA -= take;
        remB -= take;
        if (remA == 0 && ++i < n1) remA = a[i].second;
        if (remB == 0 && ++j < n2) remB = b[j].second;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc295_d", {
    algorithm: "一个子串中每个数字都出现偶数次，当且仅当前缀奇偶状态相同。维护 10 位 mask 的出现次数并累加。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    vector<long long> count(1 << 10, 0);
    count[0] = 1;
    int mask = 0;
    long long answer = 0;
    for (char ch : s) {
        mask ^= 1 << (ch - '0');
        answer += count[mask];
        ++count[mask];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc296_d", {
    algorithm: "只需枚举较小因子 a 到 sqrt(M)。令 b=ceil(M/a)，若 b<=N，则 a*b 是一个候选答案。",
    complexity: "O(sqrt M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, m;
    cin >> n >> m;
    long long answer = numeric_limits<long long>::max();
    for (long long a = 1; a <= n && a * a <= m; ++a) {
        long long b = (m + a - 1) / a;
        if (b <= n) answer = min(answer, a * b);
    }
    cout << (answer == numeric_limits<long long>::max() ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc296_e", {
    algorithm: "每个点出度为 1。不断删除入度为 0 的点，最后未被删除的点正好是所有环上的点。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> to(n), indeg(n, 0);
    for (int i = 0; i < n; ++i) {
        cin >> to[i];
        --to[i];
        ++indeg[to[i]];
    }
    queue<int> q;
    vector<int> removed(n, 0);
    for (int i = 0; i < n; ++i) if (indeg[i] == 0) q.push(i);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        removed[v] = 1;
        if (--indeg[to[v]] == 0) q.push(to[v]);
    }
    cout << count(removed.begin(), removed.end(), 0) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc297_e", {
    algorithm: "所有可购买价格按从小到大生成。用 set 保存候选和，每次取出当前最小值，并加入它加上每种章鱼烧价格的新候选。",
    complexity: "O(KN log(KN))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    set<long long> candidates;
    candidates.insert(0);
    long long current = 0;
    for (int step = 0; step <= k; ++step) {
        current = *candidates.begin();
        candidates.erase(candidates.begin());
        for (long long x : a) candidates.insert(current + x);
    }
    cout << current << '\\n';
    return 0;
}
`
  }],
  ["AT_abc298_d", {
    algorithm: "维护当前数字模 MOD 的值和一个数字队列。尾部追加时乘 10 加 x；删除头部时减去该数字乘以对应的 10 的幂。",
    complexity: "O(Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    int q;
    cin >> q;
    deque<int> digits;
    digits.push_back(1);
    vector<long long> pow10(q + 2, 1);
    for (int i = 1; i < (int)pow10.size(); ++i) pow10[i] = pow10[i - 1] * 10 % MOD;
    long long value = 1;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            int x;
            cin >> x;
            digits.push_back(x);
            value = (value * 10 + x) % MOD;
        } else if (type == 2) {
            int x = digits.front();
            digits.pop_front();
            value = (value - x * pow10[digits.size()] % MOD + MOD) % MOD;
        } else {
            cout << value << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc300_e", {
    algorithm: "只有质因子 2、3、5 会影响到达 N。设 f(a,b,c) 为当前还需补齐这些指数时的概率，骰到 1 会自环，移项后除以 5，用指数 DP 计算。",
    complexity: "O(log^3 N)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;
const long long INV5 = 598946612;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    int c2 = 0, c3 = 0, c5 = 0;
    while (n % 2 == 0) { ++c2; n /= 2; }
    while (n % 3 == 0) { ++c3; n /= 3; }
    while (n % 5 == 0) { ++c5; n /= 5; }
    if (n != 1) {
        cout << 0 << '\\n';
        return 0;
    }

    vector<vector<vector<long long>>> dp(c2 + 1, vector<vector<long long>>(c3 + 1, vector<long long>(c5 + 1, 0)));
    dp[c2][c3][c5] = 1;
    for (int a = c2; a >= 0; --a) {
        for (int b = c3; b >= 0; --b) {
            for (int c = c5; c >= 0; --c) {
                if (a == c2 && b == c3 && c == c5) continue;
                long long value = 0;
                if (a + 1 <= c2) value = (value + dp[a + 1][b][c]) % MOD;
                if (b + 1 <= c3) value = (value + dp[a][b + 1][c]) % MOD;
                if (a + 2 <= c2) value = (value + dp[a + 2][b][c]) % MOD;
                if (c + 1 <= c5) value = (value + dp[a][b][c + 1]) % MOD;
                if (a + 1 <= c2 && b + 1 <= c3) value = (value + dp[a + 1][b + 1][c]) % MOD;
                dp[a][b][c] = value * INV5 % MOD;
            }
        }
    }
    cout << dp[0][0][0] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc304_e", {
    algorithm: "先用并查集缩点。所有禁止关系映射到连通块对并存入 set；查询时只需检查两个点所在连通块对是否被禁止。",
    complexity: "O((N+M+K+Q) log K)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        dsu.unite(u - 1, v - 1);
    }
    int k;
    cin >> k;
    set<pair<int, int>> bad;
    for (int i = 0; i < k; ++i) {
        int x, y;
        cin >> x >> y;
        int a = dsu.find(x - 1), b = dsu.find(y - 1);
        if (a > b) swap(a, b);
        bad.insert({a, b});
    }
    int q;
    cin >> q;
    while (q--) {
        int p, qv;
        cin >> p >> qv;
        int a = dsu.find(p - 1), b = dsu.find(qv - 1);
        if (a > b) swap(a, b);
        cout << (bad.count({a, b}) ? "No" : "Yes") << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc305_e", {
    algorithm: "从所有守卫作为源点，用最大堆按剩余体力扩展。一个点只在获得更大剩余体力时更新，最终被访问到的点就是被守护的点。",
    complexity: "O((N+M+K) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        graph[a].push_back(b);
        graph[b].push_back(a);
    }

    vector<int> best(n, -1);
    priority_queue<pair<int, int>> pq;
    for (int i = 0; i < k; ++i) {
        int p, h;
        cin >> p >> h;
        --p;
        if (h > best[p]) {
            best[p] = h;
            pq.push({h, p});
        }
    }
    while (!pq.empty()) {
        auto [h, v] = pq.top();
        pq.pop();
        if (h != best[v] || h == 0) continue;
        for (int to : graph[v]) {
            if (best[to] < h - 1) {
                best[to] = h - 1;
                pq.push({h - 1, to});
            }
        }
    }

    vector<int> answer;
    for (int i = 0; i < n; ++i) if (best[i] >= 0) answer.push_back(i + 1);
    cout << answer.size() << '\\n';
    for (int i = 0; i < (int)answer.size(); ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc306_e", {
    algorithm: "维护 Top K 最大值集合和其余集合，集合元素用 (分数, 编号) 区分重复分数。每次更新单点后重平衡并输出 Top K 之和。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k, q;
    cin >> n >> k >> q;
    vector<long long> value(n, 0);
    set<pair<long long, int>> top, rest;
    long long sumTop = 0;
    for (int i = 0; i < n; ++i) top.insert({0, i});
    while ((int)top.size() > k) {
        auto it = top.begin();
        rest.insert(*it);
        top.erase(it);
    }

    auto rebalance = [&]() {
        while ((int)top.size() < k && !rest.empty()) {
            auto it = prev(rest.end());
            sumTop += it->first;
            top.insert(*it);
            rest.erase(it);
        }
        while ((int)top.size() > k) {
            auto it = top.begin();
            sumTop -= it->first;
            rest.insert(*it);
            top.erase(it);
        }
        while (!top.empty() && !rest.empty() && *top.begin() < *prev(rest.end())) {
            auto itTop = top.begin();
            auto itRest = prev(rest.end());
            auto a = *itTop, b = *itRest;
            sumTop += b.first - a.first;
            top.erase(itTop);
            rest.erase(itRest);
            top.insert(b);
            rest.insert(a);
        }
    };

    while (q--) {
        int x;
        long long y;
        cin >> x >> y;
        --x;
        pair<long long, int> old = {value[x], x};
        auto it = top.find(old);
        if (it != top.end()) {
            sumTop -= it->first;
            top.erase(it);
        } else {
            rest.erase(old);
        }
        value[x] = y;
        top.insert({value[x], x});
        sumTop += value[x];
        rebalance();
        cout << sumTop << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc308_f", {
    algorithm: "按价格从小到大处理商品，把门槛不超过当前价格的优惠券加入最大堆。每个商品使用当前可用的最大折扣券最优。",
    complexity: "O((N+M) log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> p(n);
    for (long long &x : p) cin >> x;
    vector<pair<long long, long long>> coupons(m);
    for (auto &[l, d] : coupons) cin >> l;
    for (auto &[l, d] : coupons) cin >> d;
    sort(p.begin(), p.end());
    sort(coupons.begin(), coupons.end());
    priority_queue<long long> available;
    long long answer = 0;
    int cursor = 0;
    for (long long price : p) {
        while (cursor < m && coupons[cursor].first <= price) {
            available.push(coupons[cursor].second);
            ++cursor;
        }
        answer += price;
        if (!available.empty()) {
            answer -= available.top();
            available.pop();
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc310_d", {
    algorithm: "按人递归分配到已有队伍或新队伍，并检查队内是否存在不相容关系。只允许新建编号为当前队伍数的队伍来避免重复计数。",
    complexity: "O(T^N * N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, t, m;
    cin >> n >> t >> m;
    vector<vector<int>> bad(n, vector<int>(n, 0));
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        bad[a][b] = bad[b][a] = 1;
    }

    vector<vector<int>> teams(t);
    long long answer = 0;
    function<void(int, int)> dfs = [&](int person, int used) {
        if (person == n) {
            if (used == t) ++answer;
            return;
        }
        for (int team = 0; team < used; ++team) {
            bool ok = true;
            for (int member : teams[team]) if (bad[person][member]) ok = false;
            if (!ok) continue;
            teams[team].push_back(person);
            dfs(person + 1, used);
            teams[team].pop_back();
        }
        if (used < t) {
            teams[used].push_back(person);
            dfs(person + 1, used + 1);
            teams[used].pop_back();
        }
    };
    dfs(0, 0);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc310_e", {
    algorithm: "维护所有以当前位置结尾的子串经过连续 NAND 后结果为 0/1 的数量。新字符单独成串，再把上一位置的两类结果转移过来。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    long long count0 = 0, count1 = 0, answer = 0;
    for (char ch : s) {
        int x = ch - '0';
        long long next0 = 0, next1 = 0;
        if (x == 0) ++next0;
        else ++next1;
        auto add = [&](long long count, int previous) {
            int value = !(previous & x);
            if (value) next1 += count;
            else next0 += count;
        };
        add(count0, 0);
        add(count1, 1);
        count0 = next0;
        count1 = next1;
        answer += count1;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc311_e", {
    algorithm: "把障碍格的 dp 值设为 0；其他格子的最大无缺陷正方形边长为左、上、左上三者最小值加 1，累加所有 dp 值。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, n;
    cin >> h >> w >> n;
    vector<vector<int>> blocked(h, vector<int>(w, 0));
    for (int i = 0; i < n; ++i) {
        int a, b;
        cin >> a >> b;
        blocked[a - 1][b - 1] = 1;
    }
    vector<vector<int>> dp(h + 1, vector<int>(w + 1, 0));
    long long answer = 0;
    for (int i = 1; i <= h; ++i) {
        for (int j = 1; j <= w; ++j) {
            if (blocked[i - 1][j - 1]) continue;
            dp[i][j] = min({dp[i - 1][j], dp[i][j - 1], dp[i - 1][j - 1]}) + 1;
            answer += dp[i][j];
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc315_d", {
    algorithm: "维护每行/列剩余格数和各字符计数。若某行或列剩余不少于 2 且只有一种字符，就入队删除；删除时同步更新交叉列/行计数。",
    complexity: "O(HW * 26)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    for (string &row : grid) cin >> row;
    vector<array<int, 26>> rowCount(h), colCount(w);
    vector<int> rowLeft(h, w), colLeft(w, h), rowRemoved(h, 0), colRemoved(w, 0);
    for (auto &arr : rowCount) arr.fill(0);
    for (auto &arr : colCount) arr.fill(0);
    for (int i = 0; i < h; ++i) {
        for (int j = 0; j < w; ++j) {
            ++rowCount[i][grid[i][j] - 'a'];
            ++colCount[j][grid[i][j] - 'a'];
        }
    }

    auto singleColor = [&](const array<int, 26> &cnt, int left) {
        if (left < 2) return -1;
        int found = -1;
        for (int c = 0; c < 26; ++c) {
            if (cnt[c] == 0) continue;
            if (found != -1) return -1;
            found = c;
        }
        return found;
    };

    while (true) {
        vector<int> rows, cols;
        for (int i = 0; i < h; ++i) {
            if (!rowRemoved[i] && singleColor(rowCount[i], rowLeft[i]) != -1) rows.push_back(i);
        }
        for (int j = 0; j < w; ++j) {
            if (!colRemoved[j] && singleColor(colCount[j], colLeft[j]) != -1) cols.push_back(j);
        }
        if (rows.empty() && cols.empty()) break;

        for (int i : rows) rowRemoved[i] = 1;
        for (int j : cols) colRemoved[j] = 1;

        for (int i : rows) {
            for (int j = 0; j < w; ++j) {
                if (colRemoved[j]) continue;
                int c = grid[i][j] - 'a';
                --colCount[j][c];
                --colLeft[j];
            }
        }
        for (int j : cols) {
            for (int i = 0; i < h; ++i) {
                if (rowRemoved[i]) continue;
                int c = grid[i][j] - 'a';
                --rowCount[i][c];
                --rowLeft[i];
            }
        }
    }

    long long answer = 0;
    for (int i = 0; i < h; ++i) if (!rowRemoved[i]) {
        for (int j = 0; j < w; ++j) if (!colRemoved[j]) ++answer;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc319_e", {
    algorithm: "各站发车周期的 lcm 不超过 840。预处理出发时间模 840 的整段旅行耗时，每个查询只看 q_i mod 840。",
    complexity: "O(840N + Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long x, y;
    cin >> n >> x >> y;
    vector<long long> p(n - 1), t(n - 1);
    for (int i = 0; i < n - 1; ++i) cin >> p[i] >> t[i];
    const int PERIOD = 840;
    vector<long long> memo(PERIOD);
    for (int r = 0; r < PERIOD; ++r) {
        long long time = r + x;
        for (int i = 0; i < n - 1; ++i) {
            long long wait = (p[i] - time % p[i]) % p[i];
            time += wait + t[i];
        }
        memo[r] = time + y - r;
    }
    int q;
    cin >> q;
    while (q--) {
        long long start;
        cin >> start;
        cout << start + memo[start % PERIOD] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc320_c", {
    algorithm: "枚举目标数字和三台老虎机在 0..3M-1 内停在该数字的时间，要求三次时间互不相同，取最大时间最小值。",
    complexity: "O(10 * M^3)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m;
    cin >> m;
    vector<string> s(3);
    for (string &row : s) cin >> row;
    int answer = 1e9;
    for (char digit = '0'; digit <= '9'; ++digit) {
        vector<vector<int>> times(3);
        for (int reel = 0; reel < 3; ++reel) {
            for (int t = 0; t < 3 * m; ++t) {
                if (s[reel][t % m] == digit) times[reel].push_back(t);
            }
        }
        for (int a : times[0]) for (int b : times[1]) for (int c : times[2]) {
            if (a == b || a == c || b == c) continue;
            answer = min(answer, max({a, b, c}));
        }
    }
    cout << (answer == (int)1e9 ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc320_e", {
    algorithm: "用 set 维护当前可接面线的人，优先队列维护归还事件。每次事件先处理已归还的人，再把面线给编号最小的可用者。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    set<int> available;
    for (int i = 0; i < n; ++i) available.insert(i);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> returns;
    vector<long long> answer(n, 0);
    for (int i = 0; i < m; ++i) {
        long long t, w, s;
        cin >> t >> w >> s;
        while (!returns.empty() && returns.top().first <= t) {
            available.insert(returns.top().second);
            returns.pop();
        }
        if (available.empty()) continue;
        int person = *available.begin();
        available.erase(available.begin());
        answer[person] += w;
        returns.push({t + s, person});
    }
    for (long long v : answer) cout << v << '\\n';
    return 0;
}
`
  }],
  ["AT_abc301_d", {
    algorithm: "先把所有 ? 当成 0 得到最小值，若已超过 N 则无解。再从高位到低位尝试把 ? 置 1，只要不超过 N 就保留。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    long long n;
    cin >> s >> n;
    long long value = 0;
    int len = s.size();
    for (int i = 0; i < len; ++i) {
        if (s[i] == '1') value += 1LL << (len - 1 - i);
    }
    if (value > n) {
        cout << -1 << '\\n';
        return 0;
    }
    for (int i = 0; i < len; ++i) {
        if (s[i] != '?') continue;
        long long bit = 1LL << (len - 1 - i);
        if (value + bit <= n) value += bit;
    }
    cout << value << '\\n';
    return 0;
}
`
  }],
  ["AT_abc302_e", {
    algorithm: "维护每个点当前邻接集合和孤立点数量。加边时若端点原本孤立就减少计数；删除某点所有边时逐条更新邻居，最后该点变孤立。",
    complexity: "O(Q log N + 删除的边数 log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<set<int>> g(n);
    int isolated = n;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            int u, v;
            cin >> u >> v;
            --u; --v;
            if (g[u].empty()) --isolated;
            if (g[v].empty()) --isolated;
            g[u].insert(v);
            g[v].insert(u);
        } else {
            int v;
            cin >> v;
            --v;
            if (!g[v].empty()) {
                for (int to : vector<int>(g[v].begin(), g[v].end())) {
                    g[to].erase(v);
                    if (g[to].empty()) ++isolated;
                }
                g[v].clear();
                ++isolated;
            }
        }
        cout << isolated << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc303_d", {
    algorithm: "dp[0/1] 表示 CapsLock 关闭/开启时输入完当前前缀的最小代价。每个字符可直接输入或先切换状态再输入。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long x, y, z;
    string s;
    cin >> x >> y >> z >> s;
    const long long INF = 4e18;
    array<long long, 2> dp = {0, z};
    for (char ch : s) {
        array<long long, 2> next = {INF, INF};
        for (int caps = 0; caps < 2; ++caps) {
            for (int ncaps = 0; ncaps < 2; ++ncaps) {
                long long cost = dp[caps] + (caps == ncaps ? 0 : z);
                bool upper = ncaps == 1;
                bool needUpper = ch == 'A';
                cost += (upper == needUpper ? x : y);
                next[ncaps] = min(next[ncaps], cost);
            }
        }
        dp = next;
    }
    cout << min(dp[0], dp[1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc304_d", {
    algorithm: "用二分确定每个草莓所在的横切段和纵切段，按矩形编号统计数量。若有空矩形则最小值为 0，否则取出现矩形的最小计数。",
    complexity: "O(N log(A+B))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int w, h, n;
    cin >> w >> h >> n;
    vector<pair<int, int>> p(n);
    for (auto &[x, y] : p) cin >> x >> y;
    int a;
    cin >> a;
    vector<int> xs(a);
    for (int &x : xs) cin >> x;
    int b;
    cin >> b;
    vector<int> ys(b);
    for (int &y : ys) cin >> y;

    map<pair<int, int>, int> count;
    for (auto [x, y] : p) {
        int cx = lower_bound(xs.begin(), xs.end(), x) - xs.begin();
        int cy = lower_bound(ys.begin(), ys.end(), y) - ys.begin();
        ++count[{cx, cy}];
    }
    int mn = (count.size() < 1LL * (a + 1) * (b + 1)) ? 0 : n;
    int mx = 0;
    for (auto [_, c] : count) {
        mn = min(mn, c);
        mx = max(mx, c);
    }
    cout << mn << ' ' << mx << '\\n';
    return 0;
}
`
  }],
  ["AT_abc305_d", {
    algorithm: "睡眠区间是 [A1,A2), [A3,A4) ...。预处理每个时间点前累计睡眠时长，查询时用二分计算 f(R)-f(L)。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n), prefix(n + 1, 0);
    for (long long &x : a) cin >> x;
    for (int i = 0; i + 1 < n; ++i) {
        prefix[i + 1] = prefix[i];
        if (i % 2 == 1) prefix[i + 1] += a[i + 1] - a[i];
    }
    prefix[n] = prefix[n - 1];

    auto sleptUntil = [&](long long t) {
        int idx = upper_bound(a.begin(), a.end(), t) - a.begin() - 1;
        if (idx < 0) return 0LL;
        long long result = prefix[idx];
        if (idx % 2 == 1) result += t - a[idx];
        return result;
    };

    int q;
    cin >> q;
    while (q--) {
        long long l, r;
        cin >> l >> r;
        cout << sleptUntil(r) - sleptUntil(l) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc307_c", {
    algorithm: "枚举把 A 和 B 平移到足够大的画布上的位置，合并后的黑格集合若恰好等于 X 的黑格集合，则可构造。",
    complexity: "O(H^2W^2 * HW)",
    code: `${CPP_INCLUDES}
using namespace std;

vector<pair<int, int>> readShape() {
    int h, w;
    cin >> h >> w;
    vector<pair<int, int>> cells;
    for (int i = 0; i < h; ++i) {
        string row;
        cin >> row;
        for (int j = 0; j < w; ++j) if (row[j] == '#') cells.push_back({i, j});
    }
    return cells;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    auto a = readShape();
    auto b = readShape();
    auto x = readShape();
    set<pair<int, int>> target(x.begin(), x.end());

    for (int ay = -10; ay <= 10; ++ay) {
        for (int ax = -10; ax <= 10; ++ax) {
            for (int by = -10; by <= 10; ++by) {
                for (int bx = -10; bx <= 10; ++bx) {
                    set<pair<int, int>> made;
                    for (auto [y, x0] : a) made.insert({y + ay, x0 + ax});
                    for (auto [y, x0] : b) made.insert({y + by, x0 + bx});
                    if (made == target) {
                        cout << "Yes" << '\\n';
                        return 0;
                    }
                }
            }
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc307_d", {
    algorithm: "用栈记录尚未匹配的左括号在结果串中的位置。遇到右括号且存在可匹配左括号时，直接删除这一整段；否则保留字符。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    string result;
    vector<int> open;
    for (char ch : s) {
        if (ch == '(') {
            open.push_back(result.size());
            result.push_back(ch);
        } else if (ch == ')' && !open.empty()) {
            result.resize(open.back());
            open.pop_back();
        } else {
            result.push_back(ch);
        }
    }
    cout << result << '\\n';
    return 0;
}
`
  }],
  ["AT_abc307_e", {
    algorithm: "只关心当前最后一个颜色是否等于第一个颜色。加入新颜色时维护相等/不等两类状态，最后要求首尾不同。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    long long n, m;
    cin >> n >> m;
    long long same = 1, diff = 0;
    for (int i = 1; i < n; ++i) {
        long long nextSame = diff;
        long long nextDiff = (same * (m - 1) + diff * (m - 2)) % MOD;
        same = nextSame % MOD;
        diff = nextDiff;
    }
    cout << diff * m % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc308_d", {
    algorithm: "从左上角 BFS。下一步必须按照 snuke 的循环顺序匹配，能到达右下角则答案为 Yes。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    for (string &row : grid) cin >> row;
    string word = "snuke";
    if (grid[0][0] != 's') {
        cout << "No" << '\\n';
        return 0;
    }
    vector<vector<int>> dist(h, vector<int>(w, -1));
    queue<pair<int, int>> q;
    dist[0][0] = 0;
    q.push({0, 0});
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front();
        q.pop();
        char need = word[(dist[y][x] + 1) % 5];
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy[dir], nx = x + dx[dir];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
            if (dist[ny][nx] != -1 || grid[ny][nx] != need) continue;
            dist[ny][nx] = dist[y][x] + 1;
            q.push({ny, nx});
        }
    }
    cout << (dist[h - 1][w - 1] == -1 ? "No" : "Yes") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc308_e", {
    algorithm: "枚举中间的 E。统计其左侧 M 的 0/1/2 个数和右侧 X 的 0/1/2 个数，累加 mex(a,b,c) 贡献。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int mex3(int a, int b, int c) {
    for (int x = 0; x <= 3; ++x) {
        if (x != a && x != b && x != c) return x;
    }
    return 3;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &x : a) cin >> x;
    string s;
    cin >> s;
    vector<array<long long, 3>> prefix(n + 1), suffix(n + 1);
    for (int i = 0; i < n; ++i) {
        prefix[i + 1] = prefix[i];
        if (s[i] == 'M') ++prefix[i + 1][a[i]];
    }
    for (int i = n - 1; i >= 0; --i) {
        suffix[i] = suffix[i + 1];
        if (s[i] == 'X') ++suffix[i][a[i]];
    }
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        if (s[i] != 'E') continue;
        for (int l = 0; l < 3; ++l) {
            for (int r = 0; r < 3; ++r) {
                answer += prefix[i][l] * suffix[i + 1][r] * mex3(l, a[i], r);
            }
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc309_d", {
    algorithm: "图由两部分组成。分别从 1 和 N 做 BFS，答案是两个连通块内最远距离之和再加一条新边。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

vector<int> bfs(const vector<vector<int>> &g, int start) {
    vector<int> dist(g.size(), -1);
    queue<int> q;
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (int to : g[v]) {
            if (dist[to] != -1) continue;
            dist[to] = dist[v] + 1;
            q.push(to);
        }
    }
    return dist;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n1, n2, m;
    cin >> n1 >> n2 >> m;
    vector<vector<int>> g(n1 + n2);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
    }
    auto d1 = bfs(g, 0);
    auto d2 = bfs(g, n1 + n2 - 1);
    cout << *max_element(d1.begin(), d1.end()) + *max_element(d2.begin(), d2.end()) + 1 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc309_e", {
    algorithm: "树上从根 DFS/BFS，维护祖先保险还能覆盖的最大剩余深度。每个节点取祖先剩余深度和自身保险 y 的最大值，非负则被覆盖。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> children(n);
    for (int i = 1; i < n; ++i) {
        int p;
        cin >> p;
        children[p - 1].push_back(i);
    }
    vector<int> insurance(n, -1);
    for (int i = 0; i < m; ++i) {
        int x, y;
        cin >> x >> y;
        insurance[x - 1] = max(insurance[x - 1], y);
    }
    int answer = 0;
    queue<pair<int, int>> q;
    q.push({0, insurance[0]});
    while (!q.empty()) {
        auto [v, cover] = q.front();
        q.pop();
        if (cover >= 0) ++answer;
        for (int to : children[v]) {
            q.push({to, max(insurance[to], cover - 1)});
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc311_c", {
    algorithm: "出度为 1 的函数图一定有环。从任意点沿边走，记录首次访问步数，遇到已访问点后取这段路径作为环。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> to(n);
    for (int &x : to) {
        cin >> x;
        --x;
    }
    vector<int> seen(n, -1), path;
    int v = 0;
    while (seen[v] == -1) {
        seen[v] = path.size();
        path.push_back(v);
        v = to[v];
    }
    vector<int> cycle(path.begin() + seen[v], path.end());
    cout << cycle.size() << '\\n';
    for (int i = 0; i < (int)cycle.size(); ++i) {
        if (i) cout << ' ';
        cout << cycle[i] + 1;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc311_d", {
    algorithm: "状态是冰面上停下的位置。从每个停点向四个方向滑到撞墙前的位置，沿途格子都标记为可到达，新的停点入队。",
    complexity: "O(HW(H+W))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<string> s(n);
    for (string &row : s) cin >> row;
    vector<vector<int>> stop(n, vector<int>(m, 0)), seen(n, vector<int>(m, 0));
    queue<pair<int, int>> q;
    stop[1][1] = seen[1][1] = 1;
    q.push({1, 1});
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front();
        q.pop();
        for (int dir = 0; dir < 4; ++dir) {
            int cy = y, cx = x;
            while (s[cy + dy[dir]][cx + dx[dir]] == '.') {
                cy += dy[dir];
                cx += dx[dir];
                seen[cy][cx] = 1;
            }
            if (!stop[cy][cx]) {
                stop[cy][cx] = 1;
                q.push({cy, cx});
            }
        }
    }
    int answer = 0;
    for (auto &row : seen) answer += accumulate(row.begin(), row.end(), 0);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc312_c", {
    algorithm: "二分价格 x。卖方中报价不超过 x 的人数大于等于买方中报价不低于 x 的人数时，x 可行，取最小可行价格。",
    complexity: "O((N+M) log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> a(n), b(m);
    for (int &x : a) cin >> x;
    for (int &x : b) cin >> x;
    sort(a.begin(), a.end());
    sort(b.begin(), b.end());
    int low = 0, high = 1000000001;
    while (high - low > 1) {
        int mid = low + (high - low) / 2;
        int sellers = upper_bound(a.begin(), a.end(), mid) - a.begin();
        int buyers = b.end() - lower_bound(b.begin(), b.end(), mid);
        if (sellers >= buyers) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc312_d", {
    algorithm: "括号序列 DP。dp[i][balance] 表示处理前 i 个字符且当前未闭合左括号数量为 balance 的方案数。",
    complexity: "O(N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    string s;
    cin >> s;
    int n = s.size();
    vector<vector<long long>> dp(n + 1, vector<long long>(n + 1, 0));
    dp[0][0] = 1;
    for (int i = 0; i < n; ++i) {
        for (int bal = 0; bal <= n; ++bal) {
            if (!dp[i][bal]) continue;
            if ((s[i] == '(' || s[i] == '?') && bal + 1 <= n) {
                dp[i + 1][bal + 1] = (dp[i + 1][bal + 1] + dp[i][bal]) % MOD;
            }
            if ((s[i] == ')' || s[i] == '?') && bal > 0) {
                dp[i + 1][bal - 1] = (dp[i + 1][bal - 1] + dp[i][bal]) % MOD;
            }
        }
    }
    cout << dp[n][0] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc313_c", {
    algorithm: "最终每个数只能是 floor(sum/N) 或 ceil(sum/N)。排序后把较小位置对应到低值、较大位置对应到高值，统计需要增加的总量。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    long long sum = 0;
    for (long long &x : a) {
        cin >> x;
        sum += x;
    }
    sort(a.begin(), a.end());
    long long low = sum / n;
    int highCount = sum % n;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long target = i < n - highCount ? low : low + 1;
        if (a[i] < target) answer += target - a[i];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc314_d", {
    algorithm: "最后一次全体大小写转换之后的单点修改不受影响。先记录所有操作，找到最后一次类型 2/3 操作，再重放并在该位置执行全体转换。",
    complexity: "O(N+Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    int q;
    cin >> q;
    vector<tuple<int, int, char>> ops(q);
    int lastAll = -1;
    for (int i = 0; i < q; ++i) {
        int t, x;
        char c;
        cin >> t >> x >> c;
        ops[i] = {t, x - 1, c};
        if (t == 2 || t == 3) lastAll = i;
    }
    for (int i = 0; i < q; ++i) {
        auto [t, x, c] = ops[i];
        if (t == 1) s[x] = c;
        if (i == lastAll) {
            for (char &ch : s) {
                ch = (t == 2 ? tolower(ch) : toupper(ch));
            }
        }
    }
    cout << s << '\\n';
    return 0;
}
`
  }],
  ["AT_abc315_e", {
    algorithm: "只需要完成书 1 的所有依赖。对依赖图从 1 做 DFS，后序加入答案，即先完成依赖再完成当前书。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> need(n);
    for (int i = 0; i < n; ++i) {
        int c;
        cin >> c;
        need[i].resize(c);
        for (int &p : need[i]) {
            cin >> p;
            --p;
        }
    }
    vector<int> seen(n, 0), order;
    auto dfs = [&](auto &&self, int v) -> void {
        seen[v] = 1;
        for (int to : need[v]) if (!seen[to]) self(self, to);
        if (v != 0) order.push_back(v);
    };
    dfs(dfs, 0);
    for (int i = 0; i < (int)order.size(); ++i) {
        if (i) cout << ' ';
        cout << order[i] + 1;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc317_d", {
    algorithm: "总席位过半即可获胜。每个选区若当前未赢，需要花费 ceil((Y-X)/2) 票翻转，做最小代价背包使赢得席位超过半数。",
    complexity: "O(N * 总席位)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<tuple<long long, long long, int>> districts(n);
    int totalSeats = 0, currentSeats = 0;
    for (auto &[x, y, z] : districts) {
        cin >> x >> y >> z;
        totalSeats += z;
        if (x > y) currentSeats += z;
    }
    int need = totalSeats / 2 + 1;
    if (currentSeats >= need) {
        cout << 0 << '\\n';
        return 0;
    }
    const long long INF = 4e18;
    vector<long long> dp(totalSeats + 1, INF);
    dp[currentSeats] = 0;
    for (auto [x, y, z] : districts) {
        if (x > y) continue;
        long long cost = (y - x + 1) / 2;
        for (int seats = totalSeats - z; seats >= 0; --seats) {
            if (dp[seats] == INF) continue;
            dp[seats + z] = min(dp[seats + z], dp[seats] + cost);
        }
    }
    cout << *min_element(dp.begin() + need, dp.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc317_e", {
    algorithm: "先从每个监视器沿朝向标记所有被看到的空格。之后在未被墙、监视器、视线覆盖的格子上做 BFS。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    for (string &row : grid) cin >> row;
    vector<vector<int>> bad(h, vector<int>(w, 0));
    pair<int, int> start, goal;
    string guards = "^v<>";
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (grid[y][x] == 'S') start = {y, x};
            if (grid[y][x] == 'G') goal = {y, x};
            if (grid[y][x] == '#' || guards.find(grid[y][x]) != string::npos) bad[y][x] = 1;
        }
    }
    map<char, pair<int, int>> dir = {{'^', {-1, 0}}, {'v', {1, 0}}, {'<', {0, -1}}, {'>', {0, 1}}};
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (!dir.count(grid[y][x])) continue;
            auto [dy, dx] = dir[grid[y][x]];
            int cy = y + dy, cx = x + dx;
            while (0 <= cy && cy < h && 0 <= cx && cx < w && grid[cy][cx] != '#' && guards.find(grid[cy][cx]) == string::npos) {
                bad[cy][cx] = 1;
                cy += dy;
                cx += dx;
            }
        }
    }
    vector<vector<int>> dist(h, vector<int>(w, -1));
    queue<pair<int, int>> q;
    dist[start.first][start.second] = 0;
    q.push(start);
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [y, x] = q.front();
        q.pop();
        for (int k = 0; k < 4; ++k) {
            int ny = y + dy[k], nx = x + dx[k];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w) continue;
            if (bad[ny][nx] || dist[ny][nx] != -1) continue;
            dist[ny][nx] = dist[y][x] + 1;
            q.push({ny, nx});
        }
    }
    cout << dist[goal.first][goal.second] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc318_d", {
    algorithm: "N 很小。用 bitmask DP 表示已配对的人，取最小未配对 i，再枚举与 i 配对的 j 进行转移。",
    complexity: "O(2^N N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<long long>> d(n, vector<long long>(n, 0));
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) cin >> d[i][j];
    }
    vector<long long> dp(1 << n, 0);
    for (int mask = 0; mask < (1 << n); ++mask) {
        int i = 0;
        while (i < n && (mask >> i & 1)) ++i;
        if (i == n) continue;
        for (int j = i + 1; j < n; ++j) {
            if (mask >> j & 1) continue;
            int next = mask | (1 << i) | (1 << j);
            dp[next] = max(dp[next], dp[mask] + d[i][j]);
        }
    }
    cout << *max_element(dp.begin(), dp.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc318_e", {
    algorithm: "枚举右端点 k。此前同值左端点 i 与 k 之间共有 k-i-1 个中间位置，但其中同值位置不能作为 j，需要再扣掉此前同值出现次数形成的内部同值数量。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> count(n + 1, 0), sumIndex(n + 1, 0);
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        answer += count[a] * (i - 1LL) - sumIndex[a] - count[a] * (count[a] - 1) / 2;
        ++count[a];
        sumIndex[a] += i;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc319_c", {
    algorithm: "9 个格子只有 9! 种打开顺序。枚举所有顺序，若某一行/列/对角线前两个相同且第三个尚未打开，则产生失望。",
    complexity: "O(9! * 8)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<int> c(9);
    for (int &x : c) cin >> x;
    vector<array<int, 3>> lines = {{
        {0, 1, 2}, {3, 4, 5}, {6, 7, 8},
        {0, 3, 6}, {1, 4, 7}, {2, 5, 8},
        {0, 4, 8}, {2, 4, 6}
    }};
    vector<int> order(9);
    iota(order.begin(), order.end(), 0);
    long long good = 0, total = 0;
    do {
        vector<int> pos(9);
        for (int i = 0; i < 9; ++i) pos[order[i]] = i;
        bool disappointed = false;
        for (auto line : lines) {
            for (int hidden = 0; hidden < 3; ++hidden) {
                int a = line[(hidden + 1) % 3];
                int b = line[(hidden + 2) % 3];
                int z = line[hidden];
                if (pos[a] < pos[z] && pos[b] < pos[z] && c[a] == c[b]) disappointed = true;
            }
        }
        if (!disappointed) ++good;
        ++total;
    } while (next_permutation(order.begin(), order.end()));
    cout << fixed << setprecision(12) << (double)good / total << '\\n';
    return 0;
}
`
  }],
  ["AT_abc319_d", {
    algorithm: "二分行宽。按顺序贪心放单词，当前行放不下就换行，检查所需行数是否不超过 M。",
    complexity: "O(N log sumL)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> l(n);
    long long low = 0, high = 1;
    for (long long &x : l) {
        cin >> x;
        low = max(low, x - 1);
        high += x + 1;
    }
    auto ok = [&](long long width) {
        int lines = 1;
        long long used = 0;
        for (long long x : l) {
            long long need = (used == 0 ? x : x + 1);
            if (used + need <= width) {
                used += need;
            } else {
                ++lines;
                used = x;
            }
        }
        return lines <= m;
    };
    while (high - low > 1) {
        long long mid = (low + high) / 2;
        if (ok(mid)) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc320_d", {
    algorithm: "把已知相对位置看作带权无向边。从 1 号点坐标 (0,0) 出发 BFS/DFS，沿边推导所有可达点坐标，不可达点输出 undecidable。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<tuple<int, long long, long long>>> g(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        long long x, y;
        cin >> a >> b >> x >> y;
        --a; --b;
        g[a].push_back({b, x, y});
        g[b].push_back({a, -x, -y});
    }

    vector<long long> px(n), py(n);
    vector<int> seen(n, 0);
    queue<int> q;
    seen[0] = 1;
    q.push(0);
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        for (auto [to, dx, dy] : g[v]) {
            if (seen[to]) continue;
            seen[to] = 1;
            px[to] = px[v] + dx;
            py[to] = py[v] + dy;
            q.push(to);
        }
    }

    for (int i = 0; i < n; ++i) {
        if (!seen[i]) cout << "undecidable" << '\\n';
        else cout << px[i] << ' ' << py[i] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc321_d", {
    algorithm: "排序 B 并求前缀和。对每个 A_i，二分有多少 B_j 满足 A_i+B_j<P，小于 P 的部分直接累加，剩余部分每对贡献 P。",
    complexity: "O((N+M) log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    long long p;
    cin >> n >> m >> p;
    vector<long long> a(n), b(m), prefix(m + 1, 0);
    for (long long &x : a) cin >> x;
    for (long long &x : b) cin >> x;
    sort(b.begin(), b.end());
    for (int i = 0; i < m; ++i) prefix[i + 1] = prefix[i] + b[i];

    long long answer = 0;
    for (long long x : a) {
        int cnt = lower_bound(b.begin(), b.end(), p - x) - b.begin();
        answer += x * cnt + prefix[cnt];
        answer += p * (m - cnt);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc321_c", {
    algorithm: "所有 321-like 数对应一个非空数字集合，把集合中的数字按降序排列即可。枚举 0..9 的所有非空子集，排序后取第 K 个。",
    complexity: "O(2^10 log 2^10)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int k;
    cin >> k;
    vector<long long> numbers;
    for (int mask = 1; mask < (1 << 10); ++mask) {
        long long value = 0;
        for (int digit = 9; digit >= 0; --digit) {
            if (mask >> digit & 1) value = value * 10 + digit;
        }
        numbers.push_back(value);
    }
    sort(numbers.begin(), numbers.end());
    cout << numbers[k] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc321_e", {
    algorithm: "计算某个节点向下走 d 步能到达多少编号不超过 N 的节点。沿 X 向祖先枚举，同时把来自上一层路径的兄弟子树贡献加进答案。",
    complexity: "O(T log N)",
    code: `${CPP_INCLUDES}
using namespace std;

long long countBelow(long long n, long long node, long long depth) {
    if (node > n || depth < 0) return 0;
    long long left = node, right = node;
    for (long long i = 0; i < depth; ++i) {
        if (left > n / 2 + 1) return 0;
        left *= 2;
        right = right * 2 + 1;
        if (left > n) return 0;
        right = min(right, n);
    }
    return max(0LL, right - left + 1);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tc;
    cin >> tc;
    while (tc--) {
        long long n, x, k;
        cin >> n >> x >> k;
        long long answer = countBelow(n, x, k);
        long long child = x;
        while (x > 1 && k > 0) {
            long long parent = x / 2;
            --k;
            if (k == 0) {
                ++answer;
            } else {
                long long sibling = parent * 2 + (child == parent * 2 ? 1 : 0);
                answer += countBelow(n, sibling, k - 1);
            }
            child = parent;
            x = parent;
        }
        cout << answer << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc321_f", {
    algorithm: "维护当前多重集合的子集和计数 dp。加入 x 时从大到小转移，删除 x 时从小到大反向扣除贡献。",
    complexity: "O(QK)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q, k;
    cin >> q >> k;
    vector<long long> dp(k + 1, 0);
    dp[0] = 1;
    while (q--) {
        char op;
        int x;
        cin >> op >> x;
        if (op == '+') {
            for (int sum = k; sum >= x; --sum) {
                dp[sum] = (dp[sum] + dp[sum - x]) % MOD;
            }
        } else {
            for (int sum = x; sum <= k; ++sum) {
                dp[sum] = (dp[sum] - dp[sum - x] + MOD) % MOD;
            }
        }
        cout << dp[k] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc323_e", {
    algorithm: "dp[t] 表示恰好在时刻 t 开始播放某首歌的概率。枚举开始时刻向后转移，答案累加在 X 时刻仍处于第 1 首歌播放中的开始时刻概率。",
    complexity: "O(NX)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, x;
    cin >> n >> x;
    vector<int> t(n);
    for (int &v : t) cin >> v;
    long long invN = modPow(n, MOD - 2);
    vector<long long> dp(x + 1, 0);
    dp[0] = 1;
    for (int time = 0; time <= x; ++time) {
        for (int song = 0; song < n; ++song) {
            int next = time + t[song];
            if (next <= x) dp[next] = (dp[next] + dp[time] * invN) % MOD;
        }
    }
    long long answer = 0;
    for (int start = max(0, x - t[0] + 1); start <= x; ++start) {
        answer = (answer + dp[start] * invN) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc324_e", {
    algorithm: "对每个字符串分别求从左能匹配 T 的前缀长度、从右能匹配 T 的后缀长度。排序后缀长度，统计 prefix+suffix>=|T| 的有序对数量。",
    complexity: "O(总长度 + N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string t;
    cin >> n >> t;
    int m = t.size();
    vector<int> pref(n), suff(n);
    for (int i = 0; i < n; ++i) {
        string s;
        cin >> s;
        int p = 0;
        for (char ch : s) {
            if (p < m && ch == t[p]) ++p;
        }
        pref[i] = p;
        int q = m - 1;
        for (int j = (int)s.size() - 1; j >= 0; --j) {
            if (q >= 0 && s[j] == t[q]) --q;
        }
        suff[i] = m - 1 - q;
    }
    sort(suff.begin(), suff.end());
    long long answer = 0;
    for (int p : pref) {
        answer += suff.end() - lower_bound(suff.begin(), suff.end(), m - p);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc325_e", {
    algorithm: "可以先坐车再换火车。用车资边权从 1 跑 Dijkstra，用火车边权从 N 反向跑 Dijkstra，枚举换乘城市合并两段最短路。",
    complexity: "O(N^2 log N)",
    code: `${CPP_INCLUDES}
using namespace std;

vector<long long> dijkstra(const vector<vector<long long>> &d, long long mul, long long add, int start) {
    int n = d.size();
    const long long INF = 4e18;
    vector<long long> dist(n, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[start] = 0;
    pq.push({0, start});
    while (!pq.empty()) {
        auto [cost, v] = pq.top();
        pq.pop();
        if (cost != dist[v]) continue;
        for (int to = 0; to < n; ++to) {
            long long next = cost + d[v][to] * mul + add;
            if (next < dist[to]) {
                dist[to] = next;
                pq.push({next, to});
            }
        }
    }
    return dist;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long a, b, c;
    cin >> n >> a >> b >> c;
    vector<vector<long long>> d(n, vector<long long>(n));
    for (auto &row : d) for (long long &x : row) cin >> x;
    auto car = dijkstra(d, a, 0, 0);
    auto train = dijkstra(d, b, c, n - 1);
    long long answer = 4e18;
    for (int i = 0; i < n; ++i) answer = min(answer, car[i] + train[i]);
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc328_f", {
    algorithm: "带权并查集维护 potential[v]-potential[root]。查询要求 weight[y]-weight[x]=d；不连通则合并，已连通则检查差值是否一致。",
    complexity: "O(Q α(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct WeightedDSU {
    vector<int> parent, size;
    vector<long long> diff;
    WeightedDSU(int n) : parent(n), size(n, 1), diff(n, 0) { iota(parent.begin(), parent.end(), 0); }
    int find(int x) {
        if (parent[x] == x) return x;
        int r = find(parent[x]);
        diff[x] += diff[parent[x]];
        return parent[x] = r;
    }
    long long weight(int x) {
        find(x);
        return diff[x];
    }
    bool same(int a, int b) { return find(a) == find(b); }
    void unite(int a, int b, long long w) {
        w += weight(a) - weight(b);
        a = find(a);
        b = find(b);
        if (a == b) return;
        if (size[a] < size[b]) {
            swap(a, b);
            w = -w;
        }
        parent[b] = a;
        diff[b] = w;
        size[a] += size[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    WeightedDSU dsu(n);
    vector<int> answer;
    for (int i = 1; i <= q; ++i) {
        int a, b;
        long long d;
        cin >> a >> b >> d;
        --a; --b;
        bool ok = true;
        if (dsu.same(a, b)) {
            ok = dsu.weight(b) - dsu.weight(a) == d;
        } else {
            dsu.unite(a, b, d);
        }
        if (ok) answer.push_back(i);
    }
    for (int i = 0; i < (int)answer.size(); ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc329_f", {
    algorithm: "每个盒子维护颜色 set。把 A 合并进 B 时采用小并大；若需要可先交换两个 set，再把 A 的元素插入 B 并清空 A。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<set<int>> box(n);
    for (int i = 0; i < n; ++i) {
        int c;
        cin >> c;
        box[i].insert(c);
    }
    while (q--) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        if (box[a].size() > box[b].size()) swap(box[a], box[b]);
        for (int color : box[a]) box[b].insert(color);
        box[a].clear();
        cout << box[b].size() << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc330_e", {
    algorithm: "只关心 0..N 的出现次数，维护当前缺失值集合。单点更新时调整旧值和新值的计数，集合最小值就是 mex。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> a(n), count(n + 2, 0);
    for (int &x : a) {
        cin >> x;
        if (x <= n) ++count[x];
    }
    set<int> missing;
    for (int i = 0; i <= n; ++i) if (count[i] == 0) missing.insert(i);
    while (q--) {
        int index, x;
        cin >> index >> x;
        --index;
        if (a[index] <= n) {
            --count[a[index]];
            if (count[a[index]] == 0) missing.insert(a[index]);
        }
        a[index] = x;
        if (a[index] <= n) {
            if (count[a[index]] == 0) missing.erase(a[index]);
            ++count[a[index]];
        }
        cout << *missing.begin() << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc331_e", {
    algorithm: "把主菜按价格降序排列。对每个副菜，从最贵主菜开始找第一个未被禁止的组合；每个副菜最多跳过与它相关的禁止组合。",
    complexity: "O((N+M+L) log L + 跳过次数)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, l;
    cin >> n >> m >> l;
    vector<long long> a(n), b(m);
    for (long long &x : a) cin >> x;
    for (long long &x : b) cin >> x;
    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    sort(order.begin(), order.end(), [&](int i, int j) { return a[i] > a[j]; });
    set<pair<int, int>> banned;
    for (int i = 0; i < l; ++i) {
        int c, d;
        cin >> c >> d;
        banned.insert({c - 1, d - 1});
    }
    long long answer = 0;
    for (int j = 0; j < m; ++j) {
        for (int i : order) {
            if (!banned.count({i, j})) {
                answer = max(answer, a[i] + b[j]);
                break;
            }
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc334_e", {
    algorithm: "先对绿色格子并查集求当前连通块数。枚举每个红格，涂绿后新连通块数为 base+1-相邻不同绿色块数量，取平均值。",
    complexity: "O(HW α(HW))",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long result = 1;
    while (e > 0) {
        if (e & 1) result = result * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return result;
}

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    for (string &row : grid) cin >> row;
    auto id = [&](int y, int x) { return y * w + x; };
    DSU dsu(h * w);
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    int green = 0, components = 0;
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (grid[y][x] == '#') {
                ++green;
                ++components;
            }
        }
    }
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (grid[y][x] != '#') continue;
            for (int dir = 0; dir < 4; ++dir) {
                int ny = y + dy[dir], nx = x + dx[dir];
                if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] != '#') continue;
                if (dsu.unite(id(y, x), id(ny, nx))) --components;
            }
        }
    }
    long long sum = 0, red = h * w - green;
    for (int y = 0; y < h; ++y) {
        for (int x = 0; x < w; ++x) {
            if (grid[y][x] == '#') continue;
            set<int> adjacent;
            for (int dir = 0; dir < 4; ++dir) {
                int ny = y + dy[dir], nx = x + dx[dir];
                if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] != '#') continue;
                adjacent.insert(dsu.find(id(ny, nx)));
            }
            sum = (sum + components + 1 - (long long)adjacent.size()) % MOD;
        }
    }
    cout << sum * modPow(red, MOD - 2) % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc338_e", {
    algorithm: "把每条弦的两个端点规范成 l<r。沿圆周扫描端点：左端点入栈，右端点必须正好匹配栈顶；否则存在交叉。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> first(2 * n, -1), chordAt(2 * n, -1);
    for (int i = 0; i < n; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        if (a > b) swap(a, b);
        first[a] = i;
        chordAt[a] = chordAt[b] = i;
    }
    vector<int> stack;
    for (int pos = 0; pos < 2 * n; ++pos) {
        int id = chordAt[pos];
        if (first[pos] == id) {
            stack.push_back(id);
        } else {
            if (stack.empty() || stack.back() != id) {
                cout << "Yes" << '\\n';
                return 0;
            }
            stack.pop_back();
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc339_e", {
    algorithm: "dp[value] 表示以某值结尾的最长平滑子序列。对每个 A_i 查询区间 [A_i-D,A_i+D] 的最大 dp，再更新 A_i。",
    complexity: "O(N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

struct SegTree {
    int size = 1;
    vector<int> data;
    SegTree(int n) {
        while (size < n) size <<= 1;
        data.assign(size * 2, 0);
    }
    void update(int pos, int value) {
        pos += size;
        data[pos] = max(data[pos], value);
        for (pos >>= 1; pos; pos >>= 1) data[pos] = max(data[pos * 2], data[pos * 2 + 1]);
    }
    int query(int l, int r) {
        int result = 0;
        l += size;
        r += size;
        while (l < r) {
            if (l & 1) result = max(result, data[l++]);
            if (r & 1) result = max(result, data[--r]);
            l >>= 1;
            r >>= 1;
        }
        return result;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, d;
    cin >> n >> d;
    const int MAXV = 500000;
    SegTree seg(MAXV + 1);
    int answer = 0;
    for (int i = 0; i < n; ++i) {
        int a;
        cin >> a;
        int best = seg.query(max(0, a - d), min(MAXV, a + d) + 1) + 1;
        seg.update(a, best);
        answer = max(answer, best);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc322_d", {
    algorithm: "枚举三个 4x4 多联块的旋转和平移，若所有黑格都落在 4x4 目标区域内且恰好覆盖 16 个格子一次，则可行。",
    complexity: "常数级枚举",
    code: `${CPP_INCLUDES}
using namespace std;

vector<pair<int, int>> rotateCells(vector<pair<int, int>> cells) {
    for (auto &[y, x] : cells) {
        int ny = x;
        int nx = 3 - y;
        y = ny;
        x = nx;
    }
    return cells;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<vector<pair<int, int>>> piece(3);
    for (int p = 0; p < 3; ++p) {
        for (int i = 0; i < 4; ++i) {
            string row;
            cin >> row;
            for (int j = 0; j < 4; ++j) if (row[j] == '#') piece[p].push_back({i, j});
        }
    }
    int total = 0;
    for (auto &cells : piece) total += cells.size();
    if (total != 16) {
        cout << "No" << '\\n';
        return 0;
    }

    vector<vector<vector<pair<int, int>>>> rotations(3);
    for (int p = 0; p < 3; ++p) {
        auto cur = piece[p];
        for (int r = 0; r < 4; ++r) {
            rotations[p].push_back(cur);
            cur = rotateCells(cur);
        }
    }

    for (auto a : rotations[0]) for (auto b : rotations[1]) for (auto c : rotations[2]) {
        for (int ay = -3; ay <= 3; ++ay) for (int ax = -3; ax <= 3; ++ax) {
            for (int by = -3; by <= 3; ++by) for (int bx = -3; bx <= 3; ++bx) {
                for (int cy = -3; cy <= 3; ++cy) for (int cx = -3; cx <= 3; ++cx) {
                    vector<vector<int>> board(4, vector<int>(4, 0));
                    bool ok = true;
                    auto put = [&](const vector<pair<int, int>> &cells, int dy, int dx) {
                        for (auto [y, x] : cells) {
                            y += dy;
                            x += dx;
                            if (y < 0 || y >= 4 || x < 0 || x >= 4) {
                                ok = false;
                                continue;
                            }
                            ++board[y][x];
                        }
                    };
                    put(a, ay, ax);
                    put(b, by, bx);
                    put(c, cy, cx);
                    for (int i = 0; i < 4; ++i) for (int j = 0; j < 4; ++j) ok = ok && board[i][j] == 1;
                    if (ok) {
                        cout << "Yes" << '\\n';
                        return 0;
                    }
                }
            }
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc322_e", {
    algorithm: "P 和 K 很小，把每个能力值截断到 K 后编码为状态。对每个开发方案做 0/1 背包式转移，求全能力达到 K 的最小费用。",
    complexity: "O(N P (K+1)^P)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, dimension, target;
    cin >> n >> dimension >> target;
    int states = 1;
    for (int i = 0; i < dimension; ++i) states *= target + 1;
    const long long INF = 4e18;
    vector<long long> dp(states, INF);
    dp[0] = 0;

    auto decode = [&](int state) {
        vector<int> values(dimension);
        for (int i = 0; i < dimension; ++i) {
            values[i] = state % (target + 1);
            state /= target + 1;
        }
        return values;
    };
    auto encode = [&](const vector<int> &values) {
        int state = 0, mul = 1;
        for (int value : values) {
            state += value * mul;
            mul *= target + 1;
        }
        return state;
    };

    for (int i = 0; i < n; ++i) {
        long long cost;
        cin >> cost;
        vector<int> add(dimension);
        for (int &x : add) cin >> x;
        vector<long long> next = dp;
        for (int state = 0; state < states; ++state) {
            if (dp[state] == INF) continue;
            auto values = decode(state);
            for (int j = 0; j < dimension; ++j) values[j] = min(target, values[j] + add[j]);
            int ns = encode(values);
            next[ns] = min(next[ns], dp[state] + cost);
        }
        dp.swap(next);
    }

    cout << (dp[states - 1] == INF ? -1 : dp[states - 1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc323_d", {
    algorithm: "同尺寸史莱姆两个可以合成一个双倍尺寸。按尺寸从小到大处理出现次数，将 count/2 进位到 2S，count%2 留作最终数量。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<long long, long long> count;
    for (int i = 0; i < n; ++i) {
        long long s, c;
        cin >> s >> c;
        count[s] += c;
    }
    long long answer = 0;
    while (!count.empty()) {
        auto [size, c] = *count.begin();
        count.erase(count.begin());
        answer += c % 2;
        if (c >= 2) count[size * 2] += c / 2;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc324_d", {
    algorithm: "枚举所有位数不超过 N 的平方数，统计其数字多重集，允许前导零补足到 N 位；与 S 的数字多重集相同则计数。",
    complexity: "O(sqrt(10^N) * N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    array<int, 10> target{};
    for (char ch : s) ++target[ch - '0'];
    long long limit = 1;
    for (int i = 0; i < n; ++i) limit *= 10;

    int answer = 0;
    for (long long x = 0; x * x < limit; ++x) {
        long long value = x * x;
        array<int, 10> count{};
        string t = to_string(value);
        count[0] += n - (int)t.size();
        for (char ch : t) ++count[ch - '0'];
        if (count == target) ++answer;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc325_d", {
    algorithm: "按出现时间排序任务，维护当前可打印任务的截止时间小根堆。每个时间点打印截止最早且未过期的任务，空堆时跳到下一任务时间。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<long long, long long>> jobs(n);
    for (auto &[t, deadline] : jobs) {
        long long d;
        cin >> t >> d;
        deadline = t + d;
    }
    sort(jobs.begin(), jobs.end());
    priority_queue<long long, vector<long long>, greater<long long>> pq;
    long long time = 0, answer = 0;
    int i = 0;
    while (i < n || !pq.empty()) {
        if (pq.empty() && i < n) time = max(time, jobs[i].first);
        while (i < n && jobs[i].first <= time) pq.push(jobs[i++].second);
        while (!pq.empty() && pq.top() < time) pq.pop();
        if (!pq.empty()) {
            pq.pop();
            ++answer;
            ++time;
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc327_d", {
    algorithm: "把每个约束 A_i 与 B_i 相连，要求图二分。对每个连通块 BFS 染色，若存在同色边则不可能。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> a(m), b(m);
    for (int &x : a) {
        cin >> x;
        --x;
    }
    for (int &x : b) {
        cin >> x;
        --x;
    }
    vector<vector<int>> g(n);
    for (int i = 0; i < m; ++i) {
        g[a[i]].push_back(b[i]);
        g[b[i]].push_back(a[i]);
    }
    vector<int> color(n, -1);
    for (int s = 0; s < n; ++s) {
        if (color[s] != -1) continue;
        queue<int> q;
        color[s] = 0;
        q.push(s);
        while (!q.empty()) {
            int v = q.front();
            q.pop();
            for (int to : g[v]) {
                if (color[to] == -1) {
                    color[to] = color[v] ^ 1;
                    q.push(to);
                } else if (color[to] == color[v]) {
                    cout << "No" << '\\n';
                    return 0;
                }
            }
        }
    }
    cout << "Yes" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc331_d", {
    algorithm: "无限平面由 N x N 图案周期平铺。先求一个周期的二维前缀和，再用整块数量和剩余边角计算 [0,r) x [0,c) 的黑格数。",
    complexity: "O(N^2+Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<string> p(n);
    for (string &row : p) cin >> row;
    vector<vector<long long>> pref(n + 1, vector<long long>(n + 1, 0));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            pref[i + 1][j + 1] = pref[i + 1][j] + pref[i][j + 1] - pref[i][j] + (p[i][j] == 'B');
        }
    }
    long long all = pref[n][n];
    auto block = [&](int r, int c) {
        return pref[r][c];
    };
    auto countBlack = [&](long long r, long long c) {
        long long fullR = r / n, remR = r % n;
        long long fullC = c / n, remC = c % n;
        long long result = fullR * fullC * all;
        result += fullR * block(n, remC);
        result += fullC * block(remR, n);
        result += block(remR, remC);
        return result;
    };

    while (q--) {
        long long a, b, c, d;
        cin >> a >> b >> c >> d;
        ++c; ++d;
        cout << countBlack(c, d) - countBlack(a, d) - countBlack(c, b) + countBlack(a, b) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc332_d", {
    algorithm: "H,W 很小，枚举行排列和列排列。若变换后 A 等于 B，则操作次数为两个排列的逆序数之和，取最小值。",
    complexity: "O(H! W! HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int inversions(const vector<int> &p) {
    int result = 0;
    for (int i = 0; i < (int)p.size(); ++i) {
        for (int j = i + 1; j < (int)p.size(); ++j) {
            if (p[i] > p[j]) ++result;
        }
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<vector<int>> a(h, vector<int>(w)), b(h, vector<int>(w));
    for (auto &row : a) for (int &x : row) cin >> x;
    for (auto &row : b) for (int &x : row) cin >> x;
    vector<int> rows(h), cols(w);
    iota(rows.begin(), rows.end(), 0);
    iota(cols.begin(), cols.end(), 0);
    int answer = 1e9;
    do {
        do {
            bool ok = true;
            for (int i = 0; i < h; ++i) {
                for (int j = 0; j < w; ++j) {
                    if (a[rows[i]][cols[j]] != b[i][j]) ok = false;
                }
            }
            if (ok) answer = min(answer, inversions(rows) + inversions(cols));
        } while (next_permutation(cols.begin(), cols.end()));
        iota(cols.begin(), cols.end(), 0);
    } while (next_permutation(rows.begin(), rows.end()));
    cout << (answer == (int)1e9 ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc334_c", {
    algorithm: "若 K 为偶数，按相邻配对最优。若 K 为奇数，枚举一个袜子不配对，左右两侧各自按相邻配对，用前后缀配对代价合并。",
    complexity: "O(K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<long long> a(k);
    for (long long &x : a) cin >> x;
    const long long INF = 4e18;
    vector<long long> prefix(k + 1, INF), suffix(k + 1, INF);
    prefix[0] = 0;
    for (int i = 0; i + 1 < k; i += 2) {
        prefix[i + 2] = prefix[i] + a[i + 1] - a[i];
    }
    suffix[k] = 0;
    for (int i = k - 2; i >= 0; i -= 2) {
        suffix[i] = suffix[i + 2] + a[i + 1] - a[i];
    }
    if (k % 2 == 0) {
        cout << prefix[k] << '\\n';
        return 0;
    }
    long long answer = INF;
    for (int skip = 0; skip < k; ++skip) {
        if (prefix[skip] == INF || suffix[skip + 1] == INF) continue;
        answer = min(answer, prefix[skip] + suffix[skip + 1]);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc336_d", {
    algorithm: "从左到右求每个位置能形成的递增高度上限，从右到左同理。以 i 为顶的高度是两侧上限的较小值。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n), left(n), right(n);
    for (int &x : a) cin >> x;
    for (int i = 0; i < n; ++i) {
        left[i] = min(a[i], (i == 0 ? 1 : left[i - 1] + 1));
    }
    for (int i = n - 1; i >= 0; --i) {
        right[i] = min(a[i], (i + 1 == n ? 1 : right[i + 1] + 1));
    }
    int answer = 0;
    for (int i = 0; i < n; ++i) answer = max(answer, min(left[i], right[i]));
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc338_d", {
    algorithm: "先假设每段移动都走较短方向，得到基础代价。若删除的桥在该较短路径上，就必须改走另一方向，把差值对该路径上的桥做区间加法，最后取最小总成本。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> x(m);
    for (int &v : x) {
        cin >> v;
        --v;
    }
    vector<long long> diff(n + 1, 0);
    auto addRange = [&](int l, int r, long long value) {
        if (l < r) {
            diff[l] += value;
            diff[r] -= value;
        } else if (l > r) {
            diff[l] += value;
            diff[n] -= value;
            diff[0] += value;
            diff[r] -= value;
        }
    };

    long long base = 0;
    for (int i = 0; i + 1 < m; ++i) {
        int a = x[i], b = x[i + 1];
        int clockwise = (b - a + n) % n;
        int counter = n - clockwise;
        if (clockwise <= counter) {
            base += clockwise;
            addRange(a, b, counter - clockwise);
        } else {
            base += counter;
            addRange(b, a, clockwise - counter);
        }
    }
    long long answer = 4e18, cur = 0;
    for (int i = 0; i < n; ++i) {
        cur += diff[i];
        answer = min(answer, base + cur);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc339_d", {
    algorithm: "两个玩家的位置共同构成 BFS 状态。每一步两人尝试同方向移动，撞墙或越界则原地不动，第一次位置相同即最短步数。",
    complexity: "O(N^4)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<string> grid(n);
    vector<pair<int, int>> players;
    for (int i = 0; i < n; ++i) {
        cin >> grid[i];
        for (int j = 0; j < n; ++j) if (grid[i][j] == 'P') players.push_back({i, j});
    }
    auto id = [&](int a, int b, int c, int d) {
        return ((a * n + b) * n + c) * n + d;
    };
    int total = n * n * n * n;
    vector<int> dist(total, -1);
    queue<array<int, 4>> q;
    auto [y1, x1] = players[0];
    auto [y2, x2] = players[1];
    dist[id(y1, x1, y2, x2)] = 0;
    q.push({y1, x1, y2, x2});
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!q.empty()) {
        auto [a, b, c, d] = q.front();
        q.pop();
        int current = dist[id(a, b, c, d)];
        if (a == c && b == d) {
            cout << current << '\\n';
            return 0;
        }
        for (int dir = 0; dir < 4; ++dir) {
            int na = a + dy[dir], nb = b + dx[dir];
            int nc = c + dy[dir], nd = d + dx[dir];
            if (na < 0 || na >= n || nb < 0 || nb >= n || grid[na][nb] == '#') {
                na = a; nb = b;
            }
            if (nc < 0 || nc >= n || nd < 0 || nd >= n || grid[nc][nd] == '#') {
                nc = c; nd = d;
            }
            int nextId = id(na, nb, nc, nd);
            if (dist[nextId] != -1) continue;
            dist[nextId] = current + 1;
            q.push({na, nb, nc, nd});
        }
    }
    cout << -1 << '\\n';
    return 0;
}
`
  }],
  ["AT_abc340_d", {
    algorithm: "每个关卡有两条有向边：到 i+1 代价 A_i，传送到 X_i 代价 B_i。跑 Dijkstra 求到 N 的最短路。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, long long>>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        long long a, b;
        int x;
        cin >> a >> b >> x;
        g[i].push_back({i + 1, a});
        g[i].push_back({x - 1, b});
    }
    const long long INF = 4e18;
    vector<long long> dist(n, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[0] = 0;
    pq.push({0, 0});
    while (!pq.empty()) {
        auto [d, v] = pq.top();
        pq.pop();
        if (d != dist[v]) continue;
        for (auto [to, cost] : g[v]) {
            if (dist[to] <= d + cost) continue;
            dist[to] = d + cost;
            pq.push({dist[to], to});
        }
    }
    cout << dist[n - 1] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc341_e", {
    algorithm: "翻转一段 01 串时，段内相邻是否相同不变，只会影响左右边界。维护相邻相同位置的 Fenwick，查询区间内是否存在相同相邻对。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Fenwick {
    int n;
    vector<int> bit;
    Fenwick(int n) : n(n), bit(n + 1, 0) {}
    void add(int index, int value) {
        for (++index; index <= n; index += index & -index) bit[index] += value;
    }
    int sumPrefix(int index) const {
        int result = 0;
        for (++index; index > 0; index -= index & -index) result += bit[index];
        return result;
    }
    int rangeSum(int l, int r) const {
        if (r < l) return 0;
        return sumPrefix(r) - (l ? sumPrefix(l - 1) : 0);
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    string s;
    cin >> n >> q >> s;
    Fenwick fw(n);
    vector<int> bad(n, 0);
    auto setBad = [&](int i) {
        if (i < 0 || i + 1 >= n) return;
        int next = s[i] == s[i + 1];
        if (next != bad[i]) {
            fw.add(i, next - bad[i]);
            bad[i] = next;
        }
    };
    auto flipBad = [&](int i) {
        if (i < 0 || i + 1 >= n) return;
        int next = bad[i] ^ 1;
        fw.add(i, next - bad[i]);
        bad[i] = next;
    };
    for (int i = 0; i + 1 < n; ++i) setBad(i);
    while (q--) {
        int type, l, r;
        cin >> type >> l >> r;
        --l; --r;
        if (type == 1) {
            flipBad(l - 1);
            flipBad(r);
        } else {
            cout << (fw.rangeSum(l, r - 1) == 0 ? "Yes" : "No") << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc344_d", {
    algorithm: "dp[i] 表示拼出 T 的前 i 个字符所需最少袋数。逐袋处理，每个袋子可选一个字符串或不选，匹配当前位置时转移到更长前缀。",
    complexity: "O(袋内字符串总长度 * |T|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string t;
    cin >> t;
    int n;
    cin >> n;
    int m = t.size();
    const int INF = 1e9;
    vector<int> dp(m + 1, INF);
    dp[0] = 0;
    for (int bag = 0; bag < n; ++bag) {
        int a;
        cin >> a;
        vector<string> words(a);
        for (string &word : words) cin >> word;
        vector<int> next = dp;
        for (int pos = 0; pos <= m; ++pos) {
            if (dp[pos] == INF) continue;
            for (const string &word : words) {
                if (pos + (int)word.size() <= m && t.compare(pos, word.size(), word) == 0) {
                    next[pos + word.size()] = min(next[pos + word.size()], dp[pos] + 1);
                }
            }
        }
        dp.swap(next);
    }
    cout << (dp[m] == INF ? -1 : dp[m]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc344_e", {
    algorithm: "用双向链表模拟序列，并用 map 记录每个值对应的节点位置。插入和删除都只需修改相邻指针。",
    complexity: "O((N+Q) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<int, int> id;
    vector<int> value(1, -1), prevNode(1, -1), nextNode(1, -1);
    int head = 0, tail = 0;
    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        int node = value.size();
        value.push_back(x);
        prevNode.push_back(tail);
        nextNode.push_back(-1);
        nextNode[tail] = node;
        tail = node;
        id[x] = node;
    }
    int q;
    cin >> q;
    while (q--) {
        int type, x;
        cin >> type >> x;
        if (type == 1) {
            int y;
            cin >> y;
            int node = id[x];
            int after = nextNode[node];
            int added = value.size();
            value.push_back(y);
            prevNode.push_back(node);
            nextNode.push_back(after);
            nextNode[node] = added;
            if (after != -1) prevNode[after] = added;
            else tail = added;
            id[y] = added;
        } else {
            int node = id[x];
            int before = prevNode[node], after = nextNode[node];
            nextNode[before] = after;
            if (after != -1) prevNode[after] = before;
            else tail = before;
            id.erase(x);
        }
    }
    bool first = true;
    for (int node = nextNode[head]; node != -1; node = nextNode[node]) {
        if (!first) cout << ' ';
        first = false;
        cout << value[node];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc346_e", {
    algorithm: "倒序处理染色操作。某行或列若第一次在倒序中出现，它会贡献仍未被覆盖的列数或行数到该颜色；最后剩余未覆盖格子属于颜色 0。",
    complexity: "O(N+M+Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, m;
    cin >> h >> w >> m;
    vector<tuple<int, int, int>> ops(m);
    for (auto &[t, a, x] : ops) {
        cin >> t >> a >> x;
        --a;
    }
    vector<int> rowSeen(h, 0), colSeen(w, 0);
    long long rows = h, cols = w;
    map<int, long long> count;
    for (int i = m - 1; i >= 0; --i) {
        auto [t, a, x] = ops[i];
        if (t == 1) {
            if (rowSeen[a]) continue;
            rowSeen[a] = 1;
            count[x] += cols;
            --rows;
        } else {
            if (colSeen[a]) continue;
            colSeen[a] = 1;
            count[x] += rows;
            --cols;
        }
    }
    count[0] += rows * cols;
    vector<pair<int, long long>> answer;
    for (auto [color, cells] : count) {
        if (cells > 0) answer.push_back({color, cells});
    }
    cout << answer.size() << '\\n';
    for (auto [color, cells] : answer) cout << color << ' ' << cells << '\\n';
    return 0;
}
`
  }],
  ["AT_abc347_e", {
    algorithm: "记录每次操作后集合大小的前缀和。元素被加入时记录开始时刻，被删除时累计这段时间内集合大小总和，最后处理仍在集合中的元素。",
    complexity: "O(N+Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> inSet(n, 0), start(n, -1);
    vector<long long> answer(n, 0), prefix(q + 1, 0);
    int active = 0;
    for (int time = 0; time < q; ++time) {
        int x;
        cin >> x;
        --x;
        if (!inSet[x]) {
            inSet[x] = 1;
            start[x] = time;
            ++active;
        } else {
            inSet[x] = 0;
            answer[x] += prefix[time] - prefix[start[x]];
            --active;
        }
        prefix[time + 1] = prefix[time] + active;
    }
    for (int x = 0; x < n; ++x) {
        if (inSet[x]) answer[x] += prefix[q] - prefix[start[x]];
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc352_e", {
    algorithm: "每个集合可视为用同一费用连接集合内点的超边。按费用从小到大处理，每个集合把第一个点与其余点尝试合并，成功合并一次就加一次费用。",
    complexity: "O(输入总大小 log M)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<pair<long long, vector<int>>> groups(m);
    for (auto &[cost, nodes] : groups) {
        int k;
        cin >> k >> cost;
        nodes.resize(k);
        for (int &x : nodes) {
            cin >> x;
            --x;
        }
    }
    sort(groups.begin(), groups.end(), [](const auto &a, const auto &b) { return a.first < b.first; });
    DSU dsu(n);
    long long answer = 0;
    int components = n;
    for (auto &[cost, nodes] : groups) {
        for (int i = 1; i < (int)nodes.size(); ++i) {
            if (dsu.unite(nodes[0], nodes[i])) {
                answer += cost;
                --components;
            }
        }
    }
    cout << (components == 1 ? answer : -1) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc353_c", {
    algorithm: "先把所有 A_i+A_j 加入总和，再统计有多少对和至少为 1e8；这些对取模后都要减去 1e8。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    const long long MODV = 100000000;
    vector<long long> a(n);
    long long sum = 0;
    for (long long &x : a) {
        cin >> x;
        sum += x;
    }
    sort(a.begin(), a.end());
    long long over = 0;
    for (int i = 0; i < n; ++i) {
        over += a.end() - lower_bound(a.begin() + i + 1, a.end(), MODV - a[i]);
    }
    cout << sum * (n - 1) - over * MODV << '\\n';
    return 0;
}
`
  }],
  ["AT_abc353_e", {
    algorithm: "所有字符串两两 LCP 之和等于所有前缀节点上已有字符串数量的累加。逐个插入 Trie，经过节点时先加该节点 count 再自增。",
    complexity: "O(总长度)",
    code: `${CPP_INCLUDES}
using namespace std;

struct Node {
    array<int, 26> next{};
    long long count = 0;
    Node() { next.fill(-1); }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<Node> trie(1);
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        string s;
        cin >> s;
        int v = 0;
        for (char ch : s) {
            int c = ch - 'a';
            if (trie[v].next[c] == -1) {
                trie[v].next[c] = trie.size();
                trie.emplace_back();
            }
            v = trie[v].next[c];
            answer += trie[v].count;
            ++trie[v].count;
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc354_e", {
    algorithm: "状态压缩博弈。若当前剩余牌中存在一对数字或颜色相同的牌，使得移除后二者后对手处于必败状态，则当前状态必胜。",
    complexity: "O(2^N N^2)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n), b(n);
    for (int i = 0; i < n; ++i) cin >> a[i] >> b[i];
    vector<int> win(1 << n, 0);
    for (int mask = (1 << n) - 1; mask >= 0; --mask) {
        for (int i = 0; i < n; ++i) if (!(mask >> i & 1)) {
            for (int j = i + 1; j < n; ++j) if (!(mask >> j & 1)) {
                if (a[i] == a[j] || b[i] == b[j]) {
                    int next = mask | (1 << i) | (1 << j);
                    if (!win[next]) win[mask] = 1;
                }
            }
        }
    }
    cout << (win[0] ? "Takahashi" : "Aoki") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc357_e", {
    algorithm: "函数图中每个点可达数量等于到环的链长加环大小。先剥离非环点，给环点赋环大小，再沿反图拓扑回推链上答案。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> to(n), indeg(n, 0);
    vector<vector<int>> rev(n);
    for (int i = 0; i < n; ++i) {
        cin >> to[i];
        --to[i];
        ++indeg[to[i]];
        rev[to[i]].push_back(i);
    }
    queue<int> que;
    vector<int> removed(n, 0);
    for (int i = 0; i < n; ++i) if (indeg[i] == 0) que.push(i);
    while (!que.empty()) {
        int v = que.front();
        que.pop();
        removed[v] = 1;
        if (--indeg[to[v]] == 0) que.push(to[v]);
    }
    vector<long long> answer(n, 0);
    queue<int> bfs;
    for (int i = 0; i < n; ++i) {
        if (removed[i] || answer[i]) continue;
        vector<int> cycle;
        int v = i;
        do {
            cycle.push_back(v);
            v = to[v];
        } while (v != i);
        for (int node : cycle) {
            answer[node] = cycle.size();
            bfs.push(node);
        }
    }
    while (!bfs.empty()) {
        int v = bfs.front();
        bfs.pop();
        for (int from : rev[v]) {
            if (answer[from]) continue;
            answer[from] = answer[v] + 1;
            bfs.push(from);
        }
    }
    cout << accumulate(answer.begin(), answer.end(), 0LL) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc359_d", {
    algorithm: "按位 DP 维护最近 K-1 个字符的 mask。加入新字符后，如果已经形成长度 K 的窗口且该窗口是回文，就丢弃该转移。",
    complexity: "O(N * 2^K)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

bool isPalindromeMask(int mask, int k) {
    for (int i = 0; i < k; ++i) {
        if (((mask >> i) & 1) != ((mask >> (k - 1 - i)) & 1)) return false;
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    string s;
    cin >> n >> k >> s;
    int keep = (1 << max(0, k - 1)) - 1;
    map<int, long long> dp;
    dp[0] = 1;
    for (int pos = 0; pos < n; ++pos) {
        map<int, long long> next;
        for (auto [mask, ways] : dp) {
            for (int bit = 0; bit < 2; ++bit) {
                if (s[pos] != '?' && s[pos] - 'A' != bit) continue;
                int full = (mask << 1) | bit;
                if (pos + 1 >= k && isPalindromeMask(full, k)) continue;
                next[full & keep] = (next[full & keep] + ways) % MOD;
            }
        }
        dp.swap(next);
    }
    long long answer = 0;
    for (auto [_, ways] : dp) answer = (answer + ways) % MOD;
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc341_d", {
    algorithm: "二分答案 x。小于等于 x 且只被 N、M 中一个整除的数有 floor(x/N)+floor(x/M)-2*floor(x/lcm)，取最小满足数量不少于 K 的 x。",
    complexity: "O(log answer)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, m, k;
    cin >> n >> m >> k;
    long long l = lcm(n, m);
    auto count = [&](long long x) {
        return x / n + x / m - 2 * (x / l);
    };
    long long low = 0, high = 4e18;
    while (high - low > 1) {
        long long mid = low + (high - low) / 2;
        if (count(mid) >= k) high = mid;
        else low = mid;
    }
    cout << high << '\\n';
    return 0;
}
`
  }],
  ["AT_abc342_d", {
    algorithm: "0 与任意数相乘都是平方数，单独统计。非零数除去所有平方因子得到平方自由核，两个数乘积为平方当且仅当平方自由核相同。",
    complexity: "O(N sqrt A)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<long long, long long> count;
    long long zeros = 0, answer = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        if (a == 0) {
            answer += i;
            ++zeros;
            continue;
        }
        long long core = a;
        for (long long p = 2; p * p <= core; ++p) {
            while (core % (p * p) == 0) core /= p * p;
        }
        answer += zeros + count[core];
        ++count[core];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc345_d", {
    algorithm: "回溯铺砖。每次找到最靠前的空格，枚举尚未使用的矩形及其两种朝向，能放则递归，所有格子填满即成功。",
    complexity: "指数级搜索，受 H,W,N 很小约束",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, h, w;
    cin >> n >> h >> w;
    vector<int> a(n), b(n);
    for (int i = 0; i < n; ++i) cin >> a[i] >> b[i];
    vector<vector<int>> board(h, vector<int>(w, 0));
    vector<int> used(n, 0);

    auto canPlace = [&](int y, int x, int hh, int ww) {
        if (y + hh > h || x + ww > w) return false;
        for (int i = 0; i < hh; ++i) for (int j = 0; j < ww; ++j) {
            if (board[y + i][x + j]) return false;
        }
        return true;
    };
    auto setPlace = [&](int y, int x, int hh, int ww, int value) {
        for (int i = 0; i < hh; ++i) for (int j = 0; j < ww; ++j) board[y + i][x + j] = value;
    };
    auto dfs = [&](auto &&self) -> bool {
        int y = -1, x = -1;
        for (int i = 0; i < h && y == -1; ++i) {
            for (int j = 0; j < w; ++j) if (!board[i][j]) {
                y = i; x = j; break;
            }
        }
        if (y == -1) return true;
        for (int id = 0; id < n; ++id) {
            if (used[id]) continue;
            used[id] = 1;
            for (auto [hh, ww] : vector<pair<int, int>>{{a[id], b[id]}, {b[id], a[id]}}) {
                if (canPlace(y, x, hh, ww)) {
                    setPlace(y, x, hh, ww, 1);
                    if (self(self)) return true;
                    setPlace(y, x, hh, ww, 0);
                }
            }
            used[id] = 0;
        }
        return false;
    };
    cout << (dfs(dfs) ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc346_d", {
    algorithm: "动态规划构造目标 01 串，要求相邻相等的位置恰好出现一次。dp[bit][used] 表示当前最后一位和是否已经出现相等相邻对的最小修改代价。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    vector<long long> c(n);
    for (long long &x : c) cin >> x;
    const long long INF = 4e18;
    long long dp[2][2];
    for (auto &row : dp) for (long long &v : row) v = INF;
    for (int bit = 0; bit < 2; ++bit) dp[bit][0] = (s[0] - '0' != bit ? c[0] : 0);
    for (int i = 1; i < n; ++i) {
        long long ndp[2][2];
        for (auto &row : ndp) for (long long &v : row) v = INF;
        for (int prev = 0; prev < 2; ++prev) for (int used = 0; used < 2; ++used) {
            if (dp[prev][used] == INF) continue;
            for (int bit = 0; bit < 2; ++bit) {
                int nextUsed = used + (prev == bit);
                if (nextUsed > 1) continue;
                long long cost = (s[i] - '0' != bit ? c[i] : 0);
                ndp[bit][nextUsed] = min(ndp[bit][nextUsed], dp[prev][used] + cost);
            }
        }
        for (int bit = 0; bit < 2; ++bit) for (int used = 0; used < 2; ++used) dp[bit][used] = ndp[bit][used];
    }
    cout << min(dp[0][1], dp[1][1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc347_c", {
    algorithm: "把所有日期映射到一周长度 A+B 的环上。若这些点能被某个长度 A 的连续区间覆盖，则存在理想假期；等价于最大环形空隙之外的跨度不超过 A。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long a, b;
    cin >> n >> a >> b;
    long long cycle = a + b;
    vector<long long> d(n);
    for (long long &x : d) {
        cin >> x;
        x = (x - 1) % cycle;
    }
    sort(d.begin(), d.end());
    d.erase(unique(d.begin(), d.end()), d.end());
    long long maxGap = 0;
    for (int i = 0; i < (int)d.size(); ++i) {
        long long cur = d[i];
        long long nxt = d[(i + 1) % d.size()] + (i + 1 == (int)d.size() ? cycle : 0);
        maxGap = max(maxGap, nxt - cur);
    }
    cout << (cycle - maxGap < a ? "Yes" : "No") << '\\n';
    return 0;
}
`
  }],
  ["AT_abc347_d", {
    algorithm: "设 C 中 1 位数量为 pc。异或为 1 的位必须分别给 X/Y；异或为 0 的位可同时为 1。根据 popcount 约束计算共同 1 的数量并构造。",
    complexity: "O(60)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b, c;
    cin >> a >> b >> c;
    int pc = __builtin_popcountll(c);
    long long common = a + b - pc;
    if (common < 0 || common % 2 != 0) {
        cout << -1 << '\\n';
        return 0;
    }
    common /= 2;
    long long onlyX = a - common;
    long long onlyY = b - common;
    if (onlyX < 0 || onlyY < 0 || onlyX + onlyY != pc) {
        cout << -1 << '\\n';
        return 0;
    }
    long long x = 0, y = 0;
    for (int bit = 0; bit < 60; ++bit) {
        if (c >> bit & 1LL) {
            if (onlyX > 0) {
                x |= 1LL << bit;
                --onlyX;
            } else {
                y |= 1LL << bit;
                --onlyY;
            }
        }
    }
    for (int bit = 0; bit < 60 && common > 0; ++bit) {
        if ((c >> bit & 1LL) == 0) {
            x |= 1LL << bit;
            y |= 1LL << bit;
            --common;
        }
    }
    if (common != 0 || __builtin_popcountll(x) != a || __builtin_popcountll(y) != b || (x ^ y) != c) {
        cout << -1 << '\\n';
    } else {
        cout << x << ' ' << y << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc348_d", {
    algorithm: "用最大剩余体力做优先搜索。进入药品格时体力可提升到该药品值；每移动一步体力减一，只扩展能以更高体力到达的状态。",
    complexity: "O(HW log HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    pair<int, int> start, goal;
    for (int i = 0; i < h; ++i) {
        cin >> grid[i];
        for (int j = 0; j < w; ++j) {
            if (grid[i][j] == 'S') start = {i, j};
            if (grid[i][j] == 'T') goal = {i, j};
        }
    }
    vector<vector<int>> medicine(h, vector<int>(w, 0));
    int n;
    cin >> n;
    for (int i = 0; i < n; ++i) {
        int r, c, e;
        cin >> r >> c >> e;
        medicine[r - 1][c - 1] = e;
    }
    vector<vector<int>> best(h, vector<int>(w, -1));
    priority_queue<tuple<int, int, int>> pq;
    int initial = medicine[start.first][start.second];
    best[start.first][start.second] = initial;
    pq.push({initial, start.first, start.second});
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!pq.empty()) {
        auto [energy, y, x] = pq.top();
        pq.pop();
        if (energy != best[y][x]) continue;
        if (make_pair(y, x) == goal) {
            cout << "Yes" << '\\n';
            return 0;
        }
        if (energy == 0) continue;
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy[dir], nx = x + dx[dir];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] == '#') continue;
            int nextEnergy = max(energy - 1, medicine[ny][nx]);
            if (nextEnergy <= best[ny][nx]) continue;
            best[ny][nx] = nextEnergy;
            pq.push({nextEnergy, ny, nx});
        }
    }
    cout << "No" << '\\n';
    return 0;
}
`
  }],
  ["AT_abc348_e", {
    algorithm: "树形换根 DP。先求以 1 为根时所有点到根的加权距离和，以及每个子树权重；沿边换根时答案变化为 totalWeight - 2*subtreeWeight[child]。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> g(n);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
    }
    vector<long long> c(n), sub(n), answer(n);
    for (long long &x : c) cin >> x;
    long long total = accumulate(c.begin(), c.end(), 0LL);
    auto dfs1 = [&](auto &&self, int v, int parent, int depth) -> long long {
        sub[v] = c[v];
        answer[0] += c[v] * depth;
        for (int to : g[v]) if (to != parent) sub[v] += self(self, to, v, depth + 1);
        return sub[v];
    };
    dfs1(dfs1, 0, -1, 0);
    auto dfs2 = [&](auto &&self, int v, int parent) -> void {
        for (int to : g[v]) if (to != parent) {
            answer[to] = answer[v] + total - 2 * sub[to];
            self(self, to, v);
        }
    };
    dfs2(dfs2, 0, -1);
    cout << *min_element(answer.begin(), answer.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc350_d", {
    algorithm: "用并查集合并已有朋友关系。每个连通块最多能有 size*(size-1)/2 条边，减去现有边数就是还可新增的朋友关系数。",
    complexity: "O((N+M) alpha(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    vector<pair<int, int>> edges;
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        dsu.unite(a, b);
        edges.push_back({a, b});
    }
    vector<long long> size(n, 0), edgeCount(n, 0);
    for (int i = 0; i < n; ++i) ++size[dsu.find(i)];
    for (auto [a, _] : edges) ++edgeCount[dsu.find(a)];
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        if (size[i]) answer += size[i] * (size[i] - 1) / 2 - edgeCount[i];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc351_d", {
    algorithm: "先标记与磁铁相邻的危险空格。只能从非危险空格继续扩展；危险空格可被计入当前可达区域但不继续向外扩展。对每个安全连通块统计可达格数。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> s(h);
    for (string &row : s) cin >> row;
    vector<vector<int>> near(h, vector<int>(w, 0)), visited(h, vector<int>(w, 0));
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    for (int y = 0; y < h; ++y) for (int x = 0; x < w; ++x) if (s[y][x] == '#') {
        for (int dir = 0; dir < 4; ++dir) {
            int ny = y + dy[dir], nx = x + dx[dir];
            if (0 <= ny && ny < h && 0 <= nx && nx < w && s[ny][nx] == '.') near[ny][nx] = 1;
        }
    }
    int answer = 1;
    for (int sy = 0; sy < h; ++sy) for (int sx = 0; sx < w; ++sx) {
        if (s[sy][sx] != '.' || near[sy][sx] || visited[sy][sx]) continue;
        queue<pair<int, int>> q;
        set<pair<int, int>> area;
        visited[sy][sx] = 1;
        q.push({sy, sx});
        area.insert({sy, sx});
        while (!q.empty()) {
            auto [y, x] = q.front();
            q.pop();
            for (int dir = 0; dir < 4; ++dir) {
                int ny = y + dy[dir], nx = x + dx[dir];
                if (ny < 0 || ny >= h || nx < 0 || nx >= w || s[ny][nx] == '#') continue;
                area.insert({ny, nx});
                if (near[ny][nx] || visited[ny][nx]) continue;
                visited[ny][nx] = 1;
                q.push({ny, nx});
            }
        }
        answer = max(answer, (int)area.size());
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc352_d", {
    algorithm: "把值在排列中的位置记为 pos[value]。枚举连续值区间 [x,x+K-1]，用 multiset 维护这些值的位置，答案取最大位置减最小位置的最小值。",
    complexity: "O(N log K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> pos(n + 1);
    for (int i = 0; i < n; ++i) {
        int p;
        cin >> p;
        pos[p] = i;
    }
    multiset<int> window;
    for (int value = 1; value <= k; ++value) window.insert(pos[value]);
    int answer = *window.rbegin() - *window.begin();
    for (int left = 2; left + k - 1 <= n; ++left) {
        window.erase(window.find(pos[left - 1]));
        window.insert(pos[left + k - 1]);
        answer = min(answer, *window.rbegin() - *window.begin());
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc353_d", {
    algorithm: "对每个右端 A_j，左侧每个 A_i 在拼接后会乘以 10^{digits(A_j)}，再加 A_j。维护左侧数值和即可线性累加。",
    complexity: "O(N log A)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    long long prefix = 0, answer = 0;
    for (int j = 0; j < n; ++j) {
        long long pow10 = 10;
        while (pow10 <= a[j]) pow10 *= 10;
        answer = (answer + prefix * (pow10 % MOD) + a[j] % MOD * j) % MOD;
        prefix = (prefix + a[j]) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc355_d", {
    algorithm: "区间两两相交等价于较早结束的右端点不小于当前左端点。按左端点排序，维护此前右端点有序数组，统计右端点 >= L 的数量。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<pair<long long, long long>> seg(n);
    for (auto &[l, r] : seg) cin >> l >> r;
    sort(seg.begin(), seg.end());
    vector<long long> rights;
    long long answer = 0;
    for (auto [l, r] : seg) {
        int nonIntersect = lower_bound(rights.begin(), rights.end(), l) - rights.begin();
        answer += rights.size() - nonIntersect;
        rights.insert(upper_bound(rights.begin(), rights.end(), r), r);
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc356_d", {
    algorithm: "逐位统计 0..N 中该位为 1 的个数，只对 M 中为 1 的位累加。周期长度为 2^{b+1}，每个完整周期有 2^b 个 1。",
    complexity: "O(log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const long long MOD = 998244353;
    long long n, m;
    cin >> n >> m;
    ++n;
    long long answer = 0;
    for (int bit = 0; bit < 60; ++bit) {
        if ((m >> bit & 1LL) == 0) continue;
        long long one = 1LL << bit;
        long long cycle = one << 1;
        long long full = n / cycle;
        long long rem = n % cycle;
        long long count = full * one + max(0LL, rem - one);
        answer = (answer + count) % MOD;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc357_d", {
    algorithm: "把 N 连写 N 次是 N * (10^{d(N)*(N-1)} + ... + 1)。用等比数列递归/快速幂矩阵求和，避免除法逆元对非互质情况的风险。",
    complexity: "O(log N)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

long long modPow(long long a, long long e) {
    long long r = 1;
    while (e) {
        if (e & 1) r = r * a % MOD;
        a = a * a % MOD;
        e >>= 1;
    }
    return r;
}

pair<long long, long long> powSum(long long r, long long n) {
    if (n == 0) return {1, 0};
    if (n % 2 == 0) {
        auto [p, s] = powSum(r, n / 2);
        return {p * p % MOD, s * (1 + p) % MOD};
    }
    auto [p, s] = powSum(r, n - 1);
    return {p * r % MOD, (s + p) % MOD};
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    int digits = to_string(n).size();
    long long r = modPow(10, digits);
    auto [_, sum] = powSum(r, n);
    cout << (n % MOD) * sum % MOD << '\\n';
    return 0;
}
`
  }],
  ["AT_abc360_d", {
    algorithm: "向右的蚂蚁和向左的蚂蚁会相遇，当且仅当左边的 R 与右边的 L 初始距离不超过 2T。对 L 的位置排序后，对每个 R 二分统计范围内的 L。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long t;
    string s;
    cin >> n >> t >> s;
    vector<long long> x(n), leftPositions;
    for (long long &v : x) cin >> v;
    for (int i = 0; i < n; ++i) if (s[i] == '0') leftPositions.push_back(x[i]);
    sort(leftPositions.begin(), leftPositions.end());
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        if (s[i] != '1') continue;
        auto lo = upper_bound(leftPositions.begin(), leftPositions.end(), x[i]);
        auto hi = upper_bound(leftPositions.begin(), leftPositions.end(), x[i] + 2 * t);
        answer += hi - lo;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc361_d", {
    algorithm: "把两个空位也纳入状态，初始为 S 后接两个空位，目标为 T 后接两个空位。每步把任意相邻两个非空棋子移动到当前两个空位，用 BFS 求最短步数。",
    complexity: "O(状态数 * N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s, t;
    cin >> n >> s >> t;
    s += "..";
    t += "..";
    map<string, int> dist;
    queue<string> que;
    dist[s] = 0;
    que.push(s);
    while (!que.empty()) {
        string cur = que.front();
        que.pop();
        int empty = cur.find("..");
        for (int i = 0; i + 1 < n + 2; ++i) {
            if (cur[i] == '.' || cur[i + 1] == '.') continue;
            string next = cur;
            next[empty] = cur[i];
            next[empty + 1] = cur[i + 1];
            next[i] = next[i + 1] = '.';
            if (!dist.count(next)) {
                dist[next] = dist[cur] + 1;
                que.push(next);
            }
        }
    }
    cout << (dist.count(t) ? dist[t] : -1) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc362_e", {
    algorithm: "按结尾位置和公差做 DP。dp[i][len][diff] 表示以 i 结尾、长度为 len、公差为 diff 的等差子序列数量，枚举前驱 j 转移。",
    complexity: "O(N^3 log V)",
    code: `${CPP_INCLUDES}
using namespace std;

const long long MOD = 998244353;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    vector<vector<map<long long, long long>>> dp(n, vector<map<long long, long long>>(n + 1));
    vector<long long> answer(n + 1, 0);
    answer[1] = n;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < i; ++j) {
            long long diff = a[i] - a[j];
            dp[i][2][diff] = (dp[i][2][diff] + 1) % MOD;
            answer[2] = (answer[2] + 1) % MOD;
            for (int len = 2; len < n; ++len) {
                auto it = dp[j][len].find(diff);
                if (it == dp[j][len].end()) continue;
                dp[i][len + 1][diff] = (dp[i][len + 1][diff] + it->second) % MOD;
                answer[len + 1] = (answer[len + 1] + it->second) % MOD;
            }
        }
    }
    for (int len = 1; len <= n; ++len) {
        if (len > 1) cout << ' ';
        cout << answer[len] % MOD;
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc363_e", {
    algorithm: "从边界格子开始用最小堆按高度推进。第 y 年把所有高度不超过 y 且能连到外海的格子沉没，维护剩余陆地数量。",
    complexity: "O(HW log(HW) + Y)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, yMax;
    cin >> h >> w >> yMax;
    vector<vector<int>> a(h, vector<int>(w));
    for (auto &row : a) for (int &x : row) cin >> x;
    vector<vector<int>> pushed(h, vector<int>(w, 0));
    priority_queue<tuple<int, int, int>, vector<tuple<int, int, int>>, greater<tuple<int, int, int>>> pq;
    auto push = [&](int y, int x) {
        if (y < 0 || y >= h || x < 0 || x >= w || pushed[y][x]) return;
        pushed[y][x] = 1;
        pq.push({a[y][x], y, x});
    };
    for (int i = 0; i < h; ++i) {
        push(i, 0);
        push(i, w - 1);
    }
    for (int j = 0; j < w; ++j) {
        push(0, j);
        push(h - 1, j);
    }
    long long remaining = 1LL * h * w;
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    for (int year = 1; year <= yMax; ++year) {
        while (!pq.empty() && get<0>(pq.top()) <= year) {
            auto [height, y, x] = pq.top();
            pq.pop();
            --remaining;
            for (int dir = 0; dir < 4; ++dir) push(y + dy[dir], x + dx[dir]);
        }
        cout << remaining << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc367_e", {
    algorithm: "一次操作把位置 i 的值变为原来 X_i 位置的值，重复 K 次后位置 i 的值来自 X^K(i)。对置换做二进制倍增即可。",
    complexity: "O(N log K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    const int LOG = 62;
    vector<vector<int>> up(LOG, vector<int>(n));
    for (int i = 0; i < n; ++i) {
        cin >> up[0][i];
        --up[0][i];
    }
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    for (int bit = 1; bit < LOG; ++bit) {
        for (int i = 0; i < n; ++i) up[bit][i] = up[bit - 1][up[bit - 1][i]];
    }
    for (int i = 0; i < n; ++i) {
        int pos = i;
        for (int bit = 0; bit < LOG; ++bit) {
            if (k >> bit & 1LL) pos = up[bit][pos];
        }
        if (i) cout << ' ';
        cout << a[pos];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc371_e", {
    algorithm: "对每个数值单独统计包含它的子数组数量。总子数组数减去各相邻出现位置之间的空段子数组数，即为该数值的贡献。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    map<int, vector<int>> positions;
    for (int i = 1; i <= n; ++i) {
        int a;
        cin >> a;
        positions[a].push_back(i);
    }
    long long total = 1LL * n * (n + 1) / 2;
    long long answer = 0;
    for (auto &[_, pos] : positions) {
        long long missing = 0;
        int prev = 0;
        for (int p : pos) {
            long long gap = p - prev - 1;
            missing += gap * (gap + 1) / 2;
            prev = p;
        }
        long long gap = n - prev;
        missing += gap * (gap + 1) / 2;
        answer += total - missing;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc372_e", {
    algorithm: "并查集合并连通块，每个根维护最多前 10 大的顶点编号。查询时返回该连通块第 K 大编号，不足 K 个则输出 -1。",
    complexity: "O((N+Q) α(N) * 10)",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> parent, size;
    vector<vector<int>> top;
    DSU(int n) : parent(n), size(n, 1), top(n) {
        iota(parent.begin(), parent.end(), 0);
        for (int i = 0; i < n; ++i) top[i] = {i + 1};
    }
    int find(int x) { return parent[x] == x ? x : parent[x] = find(parent[x]); }
    void unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return;
        if (size[a] < size[b]) swap(a, b);
        parent[b] = a;
        size[a] += size[b];
        vector<int> merged = top[a];
        merged.insert(merged.end(), top[b].begin(), top[b].end());
        sort(merged.rbegin(), merged.rend());
        if ((int)merged.size() > 10) merged.resize(10);
        top[a] = merged;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    DSU dsu(n);
    while (q--) {
        int type, u, v;
        cin >> type >> u >> v;
        if (type == 1) dsu.unite(u - 1, v - 1);
        else {
            int root = dsu.find(u - 1);
            cout << (v <= (int)dsu.top[root].size() ? dsu.top[root][v - 1] : -1) << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc373_d", {
    algorithm: "把每条约束看成带权边 x_v=x_u+w。每个连通块任选起点赋 0，BFS 推出同块所有点的势能值。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<pair<int, long long>>> graph(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        --u; --v;
        graph[u].push_back({v, w});
        graph[v].push_back({u, -w});
    }
    vector<long long> x(n, 0);
    vector<int> seen(n, 0);
    for (int start = 0; start < n; ++start) {
        if (seen[start]) continue;
        queue<int> que;
        seen[start] = 1;
        que.push(start);
        while (!que.empty()) {
            int v = que.front();
            que.pop();
            for (auto [to, w] : graph[v]) {
                if (seen[to]) continue;
                seen[to] = 1;
                x[to] = x[v] + w;
                que.push(to);
            }
        }
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << x[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc375_d", {
    algorithm: "枚举中间位置 j，答案增加左侧和右侧相同字符的配对数量。维护左侧计数和右侧计数即可。",
    complexity: "O(26N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    vector<long long> left(26, 0), right(26, 0);
    for (char ch : s) ++right[ch - 'A'];
    long long answer = 0;
    for (char ch : s) {
        --right[ch - 'A'];
        for (int c = 0; c < 26; ++c) answer += left[c] * right[c];
        ++left[ch - 'A'];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc376_d", {
    algorithm: "从 1 号点做有向 BFS。任何指向 1 号点的边 u->1 都形成一个长度 dist[u]+1 的环，取最小值。",
    complexity: "O(N+M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int a, b;
        cin >> a >> b;
        graph[a - 1].push_back(b - 1);
    }
    vector<int> dist(n, -1);
    queue<int> que;
    dist[0] = 0;
    que.push(0);
    int answer = 1e9;
    while (!que.empty()) {
        int v = que.front();
        que.pop();
        for (int to : graph[v]) {
            if (to == 0) answer = min(answer, dist[v] + 1);
            if (dist[to] == -1) {
                dist[to] = dist[v] + 1;
                que.push(to);
            }
        }
    }
    cout << (answer == (int)1e9 ? -1 : answer) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc379_e", {
    algorithm: "每个数字 S_i 对所有包含它的子串贡献 S_i*(i+1)*(111...1)。按十进制位累计系数后统一进位输出大整数。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    vector<long long> prefix(n);
    long long running = 0;
    for (int i = 0; i < n; ++i) {
        running += 1LL * (s[i] - '0') * (i + 1);
        prefix[i] = running;
    }
    vector<int> digits;
    long long carry = 0;
    for (int place = 0; place < n; ++place) {
        long long value = prefix[n - 1 - place] + carry;
        digits.push_back(value % 10);
        carry = value / 10;
    }
    while (carry > 0) {
        digits.push_back(carry % 10);
        carry /= 10;
    }
    while (digits.size() > 1 && digits.back() == 0) digits.pop_back();
    for (auto it = digits.rbegin(); it != digits.rend(); ++it) cout << *it;
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc361_e", {
    algorithm: "树上走遍所有边再停在某点，最优是总边权的两倍减去树的直径，因为直径上的边不需要回头。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<pair<int, long long>>> g(n);
    long long total = 0;
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        long long c;
        cin >> a >> b >> c;
        --a; --b;
        g[a].push_back({b, c});
        g[b].push_back({a, c});
        total += c;
    }
    auto farthest = [&](int start) {
        vector<long long> dist(n, -1);
        stack<int> st;
        dist[start] = 0;
        st.push(start);
        while (!st.empty()) {
            int v = st.top();
            st.pop();
            for (auto [to, cost] : g[v]) if (dist[to] == -1) {
                dist[to] = dist[v] + cost;
                st.push(to);
            }
        }
        int best = max_element(dist.begin(), dist.end()) - dist.begin();
        return pair<int, long long>{best, dist[best]};
    };
    auto [u, _1] = farthest(0);
    auto [v, diameter] = farthest(u);
    cout << total * 2 - diameter << '\\n';
    return 0;
}
`
  }],
  ["AT_abc362_d", {
    algorithm: "到达点 v 的代价包含点权 A_v。把每条无向边 u-v 转成代价 B+A_v/A_u 的有向转移，从 1 出发跑 Dijkstra。",
    complexity: "O((N+M) log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    vector<vector<pair<int, long long>>> g(n);
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long b;
        cin >> u >> v >> b;
        --u; --v;
        g[u].push_back({v, b + a[v]});
        g[v].push_back({u, b + a[u]});
    }
    const long long INF = 4e18;
    vector<long long> dist(n, INF);
    priority_queue<pair<long long, int>, vector<pair<long long, int>>, greater<pair<long long, int>>> pq;
    dist[0] = a[0];
    pq.push({dist[0], 0});
    while (!pq.empty()) {
        auto [d, v] = pq.top();
        pq.pop();
        if (d != dist[v]) continue;
        for (auto [to, cost] : g[v]) {
            if (dist[to] <= d + cost) continue;
            dist[to] = d + cost;
            pq.push({dist[to], to});
        }
    }
    for (int i = 1; i < n; ++i) {
        if (i > 1) cout << ' ';
        cout << dist[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc364_d", {
    algorithm: "排序点坐标。对每个询问二分最小距离 mid，使 [B-mid,B+mid] 内点数至少 K。",
    complexity: "O((N+Q) log N log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<long long> a(n);
    for (long long &x : a) cin >> x;
    sort(a.begin(), a.end());
    while (q--) {
        long long b;
        int k;
        cin >> b >> k;
        long long low = -1, high = 4e18;
        while (high - low > 1) {
            long long mid = (low + high) / 2;
            auto l = lower_bound(a.begin(), a.end(), b - mid);
            auto r = upper_bound(a.begin(), a.end(), b + mid);
            if (r - l >= k) high = mid;
            else low = mid;
        }
        cout << high << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc365_d", {
    algorithm: "DP 记录上一手出了什么且到当前为止最多获胜次数。每轮不能输给对手，也不能连续出同一手，在可行手中转移。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    const int NEG = -1e9;
    vector<int> dp(3, 0);
    auto outcome = [&](int me, char other) {
        int op = other == 'R' ? 0 : other == 'P' ? 1 : 2;
        if (me == op) return 0;
        if ((me == 0 && op == 2) || (me == 1 && op == 0) || (me == 2 && op == 1)) return 1;
        return -1;
    };
    for (char ch : s) {
        vector<int> next(3, NEG);
        for (int prev = 0; prev < 3; ++prev) {
            for (int me = 0; me < 3; ++me) {
                if (me == prev) continue;
                int result = outcome(me, ch);
                if (result < 0) continue;
                next[me] = max(next[me], dp[prev] + result);
            }
        }
        dp = next;
    }
    cout << *max_element(dp.begin(), dp.end()) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc366_d", {
    algorithm: "建立三维前缀和。每个长方体查询用 8 项容斥在 O(1) 时间求出总和。",
    complexity: "预处理 O(N^3)，每次查询 O(1)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<vector<long long>>> pref(n + 1, vector<vector<long long>>(n + 1, vector<long long>(n + 1, 0)));
    for (int x = 1; x <= n; ++x) {
        for (int y = 1; y <= n; ++y) {
            for (int z = 1; z <= n; ++z) {
                long long value;
                cin >> value;
                pref[x][y][z] = value
                    + pref[x - 1][y][z] + pref[x][y - 1][z] + pref[x][y][z - 1]
                    - pref[x - 1][y - 1][z] - pref[x - 1][y][z - 1] - pref[x][y - 1][z - 1]
                    + pref[x - 1][y - 1][z - 1];
            }
        }
    }
    auto sum = [&](int lx, int rx, int ly, int ry, int lz, int rz) {
        return pref[rx][ry][rz]
            - pref[lx - 1][ry][rz] - pref[rx][ly - 1][rz] - pref[rx][ry][lz - 1]
            + pref[lx - 1][ly - 1][rz] + pref[lx - 1][ry][lz - 1] + pref[rx][ly - 1][lz - 1]
            - pref[lx - 1][ly - 1][lz - 1];
    };

    int q;
    cin >> q;
    while (q--) {
        int lx, rx, ly, ry, lz, rz;
        cin >> lx >> rx >> ly >> ry >> lz >> rz;
        cout << sum(lx, rx, ly, ry, lz, rz) << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc367_d", {
    algorithm: "把环展开成两倍前缀和。对每个终点维护合法起点窗口，统计同余前缀个数即可得到距离为 M 倍数的有序点对数。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long m;
    cin >> n >> m;
    vector<long long> a(n);
    for (long long &value : a) cin >> value;

    vector<long long> pref(2 * n + 1, 0);
    for (int i = 0; i < 2 * n; ++i) pref[i + 1] = (pref[i] + a[i % n]) % m;

    map<long long, long long> count;
    long long answer = 0;
    for (int r = 1; r <= 2 * n - 1; ++r) {
        int remove = r - n;
        if (remove >= 0) {
            long long key = pref[remove];
            if (--count[key] == 0) count.erase(key);
        }
        int add = r - 1;
        if (add < n) count[pref[add]]++;
        answer += count[pref[r]];
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc368_d", {
    algorithm: "保留包含所有指定点的最小连通子树。先标记必须保留的点，再不断删除非必须叶子，剩余点数就是答案。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<vector<int>> g(n);
    vector<int> deg(n, 0);
    for (int i = 0; i < n - 1; ++i) {
        int a, b;
        cin >> a >> b;
        --a; --b;
        g[a].push_back(b);
        g[b].push_back(a);
        deg[a]++;
        deg[b]++;
    }
    vector<int> need(n, 0);
    for (int i = 0; i < k; ++i) {
        int v;
        cin >> v;
        need[v - 1] = 1;
    }

    queue<int> q;
    vector<int> removed(n, 0);
    for (int i = 0; i < n; ++i) {
        if (!need[i] && deg[i] <= 1) q.push(i);
    }
    int remaining = n;
    while (!q.empty()) {
        int v = q.front();
        q.pop();
        if (removed[v]) continue;
        removed[v] = 1;
        remaining--;
        for (int to : g[v]) {
            if (removed[to]) continue;
            if (--deg[to] == 1 && !need[to]) q.push(to);
        }
    }
    cout << remaining << '\\n';
    return 0;
}
`
  }],
  ["AT_abc369_d", {
    algorithm: "按当前已击败怪物数量的奇偶性做 DP。跳过不改变奇偶，击败时按奇偶获得 A 或 2A 的经验并翻转奇偶。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    const long long NEG = -(1LL << 60);
    vector<long long> dp(2, NEG);
    dp[0] = 0;
    for (int i = 0; i < n; ++i) {
        long long a;
        cin >> a;
        vector<long long> next = dp;
        next[1] = max(next[1], dp[0] + a);
        next[0] = max(next[0], dp[1] + 2 * a);
        dp = next;
    }
    cout << max(dp[0], dp[1]) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc370_d", {
    algorithm: "每行、每列用 set 维护还存在的墙。查询空格时用 lower_bound 找上下左右最近的墙并统一删除。",
    complexity: "O((H W + Q) log(H W))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w, q;
    cin >> h >> w >> q;
    vector<set<int>> rows(h), cols(w);
    for (int r = 0; r < h; ++r) for (int c = 0; c < w; ++c) rows[r].insert(c);
    for (int c = 0; c < w; ++c) for (int r = 0; r < h; ++r) cols[c].insert(r);

    long long remaining = 1LL * h * w;
    auto eraseWall = [&](int r, int c) {
        if (r < 0 || r >= h || c < 0 || c >= w) return false;
        auto it = rows[r].find(c);
        if (it == rows[r].end()) return false;
        rows[r].erase(it);
        cols[c].erase(r);
        remaining--;
        return true;
    };

    while (q--) {
        int r, c;
        cin >> r >> c;
        --r; --c;
        if (eraseWall(r, c)) continue;

        vector<pair<int, int>> targets;
        auto rowIt = rows[r].lower_bound(c);
        if (rowIt != rows[r].end()) targets.push_back({r, *rowIt});
        if (rowIt != rows[r].begin()) {
            --rowIt;
            targets.push_back({r, *rowIt});
        }
        auto colIt = cols[c].lower_bound(r);
        if (colIt != cols[c].end()) targets.push_back({*colIt, c});
        if (colIt != cols[c].begin()) {
            --colIt;
            targets.push_back({*colIt, c});
        }
        sort(targets.begin(), targets.end());
        targets.erase(unique(targets.begin(), targets.end()), targets.end());
        for (auto [tr, tc] : targets) eraseWall(tr, tc);
    }

    cout << remaining << '\\n';
    return 0;
}
`
  }],
  ["AT_abc371_d", {
    algorithm: "坐标已排序，对人口做前缀和。每个询问二分出 [L,R] 覆盖的下标区间并相减。",
    complexity: "预处理 O(N)，每次查询 O(log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> x(n), p(n), pref(n + 1, 0);
    for (long long &value : x) cin >> value;
    for (int i = 0; i < n; ++i) {
        cin >> p[i];
        pref[i + 1] = pref[i] + p[i];
    }
    int q;
    cin >> q;
    while (q--) {
        long long l, r;
        cin >> l >> r;
        int left = lower_bound(x.begin(), x.end(), l) - x.begin();
        int right = upper_bound(x.begin(), x.end(), r) - x.begin();
        cout << pref[right] - pref[left] << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc372_d", {
    algorithm: "从右向左维护单调递减栈。当前位置能看到的楼正是当前栈大小，然后弹出不高于自己的楼并入栈。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> h(n), answer(n);
    for (int &value : h) cin >> value;
    vector<int> st;
    for (int i = n - 1; i >= 0; --i) {
        answer[i] = (int)st.size();
        while (!st.empty() && st.back() < h[i]) st.pop_back();
        st.push_back(h[i]);
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << answer[i];
    }
    cout << '\\n';
    return 0;
}
`
  }],
  ["AT_abc376_e", {
    algorithm: "按 A 从小到大枚举当前最大 A，用大根堆维护已经遇到的 K 个最小 B，并用 A 乘它们的和更新答案。",
    complexity: "每组 O(N log K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n, k;
        cin >> n >> k;
        vector<pair<long long, long long>> items(n);
        for (int i = 0; i < n; ++i) cin >> items[i].first;
        for (int i = 0; i < n; ++i) cin >> items[i].second;
        sort(items.begin(), items.end());

        priority_queue<long long> heap;
        long long sum = 0;
        long long answer = (1LL << 62);
        for (auto [a, b] : items) {
            heap.push(b);
            sum += b;
            if ((int)heap.size() > k) {
                sum -= heap.top();
                heap.pop();
            }
            if ((int)heap.size() == k) answer = min(answer, a * sum);
        }
        cout << answer << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc377_d", {
    algorithm: "对每个左端点 l，找所有 L_i >= l 的区间中最小 R_i。右端点必须小于这个最小值，用 suffix minimum 汇总限制。",
    complexity: "O(N + M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> minRight(m + 2, m + 1);
    for (int i = 0; i < n; ++i) {
        int l, r;
        cin >> l >> r;
        minRight[l] = min(minRight[l], r);
    }
    for (int l = m - 1; l >= 1; --l) minRight[l] = min(minRight[l], minRight[l + 1]);

    long long answer = 0;
    for (int l = 1; l <= m; ++l) {
        answer += minRight[l] - l;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc379_c", {
    algorithm: "先按位置排序并检查石子总数是否为 N。若每个前缀能覆盖到当前位置前一格，则最小移动次数等于目标位置总和减去初始加权位置总和。",
    complexity: "O(M log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    int m;
    cin >> n >> m;
    vector<long long> x(m), a(m);
    for (long long &value : x) cin >> value;
    for (long long &value : a) cin >> value;
    vector<pair<long long, long long>> stones(m);
    for (int i = 0; i < m; ++i) stones[i] = {x[i], a[i]};
    sort(stones.begin(), stones.end());

    long long count = 0;
    long long weighted = 0;
    for (auto [pos, amount] : stones) {
        if (count < pos - 1) {
            cout << -1 << '\\n';
            return 0;
        }
        count += amount;
        weighted += pos * amount;
    }
    if (count != n) {
        cout << -1 << '\\n';
        return 0;
    }
    cout << n * (n + 1) / 2 - weighted << '\\n';
    return 0;
}
`
  }],
  ["AT_abc379_d", {
    algorithm: "记录全局经过时间和每盆植物的种植时刻。查询高度 H 时，按队列顺序弹出所有生长时间至少为 H 的植物。",
    complexity: "O(Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    long long now = 0;
    queue<long long> planted;
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            planted.push(now);
        } else if (type == 2) {
            long long t;
            cin >> t;
            now += t;
        } else {
            long long h;
            cin >> h;
            int answer = 0;
            while (!planted.empty() && now - planted.front() >= h) {
                planted.pop();
                answer++;
            }
            cout << answer << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc380_d", {
    algorithm: "把无限字符串按原串长度分块。第 k 个字符所在块编号的 popcount 奇偶性决定是否切换大小写。",
    complexity: "每次查询 O(log K)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    int q;
    cin >> q;
    long long n = (long long)s.size();
    while (q--) {
        long long k;
        cin >> k;
        --k;
        long long block = k / n;
        char ch = s[k % n];
        if (__builtin_popcountll(block) % 2 == 1) {
            if ('a' <= ch && ch <= 'z') ch = char(ch - 'a' + 'A');
            else if ('A' <= ch && ch <= 'Z') ch = char(ch - 'A' + 'a');
        }
        cout << ch << (q ? ' ' : '\\n');
    }
    return 0;
}
`
  }],
  ["AT_abc382_d", {
    algorithm: "递归枚举严格递增序列。当前位置最小值至少比前一个大 10，并预留后续每个数至少相差 10。",
    complexity: "输出规模相关",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> answer;
    vector<int> current;
    auto dfs = [&](auto &&self, int last) -> void {
        int pos = current.size();
        if (pos == n) {
            answer.push_back(current);
            return;
        }
        int remaining = n - pos - 1;
        for (int value = last + 10; value + 10 * remaining <= m; ++value) {
            current.push_back(value);
            self(self, value);
            current.pop_back();
        }
    };
    dfs(dfs, -9);
    cout << answer.size() << '\\n';
    for (auto &seq : answer) {
        for (int i = 0; i < n; ++i) {
            if (i) cout << ' ';
            cout << seq[i];
        }
        cout << '\\n';
    }
    return 0;
}
`
  }],
  ["AT_abc384_e", {
    algorithm: "从起点周围把候选格子按强度放入最小堆。只要当前最弱候选满足 strength * X < 当前体力，就吸收它并扩展邻居。",
    complexity: "O(HW log(HW))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    long long x;
    cin >> h >> w >> x;
    int p, q;
    cin >> p >> q;
    --p; --q;
    vector<vector<long long>> s(h, vector<long long>(w));
    for (auto &row : s) for (long long &v : row) cin >> v;
    vector<vector<int>> seen(h, vector<int>(w, 0));
    priority_queue<tuple<long long, int, int>, vector<tuple<long long, int, int>>, greater<tuple<long long, int, int>>> pq;
    long long power = s[p][q];
    seen[p][q] = 1;
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    auto push = [&](int y, int z) {
        if (y < 0 || y >= h || z < 0 || z >= w || seen[y][z]) return;
        seen[y][z] = 1;
        pq.push({s[y][z], y, z});
    };
    for (int dir = 0; dir < 4; ++dir) push(p + dy[dir], q + dx[dir]);
    while (!pq.empty()) {
        auto [need, y, z] = pq.top();
        if ((__int128)need * x >= power) break;
        pq.pop();
        power += need;
        for (int dir = 0; dir < 4; ++dir) push(y + dy[dir], z + dx[dir]);
    }
    cout << power << '\\n';
    return 0;
}
`
  }],
  ["AT_abc387_d", {
    algorithm: "BFS 状态包含上一步移动方向。下一步必须在水平和竖直之间交替；起点可视为两种上一方向都可达。",
    complexity: "O(HW)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    vector<string> grid(h);
    pair<int, int> start, goal;
    for (int i = 0; i < h; ++i) {
        cin >> grid[i];
        for (int j = 0; j < w; ++j) {
            if (grid[i][j] == 'S') start = {i, j};
            if (grid[i][j] == 'G') goal = {i, j};
        }
    }
    const int INF = 1e9;
    vector<vector<array<int, 2>>> dist(h, vector<array<int, 2>>(w, {INF, INF}));
    queue<tuple<int, int, int>> que;
    for (int last = 0; last < 2; ++last) {
        dist[start.first][start.second][last] = 0;
        que.push({start.first, start.second, last});
    }
    int dy[4] = {1, -1, 0, 0};
    int dx[4] = {0, 0, 1, -1};
    while (!que.empty()) {
        auto [y, x, last] = que.front();
        que.pop();
        for (int dir = 0; dir < 4; ++dir) {
            int type = dir < 2 ? 0 : 1;
            if (type == last) continue;
            int ny = y + dy[dir], nx = x + dx[dir];
            if (ny < 0 || ny >= h || nx < 0 || nx >= w || grid[ny][nx] == '#') continue;
            if (dist[ny][nx][type] <= dist[y][x][last] + 1) continue;
            dist[ny][nx][type] = dist[y][x][last] + 1;
            que.push({ny, nx, type});
        }
    }
    int ans = min(dist[goal.first][goal.second][0], dist[goal.first][goal.second][1]);
    cout << (ans == INF ? -1 : ans) << '\\n';
    return 0;
}
`
  }],
  ["AT_abc388_e", {
    algorithm: "排序后二分能做多少对。若最小的 k 个饼分别能和最大的 k 个饼满足 2*small<=large，则 k 对可行。",
    complexity: "O(N log N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    for (long long &v : a) cin >> v;
    sort(a.begin(), a.end());
    auto ok = [&](int k) {
        for (int i = 0; i < k; ++i) {
            if (2 * a[i] > a[n - k + i]) return false;
        }
        return true;
    };
    int low = 0, high = n / 2 + 1;
    while (high - low > 1) {
        int mid = (low + high) / 2;
        if (ok(mid)) low = mid;
        else high = mid;
    }
    cout << low << '\\n';
    return 0;
}
`
  }],
  ["AT_abc390_d", {
    algorithm: "回溯把每个石子放入已有组或新建组，枚举所有集合划分。到达末尾时计算各组和的 xor，并记录不同结果数量。",
    complexity: "Bell(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n), groups;
    for (long long &v : a) cin >> v;
    set<long long> results;
    auto dfs = [&](auto &&self, int index) -> void {
        if (index == n) {
            long long value = 0;
            for (long long sum : groups) value ^= sum;
            results.insert(value);
            return;
        }
        for (int group = 0; group < (int)groups.size(); ++group) {
            groups[group] += a[index];
            self(self, index + 1);
            groups[group] -= a[index];
        }
        groups.push_back(a[index]);
        self(self, index + 1);
        groups.pop_back();
    };
    dfs(dfs, 0);
    cout << results.size() << '\\n';
    return 0;
}
`
  }],
  ["AT_abc392_d", {
    algorithm: "每个骰子统计点数频次。枚举骰子对，按相同点数累加 count_i[v]*count_j[v]/(K_i*K_j)，取最大概率。",
    complexity: "O(骰子对 * 不同点数)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<map<int, int>> count(n);
    vector<int> size(n);
    for (int i = 0; i < n; ++i) {
        cin >> size[i];
        for (int j = 0; j < size[i]; ++j) {
            int a;
            cin >> a;
            ++count[i][a];
        }
    }
    double answer = 0.0;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            long long same = 0;
            for (auto [value, c] : count[i]) {
                auto it = count[j].find(value);
                if (it != count[j].end()) same += 1LL * c * it->second;
            }
            answer = max(answer, (double)same / size[i] / size[j]);
        }
    }
    cout << fixed << setprecision(12) << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc393_e", {
    algorithm: "统计每个数出现次数，再用倍数枚举得到 divisible[d]：有多少数能被 d 整除。对每个 d 若 divisible[d]>=K，则它可作为所有 d 的倍数的候选答案。",
    complexity: "O(V log V)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<int> a(n);
    int maxValue = 0;
    for (int &v : a) {
        cin >> v;
        maxValue = max(maxValue, v);
    }
    vector<int> freq(maxValue + 1, 0), answer(maxValue + 1, 1);
    for (int v : a) ++freq[v];
    for (int d = 1; d <= maxValue; ++d) {
        int divisible = 0;
        for (int multiple = d; multiple <= maxValue; multiple += d) divisible += freq[multiple];
        if (divisible >= k) {
            for (int multiple = d; multiple <= maxValue; multiple += d) answer[multiple] = d;
        }
    }
    for (int v : a) cout << answer[v] << '\\n';
    return 0;
}
`
  }],
  ["AT_abc395_d", {
    algorithm: "区分实际盒子和显示巢穴编号。鸽子记录所在实际盒子；交换巢穴只交换显示编号到实际盒子的映射，查询再反查实际盒子的显示编号。",
    complexity: "O(Q)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<int> pigeonBox(n), labelToBox(n), boxToLabel(n);
    iota(pigeonBox.begin(), pigeonBox.end(), 0);
    iota(labelToBox.begin(), labelToBox.end(), 0);
    iota(boxToLabel.begin(), boxToLabel.end(), 0);
    while (q--) {
        int type;
        cin >> type;
        if (type == 1) {
            int a, b;
            cin >> a >> b;
            pigeonBox[a - 1] = labelToBox[b - 1];
        } else if (type == 2) {
            int a, b;
            cin >> a >> b;
            --a; --b;
            int boxA = labelToBox[a], boxB = labelToBox[b];
            swap(labelToBox[a], labelToBox[b]);
            boxToLabel[boxA] = b;
            boxToLabel[boxB] = a;
        } else {
            int a;
            cin >> a;
            cout << boxToLabel[pigeonBox[a - 1]] + 1 << '\\n';
        }
    }
    return 0;
}
`
  }],
  ["AT_abc398_f", {
    algorithm: "要求在末尾追加最短字符串使整体回文。求 S 的最长回文后缀，答案为 S 加上此前缀的反转。",
    complexity: "O(|S|)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;
    string rev = s;
    reverse(rev.begin(), rev.end());
    string combined = rev + "#" + s;
    vector<int> pi(combined.size(), 0);
    for (int i = 1; i < (int)combined.size(); ++i) {
        int j = pi[i - 1];
        while (j > 0 && combined[i] != combined[j]) j = pi[j - 1];
        if (combined[i] == combined[j]) ++j;
        pi[i] = j;
    }
    int keep = pi.back();
    string add = s.substr(0, s.size() - keep);
    reverse(add.begin(), add.end());
    cout << s << add << '\\n';
    return 0;
}
`
  }],
  ["AT_abc399_c", {
    algorithm: "森林中每个连通块保留点数减一条边即可。用并查集合并，遇到同一连通块内的边就是必须删除的边。",
    complexity: "O((N+M) α(N))",
    code: `${CPP_INCLUDES}
using namespace std;

struct DSU {
    vector<int> p, sz;
    DSU(int n) : p(n), sz(n, 1) { iota(p.begin(), p.end(), 0); }
    int find(int x) { return p[x] == x ? x : p[x] = find(p[x]); }
    bool unite(int a, int b) {
        a = find(a); b = find(b);
        if (a == b) return false;
        if (sz[a] < sz[b]) swap(a, b);
        p[b] = a;
        sz[a] += sz[b];
        return true;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    DSU dsu(n);
    int remove = 0;
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        if (!dsu.unite(u - 1, v - 1)) ++remove;
    }
    cout << remove << '\\n';
    return 0;
}
`
  }],
  ["AT_abc381_d", {
    algorithm: "分别按偶起点和奇起点把数组切成相邻二元组。合法窗口要求每组两个数相等且组值互不重复，用双端队列滑动维护最长窗口。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int &value : a) cin >> value;

    int answer = 0;
    for (int parity = 0; parity < 2; ++parity) {
        deque<int> window;
        map<int, int> count;
        for (int i = parity; i + 1 < n; i += 2) {
            if (a[i] != a[i + 1]) {
                window.clear();
                count.clear();
                continue;
            }
            int value = a[i];
            while (count[value] > 0) {
                int old = window.front();
                window.pop_front();
                if (--count[old] == 0) count.erase(old);
            }
            window.push_back(value);
            count[value]++;
            answer = max(answer, 2 * (int)window.size());
        }
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc383_d", {
    algorithm: "恰有 9 个约数的数只有 p^8 或 p^2 q^2 两类。筛出质数后分别计数 p^8 <= N 和 p q <= sqrt(N) 的质数对。",
    complexity: "O(sqrt(N) log log sqrt(N))",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;
    long long limit = sqrt((long double)n);
    while ((limit + 1) * (limit + 1) <= n) limit++;
    while (limit * limit > n) limit--;

    vector<int> isPrime(limit + 1, 1), primes;
    if (limit >= 0) isPrime[0] = 0;
    if (limit >= 1) isPrime[1] = 0;
    for (long long i = 2; i <= limit; ++i) {
        if (!isPrime[i]) continue;
        primes.push_back((int)i);
        if (i * i <= limit) {
            for (long long j = i * i; j <= limit; j += i) isPrime[j] = 0;
        }
    }

    long long answer = 0;
    for (long long p : primes) {
        long double v = 1;
        for (int i = 0; i < 8; ++i) v *= p;
        if (v <= (long double)n + 0.5L) answer++;
        else break;
    }
    for (int i = 0; i < (int)primes.size(); ++i) {
        long long maxQ = limit / primes[i];
        int upper = upper_bound(primes.begin(), primes.end(), maxQ) - primes.begin();
        if (upper > i + 1) answer += upper - i - 1;
    }
    cout << answer << '\\n';
    return 0;
}
`
  }],
  ["AT_abc384_d", {
    algorithm: "数组元素为正。先把目标和对周期总和取模，剩余部分只需在双倍数组中用双指针查找连续和。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long s;
    cin >> n >> s;
    vector<long long> a(n);
    long long total = 0;
    for (long long &value : a) {
        cin >> value;
        total += value;
    }
    long long target = s % total;
    if (target == 0) {
        cout << "Yes\\n";
        return 0;
    }
    long long sum = 0;
    int left = 0;
    for (int right = 0; right < 2 * n; ++right) {
        sum += a[right % n];
        while (sum > target && left <= right) {
            sum -= a[left % n];
            left++;
        }
        if (sum == target) {
            cout << "Yes\\n";
            return 0;
        }
    }
    cout << "No\\n";
    return 0;
}
`
  }],
  ["AT_abc386_d", {
    algorithm: "每一行用阈值分隔黑白。黑点给出该行下界，白点给出该行上界；从上到下维护全局可用上界，检查所有下界不超过它。",
    complexity: "O(M log M)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    map<int, pair<int, int>> rows;
    for (int i = 0; i < m; ++i) {
        int x, y;
        char c;
        cin >> x >> y >> c;
        if (!rows.count(x)) rows[x] = {0, n};
        if (c == 'B') rows[x].first = max(rows[x].first, y);
        else rows[x].second = min(rows[x].second, y - 1);
    }

    int limit = n;
    for (auto [row, bounds] : rows) {
        limit = min(limit, bounds.second);
        if (bounds.first > limit) {
            cout << "No\\n";
            return 0;
        }
    }
    cout << "Yes\\n";
    return 0;
}
`
  }],
  ["AT_abc388_d", {
    algorithm: "用差分数组维护前面老人送来的糖。第 i 人最多给后面 A_i 个人各 1 颗，做一次区间加并扣掉送出的数量。",
    complexity: "O(N)",
    code: `${CPP_INCLUDES}
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n), diff(n + 1, 0);
    for (long long &value : a) cin >> value;

    long long add = 0;
    for (int i = 0; i < n; ++i) {
        add += diff[i];
        a[i] += add;
        long long give = min<long long>(a[i], n - 1 - i);
        a[i] -= give;
        if (give > 0) {
            diff[i + 1]++;
            diff[i + 1 + give]--;
        }
    }
    for (int i = 0; i < n; ++i) {
        if (i) cout << ' ';
        cout << a[i];
    }
    cout << '\\n';
    return 0;
}
`
  }]
]);

function normalizeOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function numericTokens(value) {
  const tokens = normalizeOutput(value).split(/\s+/).filter(Boolean);
  if (!tokens.length) {
    return null;
  }
  const numbers = tokens.map((token) => Number(token));
  return numbers.every((number) => Number.isFinite(number)) ? numbers : null;
}

function outputsMatch(expected, actual) {
  const normalizedExpected = normalizeOutput(expected);
  const normalizedActual = normalizeOutput(actual);
  if (normalizedExpected === normalizedActual) {
    return true;
  }

  const expectedNumbers = numericTokens(normalizedExpected);
  const actualNumbers = numericTokens(normalizedActual);
  if (!expectedNumbers || !actualNumbers || expectedNumbers.length !== actualNumbers.length) {
    return false;
  }

  return expectedNumbers.every((expectedNumber, index) => {
    const actualNumber = actualNumbers[index];
    const tolerance = 1e-6 * Math.max(1, Math.abs(expectedNumber));
    return Math.abs(expectedNumber - actualNumber) <= tolerance;
  });
}

function integerTokens(value) {
  const tokens = normalizeOutput(value).split(/\s+/).filter(Boolean);
  const numbers = tokens.map((token) => Number(token));
  return numbers.every((number) => Number.isInteger(number)) ? numbers : null;
}

function validateAbc126D(input, actual) {
  const inputNumbers = integerTokens(input);
  const outputNumbers = integerTokens(actual);
  if (!inputNumbers || !outputNumbers) return false;
  const n = inputNumbers[0];
  if (outputNumbers.length !== n) return false;
  if (!outputNumbers.every((value) => value === 0 || value === 1)) return false;

  let cursor = 1;
  for (let i = 0; i < n - 1; ++i) {
    const u = inputNumbers[cursor++] - 1;
    const v = inputNumbers[cursor++] - 1;
    const w = inputNumbers[cursor++];
    if ((outputNumbers[u] ^ outputNumbers[v]) !== (w % 2)) return false;
  }
  return true;
}

function validateAbc168D(input, actual) {
  const inputNumbers = integerTokens(input);
  const actualTokens = normalizeOutput(actual).split(/\s+/).filter(Boolean);
  if (!inputNumbers || actualTokens[0] !== "Yes") return false;
  const n = inputNumbers[0];
  const m = inputNumbers[1];
  if (actualTokens.length !== n) return false;

  const edgeSet = new Set();
  let cursor = 2;
  for (let i = 0; i < m; ++i) {
    const a = inputNumbers[cursor++];
    const b = inputNumbers[cursor++];
    edgeSet.add(`${Math.min(a, b)}:${Math.max(a, b)}`);
  }

  const parent = Array(n + 1).fill(0);
  const children = Array.from({ length: n + 1 }, () => []);
  for (let room = 2; room <= n; ++room) {
    const p = Number(actualTokens[room - 1]);
    if (!Number.isInteger(p) || p < 1 || p > n || p === room) return false;
    if (!edgeSet.has(`${Math.min(room, p)}:${Math.max(room, p)}`)) return false;
    parent[room] = p;
    children[p].push(room);
  }

  const seen = Array(n + 1).fill(false);
  const stack = [1];
  seen[1] = true;
  while (stack.length) {
    const v = stack.pop();
    for (const to of children[v]) {
      if (seen[to]) return false;
      seen[to] = true;
      stack.push(to);
    }
  }
  return seen.slice(1).every(Boolean);
}

function validateAbc271D(input, expected, actual) {
  const inputNumbers = integerTokens(input);
  const actualTokens = normalizeOutput(actual).split(/\s+/).filter(Boolean);
  if (!inputNumbers || actualTokens.length < 1) return false;
  if (actualTokens[0] === "No") {
    return normalizeOutput(expected) === "No" && actualTokens.length === 1;
  }
  const n = inputNumbers[0];
  const target = inputNumbers[1];
  if (actualTokens[0] !== "Yes" || actualTokens.length !== 2) return false;
  const choices = actualTokens[1];
  if (choices.length !== n || !/^[HT]+$/.test(choices)) return false;

  let sum = 0;
  let cursor = 2;
  for (let i = 0; i < n; ++i) {
    const heads = inputNumbers[cursor++];
    const tails = inputNumbers[cursor++];
    sum += choices[i] === "H" ? heads : tails;
  }
  return sum === target;
}

function validateAbc311C(input, actual) {
  const inputNumbers = integerTokens(input);
  const outputNumbers = integerTokens(actual);
  if (!inputNumbers || !outputNumbers || outputNumbers.length < 2) return false;
  const n = inputNumbers[0];
  const k = outputNumbers[0];
  if (!Number.isInteger(k) || k <= 0 || outputNumbers.length !== k + 1) return false;
  const to = inputNumbers.slice(1).map((value) => value - 1);
  const cycle = outputNumbers.slice(1).map((value) => value - 1);
  if (cycle.some((value) => value < 0 || value >= n)) return false;
  if (new Set(cycle).size !== cycle.length) return false;
  for (let i = 0; i < k; ++i) {
    if (to[cycle[i]] !== cycle[(i + 1) % k]) return false;
  }
  return true;
}

function validateAbc315E(input, actual) {
  const inputNumbers = integerTokens(input);
  const outputNumbers = integerTokens(actual);
  if (!inputNumbers || !outputNumbers) return false;
  const n = inputNumbers[0];
  const need = Array.from({ length: n }, () => []);
  let cursor = 1;
  for (let i = 0; i < n; ++i) {
    const c = inputNumbers[cursor++];
    for (let j = 0; j < c; ++j) {
      need[i].push(inputNumbers[cursor++] - 1);
    }
  }

  const reachable = Array(n).fill(false);
  const stack = [0];
  reachable[0] = true;
  while (stack.length) {
    const v = stack.pop();
    for (const to of need[v]) {
      if (!reachable[to]) {
        reachable[to] = true;
        stack.push(to);
      }
    }
  }
  const required = [];
  for (let i = 1; i < n; ++i) {
    if (reachable[i]) required.push(i);
  }
  if (outputNumbers.length !== required.length) return false;

  const position = Array(n).fill(-1);
  for (let i = 0; i < outputNumbers.length; ++i) {
    const book = outputNumbers[i] - 1;
    if (book <= 0 || book >= n || !reachable[book] || position[book] !== -1) return false;
    position[book] = i;
  }
  for (const book of required) {
    if (position[book] === -1) return false;
    for (const dependency of need[book]) {
      if (dependency !== 0 && reachable[dependency] && position[dependency] > position[book]) return false;
    }
  }
  for (const dependency of need[0]) {
    if (dependency !== 0 && position[dependency] === -1) return false;
  }
  return true;
}

function validateAbc347D(input, expected, actual) {
  const inputTokens = normalizeOutput(input).split(/\s+/).filter(Boolean);
  const outputTokens = normalizeOutput(actual).split(/\s+/).filter(Boolean);
  if (inputTokens.length !== 3) return false;
  const a = Number(inputTokens[0]);
  const b = Number(inputTokens[1]);
  const c = BigInt(inputTokens[2]);
  if (normalizeOutput(expected) === "-1") {
    return normalizeOutput(actual) === "-1";
  }
  if (outputTokens.length !== 2) return false;
  const x = BigInt(outputTokens[0]);
  const y = BigInt(outputTokens[1]);
  if (x < 0n || y < 0n) return false;
  return popcountBigInt(BigInt(x)) === a
    && popcountBigInt(BigInt(y)) === b
    && (x ^ y) === c;
}

function validateAbc240E(input, actual) {
  const inputNumbers = integerTokens(input);
  const outputNumbers = integerTokens(actual);
  if (!inputNumbers || !outputNumbers) return false;
  const n = inputNumbers[0];
  if (outputNumbers.length !== 2 * n) return false;

  const graph = Array.from({ length: n }, () => []);
  let cursor = 1;
  for (let i = 0; i < n - 1; ++i) {
    const u = inputNumbers[cursor++] - 1;
    const v = inputNumbers[cursor++] - 1;
    graph[u].push(v);
    graph[v].push(u);
  }

  const ranges = Array.from({ length: n }, (_, index) => {
    const left = outputNumbers[2 * index];
    const right = outputNumbers[2 * index + 1];
    return [left, right];
  });
  const leafRanges = new Set();
  for (let i = 0; i < n; ++i) {
    const [left, right] = ranges[i];
    if (!Number.isInteger(left) || !Number.isInteger(right) || left < 1 || right < left || right > n) return false;
    const isLeaf = i === 0 ? graph[i].length === 0 : graph[i].length === 1;
    if (isLeaf) {
      if (left !== right || leafRanges.has(left)) return false;
      leafRanges.add(left);
    }
  }

  function dfs(v, parent) {
    const childRanges = [];
    for (const to of graph[v]) {
      if (to === parent) continue;
      childRanges.push(dfs(to, v));
    }
    if (!childRanges.length) return ranges[v];
    const left = Math.min(...childRanges.map((range) => range[0]));
    const right = Math.max(...childRanges.map((range) => range[1]));
    if (ranges[v][0] !== left || ranges[v][1] !== right) throw new Error("invalid range");
    return [left, right];
  }

  try {
    dfs(0, -1);
    return true;
  } catch {
    return false;
  }
}

function validateAbc373D(input, actual) {
  const inputNumbers = integerTokens(input);
  const outputNumbers = integerTokens(actual);
  if (!inputNumbers || !outputNumbers) return false;
  const n = inputNumbers[0];
  const m = inputNumbers[1];
  if (outputNumbers.length !== n) return false;
  let cursor = 2;
  for (let i = 0; i < m; ++i) {
    const u = inputNumbers[cursor++] - 1;
    const v = inputNumbers[cursor++] - 1;
    const w = inputNumbers[cursor++];
    if (outputNumbers[v] - outputNumbers[u] !== w) return false;
  }
  return true;
}

function popcountBigInt(value) {
  let count = 0;
  while (value > 0n) {
    count += Number(value & 1n);
    value >>= 1n;
  }
  return count;
}

function sampleOutputPasses(problem, sample, expected, actual) {
  if (problem.id === "AT_abc126_d") {
    return validateAbc126D(sample.input, actual);
  }
  if (problem.id === "AT_abc168_d") {
    return validateAbc168D(sample.input, actual);
  }
  if (problem.id === "AT_abc240_e") {
    return validateAbc240E(sample.input, actual);
  }
  if (problem.id === "AT_abc271_d") {
    return validateAbc271D(sample.input, expected, actual);
  }
  if (problem.id === "AT_abc311_c") {
    return validateAbc311C(sample.input, actual);
  }
  if (problem.id === "AT_abc315_e") {
    return validateAbc315E(sample.input, actual);
  }
  if (problem.id === "AT_abc347_d") {
    return validateAbc347D(sample.input, expected, actual);
  }
  if (problem.id === "AT_abc373_d") {
    return validateAbc373D(sample.input, actual);
  }
  return outputsMatch(expected, actual);
}

async function compileAndRun(problem, code, tempRoot) {
  const basename = problem.id.replace(/[^a-z0-9]+/gi, "_");
  const sourcePath = join(tempRoot, `${basename}.cpp`);
  const binaryPath = join(tempRoot, `${basename}.out`);
  await writeFile(sourcePath, code, "utf8");
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], {
    maxBuffer: 4 * 1024 * 1024
  });

  const sampleResults = [];
  for (const [index, sample] of problem.statement.samples.entries()) {
    const actual = await runBinary(binaryPath, `${sample.input}\n`);
    const expected = sample.output;
    sampleResults.push({
      index: index + 1,
      expected: normalizeOutput(expected),
      actual: normalizeOutput(actual),
      passed: sampleOutputPasses(problem, sample, expected, actual)
    });
  }
  const failed = sampleResults.filter((result) => !result.passed);
  if (failed.length) {
    throw new Error(`${problem.id}: sample verification failed ${JSON.stringify(failed)}`);
  }
  return sampleResults;
}

function runBinary(binaryPath, input) {
  return new Promise((resolve, reject) => {
    const child = spawn(binaryPath, [], { stdio: ["pipe", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    const timer = setTimeout(() => {
      child.kill("SIGKILL");
      reject(new Error(`${binaryPath}: timeout`));
    }, 5000);

    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk) => {
      stdout += chunk;
    });
    child.stderr.on("data", (chunk) => {
      stderr += chunk;
    });
    child.on("error", (error) => {
      clearTimeout(timer);
      reject(error);
    });
    child.on("close", (code) => {
      clearTimeout(timer);
      if (code === 0) {
        resolve(stdout);
      } else {
        reject(new Error(`${binaryPath}: exited ${code}; ${stderr}`));
      }
    });
    child.stdin.end(input);
  });
}

function applyKnownSolution(problem, solution, sampleResults) {
  return {
    ...problem,
    programming_solution: {
      status: "needs_review",
      language: "C++17",
      code: solution.code,
      content_origin: "ai_generated_sample_verified",
      ai_generation_notice: "当前 C++17 参考解由 AI/规则生成，并已通过当前公开样例；不是官方题解，仍需人工复核或 OJ 评测确认。",
      reference_answer: "AI/规则生成 C++17 参考解已通过公开样例，仍需复核。",
      algorithm: solution.algorithm,
      complexity: solution.complexity,
      verification: {
        status: "sample_passed",
        verifier: "scripts/generate-atcoder-known-cpp-solutions.mjs",
        verified_at: new Date().toISOString(),
        sample_count: sampleResults.length,
        sample_results: sampleResults
      },
      notes: [
        "该代码由本地已知题型生成器写入，不是官方题解。",
        "代码已通过当前采集到的公开样例。",
        "正式使用前建议继续用洛谷或 AtCoder 评测。"
      ]
    },
    answer_guidance: {
      ...problem.answer_guidance,
      status: "reference_link",
      answer: "当前答案是 AI 生成，仅供参考。已生成 C++17 参考解并通过公开样例；仍需人工或 OJ 复核。",
      source: "luogu_problem_page",
      source_url: problem.source_url,
      solution_outline: solution.algorithm,
      review_note: "当前答案是 AI 生成，仅供参考；不是官方题解，已通过当前公开样例但仍需复核边界条件。",
      content_origin: "ai_generated_sample_verified"
    }
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(DATA_PATH, "utf8"));
  const unsolvedKnown = catalog.problems.filter((problem) => {
    return !problem.programming_solution?.code
      && KNOWN_SOLUTIONS.has(problem.id)
      && problem.statement?.status === "source_extracted"
      && problem.statement.samples.length > 0;
  });
  const candidates = LIMIT > 0 ? unsolvedKnown.slice(0, LIMIT) : unsolvedKnown;
  if (!candidates.length) {
    console.log("No known AtCoder C++ solutions are pending.");
    return;
  }

  const tempRoot = await mkdtemp(join(tmpdir(), "atcoder-known-cpp-"));
  const solved = new Map();
  try {
    for (const problem of candidates) {
      const solution = KNOWN_SOLUTIONS.get(problem.id);
      const sampleResults = await compileAndRun(problem, solution.code, tempRoot);
      solved.set(problem.id, applyKnownSolution(problem, solution, sampleResults));
      console.log(`generated and verified known C++ solution: ${problem.id}`);
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  catalog.problems = catalog.problems.map((problem) => solved.get(problem.id) || problem);
  catalog.generated_at = new Date().toISOString();
  catalog.summary.ai_sample_verified_solution_count = catalog.problems.filter((problem) => problem.programming_solution?.verification?.status === "sample_passed").length;
  catalog.summary.pending_ai_generation_count = catalog.problems.filter((problem) => !problem.programming_solution?.code).length;

  await writeFile(DATA_PATH, `${JSON.stringify(catalog, null, 2)}\n`, "utf8");
  console.log(`known C++ solutions generated: ${solved.size}`);
  console.log(`wrote ${DATA_PATH}`);
}

main().catch((error) => {
  console.error(`Known AtCoder C++ generation failed: ${error.message}`);
  process.exitCode = 1;
});
