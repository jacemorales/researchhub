<?php
// Set headers for JSON response and CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_NAME', 'research_hub');
define('DB_USER', 'root');
define('DB_PASS', '');

// Load database class
require_once __DIR__ . '/admin/database.php';

try {
    if (!isset($db)) {
        throw new Exception("Database connection could not be established.");
    }

    $allConfig = $db->getConfig();

    if ($allConfig === null) {
        throw new Exception("Could not retrieve configuration from database.");
    }

    echo json_encode(['success' => true, 'config' => $allConfig]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
