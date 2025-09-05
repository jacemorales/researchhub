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

class Database {
    private $host;
    private $dbname;
    private $username;
    private $password;
    private $pdo;

    public function __construct() {
        $this->host = DB_HOST;
        $this->dbname = DB_NAME;
        $this->username = DB_USER;
        $this->password = DB_PASS;
        $this->connect();
    }

    private function connect() {
        try {
            $this->pdo = new PDO(
                "mysql:host={$this->host};dbname={$this->dbname};charset=utf8mb4",
                $this->username,
                $this->password,
                [
                    PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                    PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                    PDO::ATTR_EMULATE_PREPARES => false
                ]
            );
        } catch (PDOException $e) {
            error_log("Database connection failed: " . $e->getMessage());
            throw new Exception("Database connection failed");
        }
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
    $db = new Database();

    $data = [
        'website_config' => $db->getWebsiteConfig(),
        'academic_files' => $db->getAcademicFiles(),
        'payments' => $db->getPayments()
    ];

    echo json_encode(['success' => true, 'data' => $data]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(['success' => false, 'error' => $e->getMessage()]);
}
?>
