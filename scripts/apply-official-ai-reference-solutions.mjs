import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const detailsPath = "data/classification/problem-details.json";
const guidancePath = "data/classification/problem-answer-guidance.json";

const solutionPacks = {
  "canonical:2026-03:c++:level-1:programming:01": {
    algorithm: "枚举除 Alice 以外的 3 个身高，按身高差最小、身高更矮的规则更新答案。",
    complexity: "时间复杂度 O(1)，空间复杂度 O(1)。",
    understanding: {
      summary: "比较 Alice 与其他小朋友的身高差，差值相同就选择身高更矮的人。",
      algorithm_domains: ["排序/模拟"],
      problem_types: ["条件比较模拟型"],
      knowledge_points: ["绝对值差值", "并列规则处理"],
      steps: [
        "读入 4 个身高，固定 H1 为 Alice 的身高。",
        "枚举 H2 到 H4，计算与 H1 的绝对差。",
        "如果差值更小，或差值相同但身高更矮，就更新答案。"
      ],
      chinese_comments: [
        "中文注释：先比较差值，再处理并列时取较矮身高。",
        "中文注释：人数固定为 4，直接枚举比排序更清楚。"
      ],
      example_hint: "例如 Alice 身高 150，165 和 135 差值同为 15，应输出较矮的 135。"
    },
    code: `#include <cstdlib>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    vector<int> h(4);
    for (int i = 0; i < 4; ++i) {
        cin >> h[i];
    }

    int answer = h[1];
    int bestDiff = abs(h[1] - h[0]);

    for (int i = 2; i < 4; ++i) {
        int diff = abs(h[i] - h[0]);
        // 中文注释：优先选择身高差更小的人；差值相同则选择较矮的人。
        if (diff < bestDiff || (diff == bestDiff && h[i] < answer)) {
            bestDiff = diff;
            answer = h[i];
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-1:programming:02": {
    algorithm: "把整数按字符串读取，逐字符将数字 4 替换成 8。",
    complexity: "时间复杂度 O(d)，空间复杂度 O(d)，d 为数字位数。",
    understanding: {
      summary: "把数字当成字符串处理，逐位扫描并替换字符。",
      algorithm_domains: ["字符串", "排序/模拟"],
      problem_types: ["字符串替换模拟型"],
      knowledge_points: ["字符遍历", "数字字符替换"],
      steps: [
        "用字符串读取输入，避免拆位后再恢复整数。",
        "从左到右扫描每个字符。",
        "遇到字符 '4' 就改成 '8'，最后整体输出。"
      ],
      chinese_comments: [
        "中文注释：字符串方式能保留每一位的顺序。",
        "中文注释：只替换字符 '4'，其他数字保持不变。"
      ],
      example_hint: "8459045 中两个 4 都替换为 8，得到 8859085。"
    },
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string a;
    cin >> a;

    for (char& ch : a) {
        // 中文注释：题目只要求把数字 4 替换成数字 8。
        if (ch == '4') {
            ch = '8';
        }
    }

    cout << a << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-2:programming:01": {
    algorithm: "枚举 L 到 R 的每个整数，统计十进制数位中数字 2 的出现次数。",
    complexity: "时间复杂度 O((R-L+1) log R)，空间复杂度 O(1)。",
    understanding: {
      summary: "逐个检查区间内的数，只有数位中恰好有 3 个 2 才计数。",
      algorithm_domains: ["枚举", "排序/模拟"],
      problem_types: ["数位计数枚举型"],
      knowledge_points: ["数位拆分", "区间枚举"],
      steps: [
        "枚举从 L 到 R 的每个整数。",
        "通过不断取模和除以 10 统计数字 2 的个数。",
        "计数恰好等于 3 时，把答案加 1。"
      ],
      chinese_comments: [
        "中文注释：R 最大为 10^6，直接枚举可以通过。",
        "中文注释：只关心数字 2 出现次数是否恰好为 3。"
      ],
      example_hint: "2221 和 2223 都有 3 个数字 2，2222 有 4 个。"
    },
    code: `#include <iostream>
using namespace std;

bool isBeautiful(int x) {
    int countTwo = 0;
    while (x > 0) {
        if (x % 10 == 2) {
            ++countTwo;
        }
        x /= 10;
    }
    return countTwo == 3;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int l, r;
    cin >> l >> r;

    int answer = 0;
    for (int x = l; x <= r; ++x) {
        // 中文注释：逐个判断当前数是否恰好包含 3 个数字 2。
        if (isBeautiful(x)) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-2:programming:02": {
    algorithm: "按行列位置输出字符：四角为 +，上下边为 -，左右边为 |，内部为 *。",
    complexity: "时间复杂度 O(n^2)，空间复杂度 O(1)。",
    understanding: {
      summary: "按每个格子所在位置决定要输出的字符。",
      algorithm_domains: ["排序/模拟"],
      problem_types: ["图形输出模拟型"],
      knowledge_points: ["二维位置判断", "边界分类"],
      steps: [
        "用双重循环枚举行和列。",
        "先判断四个角，再判断上下边和左右边。",
        "不在边界上的位置输出内部字符 *。"
      ],
      chinese_comments: [
        "中文注释：图形题关键是把边界位置分类清楚。",
        "中文注释：每行输出完后换行。"
      ],
      example_hint: "n=5 时，第 1 行和第 5 行是 +---+，中间行是 |***|。"
    },
    code: `#include <iostream>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;

    for (int i = 1; i <= n; ++i) {
        for (int j = 1; j <= n; ++j) {
            bool topOrBottom = (i == 1 || i == n);
            bool leftOrRight = (j == 1 || j == n);
            // 中文注释：四个顶点同时在横向边界和纵向边界上。
            if (topOrBottom && leftOrRight) {
                cout << '+';
            } else if (topOrBottom) {
                cout << '-';
            } else if (leftOrRight) {
                cout << '|';
            } else {
                cout << '*';
            }
        }
        cout << '\\n';
    }

    return 0;
}
`
  },
  "canonical:2026-03:c++:level-3:programming:01": {
    algorithm: "枚举 1 到 n，把每个数转成二进制字符串后判断是否回文。",
    complexity: "时间复杂度 O(n log n)，空间复杂度 O(log n)。",
    understanding: {
      summary: "把整数转成无前导零的二进制表示，再用双指针判断回文。",
      algorithm_domains: ["字符串", "枚举"],
      problem_types: ["二进制表示判断型"],
      knowledge_points: ["进制转换", "回文判断"],
      steps: [
        "枚举 1 到 n 的每个整数。",
        "不断取模 2 得到二进制位，再反转成正常顺序。",
        "用左右指针判断二进制串是否左右对称。"
      ],
      chinese_comments: [
        "中文注释：二进制表示不能带前导零。",
        "中文注释：回文判断只需要比较左右两端字符。"
      ],
      example_hint: "9 的二进制是 1001，是回文；12 的二进制是 1100，不是回文。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <string>
using namespace std;

bool isBinaryPalindrome(int x) {
    string bits;
    while (x > 0) {
        bits.push_back(char('0' + x % 2));
        x /= 2;
    }
    reverse(bits.begin(), bits.end());

    int left = 0;
    int right = static_cast<int>(bits.size()) - 1;
    while (left < right) {
        if (bits[left] != bits[right]) {
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

    int answer = 0;
    for (int x = 1; x <= n; ++x) {
        // 中文注释：逐个检查二进制表示是否从左到右、从右到左相同。
        if (isBinaryPalindrome(x)) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-3:programming:02": {
    algorithm: "由已知明文和密文推出统一偏移量，再对待破解密文反向偏移。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    understanding: {
      summary: "先算出 Caesar cipher 的偏移量，再把密文每个字符减去偏移量。",
      algorithm_domains: ["字符串", "排序/模拟"],
      problem_types: ["字符串映射模拟型"],
      knowledge_points: ["凯撒密码", "循环位移"],
      steps: [
        "用已知明文第一个字符和对应密文第一个字符计算偏移量。",
        "遍历待破解密文的每个大写字母。",
        "把字符反向移动 shift 位，低于 A 时用模 26 回绕。"
      ],
      chinese_comments: [
        "中文注释：同一组输入使用相同偏移量。",
        "中文注释：字母表回绕可以用加 26 后取模处理。"
      ],
      example_hint: "若 A 加密成 D，则偏移量为 3，密文 W 解密为 T。"
    },
    code: `#include <iostream>
#include <string>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    string plain;
    string cipher;
    string target;
    cin >> plain >> cipher >> target;

    int shift = (cipher[0] - plain[0] + 26) % 26;

    for (char& ch : target) {
        // 中文注释：解密就是把密文字母反向移动 shift 位。
        ch = char('A' + (ch - 'A' - shift + 26) % 26);
    }

    cout << target << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-4:programming:01": {
    algorithm: "枚举每个单元格，检查八个方向的相邻格是否都不低于当前海拔。",
    complexity: "时间复杂度 O(NM)，空间复杂度 O(NM)。",
    understanding: {
      summary: "山谷判定只看八方向相邻格，当前格海拔不高于所有相邻格即可计数。",
      algorithm_domains: ["排序/模拟"],
      problem_types: ["网格邻接判断型"],
      knowledge_points: ["八方向邻接", "二维数组遍历"],
      steps: [
        "读入 N 行 M 列的海拔网格。",
        "对每个格子枚举 8 个方向，跳过越界位置。",
        "只要存在相邻格更低，当前格就不是山谷。"
      ],
      chinese_comments: [
        "中文注释：相邻包含八个方向，不只是上下左右。",
        "中文注释：题目要求“不高于”，所以相等海拔也允许成为山谷。"
      ],
      example_hint: "样例中的两个相邻 5 都不高于周围格子，因此都可以计为山谷。"
    },
    code: `#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<int>> h(n, vector<int>(m));
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) {
            cin >> h[i][j];
        }
    }

    int answer = 0;
    for (int i = 0; i < n; ++i) {
        for (int j = 0; j < m; ++j) {
            bool valley = true;
            for (int di = -1; di <= 1; ++di) {
                for (int dj = -1; dj <= 1; ++dj) {
                    if (di == 0 && dj == 0) {
                        continue;
                    }
                    int ni = i + di;
                    int nj = j + dj;
                    if (ni < 0 || ni >= n || nj < 0 || nj >= m) {
                        continue;
                    }
                    // 中文注释：如果存在更低的相邻格，当前格就不是山谷。
                    if (h[i][j] > h[ni][nj]) {
                        valley = false;
                    }
                }
            }
            if (valley) {
                ++answer;
            }
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-4:programming:02": {
    algorithm: "为每个礼盒计算总价、最大值、最小值，再按题目给定的四个关键字排序。",
    complexity: "时间复杂度 O(nk+n log n)，空间复杂度 O(n)。",
    understanding: {
      summary: "把每个礼盒压缩成排序关键字：总价、最大单价、最小单价和编号。",
      algorithm_domains: ["排序/模拟"],
      problem_types: ["多关键字排序型"],
      knowledge_points: ["结构体排序", "稳定并列规则"],
      steps: [
        "读入每个礼盒的 k 个价格。",
        "计算该礼盒的 sum、maxPrice、minPrice。",
        "按 sum、maxPrice、minPrice、id 依次升序排序并输出编号。"
      ],
      chinese_comments: [
        "中文注释：多关键字排序要严格按照题目顺序比较。",
        "中文注释：编号是最后一个兜底关键字。"
      ],
      example_hint: "样例中 3 号总价最小；总价相同的礼盒继续比较最大值和最小值。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct GiftBox {
    int id;
    long long sum;
    int maxPrice;
    int minPrice;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, k;
    cin >> n >> k;
    vector<GiftBox> boxes;

    for (int i = 1; i <= n; ++i) {
        long long sum = 0;
        int maxPrice = 0;
        int minPrice = 1000000000;
        for (int j = 0; j < k; ++j) {
            int price;
            cin >> price;
            sum += price;
            maxPrice = max(maxPrice, price);
            minPrice = min(minPrice, price);
        }
        boxes.push_back({i, sum, maxPrice, minPrice});
    }

    sort(boxes.begin(), boxes.end(), [](const GiftBox& a, const GiftBox& b) {
        // 中文注释：四个排序关键字按题目顺序依次比较。
        if (a.sum != b.sum) return a.sum < b.sum;
        if (a.maxPrice != b.maxPrice) return a.maxPrice < b.maxPrice;
        if (a.minPrice != b.minPrice) return a.minPrice < b.minPrice;
        return a.id < b.id;
    });

    for (int i = 0; i < n; ++i) {
        if (i > 0) {
            cout << ' ';
        }
        cout << boxes[i].id;
    }
    cout << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-5:programming:01": {
    algorithm: "一个分母 a 使 1/a 为有限小数，当且仅当 a 去掉所有因子 2 和 5 后剩余 1。",
    complexity: "时间复杂度 O((R-L+1) log R)，空间复杂度 O(1)。",
    understanding: {
      summary: "十进制有限小数的分母质因子只能包含 2 和 5。",
      algorithm_domains: ["数论"],
      problem_types: ["质因数分解判定型"],
      knowledge_points: ["有限小数判定", "唯一分解定理"],
      steps: [
        "枚举区间 [L,R] 中的每个 a。",
        "不断除去 a 中所有因子 2 和 5。",
        "如果剩余值为 1，说明没有其他质因子，计为终止数。"
      ],
      chinese_comments: [
        "中文注释：1/a 能化成有限小数，分母只能含质因子 2 和 5。",
        "中文注释：a=1 时也满足剩余值为 1。"
      ],
      example_hint: "[2,11] 中 2、4、5、8、10 只含因子 2 或 5，共 5 个。"
    },
    code: `#include <iostream>
using namespace std;

bool isTerminatingDenominator(int x) {
    while (x % 2 == 0) {
        x /= 2;
    }
    while (x % 5 == 0) {
        x /= 5;
    }
    return x == 1;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int l, r;
    cin >> l >> r;

    int answer = 0;
    for (int a = l; a <= r; ++a) {
        // 中文注释：只剩 1 表示 a 的质因子全部来自 2 和 5。
        if (isTerminatingDenominator(a)) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-5:programming:02": {
    algorithm: "先排序数组 A，再枚举数组 B，用二分查找判断每个数是否在 A 中出现。",
    complexity: "时间复杂度 O(n log n + m log n)，空间复杂度 O(n)。",
    understanding: {
      summary: "两个数组内部元素互不相同，先让数组 A 有序，再用二分查找统计交集大小。",
      algorithm_domains: ["二分", "排序/模拟"],
      problem_types: ["排序后二分查找型"],
      knowledge_points: ["二分查找", "数组交集"],
      steps: [
        "读入 n、m 和数组 A、B。",
        "把数组 A 排序，使其满足二分查找的单调性要求。",
        "枚举数组 B，若元素能在 A 中二分找到，则答案加 1。"
      ],
      chinese_comments: [
        "中文注释：题目保证单个数组内元素互不相同，所以命中一次就计数一次。",
        "中文注释：n、m 可到 10^5，需要用排序后二分避免双重循环。"
      ],
      example_hint: "A={4,2,3}，B={3,1,5,4,6}，交集是 3 和 4。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;

    vector<long long> a(n);
    for (int i = 0; i < n; ++i) {
        cin >> a[i];
    }
    sort(a.begin(), a.end());

    int answer = 0;
    for (int i = 0; i < m; ++i) {
        long long x;
        cin >> x;
        // 中文注释：A 已经有序，可以用二分查找判断 x 是否出现。
        if (binary_search(a.begin(), a.end(), x)) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-6:programming:01": {
    algorithm: "从后向前做一维 DP：dp[i] 表示只考虑 i..n 时能取得的最大和。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    understanding: {
      summary: "每个下标只有选或不选两种决策，选 i 后下一次至少跳到 max(i+1,i+b_i)。",
      algorithm_domains: ["动态规划"],
      problem_types: ["一维线性 DP 型"],
      knowledge_points: ["状态转移", "跳跃约束"],
      steps: [
        "定义 dp[i] 为从 i 到 n 的最优选择和。",
        "不选 i 时得到 dp[i+1]。",
        "选 i 时得到 a[i] 加上 next 位置之后的最优值，再取较大者。"
      ],
      chinese_comments: [
        "中文注释：倒序计算可以保证转移用到的后续状态已经求出。",
        "中文注释：b_i 为 0 或 1 时，下一次仍至少要到 i+1。"
      ],
      example_hint: "样例 1 中选择下标 3 和 4，可得到 3+4=7。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<long long> a(n + 2);
    vector<int> b(n + 2);
    for (int i = 1; i <= n; ++i) {
        cin >> a[i];
    }
    for (int i = 1; i <= n; ++i) {
        cin >> b[i];
    }

    vector<long long> dp(n + 3, 0);
    for (int i = n; i >= 1; --i) {
        int nextIndex = max(i + 1, i + b[i]);
        long long choose = a[i] + (nextIndex <= n ? dp[nextIndex] : 0);
        long long skip = dp[i + 1];
        // 中文注释：当前位置可以选择，也可以跳过，取收益更大的方案。
        dp[i] = max(skip, choose);
    }

    cout << dp[1] << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-6:programming:02": {
    algorithm: "后序遍历每棵子树，维护高度、是否满二叉树、是否完全二叉树三个信息。",
    complexity: "时间复杂度 O(n)，空间复杂度 O(n)。",
    understanding: {
      summary: "完全二叉树可由左右子树的高度、满二叉树状态和完全二叉树状态组合判定。",
      algorithm_domains: ["树"],
      problem_types: ["二叉树性质判定型"],
      knowledge_points: ["完全二叉树", "后序 DP", "满二叉树"],
      steps: [
        "先用栈得到从根出发的遍历序，再反向处理形成后序。",
        "空子树视为高度 0、同时满足满和完全。",
        "根据左右子树高度关系判断当前子树是否完全，并累计答案。"
      ],
      chinese_comments: [
        "中文注释：子树性质依赖左右孩子，所以要后序处理。",
        "中文注释：完全二叉树有两种组合情况：左满右完全同高，或左完全右满且左高一层。"
      ],
      example_hint: "只有左叶子、没有右孩子的两层子树是完全二叉树；只有右孩子则不是。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n;
    cin >> n;
    vector<int> leftChild(n + 1), rightChild(n + 1);
    for (int i = 1; i <= n; ++i) {
        cin >> leftChild[i] >> rightChild[i];
    }

    vector<int> order;
    vector<int> stack = {1};
    while (!stack.empty()) {
        int u = stack.back();
        stack.pop_back();
        order.push_back(u);
        if (leftChild[u]) stack.push_back(leftChild[u]);
        if (rightChild[u]) stack.push_back(rightChild[u]);
    }

    vector<int> height(n + 1, 0);
    vector<char> perfect(n + 1, 0), complete(n + 1, 0);
    long long answer = 0;

    reverse(order.begin(), order.end());
    for (int u : order) {
        int l = leftChild[u];
        int r = rightChild[u];
        int lh = l ? height[l] : 0;
        int rh = r ? height[r] : 0;
        bool lp = l ? perfect[l] : true;
        bool rp = r ? perfect[r] : true;
        bool lc = l ? complete[l] : true;
        bool rc = r ? complete[r] : true;

        height[u] = max(lh, rh) + 1;
        perfect[u] = lp && rp && (lh == rh);
        // 中文注释：完全二叉树的最后一层必须从左到右填充。
        complete[u] = (lp && rc && lh == rh) || (lc && rp && lh == rh + 1);

        if (complete[u]) {
            ++answer;
        }
    }

    cout << answer << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-7:programming:01": {
    algorithm: "整数拆分最大乘积尽量拆成 3；若余数为 1，则把一个 3 和 1 改成 2 和 2。",
    complexity: "每组数据时间复杂度 O(log n)，空间复杂度 O(1)。",
    understanding: {
      summary: "最大乘积拆分的最优因子主要由 3 组成，余数为 1 时改用 4。",
      algorithm_domains: ["数论", "贪心"],
      problem_types: ["整数拆分最优乘积型"],
      knowledge_points: ["快速幂", "模运算", "整数拆分"],
      steps: [
        "n 不超过 4 时，不拆或少拆的最大乘积就是 n。",
        "n 较大时尽量取若干个 3。",
        "若 n 除以 3 余 1，则减少一个 3，改为乘 4。"
      ],
      chinese_comments: [
        "中文注释：3 的乘积效率最高，但余数 1 要与一个 3 合成 4。",
        "中文注释：模数 10^9 只用于输出取模，不影响最大乘积的拆分结构。"
      ],
      example_hint: "100=3*32+4，所以答案为 3^32*4 mod 10^9。"
    },
    code: `#include <iostream>
using namespace std;

const long long MOD = 1000000000LL;

long long modPow(long long base, long long exp) {
    long long result = 1 % MOD;
    base %= MOD;
    while (exp > 0) {
        if (exp & 1LL) {
            result = result * base % MOD;
        }
        base = base * base % MOD;
        exp >>= 1LL;
    }
    return result;
}

long long solve(long long n) {
    if (n <= 4) {
        return n % MOD;
    }
    long long count3 = n / 3;
    long long rem = n % 3;
    if (rem == 0) {
        return modPow(3, count3);
    }
    if (rem == 1) {
        // 中文注释：3+1 的乘积为 3，不如改成 2+2 的乘积 4。
        return modPow(3, count3 - 1) * 4 % MOD;
    }
    return modPow(3, count3) * 2 % MOD;
}

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int t;
    cin >> t;
    while (t--) {
        long long n;
        cin >> n;
        cout << solve(n) << '\\n';
    }
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-7:programming:02": {
    algorithm: "枚举路径最大景观评分 B，用两层状态 Dijkstra 表示是否已经免除一条评分等于 B 的边。",
    complexity: "设不同景观评分数为 U，时间复杂度 O(U(m+n)log n)，空间复杂度 O(n+m)。",
    understanding: {
      summary: "固定最高景观评分后，路径只能使用评分不超过它的边，并且恰好免除一条评分等于它的边。",
      algorithm_domains: ["图论"],
      problem_types: ["分层最短路型"],
      knowledge_points: ["Dijkstra", "状态分层", "枚举阈值"],
      steps: [
        "收集所有可能成为路径最高景观评分的 b 值。",
        "对每个 B，只允许使用 b<=B 的边。",
        "Dijkstra 状态分为未免除和已免除；遇到 b==B 的边可从未免除转到已免除且费用为 0。"
      ],
      chinese_comments: [
        "中文注释：优惠只能免除路径上最高景观评分的其中一条边。",
        "中文注释：枚举最高评分后，就能用分层最短路表达是否已经使用优惠。"
      ],
      example_hint: "样例中直接走 1->3 时最高景观评分为 1，该边费用 100 被免除，总费用为 0。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <queue>
#include <tuple>
#include <vector>
using namespace std;

struct Edge {
    int to;
    long long w;
    long long b;
};

const long long INF = (1LL << 62);

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<Edge>> graph(n + 1);
    vector<long long> scenic;
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long w, b;
        cin >> u >> v >> w >> b;
        graph[u].push_back({v, w, b});
        graph[v].push_back({u, w, b});
        scenic.push_back(b);
    }

    if (n == 1) {
        cout << 0 << '\\n';
        return 0;
    }

    sort(scenic.begin(), scenic.end());
    scenic.erase(unique(scenic.begin(), scenic.end()), scenic.end());

    long long answer = INF;
    for (long long limitB : scenic) {
        vector<vector<long long>> dist(2, vector<long long>(n + 1, INF));
        priority_queue<tuple<long long, int, int>, vector<tuple<long long, int, int>>, greater<tuple<long long, int, int>>> pq;
        dist[0][1] = 0;
        pq.push({0, 1, 0});

        while (!pq.empty()) {
            auto [cost, u, used] = pq.top();
            pq.pop();
            if (cost != dist[used][u]) {
                continue;
            }
            for (const Edge& edge : graph[u]) {
                if (edge.b > limitB) {
                    continue;
                }
                if (dist[used][edge.to] > cost + edge.w) {
                    dist[used][edge.to] = cost + edge.w;
                    pq.push({dist[used][edge.to], edge.to, used});
                }
                // 中文注释：只有评分等于当前最高评分 limitB 的边，才能作为免费边。
                if (used == 0 && edge.b == limitB && dist[1][edge.to] > cost) {
                    dist[1][edge.to] = cost;
                    pq.push({cost, edge.to, 1});
                }
            }
        }

        answer = min(answer, dist[1][n]);
    }

    cout << (answer == INF ? -1 : answer) << '\\n';
    return 0;
}
`
  },
  "canonical:2026-03:c++:level-8:programming:01": {
    algorithm: "把引用操作看成从 r_i 到 i 的正向跳跃；每次询问转化为区间内不重叠跳跃的最大节省。",
    complexity: "设引用消息数为 K，预处理 O(K log K)，每次询问 O(K)，空间复杂度 O(K)。",
    understanding: {
      summary: "普通操作每次只能前进或后退 1 条消息，引用边等价于一段区间跳跃，可用区间 DP 求最大节省。",
      algorithm_domains: ["图论", "动态规划"],
      problem_types: ["稀疏快捷边最短路型"],
      knowledge_points: ["区间 DP", "稀疏边优化", "最短路转化"],
      steps: [
        "原问题从 x 向 y 走，可反向看成从 y 走到 x。",
        "引用 i->r_i 反向后成为 r_i->i 的快捷跳跃，节省 i-r_i-1 步。",
        "对每个询问，在 [y,x] 内选若干互不重叠跳跃，使总节省最大。"
      ],
      chinese_comments: [
        "中文注释：反向后所有操作都向编号更大的方向走，便于区间化。",
        "中文注释：至多 1000 条引用边，所以每个询问扫描这些快捷区间即可。"
      ],
      example_hint: "若存在 2->5 的反向跳跃，原本从 2 走到 5 要 3 步，使用跳跃只要 1 步，节省 2 步。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

struct Jump {
    int start;
    int finish;
    int save;
};

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, q;
    cin >> n >> q;
    vector<Jump> jumps;
    for (int i = 1; i <= n; ++i) {
        int r;
        cin >> r;
        if (r > 0 && i - r - 1 > 0) {
            // 中文注释：原引用 i->r 反向后是 r->i，可节省中间逐条移动的步数。
            jumps.push_back({r, i, i - r - 1});
        }
    }

    sort(jumps.begin(), jumps.end(), [](const Jump& a, const Jump& b) {
        if (a.finish != b.finish) return a.finish < b.finish;
        return a.start < b.start;
    });

    vector<int> finishes;
    for (const Jump& jump : jumps) {
        finishes.push_back(jump.finish);
    }

    vector<int> previous(jumps.size(), 0);
    for (int i = 0; i < static_cast<int>(jumps.size()); ++i) {
        previous[i] = upper_bound(finishes.begin(), finishes.end(), jumps[i].start) - finishes.begin();
    }

    while (q--) {
        int x, y;
        cin >> x >> y;
        vector<int> prefix(jumps.size() + 1, 0);
        for (int i = 0; i < static_cast<int>(jumps.size()); ++i) {
            prefix[i + 1] = prefix[i];
            if (jumps[i].finish <= x && jumps[i].start >= y) {
                int candidate = jumps[i].save + prefix[previous[i]];
                prefix[i + 1] = max(prefix[i + 1], candidate);
            }
        }
        // 中文注释：最少操作数 = 普通逐条移动步数 - 快捷跳跃带来的最大节省。
        cout << (x - y - prefix.back()) << '\\n';
    }

    return 0;
}
`
  },
  "canonical:2026-03:c++:level-8:programming:02": {
    algorithm: "固定左端点并逐步加入右端点，增量维护当前编号区间诱导子图的全源最短路。",
    complexity: "时间复杂度 O(n^4)，n<=100 时可接受；空间复杂度 O(n^2)。",
    understanding: {
      summary: "对每个区间 [l,r] 维护诱导子图最短路，加入新右端点时只需用新点更新相关距离。",
      algorithm_domains: ["图论"],
      problem_types: ["区间全源最短路型"],
      knowledge_points: ["Floyd", "增量最短路", "诱导子图"],
      steps: [
        "用邻接矩阵保存任意两点间最小直接边权。",
        "固定 l，从 l 开始逐个加入 r，得到每个区间的子图。",
        "加入新点 r 后，先求 r 到旧点的最短路，再用 r 尝试更新旧点对之间的距离。"
      ],
      chinese_comments: [
        "中文注释：子图只保留编号在 [l,r] 内的点。",
        "中文注释：每个区间的所有点对最短路都要累加，断开则贡献 0。"
      ],
      example_hint: "链 1-2-3 中，区间 [1,3] 的点对距离为 1、2、3，总贡献 6。"
    },
    code: `#include <algorithm>
#include <iostream>
#include <vector>
using namespace std;

const long long INF = (1LL << 60);
const long long MOD = 1000000000LL;

int main() {
    ios::sync_with_stdio(false);
    cin.tie(nullptr);

    int n, m;
    cin >> n >> m;
    vector<vector<long long>> direct(n + 1, vector<long long>(n + 1, INF));
    for (int i = 1; i <= n; ++i) {
        direct[i][i] = 0;
    }
    for (int i = 0; i < m; ++i) {
        int u, v;
        long long w;
        cin >> u >> v >> w;
        direct[u][v] = min(direct[u][v], w);
        direct[v][u] = min(direct[v][u], w);
    }

    long long answer = 0;
    for (int l = 1; l <= n; ++l) {
        vector<vector<long long>> dist(n + 1, vector<long long>(n + 1, INF));
        for (int r = l; r <= n; ++r) {
            dist[r][r] = 0;

            vector<long long> fromNew(n + 1, INF);
            for (int i = l; i < r; ++i) {
                long long best = direct[r][i];
                for (int j = l; j < r; ++j) {
                    if (direct[r][j] < INF && dist[j][i] < INF) {
                        best = min(best, direct[r][j] + dist[j][i]);
                    }
                }
                fromNew[i] = best;
            }
            for (int i = l; i < r; ++i) {
                dist[r][i] = dist[i][r] = fromNew[i];
            }

            // 中文注释：新加入的 r 可能让旧点对通过 r 得到更短路径。
            for (int i = l; i < r; ++i) {
                for (int j = l; j < r; ++j) {
                    if (dist[i][r] < INF && dist[r][j] < INF) {
                        dist[i][j] = min(dist[i][j], dist[i][r] + dist[r][j]);
                    }
                }
            }

            for (int u = l; u <= r; ++u) {
                for (int v = u + 1; v <= r; ++v) {
                    if (dist[u][v] < INF) {
                        answer = (answer + dist[u][v]) % MOD;
                    }
                }
            }
        }
    }

    cout << answer % MOD << '\\n';
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

async function compileAndRun(canonicalProblemId, code, samples, tempRoot) {
  const sourcePath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, code);
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], { maxBuffer: 4 * 1024 * 1024 });

  const sampleResults = [];
  for (const [index, sample] of samples.entries()) {
    const stdout = await runBinary(binaryPath, `${sample.input}\n`);
    const actual = normalizeOutput(stdout);
    const expected = normalizeOutput(sample.output);
    sampleResults.push({
      index: index + 1,
      expected,
      actual,
      passed: actual === expected
    });
  }
  return sampleResults;
}

function summarizeDetails(details) {
  return {
    ...details.summary,
    programming_pending_solution_count: details.records.filter((record) => record.question_type === "programming" && record.completeness.needs_programming_solution).length,
    official_programming_ai_sample_verified_solution_count: details.records.filter((record) => record.question_type === "programming" && record.programming_solution.content_origin === "ai_generated_sample_verified").length
  };
}

function summarizeGuidance(guidance) {
  return {
    ...guidance.summary,
    record_count: guidance.records.length,
    confirmed_answer_count: guidance.records.filter((record) => record.reference_answer.status === "confirmed").length,
    reference_link_answer_count: guidance.records.filter((record) => record.reference_answer.status === "reference_link").length,
    needs_review_answer_count: guidance.records.filter((record) => record.reference_answer.status === "needs_review").length,
    ai_sample_verified_programming_answer_count: guidance.records.filter((record) => record.reference_answer.source === "ai_generated_sample_verified").length
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
      ai_generation_notice: "该 C++ 参考解由 AI 根据公开 OJ 题面和样例生成，并已通过当前采集样例；仍需人工复核或 OJ 评测确认，请注意甄别。",
      reference_answer: "AI 生成 C++ 参考解已通过当前公开样例，仍需复核。",
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

function appendUnique(items, value) {
  return items.includes(value) ? items : [...items, value];
}

function updateGuidance(guidance, pack, verification) {
  return {
    ...guidance,
    reference_answer: {
      ...guidance.reference_answer,
      status: "needs_review",
      answer: "AI 生成 C++ 参考解已通过当前公开样例，仍需人工或 OJ 复核。",
      source: "ai_generated_sample_verified",
      evidence: `已通过 ${verification.sample_count} 组公开样例；${pack.algorithm}`,
      confidence: Math.max(guidance.reference_answer.confidence || 0, 0.58),
      review_status: "needs_review"
    },
    understanding_example: {
      ...guidance.understanding_example,
      ...pack.understanding,
      language: "zh-CN"
    },
    review_notes: appendUnique(
      guidance.review_notes || [],
      "已补充 AI 生成 C++ 参考解并通过当前公开样例；仍需人工或 OJ 复核，页面必须展示 AI 生成提示。"
    )
  };
}

async function main() {
  const [details, guidance] = await Promise.all([
    readJson(detailsPath),
    readJson(guidancePath)
  ]);
  const tempRoot = await mkdtemp(join(tmpdir(), "gesp-official-ai-solutions-"));
  const verificationById = new Map();

  try {
    for (const detail of details.records) {
      const pack = solutionPacks[detail.canonical_problem_id];
      if (!pack) {
        continue;
      }
      if (detail.question_type !== "programming") {
        throw new Error(`${detail.canonical_problem_id}: expected programming record`);
      }
      if (detail.sample_cases.status !== "source_extracted" || detail.sample_cases.cases.length === 0) {
        throw new Error(`${detail.canonical_problem_id}: source-extracted sample cases are required before writing AI solution`);
      }
      const sampleResults = await compileAndRun(detail.canonical_problem_id, pack.code, detail.sample_cases.cases, tempRoot);
      const failed = sampleResults.filter((item) => !item.passed);
      if (failed.length > 0) {
        throw new Error(`${detail.canonical_problem_id}: sample verification failed ${JSON.stringify(failed)}`);
      }
      verificationById.set(detail.canonical_problem_id, {
        status: "sample_passed",
        verifier: "scripts/apply-official-ai-reference-solutions.mjs",
        verified_at: new Date().toISOString(),
        sample_count: sampleResults.length,
        sample_results: sampleResults
      });
    }
  } finally {
    await rm(tempRoot, { recursive: true, force: true });
  }

  details.records = details.records.map((detail) => {
    const pack = solutionPacks[detail.canonical_problem_id];
    const verification = verificationById.get(detail.canonical_problem_id);
    return pack && verification ? updateDetail(detail, pack, verification) : detail;
  });

  guidance.records = guidance.records.map((record) => {
    const pack = solutionPacks[record.canonical_problem_id];
    const verification = verificationById.get(record.canonical_problem_id);
    return pack && verification ? updateGuidance(record, pack, verification) : record;
  });

  const generatedAt = new Date().toISOString();
  details.generated_at = generatedAt;
  details.official_ai_reference_solutions = {
    applied_at: generatedAt,
    applied_count: verificationById.size,
    content_origin: "ai_generated_sample_verified",
    review_status: "needs_review",
    verification: "compiled with g++ -std=c++17 and passed current source-extracted samples",
    notice_policy: "AI-generated answers must be visibly marked and manually reviewed before promotion"
  };
  details.summary = summarizeDetails(details);

  guidance.generated_at = generatedAt;
  guidance.official_ai_reference_solutions = {
    applied_at: generatedAt,
    applied_count: verificationById.size,
    content_origin: "ai_generated_sample_verified",
    review_status: "needs_review"
  };
  guidance.summary = summarizeGuidance(guidance);

  await Promise.all([
    writeFile(detailsPath, `${JSON.stringify(details, null, 2)}\n`),
    writeFile(guidancePath, `${JSON.stringify(guidance, null, 2)}\n`)
  ]);

  console.log(`official AI reference solutions applied: ${verificationById.size}`);
  console.log(`official programming pending solution count: ${details.summary.programming_pending_solution_count}`);
  console.log(`official AI sample verified solution count: ${details.summary.official_programming_ai_sample_verified_solution_count}`);
  console.log(`wrote ${detailsPath}`);
  console.log(`wrote ${guidancePath}`);
}

main().catch((error) => {
  console.error(`Official AI reference solution enrichment failed: ${error.message}`);
  process.exitCode = 1;
});
