import { readFile, writeFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

const overrides = {
  "supplemental:luogu:b4006": {
    domains: [["sort_simulation", "排序/模拟"], ["greedy", "贪心"]],
    types: [["sliding_window_max_sum", "滑动窗口最大和型"]],
    knowledge: [["sorting", "排序"], ["two_pointer", "双指针"], ["window_sum", "窗口和维护"]],
    focus: "排序后维护最大最小差不超过 k 的连续价值窗口"
  },
  "supplemental:luogu:b4069": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["string_order_concatenation", "字符串有序拼接判定型"]],
    knowledge: [["string_monotonicity", "字符串单调性"], ["custom_sort", "自定义排序"], ["boundary_check", "拼接边界检查"]],
    focus: "检查每个字符串内部和排序后拼接边界是否非降序"
  },
  "supplemental:xinchuan:gesp202309": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["deadline_profit_scheduling", "截止时间收益调度型"]],
    knowledge: [["deadline_scheduling", "截止时间调度"], ["latest_slot_assignment", "最晚空位安排"], ["greedy_reward_order", "按收益贪心排序"]],
    focus: "每个游戏占一段时间，在截止时间前安排高奖励游戏"
  },
  "supplemental:xinchuan:gesp202312": {
    domains: [["bit_operation", "位运算"], ["greedy", "贪心"]],
    types: [["maximum_pairwise_bitwise_and", "最大二元按位与型"]],
    knowledge: [["bitwise_and", "按位与"], ["greedy_bitmask", "位掩码贪心"], ["candidate_counting", "候选掩码计数"]],
    focus: "从高位到低位判断是否至少有两个数包含候选掩码"
  },
  "supplemental:xinchuan:gesp202406": {
    domains: [["number_theory", "数论"], ["basic_programming", "基础程序设计"]],
    types: [["distinct_prime_factor_counting", "不同质因数计数型"]],
    knowledge: [["prime_factorization", "质因数分解"], ["sieve_precomputation", "筛法预处理"], ["factor_count", "质因数个数统计"]],
    focus: "判断每个数是否恰好有两个不同质因数"
  },
  "supplemental:aijieoj:6028": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["two_party_assignment_greedy", "双人分配差值贪心型"]],
    knowledge: [["difference_sorting", "差值排序"], ["top_k_selection", "Top-K 选择"], ["assignment_optimization", "分配优化"]],
    focus: "以 C 全买为基准，选择 n 个最大 b_i-c_i 差值给 B"
  },
  "supplemental:luogu:p11377": {
    domains: [["dynamic_programming", "动态规划"], ["knapsack", "背包"]],
    types: [["zero_one_knapsack_min_cost", "0/1 背包最小费用型"]],
    knowledge: [["zero_one_knapsack", "0/1 背包"], ["state_compression", "状态压缩"], ["budget_feasibility", "预算可行性"]],
    focus: "在强度达标条件下求不超过预算的最小购买费用"
  },
  "supplemental:luogu:p11378": {
    domains: [["tree", "树"], ["dynamic_programming", "动态规划"]],
    types: [["tree_weight_directed_reachability_dp", "树上权值有向可达 DP 型"]],
    knowledge: [["tree_dp", "树形 DP"], ["topological_by_weight", "按权值拓扑处理"], ["directed_reachability", "有向可达性"]],
    focus: "按权值从小到大累加低权值连通燃烧规模"
  },
  "supplemental:luogu:p11964": {
    domains: [["graph", "图论"], ["bitset", "位集"]],
    types: [["fixed_step_reachability_counting", "固定步数可达计数型"]],
    knowledge: [["bitset_optimization", "bitset 优化"], ["walk_reachability", "游走可达"], ["adjacency_union", "邻接集合并集"]],
    focus: "用 bitset 逐步合并邻接集合统计恰好 k 步可达点数"
  },
  "supplemental:luogu:p11965": {
    domains: [["string", "字符串"], ["bit_operation", "位运算"]],
    types: [["parity_mask_substring_counting", "奇偶掩码子串计数型"]],
    knowledge: [["character_parity_mask", "字符奇偶掩码"], ["prefix_state_counting", "前缀状态计数"], ["equivalent_elimination", "等价消除判定"]],
    focus: "统计字符出现次数全为偶数的子串数量"
  },
  "supplemental:luogu:p13017": {
    domains: [["graph", "图论"], ["math", "数学"]],
    types: [["line_graph_edge_counting", "线图边数计数型"]],
    knowledge: [["degree_counting", "度数统计"], ["combination_counting", "组合计数"], ["line_graph", "线图"]],
    focus: "按原图每个点的度数累加 C(deg,2)"
  },
  "supplemental:luogu:b4452": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["multi_key_sorting_greedy", "多关键字排序贪心型"]],
    knowledge: [["multi_key_sorting", "多关键字排序"], ["greedy_purchase", "贪心购买"], ["lexicographical_order", "字典序"]],
    focus: "按优先级、价格和名称排序后的预算内购买"
  },
  "supplemental:luogu:p10379": {
    domains: [["graph", "图论"], ["grid", "网格"]],
    types: [["connected_component_shape_hashing", "连通块形状哈希型"]],
    knowledge: [["flood_fill", "洪泛搜索"], ["shape_normalization", "形状归一化"], ["translation_equivalence", "平移等价"]],
    focus: "同色四连通块按相对坐标归一化后统计不同形状"
  },
  "supplemental:luogu:p10723": {
    domains: [["tree", "树"], ["greedy", "贪心"]],
    types: [["steiner_tree_on_tree", "树上最小连通子树型"]],
    knowledge: [["tree_subtree_count", "子树计数"], ["minimal_subtree", "最小连通子树"], ["black_node_connectivity", "黑点连通性"]],
    focus: "把所有初始黑点连接成树所需补染的白点数量"
  },
  "supplemental:luogu:p10724": {
    domains: [["number_theory", "数论"], ["prefix_sum", "前缀和"]],
    types: [["parity_mask_prefix_counting", "奇偶掩码前缀计数型"]],
    knowledge: [["prime_factor_parity", "质因数指数奇偶性"], ["xor_prefix", "异或前缀"], ["perfect_square_judgment", "完全平方数判定"]],
    focus: "用质因数奇偶掩码统计乘积为完全平方数的区间"
  },
  "supplemental:luogu:p11248": {
    domains: [["dynamic_programming", "动态规划"], ["grid", "网格"]],
    types: [["grid_path_resource_dp", "网格路径资源 DP 型"]],
    knowledge: [["grid_path_dp", "网格路径 DP"], ["resource_limited_transition", "资源限制转移"], ["rolling_array", "滚动数组"]],
    focus: "向右向下路径上最多转换 x 个问号以最大化得分"
  },
  "supplemental:luogu:p11249": {
    domains: [["tree", "树"], ["graph", "图论"]],
    types: [["tree_marked_nodes_path_check", "树上标记点成路径判定型"]],
    knowledge: [["minimal_subtree", "最小连通子树"], ["path_degree_check", "路径度数判定"], ["tree_traversal", "树遍历"]],
    focus: "判断所有宝物点的最小连通子树是否是一条简单路径"
  },
  "supplemental:luogu:p10110": {
    domains: [["graph", "图论"], ["greedy", "贪心"]],
    types: [["shortest_edge_count_with_potential", "势能转化最短边数型"]],
    knowledge: [["breadth_first_search", "广度优先搜索"], ["potential_function", "势能函数"], ["directed_graph_reachability", "有向图可达性"]],
    focus: "交易价值差望远镜相消后求最少交换次数"
  },
  "supplemental:luogu:p10111": {
    domains: [["dynamic_programming", "动态规划"], ["game", "博弈/游戏"]],
    types: [["change_count_state_dp", "换牌次数状态 DP 型"]],
    knowledge: [["state_definition", "状态定义"], ["transition_penalty", "转移代价"], ["rolling_dp", "滚动 DP"]],
    focus: "按轮次、换牌次数和当前牌计算最大得分"
  },
  "supplemental:luogu:p10265": {
    domains: [["graph", "图论"], ["matrix", "矩阵"]],
    types: [["adjacency_matrix_row_column_count", "邻接矩阵行列统计型"]],
    knowledge: [["adjacency_matrix", "邻接矩阵"], ["in_degree_out_degree", "入度/出度统计"], ["matrix_scan", "矩阵扫描"]],
    focus: "统计指定节点邻接矩阵行列中的可达数量"
  },
  "supplemental:luogu:p10287": {
    domains: [["dynamic_programming", "动态规划"], ["graph", "图论"]],
    types: [["dag_lnds_state_dp", "DAG 最长不下降子序列状态 DP 型"]],
    knowledge: [["topological_order", "拓扑序"], ["longest_non_decreasing_subsequence", "最长不下降子序列"], ["small_value_state_dp", "小值域状态 DP"]],
    focus: "在 DAG 路径上用 1..10 值域状态维护最大 LNDS"
  },
  "supplemental:luogu:p10378": {
    domains: [["graph", "图论"], ["sort_simulation", "排序/模拟"]],
    types: [["bipartite_component_size_range", "二分图连通块规模范围型"]],
    knowledge: [["bipartite_coloring", "二分染色"], ["connected_component", "连通块"], ["min_max_component_choice", "连通块取向最值"]],
    focus: "每个二分图连通块任选颜色作为 B 校并累加上下界"
  },
  "supplemental:luogu:p11963": {
    domains: [["dynamic_programming", "动态规划"], ["prefix_sum", "前缀和"]],
    types: [["circular_max_subarray", "环形最大子段和型"]],
    knowledge: [["kadane_algorithm", "最大子段和"], ["circular_array", "环形数组"], ["minimum_subarray", "最小子段和"]],
    focus: "在环线上选择非空连续车站段获得最大快乐值"
  },
  "supplemental:luogu:p13015": {
    domains: [["dynamic_programming", "动态规划"], ["basic_programming", "基础程序设计"]],
    types: [["integer_partition_group_dp", "整数分组 DP 型"]],
    knowledge: [["complete_knapsack_style_dp", "完全背包式 DP"], ["group_partition", "分组划分"], ["max_value_dp", "最大价值 DP"]],
    focus: "把 n 名同学划分为若干组以最大化积极度总和"
  },
  "supplemental:luogu:p13016": {
    domains: [["number_theory", "数论"], ["tree", "树"]],
    types: [["factor_tree_distance", "因数树距离型"]],
    knowledge: [["smallest_prime_factor", "最小质因数"], ["ancestor_chain", "祖先链"], ["lowest_common_ancestor", "最近公共祖先"]],
    focus: "最大真因数父节点树中两点距离计算"
  },
  "supplemental:luogu:p14075": {
    domains: [["dynamic_programming", "动态规划"], ["string", "字符串"]],
    types: [["unique_character_partition_dp", "无重复字符分段 DP 型"]],
    knowledge: [["string_partition", "字符串划分"], ["unique_character_window", "无重复字符窗口"], ["max_score_dp", "最大得分 DP"]],
    focus: "把字符串划分为无重复字符子串并最大化价值"
  },
  "supplemental:luogu:p14076": {
    domains: [["tree", "树"], ["greedy", "贪心"]],
    types: [["tree_route_covering", "树遍历路线覆盖型"]],
    knowledge: [["tree_edge_traversal", "树边遍历"], ["root_to_farthest_distance", "根到最远点距离"], ["route_optimization", "路线优化"]],
    focus: "首都出发访问所有城市且不必返回的最短树上路线"
  },
  "supplemental:luogu:p14919": {
    domains: [["tree", "树"], ["dynamic_programming", "动态规划"]],
    types: [["root_leaf_path_cover_dp", "根叶路径覆盖 DP 型"]],
    knowledge: [["tree_dp", "树形 DP"], ["path_cover", "路径覆盖"], ["min_cost_selection", "最小代价选择"]],
    focus: "选择黑点覆盖所有叶子到根路径的最小代价"
  },
  "supplemental:luogu:p14920": {
    domains: [["dynamic_programming", "动态规划"], ["knapsack", "背包"]],
    types: [["zero_one_knapsack_by_value", "按价值维度 0/1 背包型"]],
    knowledge: [["zero_one_knapsack", "0/1 背包"], ["value_dimension_dp", "价值维度 DP"], ["min_cost_for_value", "价值最小费用"]],
    focus: "金币上限很大时按总攻击力做 0/1 背包"
  },
  "supplemental:luogu:p11246": {
    domains: [["dynamic_programming", "动态规划"], ["math", "数学"]],
    types: [["perfect_square_min_count_dp", "完全平方数最少拆分 DP 型"]],
    knowledge: [["complete_square", "完全平方数"], ["min_count_dp", "最少数量 DP"], ["unbounded_knapsack", "完全背包"]],
    focus: "把整数拆成完全平方数之和的最少项数"
  },
  "supplemental:luogu:p11247": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["learning_plan_arrangement_feasibility", "学习计划排布可行性型"]],
    knowledge: [["greedy_selection", "贪心选择"], ["no_adjacent_same", "相邻不同限制"], ["binary_feasibility", "二分可行性"]],
    focus: "各知识点达标题数选择后判断能否排成相邻不同序列"
  },
  "supplemental:luogu:p11375": {
    domains: [["tree", "树"], ["sort_simulation", "排序/模拟"]],
    types: [["infinite_binary_tree_walk", "无限二叉树游走模拟型"]],
    knowledge: [["binary_tree_indexing", "二叉树编号"], ["parent_child_transition", "父子节点转移"], ["string_simulation", "字符串模拟"]],
    focus: "按 U/L/R 操作模拟完全二叉树节点编号变化"
  },
  "supplemental:luogu:p11376": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["capacity_assignment_greedy", "容量分配贪心型"]],
    knowledge: [["rearrangement_inequality", "排序配对优化"], ["capacity_allocation", "容量分配"], ["linear_cost_transform", "线性费用转化"]],
    focus: "把车辆线性费用系数与运输站位置按符号贪心匹配"
  },
  "supplemental:luogu:p11962": {
    domains: [["tree", "树"], ["graph", "图论"]],
    types: [["bipartite_tree_parity_count", "树二分染色奇偶计数型"]],
    knowledge: [["bipartite_coloring", "二分染色"], ["parity_distance", "路径长度奇偶性"], ["breadth_first_search", "广度优先搜索"]],
    focus: "树上偶数步可达点等于同色点数量"
  },
  "supplemental:luogu:p10262": {
    domains: [["number_theory", "数论"], ["string", "字符串"]],
    types: [["substring_mod_counting", "子串取模计数型"]],
    knowledge: [["modulo_remainder", "模运算余数"], ["substring_counting", "子串计数"], ["remainder_state_transition", "余数状态转移"]],
    focus: "统计所有十进制连续子串中能被 p 整除的数量"
  },
  "supplemental:luogu:p10376": {
    domains: [["dynamic_programming", "动态规划"], ["basic_programming", "基础程序设计"]],
    types: [["operation_sequence_counting_dp", "操作序列计数 DP 型"]],
    knowledge: [["linear_dp", "线性 DP"], ["recurrence_counting", "递推计数"], ["modulo_answer", "答案取模"]],
    focus: "递推统计减 a 或减 b 直到不超过 c 的操作序列数"
  },
  "supplemental:luogu:p10377": {
    domains: [["sort_simulation", "排序/模拟"], ["brute_force", "枚举搜索"]],
    types: [["permutation_constraint_optimization", "排列约束优化型"]],
    knowledge: [["permutation_enumeration", "排列枚举"], ["distance_constraint", "距离约束"], ["minimum_interval_length", "最短区间长度"]],
    focus: "枚举牛的摆放顺序并计算满足攻击范围约束的最短牛棚段"
  },
  "supplemental:luogu:p10721": {
    domains: [["dynamic_programming", "动态规划"], ["string", "字符串"]],
    types: [["string_segmentation_dp", "字符串分段 DP 型"]],
    knowledge: [["pattern_matching", "模式匹配"], ["segment_dp", "分段 DP"], ["max_score_dp", "最大得分 DP"]],
    focus: "把连续 abc 重复块切分为计分子串的最大总分"
  },
  "supplemental:luogu:p10722": {
    domains: [["tree", "树"], ["prefix_sum", "前缀和"]],
    types: [["subtree_flip_difference", "子树翻转差分型"]],
    knowledge: [["dfs_order", "DFS 序"], ["difference_array", "差分数组"], ["subtree_interval", "子树区间"]],
    focus: "用 DFS 序把子树颜色反转转成区间异或差分"
  },
  "supplemental:luogu:b3873": {
    domains: [["dynamic_programming", "动态规划"], ["knapsack", "背包"]],
    types: [["zero_one_knapsack_min_cost", "0/1 背包最小费用型"]],
    knowledge: [["zero_one_knapsack", "0/1 背包"], ["capacity_capping", "容量上限压缩"], ["min_cost_dp", "最小费用 DP"]],
    focus: "容量压缩到目标体积后的 0/1 背包最小花费"
  },
  "supplemental:luogu:b3874": {
    domains: [["data_structure", "数据结构"], ["sort_simulation", "排序/模拟"]],
    types: [["fenwick_pair_counting", "树状数组计数型"]],
    knowledge: [["fenwick_tree", "树状数组"], ["prefix_counting", "前缀计数"], ["order_pair_counting", "顺序对计数"]],
    focus: "按进场顺序统计前面学号更小的握手数量"
  },
  "supplemental:luogu:p10108": {
    domains: [["dynamic_programming", "动态规划"], ["graph", "图论"]],
    types: [["dag_path_dp", "DAG 路径动态规划型"]],
    knowledge: [["state_transition", "状态转移"], ["max_score_dp", "最大得分 DP"], ["directed_acyclic_graph", "有向无环图"]],
    focus: "关卡只向后跳转的最大得分路径 DP"
  },
  "supplemental:luogu:p10109": {
    domains: [["tree", "树"], ["sort_simulation", "排序/模拟"]],
    types: [["ancestor_intersection_query", "祖先交集查询型"]],
    knowledge: [["tree_ancestor", "树上祖先"], ["common_manager", "公共管理者"], ["ancestor_counting", "祖先计数"]],
    focus: "员工管理树中所有参与者公共管理者的最大编号"
  },
  "supplemental:luogu:p10250": {
    domains: [["dynamic_programming", "动态规划"], ["basic_programming", "基础程序设计"]],
    types: [["linear_recurrence_dp", "线性递推 DP 型"]],
    knowledge: [["tribonacci_recurrence", "三项递推"], ["state_definition", "状态定义"], ["linear_dp", "线性 DP"]],
    focus: "一次走 1/2/3 阶的下楼梯方案数递推"
  },
  "supplemental:luogu:b4360": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["matrix_crop_programming", "矩阵裁剪型"]],
    knowledge: [["substring_extraction", "子串截取"], ["index_conversion", "下标转换"], ["matrix_grid_traversal", "矩阵/网格处理"]],
    focus: "按行列边界裁剪字符矩阵"
  },
  "supplemental:luogu:b4361": {
    domains: [["sort_simulation", "排序/模拟"], ["divide_and_conquer", "分治"]],
    types: [["inversion_count_programming", "逆序对计数型"]],
    knowledge: [["stable_sorting", "稳定排序"], ["inversion_count", "逆序对计数"], ["merge_sort", "归并排序"]],
    focus: "目标排序位置序列的逆序对数"
  },
  "supplemental:luogu:b4415": {
    domains: [["prefix_sum", "前缀和"], ["grid", "网格"]],
    types: [["max_all_one_rectangle", "最大全 1 矩形型"]],
    knowledge: [["two_dimensional_prefix_sum", "二维前缀和"], ["rectangle_enumeration", "子矩形枚举"], ["area_check", "面积校验"]],
    focus: "枚举全为 1 的最大矩形区域"
  },
  "supplemental:luogu:b4416": {
    domains: [["sort_simulation", "排序/模拟"], ["set_hash", "集合/哈希"]],
    types: [["longest_consecutive_sequence", "最长连续整数段型"]],
    knowledge: [["deduplication", "去重处理"], ["sorting", "排序"], ["consecutive_segment", "连续段统计"]],
    focus: "去重排序后统计最长连续值段"
  },
  "supplemental:luogu:b4451": {
    domains: [["sort_simulation", "排序/模拟"], ["grid", "网格"]],
    types: [["fixed_window_matrix_enumeration", "固定窗口矩阵枚举型"]],
    knowledge: [["sliding_window_fixed_size", "固定大小窗口"], ["max_min_selection", "最大最小值选择"], ["matrix_grid_traversal", "矩阵/网格处理"]],
    focus: "枚举 3x3 区域并检查高度差"
  },
  "supplemental:luogu:b4041": {
    domains: [["sort_simulation", "排序/模拟"]],
    types: [["interval_sort_simulation", "区间排序模拟型"]],
    knowledge: [["range_operation", "区间操作"], ["sorting", "排序"], ["sequential_simulation", "顺序模拟"]],
    focus: "多次区间升序排序模拟"
  },
  "supplemental:luogu:b4068": {
    domains: [["sort_simulation", "排序/模拟"], ["set_hash", "集合/哈希"]],
    types: [["sequence_generation_sorting", "数列生成排序型"]],
    knowledge: [["set_membership", "集合判重"], ["sequence_simulation", "数列模拟"], ["sorting", "排序"]],
    focus: "Recamán 数列生成、判重和排序输出"
  },
  "supplemental:luogu:b4263": {
    domains: [["sort_simulation", "排序/模拟"], ["grid", "网格"]],
    types: [["grid_delta_optimization", "网格增量优化型"]],
    knowledge: [["neighbor_counting", "邻格计数"], ["delta_update", "增量计算"], ["grid_traversal", "网格遍历"]],
    focus: "清除一个杂物后的可开垦格子增量统计"
  },
  "supplemental:luogu:b4264": {
    domains: [["sort_simulation", "排序/模拟"], ["math", "数学"]],
    types: [["two_by_two_matrix_counting", "二阶矩阵计数型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["cross_product_equality", "交叉乘积相等"], ["nested_loop_enumeration", "多重循环枚举"]],
    focus: "枚举 2x2 子矩阵并判断交叉乘积"
  },
  "supplemental:luogu:b3998": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["keyboard_editing_simulation", "键盘编辑模拟型"]],
    knowledge: [["string_simulation", "字符串模拟"], ["stack_like_operation", "栈式末尾操作"], ["boundary_case", "边界情况"]],
    focus: "按键序列和退格操作模拟"
  },
  "supplemental:luogu:b3999": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["constructive_greedy_programming", "构造贪心型"]],
    knowledge: [["sorting", "排序"], ["prefix_feasibility", "前缀可行性"], ["permutation_construction", "排列构造"]],
    focus: "产量和订单排序构造交付方案"
  },
  "supplemental:luogu:b4005": {
    domains: [["prefix_sum", "前缀和"], ["sort_simulation", "排序/模拟"]],
    types: [["matrix_prefix_sum_enumeration", "矩阵前缀和枚举型"]],
    knowledge: [["two_dimensional_prefix_sum", "二维前缀和"], ["rectangle_enumeration", "子矩形枚举"], ["balance_transform", "黑白平衡转化"]],
    focus: "黑白格转正负值后的平衡子矩形枚举"
  },
  "supplemental:luogu:b4040": {
    domains: [["sort_simulation", "排序/模拟"], ["basic_programming", "基础程序设计"]],
    types: [["fixed_pattern_matching", "固定图案匹配型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["pattern_matching", "模式匹配"], ["nested_loop_enumeration", "多重循环枚举"]],
    focus: "固定 4x4 黑白方块模式匹配"
  },
  "supplemental:luogu:b3928": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["ordered_set_matching_programming", "有序集合匹配型"]],
    knowledge: [["greedy_choice", "局部最优选择"], ["ordered_set", "有序集合"], ["upper_bound", "二分查找 / upper_bound"]],
    focus: "按对手顺序用最小可胜马匹贪心匹配"
  },
  "supplemental:luogu:b3939": {
    domains: [["number_theory", "数论"], ["basic_programming", "基础程序设计"]],
    types: [["prime_enumeration_programming", "素数枚举型"]],
    knowledge: [["prime_check", "素数判断"], ["digit_reverse", "数位反转"], ["range_enumeration", "区间枚举"]],
    focus: "两位数及其反转数的素数判定"
  },
  "supplemental:luogu:b3940": {
    domains: [["sort_simulation", "排序/模拟"], ["basic_programming", "基础程序设计"]],
    types: [["matrix_simulation_programming", "矩阵模拟型"]],
    knowledge: [["matrix_grid_traversal", "矩阵/网格处理"], ["modulo_wraparound", "取模循环移动"], ["state_simulation", "状态模拟"]],
    focus: "奇阶幻方移动规则模拟"
  },
  "supplemental:luogu:b3958": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["one_edit_distance_judgment", "一次编辑距离判定型"]],
    knowledge: [["two_pointer", "双指针"], ["string_comparison", "字符串比较"], ["case_analysis", "分类讨论"]],
    focus: "删除、插入或修改一个字符的相似判定"
  },
  "supplemental:luogu:b3959": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["greedy_sequence_matching", "贪心序列匹配型"]],
    knowledge: [["sorting", "排序"], ["greedy_choice", "局部最优选择"], ["monotonic_requirement", "单调需求匹配"]],
    focus: "升序题单匹配递增做题天数"
  },
  "supplemental:luogu:b3850": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["digit_transform_validation", "数位变换判定型"]],
    knowledge: [["digit_position", "数位位置"], ["digit_sum", "数位和"], ["modulo_check", "取模判定"]],
    focus: "奇偶数位变换和 8 的倍数判定"
  },
  "supplemental:luogu:b3851": {
    domains: [["sort_simulation", "排序/模拟"], ["basic_programming", "基础程序设计"]],
    types: [["frequency_palette_compression", "频次排序压缩型"]],
    knowledge: [["frequency_count", "频次统计"], ["tie_break_sorting", "排序平局规则"], ["nearest_mapping", "最近值映射"], ["hex_parsing", "十六进制解析"]],
    focus: "灰阶频次排序和最近调色板映射"
  },
  "supplemental:luogu:b3869": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["base_conversion_programming", "进制转换型"]],
    knowledge: [["base_digit_mapping", "进制数码映射"], ["positional_notation", "位权展开"], ["loop_accumulation", "循环累积"]],
    focus: "K 进制转十进制"
  },
  "supplemental:luogu:b3870": {
    domains: [["bit_operation", "位运算"], ["basic_programming", "基础程序设计"]],
    types: [["variable_length_encoding", "变长编码型"]],
    knowledge: [["bit_grouping", "二进制分组"], ["bitwise_mask", "位掩码"], ["hex_formatting", "十六进制格式化输出"]],
    focus: "每 7 位分组的变长整数编码"
  },
  "supplemental:luogu:b3927": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["dictionary_replacement_programming", "字典替换型"]],
    knowledge: [["hash_map_lookup", "哈希表查找"], ["token_scanning", "词元扫描"], ["delimiter_preservation", "分隔符保留"]],
    focus: "按标点分词并使用字典替换"
  },
  "supplemental:luogu:b3996": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["digit_transform_simulation", "数字变换模拟型"]],
    knowledge: [["digit_extraction", "数位提取"], ["state_cycle_detection", "状态循环检测"], ["bounded_simulation", "有界模拟"]],
    focus: "数字末位变换和状态模拟"
  },
  "supplemental:luogu:b3997": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["string_segment_palindrome_programming", "字符串分段回文统计型"]],
    knowledge: [["segment_length_growth", "递增长度分段"], ["palindrome_check", "回文判断"], ["two_pointer", "双指针"]],
    focus: "递增长度分段和回文计数"
  },
  "supplemental:luogu:b4003": {
    domains: [["basic_programming", "基础程序设计"], ["string", "字符串"]],
    types: [["alphabet_shift_programming", "字母移位型"]],
    knowledge: [["modulo_operation", "取模运算"], ["character_cycle", "字符循环"], ["formatted_output", "格式输出"]],
    focus: "大写字母循环移位"
  },
  "supplemental:luogu:b4004": {
    domains: [["basic_programming", "基础程序设计"], ["number_theory", "数论"]],
    types: [["multiple_existence_judgment", "倍数存在判定型"]],
    knowledge: [["max_value_selection", "最大值选择"], ["divisibility_check", "整除判定"], ["batch_processing", "多组数据处理"]],
    focus: "最大值倍数判定"
  },
  "supplemental:luogu:b4038": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["prefix_sum_balance_programming", "前缀和分割判定型"]],
    knowledge: [["prefix_sum", "前缀和"], ["total_sum", "总和维护"], ["split_point", "切分点枚举"]],
    focus: "前缀和与后缀和相等判定"
  },
  "supplemental:luogu:b4039": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["palindrome_split_programming", "回文分割型"]],
    knowledge: [["palindrome_check", "回文判断"], ["split_enumeration", "切分枚举"], ["two_pointer", "双指针"]],
    focus: "两个回文串拼接判定"
  },
  "supplemental:luogu:b4067": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["pattern_output_programming", "字符图案输出型"]],
    knowledge: [["pattern_table", "图案表"], ["matrix_grid_traversal", "矩阵/网格处理"], ["string_concatenation", "字符串拼接"]],
    focus: "数字字符图案拼接输出"
  },
  "supplemental:luogu:b4261": {
    domains: [["basic_programming", "基础程序设计"], ["bit_operation", "位运算"]],
    types: [["bitwise_equation_programming", "位运算方程型"]],
    knowledge: [["bitwise_identity", "位运算恒等式"], ["algebra_transform", "代数变形"], ["boundary_case", "边界情况"]],
    focus: "按位与或恒等式变形"
  },
  "supplemental:luogu:b4262": {
    domains: [["string", "字符串"], ["sort_simulation", "排序/模拟"]],
    types: [["frequency_count_programming", "词频统计型"]],
    knowledge: [["lowercase_conversion", "大小写归一化"], ["hash_map_counting", "哈希计数"], ["max_value_selection", "最大值选择"]],
    focus: "忽略大小写词频统计"
  },
  "supplemental:luogu:b4358": {
    domains: [["basic_programming", "基础程序设计"], ["bit_operation", "位运算"]],
    types: [["bit_count_parity_programming", "二进制计数校验型"]],
    knowledge: [["bit_count", "二进制 1 个数"], ["parity_check", "奇偶校验"], ["loop_accumulation", "循环累积"]],
    focus: "二进制 1 个数奇偶校验"
  },
  "supplemental:luogu:b4359": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["greedy_sequence_construction", "贪心序列构造型"]],
    knowledge: [["monotonic_sequence", "单调序列"], ["greedy_choice", "局部最优选择"], ["loop_accumulation", "循环累积"]],
    focus: "严格递增糖果数贪心构造"
  },
  "supplemental:luogu:b4413": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["array_operation_simulation", "数组操作模拟型"]],
    knowledge: [["max_min_selection", "最大最小值选择"], ["iterative_simulation", "迭代模拟"], ["boundary_case", "边界情况"]],
    focus: "数组最大值减最小非零值模拟"
  },
  "supplemental:luogu:b4414": {
    domains: [["basic_programming", "基础程序设计"], ["sort_simulation", "排序/模拟"]],
    types: [["calendar_formatting_programming", "日历格式化输出型"]],
    knowledge: [["month_days_table", "月份天数表"], ["weekday_offset", "星期偏移"], ["formatted_output", "格式输出"]],
    focus: "2025 年月份日历格式化"
  },
  "supplemental:luogu:b4449": {
    domains: [["basic_programming", "基础程序设计"], ["string", "字符串"]],
    types: [["string_validation_programming", "字符串合法性判断型"]],
    knowledge: [["length_check", "长度判断"], ["character_category", "字符类别判断"], ["condition_combination", "复合条件判断"]],
    focus: "密码强度条件判断"
  },
  "supplemental:luogu:b4450": {
    domains: [["greedy", "贪心"], ["sort_simulation", "排序/模拟"]],
    types: [["category_minimum_selection", "分类最小值选择型"]],
    knowledge: [["min_value_selection", "最小值选择"], ["array_bucket", "数组桶"], ["greedy_choice", "局部最优选择"]],
    focus: "每类文具最低价累加"
  },
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
