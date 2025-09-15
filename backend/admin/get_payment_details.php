<?php
require_once __DIR__.'/config.php';

header('Content-Type: application/json');

if (!isset($_GET['id'])) {
    echo json_encode(['success' => false, 'error' => 'Payment ID is required']);
    exit;
}

$paymentId = (int)$_GET['id'];

try {
    $stmt = $pdo->prepare("
        SELECT p.*, af.file_name, af.drive_file_id 
        FROM payments p 
        LEFT JOIN academic_files af ON p.file_id = af.id 
        WHERE p.id = ?
    ");
    $stmt->execute([$paymentId]);
    $payment = $stmt->fetch();

    if (!$payment) {
        echo json_encode(['success' => false, 'error' => 'Payment not found']);
        exit;
    }

    $paymentData = json_decode($payment['payment_data'], true) ?? [];

    $html = '
    <div class="payment-details">
        <div class="detail-section">
            <h3>Transaction Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Transaction ID:</label>
                    <span class="transaction-id">' . htmlspecialchars($payment['transaction_id']) . '</span>
                </div>
                <div class="detail-item">
                    <label>Status:</label>
                    <span class="status status-' . $payment['status'] . '">' . ucfirst($payment['status']) . '</span>
                </div>
                <div class="detail-item">
                    <label>Amount:</label>
                    <span class="amount">$' . number_format($payment['amount'], 2) . '</span>
                </div>
                <div class="detail-item">
                    <label>Currency:</label>
                    <span>' . $payment['currency'] . '</span>
                </div>
                <div class="detail-item">
                    <label>Payment Method:</label>
                    <span>' . ucfirst($payment['payment_method']) . '</span>
                </div>
                <div class="detail-item">
                    <label>Date:</label>
                    <span>' . date('F d, Y \a\t g:i A', strtotime($payment['created_at'])) . '</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>Customer Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>Name:</label>
                    <span>' . htmlspecialchars($payment['customer_name']) . '</span>
                </div>
                <div class="detail-item">
                    <label>Email:</label>
                    <span>' . htmlspecialchars($payment['customer_email']) . '</span>
                </div>
            </div>
        </div>

        <div class="detail-section">
            <h3>File Information</h3>
            <div class="detail-grid">
                <div class="detail-item">
                    <label>File Name:</label>
                    <span>' . htmlspecialchars($payment['file_name'] ?? 'Unknown File') . '</span>
                </div>
                <div class="detail-item">
                    <label>File ID:</label>
                    <span>' . htmlspecialchars($payment['file_id']) . '</span>
                </div>
            </div>
        </div>';

    if (!empty($paymentData)) {
        $html .= '
        <div class="detail-section">
            <h3>Additional Information</h3>
            <div class="detail-grid">';
        
        if (isset($paymentData['ip_address'])) {
            $html .= '
                <div class="detail-item">
                    <label>IP Address:</label>
                    <span>' . htmlspecialchars($paymentData['ip_address']) . '</span>
                </div>';
        }
        
        if (isset($paymentData['user_agent'])) {
            $html .= '
                <div class="detail-item">
                    <label>User Agent:</label>
                    <span class="user-agent">' . htmlspecialchars($paymentData['user_agent']) . '</span>
                </div>';
        }
        
        $html .= '
            </div>
        </div>';
    }

    $html .= '
    </div>
    
    <style>
    .payment-details {
        display: flex;
        flex-direction: column;
        gap: 2rem;
    }
    
    .detail-section h3 {
        margin: 0 0 1rem 0;
        color: var(--primary);
        border-bottom: 2px solid var(--primary);
        padding-bottom: 0.5rem;
    }
    
    .detail-grid {
        display: grid;
        grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
        gap: 1rem;
    }
    
    .detail-item {
        display: flex;
        flex-direction: column;
        gap: 0.25rem;
    }
    
    .detail-item label {
        font-weight: 600;
        color: var(--gray);
        font-size: 0.85rem;
    }
    
    .detail-item span {
        color: var(--dark);
    }
    
    .user-agent {
        font-size: 0.8rem;
        word-break: break-all;
    }
    </style>';

    echo json_encode(['success' => true, 'html' => $html]);

} catch (PDOException $e) {
    echo json_encode(['success' => false, 'error' => 'Database error occurred']);
}
?>


