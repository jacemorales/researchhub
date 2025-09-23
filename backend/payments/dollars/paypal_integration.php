<?php
// Enable error reporting for debugging
error_reporting(E_ALL);
ini_set('display_errors', 1);
ini_set('log_errors', 1);

// Set headers
require_once __DIR__ . '/../../config.php';
require_once __DIR__ . '/../paymentStructure.php';
header('Access-Control-Allow-Methods: POST, GET, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization');

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

class PayPalIntegration {
    private $clientId;
    private $clientSecret;
    private $apiBaseUrl;

    public function __construct() {
        $this->clientId = PAYPAL_CLIENT_ID;
        $this->clientSecret = PAYPAL_CLIENT_SECRET;
        $this->apiBaseUrl = (PAYPAL_MODE === 'live') 
            ? 'https://api.paypal.com' 
            : 'https://api.sandbox.paypal.com';

        if (empty($this->clientId) || empty($this->clientSecret)) {
            throw new Exception('PayPal API credentials are not configured.');
        }
    }

    private function getAccessToken() {
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->apiBaseUrl . '/v1/oauth2/token');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_USERPWD, $this->clientId . ':' . $this->clientSecret);
        curl_setopt($ch, CURLOPT_POSTFIELDS, 'grant_type=client_credentials');
        $headers = ['Accept: application/json', 'Accept-Language: en_US'];
        curl_setopt($ch, CURLOPT_HTTPHEADER, $headers);

        $result = curl_exec($ch);
        if (curl_errno($ch)) {
            throw new Exception('Error getting access token: ' . curl_error($ch));
        }
        curl_close($ch);

        $data = json_decode($result, true);
        if (!isset($data['access_token'])) {
            throw new Exception('Failed to get PayPal access token.');
        }
        return $data['access_token'];
    }

    public function createOrder($amount, $currency, $metadata) {
        $accessToken = $this->getAccessToken();
        
        $payload = [
            'intent' => 'CAPTURE',
            'purchase_units' => [[
                'amount' => [
                    'currency_code' => strtoupper($currency),
                    'value' => number_format($amount, 2, '.', '')
                ],
                'description' => 'Academic File Purchase',
                'custom_id' => $metadata['master_reference'] ?? ''
            ]],
            'application_context' => [
                'return_url' => (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'] . '?action=capture&master_ref=' . urlencode($metadata['master_reference']),
                'cancel_url' => (isset($_SERVER['HTTPS']) ? 'https://' : 'http://') . $_SERVER['HTTP_HOST'] . $_SERVER['PHP_SELF'] . '?action=cancel&master_ref=' . urlencode($metadata['master_reference']),
                'brand_name' => 'ResearchHub',
                'user_action' => 'PAY_NOW',
            ]
        ];

        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->apiBaseUrl . '/v2/checkout/orders');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $accessToken
        ]);
        
        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        $data = json_decode($result, true);

        if ($httpCode >= 300) {
            throw new Exception($data['message'] ?? 'Failed to create PayPal order.');
        }
        
        return $data;
    }
    
    public function captureOrder($orderId) {
        $accessToken = $this->getAccessToken();
        
        $ch = curl_init();
        curl_setopt($ch, CURLOPT_URL, $this->apiBaseUrl . '/v2/checkout/orders/' . $orderId . '/capture');
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, 1);
        curl_setopt($ch, CURLOPT_POST, 1);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $accessToken
        ]);

        $result = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);
        
        $data = json_decode($result, true);

        if ($httpCode >= 300) {
            throw new Exception($data['message'] ?? 'Failed to capture PayPal order.');
        }
        
        return $data;
    }
}

// Main request handler
$action = $_GET['action'] ?? '';
$input = json_decode(file_get_contents('php://input'), true);

if (empty($action) && !empty($input)) {
    $action = 'initialize';
}

$paypal = new PayPalIntegration();
$pdo = getPDOConnection();

switch ($action) {
    case 'initialize':
        header('Content-Type: application/json');
        try {
            $required_fields = ['email', 'amount', 'currency', 'drive_file_id', 'customer_name', 'reference_stat'];
            foreach ($required_fields as $field) {
                if (empty($input[$field])) {
                    throw new Exception("Missing required field: {$field}");
                }
            }

            $masterRef = $input['reference_stat'];
            $platformRef = 'PAYPAL_' . $masterRef . '_' . time();

            // Create or update payment record
            $existingPayment = getPaymentByReference($masterRef);
            if ($existingPayment) {
                $updateStmt = $pdo->prepare("UPDATE payments SET current_platform_reference = ? WHERE reference = ?");
                $updateStmt->execute([$platformRef, $masterRef]);
            } else {
                createPaymentRow($input['drive_file_id'], $input['customer_name'], $input['email'], $input['customer_phone'] ?? '', $input['amount'], $masterRef, $platformRef, 'paypal');
            }

            $metadata = [
                'master_reference' => $masterRef,
                'platform_reference' => $platformRef,
                'customer_name' => $input['customer_name'],
                'drive_file_id' => $input['drive_file_id']
            ];

            $order = $paypal->createOrder($input['amount'], $input['currency'], $metadata);
            
            $approveLink = '';
            foreach ($order['links'] as $link) {
                if ($link['rel'] === 'approve') {
                    $approveLink = $link['href'];
                    break;
                }
            }

            if (empty($approveLink)) {
                throw new Exception('Could not find PayPal approval link.');
            }

            // Update DB with PayPal Order ID
            appendLogAndUpdateStatus($masterRef, 'initialized', ['paypal_order_id' => $order['id']]);

            echo json_encode([
                'status' => 'success',
                'message' => 'PayPal order created successfully.',
                'data' => [
                    'authorization_url' => $approveLink,
                    'reference' => $masterRef,
                    'platform_reference' => $platformRef
                ]
            ]);

        } catch (Exception $e) {
            http_response_code(400);
            echo json_encode([
                'status' => 'error',
                'type' => 'paypal',
                'message' => $e->getMessage()
            ]);
        }
        break;

    case 'capture':
        $orderId = $_GET['token'] ?? null;
        $masterRef = $_GET['master_ref'] ?? null;
        $webhookData = [];

        try {
            if (!$orderId || !$masterRef) {
                throw new Exception('Missing order token or master reference.');
            }
            
            $captureData = $paypal->captureOrder($orderId);
            $status = strtolower($captureData['status'] ?? 'unknown');

            if ($status === 'completed') {
                appendLogAndUpdateStatus($masterRef, 'success', $captureData);
                $webhookData = [
                    'payment_status' => 'success',
                    'data' => [
                        'reference' => $masterRef,
                        'amount' => $captureData['purchase_units'][0]['payments']['captures'][0]['amount']['value'],
                        'paid_at' => $captureData['purchase_units'][0]['payments']['captures'][0]['create_time']
                    ]
                ];
            } else {
                appendLogAndUpdateStatus($masterRef, 'failed', $captureData);
                throw new Exception('Payment not completed. Status: ' . $status);
            }
        } catch (Exception $e) {
            if ($masterRef) {
                appendLogAndUpdateStatus($masterRef, 'failed', ['error' => $e->getMessage()]);
            }
            $webhookData = [
                'payment_status' => 'failed',
                'data' => [
                    'reference' => $masterRef,
                    'message' => $e->getMessage()
                ]
            ];
        }
        
        // Use postMessage to notify frontend
        $targetOrigin = '*'; // Should be specific in production
        echo '<!DOCTYPE html><html><head><title>Processing...</title></head><body><script>
            const message = {
                type: "payment_response",
                payload: ' . json_encode($webhookData) . '
            };
            if (window.opener) {
                window.opener.postMessage(message, ' . json_encode($targetOrigin) . ');
                window.close();
            } else {
                document.body.innerHTML = "Payment processed. You can close this window.";
            }
        </script></body></html>';
        break;

    case 'cancel':
        $masterRef = $_GET['master_ref'] ?? null;
        if ($masterRef) {
            appendLogAndUpdateStatus($masterRef, 'abandoned', ['reason' => 'User cancelled on PayPal page.']);
        }
        $webhookData = [
            'payment_status' => 'abandoned',
            'data' => ['reference' => $masterRef]
        ];
        
        $targetOrigin = '*';
        echo '<!DOCTYPE html><html><head><title>Cancelling...</title></head><body><script>
            const message = {
                type: "payment_response",
                payload: ' . json_encode($webhookData) . '
            };
            if (window.opener) {
                window.opener.postMessage(message, ' . json_encode($targetOrigin) . ');
                window.close();
            } else {
                document.body.innerHTML = "Payment cancelled. You can close this window.";
            }
        </script></body></html>';
        break;

    case 'verify':
        header('Content-Type: application/json');
        // Placeholder for polling verification
        $reference = $_GET['reference'] ?? null;
        if (!$reference) {
            http_response_code(400);
            echo json_encode(['success' => false, 'error' => 'Reference is required.']);
            break;
        }
        // For now, just return a pending status as per instructions
        echo json_encode(['success' => true, 'data' => ['payment_status' => 'pending']]);
        break;

    default:
        http_response_code(400);
        header('Content-Type: application/json');
        echo json_encode(['status' => 'error', 'message' => 'Invalid action.']);
        break;
}

?>
