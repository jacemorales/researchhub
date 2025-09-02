<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';
?>
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Admin Panel - <?php echo getConfig('SITE_NAME'); ?></title>
    <link rel="stylesheet" href="assets/css/config.css">
    <link rel="stylesheet" href="assets/css/admin.css">
    <script src="../assets/js/toast.js"></script>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap" rel="stylesheet">
</head>
<body>
    <div class="admin-container">
        <?php include __DIR__ . '/alerts.php'; ?>
        
        <nav class="admin-navbar">
            <div class="navbar-brand">
                <i class="fas fa-graduation-cap"></i>
                <span><?php echo getConfig('SITE_NAME'); ?> Admin</span>
            </div>
            <div class="navbar-actions">
                <a href="index.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) === 'index.php' ? 'active' : ''; ?>">
                    <i class="fas fa-cloud"></i>
                    <span>Drive Files</span>
                </a>
                <a href="website_config.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) === 'website_config.php' ? 'active' : ''; ?>">
                    <i class="fas fa-cog"></i>
                    <span>Website Config</span>
                </a>
                <a href="payments.php" class="nav-link <?php echo basename($_SERVER['PHP_SELF']) === 'payments.php' ? 'active' : ''; ?>">
                    <i class="fas fa-credit-card"></i>
                    <span>Payments</span>
                </a>
                <a href="?action=logout" class="btn-logout">
                    <i class="fas fa-sign-out-alt"></i>
                    <span>Sign Out</span>
                </a>
            </div>
        </nav>