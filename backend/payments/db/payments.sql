-- Merged Payments Database Schema
-- This schema combines the application-specific payment details with provider-specific logging.

-- Use the main application database
USE research_hub;

-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS payments;

-- Create the merged payments table
CREATE TABLE payments (
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- Core Transaction Details
    drive_file_id VARCHAR(255) NOT NULL,           -- Google Drive file ID
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(255) NOT NULL,
    amount DECIMAL(10, 2) NOT NULL,                -- Final amount with fee
    currency VARCHAR(3) DEFAULT 'NGN',
    payment_method VARCHAR(50) DEFAULT 'paystack',
    
    -- MASTER REFERENCE and PAYMENT PLATFORM REFERENCE
    reference VARCHAR(100) NOT NULL UNIQUE,
    current_platform_reference VARCHAR(100) DEFAULT NULL,
    
    -- Status Tracking
    payment_status ENUM('initialized', 'pending', 'completed', 'failed', 'refunded', 'abandoned') DEFAULT 'pending',
    admin_status ENUM('pending', 'approved', 'rejected') DEFAULT 'pending',
    
    -- Human-Readable Timestamps (VARCHAR for custom formatting)
    started_at VARCHAR(50) NOT NULL ,
    updated_at VARCHAR(50) NULL DEFAULT NULL,
    completed_at VARCHAR(50) NULL DEFAULT NULL,
    
    -- Full Audit Trail — All platform attempts, logs, analytics stored here
    transaction_logs LONGTEXT NOT NULL COMMENT 'JSON structure containing all payment attempts, platform references, and logs',

    -- Indexes for performance
    INDEX idx_drive_file_id (drive_file_id),
    INDEX idx_customer_email (customer_email),
    INDEX idx_payment_status (payment_status),
    INDEX idx_reference (reference)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;