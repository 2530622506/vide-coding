import { readFile, writeFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

const overrides = {
  "supplemental:luogu:b3842": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["array_marking_programming", "数组标记型"]],
    knowledge: [["boolean_marking", "布尔标记"], ["deduplication", "去重处理"], ["ordered_output", "有序输出"]],
    focus: "编号报到标记和缺失输出"
  },
  "supplemental:luogu:b3843": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["string_validation_programming", "字符串合法性判断型"]],
    knowledge: [["string_split", "字符串分割"], ["character_category", "字符类别判断"], ["condition_combination", "复合条件判断"]],
    focus: "密码合规性校验"
  },
  "supplemental:luogu:b3848": {
    domains: [["sort_simulation", "排序/模拟"], ["greedy", "贪心"]],
    types: [["greedy_simulation_programming", "贪心模拟型"]],
    knowledge: [["sequential_simulation", "顺序模拟"], ["greedy_choice", "能买则买贪心"]],
    focus: "顺序购物贪心模拟"
  },
  "supplemental:luogu:b3849": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["base_conversion_programming", "进制转换型"]],
    knowledge: [["modulo_operation", "取模运算"], ["reverse_output", "反向输出"], ["digit_mapping", "数码映射"]],
    focus: "十进制转 R 进制"
  },
  "supplemental:luogu:b3867": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["array_accumulation_programming", "数组累加型"]],
    knowledge: [["array_sequence_state", "数组与序列状态维护"], ["loop_accumulation", "循环累积"]],
    focus: "按编号数组累加"
  },
  "supplemental:luogu:b3868": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["base_digit_validation_programming", "进制数码判断型"]],
    knowledge: [["character_category", "字符类别判断"], ["base_digit_range", "进制数码范围"], ["batch_processing", "多组数据处理"]],
    focus: "多进制字符合法性判断"
  },
  "supplemental:luogu:b3925": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["reverse_recurrence_programming", "逆向递推型"]],
    knowledge: [["integer_divisibility", "整除条件"], ["reverse_derivation", "逆向推导"], ["enumeration_counting", "枚举计数"]],
    focus: "小猫分鱼逆向递推"
  },
  "supplemental:luogu:b3926": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["unit_conversion_programming", "单位换算型"]],
    knowledge: [["string_parsing", "字符串解析"], ["mapping_table", "映射表"], ["multiplication_formula", "乘法公式"]],
    focus: "单位倍率映射换算"
  },
  "supplemental:luogu:b3956": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["character_value_accumulation", "字符权值累加型"]],
    knowledge: [["ascii_code", "ASCII 码"], ["character_category", "字符类别判断"], ["loop_accumulation", "循环累积"]],
    focus: "大小写字母权值求和"
  },
  "supplemental:luogu:b3957": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["pair_count_programming", "二元组计数型"]],
    knowledge: [["perfect_square", "完全平方数"], ["nested_loop_enumeration", "多重循环枚举"], ["precomputation_marking", "预处理标记"]],
    focus: "完全平方数配对计数"
  },
  "supplemental:luogu:b4257": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["integer_division_programming", "整数除法型"]],
    knowledge: [["ceil_division", "向上取整"], ["remaining_quantity", "剩余数量计算"]],
    focus: "向上取整和剩余数量计算"
  },
  "supplemental:luogu:b4258": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["rounding_programming", "四舍五入计算型"]],
    knowledge: [["rounding_to_tens", "整十数四舍五入"], ["integer_division_remainder", "整数除法与余数"]],
    focus: "整十数四舍五入"
  },
  "supplemental:luogu:b4354": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["bounded_formula_programming", "有界公式计算型"]],
    knowledge: [["min_value_selection", "最小值选择"], ["multiplication_formula", "乘法公式"]],
    focus: "阅读上限公式计算"
  },
  "supplemental:luogu:b4355": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["gcd_lcm_transform", "gcd/lcm 变形型"]],
    knowledge: [["greatest_common_divisor", "欧几里得算法 / gcd"], ["least_common_multiple", "最小公倍数 / lcm"]],
    focus: "值日周期最小公倍数"
  },
  "supplemental:luogu:b4409": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["discount_comparison_programming", "优惠比较型"]],
    knowledge: [["floating_point_format", "浮点格式化输出"], ["min_value_selection", "最小值选择"], ["conditional_branch", "条件分支"]],
    focus: "满减和折扣比较"
  },
  "supplemental:luogu:b4410": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["formula_derivation_programming", "公式推导型"]],
    knowledge: [["sum_of_squares", "平方和公式"], ["loop_accumulation", "循环累积"]],
    focus: "平方和累计"
  },
  "supplemental:luogu:b4445": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["piecewise_fee_programming", "分段计费型"]],
    knowledge: [["floating_point_format", "浮点格式化输出"], ["min_value_selection", "最小值选择"], ["conditional_branch", "条件分支"]],
    focus: "体积和重量分段计费"
  },
  "supplemental:luogu:b4446": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["range_branch_programming", "区间分支型"]],
    knowledge: [["conditional_branch", "条件分支"], ["batch_processing", "多组数据处理"]],
    focus: "电量区间分支输出"
  },
  "supplemental:luogu:b3865": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["diagonal_condition", "对角线条件"]],
    focus: "X 字矩阵图案输出"
  },
  "supplemental:luogu:b4259": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["matrix_generation_programming", "矩阵构造型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["multiplication_table", "乘法表构造"]],
    focus: "等差矩阵构造"
  },
  "supplemental:luogu:b4260": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["date_time_simulation_programming", "日期时间模拟型"]],
    knowledge: [["leap_year", "闰年判断"], ["month_days_table", "月份天数表"], ["calendar_rollover", "日期进位"]],
    focus: "日期时间进位模拟"
  },
  "supplemental:luogu:b4356": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["parity_count_programming", "奇偶计数型"]],
    knowledge: [["parity_product", "乘积奇偶性"], ["unordered_pair_counting", "无序对计数"]],
    focus: "面积整数条件计数"
  },
  "supplemental:luogu:b4357": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["power_sum_check_programming", "幂和判定型"]],
    knowledge: [["powers_of_two", "2 的幂"], ["precomputation_marking", "预处理标记"]],
    focus: "2 的幂和区间计数"
  },
  "supplemental:luogu:b4411": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["repdigit_count_programming", "重复数位计数型"]],
    knowledge: [["digit_uniformity", "数位一致性"], ["enumeration_counting", "枚举计数"]],
    focus: "重复数位整数计数"
  },
  "supplemental:luogu:b4412": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["diamond_manhattan_distance", "菱形曼哈顿距离"]],
    focus: "菱形字符图案输出"
  },
  "supplemental:luogu:b4447": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["integer_division_programming", "整数除法型"]],
    knowledge: [["integer_division_remainder", "整数除法与余数"], ["batch_processing", "多组数据处理"]],
    focus: "整数除法奖励计数"
  },
  "supplemental:luogu:b4448": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["coordinate_inequality_counting", "坐标不等式计数型"]],
    knowledge: [["grid_enumeration", "网格枚举"], ["squared_distance", "平方距离比较"], ["inequality_transform", "不等式变形"]],
    focus: "坐标不等式网格计数"
  },
  "supplemental:luogu:b3954": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["bounded_product_programming", "有界乘积型"]],
    knowledge: [["overflow_guard", "上限保护"], ["loop_accumulation", "循环累积"]],
    focus: "有界乘积和上限判断"
  },
  "supplemental:luogu:b3955": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["conditional_branch", "条件分支"]],
    focus: "日字矩阵图案输出"
  },
  "supplemental:luogu:b3994": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["formula_derivation_programming", "公式推导型"]],
    knowledge: [["arithmetic_series", "等差数列求和"], ["sum_of_squares", "平方和公式"]],
    focus: "周长面积公式推导"
  },
  "supplemental:luogu:b3995": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["conditional_branch", "条件分支"]],
    focus: "田字矩阵图案输出"
  },
  "supplemental:luogu:b4002": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["equation_enumeration_programming", "方程枚举型"]],
    knowledge: [["sum_of_two_squares", "两平方和判定"], ["loop_enumeration", "循环枚举"]],
    focus: "两平方和枚举判定"
  },
  "supplemental:luogu:b4007": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["digit_processing_programming", "数位处理型"]],
    knowledge: [["digit_decomposition", "数位拆分"], ["interval_enumeration", "区间枚举"]],
    focus: "数位拆分和数字计数"
  },
  "supplemental:luogu:b4036": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["digit_processing_programming", "数位处理型"]],
    knowledge: [["digit_decomposition", "数位拆分"], ["modulo_operation", "取模运算"]],
    focus: "数位和与倍数判断"
  },
  "supplemental:luogu:b4037": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["diagonal_condition", "对角线条件"]],
    focus: "N 字矩阵图案输出"
  },
  "supplemental:luogu:b4064": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["power_number_check_programming", "幂数判定型"]],
    knowledge: [["fourth_power", "四次方数"], ["precomputation_lookup", "预处理查表"]],
    focus: "四次方数判定"
  },
  "supplemental:luogu:b4065": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["digit_processing_programming", "数位处理型"]],
    knowledge: [["digit_decomposition", "数位拆分"], ["max_value_scan", "最大值扫描"]],
    focus: "数位和最大值统计"
  },
  "supplemental:luogu:b3836": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["equation_enumeration_programming", "方程枚举型"]],
    knowledge: [["integer_equation_feasibility", "整数可行性判断"], ["nested_loop_enumeration", "多重循环枚举"]],
    focus: "鸡兔同笼式方程枚举"
  },
  "supplemental:luogu:b3837": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["nested_loop_enumeration", "多重循环枚举"], ["character_cycle", "字符循环"]],
    focus: "三角形字符图案输出"
  },
  "supplemental:luogu:b3840": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["prime_check_programming", "素数判定型"]],
    knowledge: [["prime_check", "质数判定"], ["interval_enumeration", "区间枚举"]],
    focus: "区间素数计数"
  },
  "supplemental:luogu:b3841": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["digit_processing_programming", "数位处理型"]],
    knowledge: [["digit_decomposition", "数位拆分"], ["integer_power", "整数幂计算"]],
    focus: "数位拆分和自幂数判定"
  },
  "supplemental:luogu:b3844": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["character_cycle", "字符循环"]],
    focus: "正方形字符图案输出"
  },
  "supplemental:luogu:b3845": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["equation_enumeration_programming", "方程枚举型"]],
    knowledge: [["pythagorean_triple", "勾股数"], ["nested_loop_enumeration", "多重循环枚举"]],
    focus: "勾股数枚举"
  },
  "supplemental:luogu:b3866": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["digit_simulation_programming", "数位模拟型"]],
    knowledge: [["digit_sorting", "数位排序"], ["iterative_simulation", "迭代模拟"]],
    focus: "数字黑洞迭代模拟"
  },
  "supplemental:luogu:b3923": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["recurrence_simulation_programming", "递推模拟型"]],
    knowledge: [["fibonacci_recurrence", "斐波那契式递推"], ["loop_accumulation", "循环累加"]],
    focus: "递推模拟和停止条件"
  },
  "supplemental:luogu:b3924": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["conditional_branch", "条件分支"]],
    focus: "H 字矩阵图案输出"
  },
  "supplemental:luogu:b3834": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["divisor_enumeration_programming", "因数枚举型"]],
    knowledge: [["integer_factor", "整数因子与整除"], ["sqrt_enumeration", "平方根范围枚举"]],
    focus: "因数枚举和长宽配对"
  },
  "supplemental:luogu:b3835": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["date_condition_programming", "日期条件判断型"]],
    knowledge: [["leap_year_rule", "闰年判断规则"], ["month_days_table", "月份天数表"]],
    focus: "闰年规则和月份天数判断"
  },
  "supplemental:luogu:b3838": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["time_conversion_programming", "时间换算型"]],
    knowledge: [["time_unit_conversion", "时分秒单位换算"], ["arithmetic_expression", "算术表达式"]],
    focus: "时间换算"
  },
  "supplemental:luogu:b3839": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["loop_accumulation_programming", "循环累加型"]],
    knowledge: [["prefix_sum", "前缀统计"], ["arithmetic_series", "等差数列求和"]],
    focus: "循环累加和前缀和"
  },
  "supplemental:luogu:b3846": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["loop_condition_programming", "循环条件判断型"]],
    knowledge: [["leap_year_rule", "闰年判断规则"], ["loop_accumulation", "循环累加"]],
    focus: "闰年判断和区间累加"
  },
  "supplemental:luogu:b3847": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["time_conversion_programming", "时间换算型"]],
    knowledge: [["time_unit_conversion", "时分秒单位换算"], ["conditional_branch", "条件分支"]],
    focus: "十二小时制到秒数换算"
  },
  "supplemental:luogu:b3863": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["arithmetic_condition_programming", "算术条件判断型"]],
    knowledge: [["arithmetic_expression", "算术表达式"], ["conditional_branch", "条件分支"]],
    focus: "总价计算和条件判断"
  },
  "supplemental:luogu:b3864": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["divisibility_filter_programming", "整除筛选型"]],
    knowledge: [["modulo_operation", "取模运算"], ["interval_enumeration", "区间枚举"]],
    focus: "取模判断和区间枚举"
  },
  "supplemental:luogu:b3921": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["modular_cycle_programming", "周期取模型"]],
    knowledge: [["modulo_operation", "取模运算"], ["cycle_simulation", "周期循环"]],
    focus: "星期周期和取模"
  },
  "supplemental:luogu:b3922": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["loop_filter_programming", "循环筛选输出型"]],
    knowledge: [["modulo_operation", "取模运算"], ["loop_output", "循环输出"]],
    focus: "循环报数和倍数筛选"
  },
  "supplemental:luogu:b3952": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["integer_division_programming", "整数除法型"]],
    knowledge: [["integer_division_remainder", "整除与余数"], ["arithmetic_expression", "算术表达式"]],
    focus: "整数除法和余数"
  },
  "supplemental:luogu:b3953": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["divisor_enumeration_programming", "因数枚举型"]],
    knowledge: [["integer_factor", "整数因子与整除"], ["loop_enumeration", "循环枚举"]],
    focus: "因数枚举"
  },
  "supplemental:luogu:b3992": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["divisibility_filter_programming", "整除筛选型"]],
    knowledge: [["modulo_operation", "取模运算"], ["loop_count_sum", "循环计数与求和"]],
    focus: "取模筛选和累加计数"
  },
  "supplemental:luogu:b3993": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["date_condition_programming", "日期条件判断型"]],
    knowledge: [["month_days_table", "月份天数表"], ["boundary_case", "边界情况处理"]],
    focus: "日期进位和边界判断"
  },
  "supplemental:luogu:b4000": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["time_conversion_programming", "时间换算型"]],
    knowledge: [["time_unit_conversion", "时分秒单位换算"], ["modulo_operation", "取模运算"]],
    focus: "时分秒换算和进位"
  },
  "supplemental:luogu:b4001": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["power_number_check_programming", "幂数判定型"]],
    knowledge: [["cube_number", "立方数"], ["loop_enumeration", "循环枚举"]],
    focus: "立方数枚举判定"
  },
  "supplemental:luogu:b4034": {
    domains: [["basic_programming", "基础程序设计"]],
    types: [["integer_division_programming", "整数除法型"]],
    knowledge: [["integer_division_remainder", "整除与余数"], ["arithmetic_expression", "算术表达式"]],
    focus: "成组购买和整数除法"
  },
  "supplemental:luogu:b4035": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["divisibility_count_programming", "整除计数型"]],
    knowledge: [["modulo_operation", "取模运算"], ["loop_count_sum", "循环计数与求和"]],
    focus: "倍数判断和计数"
  },
  "supplemental:luogu:b4062": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["formula_conversion_programming", "公式换算型"]],
    knowledge: [["floating_point_format", "浮点数格式化"], ["conditional_branch", "条件分支"]],
    focus: "温度公式换算和格式化输出"
  },
  "supplemental:luogu:b4063": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["parity_count_programming", "奇偶计数型"]],
    knowledge: [["modulo_operation", "取模运算"], ["loop_count_sum", "循环计数与求和"]],
    focus: "奇偶判断和计数"
  },
  "supplemental:luogu:b3941": {
    domains: [["number_theory", "数论"]],
    types: [["gcd_lcm_transform", "gcd/lcm 变形型"]],
    knowledge: [["least_common_multiple", "最小公倍数 / lcm"]],
    focus: "最小公倍数"
  },
  "supplemental:luogu:b3951": {
    domains: [["sort_simulation", "排序/模拟"]],
    types: [["sequence_simulation_programming", "序列/数组模拟型"]],
    knowledge: [["array_sequence_state", "数组与序列状态维护"], ["ordered_counting", "有序计数"]],
    focus: "队列顺序和有序计数"
  },
  "supplemental:luogu:b3871": {
    domains: [["number_theory", "数论"]],
    types: [["prime_factorization", "质因数分解型"]],
    knowledge: [["integer_factor", "整数因子与整除"], ["prime_factor_exponent", "质因数指数统计"]],
    focus: "质因数分解"
  },
  "supplemental:luogu:b3872": {
    domains: [["greedy", "贪心"]],
    types: [["greedy_choice_programming", "贪心选择型"]],
    knowledge: [["deadline_greedy", "截止时间贪心"], ["greedy_ordering", "贪心排序与选择"]],
    focus: "按奖励排序的截止时间贪心"
  },
  "supplemental:luogu:b3929": {
    domains: [["number_theory", "数论"], ["sort_simulation", "排序/模拟"]],
    types: [["number_theory_programming", "数论程序设计型"]],
    knowledge: [["perfect_square_multiples", "完全平方数倍数"], ["array_sequence_state", "数组与序列状态维护"]],
    focus: "完全平方数倍数预处理"
  },
  "supplemental:luogu:b3930": {
    domains: [["greedy", "贪心"], ["bit_operation", "位运算"]],
    types: [["bitwise_greedy_programming", "位运算贪心型"]],
    knowledge: [["bitmask_greedy", "二进制掩码贪心"], ["brute_force_enumeration", "枚举与条件判断"]],
    focus: "按位贪心构造 mask"
  },
  "supplemental:luogu:b3968": {
    domains: [["sort_simulation", "排序/模拟"]],
    types: [["sorting_ranking_programming", "排序排名型"]],
    knowledge: [["ranking_sort_keys", "多关键字排序"], ["array_sequence_state", "数组与序列状态维护"]],
    focus: "多关键字排序和排名"
  },
  "supplemental:luogu:b3969": {
    domains: [["number_theory", "数论"]],
    types: [["sieve_number_theory_programming", "筛法数论程序设计型"]],
    knowledge: [["sieve_prime_factor", "筛法求质因子"], ["integer_factor", "整数因子与整除"]],
    focus: "筛法统计最大质因子"
  },
  "supplemental:luogu:p10719": {
    domains: [["sort_simulation", "排序/模拟"]],
    types: [["grid_sliding_window_programming", "矩阵滑动窗口型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["sliding_window", "滑动窗口"]],
    focus: "矩阵压缩和滑动窗口"
  },
  "supplemental:luogu:p10720": {
    domains: [["number_theory", "数论"]],
    types: [["sieve_number_theory_programming", "筛法数论程序设计型"]],
    knowledge: [["integer_factor", "整数因子与整除"], ["sieve_prime_factor", "筛法求质因子"]],
    focus: "不同质因子个数预处理"
  },
  "supplemental:luogu:b4050": {
    domains: [["number_theory", "数论"], ["greedy", "贪心"]],
    types: [["number_theory_programming", "数论程序设计型"]],
    knowledge: [["prime_check", "质数判定"], ["brute_force_enumeration", "枚举与条件判断"]],
    focus: "枚举攻击次数和质数判定"
  },
  "supplemental:luogu:b4051": {
    domains: [["greedy", "贪心"]],
    types: [["greedy_choice_programming", "贪心选择型"]],
    knowledge: [["greedy_ordering", "贪心排序与选择"], ["array_sequence_state", "数组与序列状态维护"]],
    focus: "收益分配贪心"
  },
  "supplemental:luogu:b4070": {
    domains: [["number_theory", "数论"]],
    types: [["prime_factorization", "质因数分解型"]],
    knowledge: [["integer_factor", "整数因子与整除"], ["prime_factor_exponent", "质因数指数统计"]],
    focus: "质因数指数拆分"
  },
  "supplemental:luogu:b4071": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["greedy_choice_programming", "贪心选择型"]],
    knowledge: [["brute_force_enumeration", "枚举与条件判断"], ["array_sequence_state", "数组与序列状态维护"]],
    focus: "枚举目标值并贪心补足"
  },
  "supplemental:luogu:p11960": {
    domains: [["greedy", "贪心"]],
    types: [["greedy_choice_programming", "贪心选择型"]],
    knowledge: [["greedy_ordering", "贪心排序与选择"], ["profit_difference", "差值排序"]],
    focus: "差值排序贪心"
  },
  "supplemental:luogu:p11961": {
    domains: [["number_theory", "数论"]],
    types: [["advanced_number_theory_programming", "进阶数论程序设计型"]],
    knowledge: [["primitive_root", "原根判定"], ["integer_factor", "整数因子与整除"]],
    focus: "原根判定",
    syllabusFit: "out_of_level",
    reviewReason: "source_statement_declares_possible_out_of_gesp_scope"
  },
  "supplemental:luogu:p13013": {
    domains: [["binary_search", "二分"], ["greedy", "贪心"]],
    types: [["binary_answer_programming", "二分答案程序设计型"]],
    knowledge: [["binary_answer_feasibility", "二分答案可行性判断"], ["integer_equation_feasibility", "整数可行性判断"]],
    focus: "二分答案和可行性判断"
  },
  "supplemental:luogu:p13014": {
    domains: [["number_theory", "数论"]],
    types: [["gcd_lcm_transform", "gcd/lcm 变形型"]],
    knowledge: [["euclidean_gcd", "欧几里得算法 / gcd"], ["difference_gcd", "差分 gcd"]],
    focus: "差分 gcd"
  },
  "supplemental:luogu:p14073": {
    domains: [["number_theory", "数论"]],
    types: [["number_theory_programming", "数论程序设计型"]],
    knowledge: [["prime_counting", "质数计数"], ["pairwise_coprime", "两两互质"]],
    focus: "质数计数和互质构造"
  },
  "supplemental:luogu:p14074": {
    domains: [["bit_operation", "位运算"], ["number_theory", "数论"]],
    types: [["bitwise_counting_programming", "二进制计数型"]],
    knowledge: [["bit_count_prefix_sum", "二进制 1 个数前缀统计"], ["prefix_sum", "前缀统计"]],
    focus: "二进制计数前缀统计"
  },
  "supplemental:luogu:p14917": {
    domains: [["binary_search", "二分"], ["sort_simulation", "排序/模拟"]],
    types: [["binary_answer_programming", "二分答案程序设计型"], ["sequence_simulation_programming", "序列/数组模拟型"]],
    knowledge: [["binary_answer_feasibility", "二分答案可行性判断"], ["array_sequence_state", "数组与序列状态维护"]],
    focus: "二分答案和序列相对顺序"
  },
  "supplemental:luogu:p14918": {
    domains: [["number_theory", "数论"], ["sort_simulation", "排序/模拟"]],
    types: [["prime_factorization", "质因数分解型"], ["sequence_transformation_programming", "序列变换型"]],
    knowledge: [["prime_factor_exponent", "质因数指数统计"], ["median_minimization", "中位数最小化绝对距离"]],
    focus: "质因数指数向量和中位数最小化"
  }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, "utf8"));
}

function tag({ kind, id, label, record, detail, confidence, syllabusFit, reviewReason }) {
  const sourceUrl = detail?.statement?.source_url || record.source_signals?.source_url || record.source_links?.[0]?.source_url;
  const algorithm = detail?.programming_solution?.algorithm || record.title;
  const reasons = ["supplemental_public_source_needs_review"];
  if (reviewReason) {
    reasons.push(reviewReason);
  }

  return {
    kind,
    value: id,
    label,
    source: "source_extracted_statement_ai_solution_review",
    evidence: {
      source: "source_extracted_statement_ai_solution_review",
      source_id: "public_oj_enrichment+ai_sample_verified_solution",
      source_url: sourceUrl,
      evidence: algorithm
    },
    confidence,
    syllabus_fit: syllabusFit || "community_inferred",
    review_status: "needs_review",
    raw_confidence: confidence,
    final_confidence: Math.max(0.1, confidence - 0.06),
    confidence_breakdown: [
      {
        factor: "source_extracted_statement",
        delta: 0.38,
        description: "classification refined after public OJ statement extraction"
      },
      {
        factor: "sample_verified_ai_solution",
        delta: Math.max(0, confidence - 0.38),
        description: "AI-generated C++ reference solution passed current public samples"
      },
      {
        factor: "manual_review_required",
        delta: -0.06,
        description: "supplemental source and AI solution still require review before promotion"
      }
    ],
    conflict_reasons: [],
    effective_review_status: "needs_review",
    review_reason: reasons
  };
}

function buildTags(kind, entries, record, detail, override) {
  const confidence = kind === "algorithm_domain" ? 0.68 : kind === "problem_type" ? 0.64 : 0.62;
  return entries.map(([id, label]) => tag({
    kind,
    id,
    label,
    record,
    detail,
    confidence,
    syllabusFit: override.syllabusFit,
    reviewReason: override.reviewReason
  }));
}

function updateUnderstandingExample(guidance, record, detail, override) {
  if (!guidance?.understanding_example) {
    return guidance;
  }
  const domainLabels = override.domains.map(([, label]) => label);
  const typeLabels = override.types.map(([, label]) => label);
  const knowledgeLabels = override.knowledge.map(([, label]) => label);
  const algorithm = detail?.programming_solution?.algorithm || override.focus;

  return {
    ...guidance,
    understanding_example: {
      ...guidance.understanding_example,
      summary: `这是一道来自公开题源的 ${override.focus} 练习题。当前分类已结合公开题面和样例通过的 C++ 参考解修正，仍需人工复核。`,
      algorithm_domains: domainLabels,
      problem_types: typeLabels,
      knowledge_points: knowledgeLabels,
      steps: [
        "先核对公开题面的输入输出、限制和样例，确认分类证据来自 C++ 题面。",
        `围绕${override.focus}提取核心状态、判定条件或排序规则。`,
        `参考当前样例通过解法：${algorithm}`,
        "继续用边界样例或公开 OJ 评测复核后，才能提升答案可信状态。"
      ],
      chinese_comments: [
        "中文注释：分类依据来自公开题面和样例通过的 AI C++ 参考解。",
        "中文注释：该内容仍是 AI 辅助学习材料，不能替代官方题解。"
      ],
      example_hint: "详情页样例已可用于手算理解；新增样例或 OJ 评测结果应继续回写。"
    },
    review_notes: [
      ...(guidance.review_notes || []),
      `分类已按公开题面和样例通过解法修正为：${domainLabels.join("、")} / ${typeLabels.join("、")}。`
    ]
  };
}

function updateDetail(detail, override) {
  if (!detail) {
    return detail;
  }
  return {
    ...detail,
    classification_preview: {
      algorithm_domains: override.domains.map(([, label]) => label),
      problem_types: override.types.map(([, label]) => label),
      knowledge_points: override.knowledge.map(([, label]) => label)
    },
    classification_refinement: {
      status: "needs_review",
      source: "source_extracted_statement_ai_solution_review",
      focus: override.focus,
      ai_solution_verification: detail.programming_solution?.verification?.status || "not_verified",
      notes: [
        "分类修正基于公开题面和样例通过的 AI C++ 参考解。",
        "补充题仍需要人工复核，不能覆盖官方来源优先规则。"
      ]
    }
  };
}

function updateRecord(record, detail, override) {
  const outOfLevelRefs = [...(record.out_of_level_signal_refs || [])];
  if (override.reviewReason && !outOfLevelRefs.some((item) => item.reason === override.reviewReason)) {
    outOfLevelRefs.push({
      reason: override.reviewReason,
      evidence: detail?.statement?.sections?.find((section) => section.id === "background")?.markdown || detail?.programming_solution?.algorithm || record.title,
      source_url: detail?.statement?.source_url || null,
      review_status: "needs_review"
    });
  }

  return {
    ...record,
    source_signals: {
      ...record.source_signals,
      solution_text: true,
      classification_refined_from_source_extracted_statement: true,
      ai_sample_verified_solution: detail?.programming_solution?.verification?.status === "sample_passed"
    },
    out_of_level_signal_refs: outOfLevelRefs,
    resolved_algorithm_domains: buildTags("algorithm_domain", override.domains, record, detail, override),
    resolved_problem_type_tags: buildTags("problem_type", override.types, record, detail, override),
    resolved_knowledge_point_tags: buildTags("knowledge_point", override.knowledge, record, detail, override)
  };
}

function summarize(data) {
  return {
    ...data.summary,
    classification_refined_count: data.records.filter((record) => record.source_signals?.classification_refined_from_source_extracted_statement).length
  };
}

async function main() {
  const data = await readJson(supplementalPath);
  const detailById = new Map(data.problem_details.map((detail) => [detail.canonical_problem_id, detail]));
  const guidanceById = new Map(data.answer_guidance.map((guidance) => [guidance.canonical_problem_id, guidance]));
  let applied = 0;

  data.records = data.records.map((record) => {
    const override = overrides[record.canonical_problem_id];
    if (!override) {
      return record;
    }
    const detail = detailById.get(record.canonical_problem_id);
    assert(detail?.statement?.status === "source_extracted", `${record.canonical_problem_id}: source-extracted statement required before classification refinement`);
    assert(detail?.programming_solution?.verification?.status === "sample_passed", `${record.canonical_problem_id}: sample-passed C++ solution required before classification refinement`);
    applied += 1;
    return updateRecord(record, detail, override);
  });

  data.answer_guidance = data.answer_guidance.map((guidance) => {
    const override = overrides[guidance.canonical_problem_id];
    if (!override) {
      return guidance;
    }
    const record = data.records.find((item) => item.canonical_problem_id === guidance.canonical_problem_id);
    const detail = detailById.get(guidance.canonical_problem_id);
    return updateUnderstandingExample(guidance, record, detail, override);
  });

  data.problem_details = data.problem_details.map((detail) => {
    const override = overrides[detail.canonical_problem_id];
    return override ? updateDetail(detail, override) : detail;
  });

  const missing = Object.keys(overrides).filter((id) => !guidanceById.has(id));
  assert(missing.length === 0, `classification refinement override ids missing from supplemental data: ${missing.join(", ")}`);

  data.generated_at = new Date().toISOString();
  data.classification_refinement = {
    applied_at: data.generated_at,
    applied_count: applied,
    source: "source_extracted_statement_ai_solution_review",
    review_status: "needs_review",
    policy: "Refinements may use public OJ statements and sample-verified AI C++ solutions, but never promote supplemental records to official status."
  };
  data.summary = summarize(data);

  await writeFile(supplementalPath, `${JSON.stringify(data, null, 2)}\n`);

  console.log(`supplemental classification refinements applied: ${applied}`);
  console.log(`classification refined count: ${data.summary.classification_refined_count}`);
  console.log(`wrote ${supplementalPath}`);
}

main().catch((error) => {
  console.error(`Supplemental classification refinement failed: ${error.message}`);
  process.exitCode = 1;
});
