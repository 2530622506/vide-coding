import { readFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";
const minimumRefinedCount = 170;

const required = {
  "supplemental:luogu:p11377": {
    includeDomains: ["dynamic_programming", "knapsack"],
    includeTypes: ["zero_one_knapsack_min_cost"],
    includeKnowledge: ["zero_one_knapsack", "state_compression", "budget_feasibility"]
  },
  "supplemental:luogu:p11378": {
    includeDomains: ["tree", "dynamic_programming"],
    includeTypes: ["tree_weight_directed_reachability_dp"],
    includeKnowledge: ["tree_dp", "topological_by_weight", "directed_reachability"]
  },
  "supplemental:luogu:p11964": {
    includeDomains: ["graph", "bitset"],
    includeTypes: ["fixed_step_reachability_counting"],
    includeKnowledge: ["bitset_optimization", "walk_reachability", "adjacency_union"]
  },
  "supplemental:luogu:p11965": {
    includeDomains: ["string", "bit_operation"],
    includeTypes: ["parity_mask_substring_counting"],
    includeKnowledge: ["character_parity_mask", "prefix_state_counting", "equivalent_elimination"]
  },
  "supplemental:luogu:p13017": {
    includeDomains: ["graph", "math"],
    includeTypes: ["line_graph_edge_counting"],
    includeKnowledge: ["degree_counting", "combination_counting", "line_graph"]
  },
  "supplemental:luogu:b4006": {
    includeDomains: ["sort_simulation", "greedy"],
    includeTypes: ["sliding_window_max_sum"],
    includeKnowledge: ["sorting", "two_pointer", "window_sum"]
  },
  "supplemental:luogu:b4069": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["string_order_concatenation"],
    includeKnowledge: ["string_monotonicity", "custom_sort", "boundary_check"]
  },
  "supplemental:xinchuan:gesp202309": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["deadline_profit_scheduling"],
    includeKnowledge: ["deadline_scheduling", "latest_slot_assignment", "greedy_reward_order"]
  },
  "supplemental:xinchuan:gesp202312": {
    includeDomains: ["bit_operation", "greedy"],
    includeTypes: ["maximum_pairwise_bitwise_and"],
    includeKnowledge: ["bitwise_and", "greedy_bitmask", "candidate_counting"]
  },
  "supplemental:xinchuan:gesp202406": {
    includeDomains: ["number_theory", "basic_programming"],
    includeTypes: ["distinct_prime_factor_counting"],
    includeKnowledge: ["prime_factorization", "sieve_precomputation", "factor_count"]
  },
  "supplemental:aijieoj:6028": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["two_party_assignment_greedy"],
    includeKnowledge: ["difference_sorting", "top_k_selection", "assignment_optimization"]
  },
  "supplemental:luogu:b4452": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["multi_key_sorting_greedy"],
    includeKnowledge: ["multi_key_sorting", "greedy_purchase", "lexicographical_order"]
  },
  "supplemental:luogu:p10379": {
    includeDomains: ["graph", "grid"],
    includeTypes: ["connected_component_shape_hashing"],
    includeKnowledge: ["flood_fill", "shape_normalization", "translation_equivalence"]
  },
  "supplemental:luogu:p10723": {
    includeDomains: ["tree", "greedy"],
    includeTypes: ["steiner_tree_on_tree"],
    includeKnowledge: ["tree_subtree_count", "minimal_subtree", "black_node_connectivity"]
  },
  "supplemental:luogu:p10724": {
    includeDomains: ["number_theory", "prefix_sum"],
    includeTypes: ["parity_mask_prefix_counting"],
    includeKnowledge: ["prime_factor_parity", "xor_prefix", "perfect_square_judgment"]
  },
  "supplemental:luogu:p11248": {
    includeDomains: ["dynamic_programming", "grid"],
    includeTypes: ["grid_path_resource_dp"],
    includeKnowledge: ["grid_path_dp", "resource_limited_transition", "rolling_array"]
  },
  "supplemental:luogu:p11249": {
    includeDomains: ["tree", "graph"],
    includeTypes: ["tree_marked_nodes_path_check"],
    includeKnowledge: ["minimal_subtree", "path_degree_check", "tree_traversal"]
  },
  "supplemental:luogu:p10110": {
    includeDomains: ["graph", "greedy"],
    includeTypes: ["shortest_edge_count_with_potential"],
    includeKnowledge: ["breadth_first_search", "potential_function", "directed_graph_reachability"]
  },
  "supplemental:luogu:p10111": {
    includeDomains: ["dynamic_programming", "game"],
    includeTypes: ["change_count_state_dp"],
    includeKnowledge: ["state_definition", "transition_penalty", "rolling_dp"]
  },
  "supplemental:luogu:p10265": {
    includeDomains: ["graph", "matrix"],
    includeTypes: ["adjacency_matrix_row_column_count"],
    includeKnowledge: ["adjacency_matrix", "in_degree_out_degree", "matrix_scan"]
  },
  "supplemental:luogu:p10287": {
    includeDomains: ["dynamic_programming", "graph"],
    includeTypes: ["dag_lnds_state_dp"],
    includeKnowledge: ["topological_order", "longest_non_decreasing_subsequence", "small_value_state_dp"]
  },
  "supplemental:luogu:p10378": {
    includeDomains: ["graph", "sort_simulation"],
    includeTypes: ["bipartite_component_size_range"],
    includeKnowledge: ["bipartite_coloring", "connected_component", "min_max_component_choice"]
  },
  "supplemental:luogu:p11963": {
    includeDomains: ["dynamic_programming", "prefix_sum"],
    includeTypes: ["circular_max_subarray"],
    includeKnowledge: ["kadane_algorithm", "circular_array", "minimum_subarray"]
  },
  "supplemental:luogu:p13015": {
    includeDomains: ["dynamic_programming", "basic_programming"],
    includeTypes: ["integer_partition_group_dp"],
    includeKnowledge: ["complete_knapsack_style_dp", "group_partition", "max_value_dp"]
  },
  "supplemental:luogu:p13016": {
    includeDomains: ["number_theory", "tree"],
    includeTypes: ["factor_tree_distance"],
    includeKnowledge: ["smallest_prime_factor", "ancestor_chain", "lowest_common_ancestor"]
  },
  "supplemental:luogu:p14075": {
    includeDomains: ["dynamic_programming", "string"],
    includeTypes: ["unique_character_partition_dp"],
    includeKnowledge: ["string_partition", "unique_character_window", "max_score_dp"]
  },
  "supplemental:luogu:p14076": {
    includeDomains: ["tree", "greedy"],
    includeTypes: ["tree_route_covering"],
    includeKnowledge: ["tree_edge_traversal", "root_to_farthest_distance", "route_optimization"]
  },
  "supplemental:luogu:p14919": {
    includeDomains: ["tree", "dynamic_programming"],
    includeTypes: ["root_leaf_path_cover_dp"],
    includeKnowledge: ["tree_dp", "path_cover", "min_cost_selection"]
  },
  "supplemental:luogu:p14920": {
    includeDomains: ["dynamic_programming", "knapsack"],
    includeTypes: ["zero_one_knapsack_by_value"],
    includeKnowledge: ["zero_one_knapsack", "value_dimension_dp", "min_cost_for_value"]
  },
  "supplemental:luogu:p11246": {
    includeDomains: ["dynamic_programming", "math"],
    includeTypes: ["perfect_square_min_count_dp"],
    includeKnowledge: ["complete_square", "min_count_dp", "unbounded_knapsack"]
  },
  "supplemental:luogu:p11247": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["learning_plan_arrangement_feasibility"],
    includeKnowledge: ["greedy_selection", "no_adjacent_same", "binary_feasibility"]
  },
  "supplemental:luogu:p11375": {
    includeDomains: ["tree", "sort_simulation"],
    includeTypes: ["infinite_binary_tree_walk"],
    includeKnowledge: ["binary_tree_indexing", "parent_child_transition", "string_simulation"]
  },
  "supplemental:luogu:p11376": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["capacity_assignment_greedy"],
    includeKnowledge: ["rearrangement_inequality", "capacity_allocation", "linear_cost_transform"]
  },
  "supplemental:luogu:p11962": {
    includeDomains: ["tree", "graph"],
    includeTypes: ["bipartite_tree_parity_count"],
    includeKnowledge: ["bipartite_coloring", "parity_distance", "breadth_first_search"]
  },
  "supplemental:luogu:p10262": {
    includeDomains: ["number_theory", "string"],
    includeTypes: ["substring_mod_counting"],
    includeKnowledge: ["modulo_remainder", "substring_counting", "remainder_state_transition"]
  },
  "supplemental:luogu:p10376": {
    includeDomains: ["dynamic_programming", "basic_programming"],
    includeTypes: ["operation_sequence_counting_dp"],
    includeKnowledge: ["linear_dp", "recurrence_counting", "modulo_answer"]
  },
  "supplemental:luogu:p10377": {
    includeDomains: ["sort_simulation", "brute_force"],
    includeTypes: ["permutation_constraint_optimization"],
    includeKnowledge: ["permutation_enumeration", "distance_constraint", "minimum_interval_length"]
  },
  "supplemental:luogu:p10721": {
    includeDomains: ["dynamic_programming", "string"],
    includeTypes: ["string_segmentation_dp"],
    includeKnowledge: ["pattern_matching", "segment_dp", "max_score_dp"]
  },
  "supplemental:luogu:p10722": {
    includeDomains: ["tree", "prefix_sum"],
    includeTypes: ["subtree_flip_difference"],
    includeKnowledge: ["dfs_order", "difference_array", "subtree_interval"]
  },
  "supplemental:luogu:b3873": {
    includeDomains: ["dynamic_programming", "knapsack"],
    includeTypes: ["zero_one_knapsack_min_cost"],
    includeKnowledge: ["zero_one_knapsack", "capacity_capping", "min_cost_dp"]
  },
  "supplemental:luogu:b3874": {
    includeDomains: ["data_structure", "sort_simulation"],
    includeTypes: ["fenwick_pair_counting"],
    includeKnowledge: ["fenwick_tree", "prefix_counting", "order_pair_counting"]
  },
  "supplemental:luogu:p10108": {
    includeDomains: ["dynamic_programming", "graph"],
    includeTypes: ["dag_path_dp"],
    includeKnowledge: ["state_transition", "max_score_dp", "directed_acyclic_graph"]
  },
  "supplemental:luogu:p10109": {
    includeDomains: ["tree", "sort_simulation"],
    includeTypes: ["ancestor_intersection_query"],
    includeKnowledge: ["tree_ancestor", "common_manager", "ancestor_counting"]
  },
  "supplemental:luogu:p10250": {
    includeDomains: ["dynamic_programming", "basic_programming"],
    includeTypes: ["linear_recurrence_dp"],
    includeKnowledge: ["tribonacci_recurrence", "state_definition", "linear_dp"]
  },
  "supplemental:luogu:b4360": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["matrix_crop_programming"],
    includeKnowledge: ["substring_extraction", "index_conversion", "matrix_grid_traversal"]
  },
  "supplemental:luogu:b4361": {
    includeDomains: ["sort_simulation", "divide_and_conquer"],
    includeTypes: ["inversion_count_programming"],
    includeKnowledge: ["stable_sorting", "inversion_count", "merge_sort"]
  },
  "supplemental:luogu:b4415": {
    includeDomains: ["prefix_sum", "grid"],
    includeTypes: ["max_all_one_rectangle"],
    includeKnowledge: ["two_dimensional_prefix_sum", "rectangle_enumeration", "area_check"]
  },
  "supplemental:luogu:b4416": {
    includeDomains: ["sort_simulation", "set_hash"],
    includeTypes: ["longest_consecutive_sequence"],
    includeKnowledge: ["deduplication", "sorting", "consecutive_segment"]
  },
  "supplemental:luogu:b4451": {
    includeDomains: ["sort_simulation", "grid"],
    includeTypes: ["fixed_window_matrix_enumeration"],
    includeKnowledge: ["sliding_window_fixed_size", "max_min_selection", "matrix_grid_traversal"]
  },
  "supplemental:luogu:b4041": {
    includeDomains: ["sort_simulation"],
    includeTypes: ["interval_sort_simulation"],
    includeKnowledge: ["range_operation", "sorting", "sequential_simulation"]
  },
  "supplemental:luogu:b4068": {
    includeDomains: ["sort_simulation", "set_hash"],
    includeTypes: ["sequence_generation_sorting"],
    includeKnowledge: ["set_membership", "sequence_simulation", "sorting"]
  },
  "supplemental:luogu:b4263": {
    includeDomains: ["sort_simulation", "grid"],
    includeTypes: ["grid_delta_optimization"],
    includeKnowledge: ["neighbor_counting", "delta_update", "grid_traversal"]
  },
  "supplemental:luogu:b4264": {
    includeDomains: ["sort_simulation", "math"],
    includeTypes: ["two_by_two_matrix_counting"],
    includeKnowledge: ["matrix_grid_traversal", "cross_product_equality", "nested_loop_enumeration"]
  },
  "supplemental:luogu:b3998": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["keyboard_editing_simulation"],
    includeKnowledge: ["string_simulation", "stack_like_operation", "boundary_case"]
  },
  "supplemental:luogu:b3999": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["constructive_greedy_programming"],
    includeKnowledge: ["sorting", "prefix_feasibility", "permutation_construction"]
  },
  "supplemental:luogu:b4005": {
    includeDomains: ["prefix_sum", "sort_simulation"],
    includeTypes: ["matrix_prefix_sum_enumeration"],
    includeKnowledge: ["two_dimensional_prefix_sum", "rectangle_enumeration", "balance_transform"]
  },
  "supplemental:luogu:b4040": {
    includeDomains: ["sort_simulation", "basic_programming"],
    includeTypes: ["fixed_pattern_matching"],
    includeKnowledge: ["matrix_grid_traversal", "pattern_matching", "nested_loop_enumeration"]
  },
  "supplemental:luogu:b3928": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["ordered_set_matching_programming"],
    includeKnowledge: ["greedy_choice", "ordered_set", "upper_bound"]
  },
  "supplemental:luogu:b3939": {
    includeDomains: ["number_theory", "basic_programming"],
    includeTypes: ["prime_enumeration_programming"],
    includeKnowledge: ["prime_check", "digit_reverse", "range_enumeration"]
  },
  "supplemental:luogu:b3940": {
    includeDomains: ["sort_simulation", "basic_programming"],
    includeTypes: ["matrix_simulation_programming"],
    includeKnowledge: ["matrix_grid_traversal", "modulo_wraparound", "state_simulation"]
  },
  "supplemental:luogu:b3958": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["one_edit_distance_judgment"],
    includeKnowledge: ["two_pointer", "string_comparison", "case_analysis"]
  },
  "supplemental:luogu:b3959": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["greedy_sequence_matching"],
    includeKnowledge: ["sorting", "greedy_choice", "monotonic_requirement"]
  },
  "supplemental:luogu:b3850": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["digit_transform_validation"],
    includeKnowledge: ["digit_position", "digit_sum", "modulo_check"]
  },
  "supplemental:luogu:b3851": {
    includeDomains: ["sort_simulation", "basic_programming"],
    includeTypes: ["frequency_palette_compression"],
    includeKnowledge: ["frequency_count", "tie_break_sorting", "nearest_mapping", "hex_parsing"]
  },
  "supplemental:luogu:b3869": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["base_conversion_programming"],
    includeKnowledge: ["base_digit_mapping", "positional_notation", "loop_accumulation"]
  },
  "supplemental:luogu:b3870": {
    includeDomains: ["bit_operation", "basic_programming"],
    includeTypes: ["variable_length_encoding"],
    includeKnowledge: ["bit_grouping", "bitwise_mask", "hex_formatting"]
  },
  "supplemental:luogu:b3927": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["dictionary_replacement_programming"],
    includeKnowledge: ["hash_map_lookup", "token_scanning", "delimiter_preservation"]
  },
  "supplemental:luogu:b3996": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["digit_transform_simulation"],
    includeKnowledge: ["digit_extraction", "state_cycle_detection", "bounded_simulation"]
  },
  "supplemental:luogu:b3997": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["string_segment_palindrome_programming"],
    includeKnowledge: ["segment_length_growth", "palindrome_check", "two_pointer"]
  },
  "supplemental:luogu:b4003": {
    includeDomains: ["basic_programming", "string"],
    includeTypes: ["alphabet_shift_programming"],
    includeKnowledge: ["modulo_operation", "character_cycle", "formatted_output"]
  },
  "supplemental:luogu:b4004": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["multiple_existence_judgment"],
    includeKnowledge: ["max_value_selection", "divisibility_check", "batch_processing"]
  },
  "supplemental:luogu:b4038": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["prefix_sum_balance_programming"],
    includeKnowledge: ["prefix_sum", "total_sum", "split_point"]
  },
  "supplemental:luogu:b4039": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["palindrome_split_programming"],
    includeKnowledge: ["palindrome_check", "split_enumeration", "two_pointer"]
  },
  "supplemental:luogu:b4067": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["pattern_output_programming"],
    includeKnowledge: ["pattern_table", "matrix_grid_traversal", "string_concatenation"]
  },
  "supplemental:luogu:b4261": {
    includeDomains: ["basic_programming", "bit_operation"],
    includeTypes: ["bitwise_equation_programming"],
    includeKnowledge: ["bitwise_identity", "algebra_transform", "boundary_case"]
  },
  "supplemental:luogu:b4262": {
    includeDomains: ["string", "sort_simulation"],
    includeTypes: ["frequency_count_programming"],
    includeKnowledge: ["lowercase_conversion", "hash_map_counting", "max_value_selection"]
  },
  "supplemental:luogu:b4358": {
    includeDomains: ["basic_programming", "bit_operation"],
    includeTypes: ["bit_count_parity_programming"],
    includeKnowledge: ["bit_count", "parity_check", "loop_accumulation"]
  },
  "supplemental:luogu:b4359": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["greedy_sequence_construction"],
    includeKnowledge: ["monotonic_sequence", "greedy_choice", "loop_accumulation"]
  },
  "supplemental:luogu:b4413": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["array_operation_simulation"],
    includeKnowledge: ["max_min_selection", "iterative_simulation", "boundary_case"]
  },
  "supplemental:luogu:b4414": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["calendar_formatting_programming"],
    includeKnowledge: ["month_days_table", "weekday_offset", "formatted_output"]
  },
  "supplemental:luogu:b4449": {
    includeDomains: ["basic_programming", "string"],
    includeTypes: ["string_validation_programming"],
    includeKnowledge: ["length_check", "character_category", "condition_combination"]
  },
  "supplemental:luogu:b4450": {
    includeDomains: ["greedy", "sort_simulation"],
    includeTypes: ["category_minimum_selection"],
    includeKnowledge: ["min_value_selection", "array_bucket", "greedy_choice"]
  },
  "supplemental:luogu:b3842": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["array_marking_programming"],
    includeKnowledge: ["boolean_marking", "deduplication", "ordered_output"]
  },
  "supplemental:luogu:b3843": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["string_validation_programming"],
    includeKnowledge: ["string_split", "character_category", "condition_combination"]
  },
  "supplemental:luogu:b3848": {
    includeDomains: ["sort_simulation", "greedy"],
    includeTypes: ["greedy_simulation_programming"],
    includeKnowledge: ["sequential_simulation", "greedy_choice"]
  },
  "supplemental:luogu:b3849": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["base_conversion_programming"],
    includeKnowledge: ["modulo_operation", "reverse_output", "digit_mapping"]
  },
  "supplemental:luogu:b3867": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["array_accumulation_programming"],
    includeKnowledge: ["array_sequence_state", "loop_accumulation"]
  },
  "supplemental:luogu:b3868": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["base_digit_validation_programming"],
    includeKnowledge: ["character_category", "base_digit_range", "batch_processing"]
  },
  "supplemental:luogu:b3925": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["reverse_recurrence_programming"],
    includeKnowledge: ["integer_divisibility", "reverse_derivation", "enumeration_counting"]
  },
  "supplemental:luogu:b3926": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["unit_conversion_programming"],
    includeKnowledge: ["string_parsing", "mapping_table", "multiplication_formula"]
  },
  "supplemental:luogu:b3956": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["character_value_accumulation"],
    includeKnowledge: ["ascii_code", "character_category", "loop_accumulation"]
  },
  "supplemental:luogu:b3957": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["pair_count_programming"],
    includeKnowledge: ["perfect_square", "nested_loop_enumeration", "precomputation_marking"]
  },
  "supplemental:luogu:b4257": {
    includeDomains: ["basic_programming"],
    includeTypes: ["integer_division_programming"],
    includeKnowledge: ["ceil_division", "remaining_quantity"]
  },
  "supplemental:luogu:b4258": {
    includeDomains: ["basic_programming"],
    includeTypes: ["rounding_programming"],
    includeKnowledge: ["rounding_to_tens", "integer_division_remainder"]
  },
  "supplemental:luogu:b4354": {
    includeDomains: ["basic_programming"],
    includeTypes: ["bounded_formula_programming"],
    includeKnowledge: ["min_value_selection", "multiplication_formula"]
  },
  "supplemental:luogu:b4355": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["gcd_lcm_transform"],
    includeKnowledge: ["greatest_common_divisor", "least_common_multiple"]
  },
  "supplemental:luogu:b4409": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["discount_comparison_programming"],
    includeKnowledge: ["floating_point_format", "min_value_selection", "conditional_branch"]
  },
  "supplemental:luogu:b4410": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["formula_derivation_programming"],
    includeKnowledge: ["sum_of_squares", "loop_accumulation"]
  },
  "supplemental:luogu:b4445": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["piecewise_fee_programming"],
    includeKnowledge: ["floating_point_format", "min_value_selection", "conditional_branch"]
  },
  "supplemental:luogu:b4446": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["range_branch_programming"],
    includeKnowledge: ["conditional_branch", "batch_processing"]
  },
  "supplemental:luogu:b3865": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["pattern_output_programming"],
    includeKnowledge: ["matrix_grid_traversal", "diagonal_condition"]
  },
  "supplemental:luogu:b4259": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["matrix_generation_programming"],
    includeKnowledge: ["matrix_grid_traversal", "multiplication_table"]
  },
  "supplemental:luogu:b4260": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["date_time_simulation_programming"],
    includeKnowledge: ["leap_year", "month_days_table", "calendar_rollover"]
  },
  "supplemental:luogu:b4356": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["parity_count_programming"],
    includeKnowledge: ["parity_product", "unordered_pair_counting"]
  },
  "supplemental:luogu:b4357": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["power_sum_check_programming"],
    includeKnowledge: ["powers_of_two", "precomputation_marking"]
  },
  "supplemental:luogu:b4411": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["repdigit_count_programming"],
    includeKnowledge: ["digit_uniformity", "enumeration_counting"]
  },
  "supplemental:luogu:b4412": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["pattern_output_programming"],
    includeKnowledge: ["matrix_grid_traversal", "diamond_manhattan_distance"]
  },
  "supplemental:luogu:b4447": {
    includeDomains: ["basic_programming"],
    includeTypes: ["integer_division_programming"],
    includeKnowledge: ["integer_division_remainder", "batch_processing"]
  },
  "supplemental:luogu:b4448": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["coordinate_inequality_counting"],
    includeKnowledge: ["grid_enumeration", "squared_distance", "inequality_transform"]
  },
  "supplemental:luogu:b3954": {
    includeDomains: ["basic_programming"],
    includeTypes: ["bounded_product_programming"],
    includeKnowledge: ["overflow_guard", "loop_accumulation"]
  },
  "supplemental:luogu:b3994": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["formula_derivation_programming"],
    includeKnowledge: ["arithmetic_series", "sum_of_squares"]
  },
  "supplemental:luogu:b3995": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["pattern_output_programming"],
    includeKnowledge: ["matrix_grid_traversal", "conditional_branch"]
  },
  "supplemental:luogu:b4002": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["equation_enumeration_programming"],
    includeKnowledge: ["sum_of_two_squares", "loop_enumeration"]
  },
  "supplemental:luogu:b4064": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["power_number_check_programming"],
    includeKnowledge: ["fourth_power", "precomputation_lookup"]
  },
  "supplemental:luogu:b3836": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["equation_enumeration_programming"],
    includeKnowledge: ["integer_equation_feasibility", "nested_loop_enumeration"]
  },
  "supplemental:luogu:b3840": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["prime_check_programming"],
    includeKnowledge: ["prime_check", "interval_enumeration"]
  },
  "supplemental:luogu:b3844": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["pattern_output_programming"],
    includeKnowledge: ["matrix_grid_traversal", "character_cycle"]
  },
  "supplemental:luogu:b3866": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["digit_simulation_programming"],
    includeKnowledge: ["digit_sorting", "iterative_simulation"]
  },
  "supplemental:luogu:b3923": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["recurrence_simulation_programming"],
    includeKnowledge: ["fibonacci_recurrence", "loop_accumulation"]
  },
  "supplemental:luogu:b3952": {
    includeDomains: ["basic_programming"],
    includeTypes: ["integer_division_programming"],
    includeKnowledge: ["integer_division_remainder"]
  },
  "supplemental:luogu:b3953": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["divisor_enumeration_programming"],
    includeKnowledge: ["integer_factor", "loop_enumeration"]
  },
  "supplemental:luogu:b3993": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["date_condition_programming"],
    includeKnowledge: ["month_days_table", "boundary_case"]
  },
  "supplemental:luogu:b4062": {
    includeDomains: ["basic_programming", "sort_simulation"],
    includeTypes: ["formula_conversion_programming"],
    includeKnowledge: ["floating_point_format", "conditional_branch"]
  },
  "supplemental:luogu:b4063": {
    includeDomains: ["basic_programming", "number_theory"],
    includeTypes: ["parity_count_programming"],
    includeKnowledge: ["modulo_operation", "loop_count_sum"]
  },
  "supplemental:luogu:p14917": {
    includeDomains: ["binary_search", "sort_simulation"],
    excludeDomains: ["number_theory"],
    includeTypes: ["binary_answer_programming", "sequence_simulation_programming"],
    includeKnowledge: ["binary_answer_feasibility", "array_sequence_state"]
  },
  "supplemental:luogu:p14918": {
    includeDomains: ["number_theory", "sort_simulation"],
    includeTypes: ["prime_factorization", "sequence_transformation_programming"],
    includeKnowledge: ["prime_factor_exponent", "median_minimization"]
  },
  "supplemental:luogu:p11961": {
    includeDomains: ["number_theory"],
    includeTypes: ["advanced_number_theory_programming"],
    includeKnowledge: ["primitive_root"],
    syllabusFit: "out_of_level"
  },
  "supplemental:luogu:b3941": {
    includeDomains: ["number_theory"],
    includeTypes: ["gcd_lcm_transform"],
    includeKnowledge: ["least_common_multiple"]
  },
  "supplemental:luogu:b3872": {
    includeDomains: ["greedy"],
    includeTypes: ["greedy_choice_programming"],
    includeKnowledge: ["deadline_greedy"]
  },
  "supplemental:luogu:p13013": {
    includeDomains: ["binary_search", "greedy"],
    includeTypes: ["binary_answer_programming"],
    includeKnowledge: ["binary_answer_feasibility"]
  },
  "supplemental:luogu:p14074": {
    includeDomains: ["bit_operation", "number_theory"],
    excludeDomains: ["dynamic_programming"],
    includeTypes: ["bitwise_counting_programming"],
    includeKnowledge: ["bit_count_prefix_sum"]
  }
};

function assert(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

async function main() {
  const data = JSON.parse(await readFile(supplementalPath, "utf8"));
  const refined = data.records.filter((record) => record.source_signals?.classification_refined_from_source_extracted_statement);
  assert(refined.length >= minimumRefinedCount, `expected at least ${minimumRefinedCount} refined supplemental records, got ${refined.length}`);
  assert(data.summary.classification_refined_count === refined.length, "summary classification refined count mismatch");

  for (const record of refined) {
    assert(record.effective_review_status === "needs_review", `${record.canonical_problem_id}: refined supplemental records must still need review`);
    for (const tag of [
      ...record.resolved_algorithm_domains,
      ...record.resolved_problem_type_tags,
      ...record.resolved_knowledge_point_tags
    ]) {
      assert(tag.source === "source_extracted_statement_ai_solution_review", `${record.canonical_problem_id}: refined tag source required`);
      assert(tag.review_status === "needs_review", `${record.canonical_problem_id}: refined tag must need review`);
      assert(tag.final_confidence < tag.raw_confidence, `${record.canonical_problem_id}: confidence should include review penalty`);
    }
  }

  for (const [id, expectation] of Object.entries(required)) {
    const record = data.records.find((item) => item.canonical_problem_id === id);
    const detail = data.problem_details.find((item) => item.canonical_problem_id === id);
    const guidance = data.answer_guidance.find((item) => item.canonical_problem_id === id);
    assert(record, `${id}: record missing`);
    assert(detail, `${id}: detail missing`);
    assert(guidance, `${id}: guidance missing`);

    const domains = record.resolved_algorithm_domains.map((tag) => tag.value);
    const types = record.resolved_problem_type_tags.map((tag) => tag.value);
    const knowledge = record.resolved_knowledge_point_tags.map((tag) => tag.value);

    for (const domain of expectation.includeDomains || []) {
      assert(domains.includes(domain), `${id}: expected domain ${domain}`);
    }
    for (const domain of expectation.excludeDomains || []) {
      assert(!domains.includes(domain), `${id}: unexpected domain ${domain}`);
    }
    for (const type of expectation.includeTypes || []) {
      assert(types.includes(type), `${id}: expected type ${type}`);
    }
    for (const point of expectation.includeKnowledge || []) {
      assert(knowledge.includes(point), `${id}: expected knowledge ${point}`);
    }
    if (expectation.syllabusFit) {
      assert(record.resolved_algorithm_domains.every((tag) => tag.syllabus_fit === expectation.syllabusFit), `${id}: expected syllabus fit ${expectation.syllabusFit}`);
      assert(record.out_of_level_signal_refs.length > 0, `${id}: out-of-level refs required`);
    }

    assert(detail.classification_refinement?.status === "needs_review", `${id}: detail classification refinement required`);
    assert(guidance.understanding_example.steps.some((step) => /样例通过|参考当前样例通过解法/.test(step)), `${id}: guidance should mention sample-verified solution evidence`);
  }

  console.log(`refined supplemental classification count: ${refined.length}`);
  console.log("Supplemental classification refinement validation passed");
}

main().catch((error) => {
  console.error(`Supplemental classification refinement validation failed: ${error.message}`);
  process.exitCode = 1;
});
