<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title><?php echo getConfig('SITE_NAME'); ?> | <?php echo $page_title ?? 'Home'; ?></title>
    <link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.0/css/all.min.css">
    <link href="https://fonts.googleapis.com/css2?family=Poppins:wght@300;400;500;600;700&family=Playfair+Display:wght@700&display=swap" rel="stylesheet">
    <link rel="stylesheet" href="<?php echo CSS_PATH; ?>style.css">
    <script src="<?php echo JS_PATH; ?>toast.js"></script>
</head>
<body>
<header>
    <div class="logo">
        <div class="logo-icon">
            <i class="fas fa-book-open"></i>
        </div>
        <div class="logo-text">
            <h1><?php echo getConfig('SITE_NAME'); ?></h1>
            <p><?php echo getConfig('SITE_DESC'); ?></p>
        </div>
    </div>
    <nav>
        <ul>
            <li><a href="<?php echo PREFIX_PATH; ?>index.php"><i class="fas fa-home"></i> Home</a></li>
            <li><a href="#levelCards"><i class="fas fa-book"></i> Resources</a></li>
            <li><a id="blogLink"><i class="fas fa-blog"></i> Blog</a></li>
            <li><a id="aboutLink"><i class="fas fa-info-circle"></i> About</a></li>
            <li><a id="contactLink"><i class="fas fa-envelope"></i> Contact</a></li>
        </ul>
    </nav>
</header>