<?php
require_once __DIR__ . '/vendor/autoload.php';
require_once __DIR__ . '/paymentStructure.php';

use Dotenv\Dotenv;

// Load environment variables
try {
    $dotenv = Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Throwable $e) {
    // Environment file not found or not readable
    error_log("Environment file could not be loaded: " . $e->getMessage());
}

// Database configuration
$DB_HOST = $_ENV['DB_HOST'];
$DB_PORT = $_ENV['DB_PORT'];
$DB_NAME = $_ENV['DB_NAME'];
$DB_USER = $_ENV['DB_USER'];
$DB_PASS = $_ENV['DB_PASS'];
$PAYSTACK_SECRET = $_ENV['PAYSTACK_SECRET'];

// Email configuration
$MAIL_FROM_ADDRESS = $_ENV['MAIL_FROM_ADDRESS'] ?? 'noreply@researchhub.com';
$MAIL_FROM_NAME = $_ENV['MAIL_FROM_NAME'] ?? 'Research Hub';

// Initialize PDO connection
$pdo = null;
try {
    $dsn = "mysql:host={$DB_HOST};port={$DB_PORT};dbname={$DB_NAME};charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];
    $pdo = new PDO($dsn, $DB_USER, $DB_PASS, $options);
} catch (Throwable $e) {
    error_log("Database connection failed: " . $e->getMessage());
    $pdo = null;
}

/**
 * Get client information including IP, device, and location
 */
function getClientInfo($skipGeo = true) {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $device = (stripos($ua, 'mobile') !== false || stripos($ua, 'android') !== false || stripos($ua, 'iphone') !== false) ? 'Mobile' : 'Desktop';
    
    // Get real IP address
    $ip = '0.0.0.0';
    if (!empty($_SERVER['HTTP_X_FORWARDED_FOR'])) {
        $ips = explode(',', $_SERVER['HTTP_X_FORWARDED_FOR']);
        $ip = trim($ips[0]);
    } elseif (!empty($_SERVER['HTTP_CLIENT_IP'])) {
        $ip = $_SERVER['HTTP_CLIENT_IP'];
    } elseif (!empty($_SERVER['REMOTE_ADDR'])) {
        $ip = $_SERVER['REMOTE_ADDR'];
    }

    // Validate IP address
    if (!filter_var($ip, FILTER_VALIDATE_IP)) {
        $ip = '0.0.0.0';
    }

    $location = 'N/A';

    if (!$skipGeo && $ip !== '0.0.0.0' && !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
        try {
            $url = "https://ipapi.co/{$ip}/json/";
            $ctx = stream_context_create([
                'http' => [
                    'timeout' => 5,
                    'user_agent' => 'Research Hub Payment System/1.0'
                ]
            ]);
            $raw = @file_get_contents($url, false, $ctx);
            
            if ($raw) {
                $data = json_decode($raw, true);
                if (!empty($data) && !isset($data['error'])) {
                    $city = $data['city'] ?? '';
                    $country = $data['country_name'] ?? '';
                    $location = trim("{$city}, {$country}", " ,");
                    if (empty($location)) $location = 'Unknown';
                }
            }
        } catch (Throwable $e) {
            error_log("Geolocation lookup failed: " . $e->getMessage());
        }
    }

    return compact('device', 'ua', 'ip', 'location');
}

/**
 * Generate a unique reference for payments - simplified format
 */
function makeReference() {
    try {
        $rand = bin2hex(random_bytes(6)); // 12 chars
    } catch (Throwable $e) {
        $rand = substr(md5(uniqid('', true)), 0, 12);
    }
    // Simplified format: RESEARCH_HUB_TIMESTAMP_RANDOM
    return "RESEARCH_HUB_" . strtoupper($rand);
}

/**
 * Create or get existing payment row
 */
function createOrGetPaymentRow($activeReferenceSession, $email, $amountNaira, $paystackRef) {
    global $pdo;
    
    if (!$pdo) {
        error_log("Database not available for payment row creation");
        return false;
    }

    try {
        // Check for existing payment with this activeReferenceSession
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$activeReferenceSession]);
        $existing = $stmt->fetch();

        if ($existing) {
            // Update existing payment journey
            $journey = json_decode($existing['transaction_logs'], true);
            if (!is_array($journey)) {
                $journey = getInitialPaymentJourney($email, $amountNaira);
            }
            
            $journey['payment_journey']['payment_analytics']['total_retry_attempts']++;
            $journey['payment_journey']['payment_analytics']['last_updated'] = date('Y-m-d H:i:s');

            $client = getClientInfo(false);
            $ip = $client['ip'];
            
            if (!in_array($ip, $journey['payment_journey']['payment_analytics']['unique_ips'])) {
                $journey['payment_journey']['payment_analytics']['unique_ips'][] = $ip;
            }

            $journey['payment_journey']['initialized_payments'][] = [
                'paystack_reference' => $paystackRef,
                'amount' => $amountNaira,
                'email' => $email,
                'started_at' => date('Y-m-d H:i:s'),
                'device' => $client['device'],
                'initial_ip' => $ip,
                'logs' => [
                    createLogEntry('retry_initiated', $ip, $client['location'], [
                        'paystack_reference' => $paystackRef,
                        'retry_count' => $journey['payment_journey']['payment_analytics']['total_retry_attempts']
                    ])
                ]
            ];

            $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, current_status = 'pending' WHERE id = ?");
            $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $existing['id']]);
            
            return $existing;
        }

        // Create new payment record
        $client = getClientInfo(false);
        $amountStr = number_format($amountNaira, 2, '.', '');

        $journey = getInitialPaymentJourney($email, $amountNaira);
        $journey['payment_journey']['payment_analytics']['unique_ips'][] = $client['ip'];

        $journey['payment_journey']['initialized_payments'][] = [
            'paystack_reference' => $paystackRef,
            'amount' => $amountNaira,
            'email' => $email,
            'started_at' => date('Y-m-d H:i:s'),
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [
                createLogEntry('first_attempt', $client['ip'], $client['location'], [
                    'paystack_reference' => $paystackRef
                ])
            ]
        ];

        $insert = $pdo->prepare("INSERT INTO payments (reference, amount, email, current_status, started_at, transaction_logs) VALUES (?, ?, ?, 'pending', ?, ?)");
        $success = $insert->execute([
            $activeReferenceSession,  // Use activeReferenceSession as the main reference
            $amountStr,
            $email,
            date('Y-m-d H:i:s'),
            json_encode($journey, JSON_UNESCAPED_UNICODE)
        ]);

        if (!$success) {
            error_log("Failed to insert payment record");
            return false;
        }

        $id = $pdo->lastInsertId();
        $select = $pdo->prepare("SELECT * FROM payments WHERE id = ? LIMIT 1");
        $select->execute([$id]);
        
        return $select->fetch();
        
    } catch (Throwable $e) {
        error_log("Error in createOrGetPaymentRow: " . $e->getMessage());
        return false;
    }
}

/**
 * Append log entry and update payment status
 */
function appendLogAndUpdateStatus($reference, $status, $gatewayResponse = '', $skipGeo = true) {
    global $pdo;
    
    if (!$pdo) {
        error_log("Database not available for status update");
        return false;
    }

    try {
        $stmt = $pdo->prepare("SELECT transaction_logs FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$reference]);
        $row = $stmt->fetch();

        if (!$row) {
            error_log("Payment record not found for reference: {$reference}");
            return false;
        }

        $journey = json_decode($row['transaction_logs'], true);
        if (!is_array($journey)) {
            error_log("Invalid transaction logs JSON for reference: {$reference}");
            return false;
        }

        $client = getClientInfo($skipGeo);

        $logEntry = createLogEntry('status_update', $client['ip'], $client['location'], [
            'status' => $status,
            'gateway_response' => is_string($gatewayResponse) ? $gatewayResponse : json_encode($gatewayResponse),
            'timestamp' => date('Y-m-d H:i:s')
        ]);

        // Add log to the most recent payment initialization
        $payments = &$journey['payment_journey']['initialized_payments'];
        if (count($payments) > 0) {
            $payments[count($payments)-1]['logs'][] = $logEntry;
        }

        $journey['payment_journey']['payment_analytics']['last_updated'] = date('Y-m-d H:i:s');

        // Update successful payment if status is success
        if ($status === 'success') {
            $journey['payment_journey']['successful_payment'] = [
                'paystack_reference' => $payments[count($payments)-1]['paystack_reference'] ?? null,
                'completed_at' => date('Y-m-d H:i:s'),
                'final_amount' => $payments[count($payments)-1]['amount'] ?? 0
            ];
        }

        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, current_status = ? WHERE reference = ?");
        return $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $status, $reference]);
        
    } catch (Throwable $e) {
        error_log("Error in appendLogAndUpdateStatus: " . $e->getMessage());
        return false;
    }
}

/**
 * Get payment record by reference
 */
function getPaymentByReference($reference) {
    global $pdo;
    
    if (!$pdo) {
        return false;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$reference]);
        return $stmt->fetch();
    } catch (Throwable $e) {
        error_log("Error getting payment by reference: " . $e->getMessage());
        return false;
    }
}

/**
 * Get payment record by Paystack reference
 */
function getPaymentByPaystackReference($paystackRef) {
    global $pdo;
    
    if (!$pdo) {
        return false;
    }
    
    try {
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE transaction_logs LIKE ? LIMIT 1");
        $stmt->execute(["%\"paystack_reference\":\"{$paystackRef}\"%"]);
        return $stmt->fetch();
    } catch (Throwable $e) {
        error_log("Error getting payment by Paystack reference: " . $e->getMessage());
        return false;
    }
}

/**
 * Send receipt email to customer
 */
function sendReceiptEmail($toEmail, $reference, $amountNaira, $fileUrl = null) {
    global $MAIL_FROM_ADDRESS, $MAIL_FROM_NAME;

    try {
        $amountStr = number_format((float)$amountNaira, 2);
        $dateStr = date('Y-m-d H:i:s');
        
        $html = <<<HTML
<!doctype html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Payment Receipt</title>
    <style>
        body { font-family: Arial, sans-serif; margin: 0; padding: 20px; background: #f5f7fb; }
        .card { 
            background: #fff; 
            max-width: 640px; 
            margin: 0 auto; 
            border-radius: 8px; 
            padding: 24px; 
            box-shadow: 0 6px 20px rgba(0,0,0,0.06); 
        }
        .header { 
            display: flex; 
            align-items: center; 
            gap: 12px; 
            margin-bottom: 20px;
            border-bottom: 2px solid #eee;
            padding-bottom: 20px;
        }
        .logo { 
            width: 50px; 
            height: 50px; 
            border-radius: 8px; 
            background: #6777ef; 
            color: #fff; 
            display: flex; 
            align-items: center; 
            justify-content: center; 
            font-weight: 700;
            font-size: 18px;
        }
        .header-text h2 { 
            margin: 0; 
            font-size: 20px; 
            color: #222; 
        }
        .meta { 
            color: #666; 
            font-size: 14px; 
            margin-top: 4px; 
        }
        .amount { 
            font-size: 32px; 
            color: #47c363; 
            font-weight: 700; 
            margin: 20px 0;
            text-align: center;
        }
        .details {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 6px;
            margin: 20px 0;
        }
        .detail-row {
            display: flex;
            justify-content: space-between;
            margin: 8px 0;
            padding: 4px 0;
        }
        .detail-label {
            font-weight: 600;
            color: #555;
        }
        .detail-value {
            color: #333;
        }
        .footer {
            text-align: center;
            margin-top: 30px;
            padding-top: 20px;
            border-top: 1px solid #eee;
            color: #666;
            font-size: 13px;
        }
        .success-badge {
            background: #47c363;
            color: white;
            padding: 6px 12px;
            border-radius: 20px;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
        }
    </style>
</head>
<body>
    <div class="card">
        <div class="header">
            <div class="logo">RH</div>
            <div class="header-text">
                <h2>Payment Receipt</h2>
                <div class="meta">
                    <span class="success-badge">✓ Successful</span>
                </div>
            </div>
        </div>
        
        <div class="amount">₦ {$amountStr}</div>
        
        <div class="details">
            <div class="detail-row">
                <span class="detail-label">Reference:</span>
                <span class="detail-value"><strong>{$reference}</strong></span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Date:</span>
                <span class="detail-value">{$dateStr}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Email:</span>
                <span class="detail-value">{$toEmail}</span>
            </div>
            <div class="detail-row">
                <span class="detail-label">Status:</span>
                <span class="detail-value" style="color: #47c363; font-weight: 600;">Completed</span>
            </div>
        </div>
        
        <div class="footer">
            <p>Thank you for your payment to Research Hub.</p>
            <p>If you have any questions, please contact our support team.</p>
        </div>
    </div>
</body>
</html>
HTML;

        $subject = "Payment Receipt - {$reference}";
        $headers = "MIME-Version: 1.0\r\n";
        $headers .= "Content-type: text/html; charset=UTF-8\r\n";
        $headers .= "From: {$MAIL_FROM_NAME} <{$MAIL_FROM_ADDRESS}>\r\n";
        $headers .= "Reply-To: {$MAIL_FROM_ADDRESS}\r\n";
        
        $success = @mail($toEmail, $subject, $html, $headers);
        
        if ($success) {
            error_log("Receipt email sent successfully to {$toEmail} for {$reference}");
        } else {
            error_log("Failed to send receipt email to {$toEmail} for {$reference}");
        }
        
        return $success;
        
    } catch (Throwable $e) {
        error_log("Error sending receipt email: " . $e->getMessage());
        return false;
    }
}