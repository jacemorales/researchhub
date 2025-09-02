<?php
// paymentStructure.php

function getInitialPaymentJourney($email, $amount) {
    return [
        'payment_journey' => [
            'initialized_payments' => [],
            'abandoned_attempts' => [],
            'successful_payment' => null,
            'payment_analytics' => [
                'total_retry_attempts' => 0,
                'unique_ips' => [],
                'last_updated' => date('Y-m-d H:i:s'),
                'journey_started_at' => date('Y-m-d H:i:s'),
                'initial_email' => $email,
                'initial_amount' => $amount
            ]
        ]
    ];
}

function createLogEntry($event, $ip, $location, $details = []) {
    return [
        'event' => $event,
        'timestamp' => date('Y-m-d H:i:s'),
        'ip' => $ip,
        'location' => $location,
        'details' => $details
    ];
}