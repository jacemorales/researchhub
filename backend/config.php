<?php
// Centralized Configuration

// Load Composer's autoloader
require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables from .env file in the backend directory
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Throwable $e) {
    // Handle error if .env file is not found or not readable
    // In a production environment, you might want to die() here.
    error_log("Could not load .env file: " . $e->getMessage());
}

// Database Configuration
// Use environment variables with fallbacks for local development if needed.
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'research_hub');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');

// Paystack Configuration
define('PAYSTACK_SECRET', $_ENV['PAYSTACK_SECRET'] ?? '');

// Mail Configuration
define('MAIL_FROM_ADDRESS', $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@yourdomain.com');
define('MAIL_FROM_NAME', $_ENV['MAIL_FROM_NAME'] ?? 'Your Project Name');

// It's good practice to check for essential keys
if (empty(DB_NAME) || empty(DB_USER)) {
    // You might want to handle this more gracefully
    die("Database configuration is incomplete. Please check your .env file.");
}
?>
