<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/config.php';

function getGoogleClient() {
    $client = new Google\Client();
    $client->setClientId(GOOGLE_CLIENT_ID);
    $client->setClientSecret(GOOGLE_CLIENT_SECRET);
    $client->setRedirectUri(GOOGLE_REDIRECT_URI);
    $client->addScope(Google\Service\Drive::DRIVE_READONLY);
    $client->setAccessType('offline');
    $client->setPrompt('select_account consent');
    return $client;
}

function handleGoogleCallback() {
    session_start();
    $client = getGoogleClient();
    if (isset($_GET['code'])) {
        $token = $client->fetchAccessTokenWithAuthCode($_GET['code']);
        $client->setAccessToken($token);
        $_SESSION['access_token'] = $token;
        header('Location: ' . filter_var(GOOGLE_REDIRECT_URI, FILTER_SANITIZE_URL));
    }
}

function getDriveFiles() {
    session_start();
    if (isset($_SESSION['access_token']) && $_SESSION['access_token']) {
        $client = getGoogleClient();
        $client->setAccessToken($_SESSION['access_token']);
        $drive = new Google_Service_Drive($client);
        $files = $drive->files->listFiles(array(
            'pageSize' => 10,
            'fields' => "nextPageToken, files(id, name, mimeType, webViewLink, modifiedTime, size)"
        ));
        return $files->getFiles();
    } else {
        return null;
    }
}

if (isset($_GET['action'])) {
    if ($_GET['action'] == 'auth') {
        $client = getGoogleClient();
        $authUrl = $client->createAuthUrl();
        header('Location: ' . filter_var($authUrl, FILTER_SANITIZE_URL));
    } elseif ($_GET['action'] == 'callback') {
        handleGoogleCallback();
    }
}
?>
