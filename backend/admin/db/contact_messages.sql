-- Contact Messages Database Schema
-- This schema handles contact form submissions

-- Use the main application database
USE research_hub;

-- Drop existing table if it exists to avoid conflicts
DROP TABLE IF EXISTS contact_messages;

-- Create contact messages table
CREATE TABLE contact_messages (
    id INT AUTO_INCREMENT PRIMARY KEY,
    contact_name VARCHAR(255) NOT NULL,
    contact_email VARCHAR(255) NOT NULL,
    contact_subject VARCHAR(500) NOT NULL,
    contact_message TEXT NOT NULL,
    status ENUM('new', 'read', 'replied', 'archived') DEFAULT 'new',
    admin_notes TEXT NULL,
    replied_at TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_status (status),
    INDEX idx_contact_email (contact_email),
    INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create function to get contact message statistics
DELIMITER //
CREATE FUNCTION GetContactStats()
RETURNS JSON
READS SQL DATA
DETERMINISTIC
BEGIN
    DECLARE result JSON;
    
    SELECT JSON_OBJECT(
        'total', COUNT(*),
        'new', SUM(CASE WHEN status = 'new' THEN 1 ELSE 0 END),
        'read', SUM(CASE WHEN status = 'read' THEN 1 ELSE 0 END),
        'replied', SUM(CASE WHEN status = 'replied' THEN 1 ELSE 0 END),
        'archived', SUM(CASE WHEN status = 'archived' THEN 1 ELSE 0 END),
        'today', SUM(CASE WHEN DATE(created_at) = CURDATE() THEN 1 ELSE 0 END),
        'this_week', SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 7 DAY) THEN 1 ELSE 0 END),
        'this_month', SUM(CASE WHEN created_at >= DATE_SUB(NOW(), INTERVAL 30 DAY) THEN 1 ELSE 0 END)
    ) INTO result
    FROM contact_messages;
    
    RETURN result;
END //
DELIMITER ;
