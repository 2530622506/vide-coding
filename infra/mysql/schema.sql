CREATE TABLE IF NOT EXISTS catalog_metadata (
  meta_key VARCHAR(80) PRIMARY KEY,
  meta_value JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS classification_records (
  canonical_problem_id VARCHAR(160) PRIMARY KEY,
  official_problem_id VARCHAR(160) NOT NULL,
  session_code VARCHAR(20) NOT NULL,
  language VARCHAR(20) NOT NULL,
  level_no INT NOT NULL,
  question_type VARCHAR(32) NOT NULL,
  question_number INT NOT NULL,
  title VARCHAR(512) NOT NULL,
  effective_review_status VARCHAR(32) NOT NULL,
  record_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_records_level_status (level_no, effective_review_status),
  INDEX idx_records_question_type (level_no, question_type, question_number),
  INDEX idx_records_official_problem (official_problem_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS review_queue_items (
  id VARCHAR(120) PRIMARY KEY,
  item_type VARCHAR(64) NOT NULL,
  priority VARCHAR(16) NOT NULL,
  status VARCHAR(32) NOT NULL,
  canonical_problem_id VARCHAR(160) NULL,
  title VARCHAR(512) NOT NULL,
  reason VARCHAR(512) NOT NULL,
  final_confidence DECIMAL(6,4) NULL,
  item_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_review_priority (priority, item_type),
  INDEX idx_review_problem (canonical_problem_id),
  CONSTRAINT fk_review_problem FOREIGN KEY (canonical_problem_id)
    REFERENCES classification_records (canonical_problem_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS problem_answer_guidance (
  canonical_problem_id VARCHAR(160) PRIMARY KEY,
  answer_status VARCHAR(32) NOT NULL,
  answer_text VARCHAR(512) NULL,
  answer_source VARCHAR(80) NOT NULL,
  confidence DECIMAL(6,4) NOT NULL,
  guidance_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_answer_status (answer_status),
  CONSTRAINT fk_answer_problem FOREIGN KEY (canonical_problem_id)
    REFERENCES classification_records (canonical_problem_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS problem_details (
  canonical_problem_id VARCHAR(160) PRIMARY KEY,
  statement_status VARCHAR(32) NOT NULL,
  option_status VARCHAR(32) NOT NULL,
  option_count INT NOT NULL DEFAULT 0,
  visual_asset_status VARCHAR(32) NOT NULL,
  visual_asset_count INT NOT NULL DEFAULT 0,
  programming_solution_status VARCHAR(32) NOT NULL,
  detail_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_detail_statement_status (statement_status),
  INDEX idx_detail_visual_asset_status (visual_asset_status),
  CONSTRAINT fk_detail_problem FOREIGN KEY (canonical_problem_id)
    REFERENCES classification_records (canonical_problem_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS source_versions (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  canonical_problem_id VARCHAR(160) NOT NULL,
  source_kind VARCHAR(64) NULL,
  source_id VARCHAR(160) NULL,
  source_url VARCHAR(1024) NULL,
  source_json JSON NOT NULL,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_source_problem (canonical_problem_id),
  INDEX idx_source_kind (source_kind),
  CONSTRAINT fk_source_problem FOREIGN KEY (canonical_problem_id)
    REFERENCES classification_records (canonical_problem_id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE IF NOT EXISTS review_events (
  id BIGINT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
  review_item_id VARCHAR(120) NULL,
  canonical_problem_id VARCHAR(160) NULL,
  action VARCHAR(32) NOT NULL,
  reviewer VARCHAR(120) NOT NULL,
  note TEXT NULL,
  before_status VARCHAR(32) NOT NULL,
  after_status VARCHAR(32) NOT NULL,
  event_json JSON NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_review_event_item (review_item_id),
  INDEX idx_review_event_problem (canonical_problem_id),
  INDEX idx_review_event_action (action, created_at),
  CONSTRAINT fk_review_event_item FOREIGN KEY (review_item_id)
    REFERENCES review_queue_items (id)
    ON DELETE SET NULL,
  CONSTRAINT fk_review_event_problem FOREIGN KEY (canonical_problem_id)
    REFERENCES classification_records (canonical_problem_id)
    ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
