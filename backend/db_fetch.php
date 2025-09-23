<?php
// db_fetch.php - Fetches all data for the frontend

if (isset($_SERVER['HTTP_ORIGIN'])) {
    // Allow only your frontend domain
    $allowed_origins = [
        'https://researchhubb.netlify.app',
        'http://localhost:5173', // for local development
        'http://127.0.0.1:5173'
    ];

    if (in_array($_SERVER['HTTP_ORIGIN'], $allowed_origins)) {
        header("Access-Control-Allow-Origin: " . $_SERVER['HTTP_ORIGIN']);
        header("Access-Control-Allow-Credentials: true");
        header("Content-Type: application/json");
        header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
        header("Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With");
    }
}

// Handle preflight
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}
//header("Access-Control-Allow-Headers: Expires, Cache-Control, Pragma, Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");


// Include the centralized configuration
require_once __DIR__ . '/config.php';

class DatabaseFetcher {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function getWebsiteConfig() {
        try {
            $stmt = $this->pdo->query("SELECT config_key, config_value, config_description FROM website_config");
            $results = $stmt->fetchAll();
            $config = [];
            foreach ($results as $row) {
                $config[$row['config_key']] = $row['config_value'];
                $config[$row['config_key'] . '_DESC'] = $row['config_description'];
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

    // Check query parameters
    $action = $_GET['action'] ?? 'fetchAll';
    $skip_location = isset($_GET['skip_location']) && $_GET['skip_location'] === 'true';
    $location_only = isset($_GET['location_only']) && $_GET['location_only'] === 'true';
    $ping_only = isset($_GET['ping']) && $_GET['ping'] === 'true';

    if ($action === 'verify_payment_status') {
        $reference = $_GET['reference'] ?? null;
        if (!$reference) {
            throw new Exception('Reference parameter is required for verification.');
        }
        
        $stmt = $pdo->prepare("SELECT payment_status, transaction_logs FROM payments WHERE reference = ?");
        $stmt->execute([$reference]);
        $payment = $stmt->fetch(PDO::FETCH_ASSOC);

        if (!$payment) {
            echo json_encode(['success' => false, 'error' => 'Payment not found.']);
            exit;
        }

        echo json_encode(['success' => true, 'data' => $payment]);
        exit;
    }

    if ($ping_only) {
        // Simple ping response for internet connectivity check
        echo json_encode(['success' => true, 'ping' => 'ok', 'timestamp' => date('Y-m-d H:i:s')]);
        exit;
    }

    if ($location_only) {
        // Only return location data
        $data = [
            'user_location' => getUserLocation()
        ];
    } else {
        // Fetch all data (with or without location based on skip_location)
        $data = [
            'website_config' => $fetcher->getWebsiteConfig(),
            'academic_files' => $fetcher->getAcademicFiles(),
            'payments' => $fetcher->getPayments(),
        ];
        
        if (!$skip_location) {
            $data['user_location'] = getUserLocation();
        }
    }

    echo json_encode(['success' => true, 'data' => $data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>