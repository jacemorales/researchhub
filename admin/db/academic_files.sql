-- Academic Files Database Schema

-- Create database if not exists
CREATE DATABASE IF NOT EXISTS research_hub;
USE research_hub;

-- Create academic_files table
CREATE TABLE IF NOT EXISTS academic_files (
    id INT AUTO_INCREMENT PRIMARY KEY,
    drive_file_id VARCHAR(255) NOT NULL UNIQUE,
    file_name VARCHAR(500) NOT NULL,
    file_type VARCHAR(100) NOT NULL,
    file_size VARCHAR(50) NOT NULL,
    modified_date DATETIME NOT NULL,
    description TEXT,
    category ENUM('research', 'thesis', 'dissertation', 'assignment', 'project', 'presentation', 'other') NOT NULL,
    level ENUM('undergraduate', 'postgraduate') NOT NULL,
    price JSON DEFAULT NULL COMMENT 'Prices in different currencies: {"usd": 10.00, "ngn": 4500.00}',
    r2_key VARCHAR(500) DEFAULT NULL COMMENT 'Cloudflare R2 object key',
    r2_url VARCHAR(800) DEFAULT NULL COMMENT 'Public R2 URL',
    r2_upload_status ENUM('pending', 'uploading', 'success', 'failed') DEFAULT 'pending',
    r2_upload_error TEXT DEFAULT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_drive_file_id (drive_file_id),
    INDEX idx_category (category),
    INDEX idx_level (level),
    INDEX idx_r2_status (r2_upload_status),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert sample data (optional)
INSERT IGNORE INTO academic_files (drive_file_id, file_name, file_type, file_size, modified_date, description, category, level, price) VALUES
('sample1', 'Research Paper on AI', 'PDF Document', '2.5 MB', '2024-01-15 10:30:00', 'A comprehensive study on artificial intelligence applications', 'research', 'postgraduate', 15.99),
('sample2', 'Computer Science Assignment', 'Word Document', '1.2 MB', '2024-01-10 14:20:00', 'Programming assignment for CS101', 'assignment', 'undergraduate', 8.50),
('sample3', 'MBA Thesis on Business Strategy', 'PDF Document', '5.8 MB', '2024-01-20 09:15:00', 'Complete MBA thesis on modern business strategies', 'thesis', 'postgraduate', 29.99),
('sample4', 'Data Science Project', 'Zip Archive', '15.2 MB', '2024-01-18 16:45:00', 'Complete data science project with code and documentation', 'project', 'undergraduate', 19.99),
('sample5', 'Marketing Dissertation', 'PDF Document', '8.1 MB', '2024-01-12 11:30:00', 'Comprehensive marketing dissertation on digital transformation', 'dissertation', 'postgraduate', 39.99);

