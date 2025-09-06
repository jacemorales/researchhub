<?php
require_once __DIR__.'/config.php';
require_once __DIR__.'/drive_api.php';

if (isset($_GET['code'])) {
    handleGoogleCallback();
}

header('Location: ../index.php');
exit;