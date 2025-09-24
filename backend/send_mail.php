<?php
// send_mail.php - Email sending endpoint

// Set headers for JSON response and CORS
header("Content-Type: application/json");
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Headers: Content-Type, Authorization");
header("Access-Control-Allow-Methods: POST, OPTIONS");
header("Access-Control-Allow-Credentials: true");

// Handle preflight requests
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

// Only allow POST requests
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed. Only POST is supported.']);
    exit();
}

// Include the centralized configuration
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';

use PHPMailer\PHPMailer\PHPMailer;
use PHPMailer\PHPMailer\SMTP;
use PHPMailer\PHPMailer\Exception;

// Get email type from query parameters
$emailType = $_GET['email'] ?? '';

// Validate email type
if (empty($emailType) || !in_array($emailType, ['receipt', 'file'])) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid email type. Must be "receipt" or "file".']);
    exit();
}

// Get raw POST data (React sends JSON)
$input = json_decode(file_get_contents('php://input'), true);

// Validate input data
if (!is_array($input)) {
    http_response_code(400);
    echo json_encode(['success' => false, 'error' => 'Invalid JSON payload.']);
    exit();
}

try {
    switch ($emailType) {
        case 'receipt':
            sendReceiptEmail($input);
            break;
        case 'file':
            sendFileEmail($input);
            break;
        default:
            throw new Exception('Invalid email type');
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode([
        'success' => false,
        'error' => 'Failed to send email: ' . $e->getMessage()
    ]);
}

/**
 * Centralized function to send emails via PHPMailer
 */
function sendEmailWithPHPMailer($recipient_email, $recipient_name, $subject, $message) {
    $mail = new PHPMailer(true);

    try {
        // Server settings
        $mail->isSMTP();
        $mail->Host = MAIL_HOST;
        $mail->SMTPAuth = true;
        $mail->Username = MAIL_USERNAME;
        $mail->Password = MAIL_PASSWORD;
        $mail->SMTPSecure = MAIL_ENCRYPTION === 'tls' ? PHPMailer::ENCRYPTION_STARTTLS : PHPMailer::ENCRYPTION_SMTPS;
        $mail->Port = MAIL_PORT;

        // Recipients
        $mail->setFrom(MAIL_FROM_ADDRESS, MAIL_FROM_NAME);
        $mail->addAddress($recipient_email, $recipient_name);

        // Content
        $mail->isHTML(true);
        $mail->Subject = $subject;
        $mail->Body = $message;

        $mail->send();

        return [
            'success' => true,
            'message' => 'Email sent successfully'
        ];

    } catch (Exception $e) {
        throw new Exception("Failed to send email: {$mail->ErrorInfo}");
    }
}

function sendReceiptEmail($data) {
    // Validate required fields for receipt
    $required_fields = ['recipient_email', 'recipient_name', 'payment_id', 'amount', 'currency'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || empty($data[$field])) {
            throw new Exception("Missing required field for receipt email: {$field}");
        }
    }

    $recipient_email = $data['recipient_email'];
    $recipient_name = $data['recipient_name'];
    $payment_id = $data['payment_id'];
    $amount = $data['amount'];
    $currency = $data['currency'];
    $payment_method = $data['payment_method'] ?? 'Unknown';

    // Validate email
    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid recipient email address');
    }

    // Get site configuration
    $site_name = getConfig('SITE_NAME') ?? 'RESEARCH HUB ';
    $contact_email = getConfig('CONTACT_EMAIL');

    // Create receipt email content
    $subject = "Payment Receipt - {$site_name}";
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #007bff; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .receipt-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .detail-row { display: flex; justify-content: space-between; padding: 8px 0; border-bottom: 1px solid #eee; }
            .detail-row:last-child { border-bottom: none; font-weight: bold; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Payment Receipt</h1>
                <p>Thank you for your purchase!</p>
            </div>
            <div class='content'>
                <p>Dear {$recipient_name},</p>
                
                <p>Thank you for your purchase! This email confirms that your payment has been processed successfully.</p>
                
                <div class='receipt-details'>
                    <h3>Payment Details</h3>
                    <div class='detail-row'>
                        <span>Payment ID:</span>
                        <span>{$payment_id}</span>
                    </div>
                    <div class='detail-row'>
                        <span>Amount:</span>
                        <span>{$currency} " . number_format($amount, 2) . "</span>
                    </div>
                    <div class='detail-row'>
                        <span>Payment Method:</span>
                        <span>{$payment_method}</span>
                    </div>
                    <div class='detail-row'>
                        <span>Date:</span>
                        <span>" . date('F j, Y \a\t g:i A') . "</span>
                    </div>
                </div>
                
                <p>Your file will be sent to you shortly. If you have any questions or concerns, please don't hesitate to contact us.</p>
                
                <p>Best regards,<br>
                The {$site_name} Team</p>
            </div>
            <div class='footer'>
                <p>This is an automated receipt. Please keep this for your records.</p>
                <p>Contact us: {$contact_email}</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // ✅ Send using centralized function
    $result = sendEmailWithPHPMailer($recipient_email, $recipient_name, $subject, $message);
    
    echo json_encode($result);
}

function sendFileEmail($data) {
    // Validate required fields for file email
    $required_fields = ['recipient_email', 'customer_name', 'file_name', 'link_expires', 'max_downloads', 'payment_id'];
    foreach ($required_fields as $field) {
        if (!isset($data[$field]) || (empty($data[$field]) && $data[$field] !== 0)) {
            throw new Exception("Missing required field for file email: {$field}");
        }
    }

    $recipient_email = $data['recipient_email'];
    $customer_name = $data['customer_name'];
    $file_name = $data['file_name'];
    $link_expires = $data['link_expires'];
    $max_downloads = (int)$data['max_downloads'];
    $payment_id = (int)$data['payment_id'];

    // Validate email
    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid recipient email address');
    }

    // Generate a unique download token
    $download_token = bin2hex(random_bytes(32));

    // Prepare download data for database
    $downloads_data = json_encode([
        'max_downloads' => $max_downloads,
        'download_count' => 0
    ]);

    // Update the payment record with the download token and expiry
    $pdo = getPDOConnection();
    $stmt = $pdo->prepare(
        "UPDATE payments SET download_token = ?, file_access_expires_at = ?, downloads = ? WHERE id = ?"
    );
    $stmt->execute([$download_token, $link_expires, $downloads_data, $payment_id]);

    if ($stmt->rowCount() === 0) {
        throw new Exception("Failed to update payment record with ID: {$payment_id}");
    }

    // Get site configuration
    $site_name = getConfig('SITE_NAME') ?? 'Research Hub';
    $contact_email = getConfig('CONTACT_EMAIL') ?? MAIL_FROM_ADDRESS;
    $base_url = rtrim(VITE_API_USE_URL, '/');
    $download_link = "{$base_url}/user/file?access={$download_token}";

    // Format expiry date for display
    $expiry_date_formatted = date("F j, Y, g:i a", strtotime($link_expires));

    // Create file email content
    $subject = "Your File is Ready - {$site_name}";
    
    $message = "
    <html>
    <head>
        <style>
            body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
            .container { max-width: 600px; margin: 0 auto; padding: 20px; }
            .header { background: #28a745; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0; }
            .content { background: #f8f9fa; padding: 30px; border-radius: 0 0 8px 8px; }
            .file-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
            .download-btn { display: inline-block; background: #007bff;padding: 12px 30px; text-decoration: none; border-radius: 5px; margin: 20px 0; }
            .warning { background: #fff3cd; border: 1px solid #ffeaa7; padding: 15px; border-radius: 5px; margin: 20px 0; }
            .footer { text-align: center; margin-top: 30px; color: #666; font-size: 14px; }
            a.download-btn { color: #fff; }
            a.download-btn:hover { background: #0056b3; }
        </style>
    </head>
    <body>
        <div class='container'>
            <div class='header'>
                <h1>Your File is Ready!</h1>
                <p>Download your purchased file below</p>
            </div>
            <div class='content'>
                <p>Dear {$customer_name},</p>
                
                <p>Great news! Your file is now ready for download. Thank you for your purchase!</p>
                
                <div class='file-details'>
                    <h3>File Details</h3>
                    <p><strong>File Name:</strong> {$file_name}</p>
                    <p><strong>Max Downloads:</strong> {$max_downloads}</p>
                    <p><strong>Link Expires:</strong> {$expiry_date_formatted}</p>
                </div>
                
                <div style='text-align: center;'>
                    <a href='{$download_link}' class='download-btn'>Download File</a>
                </div>
                
                <div class='warning'>
                    <strong>Important:</strong> This download link is valid for {$max_downloads} download(s) and will expire on {$expiry_date_formatted}. Please download your file before then.
                </div>
                
                <p>If you have any issues downloading your file or need assistance, please contact us immediately.</p>
                
                <p>Best regards,<br>
                The {$site_name} Team</p>
            </div>
            <div class='footer'>
                <p>This link is valid until {$expiry_date_formatted}</p>
                <p>Contact us: {$contact_email}</p>
            </div>
        </div>
    </body>
    </html>
    ";

    // Send using centralized function
    $result = sendEmailWithPHPMailer($recipient_email, $customer_name, $subject, $message);
    //  $result = [
    //     'success' => true,
    //     'message' => 'Email sending is disabled. Link generated.',
    //     'download_link' => $download_link
    // ];
    echo json_encode($result, JSON_UNESCAPED_SLASHES);
}

/**
 * Get configuration value from database
 */
function getConfig($key) {
    try {
        $pdo = getPDOConnection();
        $stmt = $pdo->prepare("SELECT config_value FROM website_config WHERE config_key = ?");
        $stmt->execute([$key]);
        $result = $stmt->fetch();
        
        return $result ? $result['config_value'] : null;
    } catch (Exception $e) {
        error_log("Error getting config {$key}: " . $e->getMessage());
        return null;
    }
}
?>