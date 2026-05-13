CREATE DATABASE IF NOT EXISTS agent_memory CHARACTER SET utf8mb4 COLLATE utf8mb4_bin;
USE agent_memory;

CREATE TABLE IF NOT EXISTS sessions (
  id VARCHAR(36) PRIMARY KEY,
  task_description TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL,
  final_status ENUM('DONE','REDESIGN','FAIL','IN_PROGRESS') DEFAULT 'IN_PROGRESS'
);

CREATE TABLE IF NOT EXISTS iterations (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL,
  status ENUM('PASS','FAIL','BLOCKED') DEFAULT 'FAIL',
  test_types JSON,
  last_test_result TEXT,
  architect_decision TEXT,
  next_action ENUM('IMPLEMENT','REDESIGN','DONE') NULL,
  research_done BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_iter (session_id, iteration_number),
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS arch_decisions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL,
  decision_type ENUM('TECH_CHOICE','INVARIANT','DECISION_LOG','REDESIGN') NOT NULL,
  content TEXT NOT NULL,
  reason TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS meta_cases (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  iteration_number INT NOT NULL,
  case_type ENUM('GOOD','BAD','VIOLATION','IMPROVEMENT') NOT NULL,
  role ENUM('ARCHITECT','IMPLEMENTER','TESTER','RETROSPECTIVE') NOT NULL,
  level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NULL,
  content TEXT NOT NULL,
  reuse_point TEXT NULL,
  impact TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS rules (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rule_name VARCHAR(255) NOT NULL UNIQUE,
  level ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  content TEXT NOT NULL,
  version INT DEFAULT 1,
  is_active BOOLEAN DEFAULT TRUE,
  modified_reason TEXT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feedback (
  id INT AUTO_INCREMENT PRIMARY KEY,
  session_id VARCHAR(36) NOT NULL,
  satisfaction TINYINT NOT NULL CHECK (satisfaction BETWEEN 1 AND 5),
  arch_aligned BOOLEAN NOT NULL,
  comment TEXT,
  rule_changes_requested TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (session_id) REFERENCES sessions(id) ON DELETE CASCADE
);

INSERT IGNORE INTO rules (rule_name, level, content) VALUES
('integration_test_criteria',    'MEDIUM', '모듈 경계 또는 API 레이어 변경 시 Integration 테스트 실행'),
('parallel_execution_threshold', 'MEDIUM', '독립 태스크 2개 이상이면 병렬 실행'),
('research_tool_order',          'MEDIUM', 'WebSearch → WebFetch → context7 순서로 조사'),
('state_file_format',            'LOW',    'loop-state.md는 YAML 형식으로 작성'),
('output_summary_style',         'LOW',    '에이전트 출력 끝에 3줄 요약 포함');

-- QA Browser Agent 테이블
CREATE TABLE IF NOT EXISTS qa_sessions (
  id VARCHAR(36) PRIMARY KEY,
  url VARCHAR(2048) NOT NULL,
  scenario TEXT NOT NULL,
  status ENUM('IN_PROGRESS','PASS','FAIL','STUCK','PARTIAL') DEFAULT 'IN_PROGRESS',
  total_steps INT DEFAULT 0,
  bugs_found INT DEFAULT 0,
  deferred_bugs INT DEFAULT 0,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  completed_at TIMESTAMP NULL
);

CREATE TABLE IF NOT EXISTS qa_bugs (
  id VARCHAR(36) PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  bug_type ENUM('CONSOLE','UI','NETWORK','BEHAVIOR') NOT NULL,
  severity ENUM('CRITICAL','HIGH','MEDIUM','LOW') NOT NULL,
  step_number INT NOT NULL,
  description TEXT NOT NULL,
  selector VARCHAR(512),
  screenshot_path VARCHAR(512),
  console_log TEXT,
  network_detail TEXT,
  status ENUM('OPEN','DEFERRED','CONFIRMED','FALSE_POSITIVE') DEFAULT 'OPEN',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS qa_screenshots (
  id INT AUTO_INCREMENT PRIMARY KEY,
  qa_session_id VARCHAR(36) NOT NULL,
  step_number INT,
  bug_id VARCHAR(36),
  type ENUM('BEFORE','AFTER','BUG_EVIDENCE','RECOVERY') NOT NULL,
  file_path VARCHAR(512) NOT NULL,
  deleted_at TIMESTAMP NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (qa_session_id) REFERENCES qa_sessions(id) ON DELETE CASCADE
);
