<?php
require_once __DIR__ . '/config.php';

// Set JSON response header
header('Content-Type: application/json');

// Check if request is POST
if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    // Validate required fields
    $required_fields = ['fileDriveId', 'fileName', 'fileType', 'fileSize', 'fileDate', 'fileCategory', 'fileLevel'];
    $missing_fields = [];
    
    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || empty($_POST[$field])) {
            $missing_fields[] = $field;
        }
    }
    
    if (!empty($missing_fields)) {
        throw new Exception('Missing required fields: ' . implode(', ', $missing_fields));
    }
    
    // Sanitize and validate input
    $drive_file_id = sanitizeInput($_POST['fileDriveId']);
    $file_name = sanitizeInput($_POST['fileName']);
    $file_type = sanitizeInput($_POST['fileType']);
    $file_size = sanitizeInput($_POST['fileSize']);
    $modified_date = sanitizeInput($_POST['fileDate']);
    $description = sanitizeInput($_POST['fileDescription'] ?? '');
    $category = sanitizeInput($_POST['fileCategory']);
    $level = sanitizeInput($_POST['fileLevel']);
    $price_usd = floatval($_POST['filePrice'] ?? 0);
    $price_ngn = floatval($_POST['filePriceNGN'] ?? 0);

    // Validate category and level
    $valid_categories = ['research', 'thesis', 'dissertation', 'assignment', 'project', 'presentation', 'other'];
    $valid_levels = ['undergraduate', 'postgraduate'];

    if (!in_array($category, $valid_categories)) {
        throw new Exception('Invalid category selected');
    }

    if (!in_array($level, $valid_levels)) {
        throw new Exception('Invalid level selected');
    }

    // Normalize prices
    if ($price_usd < 0) { $price_usd = 0; }
    if ($price_ngn < 0) { $price_ngn = 0; }

    // Build price JSON (store as string in price column)
    $price = json_encode([
        'usd' => round($price_usd, 2),
        'ngn' => round($price_ngn, 2)
    ]);

    // Convert date format
    $modified_datetime = date('Y-m-d H:i:s', strtotime($modified_date));

    // Check if file already exists
    $stmt = $pdo->prepare("SELECT id FROM academic_files WHERE drive_file_id = ?");
    $stmt->execute([$drive_file_id]);
    $existing_file = $stmt->fetch();

    if ($existing_file) {
        // Update existing file
        $stmt = $pdo->prepare("
            UPDATE academic_files 
            SET file_name = ?, file_type = ?, file_size = ?, modified_date = ?, 
                description = ?, category = ?, level = ?, price = ?, updated_at = CURRENT_TIMESTAMP
            WHERE drive_file_id = ?
        ");

        $stmt->execute([
            $file_name, $file_type, $file_size, $modified_datetime,
            $description, $category, $level, $price, $drive_file_id
        ]);

        $message = 'File details updated successfully!';
    } else {
        // Insert new file
        $stmt = $pdo->prepare("
            INSERT INTO academic_files 
            (drive_file_id, file_name, file_type, file_size, modified_date, description, category, level, price)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");

        $stmt->execute([
            $drive_file_id, $file_name, $file_type, $file_size, $modified_datetime,
            $description, $category, $level, $price
        ]);

        $message = 'File details saved successfully!';
    }

    // Log the action
    $action = $existing_file ? 'file_update' : 'file_create';
    $log_message = $existing_file ? "Updated file: {$file_name}" : "Created file: {$file_name}";

    // You can add logging functionality here if needed
    // logActivity($pdo, $action, $log_message);
    
    // Return success response
    echo json_encode([
        'success' => true,
        'message' => $message,
        'file_id' => $existing_file ? $existing_file['id'] : $pdo->lastInsertId()
    ]);
    
} catch (Exception $e) {
    // Log error
    error_log('Save file details error: ' . $e->getMessage());
    
    // Return error response
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}