<?php
require_once __DIR__ . '/../config.php';

// Prevent any output before JSON response
ob_start();

header('Content-Type: application/json');

// Get the action from POST data (support both JSON and form data)
$action = '';
$input = null;

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    $contentType = $_SERVER['CONTENT_TYPE'] ?? '';
    
    if (strpos($contentType, 'application/json') !== false) {
        // Handle JSON input
        $input = json_decode(file_get_contents('php://input'), true);
        $action = $input['action'] ?? '';
    } else {
        // Handle form data
        $action = $_POST['action'] ?? '';
    }
} else {
    $action = $_GET['action'] ?? '';
}

try {
    switch ($action) {
        case 'process_contact':
            processContact();
            break;
        // get_user_location is now handled via db_fetch.php; keep for backward-compat if needed
        default:
            throw new Exception('Invalid action specified');
    }
} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

function processContact() {
    // Get POST data
    $contactName = $_POST['contact_name'] ?? '';
    $contactEmail = $_POST['contact_email'] ?? '';
    $contactSubject = $_POST['contact_subject'] ?? '';
    $contactMessage = $_POST['contact_message'] ?? '';

    // Validate required fields
    if (!$contactName || !$contactEmail || !$contactSubject || !$contactMessage) {
        throw new Exception('Please fill in all required fields');
    }

    // Validate email
    if (!filter_var($contactEmail, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Please enter a valid email address');
    }

    // Send email to admin
    $to = getConfig('CONTACT_EMAIL');
    $subject = "New Contact Form Submission: $contactSubject";
    $message = "
    New contact form submission received:

    Name: $contactName
    Email: $contactEmail
    Subject: $contactSubject
    Message: $contactMessage

    Submitted on: " . date('Y-m-d H:i:s') . "
    ";

    $headers = "From: $contactEmail\r\n";
    $headers .= "Reply-To: $contactEmail\r\n";
    $headers .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $adminEmailSent = mail($to, $subject, $message, $headers);

    // Send confirmation email to user
    $userSubject = "Thank you for contacting " . getConfig('SITE_NAME');
    $userMessage = "
    Dear $contactName,

    Thank you for contacting " . getConfig('SITE_NAME') . ". We have received your message and will get back to you as soon as possible.

    Your message details:
    Subject: $contactSubject
    Message: $contactMessage

    We typically respond within 24-48 hours.

    Best regards,
    " . getConfig('SITE_NAME') . " Team
    " . getConfig('CONTACT_EMAIL') . "
    ";

    $userHeaders = "From: " . getConfig('CONTACT_EMAIL') . "\r\n";
    $userHeaders .= "Reply-To: " . getConfig('CONTACT_EMAIL') . "\r\n";
    $userHeaders .= "Content-Type: text/plain; charset=UTF-8\r\n";

    $userEmailSent = mail($contactEmail, $userSubject, $userMessage, $userHeaders);

    if ($adminEmailSent && $userEmailSent) {
        echo json_encode([
            'success' => true,
            'message' => 'Thank you for your message! We will get back to you soon.'
        ]);
    } else {
        throw new Exception('Failed to send message. Please try again later.');
    }
}

// Removed getUserLocation handler; location is provided by db_fetch.php using config helper
?>
