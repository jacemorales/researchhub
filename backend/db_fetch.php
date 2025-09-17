<?php
// db_fetch.php - Fetches all data for the frontend
// List of allowed origins
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app'
];

// Get the Origin header from the request
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// If the origin is in the allowed list, echo it back
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // Optionally, deny the request or allow none
    // header("Access-Control-Allow-Origin: null");
    // http_response_code(403);
    // exit;
}

// Always set these headers

// Set headers for JSON response and CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: GET, OPTIONS");
header("Access-Control-Allow-Credentials: true");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
// header("Access-Control-Allow-Origin: https://researchhubb.netlify.app");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include the centralized configuration
require_once __DIR__ . '/config.php';

class DatabaseFetcher {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getWebsiteConfig() {
        try {
            $stmt = $this->pdo->query("SELECT config_key, config_value FROM website_config");
            $results = $stmt->fetchAll();
            $config = [];
            foreach ($results as $row) {
                $config[$row['config_key']] = $row['config_value'];
            }
            return $config;
        } catch (PDOException $e) {
            error_log("Error getting website_config: " . $e->getMessage());
            return [];
        }
    }

    public function getAcademicFiles() {
        try {
            $stmt = $this->pdo->query("SELECT * FROM academic_files");
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error getting academic_files: " . $e->getMessage());
            return [];
        }
    }

    public function getPayments() {
        try {
            $stmt = $this->pdo->query("SELECT * FROM payments");
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error getting payments: " . $e->getMessage());
            return [];
        }
    }
}

try {
    // Get a fresh PDO connection
    $pdo = getPDOConnection();

    // Initialize the fetcher
    $fetcher = new DatabaseFetcher($pdo);

    // Fetch all data
    $data = [
        'website_config' => $fetcher->getWebsiteConfig(),
        'academic_files' => $fetcher->getAcademicFiles(),
        'payments' => $fetcher->getPayments()
    ];

    echo json_encode(['success' => true, 'data' => $data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>