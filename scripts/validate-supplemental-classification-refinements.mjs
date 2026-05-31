import { readFile } from "node:fs/promises";

const supplementalPath = "data/classification/supplemental-cxx-problems.json";

const required = {
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
  assert(refined.length >= 88, `expected at least 88 refined supplemental records, got ${refined.length}`);
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
