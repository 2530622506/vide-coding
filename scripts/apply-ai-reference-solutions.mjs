import { mkdtemp, readFile, rm, writeFile } from "node:fs/promises";
import { execFile, spawn } from "node:child_process";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

const solutionPacks = {
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

async function compileAndRun(canonicalProblemId, code, samples, tempRoot) {
  const sourcePath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.cpp`);
  const binaryPath = join(tempRoot, `${canonicalProblemId.replace(/[^a-z0-9]+/gi, "_")}.out`);
  await writeFile(sourcePath, code);
  await execFileAsync("g++", ["-std=c++17", "-O2", sourcePath, "-o", binaryPath], { maxBuffer: 4 * 1024 * 1024 });

  const results = [];
  for (const [index, sample] of samples.entries()) {
    const stdout = await runBinary(binaryPath, `${sample.input}\n`);
    const actual = normalizeOutput(stdout);
    const expected = normalizeOutput(sample.output);
    results.push({
      index: index + 1,
      expected,
      actual,
      passed: actual === expected
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
