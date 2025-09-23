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
        // This is for the browser redirect from Paystack
        handleVerify();
        break;
    case 'poll_verify':
        // This is for the frontend polling
        handlePollVerify();
        break;
    default:
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'message' => 'Invalid action parameter. Use action=initialize, action=verify, or action=poll_verify'
        ]);
        break;
}

ob_end_flush();
exit;

/**
 * Handle polling verification from the frontend
 */
function handlePollVerify() {
    header('Content-Type: application/json');
    $reference = $_GET['reference'] ?? null;

    if (!$reference) {
        http_response_code(400);
        echo json_encode(['success' => false, 'error' => 'Reference is required.']);
        return;
    }

    try {
        $payment = getPaymentByReference($reference);
        if (!$payment) {
            http_response_code(404);
            echo json_encode(['success' => false, 'error' => 'Payment not found.']);
            return;
        }

        // If status is already final, just return it.
        if ($payment['payment_status'] !== 'pending') {
            echo json_encode(['success' => true, 'data' => ['payment_status' => $payment['payment_status']]]);
            return;
        }

        // If still pending, verify with Paystack
        $ch = curl_init("https://api.paystack.co/transaction/verify/" . rawurlencode($reference));
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_HTTPHEADER => ["Authorization: Bearer " . PAYSTACK_SECRET, "Cache-Control: no-cache"],
        ]);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        curl_close($ch);

        if ($err) {
            // Don't throw an error, just return the current pending status. The poller will try again.
            echo json_encode(['success' => true, 'data' => ['payment_status' => 'pending']]);
            return;
        }

        $result = json_decode($response, true);
        if (isset($result['data']) && isset($result['data']['status'])) {
            $paystackStatus = $result['data']['status'];
            // Update our DB
            appendLogAndUpdateStatus($reference, $paystackStatus, $result);
            // Return the new status
            echo json_encode(['success' => true, 'data' => ['payment_status' => mapGeneralPaymentStatus($paystackStatus)]]);
        } else {
            // Paystack might have returned an error, just return pending for now.
            echo json_encode(['success' => true, 'data' => ['payment_status' => 'pending']]);
        }

    } catch (Throwable $e) {
        error_log("Error in handlePollVerify: " . $e->getMessage());
        http_response_code(500);
        echo json_encode(['success' => false, 'error' => 'An internal error occurred.']);
    }
}

/**
 * Handle payment initialization
 */
function handleInitialize() {
    // Only allow POST requests for payment initialization
    if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
        header('Content-Type: application/json');
        http_response_code(405);
        echo json_encode([
            'status' => 'error',
            'message' => 'Method not allowed. Only POST requests are accepted for initialization.'
        ]);
        return;
    }

    header('Content-Type: application/json');
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
        } else {
            // This is a new payment - create new record
            $paymentRecord = createPaymentRow($driveFileId, $customerName, $email, $customerPhone, $finalAmountNaira, $masterRef, $platformRef, 'paystack', 'NGN');
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
            $targetOrigin = '*'; // Use a specific origin in production for security
            echo '<script>
                const message = {
                    type: "payment_response",
                    payload: ' . json_encode($webhookData) . '
                };
                if (window.opener) {
                    window.opener.postMessage(message, ' . json_encode($targetOrigin) . ');
                    window.close();
                } else if (parent) {
                    parent.postMessage(message, ' . json_encode($targetOrigin) . ');
                } else {
                    console.log("Payment result (no opener/parent to post message to):", message);
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

            $targetOrigin = '*'; // Use a specific origin in production for security
            echo '<script>
                const message = {
                    type: "payment_response",
                    payload: ' . json_encode($webhookData) . '
                };
                if (window.opener) {
                    window.opener.postMessage(message, ' . json_encode($targetOrigin) . ');
                    window.close();
                } else if (parent) {
                    parent.postMessage(message, ' . json_encode($targetOrigin) . ');
                } else {
                    console.log("Payment error (no opener/parent to post message to):", message);
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

        $targetOrigin = '*'; // Use a specific origin in production for security
        echo '<script>
            const message = {
                type: "payment_response",
                payload: ' . json_encode($webhookData) . '
            };
            if (window.opener) {
                window.opener.postMessage(message, ' . json_encode($targetOrigin) . ');
                window.close();
            } else if (parent) {
                parent.postMessage(message, ' . json_encode($targetOrigin) . ');
            } else {
                console.log("Payment error (no opener/parent to post message to):", message);
            }
        </script>';
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