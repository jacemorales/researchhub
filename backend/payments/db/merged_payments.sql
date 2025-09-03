-- Merged Payments Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS research_hub;
USE research_hub;

-- Drop existing table if exists
DROP TABLE IF EXISTS payments;

-- Create payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    reference VARCHAR(100) UNIQUE NOT NULL,
    file_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    payment_method ENUM('paystack', 'paypal', 'stripe', 'bank_transfer', 'crypto') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    current_status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    transaction_logs LONGTEXT,
    started_at DATETIME NOT NULL,
    completed_at DATETIME,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_reference (reference),
    INDEX idx_file_id (file_id),
    INDEX idx_email (email),
    INDEX idx_status (current_status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (file_id) REFERENCES academic_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example .env file structure (for backend)
-- DB_HOST=127.0.0.1
-- DB_PORT=3306
-- DB_NAME=research_hub
-- DB_USER=root
-- DB_PASS=your_password
-- PAYSTACK_SECRET=sk_test_your_secret_key
-- MAIL_FROM_ADDRESS=noreply@researchhub.com
-- MAIL_FROM_NAME=Research Hub
