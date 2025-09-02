<?php
// Load configuration first
require_once __DIR__ . '/../config.php';

// Get level from URL
$level = isset($_GET['level']) ? htmlspecialchars($_GET['level']) : 'undergraduate';
$page_title = ucfirst($level) . ' Resources | ' . getConfig('SITE_NAME', 'Research Hub');

// Include header
require_once INCLUDE_PATH . 'header.php';

// Get academic files from database
try {
    $pdo = new PDO(
        "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME,
        DB_USER,
        DB_PASS,
        [
            PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
            PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC
        ]
    );
    
    $stmt = $pdo->prepare("SELECT * FROM academic_files WHERE level = ? ORDER BY created_at DESC");
    $stmt->execute([$level]);
    $academicFiles = $stmt->fetchAll();
    
} catch (PDOException $e) {
    $academicFiles = [];
    error_log("Database error in marketplace: " . $e->getMessage());
}
?>

<div class="marketplace-container" id="levelCards">
    <!-- Breadcrumb -->
    <div class="breadcrumb">
        <a href="../index.php">Home</a>
        <span>/</span>
        <a href="#" class="active"><?php echo ucfirst($level); ?> Resources</a>
    </div>

    <!-- Marketplace Header -->
    <div class="marketplace-header">
        <h1><?php echo ucfirst($level); ?> Resources</h1>
        <div class="controls">
            <div class="search-box">
                <i class="fas fa-search"></i>
                <input type="text" placeholder="Search resources..." id="resourceSearch">
            </div>
            <select id="resourceFilter">
                <option value="all">All Categories</option>
                <option value="research">Research Papers</option>
                <option value="thesis">Thesis</option>
                <option value="dissertation">Dissertation</option>
                <option value="assignment">Assignment</option>
                <option value="project">Project</option>
                <option value="presentation">Presentation</option>
                <option value="other">Other</option>
            </select>
        </div>
    </div>

    <!-- Resources Table -->
    <div class="resources-grid">
        <?php if (empty($academicFiles)): ?>
            <div class="no-resources">
                <i class="fas fa-folder-open"></i>
                <h3>No resources available</h3>
                <p>No <?php echo $level; ?> resources have been uploaded yet. Please check back later.</p>
            </div>
        <?php else: ?>
            <?php foreach ($academicFiles as $file): ?>
                <div class="resource-card" data-category="<?php echo $file['category']; ?>">
                    <div class="resource-header">
                        <div class="file-icon">
                            <i class="fas fa-file"></i>
                        </div>
                        <div class="resource-info">
                            <h3><?php echo htmlspecialchars($file['file_name']); ?></h3>
                            <p class="file-meta">
                                <span><i class="fas fa-tag"></i> <?php echo ucfirst($file['category']); ?></span>
                                <span><i class="fas fa-file"></i> <?php echo htmlspecialchars($file['file_type']); ?></span>
                                <span><i class="fas fa-weight-hanging"></i> <?php echo htmlspecialchars($file['file_size']); ?></span>
                            </p>
                        </div>
                    </div>
                    
                    <div class="resource-description">
                        <p><?php echo htmlspecialchars($file['description'] ?? 'No description available'); ?></p>
                    </div>
                    
                    <div class="resource-footer">
                        <div class="price">
                            <span class="price-amount">$<?php echo number_format($file['price'], 2); ?></span>
                        </div>
                        <div class="actions">
                            <button class="btn btn-sm btn-outline" onclick="previewResource(<?php echo $file['id']; ?>, '<?php echo htmlspecialchars($file['file_name']); ?>', '<?php echo htmlspecialchars($file['description'] ?? ''); ?>')">
                                <i class="fas fa-eye"></i> Preview
                            </button>
                            <button class="btn btn-sm btn-primary" onclick="openPurchaseModal(<?php echo $file['id']; ?>, '<?php echo htmlspecialchars($file['file_name']); ?>', <?php echo $file['price']; ?>)">
                                <i class="fas fa-shopping-cart"></i> Purchase
                            </button>
                        </div>
                    </div>
                </div>
            <?php endforeach; ?>
        <?php endif; ?>
    </div>
</div>

<script>
// Search functionality
document.getElementById('resourceSearch').addEventListener('input', function() {
    const searchTerm = this.value.toLowerCase();
    const cards = document.querySelectorAll('.resource-card');
    
    cards.forEach(card => {
        const title = card.querySelector('h3').textContent.toLowerCase();
        const description = card.querySelector('.resource-description p').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm)) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Filter functionality
document.getElementById('resourceFilter').addEventListener('change', function() {
    const selectedCategory = this.value;
    const cards = document.querySelectorAll('.resource-card');
    
    cards.forEach(card => {
        const category = card.dataset.category;
        
        if (selectedCategory === 'all' || category === selectedCategory) {
            card.style.display = 'block';
        } else {
            card.style.display = 'none';
        }
    });
});

// Preview resource function
function previewResource(fileId, fileName, description) {
    // Update preview modal content
    document.getElementById('previewTitle').textContent = fileName;
    document.getElementById('previewDescription').textContent = description;
    
    // Open preview modal
    openModal('previewModal');
}

// Purchase modal function  
function openPurchaseModal(fileId, fileName, filePrice) {
    document.getElementById('fileId').value = fileId;
    document.getElementById('filePrice').value = filePrice;
    document.getElementById('purchaseProductName').textContent = fileName;
    document.getElementById('summaryProduct').textContent = fileName;
    document.getElementById('summaryPrice').textContent = '$' + parseFloat(filePrice).toFixed(2);
    
    // Calculate tax (assuming 10% tax rate)
    const tax = parseFloat(filePrice) * 0.1;
    const total = parseFloat(filePrice) + tax;
    
    document.getElementById('summaryTax').textContent = '$' + tax.toFixed(2);
    document.getElementById('summaryTotal').textContent = '$' + total.toFixed(2);
    
    openModal('purchaseModal');
}
</script>

<?php
// Include modals and footer
require_once INCLUDE_PATH . 'modal_contact.php';
require_once INCLUDE_PATH . 'modal_about.php';
require_once INCLUDE_PATH . 'modal_blog.php';
require_once INCLUDE_PATH . 'modal_purchase.php';
require_once INCLUDE_PATH . 'modal_preview.php';
require_once INCLUDE_PATH . 'footer.php';
?>