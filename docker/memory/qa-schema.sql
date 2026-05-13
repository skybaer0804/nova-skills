USE agent_memory;

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
