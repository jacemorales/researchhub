CREATE TABLE `webhook_debug_logs` (
  `id` INT AUTO_INCREMENT PRIMARY KEY,
  `received_at` DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `event_type` VARCHAR(50) NULL,
  `reference` VARCHAR(255) NULL,
  `master_reference` VARCHAR(255) NULL,
  `raw_payload` LONGTEXT NOT NULL,
  `raw_headers` TEXT NULL,
  `signature_header` VARCHAR(255) NULL,
  `computed_signature` VARCHAR(255) NULL,
  `signature_valid` BOOLEAN NULL,
  `json_parse_success` BOOLEAN NOT NULL DEFAULT TRUE,
  `http_response_code` INT NOT NULL,
  `log_message` TEXT NULL,
  `error_message` TEXT NULL,
  `payment_status_updated` BOOLEAN NOT NULL DEFAULT FALSE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;