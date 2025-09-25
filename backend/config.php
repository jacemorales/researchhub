<?php
// config.php - Centralized Configuration & Connection

// Set CORS headers
$allowedOrigins = [
    'http://localhost:5173',
    'https://researchhubb.netlify.app',
    'https://frontend-frontend-1008.up.railway.app'
];
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
if (in_array($origin, $allowedOrigins)) {
    header("Access-Control-Allow-Origin: $origin");
}

// Load Composer's autoloader
require_once __DIR__ . '/vendor/autoload.php';

if (class_exists('Dotenv\Dotenv')) {
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Throwable $e) {
    error_log("Could not load .env file: " . $e->getMessage());
    die("Configuration error: Environment file not loaded.");
}
}


// Database Configuration
define('DB_HOST', $_ENV['DB_HOST'] ?? getenv('DB_HOST'));
define('DB_PORT', $_ENV['DB_PORT'] ?? getenv('DB_PORT'));
define('DB_NAME', $_ENV['DB_NAME'] ?? getenv('DB_NAME'));
define('DB_USER', $_ENV['DB_USER'] ?? getenv('DB_USER'));
define('DB_PASS', $_ENV['DB_PASS'] ?? getenv('DB_PASS'));

// Base URL
define('VITE_API_BASE_URL', $_ENV['VITE_API_BASE_URL'] ?? getenv('VITE_API_BASE_URL'));
define('VITE_API_USE_URL', $_ENV['VITE_API_USE_URL'] ?? getenv('VITE_API_USE_URL'));
define('VITE_LOCATION_API_KEY', $_ENV['VITE_LOCATION_API_KEY'] ?? getenv('VITE_LOCATION_API_KEY'));

// Cloudflare R2 Configuration
define('R2_ACCOUNT_ID', $_ENV['R2_ACCOUNT_ID'] ?? getenv('R2_ACCOUNT_ID'));
define('R2_ACCESS_KEY_ID', $_ENV['R2_ACCESS_KEY_ID'] ?? getenv('R2_ACCESS_KEY_ID'));
define('R2_SECRET_ACCESS_KEY', $_ENV['R2_SECRET_ACCESS_KEY'] ?? getenv('R2_SECRET_ACCESS_KEY'));
define('R2_BUCKET_NAME', $_ENV['R2_BUCKET_NAME'] ?? getenv('R2_BUCKET_NAME'));
define('R2_PUBLIC_URL', $_ENV['R2_PUBLIC_URL'] ?? getenv('R2_PUBLIC_URL'));

// Payment Gateway Configuration
define('PAYSTACK_SECRET', $_ENV['PAYSTACK_SECRET'] ?? getenv('PAYSTACK_SECRET'));

define('STRIPE_PUBLISHABLE_KEY', $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? getenv('STRIPE_PUBLISHABLE_KEY'));
define('STRIPE_SECRET_KEY', $_ENV['STRIPE_SECRET_KEY'] ?? getenv('STRIPE_SECRET_KEY'));
define('STRIPE_WEBHOOK_SECRET', $_ENV['STRIPE_WEBHOOK_SECRET'] ?? getenv('STRIPE_WEBHOOK_SECRET'));

define('PAYPAL_CLIENT_ID', $_ENV['PAYPAL_CLIENT_ID'] ?? getenv('PAYPAL_CLIENT_ID'));
define('PAYPAL_CLIENT_SECRET', $_ENV['PAYPAL_CLIENT_SECRET'] ?? getenv('PAYPAL_CLIENT_SECRET'));
define('PAYPAL_MODE', $_ENV['PAYPAL_MODE'] ?? getenv('PAYPAL_MODE')); // 'sandbox' or 'live'

define('NOWPAYMENTS_API_KEY', $_ENV['NOWPAYMENTS_API_KEY'] ?? getenv('NOWPAYMENTS_API_KEY'));
define('NOWPAYMENTS_IPN_SECRET', $_ENV['NOWPAYMENTS_IPN_SECRET'] ?? getenv('NOWPAYMENTS_IPN_SECRET'));
define('NOWPAYMENTS_CALLBACK_URL', $_ENV['NOWPAYMENTS_CALLBACK_URL'] ?? getenv('NOWPAYMENTS_CALLBACK_URL'));

// Mail Configuration
define('MAIL_DRIVER', $_ENV['MAIL_DRIVER'] ?? getenv('MAIL_DRIVER'));
define('MAIL_HOST', $_ENV['MAIL_HOST'] ?? getenv('MAIL_HOST'));
define('MAIL_PORT', $_ENV['MAIL_PORT'] ?? getenv('MAIL_PORT'));
define('MAIL_USERNAME', $_ENV['MAIL_USERNAME'] ?? getenv('MAIL_USERNAME'));
define('MAIL_PASSWORD', $_ENV['MAIL_PASSWORD'] ?? getenv('MAIL_PASSWORD'));
define('MAIL_ENCRYPTION', $_ENV['MAIL_ENCRYPTION'] ?? getenv('MAIL_ENCRYPTION'));
define('MAIL_FROM_ADDRESS', $_ENV['MAIL_FROM_ADDRESS'] ?? getenv('MAIL_FROM_ADDRESS'));
define('MAIL_FROM_NAME', $_ENV['MAIL_FROM_NAME'] ?? getenv('MAIL_FROM_NAME'));


// Validate essential configuration
if (empty(DB_NAME) || empty(DB_USER)) {
    die("Database configuration is incomplete. Please check your .env file.");
}

/**
 * Creates and returns a PDO database connection.
 * @return PDO
 * @throws Exception if connection fails
 */
function getPDOConnection() {
    try {
        $pdo = new PDO(
            "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4",
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
                PDO::ATTR_EMULATE_PREPARES => false
            ]
        );
        return $pdo;
    } catch (PDOException $e) {
        http_response_code(500);
        echo json_encode([
            'success' => false,
            'error' => 'Database connection failed',
            'details' => $e->getMessage() // <-- show real error
        ]);
        exit;
    }
}

/**
 * Get user's location using ipgeolocation.io API
 * @return array Associative array with country, state, city, ip, currency, currency_code, currency_symbol, api_status, raw_response
 */
function getUserLocation() {
    $default_location = [
        'country' => 'Unknown',
        'state' => 'Unknown',
        'city' => 'Unknown',
        'ip' => null,
        'currency' => 'USD',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'api_status' => 'failed',
        'raw_response' => null
    ];

    try {
        // Simple API call without IP detection
        $geo = getLocationFromIpGeolocation();
        if ($geo) {
            $country = $geo['country_name'] ?? 'Unknown';
            $state = $geo['state_prov'] ?? ($geo['state'] ?? 'Unknown');
            $city = $geo['city'] ?? 'Unknown';
            $ip = $geo['ip'] ?? 'Unknown';
            $currency = ($country === 'Nigeria' || ($geo['country_code2']) === 'NG') ? 'NGN' : 'USD';
            return [
                'country' => $country,
                'state' => $state,
                'city' => $city,
                'ip' => $ip,
                'currency' => $currency,
                'currency_code' => $currency,
                'currency_symbol' => $currency === 'NGN' ? '₦' : '$',
                'api_status' => 'success',
                'raw_response' => $geo
            ];
        }
    } catch (Throwable $e) {
        // Silent error handling - don't log to avoid noise
    }

    return $default_location;
}

/**
 * Query ipgeolocation.io API for location data
 * @return array|null
 */
function getLocationFromIpGeolocation() {
    if (!VITE_LOCATION_API_KEY) return null;
    $url = 'https://api.ipgeolocation.io/ipgeo?apiKey=' . VITE_LOCATION_API_KEY;
    $response = @file_get_contents($url);
    if (!$response) return null;
    $data = json_decode($response, true);
    if (!is_array($data)) return null;
    return $data;
}

/**
 * Format date as "Mon, 12th Jan 2025"
 */
function formatDateHuman($timestamp = null) {
    $dt = new DateTime($timestamp ?? 'now');
    $day = $dt->format('j');
    $suffix = match (true) {
        $day % 10 == 1 && $day != 11 => 'st',
        $day % 10 == 2 && $day != 12 => 'nd',
        $day % 10 == 3 && $day != 13 => 'rd',
        default => 'th'
    };
    return $dt->format('D, ') . $day . $suffix . $dt->format(' M Y');
}

/**
 * Format time as "10:57:11 PM"
 */
function formatTimeHuman($timestamp = null) {
    $dt = new DateTime($timestamp ?? 'now');
    return $dt->format('h:i:s A');
}

/**
 * Get both formatted date and time
 */
function getFormattedDateTime($timestamp = null) {
    return [
        'date_human' => formatDateHuman($timestamp),
        'time_human' => formatTimeHuman($timestamp),
        'full' => formatDateHuman($timestamp) . ' at ' . formatTimeHuman($timestamp)
    ];
}
?>