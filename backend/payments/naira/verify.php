<?php
ob_start();

// DEBUG: Enable maximum error reporting
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// DEBUG: Log script start
error_log("=== PAYMENT VERIFICATION STARTED ===");
error_log("Request Method: " . ($_SERVER['REQUEST_METHOD'] ?? 'UNKNOWN'));
error_log("Origin: " . ($_SERVER['HTTP_ORIGIN'] ?? 'NO_ORIGIN'));
error_log("GET Parameters: " . json_encode($_GET));

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
    $masterReference = $_GET['master_reference'] ?? null;
    $platformReference = $_GET['platform_reference'] ?? null;

    error_log("VERIFY - Received master_reference: " . ($masterReference ?: 'MISSING'));
    error_log("VERIFY - Received platform_reference: " . ($platformReference ?: 'MISSING'));

    if (!$masterReference || !$platformReference) {
        error_log("VERIFY - ERROR: Missing master_reference or platform_reference");
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Both master_reference and platform_reference are required',
            'debug' => [
                'master_reference' => $masterReference,
                'platform_reference' => $platformReference
            ]
        ]);
        ob_end_flush();
        exit;
    }

    if (empty(PAYSTACK_SECRET)) {
        error_log("VERIFY - CONFIG ERROR: PAYSTACK_SECRET is empty");
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

    // Look up by MASTER reference
    error_log("VERIFY - Looking up payment record by master reference: $masterReference");
    $paymentRecord = getPaymentByReference($masterReference);

    if (!$paymentRecord) {
        error_log("VERIFY - WARNING: No local payment record found for master reference: $masterReference");
        http_response_code(404);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Payment record not found',
            'debug' => 'No record in database'
        ]);
        ob_end_flush();
        exit;
    }

    error_log("VERIFY - Found payment record: " . json_encode($paymentRecord, JSON_UNESCAPED_UNICODE));

    // ✅ Use platformReference FROM FRONTEND to call Paystack
    error_log("VERIFY - Using platform reference from frontend to verify: " . $platformReference);
    $paystackVerifyUrl = "https://api.paystack.co/transaction/verify/" . rawurlencode($platformReference);
    error_log("VERIFY - Calling Paystack URL: " . $paystackVerifyUrl);

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

    error_log("VERIFY - Paystack HTTP Code: $httpCode");
    error_log("VERIFY - Paystack Raw Response: " . substr($response, 0, 500));

    if ($response === false) {
        error_log("VERIFY - CURL ERROR: $curlError");
        appendLogAndUpdateStatus($masterReference, 'verification_failed', "cURL Error: {$curlError}", false);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Unable to verify payment status',
            'details' => $curlError ?: 'Connection failed',
            'debug' => 'cURL failed'
        ]);
        ob_end_flush();
        exit;
    }

    $paystackData = json_decode($response, true);

    if ($paystackData === null) {
        error_log("VERIFY - JSON DECODE FAILED");
        appendLogAndUpdateStatus($masterReference, 'verification_failed', 'Invalid JSON from Paystack', false);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Invalid verification response',
            'debug' => 'JSON decode failed',
            'raw_response' => $response
        ]);
        ob_end_flush();
        exit;
    }

    error_log("VERIFY - Paystack Response Data: " . json_encode($paystackData, JSON_UNESCAPED_UNICODE));

    if (!empty($paystackData['status']) && $paystackData['status'] === true) {
        $transactionData = $paystackData['data'];
        $transactionStatus = strtolower($transactionData['status'] ?? 'unknown');
        
        error_log("VERIFY - Paystack reports status: $transactionStatus");

        // Update our record using MASTER reference
        appendLogAndUpdateStatus($masterReference, $transactionStatus, json_encode($transactionData), false);

        switch ($transactionStatus) {
            case 'success':
                if (isset($transactionData['customer']['email'])) {
                    $amountNaira = ($transactionData['amount'] ?? 0) / 100;
                    error_log("VERIFY - Sending receipt to: " . $transactionData['customer']['email']);
                    sendReceiptEmail($transactionData['customer']['email'], $masterReference, $amountNaira);
                }
                
                echo json_encode([
                    'status' => 'success',
                    'payment_status' => 'success',
                    'data' => [
                        'reference' => $masterReference,
                        'platform_reference' => $platformReference,
                        'amount' => $transactionData['amount'] ?? 0,
                        'currency' => $transactionData['currency'] ?? 'NGN',
                        'paid_at' => $transactionData['paid_at'] ?? null,
                        'customer' => $transactionData['customer'] ?? null,
                        'gateway_response' => $transactionData['gateway_response'] ?? null
                    ]
                ]);
                break;

            case 'failed':
            case 'abandoned':
                echo json_encode([
                    'status' => 'success',
                    'payment_status' => $transactionStatus,
                    'data' => [
                        'reference' => $masterReference,
                        'platform_reference' => $platformReference,
                        'message' => $transactionData['gateway_response'] ?? 'Payment was not completed'
                    ]
                ]);
                break;

            case 'pending':
            default:
                echo json_encode([
                    'status' => 'pending',
                    'payment_status' => 'pending',
                    'data' => [
                        'reference' => $masterReference,
                        'platform_reference' => $platformReference,
                        'message' => 'Payment is still being processed'
                    ]
                ]);
                break;
        }
    } else {
        $errorMessage = $paystackData['message'] ?? 'Unable to verify payment';
        error_log("VERIFY - Paystack returned error: $errorMessage");

        appendLogAndUpdateStatus($masterReference, 'verification_failed', $errorMessage, false);

        http_response_code($httpCode >= 400 ? $httpCode : 400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $errorMessage,
            'debug' => [
                'http_code' => $httpCode,
                'paystack_response' => $paystackData
            ]
        ]);
    }

} catch (Throwable $e) {
    error_log("FATAL ERROR in verify.php: " . $e->getMessage() . " in " . $e->getFile() . " on line " . $e->getLine());
    error_log("STACK TRACE: " . $e->getTraceAsString());

    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'type' => 'developer',
        'message' => 'An unexpected error occurred during verification',
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