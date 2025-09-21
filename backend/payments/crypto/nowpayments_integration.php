<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);

// Set CORS headers first, before any output
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');
header('Content-Type: application/json');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Now include other files
require_once __DIR__ . '/../../config.php';

class NowPaymentsIntegration {
    private $apiKey;
    private $ipnSecret;
    private $baseUrl = 'https://api.nowpayments.io/v1';

    public function __construct() {
        $this->apiKey = NOWPAYMENTS_API_KEY;
        $this->ipnSecret = NOWPAYMENTS_IPN_SECRET;
        
        if (empty($this->apiKey)) {
            throw new Exception('NowPayments API key not configured');
        }
    }

    /**
     * Create a crypto payment
     */
    public function createPayment($amount, $currency, $metadata = []) {
        try {
            $reference = 'NOWPAY_' . uniqid() . '_' . date('YmdHis');
            
            // Get available cryptocurrencies
            $cryptoCurrencies = $this->getAvailableCurrencies();
            if (!$cryptoCurrencies['success']) {
                throw new Exception('Failed to get available cryptocurrencies');
            }

            // Use Bitcoin as default crypto currency
            $cryptoCurrency = 'btc';
            if (!in_array($cryptoCurrency, $cryptoCurrencies['data'])) {
                $cryptoCurrency = $cryptoCurrencies['data'][0] ?? 'btc';
            }

            // Create payment
            $paymentData = [
                'price_amount' => $amount,
                'price_currency' => strtolower($currency),
                'pay_currency' => $cryptoCurrency,
                'order_id' => $reference,
                'order_description' => $metadata['description'] ?? 'Academic File Purchase',
                'ipn_callback_url' => NOWPAYMENTS_CALLBACK_URL,
                'case' => 'success',
                'case_type' => 'url'
            ];

            $response = $this->makeRequest('POST', '/payment', $paymentData);

            if ($response['success']) {
                return [
                    'success' => true,
                    'reference' => $reference,
                    'payment_id' => $response['data']['payment_id'],
                    'pay_amount' => $response['data']['pay_amount'],
                    'pay_currency' => $response['data']['pay_currency'],
                    'payment_url' => $response['data']['payment_url'],
                    'payment_status' => $response['data']['payment_status']
                ];
            } else {
                throw new Exception($response['error'] ?? 'Payment creation failed');
            }

        } catch (Exception $e) {
            error_log("NowPayments payment creation error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get payment status
     */
    public function getPaymentStatus($paymentId) {
        try {
            $response = $this->makeRequest('GET', "/payment/{$paymentId}");

            if ($response['success']) {
                return [
                    'success' => true,
                    'status' => $response['data']['payment_status'],
                    'amount' => $response['data']['price_amount'],
                    'currency' => $response['data']['price_currency'],
                    'pay_amount' => $response['data']['pay_amount'],
                    'pay_currency' => $response['data']['pay_currency'],
                    'payment_id' => $response['data']['payment_id']
                ];
            } else {
                throw new Exception($response['error'] ?? 'Failed to get payment status');
            }

        } catch (Exception $e) {
            error_log("NowPayments status check error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Get available cryptocurrencies
     */
    public function getAvailableCurrencies() {
        try {
            $response = $this->makeRequest('GET', '/currencies');

            if ($response['success']) {
                return [
                    'success' => true,
                    'data' => $response['data']['currencies'] ?? []
                ];
            } else {
                throw new Exception($response['error'] ?? 'Failed to get currencies');
            }

        } catch (Exception $e) {
            error_log("NowPayments currencies error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Handle IPN (Instant Payment Notification)
     */
    public function handleIPN($payload, $signature) {
        try {
            // Verify IPN signature
            if (!$this->verifyIPNSignature($payload, $signature)) {
                throw new Exception('Invalid IPN signature');
            }

            $data = json_decode($payload, true);
            if (!$data) {
                throw new Exception('Invalid IPN payload');
            }

            $paymentId = $data['payment_id'] ?? '';
            $status = $data['payment_status'] ?? '';
            $orderId = $data['order_id'] ?? '';

            if (empty($paymentId) || empty($orderId)) {
                throw new Exception('Missing required IPN fields');
            }

            // Update payment status in database
            $this->updatePaymentStatus($orderId, $status, $data);

            return [
                'success' => true,
                'message' => 'IPN handled successfully'
            ];

        } catch (Exception $e) {
            error_log("NowPayments IPN error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Process payment with NowPayments
     */
    public function processPayment($paymentData) {
        try {
            // Validate required fields
            $requiredFields = ['amount', 'currency', 'customer_name', 'customer_email', 'drive_file_id'];
            foreach ($requiredFields as $field) {
                if (empty($paymentData[$field])) {
                    throw new Exception("Missing required field: {$field}");
                }
            }

            // Generate reference
            $reference = 'NOWPAY_' . uniqid() . '_' . date('YmdHis');

            // Create payment record in database
            $pdo = getPDOConnection();
            $stmt = $pdo->prepare("
                INSERT INTO payments (
                    reference, drive_file_id, customer_name, customer_email, 
                    customer_phone, amount, currency, payment_method, 
                    payment_status, admin_status, started_at, transaction_logs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'nowpayments', 'pending', 'pending', NOW(), ?)
            ");

            $metadata = [
                'reference' => $reference,
                'customer_name' => $paymentData['customer_name'],
                'customer_email' => $paymentData['customer_email'],
                'drive_file_id' => $paymentData['drive_file_id'],
                //'description' => "Purchase: {$paymentData['file_name'] ?? 'Academic File'}"
            ];

            $stmt->execute([
                $reference,
                $paymentData['drive_file_id'],
                $paymentData['customer_name'],
                $paymentData['customer_email'],
                $paymentData['customer_phone'] ?? '',
                $paymentData['amount'],
                strtolower($paymentData['currency']),
                json_encode($metadata)
            ]);

            // Create NowPayments payment
            $result = $this->createPayment(
                $paymentData['amount'],
                $paymentData['currency'],
                $metadata
            );

            if ($result['success']) {
                // Update payment record with NowPayments data
                $stmt = $pdo->prepare("
                    UPDATE payments 
                    SET transaction_logs = JSON_SET(
                        COALESCE(transaction_logs, '{}'),
                        '$.nowpayments_payment_id', ?,
                        '$.nowpayments_pay_amount', ?,
                        '$.nowpayments_pay_currency', ?,
                        '$.nowpayments_payment_url', ?,
                        '$.nowpayments_status', ?
                    )
                    WHERE reference = ?
                ");
                
                $stmt->execute([
                    $result['payment_id'],
                    $result['pay_amount'],
                    $result['pay_currency'],
                    $result['payment_url'],
                    $result['payment_status'],
                    $reference
                ]);

                return [
                    'success' => true,
                    'reference' => $reference,
                    'payment_id' => $result['payment_id'],
                    'payment_url' => $result['payment_url'],
                    'pay_amount' => $result['pay_amount'],
                    'pay_currency' => $result['pay_currency']
                ];
            } else {
                throw new Exception($result['error']);
            }

        } catch (Exception $e) {
            error_log("NowPayments payment processing error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Verify payment status
     */
    public function verifyPayment($reference) {
        try {
            $pdo = getPDOConnection();
            $stmt = $pdo->prepare("
                SELECT transaction_logs, payment_status 
                FROM payments 
                WHERE reference = ? AND payment_method = 'nowpayments'
            ");
            $stmt->execute([$reference]);
            $payment = $stmt->fetch();

            if (!$payment) {
                return [
                    'success' => false,
                    'error' => 'Payment not found'
                ];
            }

            $logs = json_decode($payment['transaction_logs'], true);
            $paymentId = $logs['nowpayments_payment_id'] ?? '';

            if (empty($paymentId)) {
                return [
                    'success' => false,
                    'error' => 'Payment ID not found'
                ];
            }

            // Get payment status from NowPayments
            $result = $this->getPaymentStatus($paymentId);

            if ($result['success']) {
                // Update payment status if changed
                $newStatus = $this->mapNowPaymentsStatus($result['status']);
                
                if ($newStatus !== $payment['payment_status']) {
                    $stmt = $pdo->prepare("
                        UPDATE payments 
                        SET payment_status = ?,
                            transaction_logs = JSON_SET(
                                COALESCE(transaction_logs, '{}'),
                                '$.nowpayments_status', ?,
                                '$.verified_at', NOW()
                            )
                        WHERE reference = ?
                    ");
                    $stmt->execute([$newStatus, $result['status'], $reference]);
                }

                return [
                    'success' => true,
                    'status' => $newStatus,
                    'amount' => $result['amount'],
                    'currency' => $result['currency'],
                    'pay_amount' => $result['pay_amount'],
                    'pay_currency' => $result['pay_currency']
                ];
            } else {
                return $result;
            }

        } catch (Exception $e) {
            error_log("NowPayments payment verification error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Make API request to NowPayments
     */
    private function makeRequest($method, $endpoint, $data = null) {
        $url = $this->baseUrl . $endpoint;
        
        $headers = [
            'x-api-key: ' . $this->apiKey,
            'Content-Type: application/json'
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $url);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);
        curl_setopt($ch, CURLOPT_TIMEOUT, 30);
        curl_setopt($ch, CURLOPT_SSL_VERIFYPEER, true);

        if ($method === 'POST' && $data) {
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
        }

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        $error = curl_error($ch);
        curl_close($ch);

        if ($error) {
            throw new Exception("CURL Error: {$error}");
        }

        if ($httpCode >= 400) {
            throw new Exception("HTTP Error: {$httpCode}");
        }

        $decodedResponse = json_decode($response, true);
        
        if (json_last_error() !== JSON_ERROR_NONE) {
            throw new Exception("Invalid JSON response");
        }

        return [
            'success' => true,
            'data' => $decodedResponse
        ];
    }

    /**
     * Verify IPN signature
     */
    private function verifyIPNSignature($payload, $signature) {
        if (empty($this->ipnSecret)) {
            return true; // Skip verification if no secret configured
        }

        $expectedSignature = hash_hmac('sha512', $payload, $this->ipnSecret);
        return hash_equals($expectedSignature, $signature);
    }

    /**
     * Update payment status in database
     */
    private function updatePaymentStatus($orderId, $status, $data) {
        try {
            $pdo = getPDOConnection();
            
            $newStatus = $this->mapNowPaymentsStatus($status);
            
            $stmt = $pdo->prepare("
                UPDATE payments 
                SET payment_status = ?,
                    transaction_logs = JSON_SET(
                        COALESCE(transaction_logs, '{}'),
                        '$.ipn_data', ?,
                        '$.ipn_received_at', NOW()
                    )
                WHERE reference = ?
            ");
            
            $stmt->execute([
                $newStatus,
                json_encode($data),
                $orderId
            ]);

            error_log("NowPayments IPN processed: {$orderId} -> {$newStatus}");

        } catch (Exception $e) {
            error_log("Error updating payment status from IPN: " . $e->getMessage());
        }
    }

    /**
     * Map NowPayments status to our payment status
     */
    private function mapNowPaymentsStatus($nowpaymentsStatus) {
        switch (strtolower($nowpaymentsStatus)) {
            case 'finished':
            case 'confirmed':
                return 'completed';
            case 'waiting':
            case 'confirming':
                return 'pending';
            case 'failed':
            case 'refunded':
            case 'expired':
                return 'failed';
            default:
                return 'pending';
        }
    }
}

// Handle API requests
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    header('Content-Type: application/json');
    
    try {
        $input = json_decode(file_get_contents('php://input'), true);
        
        if (!$input || !isset($input['action'])) {
            throw new Exception('Invalid request data');
        }
        
        $nowpayments = new NowPaymentsIntegration();
        
        switch ($input['action']) {
            case 'create_payment':
                $result = $nowpayments->processPayment($input);
                echo json_encode($result);
                break;
                
            case 'verify_payment':
                if (!isset($input['reference'])) {
                    throw new Exception('Reference is required');
                }
                $result = $nowpayments->verifyPayment($input['reference']);
                echo json_encode($result);
                break;
                
            case 'get_currencies':
                $result = $nowpayments->getAvailableCurrencies();
                echo json_encode($result);
                break;
                
            case 'ipn':
                $payload = file_get_contents('php://input');
                $signature = $_SERVER['HTTP_X_NOWPAYMENTS_SIG'] ?? '';
                $result = $nowpayments->handleIPN($payload, $signature);
                echo json_encode($result);
                break;
                
            default:
                throw new Exception('Unknown action');
        }
        
    } catch (Exception $e) {
        http_response_code(400);
        echo json_encode([
            'success' => false,
            'error' => $e->getMessage()
        ]);
    }
    exit;
}
?>
