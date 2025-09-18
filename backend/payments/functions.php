<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/paymentStructure.php';
require_once __DIR__ . '/../config.php';

// Initialize PDO connection
$pdo = null;
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $options = [
        PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
        PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
        PDO::ATTR_EMULATE_PREPARES => false,
        PDO::MYSQL_ATTR_INIT_COMMAND => "SET NAMES utf8mb4"
    ];
    $pdo = new PDO($dsn, DB_USER, DB_PASS, $options);
} catch (Throwable $e) {
    error_log("Database connection failed: " . $e->getMessage());
    $pdo = null;
}

/**
 * Format date as "Mon, 12th Jan 2025"
 */
function formatDateHuman($timestamp = null) {
    $dt = new DateTime($timestamp ?? 'now');
    $day = $dt->format('j');
    $suffix = match (true) {
        $day % 10 == 1 && $day != 11 => 'st',
        $day % 10 == 2 && $day != 12 => 'nd',
        $day % 10 == 3 && $day != 13 => 'rd',
        default => 'th'
    };
    return $dt->format('D, ') . $day . $suffix . $dt->format(' M Y');
}

/**
 * Format time as "10:57:11 PM"
 */
function formatTimeHuman($timestamp = null) {
    $dt = new DateTime($timestamp ?? 'now');
    return $dt->format('h:i:s A');
}

/**
 * Get both formatted date and time
 */
function getFormattedDateTime($timestamp = null) {
    return [
        'date_human' => formatDateHuman($timestamp),
        'time_human' => formatTimeHuman($timestamp),
        'full' => formatDateHuman($timestamp) . ' at ' . formatTimeHuman($timestamp)
    ];
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
            // FIXED URL — no trailing spaces!
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
 * Create a new payment row in the database (first attempt)
 */
function createPaymentRow($driveFileId, $customerName, $customerEmail, $customerPhone, $amountNaira, $masterReference, $platformReference = null) {
    global $pdo;
    
    if (!$pdo) {
        error_log("Database not available for payment row creation");
        return false;
    }

    try {
        $dt = getFormattedDateTime();
        $client = getClientInfo(false);
        $amountStr = number_format($amountNaira, 2, '.', '');

        $journey = getInitialPaymentJourney($customerEmail, $amountNaira);
        $journey['payment_journey']['payment_analytics']['unique_ips'][] = $client['ip'];
        $journey['payment_journey']['initialized_payments'][] = [
            'platform_reference' => $platformReference,
            'paystack_reference' => $platformReference, // ← Backward compatibility
            'amount' => $amountNaira,
            'email' => $customerEmail,
            'started_at' => $dt['full'],
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [
                createLogEntry('first_attempt', $client['ip'], $client['location'], [
                    'platform_reference' => $platformReference,
                    'timestamp' => $dt['full']
                ])
            ]
        ];

        $stmt = $pdo->prepare("
            INSERT INTO payments (
                drive_file_id, customer_name, customer_email, customer_phone, amount, currency, payment_method,
                reference, current_platform_reference, payment_status, admin_status, 
                started_at, completed_at, transaction_logs, updated_at
            ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $success = $stmt->execute([
            $driveFileId,
            $customerName,
            $customerEmail,
            $customerPhone,
            $amountStr,
            'NGN',
            'paystack',
            $masterReference,                     // ← reference
            $platformReference,                   // ← current_platform_reference
            'pending',
            'pending',
            $dt['full'],
            null,
            json_encode($journey, JSON_UNESCAPED_UNICODE),
            $dt['full']
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
        error_log("Error in createPaymentRow: " . $e->getMessage());
        return false;
    }
}

/**
 * Append a new payment attempt to existing payment record
 */
function appendNewPaymentAttempt($masterReference, $platformReference, $customerEmail, $amountNaira) {
    global $pdo;
    
    if (!$pdo) {
        error_log("Database not available for appending payment attempt");
        return false;
    }

    try {
        $stmt = $pdo->prepare("SELECT transaction_logs FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$masterReference]);
        $row = $stmt->fetch();

        if (!$row) {
            error_log("Cannot append attempt — payment record not found for reference: {$masterReference}");
            return false;
        }

        $journey = json_decode($row['transaction_logs'], true);
        if (!is_array($journey)) {
            error_log("Invalid transaction logs for reference: {$masterReference}");
            return false;
        }

        $dt = getFormattedDateTime();
        $client = getClientInfo(false);

        // Add new payment attempt
        $journey['payment_journey']['initialized_payments'][] = [
            'platform_reference' => $platformReference,
            'paystack_reference' => $platformReference, // ← For backward compatibility
            'amount' => $amountNaira,
            'email' => $customerEmail,
            'started_at' => $dt['full'],
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [
                createLogEntry('retry_attempt', $client['ip'], $client['location'], [
                    'platform_reference' => $platformReference,
                    'timestamp' => $dt['full']
                ])
            ]
        ];

        // Update last_updated
        $journey['payment_journey']['payment_analytics']['last_updated'] = $dt['full'];
        // Add IP to unique_ips if not already present
        if (!in_array($client['ip'], $journey['payment_journey']['payment_analytics']['unique_ips'])) {
            $journey['payment_journey']['payment_analytics']['unique_ips'][] = $client['ip'];
        }

        // Update DB
        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, updated_at = ? WHERE reference = ?");
        return $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $dt['full'], $masterReference]);
        
    } catch (Throwable $e) {
        error_log("Error in appendNewPaymentAttempt: " . $e->getMessage());
        return false;
    }
}

/**
 * Append log entry and update payment status
 */
function appendLogAndUpdateStatus($masterReference, $status, $gatewayResponse = '', $skipGeo = true) {
    global $pdo;
    
    if (!$pdo) {
        error_log("Database not available for status update");
        return false;
    }

    try {
        $stmt = $pdo->prepare("SELECT transaction_logs FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$masterReference]);
        $row = $stmt->fetch();

        if (!$row) {
            error_log("Payment record not found for reference: {$masterReference}");
            return false;
        }

        $journey = json_decode($row['transaction_logs'], true);
        if (!is_array($journey)) {
            error_log("Invalid transaction logs JSON for reference: {$masterReference}");
            return false;
        }

        $dt = getFormattedDateTime();
        $client = getClientInfo($skipGeo);

        $logEntry = createLogEntry('status_update', $client['ip'], $client['location'], [
            'status' => $status,
            'gateway_response' => is_string($gatewayResponse) ? $gatewayResponse : json_encode($gatewayResponse),
            'timestamp' => $dt['full']
        ]);

        $payments = &$journey['payment_journey']['initialized_payments'];
        if (count($payments) > 0) {
            $payments[count($payments)-1]['logs'][] = $logEntry;
        }

        $journey['payment_journey']['payment_analytics']['last_updated'] = $dt['full'];

        if ($status === 'success') {
            $journey['payment_journey']['successful_payment'] = [
                'platform_reference' => $payments[count($payments)-1]['platform_reference'] ?? null,
                'completed_at' => $dt['full'],
                'final_amount' => $payments[count($payments)-1]['amount'] ?? 0
            ];
        }

        // Update payment record
        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, payment_status = ?, updated_at = ? WHERE reference = ?");
        $updateSuccess = $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $status, $dt['full'], $masterReference]);

        // If success, also set completed_at
        if ($status === 'success') {
            $updateCompleted = $pdo->prepare("UPDATE payments SET completed_at = ? WHERE reference = ? AND completed_at IS NULL");
            $updateCompleted->execute([$dt['full'], $masterReference]);
        }

        return $updateSuccess;
        
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
        error_log("❌ getPaymentByReference: PDO not initialized");
        return false;
    }
    
    try {
        error_log("🔍 getPaymentByReference called with reference: " . $reference);
        
        $stmt = $pdo->prepare("SELECT * FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$reference]);
        
        $result = $stmt->fetch();
        
        if ($result) {
            error_log("✅ FOUND payment record for reference: " . $reference);
            error_log("📋 Record: " . json_encode($result, JSON_UNESCAPED_UNICODE));
        } else {
            error_log("❌ NO RECORD found for reference: " . $reference);
            
            // DEBUG: Check if ANY records exist
            $test = $pdo->query("SELECT COUNT(*) as total FROM payments");
            $count = $test->fetch()['total'] ?? 0;
            error_log("📊 Total records in payments table: " . $count);
            
            // DEBUG: Show first 3 records to verify structure
            $sample = $pdo->query("SELECT reference FROM payments LIMIT 3");
            $samples = $sample->fetchAll();
            error_log("🧪 Sample references: " . json_encode($samples));
        }
        
        return $result;
        
    } catch (Throwable $e) {
        error_log("🔥 ERROR in getPaymentByReference: " . $e->getMessage());
        error_log("StackTrace: " . $e->getTraceAsString());
        return false;
    }
}

/**
 * Send receipt email to customer
 */
function sendReceiptEmail($toEmail, $reference, $amountNaira, $fileUrl = null) {
    try {
        $amountStr = number_format((float)$amountNaira, 2);
        $dt = getFormattedDateTime();
        
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
                <span class="detail-label">Date & Time:</span>
                <span class="detail-value">{$dt['full']}</span>
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
        $headers .= "From: " . MAIL_FROM_NAME . " <" . MAIL_FROM_ADDRESS . ">\r\n";
        $headers .= "Reply-To: " . MAIL_FROM_ADDRESS . "\r\n";
        
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