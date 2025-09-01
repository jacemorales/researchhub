<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/config.php';

function getGoogleClient() {
    $client = new Google\Client();
    
    // Load environment variables from admin .env file
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
    
    $client->setClientId($_ENV['GOOGLE_CLIENT_ID'] ?? '');
    $client->setClientSecret($_ENV['GOOGLE_CLIENT_SECRET'] ?? '');
    $client->setRedirectUri($_ENV['GOOGLE_REDIRECT_URI'] ?? '');
    $client->addScope(Google\Service\Drive::DRIVE);
    $client->setAccessType('offline');
    $client->setPrompt('select_account consent');
    
    if (isset($_SESSION['google_access_token'])) {
        $client->setAccessToken($_SESSION['google_access_token']);
        
        if ($client->isAccessTokenExpired()) {
            try {
                $refreshToken = $client->getRefreshToken();
                if ($refreshToken) {
                    $newToken = $client->fetchAccessTokenWithRefreshToken($refreshToken);
                    $_SESSION['google_access_token'] = $newToken;
                } else {
                    // No refresh token, need to re-authenticate
                    unset($_SESSION['google_access_token']);
                    return $client;
                }
            } catch (Exception $e) {
                error_log('Token refresh error: ' . $e->getMessage());
                unset($_SESSION['google_access_token']);
                return $client;
            }
        }
    }
    
    return $client;
}

function fetchDriveFiles() {
    try {
        $client = getGoogleClient();
        
        if (!$client->getAccessToken()) {
            return [
                'error' => 'Authentication required',
                'auth_url' => $client->createAuthUrl()
            ];
        }
        
        $drive = new Google\Service\Drive($client);
        $result = $drive->files->listFiles([
            'pageSize' => 20,
            'fields' => 'files(id, name, mimeType, webViewLink, createdTime, modifiedTime, size)',
            'orderBy' => 'modifiedTime desc'
        ]);
        
        return $result->files;
    } catch (Exception $e) {
        error_log('Drive API Error: ' . $e->getMessage());
        return [
            'error' => 'Failed to fetch files: ' . $e->getMessage(),
            'auth_url' => getGoogleClient()->createAuthUrl()
        ];
    }
}

function handleGoogleCallback() {
    if (!isset($_GET['code'])) {
        return false;
    }

    $client = getGoogleClient();
    
    try {
        $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
        
        if (isset($token['error'])) {
            throw new Exception($token['error_description'] ?? $token['error']);
        }
        
        $_SESSION['google_access_token'] = $token;
        return true;
    } catch (Exception $e) {
        error_log('OAuth Error: ' . $e->getMessage());
        $_SESSION['error'] = 'Authentication failed: ' . $e->getMessage();
        return false;
    }
}

