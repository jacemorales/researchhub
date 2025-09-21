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

class StripeIntegration {
    private $secretKey;
    private $publishableKey;
    private $webhookSecret;

    public function __construct() {
        $this->secretKey = STRIPE_SECRET_KEY;
        $this->publishableKey = STRIPE_PUBLISHABLE_KEY;
        $this->webhookSecret = STRIPE_WEBHOOK_SECRET;
        
        if (empty($this->secretKey)) {
            throw new Exception('Stripe secret key not configured');
        }
    }

    /**
     * Create a Stripe payment intent
     */
    public function createPaymentIntent($amount, $currency, $metadata = []) {
        try {
            $stripe = new \Stripe\StripeClient($this->secretKey);
            
            $paymentIntent = $stripe->paymentIntents->create([
                'amount' => $amount * 100, // Convert to cents
                'currency' => strtolower($currency),
                'metadata' => $metadata,
                'automatic_payment_methods' => [
                    'enabled' => true,
                ],
            ]);

            return [
                'success' => true,
                'client_secret' => $paymentIntent->client_secret,
                'payment_intent_id' => $paymentIntent->id,
                'amount' => $amount,
                'currency' => $currency
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            error_log("Stripe API Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        } catch (Exception $e) {
            error_log("Stripe Integration Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Retrieve a payment intent
     */
    public function retrievePaymentIntent($paymentIntentId) {
        try {
            $stripe = new \Stripe\StripeClient($this->secretKey);
            
            $paymentIntent = $stripe->paymentIntents->retrieve($paymentIntentId);

            return [
                'success' => true,
                'status' => $paymentIntent->status,
                'amount' => $paymentIntent->amount / 100, // Convert from cents
                'currency' => $paymentIntent->currency,
                'metadata' => $paymentIntent->metadata->toArray(),
                'payment_intent' => $paymentIntent
            ];

        } catch (\Stripe\Exception\ApiErrorException $e) {
            error_log("Stripe API Error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Handle Stripe webhook
     */
    public function handleWebhook($payload, $signature) {
        try {
            $event = \Stripe\Webhook::constructEvent(
                $payload,
                $signature,
                $this->webhookSecret
            );

            switch ($event->type) {
                case 'payment_intent.succeeded':
                    $this->handlePaymentSuccess($event->data->object);
                    break;
                case 'payment_intent.payment_failed':
                    $this->handlePaymentFailure($event->data->object);
                    break;
                default:
                    error_log("Unhandled Stripe event type: " . $event->type);
            }

            return [
                'success' => true,
                'message' => 'Webhook handled successfully'
            ];

        } catch (\UnexpectedValueException $e) {
            error_log("Invalid Stripe webhook payload: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Invalid payload'
            ];
        } catch (\Stripe\Exception\SignatureVerificationException $e) {
            error_log("Invalid Stripe webhook signature: " . $e->getMessage());
            return [
                'success' => false,
                'error' => 'Invalid signature'
            ];
        }
    }

    /**
     * Handle successful payment
     */
    private function handlePaymentSuccess($paymentIntent) {
        try {
            $pdo = getPDOConnection();
            
            $stmt = $pdo->prepare("
                UPDATE payments 
                SET payment_status = 'completed',
                    transaction_logs = JSON_SET(
                        COALESCE(transaction_logs, '{}'),
                        '$.stripe_payment_intent', ?,
                        '$.stripe_status', ?,
                        '$.completed_at', NOW()
                    )
                WHERE reference = ? AND payment_method = 'stripe'
            ");
            
            $stmt->execute([
                $paymentIntent->id,
                $paymentIntent->status,
                $paymentIntent->metadata->reference ?? ''
            ]);

            error_log("Stripe payment succeeded: " . $paymentIntent->id);

        } catch (Exception $e) {
            error_log("Error updating payment status: " . $e->getMessage());
        }
    }

    /**
     * Handle failed payment
     */
    private function handlePaymentFailure($paymentIntent) {
        try {
            $pdo = getPDOConnection();
            
            $stmt = $pdo->prepare("
                UPDATE payments 
                SET payment_status = 'failed',
                    transaction_logs = JSON_SET(
                        COALESCE(transaction_logs, '{}'),
                        '$.stripe_payment_intent', ?,
                        '$.stripe_status', ?,
                        '$.failure_reason', ?,
                        '$.failed_at', NOW()
                    )
                WHERE reference = ? AND payment_method = 'stripe'
            ");
            
            $stmt->execute([
                $paymentIntent->id,
                $paymentIntent->status,
                $paymentIntent->last_payment_error->message ?? 'Payment failed',
                $paymentIntent->metadata->reference ?? ''
            ]);

            error_log("Stripe payment failed: " . $paymentIntent->id);

        } catch (Exception $e) {
            error_log("Error updating payment status: " . $e->getMessage());
        }
    }

    /**
     * Process payment with Stripe
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
            $reference = 'STRIPE_' . uniqid() . '_' . date('YmdHis');

            // Create payment record in database
            $pdo = getPDOConnection();
            $stmt = $pdo->prepare("
                INSERT INTO payments (
                    reference, drive_file_id, customer_name, customer_email, 
                    customer_phone, amount, currency, payment_method, 
                    payment_status, admin_status, started_at, transaction_logs
                ) VALUES (?, ?, ?, ?, ?, ?, ?, 'stripe', 'pending', 'pending', NOW(), ?)
            ");

            $metadata = [
                'reference' => $reference,
                'customer_name' => $paymentData['customer_name'],
                'customer_email' => $paymentData['customer_email'],
                'drive_file_id' => $paymentData['drive_file_id']
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

            // Create Stripe payment intent
            $result = $this->createPaymentIntent(
                $paymentData['amount'],
                $paymentData['currency'],
                $metadata
            );

            if ($result['success']) {
                // Update payment record with Stripe payment intent ID
                $stmt = $pdo->prepare("
                    UPDATE payments 
                    SET transaction_logs = JSON_SET(
                        COALESCE(transaction_logs, '{}'),
                        '$.stripe_payment_intent', ?,
                        '$.stripe_client_secret', ?
                    )
                    WHERE reference = ?
                ");
                
                $stmt->execute([
                    $result['payment_intent_id'],
                    $result['client_secret'],
                    $reference
                ]);

                return [
                    'success' => true,
                    'reference' => $reference,
                    'client_secret' => $result['client_secret'],
                    'payment_intent_id' => $result['payment_intent_id']
                ];
            } else {
                throw new Exception($result['error']);
            }

        } catch (Exception $e) {
            error_log("Stripe payment processing error: " . $e->getMessage());
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
                WHERE reference = ? AND payment_method = 'stripe'
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
            $paymentIntentId = $logs['stripe_payment_intent'] ?? '';

            if (empty($paymentIntentId)) {
                return [
                    'success' => false,
                    'error' => 'Payment intent not found'
                ];
            }

            // Retrieve payment intent from Stripe
            $result = $this->retrievePaymentIntent($paymentIntentId);

            if ($result['success']) {
                // Update payment status if changed
                if ($result['status'] !== $payment['payment_status']) {
                    $newStatus = $this->mapStripeStatus($result['status']);
                    
                    $stmt = $pdo->prepare("
                        UPDATE payments 
                        SET payment_status = ?,
                            transaction_logs = JSON_SET(
                                COALESCE(transaction_logs, '{}'),
                                '$.stripe_status', ?,
                                '$.verified_at', NOW()
                            )
                        WHERE reference = ?
                    ");
                    $stmt->execute([$newStatus, $result['status'], $reference]);
                }

                return [
                    'success' => true,
                    'status' => $this->mapStripeStatus($result['status']),
                    'amount' => $result['amount'],
                    'currency' => $result['currency']
                ];
            } else {
                return $result;
            }

        } catch (Exception $e) {
            error_log("Stripe payment verification error: " . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Map Stripe status to our payment status
     */
    private function mapStripeStatus($stripeStatus) {
        switch ($stripeStatus) {
            case 'succeeded':
                return 'completed';
            case 'requires_payment_method':
            case 'requires_confirmation':
            case 'requires_action':
                return 'pending';
            case 'canceled':
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
        
        $stripe = new StripeIntegration();
        
        switch ($input['action']) {
            case 'create_payment':
                $result = $stripe->processPayment($input);
                echo json_encode($result);
                break;
                
            case 'verify_payment':
                if (!isset($input['reference'])) {
                    throw new Exception('Reference is required');
                }
                $result = $stripe->verifyPayment($input['reference']);
                echo json_encode($result);
                break;
                
            case 'webhook':
                $payload = file_get_contents('php://input');
                $signature = $_SERVER['HTTP_STRIPE_SIGNATURE'] ?? '';
                $result = $stripe->handleWebhook($payload, $signature);
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
