<?php
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
    
    public function getConfig($key = null) {
        try {
            if ($key) {
                $stmt = $this->pdo->prepare("SELECT config_key, config_value, config_type FROM website_config WHERE config_key = ?");
                $stmt->execute([$key]);
                $result = $stmt->fetch();
                return $result ? $result['config_value'] : null;
            } else {
                $stmt = $this->pdo->query("SELECT config_key, config_value, config_type, config_category, config_description FROM website_config ORDER BY config_category, config_key");
                $results = $stmt->fetchAll();
                
                $config = [];
                foreach ($results as $row) {
                    $config[$row['config_key']] = $row['config_value'];
                }
                return $config;
            }
        } catch (PDOException $e) {
            error_log("Error getting config: " . $e->getMessage());
            return null;
        }
    }
    
    public function updateConfig($key, $value) {
        try {
            $stmt = $this->pdo->prepare("UPDATE website_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?");
            return $stmt->execute([$value, $key]);
        } catch (PDOException $e) {
            error_log("Error updating config: " . $e->getMessage());
            return false;
        }
    }
    
    public function getAllConfigWithDetails() {
        try {
            $stmt = $this->pdo->query("SELECT * FROM website_config ORDER BY config_category, config_key");
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error getting config details: " . $e->getMessage());
            return [];
        }
    }
    
    public function getConfigByCategory($category) {
        try {
            $stmt = $this->pdo->prepare("SELECT * FROM website_config WHERE config_category = ? ORDER BY config_key");
            $stmt->execute([$category]);
            return $stmt->fetchAll();
        } catch (PDOException $e) {
            error_log("Error getting config by category: " . $e->getMessage());
            return [];
        }
    }
    
    public function insertConfig($key, $value, $type = 'text', $category = 'general', $description = '') {
        try {
            $stmt = $this->pdo->prepare("INSERT INTO website_config (config_key, config_value, config_type, config_category, config_description) VALUES (?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE config_value = VALUES(config_value), config_type = VALUES(config_type), config_category = VALUES(config_category), config_description = VALUES(config_description)");
            return $stmt->execute([$key, $value, $type, $category, $description]);
        } catch (PDOException $e) {
            error_log("Error inserting config: " . $e->getMessage());
            return false;
        }
    }
    
    public function deleteConfig($key) {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM website_config WHERE config_key = ?");
            return $stmt->execute([$key]);
        } catch (PDOException $e) {
            error_log("Error deleting config: " . $e->getMessage());
            return false;
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}

// Initialize database connection
$db = new Database();

// Function to get config value with fallback
function getConfig($key, $default = '') {
    global $db;
    $value = $db->getConfig($key);
    return $value !== null ? $value : $default;
}

// Function to load all config values into constants
function loadConfigConstants() {
    global $db;
    $config = $db->getConfig();
    
    foreach ($config as $key => $value) {
        if (!defined($key)) {
            define($key, $value);
        }
    }
}
?> 