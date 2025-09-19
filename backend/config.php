<?php
// config.php - Centralized Configuration & Connection

// Load Composer's autoloader
require_once __DIR__ . '/vendor/autoload.php';

// Load environment variables from .env file
try {
    $dotenv = Dotenv\Dotenv::createImmutable(__DIR__);
    $dotenv->load();
} catch (Throwable $e) {
    error_log("Could not load .env file: " . $e->getMessage());
    die("Configuration error: Environment file not loaded.");
}

// Database Configuration
define('DB_HOST', $_ENV['DB_HOST'] ?? 'localhost');
define('DB_NAME', $_ENV['DB_NAME'] ?? 'research_hub');
define('DB_USER', $_ENV['DB_USER'] ?? 'root');
define('DB_PASS', $_ENV['DB_PASS'] ?? '');
define('PAYSTACK_SECRET', $_ENV['PAYSTACK_SECRET'] ?? '');

// Cloudflare R2 Configuration
define('R2_ACCOUNT_ID', $_ENV['R2_ACCOUNT_ID'] ?? '');
define('R2_ACCESS_KEY_ID', $_ENV['R2_ACCESS_KEY_ID'] ?? '');
define('R2_SECRET_ACCESS_KEY', $_ENV['R2_SECRET_ACCESS_KEY'] ?? '');
define('R2_BUCKET_NAME', $_ENV['R2_BUCKET_NAME'] ?? '');
define('R2_PUBLIC_URL', $_ENV['R2_PUBLIC_URL'] ?? '');

// Payment Gateway Configuration
define('STRIPE_PUBLISHABLE_KEY', $_ENV['STRIPE_PUBLISHABLE_KEY'] ?? '');
define('STRIPE_SECRET_KEY', $_ENV['STRIPE_SECRET_KEY'] ?? '');
define('NOWPAYMENTS_API_KEY', $_ENV['NOWPAYMENTS_API_KEY'] ?? '');
define('NOWPAYMENTS_IPN_SECRET', $_ENV['NOWPAYMENTS_IPN_SECRET'] ?? '');

// Geolocation API Configuration (ipgeolocation.io)
define('VITE_LOCATION_API_KEY', $_ENV['VITE_LOCATION_API_KEY'] ?? '');

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
        error_log("Database connection failed: " . $e->getMessage());
        throw new Exception("Database connection failed");
    }
}

/**
 * Get user's location using ipgeolocation.io only
 * @param string|null $ip_address Optional IP; if not provided, will detect
 * @return array Associative array with country, state, city, ip, currency, currency_code, currency_symbol, api_status, raw_response
 */
function getUserLocation($ip_address = null) {
    $default_location = [
        'country' => 'Unknown',
        'state' => 'Unknown',
        'city' => 'Unknown',
        'ip' => null,
        'currency' => 'USD',
        'currency_code' => 'USD',
        'currency_symbol' => '$',
        'api_status' => 'failed',
        'raw_response' => null,
        'ip_type' => 'unknown'
    ];

    try {
        $resolved_ip = $ip_address ?: getUserIP();

        if (!$resolved_ip) {
            $default_location['api_status'] = 'no_ip';
            $default_location['raw_response'] = ['error' => 'No IP address detected'];
            return $default_location;
        }

        // Check if IP is local/private
        if (isLocalIP($resolved_ip)) {
            $default_location['ip'] = $resolved_ip;
            $default_location['api_status'] = 'local_ip';
            $default_location['ip_type'] = 'local';
            $default_location['raw_response'] = [
                'ip' => $resolved_ip,
                'message' => 'Local/private IP detected, skipping geolocation API call',
                'reason' => 'IP is in private range (127.0.0.0/8, 10.0.0.0/8, 172.16.0.0/12, 192.168.0.0/16)'
            ];
            return $default_location;
        }

        // Only call API for public IPs
        $geo = getLocationFromIpGeolocation($resolved_ip);
        if ($geo) {
            $country = $geo['country_name'] ?? 'Unknown';
            $state = $geo['state_prov'] ?? ($geo['state'] ?? 'Unknown');
            $city = $geo['city'] ?? 'Unknown';
            $ip = $geo['ip'] ?? $resolved_ip;
            $currency = ($country === 'Nigeria' || ($geo['country_code2'] ?? '') === 'NG') ? 'NGN' : 'USD';
            return [
                'country' => $country,
                'state' => $state,
                'city' => $city,
                'ip' => $ip,
                'currency' => $currency,
                'currency_code' => $currency,
                'currency_symbol' => $currency === 'NGN' ? '₦' : '$',
                'api_status' => 'success',
                'raw_response' => $geo,
                'ip_type' => 'public'
            ];
        } else {
            $default_location['ip'] = $resolved_ip;
            $default_location['api_status'] = 'api_failed';
            $default_location['ip_type'] = 'public';
            $default_location['raw_response'] = [
                'ip' => $resolved_ip,
                'error' => 'API returned null response',
                'message' => 'Geolocation API call failed or returned empty data'
            ];
        }
    } catch (Throwable $e) {
        error_log('Geolocation error: ' . $e->getMessage());
        $default_location['api_status'] = 'error';
        $default_location['raw_response'] = [
            'error' => $e->getMessage(),
            'type' => get_class($e),
            'file' => $e->getFile(),
            'line' => $e->getLine()
        ];
    }

    return $default_location;
}

/**
 * Get user's real IP address
 * @return string User's IP address
 */
function getUserIP() {
    $ip_keys = ['HTTP_X_FORWARDED_FOR', 'HTTP_X_REAL_IP', 'HTTP_CLIENT_IP', 'REMOTE_ADDR'];
    
    foreach ($ip_keys as $key) {
        if (!empty($_SERVER[$key])) {
            $ips = explode(',', $_SERVER[$key]);
            $ip = trim($ips[0]);
            if (filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE)) {
                return $ip;
            }
        }
    }
    
    return $_SERVER['REMOTE_ADDR'] ?? '127.0.0.1';
}

/**
 * Check if IP address is local/private
 * @param string $ip IP address to check
 * @return bool True if IP is local/private
 */
function isLocalIP($ip) {
    return !filter_var($ip, FILTER_VALIDATE_IP, FILTER_FLAG_NO_PRIV_RANGE | FILTER_FLAG_NO_RES_RANGE);
}

/**
 * Query ipgeolocation.io for a specific IP
 * @param string $ip
 * @return array|null
 */
function getLocationFromIpGeolocation($ip) {
    if (!VITE_LOCATION_API_KEY) return null;
    $url = 'https://api.ipgeolocation.io/ipgeo?apiKey=4536e311264a47429d9639d73b88d671';
    $response = @file_get_contents($url);
    if (!$response) return null;
    $data = json_decode($response, true);
    if (!is_array($data)) return null;
    return $data;
}
?>