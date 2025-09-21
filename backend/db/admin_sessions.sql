-- Admin Login Database Schema
-- This schema handles admin authentication and session management

-- Use the main application database
USE research_hub;

-- Admin Login Database Schema
-- This schema handles admin session management only
-- Admin authentication is handled via environment variables

-- Use the main application database
USE research_hub;

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS admin_sessions;

-- Create admin sessions table (simplified - no foreign key to admin_users)
CREATE TABLE admin_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    username VARCHAR(100) NOT NULL,
    created_at VARCHAR(50) NOT NULL,
    expires_at VARCHAR(50) NOT NULL,
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    INDEX idx_token (token),
    INDEX idx_username (username),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create function to clean up expired sessions
DELIMITER //
CREATE PROCEDURE CleanupExpiredSessions()
BEGIN
    DELETE FROM admin_sessions 
    WHERE expires_at < NOW() OR is_active = FALSE;
END //
DELIMITER ;

-- Create event to automatically clean up expired sessions (runs every hour)
CREATE EVENT IF NOT EXISTS cleanup_expired_sessions
ON SCHEDULE EVERY 1 HOUR
DO
  CALL CleanupExpiredSessions();
