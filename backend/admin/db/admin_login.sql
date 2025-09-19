-- Admin Login Database Schema
-- This schema handles admin authentication and session management

-- Use the main application database
USE research_hub;

-- Drop existing tables if they exist to avoid conflicts
DROP TABLE IF EXISTS admin_sessions;
DROP TABLE IF EXISTS admin_users;

-- Create admin users table
CREATE TABLE admin_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role ENUM('admin', 'super_admin') DEFAULT 'admin',
    is_active BOOLEAN DEFAULT TRUE,
    last_login TIMESTAMP NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    
    INDEX idx_username (username),
    INDEX idx_email (email),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Create admin sessions table
CREATE TABLE admin_sessions (
    id INT AUTO_INCREMENT PRIMARY KEY,
    token VARCHAR(64) NOT NULL UNIQUE,
    admin_user_id INT NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    expires_at TIMESTAMP DEFAULT (CURRENT_TIMESTAMP + INTERVAL 24 HOUR),
    ip_address VARCHAR(45),
    user_agent TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    
    FOREIGN KEY (admin_user_id) REFERENCES admin_users(id) ON DELETE CASCADE,
    INDEX idx_token (token),
    INDEX idx_admin_user_id (admin_user_id),
    INDEX idx_expires_at (expires_at),
    INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Insert default admin user (password: admin123)
-- In production, this should be changed immediately
INSERT INTO admin_users (username, password_hash, email, full_name, role) 
VALUES (
    'admin', 
    '$2y$10$92IXUNpkjO0rOQ5byMi.Ye4oKoEa3Ro9llC/.og/at2.uheWG/igi', -- password: admin123
    'admin@researchhub.com',
    'System Administrator',
    'super_admin'
);

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
