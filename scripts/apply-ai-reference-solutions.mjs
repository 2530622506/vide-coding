import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

const solutionPacks = {
  "supplemental:luogu:b4006": {
    algorithm: "先按宝箱价值升序排序。因为所有价值为正，最优方案一定是排序后某个连续窗口；用双指针维护最大值和最小值差不超过 k 的窗口，并维护窗口总和最大值。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];

    sort(a.begin(), a.end());

    long long sum = 0;
    long long answer = 0;
    int left = 0;
    for (int right = 0; right < n; ++right) {
        sum += a[right];
        while (a[right] - a[left] > k) {
            // 中文注释：当前窗口最大最小值差超限，左端宝箱不能继续保留。
            sum -= a[left];
            ++left;
        }
        answer = max(answer, sum);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4069": {
    algorithm: "每个字符串内部必须已经按非降序排列。把每个字符串看成首字符到尾字符的区间，按首字符升序排列后，只要前一个字符串尾字符不大于后一个字符串首字符，就能拼成整体非降序字符串。",
    complexity: "时间复杂度 O(T*n*L + T*n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tests;
    cin >> tests;
    while (tests--) {
        int n;
        cin >> n;
        vector<string> words(n);
        bool ok = true;
        for (int i = 0; i < n; ++i) {
            cin >> words[i];
            for (int j = 1; j < static_cast<int>(words[i].size()); ++j) {
                if (words[i][j - 1] > words[i][j]) {
                    ok = false;
                }
            }
        }

        sort(words.begin(), words.end(), [](const string& a, const string& b) {
            if (a.front() != b.front()) return a.front() < b.front();
            return a.back() < b.back();
        });

        for (int i = 1; i < n; ++i) {
            // 中文注释：拼接边界也必须满足前一段最后字符 <= 后一段首字符。
            if (words[i - 1].back() > words[i].front()) {
                ok = false;
            }
        }

        cout << (ok ? 1 : 0) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:xinchuan:gesp202309": {
    algorithm: "每个游戏占用一个时间段，且必须不晚于截止时间完成。按奖励从大到小考虑游戏，每次把它安排到不超过截止时间的最晚空闲时间段，能留下更早时间给截止更早的游戏。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> deadline(n), reward(n);
    for (int i = 0; i < n; ++i) cin >> deadline[i];
    for (int i = 0; i < n; ++i) cin >> reward[i];

    vector<pair<int, int>> games;
    for (int i = 0; i < n; ++i) {
        games.push_back({reward[i], deadline[i]});
    }
    sort(games.rbegin(), games.rend());

    vector<int> used(n + 1, 0);
    long long answer = 0;
    for (auto [value, lastTime] : games) {
        for (int t = min(lastTime, n); t >= 1; --t) {
            if (!used[t]) {
                // 中文注释：高奖励游戏优先占用最晚可用时间，减少对其他游戏的影响。
                used[t] = 1;
                answer += value;
                break;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:xinchuan:gesp202312": {
    algorithm: "从高位到低位贪心尝试把答案的当前位设为 1。若至少有两个数同时包含候选掩码 candidate，则存在一对数的按位与至少包含这些位，可以保留该位。",
    complexity: "时间复杂度 O(31N)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];

    int answer = 0;
    for (int bit = 30; bit >= 0; --bit) {
        int candidate = answer | (1 << bit);
        int count = 0;
        for (int value : a) {
            if ((value & candidate) == candidate) {
                ++count;
            }
        }
        // 中文注释：至少两个数包含 candidate 的全部 1 位，才可能组成这一按位与结果。
        if (count >= 2) {
            answer = candidate;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:xinchuan:gesp202406": {
    algorithm: "预处理每个数的最小质因数。对每个询问不断除去相同质因数并统计不同质因数个数，恰好等于 2 时输出 1，否则输出 0。",
    complexity: "预处理 O(M log log M)，每个数分解 O(log M)，空间复杂度 O(M)，其中 M=1000000。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    const int LIMIT = 1000000;
    vector<int> spf(LIMIT + 1, 0);
    for (int i = 2; i <= LIMIT; ++i) {
        if (spf[i] == 0) {
            for (long long j = i; j <= LIMIT; j += i) {
                if (spf[j] == 0) spf[j] = i;
            }
        }
    }

    int n;
    cin >> n;
    while (n--) {
        int x;
        cin >> x;
        int distinct = 0;
        while (x > 1) {
            int p = spf[x];
            ++distinct;
            while (x % p == 0) {
                // 中文注释：同一个质因数只统计一次。
                x /= p;
            }
        }
        cout << (distinct == 2 ? 1 : 0) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:aijieoj:6028": {
    algorithm: "假设所有物品都由 C 购买，基础收入为 sum(c_i)。若第 i 个物品改由 B 购买，收入变化为 b_i-c_i。为了让 B 恰好买 n 个物品，选择最大的 n 个差值加入基础收入。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int total = 2 * n;
    vector<long long> b(total), c(total);
    for (int i = 0; i < total; ++i) cin >> b[i];
    for (int i = 0; i < total; ++i) cin >> c[i];

    long long answer = 0;
    vector<long long> diff(total);
    for (int i = 0; i < total; ++i) {
        answer += c[i];
        diff[i] = b[i] - c[i];
    }
    sort(diff.rbegin(), diff.rend());

    for (int i = 0; i < n; ++i) {
        // 中文注释：选择改给 B 后增益最大的 n 个物品。
        answer += diff[i];
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10379": {
    algorithm: "对网格中每个同色四连通块做 BFS，记录所有格子相对左上角的坐标并排序，平移后相同的坐标集合表示同一种形状。",
    complexity: "时间复杂度 O(nm log(nm))，空间复杂度 O(nm)。",
    code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <set>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> color(n, vector<int>(m));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) cin >> color[i][j];
    }

    vector<vector<int>> visited(n, vector<int>(m, 0));
    set<vector<pair<int, int>>> shapes;
    int dr[4] = {1, -1, 0, 0};
    int dc[4] = {0, 0, 1, -1};

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
            for (auto [x, y] : cells) {
                // 中文注释：只允许平移，所以减去最小行列后比较相对坐标。
                normalized.push_back({x - minRow, y - minCol});
            }
            sort(normalized.begin(), normalized.end());
            shapes.insert(normalized);
        }
    }

    cout << shapes.size() << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10723": {
    algorithm: "要让黑点连通，必须把所有初始黑点的最小连通子树染黑。边两侧都有黑点时该边属于最小子树，答案是该子树节点数减初始黑点数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> isBlack(n + 1);
    int totalBlack = 0;
    for (int i = 1; i <= n; ++i) {
        cin >> isBlack[i];
        totalBlack += isBlack[i];
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
    vector<int> stack = {1};
    parent[1] = -1;
    while (!stack.empty()) {
        int node = stack.back();
        stack.pop_back();
        order.push_back(node);
        for (int next : graph[node]) {
            if (next == parent[node]) continue;
            parent[next] = node;
            stack.push_back(next);
        }
    }

    vector<int> subtreeBlack(n + 1, 0), inSteiner(n + 1, 0);
    for (int i = n - 1; i >= 0; --i) {
        int node = order[i];
        subtreeBlack[node] += isBlack[node];
        for (int next : graph[node]) {
            if (parent[next] == node) subtreeBlack[node] += subtreeBlack[next];
        }
        if (isBlack[node]) inSteiner[node] = 1;
        if (parent[node] > 0 && subtreeBlack[node] > 0 && totalBlack - subtreeBlack[node] > 0) {
            // 中文注释：这条父子边两侧都有黑点，属于连接所有黑点的最小子树。
            inSteiner[node] = 1;
            inSteiner[parent[node]] = 1;
        }
    }

    int steinerNodes = 0;
    for (int i = 1; i <= n; ++i) steinerNodes += inSteiner[i];
    cout << steinerNodes - totalBlack << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10724": {
    algorithm: "把每个数转成质因数指数奇偶性的二进制掩码。区间乘积为完全平方数当且仅当区间异或为 0，即两端前缀掩码相同。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(2^10)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> primes = {2, 3, 5, 7, 11, 13, 17, 19, 23, 29};
    vector<long long> count(1 << 10, 0);
    int prefix = 0;
    count[0] = 1;
    long long answer = 0;

    for (int i = 0; i < n; ++i) {
        int x;
        cin >> x;
        int mask = 0;
        for (int bit = 0; bit < static_cast<int>(primes.size()); ++bit) {
            int parity = 0;
            while (x % primes[bit] == 0) {
                x /= primes[bit];
                parity ^= 1;
            }
            if (parity) mask ^= (1 << bit);
        }
        // 中文注释：相同前缀掩码之间的区间，所有质因数指数都是偶数。
        prefix ^= mask;
        answer += count[prefix];
        ++count[prefix];
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11248": {
    algorithm: "路径得分等于路径上的 1 数量加上最多 x 个问号。用 DP 维护到当前格、已转换问号数为 k 时的最高得分。",
    complexity: "时间复杂度 O(t*n*m*x)，空间复杂度 O(m*x)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tests;
    cin >> tests;
    const int NEG = -1e9;
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
                        // 中文注释：问号可以不改，也可以消耗一次修改变为 1。
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
        cout << answer << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p11249": {
    algorithm: "每条边最多经过一次，因此实际路线是一条简单路径。能取完所有宝物当且仅当所有宝物位于同一条简单路径上，即宝物最小连通子树中度数大于 2 的节点不存在。",
    complexity: "时间复杂度 O(t*n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int tests;
    cin >> tests;
    while (tests--) {
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
        vector<int> stack = {1};
        parent[1] = -1;
        while (!stack.empty()) {
            int node = stack.back();
            stack.pop_back();
            order.push_back(node);
            for (int next : graph[node]) {
                if (next == parent[node]) continue;
                parent[next] = node;
                stack.push_back(next);
            }
        }

        vector<int> subtreeTreasure(n + 1, 0), degreeInCore(n + 1, 0);
        for (int i = n - 1; i >= 0; --i) {
            int node = order[i];
            subtreeTreasure[node] += treasure[node];
            for (int next : graph[node]) {
                if (parent[next] == node) subtreeTreasure[node] += subtreeTreasure[next];
            }
            if (parent[node] > 0 && subtreeTreasure[node] > 0 && totalTreasure - subtreeTreasure[node] > 0) {
                // 中文注释：该边在连接所有宝物的最小子树中。
                ++degreeInCore[node];
                ++degreeInCore[parent[node]];
            }
        }

        bool ok = true;
        for (int i = 1; i <= n; ++i) {
            if (degreeInCore[i] > 2) ok = false;
        }
        cout << (ok ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p10110": {
    algorithm: "每次交易 x->y 的花费为 v[y]-v[x]+1，沿路径价值差会望远镜相消，所以总花费等于 v[b]-v[a]+交易次数。只需在有向图中求 a 到 b 的最少边数。",
    complexity: "时间复杂度 O(N+M)，空间复杂度 O(N+M)。",
    code: `#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, start, target;
    cin >> n >> m >> start >> target;
    vector<long long> value(n);
    for (int i = 0; i < n; ++i) cin >> value[i];

    vector<vector<int>> graph(n);
    for (int i = 0; i < m; ++i) {
        int x, y;
        cin >> x >> y;
        graph[x].push_back(y);
    }

    vector<int> dist(n, -1);
    queue<int> q;
    dist[start] = 0;
    q.push(start);
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int next : graph[node]) {
            if (dist[next] != -1) continue;
            // 中文注释：价值差与路径无关，BFS 只需要最少交易次数。
            dist[next] = dist[node] + 1;
            q.push(next);
        }
    }

    if (dist[target] == -1) {
        cout << "No solution\\n";
    } else {
        cout << value[target] - value[start] + dist[target] << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p10111": {
    algorithm: "动态规划。dp[t][c] 表示当前轮结束时已经换牌 t 次、当前出牌 c 的最大得分；换牌时扣第 t 次换牌罚分。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

long long roundScore(int mine, int opponent, long long point) {
    if (mine == opponent) return point;
    if ((mine == 1 && opponent == 0) ||
        (mine == 2 && opponent == 1) ||
        (mine == 0 && opponent == 2)) {
        return 2 * point;
    }
    return 0;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> score(n + 1), penalty(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> score[i];
    for (int i = 1; i <= n - 1; ++i) cin >> penalty[i];
    vector<int> opponent(n + 1);
    for (int i = 1; i <= n; ++i) cin >> opponent[i];

    const long long NEG = -4e18;
    vector<vector<long long>> dp(n, vector<long long>(3, NEG));
    for (int card = 0; card < 3; ++card) {
        dp[0][card] = roundScore(card, opponent[1], score[1]);
    }

    for (int round = 2; round <= n; ++round) {
        vector<vector<long long>> nextDp(n, vector<long long>(3, NEG));
        for (int changes = 0; changes <= round - 2; ++changes) {
            for (int last = 0; last < 3; ++last) {
                if (dp[changes][last] == NEG) continue;
                for (int card = 0; card < 3; ++card) {
                    int nextChanges = changes + (card != last);
                    long long gain = roundScore(card, opponent[round], score[round]);
                    long long cost = (card == last) ? 0 : penalty[nextChanges];
                    // 中文注释：第 nextChanges 次换牌扣 b[nextChanges]。
                    nextDp[nextChanges][card] = max(nextDp[nextChanges][card], dp[changes][last] + gain - cost);
                }
            }
        }
        dp.swap(nextDp);
    }

    long long answer = NEG;
    for (const auto& row : dp) {
        for (long long value : row) answer = max(answer, value);
    }
    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10265": {
    algorithm: "邻接矩阵中第 m 行 1 的个数是 m 能直接到达的迷宫数，第 m 列 1 的个数是能直接到达 m 的迷宫数。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    int outgoing = 0;
    int incoming = 0;
    for (int row = 1; row <= n; ++row) {
        for (int col = 1; col <= n; ++col) {
            int reachable;
            cin >> reachable;
            // 中文注释：第 m 行统计从 m 出发，第 m 列统计到达 m。
            if (row == m && reachable == 1) ++outgoing;
            if (col == m && reachable == 1) ++incoming;
        }
    }

    cout << outgoing << ' ' << incoming << ' ' << outgoing + incoming << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10287": {
    algorithm: "点权只有 1..10。对 DAG 拓扑排序，state[u][v] 表示某条到达 u 的路径中、最长不下降子序列以值 v 结尾的最大长度；沿边转移时可选择加入下一点或不加入。",
    complexity: "时间复杂度 O((N+M)*10)，空间复杂度 O(N*10+M)。",
    code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> weight(n + 1);
    for (int i = 1; i <= n; ++i) cin >> weight[i];

    vector<vector<int>> graph(n + 1);
    vector<int> indegree(n + 1, 0);
    for (int i = 0; i < m; ++i) {
        int u, v;
        cin >> u >> v;
        graph[u].push_back(v);
        ++indegree[v];
    }

    vector<vector<int>> state(n + 1, vector<int>(11, 0));
    queue<int> q;
    for (int node = 1; node <= n; ++node) {
        state[node][weight[node]] = 1;
        if (indegree[node] == 0) q.push(node);
    }

    int answer = 1;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int value = 1; value <= 10; ++value) {
            answer = max(answer, state[node][value]);
        }
        for (int next : graph[node]) {
            vector<int> candidate = state[node];
            int bestBefore = 0;
            for (int value = 1; value <= weight[next]; ++value) {
                bestBefore = max(bestBefore, state[node][value]);
            }
            // 中文注释：如果把 next 加入不下降子序列，前一个值不能超过 weight[next]。
            candidate[weight[next]] = max(candidate[weight[next]], bestBefore + 1);
            candidate[weight[next]] = max(candidate[weight[next]], 1);
            for (int value = 1; value <= 10; ++value) {
                state[next][value] = max(state[next][value], candidate[value]);
            }
            if (--indegree[next] == 0) q.push(next);
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10378": {
    algorithm: "交流关系构成二分图。每个连通块的两种染色可以互换，B 校人数最小值累加 min(size0,size1)，最大值累加 max(size0,size1)。",
    complexity: "时间复杂度 O(N+M)，空间复杂度 O(N+M)。",
    code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

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
    long long minimumB = 0;
    long long maximumB = 0;
    for (int start = 1; start <= n; ++start) {
        if (color[start] != -1) continue;
        int count[2] = {0, 0};
        queue<int> q;
        color[start] = 0;
        q.push(start);
        while (!q.empty()) {
            int node = q.front();
            q.pop();
            ++count[color[node]];
            for (int next : graph[node]) {
                if (color[next] != -1) continue;
                // 中文注释：一次交流一定跨校，所以相邻点属于不同颜色。
                color[next] = color[node] ^ 1;
                q.push(next);
            }
        }
        minimumB += min(count[0], count[1]);
        maximumB += max(count[0], count[1]);
    }

    cout << minimumB << ' ' << maximumB << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11963": {
    algorithm: "环线行程等价于在环形数组中选择一个非空连续子段，答案是普通最大子段和与跨首尾最大子段和的较大值。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n);
    long long total = 0;
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
        total += a[i];
    }

    long long maxEnding = a[0], bestMax = a[0];
    long long minEnding = a[0], bestMin = a[0];
    for (int i = 1; i < n; ++i) {
        // 中文注释：普通最大子段和，对应不跨越编号 n 到 1 的行程。
        maxEnding = max(a[i], maxEnding + a[i]);
        bestMax = max(bestMax, maxEnding);
        // 中文注释：最小子段和用于计算跨首尾子段，即总和减去中间不选的一段。
        minEnding = min(a[i], minEnding + a[i]);
        bestMin = min(bestMin, minEnding);
    }

    long long answer = bestMax;
    if (bestMin != total) {
        answer = max(answer, total - bestMin);
    }
    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p13015": {
    algorithm: "设 dp[i] 表示 i 名同学能得到的最大总积极度，枚举最后一个学习小组大小 j，转移为 dp[i]=max(dp[i-j]+a[j])。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> value(n + 1);
    for (int i = 1; i <= n; ++i) cin >> value[i];

    vector<long long> dp(n + 1, 0);
    for (int people = 1; people <= n; ++people) {
        for (int groupSize = 1; groupSize <= people; ++groupSize) {
            // 中文注释：最后一个小组有 groupSize 人，剩余 people-groupSize 人已经最优划分。
            dp[people] = max(dp[people], dp[people - groupSize] + value[groupSize]);
        }
    }

    cout << dp[n] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p13016": {
    algorithm: "结点 k 的父亲是 k 除以最小质因数。分别生成 x、y 到根的祖先链，反向后寻找最长公共前缀即可得到 LCA 和距离。",
    complexity: "每次求父亲试除到 sqrt(x)，单个询问祖先链长度不超过约 30，适合 q <= 1000。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

long long smallestPrimeFactor(long long x) {
    if (x % 2 == 0) return 2;
    for (long long d = 3; d * d <= x; d += 2) {
        if (x % d == 0) return d;
    }
    return x;
}

long long parentOf(long long x) {
    if (x == 1) return 0;
    // 中文注释：最大真因数等于 x 除以最小质因数。
    return x / smallestPrimeFactor(x);
}

vector<long long> pathToRoot(long long x) {
    vector<long long> path;
    while (x > 0) {
        path.push_back(x);
        x = parentOf(x);
    }
    reverse(path.begin(), path.end());
    return path;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int q;
    cin >> q;
    while (q--) {
        long long x, y;
        cin >> x >> y;
        vector<long long> px = pathToRoot(x);
        vector<long long> py = pathToRoot(y);

        int common = 0;
        while (common < static_cast<int>(px.size()) &&
               common < static_cast<int>(py.size()) &&
               px[common] == py[common]) {
            ++common;
        }

        int distance = static_cast<int>(px.size() - common) + static_cast<int>(py.size() - common);
        cout << distance << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p14075": {
    algorithm: "因为子串内每个字母最多出现一次，合法子串长度不超过 26。设 dp[i] 为前 i 个字符最大价值，向前枚举最多 26 个字符并检查是否重复。",
    complexity: "时间复杂度 O(26n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string s;
    cin >> n >> s;
    vector<long long> value(n + 1);
    for (int i = 1; i <= n; ++i) cin >> value[i];

    const long long NEG = -4e18;
    vector<long long> dp(n + 1, NEG);
    dp[0] = 0;
    for (int end = 1; end <= n; ++end) {
        vector<int> seen(26, 0);
        for (int start = end; start >= 1 && end - start + 1 <= 26; --start) {
            int letter = s[start - 1] - 'a';
            if (seen[letter]) break;
            seen[letter] = 1;
            int length = end - start + 1;
            // 中文注释：最后一段取 s[start..end]，它当前没有重复字母。
            dp[end] = max(dp[end], dp[start - 1] + value[length]);
        }
    }

    cout << dp[n] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14076": {
    algorithm: "树上从首都出发访问所有点，除最终停留路径外每条边都要走两次。最优终点是离根最远的城市，答案为 2*边权总和 - 根到最远点距离。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <queue>
#include <vector>
using namespace std;

struct Edge {
    int to;
    long long weight;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<Edge>> graph(n + 1);
    long long total = 0;
    for (int i = 0; i < n - 1; ++i) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        graph[u].push_back({v, w});
        graph[v].push_back({u, w});
        total += w;
    }

    vector<long long> dist(n + 1, -1);
    queue<int> q;
    dist[1] = 0;
    q.push(1);
    long long farthest = 0;
    while (!q.empty()) {
        int node = q.front();
        q.pop();
        farthest = max(farthest, dist[node]);
        for (const Edge& edge : graph[node]) {
            if (dist[edge.to] != -1) continue;
            dist[edge.to] = dist[node] + edge.weight;
            q.push(edge.to);
        }
    }

    // 中文注释：最终停在最远城市时，根到终点路径上的边少走一次。
    cout << 2LL * total - farthest << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14919": {
    algorithm: "树形 DP。dp[u] 表示覆盖 u 子树内所有叶子到 u 的路径所需最小代价，选 u 的代价是 c[u]，不选 u 则必须覆盖每个孩子子树。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> children(n + 1);
    for (int node = 2; node <= n; ++node) {
        int parent;
        cin >> parent;
        children[parent].push_back(node);
    }

    vector<long long> cost(n + 1), dp(n + 1, 0);
    for (int i = 1; i <= n; ++i) cin >> cost[i];

    for (int node = n; node >= 1; --node) {
        if (children[node].empty()) {
            dp[node] = cost[node];
        } else {
            long long childSum = 0;
            for (int child : children[node]) childSum += dp[child];
            // 中文注释：可以直接染当前节点，也可以分别在所有子树中放置黑点。
            dp[node] = min(cost[node], childSum);
        }
    }

    cout << dp[1] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14920": {
    algorithm: "金币 k 很大但总攻击力最多 500*500。用 dp[v] 表示获得 v 攻击力的最小金币数，做 0/1 背包后找金币不超过 k 的最大 v。",
    complexity: "时间复杂度 O(n*sumA)，空间复杂度 O(sumA)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long k;
    cin >> n >> k;
    vector<int> attack(n);
    vector<long long> cost(n);
    int totalAttack = 0;
    for (int i = 0; i < n; ++i) {
        cin >> attack[i] >> cost[i];
        totalAttack += attack[i];
    }

    const long long INF = 4e18;
    vector<long long> dp(totalAttack + 1, INF);
    dp[0] = 0;
    for (int i = 0; i < n; ++i) {
        for (int value = totalAttack; value >= attack[i]; --value) {
            if (dp[value - attack[i]] == INF) continue;
            // 中文注释：每件道具只能购买一次，所以攻击力倒序转移。
            dp[value] = min(dp[value], dp[value - attack[i]] + cost[i]);
        }
    }

    int answer = 0;
    for (int value = 0; value <= totalAttack; ++value) {
        if (dp[value] <= k) answer = value;
    }
    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11246": {
    algorithm: "完全背包式 DP。dp[x] 表示拆出总和 x 的最少完全平方数数量，枚举最后加入的平方数转移。",
    complexity: "时间复杂度 O(n sqrt n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> squares;
    for (int i = 1; i * i <= n; ++i) {
        squares.push_back(i * i);
    }

    const int INF = 1e9;
    vector<int> dp(n + 1, INF);
    dp[0] = 0;
    for (int sum = 1; sum <= n; ++sum) {
        for (int square : squares) {
            if (square > sum) break;
            // 中文注释：最后一个数取 square，剩余部分使用最优拆分。
            dp[sum] = min(dp[sum], dp[sum - square] + 1);
        }
    }

    cout << dp[n] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11247": {
    algorithm: "每类算法先按提升值降序选择达到 k 的最少题数，再二分总题数，检查是否能添加额外题目使任一知识点题数不超过一半上界，从而可排列成不相邻相同。",
    complexity: "时间复杂度 O(n log n + m log n)，空间复杂度 O(n+m)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m, n;
    long long k;
    cin >> m >> n >> k;
    vector<int> category(n);
    for (int i = 0; i < n; ++i) cin >> category[i];

    vector<vector<int>> gains(m + 1);
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;
        gains[category[i]].push_back(value);
    }

    vector<int> need(m + 1, 0), available(m + 1, 0);
    long long baseTotal = 0;
    for (int type = 1; type <= m; ++type) {
        auto& values = gains[type];
        sort(values.begin(), values.end(), greater<int>());
        available[type] = static_cast<int>(values.size());
        long long sum = 0;
        int count = 0;
        while (count < static_cast<int>(values.size()) && sum < k) {
            sum += values[count];
            ++count;
        }
        if (sum < k) {
            cout << -1 << '\\n';
            return 0;
        }
        need[type] = count;
        baseTotal += count;
    }

    auto feasible = [&](int total) {
        if (total < baseTotal) return false;
        int maxAllowed = (total + 1) / 2;
        long long extraCapacity = 0;
        for (int type = 1; type <= m; ++type) {
            if (need[type] > maxAllowed) return false;
            // 中文注释：额外题只能补到不破坏“相同知识点不相邻”的数量上限。
            extraCapacity += min(available[type], maxAllowed) - need[type];
        }
        return extraCapacity >= total - baseTotal;
    };

    int left = static_cast<int>(baseTotal), right = n, answer = -1;
    while (left <= right) {
        int mid = (left + right) / 2;
        if (feasible(mid)) {
            answer = mid;
            right = mid - 1;
        } else {
            left = mid + 1;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11375": {
    algorithm: "按操作串模拟无限二叉树节点编号：U 走到 floor(x/2)，但根节点 1 向上不动；L/R 分别变为 2x 和 2x+1。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    long long current;
    string operations;
    cin >> n >> current >> operations;

    for (char op : operations) {
        if (op == 'U') {
            // 中文注释：根节点没有父亲，向上移动时保持不变。
            if (current > 1) current /= 2;
        } else if (op == 'L') {
            current *= 2;
        } else {
            current = current * 2 + 1;
        }
    }

    cout << current << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11376": {
    algorithm: "把每辆车的费用拆成常数 2*b*x 加上 2*(a-b)*p。负系数车辆配尽量靠近 B 市的大 p，正系数车辆配尽量靠近 A 市的小 p，中间多余容量可以跳过。",
    complexity: "时间复杂度 O((n+m) log(n+m))，空间复杂度 O(n+m)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct Station {
    long long position;
    int capacity;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    long long x;
    cin >> n >> m >> x;

    vector<Station> stations(n);
    for (int i = 0; i < n; ++i) {
        cin >> stations[i].position >> stations[i].capacity;
    }

    vector<long long> coefficient(m);
    long long answer = 0;
    for (int i = 0; i < m; ++i) {
        long long a, b;
        cin >> a >> b;
        answer += 2LL * b * x;
        coefficient[i] = 2LL * (a - b);
    }

    sort(coefficient.begin(), coefficient.end());
    sort(stations.begin(), stations.end(), [](const Station& lhs, const Station& rhs) {
        return lhs.position < rhs.position;
    });

    int leftStation = 0;
    int rightStation = n - 1;

    auto takeSmallPosition = [&]() {
        while (leftStation < n && stations[leftStation].capacity == 0) ++leftStation;
        --stations[leftStation].capacity;
        return stations[leftStation].position;
    };

    auto takeLargePosition = [&]() {
        while (rightStation >= 0 && stations[rightStation].capacity == 0) --rightStation;
        --stations[rightStation].capacity;
        return stations[rightStation].position;
    };

    int firstNonNegative = 0;
    while (firstNonNegative < m && coefficient[firstNonNegative] < 0) {
        // 中文注释：负系数乘越大的 p 越小，所以优先拿右侧站点。
        answer += coefficient[firstNonNegative] * takeLargePosition();
        ++firstNonNegative;
    }

    for (int index = m - 1; index >= firstNonNegative; --index) {
        // 中文注释：非负系数乘越小的 p 越小，所以从最大正系数开始拿左侧站点。
        answer += coefficient[index] * takeSmallPosition();
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11962": {
    algorithm: "树是二分图，从某点出发走偶数步只能到达同色点；任意同色点之间的简单路径长度为偶数，因此答案是该点所在颜色集合大小。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <queue>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

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
    queue<int> q;
    color[1] = 0;
    q.push(1);
    long long countColor[2] = {1, 0};

    while (!q.empty()) {
        int node = q.front();
        q.pop();
        for (int next : graph[node]) {
            if (color[next] != -1) continue;
            color[next] = color[node] ^ 1;
            ++countColor[color[next]];
            q.push(next);
        }
    }

    for (int node = 1; node <= n; ++node) {
        if (node > 1) cout << ' ';
        // 中文注释：偶数步结束点恰好是与起点同色的所有节点。
        cout << countColor[color[node]];
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10262": {
    algorithm: "动态维护所有以当前位置结尾的子串模 p 的余数计数。读入一个新数字 d 后，旧余数 r 会变成 (r*10+d)%p，同时新增单字符子串 d。",
    complexity: "时间复杂度 O(Lp)，空间复杂度 O(p)，其中 p <= 128。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int p;
    string s;
    cin >> p >> s;

    vector<long long> countByRemainder(p, 0);
    long long answer = 0;
    for (char ch : s) {
        int digit = ch - '0';
        vector<long long> nextCount(p, 0);

        // 中文注释：把之前所有以 前一位 结尾的子串追加当前数字。
        for (int r = 0; r < p; ++r) {
            int nextRemainder = (r * 10 + digit) % p;
            nextCount[nextRemainder] += countByRemainder[r];
        }

        // 中文注释：当前数字本身也是一个新的连续子串，允许前导零。
        nextCount[digit % p] += 1;
        answer += nextCount[0];
        countByRemainder.swap(nextCount);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10376": {
    algorithm: "设 dp[x] 表示当前数字为 x 时能形成的操作序列数。若 x<=c，游戏已经结束，只有空操作序列；否则 dp[x]=dp[x-a]+dp[x-b]。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

const long long MOD = 1000000007LL;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, a, b, c;
    cin >> n >> a >> b >> c;

    vector<long long> dp(n + 1, 0);
    for (int x = 0; x <= n; ++x) {
        if (x <= c) {
            // 中文注释：已经达到结束条件，当前路径构成一种完整操作序列。
            dp[x] = 1;
        } else {
            long long waysA = (x - a <= c) ? 1 : dp[x - a];
            long long waysB = (x - b <= c) ? 1 : dp[x - b];
            dp[x] = (waysA + waysB) % MOD;
        }
    }

    cout << dp[n] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10377": {
    algorithm: "n <= 9，可以枚举牛的摆放顺序。固定顺序后，每头牛的位置取满足所有前面牛约束的最小值，从而得到该顺序下最短连续牛棚长度。",
    complexity: "时间复杂度 O(n! n^2)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <numeric>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> leftRange(n), rightRange(n);
    for (int i = 0; i < n; ++i) cin >> leftRange[i];
    for (int i = 0; i < n; ++i) cin >> rightRange[i];

    vector<int> order(n);
    iota(order.begin(), order.end(), 0);
    long long answer = 4e18;

    do {
        vector<long long> position(n, 1);
        for (int j = 1; j < n; ++j) {
            int cowJ = order[j];
            long long need = 1;
            for (int i = 0; i < j; ++i) {
                int cowI = order[i];
                // 中文注释：左边 cowI 的右侧攻击范围和右边 cowJ 的左侧攻击范围都要避开。
                long long gap = max(rightRange[cowI], leftRange[cowJ]) + 1LL;
                need = max(need, position[i] + gap);
            }
            position[j] = need;
        }
        answer = min(answer, position.back());
    } while (next_permutation(order.begin(), order.end()));

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10721": {
    algorithm: "先把字符串分解为若干段连续的 abc 重复块。每段长度为 t 时，用完全分段 DP 求把 t 个 abc 块切成长度 1..n 的若干计分子串后的最大分数。",
    complexity: "时间复杂度 O(mn)，空间复杂度 O(m)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

long long bestScoreForRun(int blocks, const vector<int>& score) {
    const long long NEG = -4e18;
    vector<long long> dp(blocks + 1, NEG);
    dp[0] = 0;
    for (int i = 1; i <= blocks; ++i) {
        for (int len = 1; len < static_cast<int>(score.size()) && len <= i; ++len) {
            // 中文注释：最后一个计分子串由 len 个 abc 首尾相接组成。
            dp[i] = max(dp[i], dp[i - len] + score[len]);
        }
    }
    return dp[blocks];
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> score(n + 1);
    for (int i = 1; i <= n; ++i) cin >> score[i];
    int m;
    string s;
    cin >> m >> s;

    long long answer = 0;
    for (int i = 0; i < m; ) {
        int blocks = 0;
        while (i + 2 < m && s[i] == 'a' && s[i + 1] == 'b' && s[i + 2] == 'c') {
            ++blocks;
            i += 3;
        }
        if (blocks > 0) {
            answer += bestScoreForRun(blocks, score);
        } else {
            ++i;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10722": {
    algorithm: "对子树做 DFS 序展开，子树翻转变成区间异或。对每次操作在 tin[u] 加 1、tout[u]+1 减 1，最后扫 DFS 序得到每个节点翻转奇偶。",
    complexity: "时间复杂度 O(n+q)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> children(n + 1);
    for (int node = 2; node <= n; ++node) {
        int parent;
        cin >> parent;
        children[parent].push_back(node);
    }

    string initial;
    cin >> initial;

    vector<int> tin(n + 1), tout(n + 1), nodeAtTime(n + 1), iterIndex(n + 1, 0);
    vector<int> stack = {1};
    int timer = 0;
    while (!stack.empty()) {
        int node = stack.back();
        if (iterIndex[node] == 0) {
            tin[node] = ++timer;
            nodeAtTime[timer] = node;
        }
        if (iterIndex[node] < static_cast<int>(children[node].size())) {
            int child = children[node][iterIndex[node]++];
            stack.push_back(child);
        } else {
            tout[node] = timer;
            stack.pop_back();
        }
    }

    int q;
    cin >> q;
    vector<int> diff(n + 3, 0);
    while (q--) {
        int node;
        cin >> node;
        // 中文注释：子树区间整体翻转，使用差分记录异或次数。
        diff[tin[node]] ^= 1;
        diff[tout[node] + 1] ^= 1;
    }

    string answer = initial;
    int flip = 0;
    for (int time = 1; time <= n; ++time) {
        flip ^= diff[time];
        int node = nodeAtTime[time];
        int color = (initial[node - 1] - '0') ^ flip;
        answer[node - 1] = char('0' + color);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3873": {
    algorithm: "0/1 背包：每种饮料最多选一次，容量超过 L 统一压到 L，dp[v] 表示达到容量 v 的最小花费。",
    complexity: "时间复杂度 O(NL)，空间复杂度 O(L)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, target;
    cin >> n >> target;
    const long long INF = 4e18;
    vector<long long> dp(target + 1, INF);
    dp[0] = 0;

    for (int i = 0; i < n; ++i) {
        int cost, volume;
        cin >> cost >> volume;
        for (int current = target; current >= 0; --current) {
            if (dp[current] == INF) continue;
            int nextVolume = min(target, current + volume);
            // 中文注释：总容量超过 L 后都视为已经满足需求，压缩到 L。
            dp[nextVolume] = min(dp[nextVolume], dp[current] + cost);
        }
    }

    if (dp[target] == INF) {
        cout << "no solution\\n";
    } else {
        cout << dp[target] << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3874": {
    algorithm: "按进入顺序扫描，使用树状数组统计已经进入且学号小于当前同学的人数，累加即为握手次数。",
    complexity: "时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

struct Fenwick {
    vector<int> tree;

    explicit Fenwick(int n) : tree(n + 1, 0) {}

    void add(int index, int value) {
        for (++index; index < static_cast<int>(tree.size()); index += index & -index) {
            tree[index] += value;
        }
    }

    int sumPrefix(int index) const {
        int result = 0;
        for (++index; index > 0; index -= index & -index) {
            result += tree[index];
        }
        return result;
    }
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    Fenwick fenwick(n);
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        int id;
        cin >> id;
        if (id > 0) {
            // 中文注释：当前同学只和已经在教室且学号更小的人握手。
            answer += fenwick.sumPrefix(id - 1);
        }
        fenwick.add(id, 1);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10108": {
    algorithm: "关卡编号只会增加，形成 DAG。dp[x] 表示到达第 x 关前的最大得分，枚举通道转移，越过终点时更新答案。",
    complexity: "时间复杂度 O(NM)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<int> step(m);
    for (int i = 0; i < m; ++i) cin >> step[i];
    vector<long long> score(n);
    for (int i = 0; i < n; ++i) cin >> score[i];

    const long long NEG = -4e18;
    vector<long long> dp(n, NEG);
    dp[0] = 0;
    long long answer = NEG;
    for (int level = 0; level < n; ++level) {
        if (dp[level] == NEG) continue;
        for (int jump : step) {
            long long nextScore = dp[level] + score[level];
            int nextLevel = level + jump;
            if (nextLevel >= n) {
                // 中文注释：离开当前关卡时先获得本关得分，再判断是否通关。
                answer = max(answer, nextScore);
            } else {
                dp[nextLevel] = max(dp[nextLevel], nextScore);
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10109": {
    algorithm: "对每场合作，统计每名参与者从自身到老板路径上的所有管理者出现次数，出现次数等于参与人数的编号最大者即为答案。",
    complexity: "设 N 为员工数、Q 为询问数，时间复杂度 O(QN^2)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> parent(n, 0);
    parent[0] = 0;
    for (int i = 1; i < n; ++i) cin >> parent[i];

    int q;
    cin >> q;
    while (q--) {
        int m;
        cin >> m;
        vector<int> count(n, 0);
        for (int i = 0; i < m; ++i) {
            int employee;
            cin >> employee;
            int current = employee;
            while (true) {
                // 中文注释：当前员工本人及所有直接、间接领导都可以管理该员工。
                ++count[current];
                if (current == 0) break;
                current = parent[current];
            }
        }

        int answer = 0;
        for (int id = 0; id < n; ++id) {
            if (count[id] == m) {
                answer = id;
            }
        }
        cout << answer << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p10250": {
    algorithm: "设 dp[i] 为下 i 个台阶的方案数，则 dp[i]=dp[i-1]+dp[i-2]+dp[i-3]。",
    complexity: "时间复杂度 O(N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> dp(max(n + 1, 4), 0);
    dp[0] = 1;
    for (int i = 1; i <= n; ++i) {
        // 中文注释：最后一步可以走 1、2 或 3 个台阶，累加对应剩余台阶的方案数。
        dp[i] += dp[i - 1];
        if (i >= 2) dp[i] += dp[i - 2];
        if (i >= 3) dp[i] += dp[i - 3];
    }
    cout << dp[n] << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4452": {
    algorithm: "按优先级升序、价格升序、名称字典序升序排序，依次尝试购买；能买则扣预算并记录名称，最后按名称字典序输出已买商品。",
    complexity: "时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

struct Product {
    string name;
    int price;
    int priority;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int budget, n;
    cin >> budget >> n;
    vector<Product> products(n);
    for (int i = 0; i < n; ++i) {
        cin >> products[i].name >> products[i].price >> products[i].priority;
    }

    sort(products.begin(), products.end(), [](const Product& left, const Product& right) {
        if (left.priority != right.priority) return left.priority < right.priority;
        if (left.price != right.price) return left.price < right.price;
        return left.name < right.name;
    });

    vector<string> bought;
    for (const Product& product : products) {
        if (product.price <= budget) {
            // 中文注释：按购物策略排序后，能买当前商品就立即购买并扣减预算。
            budget -= product.price;
            bought.push_back(product.name);
        }
    }

    sort(bought.begin(), bought.end());
    for (const string& name : bought) {
        cout << name << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4360": {
    algorithm: "按给定的行列边界截取字符矩阵，输出第 x1 到 x2 行、第 y1 到 y2 列的子串。",
    complexity: "输出规模为 S，时间复杂度 O(S)，空间复杂度 O(hw)。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int h, w;
    cin >> h >> w;
    int x1, x2, y1, y2;
    cin >> x1 >> x2 >> y1 >> y2;
    vector<string> canvas(h);
    for (int i = 0; i < h; ++i) cin >> canvas[i];

    for (int row = x1 - 1; row <= x2 - 1; ++row) {
        // 中文注释：题目下标从 1 开始，C++ 字符串下标从 0 开始，需要整体减一。
        cout << canvas[row].substr(y1 - 1, y2 - y1 + 1) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4361": {
    algorithm: "稳定地确定每名同学在目标排序中的位置，原序列到目标序列的最少相邻交换次数等于目标位置序列的逆序对数。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct Student {
    long long height;
    long long weight;
    int originalIndex;
};

long long mergeCount(vector<int>& values, vector<int>& temp, int left, int right) {
    if (right - left <= 1) return 0;
    int mid = (left + right) / 2;
    long long result = mergeCount(values, temp, left, mid) + mergeCount(values, temp, mid, right);
    int i = left;
    int j = mid;
    int k = left;
    while (i < mid || j < right) {
        if (j == right || (i < mid && values[i] <= values[j])) {
            temp[k++] = values[i++];
        } else {
            // 中文注释：右侧元素提前放入时，左侧剩余元素都与它构成逆序对。
            result += mid - i;
            temp[k++] = values[j++];
        }
    }
    for (int p = left; p < right; ++p) values[p] = temp[p];
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<Student> students(n);
    for (int i = 0; i < n; ++i) {
        cin >> students[i].height >> students[i].weight;
        students[i].originalIndex = i;
    }

    vector<Student> target = students;
    stable_sort(target.begin(), target.end(), [](const Student& left, const Student& right) {
        if (left.height != right.height) return left.height > right.height;
        return left.weight > right.weight;
    });

    vector<int> rank(n);
    for (int i = 0; i < n; ++i) {
        rank[target[i].originalIndex] = i;
    }

    vector<int> temp(n);
    cout << mergeCount(rank, temp, 0, n) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4415": {
    algorithm: "枚举矩形上下左右边界，检查矩形内是否全为 1，n,m 不超过 12 可直接枚举。",
    complexity: "时间复杂度 O(n^3m^3)，空间复杂度 O(nm)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> prefix(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            int value;
            cin >> value;
            prefix[i][j] = prefix[i - 1][j] + prefix[i][j - 1] - prefix[i - 1][j - 1] + value;
        }
    }

    int answer = 0;
    for (int top = 1; top <= n; ++top) {
        for (int bottom = top; bottom <= n; ++bottom) {
            for (int left = 1; left <= m; ++left) {
                for (int right = left; right <= m; ++right) {
                    int area = (bottom - top + 1) * (right - left + 1);
                    int sum = prefix[bottom][right] - prefix[top - 1][right] - prefix[bottom][left - 1] + prefix[top - 1][left - 1];
                    if (sum == area) {
                        // 中文注释：矩形内 1 的个数等于面积，说明没有不适合排兵的格子。
                        answer = max(answer, area);
                    }
                }
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4416": {
    algorithm: "由于可以任意重排，答案就是去重后数值集合中最长的连续整数段长度。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> values(n);
    for (int i = 0; i < n; ++i) cin >> values[i];
    sort(values.begin(), values.end());
    values.erase(unique(values.begin(), values.end()), values.end());

    int answer = 0;
    int current = 0;
    for (int i = 0; i < static_cast<int>(values.size()); ++i) {
        if (i == 0 || values[i] == values[i - 1] + 1) {
            ++current;
        } else {
            // 中文注释：断开后重新开始统计新的连续整数段。
            current = 1;
        }
        answer = max(answer, current);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4451": {
    algorithm: "枚举每个 3×3 区域，统计 9 个点的和、最大值和最小值，满足高度差限制时更新最大和。",
    complexity: "时间复杂度 O(MN)，空间复杂度 O(MN)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int rows, cols, limit;
    cin >> rows >> cols >> limit;
    vector<vector<int>> height(rows, vector<int>(cols));
    for (int i = 0; i < rows; ++i) {
        for (int j = 0; j < cols; ++j) {
            cin >> height[i][j];
        }
    }

    int answer = 0;
    for (int r = 0; r + 2 < rows; ++r) {
        for (int c = 0; c + 2 < cols; ++c) {
            int total = 0;
            int low = height[r][c];
            int high = height[r][c];
            for (int i = 0; i < 3; ++i) {
                for (int j = 0; j < 3; ++j) {
                    int value = height[r + i][c + j];
                    total += value;
                    low = min(low, value);
                    high = max(high, value);
                }
            }
            // 中文注释：停机坪要求 3x3 内最大高度和最小高度之差不超过 H。
            if (high - low <= limit) {
                answer = max(answer, total);
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4041": {
    algorithm: "按输入顺序模拟每次区间升序排序；由于 n 和 q 都不超过 100，直接对 vector 子区间排序即可。",
    complexity: "时间复杂度 O(q·n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) cin >> a[i];

    int q;
    cin >> q;
    while (q--) {
        int l, r;
        cin >> l >> r;
        --l;
        --r;
        // 中文注释：题目要求每次排序都基于上一次操作后的序列，直接原地排序区间。
        sort(a.begin() + l, a.begin() + r + 1);
    }

    for (int i = 0; i < n; ++i) {
        if (i > 0) cout << ' ';
        cout << a[i];
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4068": {
    algorithm: "按定义生成 Recamán 数列，用集合记录已出现数字，生成前 n 项后排序输出。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <iostream>
#include <set>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> sequence;
    set<int> appeared;

    int current = 1;
    sequence.push_back(current);
    appeared.insert(current);

    for (int k = 2; k <= n; ++k) {
        int candidate = current - k;
        if (candidate > 0 && !appeared.count(candidate)) {
            current = candidate;
        } else {
            // 中文注释：不能向前跳时，按 Recamán 规则向后加 k。
            current += k;
        }
        sequence.push_back(current);
        appeared.insert(current);
    }

    sort(sequence.begin(), sequence.end());
    for (int i = 0; i < n; ++i) {
        if (i > 0) cout << ' ';
        cout << sequence[i];
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4263": {
    algorithm: "先统计每个格子相邻杂物数和当前可开垦荒地数；枚举清除每个杂物，增量来自相邻且唯一受它阻挡的荒地，以及清除后自身能否开垦。",
    complexity: "时间复杂度 O(nm)，空间复杂度 O(nm)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

const int DR[4] = {-1, 1, 0, 0};
const int DC[4] = {0, 0, -1, 1};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<string> grid(n);
    for (int i = 0; i < n; ++i) cin >> grid[i];

    vector<vector<int>> adjacentBlocks(n, vector<int>(m, 0));
    for (int r = 0; r < n; ++r) {
        for (int c = 0; c < m; ++c) {
            for (int d = 0; d < 4; ++d) {
                int nr = r + DR[d];
                int nc = c + DC[d];
                if (0 <= nr && nr < n && 0 <= nc && nc < m && grid[nr][nc] == '#') {
                    ++adjacentBlocks[r][c];
                }
            }
        }
    }

    int base = 0;
    for (int r = 0; r < n; ++r) {
        for (int c = 0; c < m; ++c) {
            if (grid[r][c] == '.' && adjacentBlocks[r][c] == 0) {
                ++base;
            }
        }
    }

    int answer = base;
    for (int r = 0; r < n; ++r) {
        for (int c = 0; c < m; ++c) {
            if (grid[r][c] != '#') continue;
            int gain = 0;
            if (adjacentBlocks[r][c] == 0) {
                // 中文注释：清除该杂物后，它自己变为荒地；若四邻无其他杂物，也可开垦。
                ++gain;
            }
            for (int d = 0; d < 4; ++d) {
                int nr = r + DR[d];
                int nc = c + DC[d];
                if (0 <= nr && nr < n && 0 <= nc && nc < m && grid[nr][nc] == '.' && adjacentBlocks[nr][nc] == 1) {
                    ++gain;
                }
            }
            answer = max(answer, base + gain);
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4264": {
    algorithm: "枚举每个相邻的 2×2 子矩阵，使用 long long 判断主对角乘积是否等于副对角乘积。",
    complexity: "时间复杂度 O(nm)，空间复杂度 O(nm)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<long long>> a(n, vector<long long>(m));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) {
            cin >> a[i][j];
        }
    }

    long long answer = 0;
    for (int i = 0; i + 1 < n; ++i) {
        for (int j = 0; j + 1 < m; ++j) {
            // 中文注释：好的二阶矩阵满足左上乘右下等于右上乘左下。
            if (a[i][j] * a[i + 1][j + 1] == a[i][j + 1] * a[i + 1][j]) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3998": {
    algorithm: "用字符串模拟编辑器末尾内容；遇到小写字母就追加，遇到 <bs> 且当前非空就删除最后一个字符。",
    complexity: "设按键次数为 N，时间复杂度 O(N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    string text;
    for (int i = 0; i < n; ++i) {
        string key;
        cin >> key;
        if (key == "<bs>") {
            if (!text.empty()) {
                // 中文注释：退格键只删除当前文本的最后一个字符，空串时不操作。
                text.pop_back();
            }
        } else {
            text += key[0];
        }
    }

    cout << text << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3999": {
    algorithm: "若总产量小于总订单量则无解；否则把机器按产量降序使用、订单按需求升序交付，可保证每天累计产量不小于累计交付量。",
    complexity: "每组数据时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct Item {
    long long value;
    int id;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<Item> machines(n), orders(n);
        long long totalProduction = 0;
        long long totalDemand = 0;
        for (int i = 0; i < n; ++i) {
            cin >> machines[i].value;
            machines[i].id = i + 1;
            totalProduction += machines[i].value;
        }
        for (int i = 0; i < n; ++i) {
            cin >> orders[i].value;
            orders[i].id = i + 1;
            totalDemand += orders[i].value;
        }

        if (totalProduction < totalDemand) {
            cout << "No\\n";
            continue;
        }

        sort(machines.begin(), machines.end(), [](const Item& left, const Item& right) {
            return left.value > right.value;
        });
        sort(orders.begin(), orders.end(), [](const Item& left, const Item& right) {
            return left.value < right.value;
        });

        // 中文注释：最大产能前缀配最小订单前缀；总产量足够时，所有前缀都能按时交付。
        cout << "Yes\\n";
        for (int i = 0; i < n; ++i) {
            if (i > 0) cout << ' ';
            cout << machines[i].id;
        }
        cout << '\\n';
        for (int i = 0; i < n; ++i) {
            if (i > 0) cout << ' ';
            cout << orders[i].id;
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4005": {
    algorithm: "把黑格记为 +1、白格记为 -1，枚举所有子矩形并用二维前缀和求和；和为 0 代表黑白数量相同。",
    complexity: "N,M 不超过 10，时间复杂度 O(N^2M^2)，空间复杂度 O(NM)。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> prefix(n + 1, vector<int>(m + 1, 0));
    for (int i = 1; i <= n; ++i) {
        string row;
        cin >> row;
        for (int j = 1; j <= m; ++j) {
            int value = (row[j - 1] == '1' ? 1 : -1);
            prefix[i][j] = prefix[i - 1][j] + prefix[i][j - 1] - prefix[i - 1][j - 1] + value;
        }
    }

    int answer = 0;
    for (int top = 1; top <= n; ++top) {
        for (int bottom = top; bottom <= n; ++bottom) {
            for (int left = 1; left <= m; ++left) {
                for (int right = left; right <= m; ++right) {
                    int sum = prefix[bottom][right] - prefix[top - 1][right] - prefix[bottom][left - 1] + prefix[top - 1][left - 1];
                    if (sum == 0) {
                        // 中文注释：黑白数量相等时，+1 和 -1 的总和正好为 0。
                        int area = (bottom - top + 1) * (right - left + 1);
                        answer = max(answer, area);
                    }
                }
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4040": {
    algorithm: "枚举每个可能的 4×4 子矩形左上角，逐格比对目标黑白模式 0000/0110/0110/0000。",
    complexity: "每组数据时间复杂度 O(NM)，空间复杂度 O(NM)。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

bool matchPattern(const vector<string>& grid, int row, int col) {
    static const vector<string> pattern = {
        "0000",
        "0110",
        "0110",
        "0000"
    };
    for (int i = 0; i < 4; ++i) {
        for (int j = 0; j < 4; ++j) {
            if (grid[row + i][col + j] != pattern[i][j]) {
                return false;
            }
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n, m;
        cin >> n >> m;
        vector<string> grid(n);
        for (int i = 0; i < n; ++i) cin >> grid[i];

        bool found = false;
        for (int i = 0; i + 3 < n && !found; ++i) {
            for (int j = 0; j + 3 < m && !found; ++j) {
                // 中文注释：题目要求的子矩形尺寸固定为 4 行 4 列，直接匹配目标模式。
                if (matchPattern(grid, i, j)) {
                    found = true;
                }
            }
        }
        cout << (found ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3928": {
    algorithm: "将自己的马速放入有序集合，按田忌出马顺序处理：能赢就派出刚好大于对方速度的最慢马，不能赢就用当前最慢马牺牲。",
    complexity: "设马匹数为 N，时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <set>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    multiset<int> horses;
    for (int i = 0; i < n; ++i) {
        int speed;
        cin >> speed;
        horses.insert(speed);
    }

    vector<int> opponent(n);
    for (int i = 0; i < n; ++i) cin >> opponent[i];

    int wins = 0;
    for (int speed : opponent) {
        auto it = horses.upper_bound(speed);
        if (it != horses.end()) {
            // 中文注释：能赢时用刚好超过对手的最慢马，保留更快的马给后面。
            ++wins;
            horses.erase(it);
        } else {
            // 中文注释：赢不了当前轮时牺牲最慢马，减少对后续轮次的影响。
            horses.erase(horses.begin());
        }
    }

    cout << wins << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3939": {
    algorithm: "枚举区间内每个两位数，判断原数和十位个位交换后的数是否都为素数。",
    complexity: "区间长度小于 100，时间复杂度 O((B-A) sqrt B)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

bool isPrime(int value) {
    if (value < 2) return false;
    for (int factor = 2; factor * factor <= value; ++factor) {
        if (value % factor == 0) return false;
    }
    return true;
}

int reverseTwoDigits(int value) {
    return value % 10 * 10 + value / 10;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    cin >> a >> b;
    for (int value = a; value <= b; ++value) {
        // 中文注释：绝对素数要求原数和交换十位个位后的数都为素数。
        if (isPrime(value) && isPrime(reverseTwoDigits(value))) {
            cout << value << '\\n';
        }
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3940": {
    algorithm: "按奇阶幻方的 Siamese method 模拟填数：从第一行中间开始，优先向上右移动，若目标已填则从当前位置向下移动。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(N^2)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<vector<int>> square(n, vector<int>(n, 0));

    int row = 0;
    int col = n / 2;
    square[row][col] = 1;

    for (int value = 2; value <= n * n; ++value) {
        int nextRow = (row - 1 + n) % n;
        int nextCol = (col + 1) % n;
        if (square[nextRow][nextCol] == 0) {
            row = nextRow;
            col = nextCol;
        } else {
            // 中文注释：右上方已被占用时，按规则从原位置向下移动一格。
            row = (row + 1) % n;
        }
        square[row][col] = value;
    }

    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < n; ++j) {
            if (j > 0) cout << ' ';
            cout << square[i][j];
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3958": {
    algorithm: "若长度相同则统计不同字符数是否不超过 1；若长度相差 1，则用双指针检查较长串能否删除一个字符后匹配较短串。",
    complexity: "设字符串长度为 L，单组时间复杂度 O(L)，空间复杂度 O(1)。",
    code: `#include <cstdlib>
#include <iostream>
#include <string>
using namespace std;

bool oneEditSimilar(const string& a, const string& b) {
    int n = static_cast<int>(a.size());
    int m = static_cast<int>(b.size());
    if (abs(n - m) > 1) return false;

    if (n == m) {
        int diff = 0;
        for (int i = 0; i < n; ++i) {
            if (a[i] != b[i]) ++diff;
        }
        return diff <= 1;
    }

    const string& shorter = (n < m ? a : b);
    const string& longer = (n < m ? b : a);
    int i = 0;
    int j = 0;
    int skipped = 0;
    while (i < static_cast<int>(shorter.size()) && j < static_cast<int>(longer.size())) {
        if (shorter[i] == longer[j]) {
            ++i;
            ++j;
        } else {
            // 中文注释：长度差为 1 时，只允许较长串跳过一个多余字符。
            ++skipped;
            ++j;
            if (skipped > 1) return false;
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        string a, b;
        cin >> a >> b;
        cout << (oneEditSimilar(a, b) ? "similar" : "not similar") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3959": {
    algorithm: "将题单题数升序排序，依次尝试满足第 1、2、3... 天；当前题单数量能覆盖当天要求就使用，否则跳过。",
    complexity: "设题单数为 N，时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> lists(n);
    for (int i = 0; i < n; ++i) cin >> lists[i];
    sort(lists.begin(), lists.end());

    long long need = 1;
    for (long long count : lists) {
        if (count >= need) {
            // 中文注释：能满足当天题量就安排这套题单，下一天需求加一。
            ++need;
        }
    }

    cout << need - 1 << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3850": {
    algorithm: "从低位到高位扫描数字，奇数位做乘 7 后的数位和压缩，偶数位保持不变，最后判断变换后各位和是否为 8 的倍数。",
    complexity: "每个数时间复杂度 O(位数)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int compressDigit(int value) {
    while (value > 9) {
        int sum = 0;
        while (value > 0) {
            sum += value % 10;
            value /= 10;
        }
        value = sum;
    }
    return value;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        string x;
        cin >> x;
        int digitSum = 0;
        int position = 1;
        for (int i = static_cast<int>(x.size()) - 1; i >= 0; --i, ++position) {
            int digit = x[i] - '0';
            if (position % 2 == 1) {
                // 中文注释：个位是第 1 位，奇数位需要先乘 7，再反复求数位和压到一位数。
                digit = compressDigit(digit * 7);
            }
            digitSum += digit;
        }
        cout << (digitSum % 8 == 0 ? 'T' : 'F') << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3851": {
    algorithm: "统计 256 种灰阶出现次数，按次数降序、灰阶升序选出 16 种；每个像素映射到灰阶值距离最近的候选，距离相同取编号更小者。",
    complexity: "设像素数为 P，时间复杂度 O(P + 256 log 256 + 16P)，空间复杂度 O(P + 256)。",
    code: `#include <algorithm>
#include <iomanip>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int hexValue(char ch) {
    if ('0' <= ch && ch <= '9') return ch - '0';
    return ch - 'A' + 10;
}

string toHex2(int value) {
    const string digits = "0123456789ABCDEF";
    string result;
    result.push_back(digits[value / 16]);
    result.push_back(digits[value % 16]);
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<string> rows(n);
    vector<int> count(256, 0);
    for (int i = 0; i < n; ++i) {
        cin >> rows[i];
        for (int j = 0; j < static_cast<int>(rows[i].size()); j += 2) {
            int value = hexValue(rows[i][j]) * 16 + hexValue(rows[i][j + 1]);
            ++count[value];
        }
    }

    vector<int> values(256);
    for (int i = 0; i < 256; ++i) values[i] = i;
    sort(values.begin(), values.end(), [&](int left, int right) {
        if (count[left] != count[right]) return count[left] > count[right];
        return left < right;
    });
    vector<int> palette(values.begin(), values.begin() + 16);

    for (int value : palette) {
        cout << toHex2(value);
    }
    cout << '\\n';

    const string digits = "0123456789ABCDEF";
    for (const string& row : rows) {
        for (int j = 0; j < static_cast<int>(row.size()); j += 2) {
            int value = hexValue(row[j]) * 16 + hexValue(row[j + 1]);
            int bestIndex = 0;
            int bestDistance = abs(value - palette[0]);
            for (int k = 1; k < 16; ++k) {
                int distance = abs(value - palette[k]);
                // 中文注释：距离相等时不更新，保留更小的编号。
                if (distance < bestDistance) {
                    bestDistance = distance;
                    bestIndex = k;
                }
            }
            cout << digits[bestIndex];
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3869": {
    algorithm: "按位扫描 K 进制字符串，使用 result = result * K + 当前数码 转换为十进制。",
    complexity: "设总位数为 L，时间复杂度 O(L)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int digitValue(char ch) {
    if ('0' <= ch && ch <= '9') return ch - '0';
    return ch - 'A' + 10;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        long long base;
        string number;
        cin >> base >> number;
        long long result = 0;
        for (char ch : number) {
            // 中文注释：从高位到低位累加，相当于每读入一位就整体乘以进制。
            result = result * base + digitValue(ch);
        }
        cout << result << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3870": {
    algorithm: "每次取最低 7 位组成一个字节；如果后面还有更高位，则把当前字节最高位设为 1，否则设为 0。",
    complexity: "时间复杂度 O(log N)，空间复杂度 O(log N)。",
    code: `#include <iomanip>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    unsigned long long n;
    cin >> n;
    vector<int> bytes;
    do {
        int current = static_cast<int>(n & 127ULL);
        n >>= 7;
        if (n > 0) {
            // 中文注释：后面还有更高位分组时，当前字节最高位需要置 1。
            current |= 128;
        }
        bytes.push_back(current);
    } while (n > 0);

    cout << uppercase << hex << setfill('0');
    for (int i = 0; i < static_cast<int>(bytes.size()); ++i) {
        if (i > 0) cout << ' ';
        cout << setw(2) << bytes[i];
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3927": {
    algorithm: "用哈希表保存字典，扫描文章时把连续小写字母作为单词替换，标点符号原样输出。",
    complexity: "设文章长度为 L，词典大小为 N，时间复杂度 O(L + N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

bool isLowerLetter(char ch) {
    return 'a' <= ch && ch <= 'z';
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    unordered_map<string, string> dictionary;
    for (int i = 0; i < n; ++i) {
        string a, b;
        cin >> a >> b;
        dictionary[a] = b;
    }

    string text;
    cin >> text;
    string answer;
    for (int i = 0; i < static_cast<int>(text.size());) {
        if (!isLowerLetter(text[i])) {
            answer.push_back(text[i]);
            ++i;
            continue;
        }

        int start = i;
        while (i < static_cast<int>(text.size()) && isLowerLetter(text[i])) {
            ++i;
        }
        string word = text.substr(start, i - start);
        auto it = dictionary.find(word);
        // 中文注释：不在字典中的单词统一替换为 UNK，标点不参与替换。
        answer += (it == dictionary.end() ? "UNK" : it->second);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3996": {
    algorithm: "按题意模拟数字变换，记录每一步结果；如果在 q 步内遇到目标 m 就输出路径，若进入循环仍未遇到则输出 -1。",
    complexity: "时间复杂度 O(min(q, 状态循环长度) * 位数)，空间复杂度 O(状态循环长度)。",
    code: `#include <iostream>
#include <unordered_set>
#include <vector>
using namespace std;

long long transformNumber(long long value) {
    int lastDigit = static_cast<int>(value % 10);
    long long rest = value / 10;
    int prefixDigit = (lastDigit * lastDigit) % 10;
    if (prefixDigit == 0) {
        // 中文注释：平方个位为 0 时不保留前导 0，只剩去掉末位后的数字。
        return rest;
    }

    long long power = 1;
    while (power <= rest) {
        power *= 10;
    }
    return prefixDigit * power + rest;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, m;
    int q;
    cin >> n >> m >> q;

    if (n == m) {
        return 0;
    }

    unordered_set<long long> seen;
    vector<long long> path;
    seen.insert(n);

    for (int step = 1; step <= q; ++step) {
        n = transformNumber(n);
        path.push_back(n);
        if (n == m) {
            for (long long value : path) {
                cout << value << '\\n';
            }
            return 0;
        }
        if (seen.count(n)) {
            break;
        }
        seen.insert(n);
    }

    cout << -1 << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3997": {
    algorithm: "按 1、2、3…… 的长度切分字符串，最后不足一段也保留；对每段用双指针判断是否回文并计数。",
    complexity: "时间复杂度 O(|S|)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(const string& text, int left, int right) {
    while (left < right) {
        if (text[left] != text[right]) {
            return false;
        }
        ++left;
        --right;
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string s;
    cin >> s;

    long long answer = 0;
    int start = 0;
    int length = 1;
    while (start < static_cast<int>(s.size())) {
        int end = min(static_cast<int>(s.size()) - 1, start + length - 1);
        // 中文注释：最后剩余字符不足当前段长时，仍单独作为最后一段。
        if (isPalindrome(s, start, end)) {
            ++answer;
        }
        start = end + 1;
        ++length;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4003": {
    algorithm: "把偏移量对 26 取模，对 A 到 Z 每个字母计算循环后移后的字母。",
    complexity: "时间复杂度 O(26)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int shift = n % 26;

    for (char ch = 'A'; ch <= 'Z'; ++ch) {
        // 中文注释：字母表首尾相接，所以使用模 26 完成循环偏移。
        char moved = static_cast<char>('A' + (ch - 'A' + shift) % 26);
        cout << moved;
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4004": {
    algorithm: "候选数若存在，一定等于序列最大值；检查最大值是否能被所有元素整除即可。",
    complexity: "时间复杂度 O(总 n)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n;
        cin >> n;
        vector<long long> values(n);
        long long maximum = 0;
        for (int i = 0; i < n; ++i) {
            cin >> values[i];
            maximum = max(maximum, values[i]);
        }

        bool ok = true;
        for (long long value : values) {
            // 中文注释：如果最大值不是某个数的倍数，就不存在满足条件的序列元素。
            if (maximum % value != 0) {
                ok = false;
                break;
            }
        }

        cout << (ok ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4038": {
    algorithm: "先求总和，再从左到右维护前缀和，只在 i<n 的切分点判断前缀和是否等于后缀和。",
    complexity: "时间复杂度 O(总 n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

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
        bool balanced = false;
        for (int i = 0; i + 1 < n; ++i) {
            prefix += a[i];
            // 中文注释：切分点必须让左右两部分都非空，所以只枚举到 n-2。
            if (prefix == total - prefix) {
                balanced = true;
                break;
            }
        }

        cout << (balanced ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4039": {
    algorithm: "枚举拼接分界点，要求左右两段长度都至少为 2，并分别用双指针判断回文。",
    complexity: "每个字符串时间复杂度 O(L^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

bool isPalindrome(const string& s, int left, int right) {
    while (left < right) {
        if (s[left] != s[right]) {
            return false;
        }
        ++left;
        --right;
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        string s;
        cin >> s;
        bool ok = false;
        for (int split = 2; split <= static_cast<int>(s.size()) - 2; ++split) {
            // 中文注释：split 左侧和右侧长度都至少为 2。
            if (isPalindrome(s, 0, split - 1) && isPalindrome(s, split, static_cast<int>(s.size()) - 1)) {
                ok = true;
                break;
            }
        }
        cout << (ok ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4067": {
    algorithm: "预存 0 到 3 的 5x5 字符图案，按输入数字逐行拼接对应图案。",
    complexity: "时间复杂度 O(5L)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string n;
    cin >> n;

    string pattern[4][5] = {
        {".....", ".***.", ".***.", ".***.", "....."},
        {"****.", "****.", "****.", "****.", "****."},
        {".....", "****.", ".....", ".****", "....."},
        {".....", "****.", ".....", "****.", "....."}
    };

    for (int row = 0; row < 5; ++row) {
        for (char ch : n) {
            // 中文注释：题目保证输入只包含 0、1、2、3。
            cout << pattern[ch - '0'][row];
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4261": {
    algorithm: "利用恒等式 (x & y) + (x | y) = x + y，把问题化为求最小正整数 y=2025-x。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int x;
    cin >> x;

    int y = 2025 - x;
    // 中文注释：题目保证 0 <= x < 2025，因此 y 一定是正整数。
    cout << (y > 0 ? y : -1) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4262": {
    algorithm: "把每个单词转为小写后计数，维护出现次数最多的单词；题目保证最高频唯一。",
    complexity: "时间复杂度 O(总字符数)，空间复杂度 O(n)。",
    code: `#include <cctype>
#include <iostream>
#include <string>
#include <unordered_map>
using namespace std;

string toLowerWord(string word) {
    for (char& ch : word) {
        ch = static_cast<char>(tolower(static_cast<unsigned char>(ch)));
    }
    return word;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    unordered_map<string, int> count;
    string best;
    int bestCount = 0;

    for (int i = 0; i < n; ++i) {
        string word;
        cin >> word;
        word = toLowerWord(word);
        int current = ++count[word];
        // 中文注释：最高频单词唯一，出现更大次数时直接更新答案。
        if (current > bestCount) {
            bestCount = current;
            best = word;
        }
    }

    cout << best << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4358": {
    algorithm: "逐个统计每个数二进制中 1 的个数，总数对 2 取模就是校验码。",
    complexity: "时间复杂度 O(n log C)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int countBits(int value) {
    int result = 0;
    while (value > 0) {
        result += value & 1;
        value >>= 1;
    }
    return result;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int totalBits = 0;
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;
        // 中文注释：把所有数据的二进制 1 个数累加起来。
        totalBits += countBits(value);
    }

    cout << totalBits << ' ' << (totalBits % 2) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4359": {
    algorithm: "从前往后贪心构造，每个小朋友拿 max(a_i, 上一个小朋友糖果数+1) 颗，累加总数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long previous = 0;
    long long answer = 0;

    for (int i = 0; i < n; ++i) {
        long long need;
        cin >> need;
        // 中文注释：当前孩子既要满足自己的最低需求，也要严格多于前一位。
        long long give = max(need, previous + 1);
        answer += give;
        previous = give;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4413": {
    algorithm: "按照题意直接模拟：每次找下标最大的最大值，以及当前最小非零值，把最大值减去最小非零值。",
    complexity: "在数据范围内最多约 10000 次操作，每次 O(n)，空间复杂度 O(n)。",
    code: `#include <climits>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }

    long long operations = 0;
    while (true) {
        int maxValue = 0;
        int maxIndex = -1;
        int minPositive = INT_MAX;

        for (int i = 0; i < n; ++i) {
            if (a[i] > 0) {
                minPositive = min(minPositive, a[i]);
            }
            if (a[i] >= maxValue) {
                maxValue = a[i];
                maxIndex = i;
            }
        }

        if (maxValue == 0) {
            break;
        }

        // 中文注释：若最大值有多个，前面的 >= 会保留最后一个最大值下标。
        a[maxIndex] -= minPositive;
        ++operations;
    }

    cout << operations << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4414": {
    algorithm: "先算 2025 年给定月份 1 号的星期偏移，再按 7 列日历格式用宽度 3 的日期单元输出。",
    complexity: "时间复杂度 O(月份天数)，空间复杂度 O(1)。",
    code: `#include <iomanip>
#include <iostream>
#include <sstream>
#include <string>
#include <vector>
using namespace std;

string formatCell(int value) {
    ostringstream out;
    out << setw(3) << value;
    return out.str();
}

string rtrim(string line) {
    while (!line.empty() && line.back() == ' ') {
        line.pop_back();
    }
    return line;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int month;
    cin >> month;

    int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    int startWeekday = 2; // 中文注释：2025 年 1 月 1 日是星期三，MON 为 0。
    for (int m = 1; m < month; ++m) {
        startWeekday = (startWeekday + days[m]) % 7;
    }

    cout << "MON TUE WED THU FRI SAT SUN" << '\\n';

    int day = 1;
    int column = startWeekday;
    while (day <= days[month]) {
        vector<string> cells(7, "   ");
        for (; column < 7 && day <= days[month]; ++column, ++day) {
            cells[column] = formatCell(day);
        }

        string line;
        for (int i = 0; i < 7; ++i) {
            if (i > 0) {
                line.push_back(' ');
            }
            line += cells[i];
        }
        cout << rtrim(line) << '\\n';
        column = 0;
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4449": {
    algorithm: "逐个密码检查长度是否至少 8，并扫描是否同时包含大写字母和数字。",
    complexity: "时间复杂度 O(总字符数)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        string password;
        cin >> password;
        bool hasUpper = false;
        bool hasDigit = false;
        for (char ch : password) {
            if (ch >= 'A' && ch <= 'Z') {
                hasUpper = true;
            }
            if (ch >= '0' && ch <= '9') {
                hasDigit = true;
            }
        }

        // 中文注释：安全密码需要长度、大写字母和数字三个条件同时满足。
        bool ok = password.size() >= 8 && hasUpper && hasDigit;
        cout << (ok ? 'Y' : 'N') << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4450": {
    algorithm: "为每个文具种类维护当前最低价格，读完后累加所有种类的最低价。",
    complexity: "时间复杂度 O(M+N)，空间复杂度 O(M)。",
    code: `#include <climits>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m, n;
    cin >> m >> n;
    vector<int> cheapest(m + 1, INT_MAX);

    for (int i = 0; i < n; ++i) {
        int kind, price;
        cin >> kind >> price;
        // 中文注释：同一类别只保留最便宜的一件。
        cheapest[kind] = min(cheapest[kind], price);
    }

    long long answer = 0;
    for (int kind = 1; kind <= m; ++kind) {
        answer += cheapest[kind];
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3842": {
    algorithm: "用布尔数组标记报到编号，最后按编号从小到大输出未标记的同学；若没有缺席则输出 N。",
    complexity: "时间复杂度 O(N+M)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<bool> arrived(n, false);
    for (int i = 0; i < m; ++i) {
        int id;
        cin >> id;
        // 中文注释：同一名同学可能多次报号，布尔标记可以自然去重。
        arrived[id] = true;
    }

    bool first = true;
    bool allArrived = true;
    for (int id = 0; id < n; ++id) {
        if (!arrived[id]) {
            if (!first) {
                cout << ' ';
            }
            cout << id;
            first = false;
            allArrived = false;
        }
    }

    if (allArrived) {
        cout << n;
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3843": {
    algorithm: "按逗号分割每段密码，检查长度、字符合法性、至少一个特殊字符，以及大小写字母和数字三类中至少两类出现。",
    complexity: "时间复杂度 O(L)，空间复杂度 O(L)。",
    code: `#include <iostream>
#include <string>
#include <vector>
using namespace std;

bool isSpecial(char ch) {
    return ch == '!' || ch == '@' || ch == '#' || ch == '$';
}

bool isValidPassword(const string& password) {
    if (password.size() < 6 || password.size() > 12) {
        return false;
    }

    bool hasLower = false;
    bool hasUpper = false;
    bool hasDigit = false;
    bool hasSpecial = false;

    for (char ch : password) {
        if (ch >= 'a' && ch <= 'z') {
            hasLower = true;
        } else if (ch >= 'A' && ch <= 'Z') {
            hasUpper = true;
        } else if (ch >= '0' && ch <= '9') {
            hasDigit = true;
        } else if (isSpecial(ch)) {
            hasSpecial = true;
        } else {
            // 中文注释：出现允许集合之外的字符，密码直接不合规。
            return false;
        }
    }

    int categoryCount = static_cast<int>(hasLower) + static_cast<int>(hasUpper) + static_cast<int>(hasDigit);
    return hasSpecial && categoryCount >= 2;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string input;
    cin >> input;

    string current;
    for (int index = 0; index <= static_cast<int>(input.size()); ++index) {
        if (index == static_cast<int>(input.size()) || input[index] == ',') {
            if (isValidPassword(current)) {
                cout << current << '\\n';
            }
            current.clear();
        } else {
            current.push_back(input[index]);
        }
    }

    return 0;
}
`
  },
  "supplemental:luogu:b3848": {
    algorithm: "按看到商品的顺序模拟购买，余额足够就购买并扣钱，否则跳过。",
    complexity: "时间复杂度 O(N)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int prices[105];
    for (int i = 0; i < n; ++i) {
        cin >> prices[i];
    }

    long long money;
    cin >> money;

    int bought = 0;
    for (int i = 0; i < n; ++i) {
        if (money >= prices[i]) {
            // 中文注释：只要买得起，小明一定立刻购买。
            money -= prices[i];
            ++bought;
        }
    }

    cout << bought << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3849": {
    algorithm: "不断对 R 取余得到低位数字，再反转输出；10 到 35 映射为 A 到 Z。",
    complexity: "时间复杂度 O(log_R N)，空间复杂度 O(log_R N)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
using namespace std;

char digitToChar(int value) {
    if (value < 10) {
        return static_cast<char>('0' + value);
    }
    return static_cast<char>('A' + value - 10);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, r;
    cin >> n >> r;

    string answer;
    while (n > 0) {
        // 中文注释：取余得到当前最低位，再把商继续转换。
        answer.push_back(digitToChar(n % r));
        n /= r;
    }
    reverse(answer.begin(), answer.end());

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3867": {
    algorithm: "第 i 天向编号 a_i 的储蓄罐累加 i 元，最后按编号顺序输出每个储蓄罐的金额。",
    complexity: "时间复杂度 O(N+D)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, d;
    cin >> n >> d;

    vector<long long> savings(n, 0);
    for (int day = 1; day <= d; ++day) {
        int jar;
        cin >> jar;
        // 中文注释：第 day 天存入 day 元到指定编号储蓄罐。
        savings[jar] += day;
    }

    for (int i = 0; i < n; ++i) {
        if (i > 0) {
            cout << ' ';
        }
        cout << savings[i];
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3868": {
    algorithm: "对每个字符串分别判断所有字符是否落在二进制、八进制、十进制和十六进制允许字符范围内。",
    complexity: "时间复杂度 O(总字符数)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

bool validForBase(const string& value, int base) {
    for (char ch : value) {
        int digit = -1;
        if (ch >= '0' && ch <= '9') {
            digit = ch - '0';
        } else if (ch >= 'A' && ch <= 'F') {
            digit = ch - 'A' + 10;
        } else {
            return false;
        }

        if (digit >= base) {
            return false;
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        string value;
        cin >> value;

        // 中文注释：可能有前导零，判断时只看每个字符能否作为该进制数码。
        cout << validForBase(value, 2) << ' '
             << validForBase(value, 8) << ' '
             << validForBase(value, 10) << ' '
             << validForBase(value, 16) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3925": {
    algorithm: "枚举最后一只小猫拿走的份额，按分鱼过程逆推 N 次，找到能整除的最小初始鱼数。",
    complexity: "时间复杂度取决于最小可行份额，N<10 时可快速完成；空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, thrown;
    cin >> n >> thrown;

    for (long long lastShare = 1; ; ++lastShare) {
        long long before = n * lastShare + thrown;
        bool ok = true;

        // 中文注释：已知后一只猫分鱼前的数量，反推出前一只猫分鱼前的数量。
        for (int step = 1; step < n; ++step) {
            if (before % (n - 1) != 0) {
                ok = false;
                break;
            }
            long long previousShare = before / (n - 1);
            before = n * previousShare + thrown;
        }

        if (ok) {
            cout << before << '\\n';
            return 0;
        }
    }
}
`
  },
  "supplemental:luogu:b3926": {
    algorithm: "把每个单位映射到同类最小单位的倍率，答案为 x*factor(unit1)/factor(unit2)，再按原格式输出。",
    complexity: "时间复杂度 O(N)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

long long factorOf(const string& unit) {
    if (unit == "km" || unit == "kg") {
        return 1000000;
    }
    if (unit == "m" || unit == "g") {
        return 1000;
    }
    return 1;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        long long value;
        string unitFrom, equalSign, questionMark, unitTo;
        cin >> value >> unitFrom >> equalSign >> questionMark >> unitTo;

        // 中文注释：题目保证只从大单位转换到小单位，所以结果一定是整数。
        long long answer = value * factorOf(unitFrom) / factorOf(unitTo);
        cout << value << ' ' << unitFrom << " = " << answer << ' ' << unitTo << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3956": {
    algorithm: "遍历字符串，小写字母累加字母序号，大写字母累加其 ASCII 码相反数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    string text;
    cin >> n >> text;

    long long sum = 0;
    for (char ch : text) {
        if (ch >= 'a' && ch <= 'z') {
            sum += ch - 'a' + 1;
        } else {
            // 中文注释：大写字母代表其 ASCII 码的相反数。
            sum -= static_cast<int>(ch);
        }
    }

    cout << sum << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3957": {
    algorithm: "预处理可能出现的完全平方数，再枚举所有 i<j 的数对并判断和是否为完全平方数。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(maxA)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> values(n);
    int maxValue = 0;
    for (int i = 0; i < n; ++i) {
        cin >> values[i];
        if (values[i] > maxValue) {
            maxValue = values[i];
        }
    }

    vector<bool> isSquare(2 * maxValue + 1, false);
    for (int x = 0; x * x <= 2 * maxValue; ++x) {
        isSquare[x * x] = true;
    }

    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = i + 1; j < n; ++j) {
            // 中文注释：只统计下标 i<j 的组合，避免重复计数。
            if (isSquare[values[i] + values[j]]) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4257": {
    algorithm: "被影响的书本数是 ceil(y/x)，剩余完整书本数为 n-ceil(y/x)。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, x, y;
    cin >> n >> x >> y;

    // 中文注释：只要老鼠开始啃一本书，这本书就不再是完整的；因此用向上取整。
    int damaged = (y + x - 1) / x;
    cout << n - damaged << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4258": {
    algorithm: "每个整数加 5 后整除 10，再乘 10，即可四舍五入到最接近的整十数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    while (n--) {
        int value;
        cin >> value;

        // 中文注释：个位达到 5 就进到下一个整十，否则保留当前整十。
        cout << ((value + 5) / 10) * 10 << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4354": {
    algorithm: "最多阅读页数是每天上限乘以天数，但不能超过整本书页数。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k, t;
    cin >> n >> k >> t;

    int readable = k * t;
    // 中文注释：假期阅读能力超过总页数时，最多也只能读完整本书。
    if (readable > n) {
        readable = n;
    }

    cout << readable << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4355": {
    algorithm: "两人再次同一天值日的最短天数是两个周期的最小公倍数。",
    complexity: "时间复杂度 O(log min(m,n))，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int gcdInt(int a, int b) {
    while (b != 0) {
        int r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m, n;
    cin >> m >> n;

    // 中文注释：最小公倍数 lcm(a,b)=a/gcd(a,b)*b。
    cout << m / gcdInt(m, n) * n << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4409": {
    algorithm: "分别计算满减价格和折扣价格，取较小值并保留两位小数输出。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    double x, y, n, p;
    cin >> x >> y >> n >> p;

    double fullReduction = p;
    if (p >= x) {
        fullReduction = p - y;
    }
    double discount = p * n / 10.0;

    // 中文注释：两种优惠只能选一种，输出较低的实付金额。
    double answer = fullReduction < discount ? fullReduction : discount;
    cout << fixed << setprecision(2) << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4410": {
    algorithm: "累加 1^2 到 n^2，得到搭建所有层需要的石块总数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int answer = 0;
    for (int layer = 1; layer <= n; ++layer) {
        // 中文注释：第 layer 层需要 layer*layer 块，顺序累加即可。
        answer += layer * layer;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4445": {
    algorithm: "计算体积费用 0.5*V 和按重量分档费用，取二者较小值并保留一位小数。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    double v, g, m, n;
    cin >> v >> g >> m >> n;

    double volumeFee = 0.5 * v;
    double weightFee = (g < 300.0) ? m : n;

    // 中文注释：实际运费取按体积计费和按重量计费中的较小值。
    double answer = volumeFee < weightFee ? volumeFee : weightFee;
    cout << fixed << setprecision(1) << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4446": {
    algorithm: "逐组判断电量区间：不超过 10 输出 R，不超过 20 输出 L，否则输出原数字。",
    complexity: "时间复杂度 O(T)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int p;
        cin >> p;

        // 中文注释：按题面给出的三个电量区间分别输出。
        if (p <= 10) {
            cout << "R\\n";
        } else if (p <= 20) {
            cout << "L\\n";
        } else {
            cout << p << '\\n';
        }
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3865": {
    algorithm: "逐格判断是否在主对角线或副对角线上，是则输出 +，否则输出 -。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：X 字矩阵由主对角线 row==col 和副对角线 row+col==n-1 构成。
            if (row == col || row + col == n - 1) {
                cout << '+';
            } else {
                cout << '-';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4259": {
    algorithm: "按题意输出 n 行 m 列矩阵，第 i 行第 j 列的值为 i*j。",
    complexity: "时间复杂度 O(nm)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= m; ++j) {
            if (j > 1) {
                cout << ' ';
            }
            // 中文注释：题面给出的构造方法就是在第 i 行第 j 列填入 i*j。
            cout << i * j;
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4260": {
    algorithm: "先把小时加上 k，再按 24 小时进位到日期，并用闰年和每月天数处理跨月、跨年。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

bool isLeapYear(int year) {
    return (year % 400 == 0) || (year % 4 == 0 && year % 100 != 0);
}

int daysInMonth(int year, int month) {
    if (month == 2) {
        return isLeapYear(year) ? 29 : 28;
    }
    if (month == 4 || month == 6 || month == 9 || month == 11) {
        return 30;
    }
    return 31;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int y, m, d, h, k;
    cin >> y >> m >> d >> h >> k;

    int totalHours = h + k;
    h = totalHours % 24;
    d += totalHours / 24;

    // 中文注释：k 最多 24，但仍按通用日期进位处理，避免月末、年末边界出错。
    while (d > daysInMonth(y, m)) {
        d -= daysInMonth(y, m);
        ++m;
        if (m > 12) {
            m = 1;
            ++y;
        }
    }

    cout << y << ' ' << m << ' ' << d << ' ' << h << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4356": {
    algorithm: "不同三角形按无序直角边对 a<=b 计数；面积为整数等价于 a*b 为偶数，因此从总对数中减去两边都为奇数的对数。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;

    long long totalPairs = n * (n + 1) / 2;
    long long oddCount = (n + 1) / 2;
    long long oddOddPairs = oddCount * (oddCount + 1) / 2;

    // 中文注释：只有两条直角边同时为奇数时，a*b/2 不是整数。
    cout << totalPairs - oddOddPairs << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4357": {
    algorithm: "枚举所有不超过 r 的 2 的次幂，两两求和并标记，再统计区间 [l,r] 中被标记的数。",
    complexity: "时间复杂度 O(log^2 r + r)，空间复杂度 O(r)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int l, r;
    cin >> l >> r;

    vector<int> powers;
    for (int value = 1; value <= r; value *= 2) {
        powers.push_back(value);
    }

    vector<bool> isPowerSum(r + 1, false);
    for (int a : powers) {
        for (int b : powers) {
            int sum = a + b;
            if (sum <= r) {
                // 中文注释：同一个 n 可能由不同 x,y 得到，标记后只计一次。
                isPowerSum[sum] = true;
            }
        }
    }

    int answer = 0;
    for (int value = l; value <= r; ++value) {
        if (isPowerSum[value]) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4411": {
    algorithm: "生成所有由同一个数字重复组成的正整数，统计不超过 n 的个数。",
    complexity: "时间复杂度 O(log n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int answer = 0;
    for (int digit = 1; digit <= 9; ++digit) {
        int value = 0;
        while (value <= n) {
            value = value * 10 + digit;
            if (value <= n) {
                // 中文注释：value 的每一位都由 digit 构成，因此是优美数字。
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4412": {
    algorithm: "以中心点为基准，满足 |row-center|+|col-center|=center 的格子位于菱形边界。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    code: `#include <cmath>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int center = n / 2;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：曼哈顿距离等于 center 的位置正好构成菱形轮廓。
            if (abs(row - center) + abs(col - center) == center) {
                cout << '#';
            } else {
                cout << '.';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4447": {
    algorithm: "每组数据的总能量等于基础行走 n 点，加上每 x 公里触发一次的 floor(n/x) 点奖励。",
    complexity: "时间复杂度 O(t)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        int n, x;
        cin >> n >> x;

        // 中文注释：每走 x 公里额外加 1 点，触发次数就是 n / x 的整数商。
        cout << n + n / x << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4448": {
    algorithm: "枚举所有坐标，右侧非负时把 sqrt 不等式平方，判断 r^2+c^2 <= (x+r-c)^2。",
    complexity: "时间复杂度 O(HW)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long h, w, x;
    cin >> h >> w >> x;

    long long answer = 0;
    for (long long r = 1; r <= h; ++r) {
        for (long long c = 1; c <= w; ++c) {
            long long right = x + r - c;
            if (right < 0) {
                continue;
            }
            long long leftSquared = r * r + c * c;
            long long rightSquared = right * right;
            // 中文注释：两边都非负时可以平方比较，避免浮点误差。
            if (leftSquared <= rightSquared) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3954": {
    algorithm: "顺序累乘所有数字，一旦乘积超过 1000000 就输出上限提示。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    long long product = 1;
    bool tooLarge = false;
    for (int i = 0; i < n; ++i) {
        long long value;
        cin >> value;
        if (!tooLarge) {
            product *= value;
            // 中文注释：只有严格超过 1000000 时才输出 >1000000。
            if (product > 1000000) {
                tooLarge = true;
            }
        }
    }

    if (tooLarge) {
        cout << ">1000000\\n";
    } else {
        cout << product << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3955": {
    algorithm: "按行列判断字符：左右边界输出 |，首行、末行和中间行内部输出 -，其余输出 x。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int middle = n / 2;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：日字矩阵有左右两条竖线和上中下三条横线。
            if (col == 0 || col == n - 1) {
                cout << '|';
            } else if (row == 0 || row == middle || row == n - 1) {
                cout << '-';
            } else {
                cout << 'x';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3994": {
    algorithm: "面积是平方和；周长由上下总宽 2*(1+...+n) 加左右和阶梯竖边 2n 得到。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;

    long long widthSum = n * (n + 1) / 2;
    long long perimeter = 2 * widthSum + 2 * n;
    long long area = n * (n + 1) * (2 * n + 1) / 6;

    // 中文注释：正方形边长依次为 1..n，面积是平方和，周长可看作上下边加竖向边界。
    cout << perimeter << '\\n' << area << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3995": {
    algorithm: "按田字矩阵规则逐格判断：边界、中横、竖中线和中心位置分别处理。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int middle = n / 2;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：先处理左右边界，再处理横线和中间竖线。
            if (col == 0 || col == n - 1) {
                cout << '|';
            } else if (row == 0 || row == n - 1) {
                cout << '-';
            } else if (row == middle && col != middle) {
                cout << '-';
            } else if (col == middle && row != middle) {
                cout << '|';
            } else {
                cout << 'x';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4002": {
    algorithm: "枚举正整数 x，再判断 a-x^2 是否为另一个正整数 y 的平方。",
    complexity: "每个数时间复杂度 O(sqrt(a))，空间复杂度 O(1)。",
    code: `#include <cmath>
#include <iostream>
using namespace std;

bool canBeSquareSum(int value) {
    for (int x = 1; x * x < value; ++x) {
        int rest = value - x * x;
        int y = static_cast<int>(sqrt(rest));
        // 中文注释：x 和 y 都必须是正整数。
        if (y >= 1 && y * y == rest) {
            return true;
        }
    }
    return false;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;
        cout << (canBeSquareSum(value) ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4007": {
    algorithm: "从 1 到 n 枚举每个数，拆分十进制数位并统计等于 k 的次数。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int countDigit(int value, int digit) {
    int count = 0;
    while (value > 0) {
        // 中文注释：每次取个位，再去掉个位。
        if (value % 10 == digit) {
            ++count;
        }
        value /= 10;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;

    int answer = 0;
    for (int value = 1; value <= n; ++value) {
        answer += countDigit(value, k);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4036": {
    algorithm: "逐个计算数字的数位和，判断数位和是否为 7 的倍数。",
    complexity: "时间复杂度 O(n log A)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int digitSum(long long value) {
    int sum = 0;
    while (value > 0) {
        // 中文注释：累加个位后删除个位。
        sum += value % 10;
        value /= 10;
    }
    return sum;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    for (int i = 0; i < n; ++i) {
        long long value;
        cin >> value;
        cout << (digitSum(value) % 7 == 0 ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4037": {
    algorithm: "按行列输出 N 字矩阵，第一列、最后一列和主对角线输出 +，其余输出 -。",
    complexity: "时间复杂度 O(m^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m;
    cin >> m;

    for (int row = 0; row < m; ++row) {
        for (int col = 0; col < m; ++col) {
            // 中文注释：N 字由左右竖线和左上到右下的主对角线组成。
            if (col == 0 || col == m - 1 || row == col) {
                cout << '+';
            } else {
                cout << '-';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4064": {
    algorithm: "预处理所有不超过 10^8 的四次方数，查询时直接映射到对应底数。",
    complexity: "预处理 O(100)，每次查询 O(1)，空间复杂度 O(100)。",
    code: `#include <iostream>
#include <map>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    map<long long, int> rootByFourthPower;
    for (long long b = 1; b * b * b * b <= 100000000LL; ++b) {
        rootByFourthPower[b * b * b * b] = static_cast<int>(b);
    }

    int t;
    cin >> t;
    while (t--) {
        long long a;
        cin >> a;
        // 中文注释：如果 a 是某个正整数的四次方，表中会有对应底数。
        auto it = rootByFourthPower.find(a);
        cout << (it == rootByFourthPower.end() ? -1 : it->second) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4065": {
    algorithm: "逐个计算正整数的数位和，维护所有数位和中的最大值。",
    complexity: "时间复杂度 O(n log A)，空间复杂度 O(1)。",
    code: `#include <algorithm>
#include <iostream>
using namespace std;

long long digitSum(long long value) {
    long long sum = 0;
    while (value > 0) {
        // 中文注释：每轮取出当前个位并加入数位和。
        sum += value % 10;
        value /= 10;
    }
    return sum;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long answer = 0;
    for (int i = 0; i < n; ++i) {
        long long value;
        cin >> value;
        answer = max(answer, digitSum(value));
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3836": {
    algorithm: "枚举公鸡和母鸡数量，小鸡数量由总只数确定，再检查数量和总价是否同时满足。",
    complexity: "时间复杂度 O(m^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int x, y, z, money, totalChicken;
    cin >> x >> y >> z >> money >> totalChicken;

    int answer = 0;
    for (int rooster = 0; rooster <= totalChicken; ++rooster) {
        for (int hen = 0; hen + rooster <= totalChicken; ++hen) {
            int chick = totalChicken - rooster - hen;
            // 中文注释：每 z 只小鸡 1 元，所以小鸡数量需要能被 z 整除。
            if (chick % z == 0 && rooster * x + hen * y + chick / z == money) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3837": {
    algorithm: "双重循环输出三角形，每输出一个字符就让字母在 A 到 Z 之间循环前进。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int current = 0;
    for (int row = 1; row <= n; ++row) {
        for (int col = 1; col <= row; ++col) {
            // 中文注释：current 对 26 取模，实现 Z 后回到 A。
            cout << char('A' + current % 26);
            ++current;
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3840": {
    algorithm: "枚举区间内每个整数，用试除法判断是否为素数并计数。",
    complexity: "时间复杂度 O((B-A+1) sqrt(B))，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

bool isPrime(int value) {
    if (value < 2) {
        return false;
    }
    for (int factor = 2; factor * factor <= value; ++factor) {
        // 中文注释：如果存在不超过平方根的因数，就不是素数。
        if (value % factor == 0) {
            return false;
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, b;
    cin >> a >> b;

    int answer = 0;
    for (int value = a; value <= b; ++value) {
        if (isPrime(value)) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3841": {
    algorithm: "对每个数拆出数位，计算位数次幂之和，判断是否等于原数。",
    complexity: "设 D 为十进制位数，每个数时间复杂度 O(D^2)，空间复杂度 O(D)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

long long intPow(int base, int exponent) {
    long long result = 1;
    for (int i = 0; i < exponent; ++i) {
        result *= base;
    }
    return result;
}

bool isNarcissistic(long long value) {
    long long original = value;
    vector<int> digits;
    while (value > 0) {
        digits.push_back(value % 10);
        value /= 10;
    }

    int length = static_cast<int>(digits.size());
    long long sum = 0;
    for (int digit : digits) {
        // 中文注释：自幂数要求每个数位的 N 次方之和等于原数。
        sum += intPow(digit, length);
    }
    return sum == original;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int m;
    cin >> m;
    for (int i = 0; i < m; ++i) {
        long long value;
        cin >> value;
        cout << (isNarcissistic(value) ? 'T' : 'F') << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3844": {
    algorithm: "第 i 行第 j 列的字母比 A 偏移 i+j，偏移量对 26 取模即可。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：行号和列号共同决定字母偏移，Z 后循环到 A。
            cout << char('A' + (row + col) % 26);
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3845": {
    algorithm: "枚举 a 和 b，计算 c^2=a^2+b^2，若 c 是整数且不超过 n 就计数。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    code: `#include <cmath>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int answer = 0;
    for (int a = 1; a <= n; ++a) {
        for (int b = a; b <= n; ++b) {
            int square = a * a + b * b;
            int c = static_cast<int>(sqrt(square));
            // 中文注释：要求 a <= b <= c 且 c <= n，同时满足平方关系。
            if (c >= b && c <= n && c * c == square) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3866": {
    algorithm: "每次取三位数字，构造最大排列和最小排列，做差后继续直到得到 495。",
    complexity: "每次变换只处理 3 位数字，时间复杂度 O(C)，C 为变换次数；空间复杂度 O(1)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int transform(int value) {
    vector<int> digits(3);
    digits[0] = value / 100;
    digits[1] = value / 10 % 10;
    digits[2] = value % 10;

    sort(digits.begin(), digits.end());
    int smallest = digits[0] * 100 + digits[1] * 10 + digits[2];
    int largest = digits[2] * 100 + digits[1] * 10 + digits[0];
    // 中文注释：不足三位的中间结果也按带前导零的三位数继续处理。
    return largest - smallest;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int count = 0;
    while (n != 495) {
        n = transform(n);
        ++count;
    }

    cout << count << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3923": {
    algorithm: "按前两天推后一天的递推式模拟，某天做题数达到 m 后计入当天并停止。",
    complexity: "时间复杂度 O(N)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long a, b, limit;
    int n;
    cin >> a >> b >> limit >> n;

    long long total = a + b;
    long long prev2 = a;
    long long prev1 = b;

    for (int day = 3; day <= n; ++day) {
        long long today = prev1 + prev2;
        total += today;
        // 中文注释：达到或超过 limit 的这一天仍然计入总数，之后停止做题。
        if (today >= limit) {
            break;
        }
        prev2 = prev1;
        prev1 = today;
    }

    cout << total << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3924": {
    algorithm: "按行列判断字符：左右边界输出 |，中间行内部输出 -，其余位置输出 a。",
    complexity: "时间复杂度 O(N^2)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int middle = n / 2;

    for (int row = 0; row < n; ++row) {
        for (int col = 0; col < n; ++col) {
            // 中文注释：第一列和最后一列总是竖线，中间行的内部位置是横线。
            if (col == 0 || col == n - 1) {
                cout << '|';
            } else if (row == middle) {
                cout << '-';
            } else {
                cout << 'a';
            }
        }
        cout << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3952": {
    algorithm: "一本书 13 元，最多购买数量是 m 除以 13 的商，剩余钱数是余数。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int money;
    cin >> money;

    // 中文注释：整数除法得到可以买几本，取模得到买完后的剩余钱数。
    cout << money / 13 << '\\n' << money % 13 << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3953": {
    algorithm: "从 1 到 a 枚举，能整除 a 的数就是 a 的因数，按枚举顺序输出自然升序。",
    complexity: "时间复杂度 O(a)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a;
    cin >> a;

    for (int factor = 1; factor <= a; ++factor) {
        // 中文注释：如果 a 除以 factor 没有余数，factor 就是 a 的一个因数。
        if (a % factor == 0) {
            cout << factor << '\\n';
        }
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3992": {
    algorithm: "逐个判断数字，排除个位为 3 或能被 3 整除的数，其余累加并计数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    long long sum = 0;
    int count = 0;
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;

        // 中文注释：幸运数字不能是 3 的倍数，个位数也不能是 3。
        if (value % 3 != 0 && value % 10 != 3) {
            sum += value;
            ++count;
        }
    }

    cout << sum << ' ' << count << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3993": {
    algorithm: "用普通年份每月天数表判断当天是否为月末，月末则进到下个月，否则日期加一。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int month, day;
    cin >> month >> day;

    int daysInMonth[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (day < daysInMonth[month]) {
        ++day;
    } else {
        // 中文注释：当前月最后一天的下一天是下个月 1 日；12 月后回到 1 月。
        day = 1;
        ++month;
        if (month == 13) {
            month = 1;
        }
    }

    cout << month << ' ' << day << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4000": {
    algorithm: "把当前时间转成总秒数，加上休息秒数后再换回时、分、秒。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int hour, minute, second, rest;
    cin >> hour >> minute >> second >> rest;

    // 中文注释：样例允许 12:59:59 加秒后输出 13 点，因此这里不做 12 小时制回绕。
    int total = hour * 3600 + minute * 60 + second + rest;
    cout << total / 3600 << ' ' << total / 60 % 60 << ' ' << total % 60 << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4001": {
    algorithm: "枚举正整数 x，检查是否存在 x 的三次方等于 n。",
    complexity: "时间复杂度 O(cuberoot(n))，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    bool found = false;
    for (int x = 1; x * x * x <= n; ++x) {
        // 中文注释：n 不大，直接枚举每个可能的立方根即可。
        if (x * x * x == n) {
            found = true;
            break;
        }
    }

    cout << (found ? "Yes" : "No") << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4034": {
    algorithm: "每买一组需要同时买一件 A 和一件 B，总价为 a+b，最多组数为 n/(a+b)。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int money, priceA, priceB;
    cin >> money >> priceA >> priceB;

    // 中文注释：A、B 数量必须相同，可以把一件 A 和一件 B 看成一组。
    cout << money / (priceA + priceB) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4035": {
    algorithm: "逐个判断输入整数，统计能被 9 整除且不能被 8 整除的数字个数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int answer = 0;
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;

        // 中文注释：美丽数字需要同时满足“9 的倍数”和“不是 8 的倍数”。
        if (value % 9 == 0 && value % 8 != 0) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4062": {
    algorithm: "按公式把开尔文温度转成摄氏度和华氏度，华氏度超过 212 时输出警告。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iomanip>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    double kelvin;
    cin >> kelvin;

    double celsius = kelvin - 273.15;
    double fahrenheit = celsius * 1.8 + 32;

    if (fahrenheit > 212) {
        cout << "Temperature is too high!\\n";
    } else {
        // 中文注释：题目要求两个温度都保留两位小数。
        cout << fixed << setprecision(2) << celsius << ' ' << fahrenheit << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4063": {
    algorithm: "逐个读入整数，根据除以 2 的余数分别统计奇数和偶数。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int oddCount = 0;
    int evenCount = 0;
    for (int i = 0; i < n; ++i) {
        int value;
        cin >> value;
        // 中文注释：能被 2 整除的是偶数，否则是奇数。
        if (value % 2 == 0) {
            ++evenCount;
        } else {
            ++oddCount;
        }
    }

    cout << oddCount << ' ' << evenCount << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3834": {
    algorithm: "枚举宽 w，若 A 能被 w 整除且长 A/w 不小于宽 w，就得到一种长方形。",
    complexity: "时间复杂度 O(sqrt(A))，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int area;
    cin >> area;

    int count = 0;
    // 中文注释：约定长大于等于宽，只需要枚举不超过平方根的宽。
    for (int width = 1; width * width <= area; ++width) {
        if (area % width == 0) {
            ++count;
        }
    }

    cout << count << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3835": {
    algorithm: "按月份判断天数，2 月根据闰年规则输出 28 或 29。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

bool isLeapYear(int year) {
    // 中文注释：能被 400 整除，或能被 4 整除但不能被 100 整除，就是闰年。
    return year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int year, month;
    cin >> year >> month;

    int days[13] = {0, 31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31};
    if (month == 2 && isLeapYear(year)) {
        cout << 29 << '\\n';
    } else {
        cout << days[month] << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3838": {
    algorithm: "把开始和结束时刻都转成当天经过的分钟数，相减即可。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int startHour, startMinute, endHour, endMinute;
    cin >> startHour >> startMinute >> endHour >> endMinute;

    // 中文注释：同一天内，小时乘 60 加分钟就是从 0 点开始经过的分钟数。
    int start = startHour * 60 + startMinute;
    int finish = endHour * 60 + endMinute;
    cout << finish - start << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3839": {
    algorithm: "累加每个前缀和，也可以用公式 n(n+1)(n+2)/6。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    int prefixSum = 0;
    int answer = 0;
    for (int i = 1; i <= n; ++i) {
        // 中文注释：prefixSum 表示 1+2+...+i，再把每一项前缀和累加到答案里。
        prefixSum += i;
        answer += prefixSum;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3846": {
    algorithm: "枚举起止年份之间的年份，判断闰年并累加年份值。",
    complexity: "时间复杂度 O(B-A)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

bool isLeapYear(int year) {
    return year % 400 == 0 || (year % 4 == 0 && year % 100 != 0);
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int startYear, endYear;
    cin >> startYear >> endYear;

    int sum = 0;
    // 中文注释：题目明确不包含起始年份和终止年份。
    for (int year = startYear + 1; year <= endYear - 1; ++year) {
        if (isLeapYear(year)) {
            sum += year;
        }
    }

    cout << sum << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3847": {
    algorithm: "先把 A/P 制转换成 24 小时制，再换算成当天经过的秒数。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int hour, minute, second;
    char period;
    cin >> hour >> minute >> second >> period;

    // 中文注释：P 表示下午，要在小时上加 12；样例中 11:59:59 P 对应 23:59:59。
    if (period == 'P') {
        hour += 12;
    }

    cout << hour * 3600 + minute * 60 + second << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3863": {
    algorithm: "计算总价，与已有金额比较；够买输出剩余，不够买输出差额。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int x, y, z, money;
    cin >> x >> y >> z >> money;

    // 中文注释：签字笔 2 元、记事本 5 元、直尺 3 元。
    int cost = 2 * x + 5 * y + 3 * z;
    if (money >= cost) {
        cout << "Yes\\n" << money - cost << '\\n';
    } else {
        cout << "No\\n" << cost - money << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3864": {
    algorithm: "枚举 [L,R] 中的每个整数，满足个位为 k 或能被 k 整除时累加。",
    complexity: "时间复杂度 O(R-L+1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int k, left, right;
    cin >> k >> left >> right;

    int sum = 0;
    for (int value = left; value <= right; ++value) {
        // 中文注释：只要个位数为 k，或者是 k 的倍数，就是 k 幸运数。
        if (value % 10 == k || value % k == 0) {
            sum += value;
        }
    }

    cout << sum << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3921": {
    algorithm: "星期每 7 天循环，将 X+N 按 7 取模，并把 0 映射为 7。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int today, days;
    cin >> today >> days;

    // 中文注释：星期 7 表示星期日；取模结果为 0 时输出 7。
    int result = (today + days) % 7;
    if (result == 0) {
        result = 7;
    }
    cout << result << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3922": {
    algorithm: "从 1 到 N 枚举，跳过 M 的倍数，其余按行输出。",
    complexity: "时间复杂度 O(N)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    for (int value = 1; value <= n; ++value) {
        // 中文注释：报数时跳过 M 的倍数。
        if (value % m != 0) {
            cout << value << '\\n';
        }
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3871": {
    algorithm: "枚举质因数，统计每个质因数的指数，再按格式输出。",
    complexity: "时间复杂度 O(sqrt(N))，空间复杂度 O(k)，k 为不同质因数个数。",
    code: `#include <algorithm>
#include <iostream>
#include <utility>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;

    vector<pair<long long, int>> factors;

    // 中文注释：从小到大枚举可能的质因数，保证输出顺序也是从小到大。
    for (long long p = 2; p * p <= n; ++p) {
        if (n % p != 0) {
            continue;
        }
        int cnt = 0;
        while (n % p == 0) {
            n /= p;
            ++cnt;
        }
        factors.push_back({p, cnt});
    }

    // 中文注释：如果最后剩下的 n 大于 1，它本身就是一个质因数。
    if (n > 1) {
        factors.push_back({n, 1});
    }

    for (size_t i = 0; i < factors.size(); ++i) {
        if (i > 0) {
            cout << " * ";
        }
        cout << factors[i].first;
        if (factors[i].second > 1) {
            cout << "^" << factors[i].second;
        }
    }
    cout << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3872": {
    algorithm: "按奖励从大到小选择小游戏，每个小游戏放到不超过截止时间的最晚空时间段。",
    complexity: "时间复杂度 O(n^2)，n <= 500 时足够；空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>
using namespace std;

struct Game {
    int deadline;
    int reward;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<Game> games(n);
    for (int i = 0; i < n; ++i) {
        cin >> games[i].deadline;
    }
    for (int i = 0; i < n; ++i) {
        cin >> games[i].reward;
    }

    // 中文注释：优先尝试奖励更高的游戏，这是经典的带截止时间任务贪心。
    sort(games.begin(), games.end(), [](const Game& a, const Game& b) {
        return a.reward > b.reward;
    });

    vector<int> used(n + 1, 0);
    int answer = 0;
    for (const Game& game : games) {
        // 中文注释：把当前游戏安排到不超过截止时间的最晚空段，给更早截止的游戏留空间。
        for (int t = game.deadline; t >= 1; --t) {
            if (!used[t]) {
                used[t] = 1;
                answer += game.reward;
                break;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3929": {
    algorithm: "预处理所有不小于 a 的完全平方数及其倍数，再用 next 数组查询每个数之后最近的幸运数。",
    complexity: "设 M 为最大查询值加最小超级幸运数，时间复杂度约为 O(M log M)，空间复杂度 O(M)。",
    code: `#include <algorithm>
#include <cmath>
#include <iostream>
#include <vector>
using namespace std;

long long ceilSqrt(long long x) {
    long long r = sqrt((long double)x);
    while (r * r < x) {
        ++r;
    }
    while (r > 0 && (r - 1) * (r - 1) >= x) {
        --r;
    }
    return r;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int a, n;
    cin >> a >> n;
    vector<int> query(n);
    int maxQuery = 0;
    for (int i = 0; i < n; ++i) {
        cin >> query[i];
        maxQuery = max(maxQuery, query[i]);
    }

    long long firstRoot = ceilSqrt(a);
    int firstSquare = static_cast<int>(firstRoot * firstRoot);
    int limit = maxQuery + firstSquare;

    vector<char> lucky(limit + 1, 0);

    // 中文注释：超级幸运数是所有 >= a 的完全平方数，幸运数是它们的倍数。
    for (long long root = firstRoot; root * root <= limit; ++root) {
        int square = static_cast<int>(root * root);
        for (int value = square; value <= limit; value += square) {
            lucky[value] = 1;
        }
    }

    vector<int> nextLucky(limit + 2, -1);
    for (int value = limit; value >= 1; --value) {
        if (lucky[value]) {
            nextLucky[value] = value;
        } else {
            nextLucky[value] = nextLucky[value + 1];
        }
    }

    for (int x : query) {
        if (lucky[x]) {
            cout << "lucky\\n";
        } else {
            // 中文注释：题目要求一直 +1，等价于找不小于 x 的最近幸运数。
            cout << nextLucky[x] << '\\n';
        }
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3930": {
    algorithm: "从高位到低位贪心尝试答案的每一位，若至少两个数包含当前候选 mask，则该位可以保留。",
    complexity: "时间复杂度 O(31N)，空间复杂度 O(N)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }

    int answer = 0;
    // 中文注释：最高位到最低位尝试，如果有至少两个数包含 candidate 的所有 1 位，就能组成这个按位与值。
    for (int bit = 30; bit >= 0; --bit) {
        int candidate = answer | (1 << bit);
        int count = 0;
        for (int value : a) {
            if ((value & candidate) == candidate) {
                ++count;
                if (count >= 2) {
                    break;
                }
            }
        }
        if (count >= 2) {
            answer = candidate;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3941": {
    algorithm: "所有同学再次同时锻炼的最短天数是所有间隔的最小公倍数。",
    complexity: "时间复杂度 O(n log A)，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

long long gcdLong(long long a, long long b) {
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    long long answer = 1;

    for (int i = 0; i < n; ++i) {
        long long x;
        cin >> x;
        // 中文注释：两个周期同时出现的最短间隔是 lcm(a,b)=a/gcd(a,b)*b。
        answer = answer / gcdLong(answer, x) * x;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b3951": {
    algorithm: "每次新同学加入后，只需要统计当前队伍中身高严格大于他的不同身高种类数。",
    complexity: "时间复杂度 O(MD)，D 为当前不同身高数且不超过 2000；空间复杂度 O(D)。",
    code: `#include <iostream>
#include <map>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> height(n);
    for (int i = 0; i < n; ++i) {
        cin >> height[i];
    }

    int m;
    cin >> m;
    map<long long, int> countByHeight;

    for (int i = 0; i < m; ++i) {
        int x;
        cin >> x;
        long long h = height[x];

        int answer = 0;
        // 中文注释：相同身高的同学顺序任意，所以只需统计比新同学高的不同身高层数。
        for (auto it = countByHeight.upper_bound(h); it != countByHeight.end(); ++it) {
            ++answer;
        }

        cout << answer << '\\n';
        ++countByHeight[h];
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3968": {
    algorithm: "按总分、语数总分、语数最高分构造排序关键字，排序后按竞赛排名规则回填原输入顺序。",
    complexity: "时间复杂度 O(N log N)，空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>
using namespace std;

struct Student {
    int id;
    int chinese;
    int math;
    int english;
    int total;
    int cmTotal;
    int cmMax;
};

bool sameRankKey(const Student& a, const Student& b) {
    return a.total == b.total && a.cmTotal == b.cmTotal && a.cmMax == b.cmMax;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<Student> students(n);
    for (int i = 0; i < n; ++i) {
        int c, m, e;
        cin >> c >> m >> e;
        students[i] = {i, c, m, e, c + m + e, c + m, max(c, m)};
    }

    // 中文注释：题目要求按三个关键字从高到低排序，完全相同则并列。
    sort(students.begin(), students.end(), [](const Student& a, const Student& b) {
        if (a.total != b.total) {
            return a.total > b.total;
        }
        if (a.cmTotal != b.cmTotal) {
            return a.cmTotal > b.cmTotal;
        }
        if (a.cmMax != b.cmMax) {
            return a.cmMax > b.cmMax;
        }
        return a.id < b.id;
    });

    vector<int> rankOf(n);
    for (int i = 0; i < n; ++i) {
        if (i > 0 && sameRankKey(students[i], students[i - 1])) {
            rankOf[students[i].id] = rankOf[students[i - 1].id];
        } else {
            rankOf[students[i].id] = i + 1;
        }
    }

    for (int i = 0; i < n; ++i) {
        cout << rankOf[i] << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b3969": {
    algorithm: "用筛法求出每个数的最大质因子，再统计最大质因子不超过 B 的整数个数。",
    complexity: "时间复杂度 O(n log log n) 量级，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, b;
    cin >> n >> b;

    vector<int> largestPrimeFactor(n + 1, 0);
    for (int p = 2; p <= n; ++p) {
        if (largestPrimeFactor[p] != 0) {
            continue;
        }
        // 中文注释：p 当前没有被标记，说明 p 是质数；它会成为若干倍数的质因子。
        for (int multiple = p; multiple <= n; multiple += p) {
            largestPrimeFactor[multiple] = p;
        }
    }

    int answer = 0;
    for (int value = 1; value <= n; ++value) {
        // 中文注释：1 没有质因子，按题意也计为 B-smooth 数。
        if (largestPrimeFactor[value] <= b) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4050": {
    algorithm: "枚举物理攻击次数，判断剩余血量是否为 0 或一个可用质数。",
    complexity: "预处理质数 O(H log log H)，每组查询 O(log H)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    vector<int> health(t);
    int maxHealth = 0;
    for (int i = 0; i < t; ++i) {
        cin >> health[i];
        maxHealth = max(maxHealth, health[i]);
    }

    vector<char> isPrime(maxHealth + 1, true);
    if (maxHealth >= 0) {
        isPrime[0] = false;
    }
    if (maxHealth >= 1) {
        isPrime[1] = false;
    }
    for (int p = 2; p * p <= maxHealth; ++p) {
        if (!isPrime[p]) {
            continue;
        }
        for (int multiple = p * p; multiple <= maxHealth; multiple += p) {
            isPrime[multiple] = false;
        }
    }

    for (int h : health) {
        int answer = 1e9;
        int physicalDamage = 0;

        for (int physicalCount = 0; physicalDamage <= h; ++physicalCount) {
            int remain = h - physicalDamage;
            if (remain == 0) {
                answer = min(answer, physicalCount);
            } else if (remain <= maxHealth && isPrime[remain]) {
                // 中文注释：剩余血量为质数时，可以用一次魔法攻击补齐。
                answer = min(answer, physicalCount + 1);
            }

            if (physicalCount >= 30) {
                break;
            }
            physicalDamage = (1 << (physicalCount + 1)) - 1;
        }

        cout << (answer == 1e9 ? -1 : answer) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4051": {
    algorithm: "如果只有一种武器，所有变化都必须加到它；否则把正收益都给当前最高熟练度武器，非正变化分配给其他武器。",
    complexity: "时间复杂度 O(n + m)，空间复杂度 O(1)。",
    code: `#include <algorithm>
#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    long long maxInitial = -4000000000000000000LL;
    long long onlyWeapon = 0;
    for (int i = 0; i < n; ++i) {
        long long c;
        cin >> c;
        maxInitial = max(maxInitial, c);
        if (i == 0) {
            onlyWeapon = c;
        }
    }

    long long positiveSum = 0;
    long long allSum = 0;
    for (int j = 0; j < m; ++j) {
        long long a;
        cin >> a;
        allSum += a;
        if (a > 0) {
            positiveSum += a;
        }
    }

    if (n == 1) {
        // 中文注释：只有一种武器时，每场战斗都只能使用它，正负变化都必须承受。
        cout << onlyWeapon + allSum << '\\n';
    } else {
        // 中文注释：有至少两种武器时，正变化集中给最高初始熟练度武器，非正变化丢给其他武器。
        cout << maxInitial + positiveSum << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:b4070": {
    algorithm: "把 n 分解质因数；每个质因数指数 e 能贡献的最大个数是最大的 k，满足 1+2+...+k <= e。",
    complexity: "时间复杂度 O(sqrt(n))，空间复杂度 O(1)。",
    code: `#include <iostream>
using namespace std;

long long countWonderful(long long exponent) {
    long long used = 0;
    long long count = 0;
    while (used + count + 1 <= exponent) {
        ++count;
        used += count;
    }
    return count;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n;
    cin >> n;

    long long answer = 0;
    for (long long p = 2; p * p <= n; ++p) {
        if (n % p != 0) {
            continue;
        }
        long long exponent = 0;
        while (n % p == 0) {
            n /= p;
            ++exponent;
        }
        // 中文注释：同一个质数 p 下，优先选择 p^1、p^2、p^3 ... 最省指数。
        answer += countWonderful(exponent);
    }

    if (n > 1) {
        // 中文注释：剩余的大于 1 的因子是质数，指数为 1，只能贡献一个奇妙数字。
        answer += 1;
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:b4071": {
    algorithm: "枚举武器 1 最终适配数量 x，强制削减其他武器到 x-1 以下，再补足武器 1 所需数量，取最小代价。",
    complexity: "时间复杂度 O(m^2 log m)，m <= 1000 时可接受；空间复杂度 O(m)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<long long>> cost(n + 1);
    for (int i = 0; i < m; ++i) {
        int weapon;
        long long c;
        cin >> weapon >> c;
        cost[weapon].push_back(c);
    }

    if (n == 1) {
        cout << 0 << '\\n';
        return 0;
    }

    for (int weapon = 1; weapon <= n; ++weapon) {
        sort(cost[weapon].begin(), cost[weapon].end());
    }

    int initialOne = static_cast<int>(cost[1].size());
    long long answer = (1LL << 62);

    for (int target = initialOne; target <= m; ++target) {
        // 中文注释：其他 n-1 种武器每种最多 target-1 个材料，需要有足够容量容纳剩余材料。
        if (1LL * (m - target) > 1LL * (n - 1) * (target - 1)) {
            continue;
        }

        int needToOne = target - initialOne;
        int forcedMoved = 0;
        long long currentCost = 0;
        vector<long long> optionalCosts;

        for (int weapon = 2; weapon <= n; ++weapon) {
            int count = static_cast<int>(cost[weapon].size());
            int forced = max(0, count - (target - 1));
            forcedMoved += forced;
            for (int i = 0; i < forced; ++i) {
                currentCost += cost[weapon][i];
            }
            for (int i = forced; i < count; ++i) {
                optionalCosts.push_back(cost[weapon][i]);
            }
        }

        if (forcedMoved < needToOne) {
            sort(optionalCosts.begin(), optionalCosts.end());
            int extra = needToOne - forcedMoved;
            if (extra > static_cast<int>(optionalCosts.size())) {
                continue;
            }
            for (int i = 0; i < extra; ++i) {
                currentCost += optionalCosts[i];
            }
        }

        answer = min(answer, currentCost);
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10719": {
    algorithm: "枚举上下边界，把每列黑格数压成一维数组，再用滑动窗口找至少 k 个黑格的最短列宽。",
    complexity: "时间复杂度 O(n^2 m)，空间复杂度 O(m)。",
    code: `#include <algorithm>
#include <iostream>
#include <string>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m, k;
    cin >> n >> m >> k;
    vector<string> grid(n);
    for (int i = 0; i < n; ++i) {
        cin >> grid[i];
    }

    int answer = n * m + 1;

    for (int top = 0; top < n; ++top) {
        vector<int> col(m, 0);
        for (int bottom = top; bottom < n; ++bottom) {
            for (int c = 0; c < m; ++c) {
                col[c] += (grid[bottom][c] == '1');
            }

            int sum = 0;
            int left = 0;
            for (int right = 0; right < m; ++right) {
                sum += col[right];
                while (left <= right && sum - col[left] >= k) {
                    sum -= col[left];
                    ++left;
                }
                if (sum >= k) {
                    // 中文注释：上下边界固定时，面积等于行高乘以当前最短列宽。
                    int height = bottom - top + 1;
                    int width = right - left + 1;
                    answer = min(answer, height * width);
                }
            }
        }
    }

    cout << (answer == n * m + 1 ? 0 : answer) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p10720": {
    algorithm: "预处理每个数的不同质因子个数，查询时判断是否恰好为 2。",
    complexity: "预处理 O(A log log A)，查询 O(1)，A 为最大输入值。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> values(n);
    int maxValue = 0;
    for (int i = 0; i < n; ++i) {
        cin >> values[i];
        maxValue = max(maxValue, values[i]);
    }

    vector<int> distinctPrimeCount(maxValue + 1, 0);
    for (int p = 2; p <= maxValue; ++p) {
        if (distinctPrimeCount[p] != 0) {
            continue;
        }
        // 中文注释：p 没有被更小质数标记过，说明 p 是质数；给所有倍数增加一种不同质因子。
        for (int multiple = p; multiple <= maxValue; multiple += p) {
            ++distinctPrimeCount[multiple];
        }
    }

    for (int value : values) {
        cout << (distinctPrimeCount[value] == 2 ? 1 : 0) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p11960": {
    algorithm: "先假设全部卖给 C，再选择 b_i-c_i 最大的 n 件改卖给 B。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(n)。",
    code: `#include <algorithm>
#include <functional>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    int totalItems = 2 * n;
    vector<long long> b(totalItems), c(totalItems);
    for (int i = 0; i < totalItems; ++i) {
        cin >> b[i];
    }
    for (int i = 0; i < totalItems; ++i) {
        cin >> c[i];
    }

    long long answer = 0;
    vector<long long> diff(totalItems);
    for (int i = 0; i < totalItems; ++i) {
        answer += c[i];
        diff[i] = b[i] - c[i];
    }

    sort(diff.begin(), diff.end(), greater<long long>());
    // 中文注释：必须恰好 n 件卖给 B，所以选择收益差最大的 n 件。
    for (int i = 0; i < n; ++i) {
        answer += diff[i];
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p11961": {
    algorithm: "质数 p 的原根判定：分解 p-1，检查 a^((p-1)/q) mod p 对每个质因子 q 都不等于 1。",
    complexity: "每组测试约 O(sqrt(p)+f log p)，f 为 p-1 的不同质因子个数。",
    code: `#include <iostream>
#include <vector>
using namespace std;

long long modPow(long long base, long long exp, long long mod) {
    long long result = 1 % mod;
    base %= mod;
    while (exp > 0) {
        if (exp & 1LL) {
            result = (__int128)result * base % mod;
        }
        base = (__int128)base * base % mod;
        exp >>= 1LL;
    }
    return result;
}

vector<long long> distinctPrimeFactors(long long x) {
    vector<long long> factors;
    for (long long p = 2; p * p <= x; ++p) {
        if (x % p != 0) {
            continue;
        }
        factors.push_back(p);
        while (x % p == 0) {
            x /= p;
        }
    }
    if (x > 1) {
        factors.push_back(x);
    }
    return factors;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        long long a, p;
        cin >> a >> p;

        bool ok = (1 < a && a < p && modPow(a, p - 1, p) == 1);
        vector<long long> factors = distinctPrimeFactors(p - 1);
        for (long long factor : factors) {
            // 中文注释：若存在更小指数让 a 的幂变成 1，a 的阶就不是 p-1，不能成为原根。
            if (modPow(a, (p - 1) / factor, p) == 1) {
                ok = false;
                break;
            }
        }

        cout << (ok ? "Yes" : "No") << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p13013": {
    algorithm: "二分答案 k，并判断两种兑换方式各用多少份时是否存在可行整数解。",
    complexity: "时间复杂度 O(log((n+m)/(a+b)))，空间复杂度 O(1)。",
    code: `#include <algorithm>
#include <iostream>
using namespace std;

long long floorDiv(long long x, long long y) {
    if (x < 0) {
        return -((-x + y - 1) / y);
    }
    return x / y;
}

long long ceilDiv(long long x, long long y) {
    if (x < 0) {
        return -((-x) / y);
    }
    return (x + y - 1) / y;
}

bool feasible(long long k, long long n, long long m, long long a, long long b) {
    if (a == b) {
        return a * k <= n && a * k <= m;
    }

    long long low = 0;
    long long high = k;
    long long d = a - b;

    if (d > 0) {
        // 中文注释：设第一种兑换使用 x 份，则课堂券消耗 b*k+d*x，作业券消耗 a*k-d*x。
        low = max(low, ceilDiv(a * k - m, d));
        high = min(high, floorDiv(n - b * k, d));
    } else {
        long long e = -d;
        low = max(low, ceilDiv(b * k - n, e));
        high = min(high, floorDiv(m - a * k, e));
    }

    return low <= high;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long n, m, a, b;
    cin >> n >> m >> a >> b;

    long long left = 0;
    long long right = (n + m) / (a + b);
    while (left < right) {
        long long mid = (left + right + 1) / 2;
        if (feasible(mid, n, m, a, b)) {
            left = mid;
        } else {
            right = mid - 1;
        }
    }

    cout << left << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p13014": {
    algorithm: "利用 gcd(a1+i,...,an+i)=gcd(a1+i, a2-a1, a3-a1, ...)，先预处理差分 gcd。",
    complexity: "预处理 O(n log A)，每次询问 O(log A)。",
    code: `#include <cstdlib>
#include <iostream>
#include <vector>
using namespace std;

long long gcdLong(long long a, long long b) {
    if (a < 0) {
        a = -a;
    }
    if (b < 0) {
        b = -b;
    }
    while (b != 0) {
        long long r = a % b;
        a = b;
        b = r;
    }
    return a;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<long long> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }

    long long diffGcd = 0;
    for (int i = 1; i < n; ++i) {
        diffGcd = gcdLong(diffGcd, a[i] - a[0]);
    }

    for (int i = 1; i <= q; ++i) {
        // 中文注释：同时加 i 后，相邻数之间的差不变。
        cout << gcdLong(a[0] + i, diffGcd) << '\\n';
    }
    return 0;
}
`
  },
  "supplemental:luogu:p14073": {
    algorithm: "最多可以选择 1 和所有不超过 n 的质数；任何大于 1 的数至少占用一个质因子，因此数量不可能超过质数个数加 1。",
    complexity: "时间复杂度 O(n log log n)，空间复杂度 O(n)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    vector<char> isPrime(n + 1, true);
    if (n >= 0) {
        isPrime[0] = false;
    }
    if (n >= 1) {
        isPrime[1] = false;
    }
    for (int p = 2; p * p <= n; ++p) {
        if (!isPrime[p]) {
            continue;
        }
        for (int multiple = p * p; multiple <= n; multiple += p) {
            isPrime[multiple] = false;
        }
    }

    int primeCount = 0;
    for (int value = 2; value <= n; ++value) {
        if (isPrime[value]) {
            ++primeCount;
        }
    }

    // 中文注释：1 与任何数互质，所有质数之间也两两互质。
    cout << primeCount + 1 << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14074": {
    algorithm: "用二进制数位 DP 计算 1..x 中二进制 1 个数为奇数的整数和，再用前缀和相减。",
    complexity: "时间复杂度 O(log r)，空间复杂度 O(log r)。",
    code: `#include <iostream>
#include <vector>
using namespace std;

struct Stats {
    long long countEven;
    long long countOdd;
    long long sumEven;
    long long sumOdd;
};

long long sumOddPopcount(long long x) {
    if (x <= 0) {
        return 0;
    }

    vector<Stats> stats(32);
    stats[0] = {1, 0, 0, 0};
    for (int len = 1; len < 32; ++len) {
        long long highBit = 1LL << (len - 1);
        const Stats& prev = stats[len - 1];
        stats[len].countEven = prev.countEven + prev.countOdd;
        stats[len].countOdd = prev.countOdd + prev.countEven;
        stats[len].sumEven = prev.sumEven + prev.sumOdd + prev.countOdd * highBit;
        stats[len].sumOdd = prev.sumOdd + prev.sumEven + prev.countEven * highBit;
    }

    long long total = 0;
    long long prefixValue = 0;
    int prefixParity = 0;

    for (int bit = 30; bit >= 0; --bit) {
        if (((x >> bit) & 1LL) == 0) {
            prefixValue <<= 1;
            continue;
        }

        long long base = prefixValue << (bit + 1);
        int needSuffixParity = 1 ^ prefixParity;
        // 中文注释：当前位从 1 改成 0 后，低 bit 位可任意取，用预处理统计奇偶数量和总和。
        if (needSuffixParity == 0) {
            total += stats[bit].countEven * base + stats[bit].sumEven;
        } else {
            total += stats[bit].countOdd * base + stats[bit].sumOdd;
        }

        prefixParity ^= 1;
        prefixValue = (prefixValue << 1) | 1LL;
    }

    if (prefixParity == 1) {
        total += x;
    }
    return total;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    long long l, r;
    cin >> l >> r;

    cout << sumOddPopcount(r) - sumOddPopcount(l - 1) << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14917": {
    algorithm: "二分每次允许移动的最大代价 x；把所有大于 x 的数视为不可移动，过滤后必须已经按相同数字两两相邻。",
    complexity: "时间复杂度 O(N log V)，V 为最大数字；空间复杂度 O(N)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

bool canArrange(const vector<int>& a, int limit) {
    vector<int> fixedValues;
    fixedValues.reserve(a.size());

    for (int value : a) {
        // 中文注释：代价大于 limit 的数字不能被移动，只能保持原有相对顺序。
        if (value > limit) {
            fixedValues.push_back(value);
        }
    }

    for (int i = 0; i < static_cast<int>(fixedValues.size()); i += 2) {
        // 中文注释：可移动数字全部挪走后，不可移动数字必须已经两两成对相邻。
        if (i + 1 >= static_cast<int>(fixedValues.size()) || fixedValues[i] != fixedValues[i + 1]) {
            return false;
        }
    }
    return true;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int maxValue = 0;
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
        maxValue = max(maxValue, a[i]);
    }

    int left = 0;
    int right = maxValue;
    while (left < right) {
        int mid = left + (right - left) / 2;
        if (canArrange(a, mid)) {
            right = mid;
        } else {
            left = mid + 1;
        }
    }

    cout << left << '\\n';
    return 0;
}
`
  },
  "supplemental:luogu:p14918": {
    algorithm: "把每个数分解为质因数指数向量；每个质数维度独立，目标指数取中位数可最小化总增减次数。",
    complexity: "时间复杂度 O(M log log M + K log K)，M 为最大数，K 为所有非零质因数指数记录数；空间复杂度 O(M + K)。",
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

vector<int> buildSmallestPrimeFactor(int limit) {
    vector<int> spf(limit + 1, 0);
    for (int i = 2; i <= limit; ++i) {
        if (spf[i] != 0) {
            continue;
        }
        spf[i] = i;
        if (1LL * i * i > limit) {
            continue;
        }
        for (long long multiple = 1LL * i * i; multiple <= limit; multiple += i) {
            if (spf[multiple] == 0) {
                spf[multiple] = i;
            }
        }
    }
    return spf;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> a(n);
    int maxValue = 1;
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
        maxValue = max(maxValue, a[i]);
    }

    vector<int> spf = buildSmallestPrimeFactor(maxValue);
    vector<vector<int>> exponentsByPrime(maxValue + 1);

    for (int value : a) {
        int x = value;
        while (x > 1) {
            int prime = spf[x];
            int exponent = 0;
            while (x % prime == 0) {
                x /= prime;
                ++exponent;
            }
            // 中文注释：没有出现该质因子的数字，其指数就是 0，后面统一用 zeroCount 处理。
            exponentsByPrime[prime].push_back(exponent);
        }
    }

    long long answer = 0;
    for (int prime = 2; prime <= maxValue; ++prime) {
        vector<int>& exponents = exponentsByPrime[prime];
        if (exponents.empty()) {
            continue;
        }

        sort(exponents.begin(), exponents.end());
        int zeroCount = n - static_cast<int>(exponents.size());
        int medianIndex = n / 2;
        int targetExponent = 0;
        if (medianIndex >= zeroCount) {
            targetExponent = exponents[medianIndex - zeroCount];
        }

        // 中文注释：一次乘或除质数只改变一个质数的指数 1，因此总操作数是各维度距离之和。
        answer += 1LL * zeroCount * targetExponent;
        for (int exponent : exponents) {
            if (exponent >= targetExponent) {
                answer += exponent - targetExponent;
            } else {
                answer += targetExponent - exponent;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  }
};

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function normalizeOutput(value) {
  return String(value || "")
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .trim();
}

function isPermutation(values, n) {
  if (values.length !== n) return false;
  const seen = new Set(values);
  if (seen.size !== n) return false;
  for (let value = 1; value <= n; value += 1) {
    if (!seen.has(value)) return false;
  }
  return true;
}

function checkGongFactorySample(input, actualOutput) {
  const inputTokens = normalizeOutput(input).split(/\s+/);
  const outputTokens = normalizeOutput(actualOutput).split(/\s+/);
  let inputIndex = 0;
  let outputIndex = 0;
  const caseCount = Number(inputTokens[inputIndex++]);
  for (let caseIndex = 0; caseIndex < caseCount; caseIndex += 1) {
    const n = Number(inputTokens[inputIndex++]);
    const machines = Array.from({ length: n }, () => Number(inputTokens[inputIndex++]));
    const orders = Array.from({ length: n }, () => Number(inputTokens[inputIndex++]));
    const possible = machines.reduce((sum, value) => sum + value, 0) >= orders.reduce((sum, value) => sum + value, 0);
    const decision = outputTokens[outputIndex++];
    if (!possible) {
      if (decision !== "No") return false;
      continue;
    }
    if (decision !== "Yes") return false;
    const machineIds = outputTokens.slice(outputIndex, outputIndex + n).map(Number);
    outputIndex += n;
    const orderIds = outputTokens.slice(outputIndex, outputIndex + n).map(Number);
    outputIndex += n;
    if (!isPermutation(machineIds, n) || !isPermutation(orderIds, n)) return false;
    let stock = 0;
    for (let day = 0; day < n; day += 1) {
      stock += machines[machineIds[day] - 1];
      stock -= orders[orderIds[day] - 1];
      if (stock < 0) return false;
    }
  }
  return outputIndex === outputTokens.length;
}

function checkSampleOutput(canonicalProblemId, sample, actual) {
  const normalizedActual = normalizeOutput(actual);
  const normalizedExpected = normalizeOutput(sample.output);
  if (canonicalProblemId === "supplemental:luogu:b3999") {
    return {
      expected: "any valid Yes/No construction",
      actual: normalizedActual,
      passed: checkGongFactorySample(sample.input, normalizedActual)
    };
  }
  return {
    expected: normalizedExpected,
    actual: normalizedActual,
    passed: normalizedActual === normalizedExpected
  };
}

async function compileAndRun(canonicalProblemId, code, samples, tempRoot) {
  const sourcePath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, code);
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], { maxBuffer: 4 * 1024 * 1024 });

  const results = [];
  for (const [index, sample] of samples.entries()) {
    const stdout = await runBinary(binaryPath, `${sample.input}\n`);
    const result = checkSampleOutput(canonicalProblemId, sample, stdout);
    results.push({
      index: index + 1,
      ...result
    });
  }
  return results;
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

function summarize(data) {
  return {
    ...data.summary,
    pending_programming_solution_count: data.problem_details.filter((item) => item.completeness.needs_programming_solution).length,
    ai_sample_verified_solution_count: data.problem_details.filter((item) => item.programming_solution.verification?.status === "sample_passed").length
  };
}

function updateDetail(detail, pack, verification) {
  return {
    ...detail,
    programming_solution: {
      status: "needs_review",
      language: "C++",
      code: pack.code,
      content_origin: "ai_generated_sample_verified",
      ai_generation_notice: "该 C++ 参考解由 AI 根据公开题面生成，并已通过当前题面样例；仍需人工复核或 OJ 评测确认。",
      reference_answer: "AI 生成 C++ 参考解已通过公开样例，仍需复核。",
      algorithm: pack.algorithm,
      complexity: pack.complexity,
      verification,
      notes: [
        "AI 生成参考解，不能标记为官方题解。",
        "代码包含中文注释，已通过当前采集样例。",
        "正式发布前建议继续用公开 OJ 评测或人工复核边界条件。"
      ]
    },
    completeness: {
      ...detail.completeness,
      has_reference_answer: true,
      needs_programming_solution: false,
      needs_solution_review: true
    }
  };
}

function updateGuidance(guidance, pack, verification) {
  return {
    ...guidance,
    reference_answer: {
      ...guidance.reference_answer,
      status: "needs_review",
      answer: "AI 生成 C++ 参考解已通过公开样例，仍需人工或 OJ 复核。",
      source: "ai_generated_sample_verified",
      evidence: `已通过 ${verification.sample_count} 组公开样例；${pack.algorithm}`,
      confidence: Math.max(guidance.reference_answer.confidence || 0, 0.52),
      review_status: "needs_review"
    },
    review_notes: [
      ...(guidance.review_notes || []),
      "已补充 AI 生成 C++ 参考解并通过公开样例；仍需人工或 OJ 复核。"
    ]
  };
}

async function main() {
  const data = await readJson(supplementalPath);
  const tempRoot = await mkdtemp(join(tmpdir(), "gesp-ai-solutions-"));
  const verificationById = new Map();

  try {
    for (const detail of data.problem_details) {
      const pack = solutionPacks[detail.canonical_problem_id];
      if (!pack) {
        continue;
      }
      if (detail.sample_cases.status !== "source_extracted" || detail.sample_cases.cases.length === 0) {
        throw new Error(`${detail.canonical_problem_id}: source-extracted sample cases are required before writing AI solution`);
      }
      const sample_results = await compileAndRun(detail.canonical_problem_id, pack.code, detail.sample_cases.cases, tempRoot);
      const failed = sample_results.filter((item) => !item.passed);
      if (failed.length > 0) {
        throw new Error(`${detail.canonical_problem_id}: sample verification failed ${JSON.stringify(failed)}`);
      }
      verificationById.set(detail.canonical_problem_id, {
        status: "sample_passed",
        verifier: "scripts/apply-ai-reference-solutions.mjs",
        verified_at: new Date().toISOString(),
        sample_count: sample_results.length,
        sample_results
      });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  data.problem_details = data.problem_details.map((detail) => {
    const pack = solutionPacks[detail.canonical_problem_id];
    const verification = verificationById.get(detail.canonical_problem_id);
    return pack && verification ? updateDetail(detail, pack, verification) : detail;
  });

  data.answer_guidance = data.answer_guidance.map((guidance) => {
    const pack = solutionPacks[guidance.canonical_problem_id];
    const verification = verificationById.get(guidance.canonical_problem_id);
    return pack && verification ? updateGuidance(guidance, pack, verification) : guidance;
  });

  data.generated_at = new Date().toISOString();
  data.solution_enrichment = {
    ai_reference_solutions: {
      applied_at: data.generated_at,
      applied_count: verificationById.size,
      content_origin: "ai_generated_sample_verified",
      review_status: "needs_review",
      verification: "compiled with g++ -std=c++17 and passed current source-extracted samples"
    }
  };
  data.summary = summarize(data);

  await writeFile(supplementalPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`AI reference solutions applied: ${verificationById.size}`);
  console.log(`AI sample verified solution count: ${data.summary.ai_sample_verified_solution_count}`);
  console.log(`pending programming solution count: ${data.summary.pending_programming_solution_count}`);
  console.log(`wrote ${supplementalPath}`);
}

main().catch((error) => {
  console.error(`AI reference solution enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
