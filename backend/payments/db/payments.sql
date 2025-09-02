-- Payments Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS research_hub;
USE research_hub;

-- Drop existing table if exists
DROP TABLE IF EXISTS payments;

-- Create payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    transaction_id VARCHAR(100) UNIQUE NOT NULL,
    file_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    payment_method ENUM('paypal', 'stripe', 'bank_transfer', 'crypto') NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    status ENUM('pending', 'completed', 'failed', 'refunded') DEFAULT 'pending',
    payment_data JSON,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_transaction_id (transaction_id),
    INDEX idx_file_id (file_id),
    INDEX idx_customer_email (customer_email),
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    FOREIGN KEY (file_id) REFERENCES academic_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample payment data (optional)
INSERT INTO payments (transaction_id, file_id, customer_name, customer_email, payment_method, amount, status) VALUES
('TXN001', 1, 'John Doe', 'john@example.com', 'paypal', 15.99, 'completed'),
('TXN002', 2, 'Jane Smith', 'jane@example.com', 'stripe', 8.50, 'pending'); 