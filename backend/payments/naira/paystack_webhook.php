<?php
// paystack_webhook.php - Handle Paystack server-to-server notifications
header('Content-Type: application/json');

// If accessed via browser (GET), show human-readable logs
if ($_SERVER['REQUEST_METHOD'] === 'GET') {
    header('Content-Type: text/html; charset=utf-8');
    echo "<!DOCTYPE html>
    <html>
    <head>
        <title>Paystack Webhook Logs</title>
        <style>
            body { font-family: Arial, sans-serif; margin: 20px; background: #f5f5f5; }
            .container { max-width: 1000px; margin: 0 auto; background: white; padding: 20px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
            .status { padding: 10px; border-radius: 4px; margin-bottom: 20px; }
            .status.success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
            .status.info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
            table { width: 100%; border-collapse: collapse; margin-top: 20px; }
            th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
            th { background-color: #f8f9fa; font-weight: 600; }
            tr:hover { background-color: #f5f5f5; }
            .icon { font-size: 18px; margin-right: 8px; }
            .reference { font-family: monospace; background: #f8f9fa; padding: 2px 6px; border-radius: 3px; }
            .status-badge { padding: 2px 8px; border-radius: 12px; font-size: 12px; font-weight: 600; text-transform: uppercase; }
            .status-success { background: #d4edda; color: #155724; }
            .status-failed { background: #f8d7da; color: #721c24; }
            .status-abandoned { background: #fff3cd; color: #856404; }
            .status-pending { background: #d1ecf1; color: #0c5460; }
        </style>
    </head>
    <body>
        <div class='container'>
            <h2>Paystack Webhook Monitor</h2>
            <div class='status success'>
                <strong>✅ Webhook Connection Established</strong>
                <p>System is ready to receive payment notifications from Paystack</p>
            </div>";

    try {
        require_once __DIR__ . '/../../config.php';
        $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
        $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

        // Get webhook statistics
        $statsStmt = $pdo->query("
            SELECT 
                COUNT(*) as total_events,
                SUM(CASE WHEN status = 'success' THEN 1 ELSE 0 END) as successful,
                SUM(CASE WHEN status = 'failed' THEN 1 ELSE 0 END) as failed,
                SUM(CASE WHEN status = 'abandoned' THEN 1 ELSE 0 END) as abandoned,
                MAX(received_at) as last_event
            FROM webhook_logs 
            WHERE DATE(received_at) = CURDATE()
        ");
        $stats = $statsStmt->fetch(PDO::FETCH_ASSOC);

        echo "<div class='status info'>
                <strong>📊 Today's Statistics</strong>
                <p>Total Events: {$stats['total_events']} | Successful: {$stats['successful']} | Failed: {$stats['failed']} | Abandoned: {$stats['abandoned']}</p>
                <p>Last Event: " . ($stats['last_event'] ?? 'None') . "</p>
              </div>";

        // Get recent webhook events
        $stmt = $pdo->query("
            SELECT event_type, reference, master_reference, status, amount, customer_email, received_at 
            FROM webhook_logs 
            ORDER BY received_at DESC 
            LIMIT 50
        ");
        $logs = $stmt->fetchAll(PDO::FETCH_ASSOC);

        if (empty($logs)) {
            echo "<p>No webhook events received yet. Waiting for payment notifications...</p>";
        } else {
            echo "<table>
                    <thead>
                        <tr>
                            <th>Status</th>
                            <th>Event Type</th>
                            <th>Reference</th>
                            <th>Amount</th>
                            <th>Customer</th>
                            <th>Received At</th>
                        </tr>
                    </thead>
                    <tbody>";
            
            foreach ($logs as $log) {
                $icon = match($log['status']) {
                    'success' => '✅',
                    'failed' => '❌',
                    'abandoned' => '🚪',
                    default => 'ℹ️'
                };
                
                $statusClass = 'status-' . strtolower($log['status']);
                $amount = $log['amount'] ? '₦' . number_format($log['amount'], 2) : '-';
                $customer = $log['customer_email'] ? substr($log['customer_email'], 0, 20) . (strlen($log['customer_email']) > 20 ? '...' : '') : '-';
                
                echo "<tr>
                        <td><span class='icon'>{$icon}</span><span class='status-badge {$statusClass}'>{$log['status']}</span></td>
                        <td>{$log['event_type']}</td>
                        <td><span class='reference'>{$log['reference']}</span></td>
                        <td>{$amount}</td>
                        <td>{$customer}</td>
                        <td>{$log['received_at']}</td>
                      </tr>";
            }
            echo "</tbody></table>";
        }
    } catch (Exception $e) {
        echo "<div class='status' style='background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb;'>
                <strong>❌ Database Error</strong>
                <p>" . htmlspecialchars($e->getMessage()) . "</p>
              </div>";
    }

    echo "</div>
          <script>
              // Auto-refresh every 30 seconds
              setTimeout(function() {
                  window.location.reload();
              }, 30000);
          </script>
          </body>
          </html>";
    exit();
}

// Handle POST from Paystack
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config.php';

$payload = file_get_contents('php://input');
$signature = $_SERVER['HTTP_X_PAYSTACK_SIGNATURE'] ?? '';

if (empty($payload) || empty($signature)) {
    http_response_code(400);
    exit();
}

$computed = hash_hmac('sha512', $payload, PAYSTACK_SECRET);
if (!hash_equals($computed, $signature)) {
    error_log("Webhook signature verification failed");
    http_response_code(401);
    exit();
}

$data = json_decode($payload, true);
if (!$data || !isset($data['event'], $data['data'])) {
    http_response_code(400);
    exit();
}

$event = $data['event'];
$transaction = $data['data'];
$reference = $transaction['reference'] ?? 'unknown';
$metadata = $transaction['metadata'] ?? [];
$masterRef = $metadata['master_reference'] ?? null;
$amount = isset($transaction['amount']) ? ($transaction['amount'] / 100) : null;
$email = $transaction['customer']['email'] ?? null;

$status = match($event) {
    'charge.success' => 'success',
    'charge.failed' => 'failed',
    'charge.abandoned' => 'abandoned',
    default => 'unknown'
};

// Initialize database connection
try {
    $pdo = new PDO("mysql:host=" . DB_HOST . ";dbname=" . DB_NAME, DB_USER, DB_PASS);
    $pdo->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);

    // Create webhook_logs table if not exists
    $pdo->exec("
        CREATE TABLE IF NOT EXISTS webhook_logs (
            id INT AUTO_INCREMENT PRIMARY KEY,
            received_at DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
            event_type VARCHAR(50) NOT NULL,
            reference VARCHAR(255) NOT NULL,
            master_reference VARCHAR(255) NULL,
            status VARCHAR(50) NOT NULL,
            amount DECIMAL(10,2) NULL,
            customer_email VARCHAR(255) NULL,
            raw_payload LONGTEXT NOT NULL,
            signature_valid BOOLEAN NOT NULL DEFAULT TRUE,
            processed_at TIMESTAMP NULL,
            INDEX idx_reference (reference),
            INDEX idx_master_reference (master_reference),
            INDEX idx_status (status),
            INDEX idx_received_at (received_at)
        ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
    ");

    // Log webhook event
    $stmt = $pdo->prepare("
        INSERT INTO webhook_logs 
        (event_type, reference, master_reference, status, amount, customer_email, raw_payload, signature_valid) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ");
    $stmt->execute([$event, $reference, $masterRef, $status, $amount, $email, $payload, true]);

    // Update main payments table if master reference exists
    if ($masterRef) {
        // Update payment status
        $updatePayment = $pdo->prepare("
            UPDATE payments 
            SET payment_status = ?, completed_at = COALESCE(completed_at, NOW()), updated_at = NOW() 
            WHERE reference = ?
        ");
        $updatePayment->execute([$status, $masterRef]);

        // Mark webhook as processed
        $markProcessed = $pdo->prepare("UPDATE webhook_logs SET processed_at = NOW() WHERE reference = ?");
        $markProcessed->execute([$reference]);
    }

    // Send email notification on successful payment
    if ($event === 'charge.success' && $email && $masterRef && $amount) {
        sendReceiptEmailRequest($email, $masterRef, $amount);
    }

    error_log("Webhook processed successfully: Event={$event}, Reference={$reference}, Status={$status}");

} catch (Exception $e) {
    error_log("Webhook processing error: " . $e->getMessage());
    
    // Still respond with 200 to prevent Paystack retries for DB issues
    http_response_code(200);
    echo json_encode(['status' => 'error', 'message' => 'Database error', 'event' => $event]);
    exit();
}

http_response_code(200);
echo json_encode(['status' => 'received', 'event' => $event, 'reference' => $reference]);

/**
 * Send receipt email request to mail service
 */
function sendReceiptEmailRequest($toEmail, $reference, $amountNaira) {
    try {
        $amountStr = number_format((float)$amountNaira, 2);
        $dtFull = date('Y-m-d H:i:s');
        
        $emailData = [
            'email' => $toEmail,
            'reference' => $reference,
            'amount' => $amountStr,
            'date' => $dtFull,
            'currency' => 'NGN'
        ];

        // Build the full URL to send_mail.php
        $protocol = (isset($_SERVER['HTTPS']) && $_SERVER['HTTPS'] === 'on') ? 'https://' : 'http://';
        $host = $_SERVER['HTTP_HOST'] ?? 'localhost';
        $mailUrl = $protocol . $host . '/send_mail.php?mail=receipt';

        // Send POST request to mail service
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => $mailUrl,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($emailData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => false // For development
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($httpCode === 200) {
            error_log("Receipt email request sent successfully for {$toEmail}, Reference: {$reference}");
        } else {
            error_log("Failed to send receipt email request. HTTP Code: {$httpCode}, Error: {$error}");
        }
        
        return $httpCode === 200;
        
    } catch (Throwable $e) {
        error_log("Error sending receipt email request: " . $e->getMessage());
        return false;
    }
}
?>