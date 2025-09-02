<?php
require_once 'config.php';

// Prevent any output before JSON response
ob_start();

header('Content-Type: application/json');

// Get the action from POST data
$action = $_POST['action'] ?? $_GET['action'] ?? '';

try {
    switch ($action) {
        case 'process_payment':
            processPayment();
            break;
        case 'process_contact':
            processContact();
            break;
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

function processPayment() {
    // Get POST data
    $fileId = $_POST['file_id'] ?? null;
    $customerName = $_POST['customer_name'] ?? '';
    $customerEmail = $_POST['customer_email'] ?? '';
    $paymentMethod = $_POST['payment_method'] ?? '';
    $amount = $_POST['amount'] ?? 0;

    // Validate required fields
    if (!$fileId || !$customerName || !$customerEmail || !$paymentMethod || !$amount) {
        throw new Exception('Missing required fields');
    }

    // Validate payment method
    $allowedMethods = ['paypal', 'stripe', 'bank_transfer', 'crypto'];
    if (!in_array($paymentMethod, $allowedMethods)) {
        throw new Exception('Invalid payment method');
    }

    // Create database connection
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );

    // Check if file exists
    $stmt = $pdo->prepare("SELECT id, file_name, price FROM academic_files WHERE id = ?");
    $stmt->execute([$fileId]);
    $file = $stmt->fetch();

    if (!$file) {
        error_log("File not found for ID: " . $fileId);
        throw new Exception('Academic file not found. Please make sure the file exists in our database.');
    }

    // Generate transaction ID
    $transactionId = 'TXN' . date('YmdHis') . rand(1000, 9999);

    // Insert payment record
    $stmt = $pdo->prepare("
        INSERT INTO payments (transaction_id, file_id, customer_name, customer_email, payment_method, amount, status, payment_data)
        VALUES (?, ?, ?, ?, ?, ?, 'pending', ?)
    ");

    $paymentData = json_encode([
        'file_name' => $file['file_name'],
        'original_price' => $file['price'],
        'ip_address' => $_SERVER['REMOTE_ADDR'] ?? '',
        'user_agent' => $_SERVER['HTTP_USER_AGENT'] ?? ''
    ]);

    $result = $stmt->execute([
        $transactionId,
        $fileId,
        $customerName,
        $customerEmail,
        $paymentMethod,
        $amount,
        $paymentData
    ]);

    if (!$result) {
        error_log("Failed to insert payment record");
        throw new Exception('Failed to process payment. Please try again.');
    }

    $paymentId = $pdo->lastInsertId();
    
    if (!$paymentId) {
        error_log("Payment insert succeeded but no ID returned");
        throw new Exception('Payment processing error. Please contact support.');
    }

    // Email sending removed as requested

    echo json_encode([
        'success' => true,
        'transaction_id' => $transactionId,
        'payment_id' => $paymentId,
        'message' => 'Payment submitted successfully.'
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
?>
