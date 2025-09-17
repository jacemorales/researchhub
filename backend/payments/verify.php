<?php
ob_start();

// List of allowed origins
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app'
];

// Get the Origin header from the request
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';

// Send CORS headers
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} else {
    // For security, don't send any CORS headers if origin not allowed
    // The browser will block the request
}

// These headers must be sent regardless of origin
header("Access-Control-Allow-Methods: GET, POST, OPTIONS");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Credentials: true");

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] == 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Your existing PHP code below...
require_once __DIR__ . '/functions.php';

try {
    $reference = $_GET['reference'] ?? null;
    
    if (!$reference) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Payment reference is required'
        ]);
        ob_end_flush();
        exit;
    }

    if (empty(PAYSTACK_SECRET)) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Payment service not configured properly'
        ]);
        ob_end_flush();
        exit;
    }

    // Initialize cURL for Paystack verification
    $ch = curl_init("https://api.paystack.co/transaction/verify/" . rawurlencode($reference));
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
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Unable to verify payment status',
            'details' => $curlError ?: 'Connection failed'
        ]);
        ob_end_flush();
        exit;
    }

    $paystackData = json_decode($response, true);
    
    if ($paystackData === null) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Invalid verification response'
        ]);
        ob_end_flush();
        exit;
    }

    // Get our internal payment record by Paystack reference
    $paymentRecord = getPaymentByPaystackReference($reference);

    if (!empty($paystackData['status']) && $paystackData['status'] === true) {
        $transactionData = $paystackData['data'];
        $transactionStatus = strtolower($transactionData['status'] ?? 'unknown');
        
        if ($paymentRecord) {
            appendLogAndUpdateStatus(
                $paymentRecord['transaction_id'],
                $transactionStatus, 
                json_encode($transactionData), 
                false
            );
        }

        switch ($transactionStatus) {
            case 'success':
                if ($paymentRecord && isset($transactionData['customer']['email'])) {
                    $amountNaira = ($transactionData['amount'] ?? 0) / 100;
                    sendReceiptEmail(
                        $transactionData['customer']['email'], 
                        $reference, 
                        $amountNaira
                    );
                }
                
                echo json_encode([
                    'status' => 'success',
                    'payment_status' => 'success',
                    'data' => [
                        'reference' => $reference,
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
                        'reference' => $reference,
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
                        'reference' => $reference,
                        'message' => 'Payment is still being processed'
                    ]
                ]);
                break;
        }
    } else {
        $errorMessage = $paystackData['message'] ?? 'Unable to verify payment';
        
        if ($paymentRecord) {
            appendLogAndUpdateStatus(
                $paymentRecord['transaction_id'],
                'verification_failed', 
                $errorMessage, 
                false
            );
        }

        http_response_code($httpCode >= 400 ? $httpCode : 400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $errorMessage
        ]);
    }

} catch (Throwable $e) {
    error_log("Verify payment error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'type' => 'developer',
        'message' => 'An unexpected error occurred during verification',
        'details' => 'Please try again or contact support'
    ]);
}

ob_end_flush();
exit;