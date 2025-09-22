<?php
// Set headers for JSON response
header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *'); // In a real app, restrict this to your frontend's domain

// Set HTTP response code to indicate "Not Implemented" or a specific error
http_response_code(501); // 501 Not Implemented

// Create the JSON response to be displayed in the modal's error state
$response = [
    'status' => 'error',
    'type' => 'developer',
    'message' => 'PayPal integration is not yet available.',
    'details' => 'The backend for PayPal payments is currently under construction. Please select another payment method.'
];

// Echo the JSON response and exit
echo json_encode($response);
exit;
