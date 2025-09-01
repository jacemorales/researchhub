<?php
ob_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/functions.php';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $amountInput = (float)($input['amount'] ?? 0);
    $paystackRef = $input['reference'] ?? null;
    $referenceStat = $input['reference_stat'] ?? null;

    // Validate required fields
    if (!$email) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Invalid email address provided'
        ]);
        ob_end_flush();
        exit;
    }

    if ($amountInput <= 0) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Invalid amount provided'
        ]);
        ob_end_flush();
        exit;
    }

    if (!$paystackRef || !$referenceStat) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Missing reference parameters'
        ]);
        ob_end_flush();
        exit;
    }

    // Check if Paystack secret is configured
    if (empty($_ENV['PAYSTACK_SECRET'])) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Payment service not configured properly'
        ]);
        ob_end_flush();
        exit;
    }

    // Calculate final amount with fee
    $finalAmountNaira = ceil($amountInput * 1.015);
    
    // Create or get payment row
    $paymentRow = createOrGetPaymentRow($referenceStat, $email, $finalAmountNaira, $paystackRef);
    
    if (!$paymentRow) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Database error occurred'
        ]);
        ob_end_flush();
        exit;
    }

    $ourReference = $paymentRow['reference'];
    $amountKobo = $finalAmountNaira * 100;

    // Prepare payload for Paystack
    $payload = http_build_query([
        'email' => $email,
        'amount' => $amountKobo,
        'reference' => $paystackRef,
        'callback_url' => (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . dirname($_SERVER['REQUEST_URI']) . '/index.php?reference=' . urlencode($paystackRef)
    ]);

    // Initialize cURL
    $ch = curl_init('https://api.paystack.co/transaction/initialize');
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $payload,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$_ENV['PAYSTACK_SECRET']}",
            "Content-Type: application/x-www-form-urlencoded"
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

    // Check for cURL errors
    if ($response === false) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Unable to connect to payment service',
            'details' => $curlError ?: 'Connection failed'
        ]);
        ob_end_flush();
        exit;
    }

    // Parse Paystack response
    $paystackData = json_decode($response, true);
    
    if ($paystackData === null) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Invalid response from payment service'
        ]);
        ob_end_flush();
        exit;
    }

    // Check if initialization was successful
    if (!empty($paystackData['status']) && $paystackData['status'] === true) {
        // Log successful initialization
        appendLogAndUpdateStatus($ourReference, 'initialized', 'Successfully sent to Paystack', false);
        
        echo json_encode([
            'status' => 'success',
            'data' => [
                'authorization_url' => $paystackData['data']['authorization_url'],
                'reference' => $paystackRef,
                'amount_naira' => $finalAmountNaira,
                'our_reference' => $ourReference
            ]
        ]);
    } else {
        // Handle Paystack error
        $errorMessage = $paystackData['message'] ?? 'Payment initialization failed';
        $errorDetails = null;
        
        if (isset($paystackData['data']) && is_array($paystackData['data'])) {
            $errorDetails = json_encode($paystackData['data']);
        }

        // Log failed initialization
        appendLogAndUpdateStatus($ourReference, 'failed_init', $errorMessage, false);

        http_response_code($httpCode >= 400 ? $httpCode : 400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $errorMessage,
            'details' => $errorDetails
        ]);
    }

} catch (Throwable $e) {
    // Handle any unexpected errors
    error_log("Initialize payment error: " . $e->getMessage());
    
    http_response_code(500);
    echo json_encode([
        'status' => 'error',
        'type' => 'developer',
        'message' => 'An unexpected error occurred',
        'details' => 'Please try again or contact support'
    ]);
}

ob_end_flush();
exit;