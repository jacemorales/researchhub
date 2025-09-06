<?php
ob_start();
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/functions.php';

try {
    $input = json_decode(file_get_contents('php://input'), true) ?? [];

    // Get and validate all required fields
    $email = filter_var($input['email'] ?? '', FILTER_VALIDATE_EMAIL);
    $amountInput = (float)($input['amount'] ?? 0);
    $paystackRef = $input['reference'] ?? null;
    $fileId = (int)($input['file_id'] ?? 0);
    $customerName = trim($input['customer_name'] ?? '');

    if (!$email || $amountInput <= 0 || !$paystackRef || $fileId <= 0 || empty($customerName)) {
        http_response_code(400);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Missing or invalid parameters'
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

    // Calculate final amount with fee
    $finalAmountNaira = ceil($amountInput * 1.015);
    
    // Create a new payment row
    $paymentRow = createPaymentRow($fileId, $customerName, $email, $finalAmountNaira, $paystackRef);
    
    if (!$paymentRow) {
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'developer',
            'message' => 'Database error occurred while creating payment record'
        ]);
        ob_end_flush();
        exit;
    }

    $transactionId = $paymentRow['transaction_id'];
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
            "Authorization: Bearer " . PAYSTACK_SECRET,
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

    if ($response === false) {
        appendLogAndUpdateStatus($transactionId, 'failed_init', "cURL Error: {$curlError}", false);
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

    $paystackData = json_decode($response, true);
    
    if ($paystackData === null) {
        appendLogAndUpdateStatus($transactionId, 'failed_init', 'Invalid JSON response from Paystack', false);
        http_response_code(500);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => 'Invalid response from payment service'
        ]);
        ob_end_flush();
        exit;
    }

    if (!empty($paystackData['status']) && $paystackData['status'] === true) {
        appendLogAndUpdateStatus($transactionId, 'initialized', 'Successfully sent to Paystack', false);
        
        echo json_encode([
            'status' => 'success',
            'data' => [
                'authorization_url' => $paystackData['data']['authorization_url'],
                'provider_reference' => $paystackRef,
                'transaction_id' => $transactionId,
                'amount_naira' => $finalAmountNaira
            ]
        ]);
    } else {
        $errorMessage = $paystackData['message'] ?? 'Payment initialization failed';
        $errorDetails = isset($paystackData['data']) ? json_encode($paystackData['data']) : null;
        appendLogAndUpdateStatus($transactionId, 'failed_init', $errorMessage, false);

        http_response_code($httpCode >= 400 ? $httpCode : 400);
        echo json_encode([
            'status' => 'error',
            'type' => 'paystack',
            'message' => $errorMessage,
            'details' => $errorDetails
        ]);
    }

} catch (Throwable $e) {
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