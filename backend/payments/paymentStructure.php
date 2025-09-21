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