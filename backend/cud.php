<?php
// cud.php - Generic Create, Update, Delete Endpoint

// Set headers for JSON response and CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST is supported.']);
    exit();
}

// Include the centralized configuration
require_once __DIR__ . '/config.php';

// Get table and action from query parameters
$table = $_GET['table'] ?? '';
$action = $_GET['action'] ?? '';

// Validate table and action
if (empty($table) || empty($action)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Missing required parameters: table and action.']);
    exit();
}

// Get raw POST data (React sends JSON)
$input = json_decode(file_get_contents('php://input'), true);

// Validate input data
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.']);
    exit();
}

class GenericDatabaseManager {
    private $pdo;

    public function __construct($pdo) {
        $this->pdo = $pdo;
    }

    public function performCUD($table, $action, $data) {
        try {
            switch (strtolower($action)) {
                case 'insert':
                    return $this->createRecord($table, $data);
                case 'update':
                    return $this->updateRecord($table, $data);
                case 'delete':
                    return $this->deleteRecord($table, $data);
                default:
                    throw new Exception("Invalid action: {$action}. Allowed: 'insert', 'update', 'delete'.");
            }
        } catch (Exception $e) {
            return ['success' => false, 'error' => $e->getMessage()];
        }
    }

    private function createRecord($table, $data) {
        if (empty($data)) {
            throw new Exception("No data provided for create operation.");
        }

        $columns = array_keys($data);
        $placeholders = array_fill(0, count($columns), '?');
        $sql = "INSERT INTO {$table} (" . implode(', ', $columns) . ") VALUES (" . implode(', ', $placeholders) . ")";

        $stmt = $this->pdo->prepare($sql);
        $stmt->execute(array_values($data));

        return [
            'success' => true,
            'message' => 'Record created successfully.',
            'inserted_id' => $this->pdo->lastInsertId()
        ];
    }

    private function updateRecord($table, $data) {
        // Special handling for 'website_config'
        if ($table === 'website_config') {
            if (!isset($data['config_key']) || !isset($data['config_value'])) {
                throw new Exception("For 'website_config' update, 'config_key' and 'config_value' are required.");
            }

            $sql = "UPDATE {$table} SET config_value = :config_value, updated_at = CURRENT_TIMESTAMP WHERE config_key = :config_key";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute([
                ':config_value' => $data['config_value'],
                ':config_key' => $data['config_key']
            ]);

            if ($stmt->rowCount() === 0) {
                throw new Exception("No record found with config_key: {$data['config_key']}");
            }

            return [
                'success' => true,
                'message' => 'Configuration updated successfully.',
                'affected_rows' => $stmt->rowCount()
            ];
        } 
        // Special handling for 'payments'
        else if ($table === 'payments') {
            if (!isset($data['id'])) {
                throw new Exception("For 'payments' update, 'id' is required.");
            }

            $updates = [];
            $params = [':id' => $data['id']];

            // Allow updating multiple fields
            foreach ($data as $key => $value) {
                if ($key !== 'id') {
                    $updates[] = "{$key} = :{$key}";
                    $params[":{$key}"] = $value;
                }
            }

            if (empty($updates)) {
                throw new Exception("No fields to update in payments table.");
            }

            $sql = "UPDATE {$table} SET " . implode(', ', $updates) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($params);

            if ($stmt->rowCount() === 0) {
                throw new Exception("No payment record found with id: {$data['id']}");
            }

            return [
                'success' => true,
                'message' => 'Payment updated successfully.',
                'affected_rows' => $stmt->rowCount()
            ];
        }
        // Generic update for other tables (assuming 'id' is the primary key)
        else {
            if (!isset($data['id'])) {
                throw new Exception("For generic update, 'id' is required to identify the record.");
            }

            $id = $data['id'];
            unset($data['id']); // Remove 'id' from the data to be updated

            if (empty($data)) {
                throw new Exception("No update data provided.");
            }

            $setClause = [];
            foreach ($data as $column => $value) {
                $setClause[] = "{$column} = :{$column}";
            }
            $sql = "UPDATE {$table} SET " . implode(', ', $setClause) . ", updated_at = CURRENT_TIMESTAMP WHERE id = :id";

            $data['id'] = $id; // Add 'id' back for binding
            $stmt = $this->pdo->prepare($sql);
            $result = $stmt->execute($data);

            return [
                'success' => true,
                'message' => 'Record updated successfully.',
                'affected_rows' => $stmt->rowCount()
            ];
        }
    }

    private function deleteRecord($table, $data) {
        // Special handling for 'website_config'
        if ($table === 'website_config') {
            if (!isset($data['config_key'])) {
                throw new Exception("For 'website_config' delete, 'config_key' is required.");
            }
            $sql = "DELETE FROM {$table} WHERE config_key = :config_key";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':config_key' => $data['config_key']]);
        } 
        // Special handling for 'payments'
        else if ($table === 'payments') {
            if (!isset($data['id'])) {
                throw new Exception("For 'payments' delete, 'id' is required.");
            }
            $sql = "DELETE FROM {$table} WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $data['id']]);
        }
        // Generic delete for other tables
        else {
            if (!isset($data['id'])) {
                throw new Exception("For generic delete, 'id' is required.");
            }
            $sql = "DELETE FROM {$table} WHERE id = :id";
            $stmt = $this->pdo->prepare($sql);
            $stmt->execute([':id' => $data['id']]);
        }

        return [
            'success' => true,
            'message' => 'Record deleted successfully.',
            'affected_rows' => $stmt->rowCount()
        ];
    }
}

try {
    // Get a fresh PDO connection
    $pdo = getPDOConnection();

    // Initialize the database manager
    $dbManager = new GenericDatabaseManager($pdo);

    // Perform the CUD operation
    $result = $dbManager->performCUD($table, $action, $input);

    if ($result['success']) {
        http_response_code(200);
    } else {
        http_response_code(400);
    }

    echo json_encode($result);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Server Error: ' . $e->getMessage()
    ]);
}
?>