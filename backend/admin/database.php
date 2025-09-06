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
                $stmt = $this->pdo->query("SELECT * FROM website_config ORDER BY config_category, config_key");
                $results = $stmt->fetchAll();
                
                $config = [];
                foreach ($results as $row) {
                    $config[$row['config_key']] = $row;
                }
                return $config;
            }
        } catch (PDOException $e) {
            error_log("Error getting config: " . $e->getMessage());
            return null;
        }
    }
    
    public function updateConfig($configs) {
        try {
            $this->pdo->beginTransaction();
            $stmt = $this->pdo->prepare("UPDATE website_config SET config_value = ?, updated_at = CURRENT_TIMESTAMP WHERE config_key = ?");
            foreach ($configs as $key => $value) {
                $stmt->execute([$value, $key]);
            }
            $this->pdo->commit();
            return true;
        } catch (PDOException $e) {
            $this->pdo->rollBack();
            error_log("Error updating config: " . $e->getMessage());
            return false;
        }
    }

    public function saveAcademicFile($file) {
        try {
            $stmt = $this->pdo->prepare("SELECT id FROM academic_files WHERE drive_file_id = ?");
            $stmt->execute([$file['drive_file_id']]);
            $existing_file = $stmt->fetch();

            if ($existing_file) {
                $stmt = $this->pdo->prepare("
                    UPDATE academic_files
                    SET file_name = ?, file_type = ?, file_size = ?, modified_date = ?,
                        description = ?, category = ?, level = ?, price = ?, updated_at = CURRENT_TIMESTAMP
                    WHERE drive_file_id = ?
                ");
                $stmt->execute([
                    $file['file_name'], $file['file_type'], $file['file_size'], $file['modified_date'],
                    $file['description'], $file['category'], $file['level'], json_encode($file['price']), $file['drive_file_id']
                ]);
            } else {
                $stmt = $this->pdo->prepare("
                    INSERT INTO academic_files
                    (drive_file_id, file_name, file_type, file_size, modified_date, description, category, level, price)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
                ");
                $stmt->execute([
                    $file['drive_file_id'], $file['file_name'], $file['file_type'], $file['file_size'], $file['modified_date'],
                    $file['description'], $file['category'], $file['level'], json_encode($file['price'])
                ]);
            }
            return true;
        } catch (PDOException $e) {
            error_log("Error saving academic file: " . $e->getMessage());
            return false;
        }
    }

    public function deleteAcademicFile($id) {
        try {
            $stmt = $this->pdo->prepare("DELETE FROM academic_files WHERE id = ?");
            return $stmt->execute([$id]);
        } catch (PDOException $e) {
            error_log("Error deleting academic file: " . $e->getMessage());
            return false;
        }
    }

    public function updatePaymentStatus($id, $status) {
        try {
            $stmt = $this->pdo->prepare("UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            return $stmt->execute([$status, $id]);
        } catch (PDOException $e) {
            error_log("Error updating payment status: " . $e->getMessage());
            return false;
        }
    }

    public function getPaymentDetails($id) {
        try {
            $stmt = $this->pdo->prepare("
                SELECT p.*, af.file_name, af.drive_file_id
                FROM payments p
                LEFT JOIN academic_files af ON p.file_id = af.id
                WHERE p.id = ?
            ");
            $stmt->execute([$id]);
            return $stmt->fetch();
        } catch (PDOException $e) {
            error_log("Error getting payment details: " . $e->getMessage());
            return null;
        }
    }
    
    public function getConnection() {
        return $this->pdo;
    }
}
?>
