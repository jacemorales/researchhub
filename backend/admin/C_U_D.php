<?php
require_once __DIR__ . '/../config.php';
require_once __DIR__ . '/../db_config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

if (empty($action)) {
    echo json_encode(['success' => false, 'error' => 'No action specified']);
    exit;
}

try {
    switch ($action) {
        case 'update_payment':
            $stmt = $pdo->prepare("UPDATE payments SET admin_status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
            $stmt->execute([$input['admin_status'], $input['id']]);
            echo json_encode(['success' => true, 'message' => 'Payment status updated.']);
            break;

        case 'update_settings':
            $pdo->beginTransaction();
            $stmt = $pdo->prepare("UPDATE website_config SET config_value = ? WHERE config_key = ?");
            foreach ($input as $key => $value) {
                $stmt->execute([$value, $key]);
            }
            $pdo->commit();
            echo json_encode(['success' => true, 'message' => 'Settings updated.']);
            break;

        case 'save_file':
            $stmt = $pdo->prepare("SELECT id FROM academic_files WHERE drive_file_id = ?");
            $stmt->execute([$input['drive_file_id']]);
            $existing_file = $stmt->fetch();

            if ($existing_file) {
                $stmt = $pdo->prepare("UPDATE academic_files SET file_name = ?, file_type = ?, file_size = ?, modified_date = ?, description = ?, category = ?, level = ?, price = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
                $stmt->execute([$input['file_name'], $input['file_type'], $input['file_size'], $input['modified_date'], $input['description'], $input['category'], $input['level'], $input['price'], $existing_file['id']]);
                $message = 'File updated.';
            } else {
                $stmt = $pdo->prepare("INSERT INTO academic_files (drive_file_id, file_name, file_type, file_size, modified_date, description, category, level, price) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
                $stmt->execute([$input['drive_file_id'], $input['file_name'], $input['file_type'], $input['file_size'], $input['modified_date'], $input['description'], $input['category'], $input['level'], $input['price']]);
                $message = 'File saved.';
            }
            echo json_encode(['success' => true, 'message' => $message]);
            break;

        default:
            echo json_encode(['success' => false, 'error' => 'Invalid action']);
            break;
    }
} catch (PDOException $e) {
    if ($pdo->inTransaction()) {
        $pdo->rollBack();
    }
    echo json_encode(['success' => false, 'error' => 'Database error: ' . $e->getMessage()]);
}
?>
