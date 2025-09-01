-- Database schema for the payment system
-- Run this SQL to create the necessary table

CREATE DATABASE IF NOT EXISTS `paystack_payments` 
DEFAULT CHARACTER SET utf8mb4 
DEFAULT COLLATE utf8mb4_unicode_ci;

USE `paystack_payments`;

CREATE TABLE IF NOT EXISTS `payments` (
    `id` int(11) NOT NULL AUTO_INCREMENT,
    `reference` varchar(100) NOT NULL,
    `amount` decimal(10,2) NOT NULL,
    `email` varchar(255) NOT NULL,
    `current_status` varchar(50) NOT NULL DEFAULT 'pending',
    `started_at` datetime NOT NULL,
    `completed_at` datetime NULL DEFAULT NULL,
    `transaction_logs` longtext NOT NULL,
    `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
    `updated_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (`id`),
    UNIQUE KEY `reference_unique` (`reference`),
    KEY `idx_email` (`email`),
    KEY `idx_status` (`current_status`),
    KEY `idx_started_at` (`started_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Example .env file structure (create this file in your project root)
-- DB_HOST=127.0.0.1
-- DB_PORT=3306
-- DB_NAME=paystack_payments
-- DB_USER=root
-- DB_PASS=your_password
-- PAYSTACK_SECRET=sk_test_your_secret_key
-- MAIL_FROM_ADDRESS=noreply@researchhub.com
-- MAIL_FROM_NAME=Research Hub