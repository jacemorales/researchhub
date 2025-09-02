<?php
// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'research_hub');
define('DB_USER', 'root');
define('DB_PASS', '');

// Payments Database Configuration
define('PAYMENTS_DB_HOST', 'localhost');
define('PAYMENTS_DB_NAME', 'research_hub');
define('PAYMENTS_DB_USER', 'root');
define('PAYMENTS_DB_PASS', '');

$current_port = $_SERVER['SERVER_PORT'];
$show_port = ($current_port != 80 && $current_port != 443) ? ':'.$current_port : '';
define('BASE_URL', 
    ($_SERVER['HTTPS'] ?? 'off' === 'on' ? 'https://' : 'http://') .
    $_SERVER['SERVER_NAME'] . 
    $show_port 
);
// Load environment variables
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    $envLines = explode("\n", $envContent);
    foreach ($envLines as $line) {
        $line = trim($line);
        if (!empty($line) && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Google Drive API Configuration
define('GOOGLE_CONFIG_PATH', __DIR__.'/../assets/js/google-config.js');
define('GOOGLE_CLIENT_ID', $_ENV['GOOGLE_CLIENT_ID'] ?? '');
define('GOOGLE_CLIENT_SECRET', $_ENV['GOOGLE_CLIENT_SECRET'] ?? '');
define('GOOGLE_REDIRECT_URI', $_ENV['GOOGLE_REDIRECT_URI'] ?? BASE_URL . '/includes/auth_callback.php');

// Start session if not already started
if (session_status() === PHP_SESSION_NONE) {
    session_start();
}

// Create database connection
try {
    $pdo = new PDO(
        "mysql:host=".DB_HOST.";dbname=".DB_NAME,
        DB_USER, 
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
} catch (PDOException $e) {
    die("Database connection failed: " . $e->getMessage());
}

// Include functions
require __DIR__.'/functions.php';