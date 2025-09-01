<?php
require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    echo json_encode(['success' => false, 'error' => 'Invalid request method']);
    exit;
}

$input = json_decode(file_get_contents('php://input'), true);

if (!isset($input['payment_id']) || !isset($input['status'])) {
    echo json_encode(['success' => false, 'error' => 'Missing required fields']);
    exit;
}

$paymentId = (int)$input['payment_id'];
$status = $input['status'];

// Validate status
$allowedStatuses = ['pending', 'completed', 'failed', 'refunded'];
if (!in_array($status, $allowedStatuses)) {
    echo json_encode(['success' => false, 'error' => 'Invalid status']);
    exit;
}

try {
    $stmt = $pdo->prepare("UPDATE payments SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?");
    $result = $stmt->execute([$status, $paymentId]);

    if ($result && $stmt->rowCount() > 0) {
        echo json_encode(['success' => true, 'message' => 'Payment status updated successfully']);
    } else {
        echo json_encode(['success' => false, 'error' => 'Payment not found or no changes made']);
    }
} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database error occurred']);
}
