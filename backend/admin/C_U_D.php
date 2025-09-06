<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

header('Content-Type: application/json');

$db = new Database();
$input = json_decode(file_get_contents('php://input'), true);
$action = $_GET['action'] ?? null;

if (!$action) {
    echo json_encode(['success' => false, 'error' => 'No action specified']);
    exit;
}

switch ($action) {
    case 'save_academic_file':
        if ($db->saveAcademicFile($input)) {
            echo json_encode(['success' => true, 'message' => 'File saved successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to save file']);
        }
        break;

    case 'delete_academic_file':
        if ($db->deleteAcademicFile($input['id'])) {
            echo json_encode(['success' => true, 'message' => 'File deleted successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to delete file']);
        }
        break;

    case 'update_payment_status':
        if ($db->updatePaymentStatus($input['id'], $input['status'])) {
            echo json_encode(['success' => true, 'message' => 'Payment status updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to update payment status']);
        }
        break;

    case 'update_config':
        if ($db->updateConfig($input)) {
            echo json_encode(['success' => true, 'message' => 'Configuration updated successfully']);
        } else {
            echo json_encode(['success' => false, 'error' => 'Failed to update configuration']);
        }
        break;

    default:
        echo json_encode(['success' => false, 'error' => 'Invalid action']);
        break;
}
?>
