<?php
ob_start();
header('Content-Type: application/json; charset=utf-8');
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

    // Initialize cURL for Paystack verification
    $ch = curl_init("https://api.paystack.co/transaction/verify/{$reference}");
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_HTTPHEADER => [
            "Authorization: Bearer {$_ENV['PAYSTACK_SECRET']}",
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

    // Check for cURL errors
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

    // Parse Paystack response
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
        
        // Update our internal record if we have it
        if ($paymentRecord) {
            appendLogAndUpdateStatus(
                $paymentRecord['reference'], 
                $transactionStatus, 
                json_encode($transactionData), 
                false
            );
        }

        switch ($transactionStatus) {
            case 'success':
                // Send receipt email if successful
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
                echo json_encode([
                    'status' => 'success',
                    'payment_status' => 'failed',
                    'data' => [
                        'reference' => $reference,
                        'gateway_response' => $transactionData['gateway_response'] ?? 'Payment failed'
                    ]
                ]);
                break;

            case 'abandoned':
                echo json_encode([
                    'status' => 'success',
                    'payment_status' => 'abandoned',
                    'data' => [
                        'reference' => $reference,
                        'message' => 'Payment was abandoned'
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
        // Paystack returned an error
        $errorMessage = $paystackData['message'] ?? 'Unable to verify payment';
        
        // Log the verification failure if we have the payment record
        if ($paymentRecord) {
            appendLogAndUpdateStatus(
                $paymentRecord['reference'], 
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
    // Handle any unexpected errors
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