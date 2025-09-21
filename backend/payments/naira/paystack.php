<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Start output buffering
ob_start();

// Set CORS headers
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
    header("Access-Control-Allow-Credentials: true");
} else {
    header('Access-Control-Allow-Origin: *');
}

header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Include required files
require_once __DIR__ . '/../../vendor/autoload.php';
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../paymentStructure.php';

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

// Get the action parameter
$action = $_GET['action'] ?? '';

// Route based on action
switch ($action) {
    case 'initialize':
        handleInitialize();
        break;
    case 'verify':
        handleVerify();
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action parameter. Use action=initialize or action=verify'
        ]);
        break;
}

ob_end_flush();
exit;

/**
 * Handle payment initialization
 */
function handleInitialize() {
    // Only allow POST requests for payment initialization
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        http_response_code(405);
        echo json_encode([
            'status' => 'error',
            'message' => 'Method not allowed. Only POST requests are accepted for initialization.'
        ]);
        return;
    }

    try {
        // Get JSON input
        $rawInput = file_get_contents('php://input');
        $input = json_decode($rawInput, true);
        
        if (!$input) {
            throw new Exception('Invalid JSON input');
        }

        // Validate required fields
        $required_fields = ['email', 'amount', 'currency', 'current_payment_platform_reference', 'drive_file_id', 'customer_name', 'customer_phone', 'reference_stat'];
        foreach ($required_fields as $field) {
            if (!isset($input[$field]) || empty($input[$field])) {
                throw new Exception("Missing required field: {$field}");
            }
        }

        $email = trim($input['email']);
        $amount = (float) $input['amount'];
        $currency = trim($input['currency']);
        $platformRef = trim($input['current_payment_platform_reference']);
        $driveFileId = trim($input['drive_file_id']);
        $customerName = trim($input['customer_name']);
        $customerPhone = trim($input['customer_phone']);
        $masterRef = trim($input['reference_stat']);

        // Validate email
        if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
            throw new Exception('Invalid email address');
        }

        // Validate amount
        if ($amount <= 0) {
            throw new Exception('Invalid amount');
        }

        // Validate currency
        if (!in_array($currency, ['NGN', 'USD'])) {
            throw new Exception('Invalid currency');
        }

        // Calculate final amount (with 1.5% fee)
        $finalAmountNaira = ceil($amount * 1.015);
        
        // Convert amount to kobo (Paystack requirement)
        $amountInKobo = (int) ($finalAmountNaira * 100);

        // Check if PAYSTACK_SECRET is configured
        if (empty(PAYSTACK_SECRET)) {
            throw new Exception('Payment service not configured properly');
        }

        // Get current time for timestamps using config.php function
        $dt = getFormattedDateTime();
        $dtFull = $dt['full'];

        // Check if this is a new payment or retry
        $existingPayment = getPaymentByReference($masterRef);
        
        if ($existingPayment) {
            // This is a retry - update existing record and append attempt
            global $pdo;
            $updatePlatformRef = $pdo->prepare("UPDATE payments SET current_platform_reference = ?, updated_at = ? WHERE reference = ?");
            $updatePlatformRef->execute([$platformRef, $dtFull, $masterRef]);
            
            $appendSuccess = appendNewPaymentAttempt($masterRef, $platformRef, $email, $finalAmountNaira);
            if (!$appendSuccess) {
                throw new Exception('Failed to append payment attempt');
            }
        } else {
            // This is a new payment - create new record
            $paymentRecord = createPaymentRow($driveFileId, $customerName, $email, $customerPhone, $finalAmountNaira, $masterRef, $platformRef);
            if (!$paymentRecord) {
                throw new Exception('Failed to create payment record');
            }
        }

        // Build callback URL with master and platform references
        // This will be called by Paystack after payment completion
        $callbackUrl = (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . 
                      dirname($_SERVER['REQUEST_URI']) . '/paystack.php?action=verify&master_reference=' . 
                      urlencode($masterRef) . '&platform_reference=' . urlencode($platformRef);

        // Prepare Paystack transaction data with metadata
        $payload = [
            'email' => $email,
            'amount' => $amountInKobo,
            'currency' => $currency,
            'reference' => $platformRef,
            'callback_url' => $callbackUrl,
            'metadata' => [
                'master_reference' => $masterRef,
                'platform_reference' => $platformRef,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone,
                'drive_file_id' => $driveFileId
            ]
        ];

        // Initialize cURL
        $ch = curl_init('https://api.paystack.co/transaction/initialize');
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($payload),
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer " . PAYSTACK_SECRET,
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true,
            CURLOPT_FOLLOWLOCATION => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            appendLogAndUpdateStatus($masterRef, 'failed_init', "cURL Error: {$curlError}", false);
            throw new Exception('Unable to connect to payment service: ' . $curlError);
        }

        $paystackData = json_decode($response, true);

        if ($paystackData === null) {
            appendLogAndUpdateStatus($masterRef, 'failed_init', 'Invalid JSON response from Paystack', false);
            throw new Exception('Invalid response from payment service');
        }

        if (!empty($paystackData['status']) && $paystackData['status'] === true) {
            appendLogAndUpdateStatus($masterRef, 'initialized', 'Successfully sent to Paystack', false);
            
            // Return success response with authorization URL
            // The frontend will open this URL in a popup
            echo json_encode([
                'status' => 'success',
                'message' => 'Payment initialized successfully',
                'data' => [
                    'authorization_url' => $paystackData['data']['authorization_url'],
                    'reference' => $masterRef,
                    'platform_reference' => $platformRef,
                    'amount_naira' => $finalAmountNaira
                ]
            ]);
        } else {
            $errorMessage = $paystackData['message'] ?? 'Payment initialization failed';
            appendLogAndUpdateStatus($masterRef, 'failed_init', $errorMessage, false);
            throw new Exception($errorMessage);
        }

    } catch (Exception $e) {
        error_log("Paystack initialization error: " . $e->getMessage());
        
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $e->getMessage(),
            'details' => 'Payment initialization failed'
        ]);
    } catch (Throwable $e) {
        error_log("Unexpected error in initialization: " . $e->getMessage());
        
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Internal server error',
            'details' => 'An unexpected error occurred'
        ]);
    }
}

/**
 * Handle payment verification
 * This function is called in two scenarios:
 * 1. By Paystack's webhook/callback after payment completion
 * 2. By our frontend when the popup is closed (manual verification)
 */
function handleVerify() {
    try {
        $masterReference = $_GET['master_reference'] ?? null;
        $platformReference = $_GET['platform_reference'] ?? null;

        if (!$masterReference || !$platformReference) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'type' => 'developer',
                'message' => 'Both master_reference and platform_reference are required'
            ]);
            return;
        }

        if (empty(PAYSTACK_SECRET)) {
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'type' => 'developer',
                'message' => 'Payment service not configured properly'
            ]);
            return;
        }

        // Look up by MASTER reference
        $paymentRecord = getPaymentByReference($masterReference);

        if (!$paymentRecord) {
            http_response_code(404);
            echo json_encode([
                'status' => 'error',
                'type' => 'developer',
                'message' => 'Payment record not found'
            ]);
            return;
        }

        // Use platformReference to call Paystack for verification
        $paystackVerifyUrl = "https://api.paystack.co/transaction/verify/" . rawurlencode($platformReference);

        $ch = curl_init($paystackVerifyUrl);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                "Authorization: Bearer " . PAYSTACK_SECRET,
                "Content-Type: application/json"
            ],
            CURLOPT_TIMEOUT => 15,
            CURLOPT_CONNECTTIMEOUT => 10,
            CURLOPT_SSL_VERIFYPEER => true
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $curlError = curl_error($ch);
        curl_close($ch);

        if ($response === false) {
            appendLogAndUpdateStatus($masterReference, 'verification_failed', "cURL Error: {$curlError}", false);
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'type' => 'paystack',
                'message' => 'Unable to verify payment status',
                'details' => $curlError ?: 'Connection failed'
            ]);
            return;
        }

        $paystackData = json_decode($response, true);

        if ($paystackData === null) {
            appendLogAndUpdateStatus($masterReference, 'verification_failed', 'Invalid JSON from Paystack', false);
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'type' => 'paystack',
                'message' => 'Invalid verification response'
            ]);
            return;
        }

        if (!empty($paystackData['status']) && $paystackData['status'] === true) {
            $transactionData = $paystackData['data'];
            $transactionStatus = strtolower($transactionData['status'] ?? 'unknown');
            
            // Get current time using config.php function
            $dt = getFormattedDateTime();
            $dtFull = $dt['full'];
            
            // Update our record using MASTER reference
            appendLogAndUpdateStatus($masterReference, $transactionStatus, json_encode($transactionData), false);

            // Send webhook data to frontend if this is a direct verification call
            $webhookData = [
                'status' => 'success',
                'payment_status' => $transactionStatus,
                'data' => [
                    'reference' => $masterReference,
                    'platform_reference' => $platformReference,
                    'amount' => ($transactionData['amount'] ?? 0) / 100,
                    'currency' => $transactionData['currency'] ?? 'NGN',
                    'paid_at' => $transactionData['paid_at'] ?? null,
                    'customer' => $transactionData['customer'] ?? null,
                    'gateway_response' => $transactionData['gateway_response'] ?? null
                ]
            ];

            // Send to frontend via JavaScript postMessage
            echo '<script>
                if (window.opener && window.opener.handleWebhookResponse) {
                    window.opener.handleWebhookResponse(' . json_encode($webhookData) . ');
                    window.close();
                } else if (parent && parent.handleWebhookResponse) {
                    parent.handleWebhookResponse(' . json_encode($webhookData) . ');
                } else {
                    console.log("Payment result:", ' . json_encode($webhookData) . ');
                }
            </script>';

            switch ($transactionStatus) {
                case 'success':
                    if (isset($transactionData['customer']['email'])) {
                        $amountNaira = ($transactionData['amount'] ?? 0) / 100;
                        sendReceiptEmailRequest($transactionData['customer']['email'], $masterReference, $amountNaira);
                    }
                    break;
            }

        } else {
            $errorMessage = $paystackData['message'] ?? 'Unable to verify payment';
            appendLogAndUpdateStatus($masterReference, 'verification_failed', $errorMessage, false);

            $webhookData = [
                'status' => 'error',
                'payment_status' => 'failed',
                'data' => [
                    'reference' => $masterReference,
                    'platform_reference' => $platformReference,
                    'message' => $errorMessage
                ]
            ];

            echo '<script>
                if (window.opener && window.opener.handleWebhookResponse) {
                    window.opener.handleWebhookResponse(' . json_encode($webhookData) . ');
                    window.close();
                } else if (parent && parent.handleWebhookResponse) {
                    parent.handleWebhookResponse(' . json_encode($webhookData) . ');
                } else {
                    console.log("Payment error:", ' . json_encode($webhookData) . ');
                }
            </script>';
        }

    } catch (Throwable $e) {
        error_log("FATAL ERROR in verification: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
        
        $webhookData = [
            'status' => 'error',
            'payment_status' => 'failed',
            'data' => [
                'reference' => $masterReference ?? 'unknown',
                'platform_reference' => $platformReference ?? 'unknown',
                'message' => 'An unexpected error occurred during verification'
            ]
        ];

        echo '<script>
            if (window.opener && window.opener.handleWebhookResponse) {
                window.opener.handleWebhookResponse(' . json_encode($webhookData) . ');
                window.close();
            } else if (parent && parent.handleWebhookResponse) {
                parent.handleWebhookResponse(' . json_encode($webhookData) . ');
            } else {
                console.log("Payment error:", ' . json_encode($webhookData) . ');
            }
        </script>';
    }
}

/**
 * Get client information including device and user agent
 */
function getClientInfo() {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $device = (stripos($ua, 'mobile') !== false || stripos($ua, 'android') !== false || stripos($ua, 'iphone') !== false) ? 'Mobile' : 'Desktop';
    
    // Simple IP detection without validation
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';

    return compact('device', 'ua', 'ip');
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
        // Use getFormattedDateTime from config.php
        $dt = getFormattedDateTime();
        $dtFull = $dt['full'];
        
        $client = getClientInfo();
        $amountStr = number_format($amountNaira, 2, '.', '');

        $journey = getInitialPaymentJourney($customerEmail, $amountNaira);
        $journey['payment_journey']['payment_analytics']['unique_ips'][] = $client['ip'];
        $journey['payment_journey']['initialized_payments'][] = [
            'platform_reference' => $platformReference,
            'paystack_reference' => $platformReference, // ← Backward compatibility
            'amount' => $amountNaira,
            'email' => $customerEmail,
            'started_at' => $dtFull,
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [
                createLogEntry('first_attempt', $client['ip'], [
                    'platform_reference' => $platformReference,
                    'timestamp' => $dtFull
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
            $dtFull,
            null,
            json_encode($journey, JSON_UNESCAPED_UNICODE),
            $dtFull
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

        // Use getFormattedDateTime from config.php
        $dt = getFormattedDateTime();
        $dtFull = $dt['full'];
        
        $client = getClientInfo();

        // Add new payment attempt
        $journey['payment_journey']['initialized_payments'][] = [
            'platform_reference' => $platformReference,
            'paystack_reference' => $platformReference, // ← For backward compatibility
            'amount' => $amountNaira,
            'email' => $customerEmail,
            'started_at' => $dtFull,
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [
                createLogEntry('retry_attempt', $client['ip'], [
                    'platform_reference' => $platformReference,
                    'timestamp' => $dtFull
                ])
            ]
        ];

        // Update last_updated
        $journey['payment_journey']['payment_analytics']['last_updated'] = $dtFull;
        // Add IP to unique_ips if not already present
        if (!in_array($client['ip'], $journey['payment_journey']['payment_analytics']['unique_ips'])) {
            $journey['payment_journey']['payment_analytics']['unique_ips'][] = $client['ip'];
        }

        // Update DB
        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, updated_at = ? WHERE reference = ?");
        return $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $dtFull, $masterReference]);
        
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

        // Use getFormattedDateTime from config.php
        $dt = getFormattedDateTime();
        $dtFull = $dt['full'];
        
        $client = getClientInfo();

        $logEntry = createLogEntry('status_update', $client['ip'], [
            'status' => $status,
            'gateway_response' => is_string($gatewayResponse) ? $gatewayResponse : json_encode($gatewayResponse),
            'timestamp' => $dtFull
        ]);

        $payments = &$journey['payment_journey']['initialized_payments'];
        if (count($payments) > 0) {
            $payments[count($payments)-1]['logs'][] = $logEntry;
        }

        $journey['payment_journey']['payment_analytics']['last_updated'] = $dtFull;

        if ($status === 'success') {
            $journey['payment_journey']['successful_payment'] = [
                'platform_reference' => $payments[count($payments)-1]['platform_reference'] ?? null,
                'completed_at' => $dtFull,
                'final_amount' => $payments[count($payments)-1]['amount'] ?? 0
            ];
        }

        // Update payment record
        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, payment_status = ?, updated_at = ? WHERE reference = ?");
        $updateSuccess = $update->execute([json_encode($journey, JSON_UNESCAPED_UNICODE), $status, $dtFull, $masterReference]);

        // If success, also set completed_at
        if ($status === 'success') {
            $updateCompleted = $pdo->prepare("UPDATE payments SET completed_at = ? WHERE reference = ? AND completed_at IS NULL");
            $updateCompleted->execute([$dtFull, $masterReference]);
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
        } else {
            error_log("❌ NO RECORD found for reference: " . $reference);
        }
        
        return $result;
        
    } catch (Throwable $e) {
        error_log("🔥 ERROR in getPaymentByReference: " . $e->getMessage());
        return false;
    }
}

/**
 * Send receipt email request to mail service
 */
function sendReceiptEmailRequest($toEmail, $reference, $amountNaira) {
    try {
        $amountStr = number_format((float)$amountNaira, 2);
        $dt = getFormattedDateTime();
        $dtFull = $dt['full'];
        
        $emailData = [
            'email' => $toEmail,
            'reference' => $reference,
            'amount' => $amountStr,
            'date' => $dtFull
        ];

        // Send POST request to mail service
        $ch = curl_init();
        curl_setopt_array($ch, [
            CURLOPT_URL => '../../send_mail.php?mail=receipt',
            CURLOPT_POST => true,
            CURLOPT_POSTFIELDS => json_encode($emailData),
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => [
                'Content-Type: application/json'
            ],
            CURLOPT_TIMEOUT => 10
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode === 200) {
            error_log("Receipt email request sent successfully to mail service for {$toEmail}");
        } else {
            error_log("Failed to send receipt email request to mail service. HTTP Code: {$httpCode}");
        }
        
        return $httpCode === 200;
        
    } catch (Throwable $e) {
        error_log("Error sending receipt email request: " . $e->getMessage());
        return false;
    }
}
?>