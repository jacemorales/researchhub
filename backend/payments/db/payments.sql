-- Merged Payments Database Schema
-- This schema combines the application-specific payment details with provider-specific logging.

-- Use the main application database
USE research_hub;

-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS payments;

-- Create the merged payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Core Transaction Details (from payments.sql)
    drive_file_id INT NOT NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'USD',
    payment_method VARCHAR(50) DEFAULT 'manual' COMMENT 'e.g., paystack, stripe, paypal',
    
    -- Payment Provider & Status Details (merged)
    reference VARCHAR(100) UNIQUE COMMENT 'Reference ID from the payment provider (e.g., Paystack reference)',
    payment_status ENUM('pending', 'completed', 'failed', 'refunded', 'abandoned') DEFAULT 'pending',
    admin_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending' COMMENT 'Admin review status',
    
    -- Logging & Timestamps (from paymentss.sql)
    current_status varchar(50) NOT NULL DEFAULT 'pending',
    started_at datetime NOT NULL,
    completed_at datetime NULL DEFAULT NULL,
    transaction_logs TEXT COMMENT 'Logs or full callback data from the payment provider',

    -- Indexes for performance
    INDEX idx_file_id (file_id),
    INDEX idx_customer_email (customer_email),
    INDEX idx_payment_status (payment_status),
    INDEX idx_provider_reference (provider_reference),

    -- Foreign key to link with the files being purchased
    FOREIGN KEY (file_id) REFERENCES academic_files(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;


