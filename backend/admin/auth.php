<?php
// admin/auth.php - Admin Authentication Handler
require_once __DIR__ . '/../config.php';

header('Content-Type: application/json');

// Handle CORS
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
} 
header("Access-Control-Allow-Credentials: true");
header('Access-Control-Allow-Methods: POST, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    exit(0);
}

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['success' => false, 'error' => 'Method not allowed']);
    exit;
}

try {
    $input = json_decode(file_get_contents('php://input'), true);
    
    if (!$input || !isset($input['username']) || !isset($input['password'])) {
        throw new Exception('Username and password are required');
    }
    
    $username = trim($input['username']);
    $password = $input['password'];
    
    // Validate credentials against environment variables
    $admin_username = $_ENV['ADMIN_USERNAME'];
    $admin_password = $_ENV['ADMIN_PASSWORD'];
    
    // Verify credentials (simple comparison for now - in production, use proper password hashing)
    if ($username === $admin_username && $password === $admin_password) {
        // Create session token
        $session_token = bin2hex(random_bytes(32));
        
        // Store session in database
        try {
            $pdo = getPDOConnection();
            
            // Clean up expired sessions
            $pdo->exec("DELETE FROM admin_sessions WHERE expires_at < NOW()");
            
            // Insert new session
            $dt = getFormattedDateTime();
            $expiresAt = date('Y-m-d H:i:s', strtotime('+24 hours'));
            
            $stmt = $pdo->prepare("
                INSERT INTO admin_sessions (token, username, created_at, expires_at, ip_address, user_agent) 
                VALUES (?, ?, ?, ?, ?, ?)
            ");
            
            $stmt->execute([
                $session_token,
                $username,
                $dt['full'],
                $expiresAt,
                $_SERVER['REMOTE_ADDR'] ?? 'unknown',
                $_SERVER['HTTP_USER_AGENT'] ?? 'unknown'
            ]);
            
        } catch (Exception $e) {
            error_log("Session creation error: " . $e->getMessage());
            // Continue without database session storage
        }
        
        // Log successful login
        error_log("Successful admin login for username: " . $username . " from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        
        // Return success response
        echo json_encode([
            'success' => true,
            'message' => 'Authentication successful',
            'user' => [
                'username' => $username,
                'role' => 'admin'
            ],
            'token' => $session_token
        ]);
        
    } else {
        // Log failed attempt
        error_log("Failed admin login attempt for username: " . $username . " from IP: " . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'));
        
        throw new Exception('Invalid username or password');
    }
    
} catch (Exception $e) {
    http_response_code(401);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
