<?php
// paymentStructure.php

/**
 * Get initial payment journey structure
 */
function getInitialPaymentJourney($email, $amount) {
    // Use getFormattedDateTime from config.php
    $dt = getFormattedDateTime();
    $dtFull = $dt['full'];
    
    return [
        'payment_journey' => [
            'initialized_payments' => [],
            'abandoned_attempts' => [],
            'successful_payment' => null,
            'payment_analytics' => [
                'total_retry_attempts' => 0,
                'unique_ips' => [],
                'last_updated' => $dtFull,
                'journey_started_at' => $dtFull,
                'initial_email' => $email,
                'initial_amount' => $amount
            ]
        ]
    ];
}

/**
 * Create a log entry
 */
function createLogEntry($event, $ip, $details = []) {
    // Use getFormattedDateTime from config.php
    $dt = getFormattedDateTime();
    $dtFull = $dt['full'];
    
    return [
        'event' => $event,
        'timestamp' => $dtFull,
        'ip' => $ip,
        'details' => $details
    ];
}

/**
 * Get client information including device and user agent
 */
function getClientInfo() {
    $ua = $_SERVER['HTTP_USER_AGENT'] ?? 'unknown';
    $device = (stripos($ua, 'mobile') !== false || stripos($ua, 'android') !== false || stripos($ua, 'iphone') !== false) ? 'Mobile' : 'Desktop';
    $ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
    return compact('device', 'ua', 'ip');
}

/**
 * Get payment record by reference
 */
function getPaymentByReference($reference) {
    global $pdo;
    if (!$pdo) return false;
    $stmt = $pdo->prepare("SELECT * FROM payments WHERE reference = ? LIMIT 1");
    $stmt->execute([$reference]);
    return $stmt->fetch();
}

/**
 * Create a new payment row in the database (first attempt)
 */
function createPaymentRow($driveFileId, $customerName, $customerEmail, $customerPhone, $amount, $masterReference, $platformReference, $method, $currency = 'USD') {
    global $pdo;
    if (!$pdo) return false;

    try {
        $dt = getFormattedDateTime();
        $client = getClientInfo();
        $journey = getInitialPaymentJourney($customerEmail, $amount);
        
        $journey['payment_journey']['initialized_payments'][] = [
            'platform_reference' => $platformReference,
            'amount' => $amount,
            'email' => $customerEmail,
            'started_at' => $dt['full'],
            'device' => $client['device'],
            'initial_ip' => $client['ip'],
            'logs' => [createLogEntry('first_attempt', $client['ip'], ['platform_reference' => $platformReference])]
        ];

        $stmt = $pdo->prepare(
            "INSERT INTO payments (drive_file_id, customer_name, customer_email, customer_phone, amount, currency, payment_method, reference, current_platform_reference, payment_status, admin_status, started_at, transaction_logs, updated_at) " .
            "VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'pending', 'pending', ?, ?, ?)"
        );
        
        return $stmt->execute([
            $driveFileId, $customerName, $customerEmail, $customerPhone, 
            number_format($amount, 2, '.', ''), 
            strtoupper($currency), 
            $method, 
            $masterReference, 
            $platformReference, 
            $dt['full'], 
            json_encode($journey), 
            $dt['full']
        ]);
    } catch (Throwable $e) {
        error_log("Error in createPaymentRow: " . $e->getMessage());
        return false;
    }
}

/**
 * Map general status to the database ENUM values
 */
function mapGeneralPaymentStatus($status) {
    return match (strtolower($status)) {
        'success', 'completed', 'paid', 'successful' => 'completed',
        'failure', 'failed', 'error' => 'failed',
        'abandoned' => 'abandoned',
        default => 'pending',
    };
}

/**
 * Append log entry and update payment status
 */
function appendLogAndUpdateStatus($masterReference, $status, $gatewayResponse = '') {
    global $pdo;
    if (!$pdo) return false;

    try {
        $stmt = $pdo->prepare("SELECT transaction_logs FROM payments WHERE reference = ? LIMIT 1");
        $stmt->execute([$masterReference]);
        $row = $stmt->fetch();
        if (!$row) return false;

        $journey = json_decode($row['transaction_logs'], true);
        if (!is_array($journey)) {
            $journey = getInitialPaymentJourney('', 0);
        }

        $dt = getFormattedDateTime();
        $client = getClientInfo();
        $logEntry = createLogEntry('status_update', $client['ip'], [
            'status' => $status,
            'gateway_response' => is_string($gatewayResponse) ? $gatewayResponse : json_encode($gatewayResponse)
        ]);

        $payments = &$journey['payment_journey']['initialized_payments'];
        if (count($payments) > 0) {
            $payments[count($payments)-1]['logs'][] = $logEntry;
        } else {
             $payments[]['logs'] = [$logEntry];
        }

        if ($status === 'success') {
            $last_payment = end($journey['payment_journey']['initialized_payments']);
            $journey['payment_journey']['successful_payment'] = [
                'platform_reference' => $last_payment['platform_reference'] ?? null,
                'completed_at' => $dt['full'],
                'final_amount' => $last_payment['amount'] ?? 0
            ];
        }

        $mappedStatus = mapGeneralPaymentStatus($status);

        $update = $pdo->prepare("UPDATE payments SET transaction_logs = ?, payment_status = ?, updated_at = ? WHERE reference = ?");
        $update->execute([json_encode($journey), $mappedStatus, $dt['full'], $masterReference]);

        if ($mappedStatus === 'completed') {
            $pdo->prepare("UPDATE payments SET completed_at = ? WHERE reference = ? AND completed_at IS NULL")->execute([$dt['full'], $masterReference]);
        }
        return true;
    } catch (Throwable $e) {
        error_log("Error in appendLogAndUpdateStatus: " . $e->getMessage());
        return false;
    }
}