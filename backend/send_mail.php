<?php
// send_mail.php - Email sending endpoint


// Include the centralized configuration
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/vendor/autoload.php';
header("Content-Type: application/json");
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
    $site_name = getConfig('SITE_NAME') ?? 'Research Hub';
    $contact_email = getConfig('CONTACT_EMAIL');
    $logo_url = getConfig('LOGO_URL'); // Fallback logo

    // Create receipt email content
    $subject = "Payment Receipt - {$site_name}";
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
            body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f7f6; color: #333; }
            .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .email-header { background-color: #4A90E2; color: white; padding: 30px; text-align: center; }
            .email-header img { max-width: 150px; margin-bottom: 15px; }
            .email-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .email-body { padding: 30px; }
            .email-body p { font-size: 16px; line-height: 1.7; margin: 0 0 15px; }
            .receipt-details { border: 1px solid #e8e8e8; border-radius: 8px; margin: 25px 0; }
            .receipt-details h3 { font-size: 20px; margin: 0; padding: 15px 20px; background-color: #f9f9f9; border-bottom: 1px solid #e8e8e8; }
            .detail-row { display: flex; justify-content: space-between; padding: 12px 20px; border-bottom: 1px solid #e8e8e8; align-items: center; }
            .detail-row:last-child { border-bottom: none; }
            .detail-row span { font-size: 16px; }
            .detail-row span:last-child { font-weight: 600; }
            .email-footer { background-color: #f4f7f6; padding: 20px; text-align: center; color: #888; font-size: 14px; }
            .email-footer a { color: #4A90E2; text-decoration: none; }
        </style>
    </head>
    <body>
        <div class='email-container'>
            <div class='email-header'>
                <img src='{$logo_url}' alt='{$site_name} Logo'>
                <h1>Payment Successful</h1>
            </div>
            <div class='email-body'>
                <p>Dear {$recipient_name},</p>
                <p>Thank you for your purchase! This email confirms that your payment has been processed successfully. Here are the details of your transaction:</p>
                <div class='receipt-details'>
                    <h3>Payment Details</h3>
                    <div class='detail-row'><span>Payment ID:</span> <span>{$payment_id}</span></div>
                    <div class='detail-row'><span>Amount:</span> <span>{$currency} " . number_format($amount, 2) . "</span></div>
                    <div class='detail-row'><span>Payment Method:</span> <span>{$payment_method}</span></div>
                    <div class='detail-row'><span>Date:</span> <span>" . date('F j, Y, g:i A') . "</span></div>
                </div>
                <p>Your file(s) will be sent in a separate email shortly. If you have any questions, please don't hesitate to contact our support team.</p>
                <p>Best regards,<br>The {$site_name} Team</p>
            </div>
            <div class='email-footer'>
                <p>&copy; " . date('Y') . " {$site_name}. All Rights Reserved.</p>
                <p>Need help? Contact us at <a href='mailto:{$contact_email}'>{$contact_email}</a></p>
            </div>
        </div>
    </body>
    </html>
    ";

    $result = sendEmailWithPHPMailer($recipient_email, $recipient_name, $subject, $message);
    echo json_encode($result);
}

function sendFileEmail($data) {
    // Validate required fields
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

    if (!filter_var($recipient_email, FILTER_VALIDATE_EMAIL)) {
        throw new Exception('Invalid recipient email address');
    }

    $download_token = bin2hex(random_bytes(32));
    $downloads_data = json_encode(['max_downloads' => $max_downloads, 'download_count' => 0]);

    $pdo = getPDOConnection();
    $stmt = $pdo->prepare(
        "UPDATE payments SET download_token = ?, file_access_expires_at = ?, downloads = ? WHERE id = ?"
    );
    $stmt->execute([$download_token, $link_expires, $downloads_data, $payment_id]);

    if ($stmt->rowCount() === 0) {
        throw new Exception("Failed to update payment record with ID: {$payment_id}");
    }

    $site_name = getConfig('SITE_NAME') ?? 'Research Hub';
    $contact_email = getConfig('CONTACT_EMAIL') ?? MAIL_FROM_ADDRESS;
    $base_url = rtrim(VITE_API_USE_URL, '/');
    $download_link = "{$base_url}/user/file?access={$download_token}";
    $logo_url = getConfig('LOGO_URL') ?? 'https://example.com/logo.png';

    $expiry_date_formatted = date("F j, Y, g:i a", strtotime($link_expires));
    $subject = "Your Download is Ready - {$site_name}";
    
    $message = "
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset='UTF-8'>
        <meta name='viewport' content='width=device-width, initial-scale=1.0'>
        <title>{$subject}</title>
        <style>
            @import url('https://fonts.googleapis.com/css2?family=Poppins:wght@400;600&display=swap');
            body { margin: 0; padding: 0; font-family: 'Poppins', sans-serif; background-color: #f4f7f6; color: #333; }
            .email-container { max-width: 600px; margin: 20px auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 15px rgba(0,0,0,0.05); }
            .email-header { background-color: #28a745; color: white; padding: 30px; text-align: center; }
            .email-header img { max-width: 150px; margin-bottom: 15px; }
            .email-header h1 { margin: 0; font-size: 28px; font-weight: 600; }
            .email-body { padding: 30px; }
            .email-body p { font-size: 16px; line-height: 1.7; margin: 0 0 15px; }
            .file-details { border: 1px solid #e8e8e8; border-radius: 8px; margin: 25px 0; padding: 20px; background-color: #f9f9f9; }
            .file-details p { margin: 0 0 10px; }
            .file-details p:last-child { margin-bottom: 0; }
            .download-button-container { text-align: center; margin: 30px 0; }
            a.download-btn { display: inline-block; background-color: #007bff; color: #ffffff; padding: 15px 35px; font-size: 18px; font-weight: 600; text-decoration: none; border-radius: 8px; transition: background-color 0.3s ease; }
            .download-btn:hover { background-color: #0056b3; }
            .warning { background: #fff3cd; border-left: 5px solid #ffeeba; padding: 15px; margin: 25px 0; font-size: 15px; }
        </style>
    </head>
    <body>
        <div class='email-container'>
            <div class='email-header'>
                <img src='{$logo_url}' alt='{$site_name} Logo'>
                <h1>Your File is Ready!</h1>
            </div>
            <div class='email-body'>
                <p>Dear {$customer_name},</p>
                <p>Great news! Your file is now ready for download. Thank you for your purchase.</p>
                <div class='file-details'>
                    <p><strong>File Name:</strong> {$file_name}</p>
                    <p><strong>Max Downloads:</strong> {$max_downloads}</p>
                    <p><strong>Link Expires:</strong> {$expiry_date_formatted}</p>
                </div>
                <div class='download-button-container'>
                    <a href='{$download_link}' class='download-btn'>Download Your File</a>
                </div>
                <div class='warning'>
                    <strong>Important:</strong> For security, this link will expire after {$max_downloads} download(s) or on {$expiry_date_formatted}. Please download your file promptly.
                </div>
                <p>If you have any issues, please contact us by replying to this email or reaching out to <a href='mailto:{$contact_email}'>{$contact_email}</a>.</p>
                <p>Best regards,<br>The {$site_name} Team</p>
            </div>
            <div class='email-footer'>
                <p>&copy; " . date('Y') . " {$site_name}. All Rights Reserved.</p></div>
            </div>
        </div>
    </body>
    </html>
    ";

    $result = sendEmailWithPHPMailer($recipient_email, $customer_name, $subject, $message);
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