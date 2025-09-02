<?php
// Load environment variables
$envFile = __DIR__ . '/../.env';
if (file_exists($envFile)) {
    $envContent = file_get_contents($envFile);
    $envLines = explode("\n", $envContent);
    foreach ($envLines as $line) {
        $line = trim($line);
        if (!empty($line) && strpos($line, '#') !== 0) {
            list($key, $value) = explode('=', $line, 2);
            $_ENV[trim($key)] = trim($value);
        }
    }
}

// Return Google API configuration as JSON
header('Content-Type: application/json');

echo json_encode([
    'auth_uri' => 'https://accounts.google.com/o/oauth2/auth',
    'token_uri' => 'https://oauth2.googleapis.com/token',
    'auth_provider_x509_cert_url' => 'https://www.googleapis.com/oauth2/v1/certs',
    'project_id' => $_ENV['GOOGLE_PROJECT_ID'] ?? '',
    'client_id' => $_ENV['GOOGLE_CLIENT_ID'] ?? '',
    'client_secret' => $_ENV['GOOGLE_CLIENT_SECRET'] ?? '',
    'javascript_origins' => explode(',', $_ENV['GOOGLE_JAVASCRIPT_ORIGINS'] ?? ''),
    'redirect_uris' => [$_ENV['GOOGLE_REDIRECT_URI'] ?? '']
]);
?>
