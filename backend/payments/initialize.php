<?php
ob_start();

// DEBUG: Enable maximum error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// DEBUG: Log script start
error_log("=== PAYMENT INITIALIZATION STARTED ===");
error_log("Request Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'NO_ORIGIN'));

// CORS Setup
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app'
];

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    error_log("CORS BLOCKED: Origin not allowed - $origin");
}

header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization, Cache-Control"); 
header("Access-Control-Allow-Credentials: true");

if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

require_once __DIR__ . '/functions.php';

try {
    // DEBUG: Log raw input
    $rawInput = file_get_contents('php://input');
    error_log("RAW INPUT: " . $rawInput);

    $input = json_decode($rawInput, true) ?? [];
    error_log("PARSED INPUT: " . json_encode($input));

    // Validate fields
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $amountInput = (float)($input['amount'] ?? 0);
    $platformRef = $input['current_payment_platform_reference'] ?? null; // ← PS_... or STRIPE_...
    $masterRef = $input['reference_stat'] ?? null;                       // ← RESEARCH_HUB_... (master)
    $driveFileId = $input['drive_file_id'] ?? null;
    $customerName = trim($input['customer_name'] ?? '');
    $customerPhone = trim($input['customer_phone'] ?? '');

    error_log("VALIDATED - Email: " . ($email ?: 'INVALID'), 0);
    error_log("VALIDATED - Amount: $amountInput", 0);
    error_log("VALIDATED - Platform Reference: " . ($platformRef ?: 'MISSING'), 0);
    error_log("VALIDATED - Master Reference: " . ($masterRef ?: 'MISSING'), 0);
    error_log("VALIDATED - Drive File ID: " . ($driveFileId ?: 'MISSING'), 0);
    error_log("VALIDATED - Customer Name: " . ($customerName ?: 'EMPTY'), 0);
    error_log("VALIDATED - Customer Phone: " . ($customerPhone ?: 'EMPTY'), 0);

    if (!$email || $amountInput <= 0 || !$platformRef || !$masterRef || !$driveFileId || empty($customerName)|| empty($customerPhone)) {
        error_log("VALIDATION FAILED: Missing or invalid parameters");
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Missing or invalid parameters',
            'debug' => [
                'email' => $email,
                'amount' => $amountInput,
                'current_payment_platform_reference' => $platformRef,
                'reference_stat' => $masterRef,
                'drive_file_id' => $driveFileId,
                'customer_name' => $customerName,
                'customer_phone' => $customerPhone
            ]
        ]);
        ob_end_flush();
        exit;
    }

    if (empty(PAYSTACK_SECRET)) {
        error_log("CONFIG ERROR: PAYSTACK_SECRET is empty");
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Payment service not configured properly',
            'debug' => 'PAYSTACK_SECRET missing'
        ]);
        ob_end_flush();
        exit;
    }

    $finalAmountNaira = ceil($amountInput * 1.015);
    error_log("CALCULATED FINAL AMOUNT: $finalAmountNaira Naira");

    // Get current time for timestamps
    $dtFull = getFormattedDateTime()['full'];

    // Check if master record exists
    $paymentRow = getPaymentByReference($masterRef);

    if (!$paymentRow) {
        // First attempt — create master record WITH platform reference
        error_log("FIRST ATTEMPT: Creating new master payment record for: $masterRef");
        $paymentRow = createPaymentRow($driveFileId, $customerName, $customerPhone, $email, $finalAmountNaira, $masterRef, $platformRef);
        
        if (!$paymentRow) {
            error_log("DATABASE ERROR: Failed to create master payment record");
            http_response_code(500);
            echo json_encode([
                'status' => 'error',
                'type' => 'developer',
                'message' => 'Database error occurred while creating payment record',
                'debug' => 'createPaymentRow returned false'
            ]);
            ob_end_flush();
            exit;
        }
    } else {
        // Update existing record — set new platform reference
        error_log("UPDATING: Setting new platform reference for: $masterRef");
        global $pdo;
        $updatePlatformRef = $pdo->prepare("UPDATE payments SET current_platform_reference = ?, updated_at = ? WHERE reference = ?");
        $updatePlatformRef->execute([$platformRef, $dtFull, $masterRef]);
        
        // Append new attempt to logs
        appendNewPaymentAttempt($masterRef, $platformRef, $email, $finalAmountNaira);
    }

    $amountKobo = $finalAmountNaira * 100;

    // Build Paystack payload — Send platformRef to Paystack
    $callbackUrl = (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/verify.php?master_reference=' . urlencode($masterRef) . '&platform_reference=' . urlencode($platformRef);
    $payload = http_build_query([
        'email' => $email,
        'amount' => $amountKobo,
        'reference' => $platformRef, // ← Platform-specific reference
        'callback_url' => $callbackUrl
    ]);

    error_log("PAYSTACK PAYLOAD: " . $payload);

    // Initialize cURL — FIXED URL
    $ch = curl_init('https://api.paystack.co/transaction/initialize');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer " . PAYSTACK_SECRET,
            "Content-Type: application/x-www-form-urlencoded"
        ],
        CURLOPT_TIMEOUT => 15,
        CURLOPT_CONNECTTIMEOUT => 10,
        CURLOPT_SSL_VERIFYPEER => true,
        CURLOPT_FOLLOWLOCATION => true
    ]);

    error_log("SENDING REQUEST TO PAYSTACK...");

    $response = curl_exec($ch);
    $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    $curlError = curl_error($ch);
    curl_close($ch);

    error_log("PAYSTACK RESPONSE CODE: $httpCode");
    error_log("PAYSTACK RAW RESPONSE: " . substr($response, 0, 500));

    if ($response === false) {
        error_log("CURL ERROR: $curlError");
        appendLogAndUpdateStatus($masterRef, 'failed_init', "cURL Error: {$curlError}", false);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Unable to connect to payment service',
            'details' => $curlError ?: 'Connection failed',
            'debug' => 'cURL failed'
        ]);
        ob_end_flush();
        exit;
    }

    $paystackData = json_decode($response, true);

    if ($paystackData === null) {
        error_log("JSON DECODE FAILED: Invalid response from Paystack");
        appendLogAndUpdateStatus($masterRef, 'failed_init', 'Invalid JSON response from Paystack', false);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Invalid response from payment service',
            'debug' => 'JSON decode failed',
            'raw_response' => $response
        ]);
        ob_end_flush();
        exit;
    }

    if (!empty($paystackData['status']) && $paystackData['status'] === true) {
        appendLogAndUpdateStatus($masterRef, 'initialized', 'Successfully sent to Paystack', false);
        
        error_log("SUCCESS: Payment initialized with Paystack");
        echo json_encode([
            'status' => 'success',
            'data' => [
                'authorization_url' => $paystackData['data']['authorization_url'],
                'reference' => $masterRef,                    // ← Return MASTER reference
                'platform_reference' => $platformRef,        // ← Return platform reference
                'amount_naira' => $finalAmountNaira
            ]
        ]);
    } else {
        $errorMessage = $paystackData['message'] ?? 'Payment initialization failed';
        $errorDetails = isset($paystackData['data']) ? json_encode($paystackData['data']) : null;
        appendLogAndUpdateStatus($masterRef, 'failed_init', $errorMessage, false);

        error_log("PAYSTACK ERROR: $errorMessage");
        http_response_code($httpCode >= 400 ? $httpCode : 400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $errorMessage,
            'details' => $errorDetails,
            'debug' => 'Paystack returned error status',
            'paystack_response' => $paystackData
        ]);
    }

} catch (Throwable $e) {
    error_log("FATAL ERROR: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    error_log("STACK TRACE: " . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'type' => 'developer',
        'message' => 'An unexpected error occurred',
        'details' => $e->getMessage(),
        'debug' => [
            'file' => $e->getFile(),
            'line' => $e->getLine(),
            'trace' => $e->getTraceAsString()
        ]
    ]);
}

ob_end_flush();
exit;