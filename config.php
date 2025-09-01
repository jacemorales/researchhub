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

// Load database configuration
require_once __DIR__ . '/admin/includes/database.php';

// Load all config values from database
loadConfigConstants();

$requestUri = $_SERVER['REQUEST_URI'] ?? '';

// Check if we're on the marketplace page (more precise check)
$isMarketplace = strpos($requestUri, 'marketplace') !== false || 
                 basename($_SERVER['SCRIPT_NAME']) === 'marketplace.php';
define('PREFIX_PATH', $isMarketplace ? '../' : './');

// Core paths (using the prefix)
define('BASE_PATH', PREFIX_PATH . '/');
define('CSS_PATH', PREFIX_PATH . 'assets/css/');
define('JS_PATH', PREFIX_PATH . 'assets/js/');
define('IMG_PATH', PREFIX_PATH . 'assets/img/');
define('INCLUDE_PATH', PREFIX_PATH . 'includes/');
?>