<?php 
require_once 'config.php';
require_once INCLUDE_PATH . 'header.php';
?>

<main class="container">
    <?php include INCLUDE_PATH . 'sidebar.php'; ?>

    <div class="main-resources"id="levelCards">
        <h2 class="section-title"><?php echo getConfig('RESOURCES_TITLE', 'Academic Resources'); ?></h2>
        <p class="section-subtitle"><?php echo getConfig('RESOURCE_BIO', RESOURCE_BIO); ?></p>
        
        
        <div class="level-cards">
            <!-- Undergraduate Card -->
            <div class="level-card" onclick="window.location.href='pages/marketplace.php?level=undergraduate'">
                <div class="level-icon undergraduate">
                    <i class="fas fa-user-graduate"></i>
                </div>
                <h3>Undergraduate</h3>
                <p>Access projects, research papers, and study materials for undergraduate programs</p>
                <button class="btn">Explore Resources</button>
            </div>
            
            <!-- Postgraduate Card -->
            <div class="level-card" onclick="window.location.href='pages/marketplace.php?level=postgraduate'">
                <div class="level-icon postgraduate">
                    <i class="fas fa-graduation-cap"></i>
                </div>
                <h3>Postgraduate</h3>
                <p>Discover thesis papers, advanced research materials, and academic publications</p>
                <button class="btn">Explore Resources</button>
            </div>
        </div>
    </div>
</main>


<?php 
include INCLUDE_PATH . 'modal_contact.php';
include INCLUDE_PATH . 'modal_about.php';
include INCLUDE_PATH . 'modal_blog.php';
include INCLUDE_PATH . 'modal_author.php';
include INCLUDE_PATH . 'notification.php';
include INCLUDE_PATH . 'footer.php';
?>