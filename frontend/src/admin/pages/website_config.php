<?php
require_once __DIR__ . '/includes/config.php';
require_once __DIR__ . '/includes/database.php';
require_once __DIR__ . '/includes/drive_api.php';

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    googleDriveLogout();
    header('Location: index.php');
    exit;
}

// Handle config updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_config'])) {
    $configKey = $_POST['config_key'] ?? '';
    $configValue = $_POST['config_value'] ?? '';

    if ($configKey && $configValue !== '') {
        try {
            $result = $db->updateConfig($configKey, $configValue);

            if ($result) {
                $_SESSION['success_message'] = 'Configuration updated successfully!';
            } else {
                $_SESSION['error_message'] = 'Failed to update configuration.';
            }
        } catch (Exception $e) {
            $_SESSION['error_message'] = 'Error updating configuration: ' . $e->getMessage();
        }
    } else {
        $_SESSION['error_message'] = 'Invalid configuration data.';
    }

    // Redirect to avoid form resubmission
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Handle category updates
if ($_SERVER['REQUEST_METHOD'] === 'POST' && isset($_POST['update_category'])) {
    $category = $_POST['category'] ?? '';
    $updates = $_POST['config_updates'] ?? [];

    if ($category && !empty($updates)) {
        $successCount = 0;
        $errorCount = 0;

        foreach ($updates as $configKey => $configValue) {
            try {
                $result = $db->updateConfig($configKey, $configValue);
                if ($result) {
                    $successCount++;
                } else {
                    $errorCount++;
                }
            } catch (Exception $e) {
                $errorCount++;
            }
        }

        if ($errorCount === 0) {
            $_SESSION['success_message'] = "All {$category} settings updated successfully!";
        } elseif ($successCount > 0) {
            $_SESSION['success_message'] = "Updated {$successCount} settings successfully. {$errorCount} failed.";
        } else {
            $_SESSION['error_message'] = 'Failed to update any settings.';
        }
    } else {
        $_SESSION['error_message'] = 'Invalid category data.';
    }

    // Redirect to avoid form resubmission
    header('Location: ' . $_SERVER['PHP_SELF']);
    exit;
}

// Get all configuration data
$configData = $db->getAllConfigWithDetails();
$configCategories = [
    'site' => 'Site Information',
    'author' => 'Author Information',
    'contact' => 'Contact Information',
    'social' => 'Social Media',
    'about' => 'About Page',
    'team' => 'Team Information',
    'blog' => 'Blog Content',
    'footer' => 'Footer Information',
    'purchase' => 'Purchase Settings',
    'seo' => 'SEO Settings',
    'technical' => 'Technical Settings'
];

include __DIR__ . '/includes/admin_header.php';
?>

<div class="config-content">
    <div class="config-header">
        <h1><i class="fas fa-cog"></i> Website Configuration</h1>
        <p>Manage all website settings and content from this centralized admin panel.</p>
    </div>

    <div class="config-grid">
        <?php foreach ($configCategories as $category => $categoryName): ?>
            <div class="config-category">
                <div class="category-header">
                    <h2><i class="fas fa-<?php echo getCategoryIcon($category); ?>"></i> <?php echo $categoryName; ?></h2>
                    <button class="btn-edit-category" onclick="openCategoryModal('<?php echo $category; ?>')">
                        <i class="fas fa-edit"></i> Edit All
                    </button>
                </div>

                <div class="config-items">
                    <?php
                    $categoryConfigs = array_filter($configData, function ($config) use ($category) {
                        return $config['config_category'] === $category;
                    });
                    ?>

                    <?php foreach ($categoryConfigs as $config): ?>
                        <div class="config-item">
                            <div class="config-info">
                                <h3><?php echo formatConfigKey($config['config_key']); ?></h3>
                                <p class="config-description"><?php echo $config['config_description']; ?></p>
                                <div class="config-value">
                                    <strong>Current Value:</strong>
                                    <span class="value-preview">
                                        <?php echo truncateValue($config['config_value'], 50); ?>
                                    </span>
                                </div>
                            </div>
                            <div class="config-actions">
                                <button class="btn-edit-item" onclick="openEditModal('<?php echo $config['config_key']; ?>', '<?php echo htmlspecialchars($config['config_value'], ENT_QUOTES); ?>', '<?php echo $config['config_type']; ?>', '<?php echo htmlspecialchars($config['config_description'], ENT_QUOTES); ?>')">
                                    <i class="fas fa-edit"></i> Edit
                                </button>
                            </div>
                        </div>
                    <?php endforeach; ?>
                </div>
            </div>
        <?php endforeach; ?>
    </div>
</div>

<!-- Edit Configuration Modal -->
<div class="modal" id="editConfigModal" style="display: none;">
    <div class="modal-content">
        <span class="close-modal" onclick="closeModal('editConfigModal')">×</span>

        <div class="modal-header">
            <h2 class="modal-title">Edit Configuration</h2>
            <p class="modal-subtitle" id="configDescription"></p>
        </div>

        <form class="config-form" method="POST" id="editConfigForm">
            <input type="hidden" name="update_config" value="1">
            <input type="hidden" name="config_key" id="editConfigKey">

            <div class="form-group">
                <label for="editConfigValue">Value</label>
                <div id="editConfigInputContainer">
                    <!-- Input will be dynamically generated based on config type -->
                </div>
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save Changes
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('editConfigModal')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </form>
    </div>
</div>

<!-- Category Edit Modal -->
<div class="modal" id="categoryModal" style="display: none;">
    <div class="modal-content large">
        <span class="close-modal" onclick="closeModal('categoryModal')">×</span>

        <div class="modal-header">
            <h2 class="modal-title" id="categoryModalTitle">Edit Category</h2>
            <p class="modal-subtitle">Edit all settings in this category at once</p>
        </div>

        <form class="category-form" method="POST" id="categoryForm">
            <input type="hidden" name="update_category" value="1">
            <input type="hidden" name="category" id="editCategory">

            <div id="categoryConfigContainer">
                <!-- Config inputs will be dynamically generated -->
            </div>

            <div class="form-actions">
                <button type="submit" class="btn btn-primary">
                    <i class="fas fa-save"></i> Save All Changes
                </button>
                <button type="button" class="btn btn-secondary" onclick="closeModal('categoryModal')">
                    <i class="fas fa-times"></i> Cancel
                </button>
            </div>
        </form>
    </div>
</div>

<script src="assets/js/website_config.js"></script>
<script src="assets/js/toast.js"></script>
<script>
    // Initialize toast notifications for website config
    document.addEventListener('DOMContentLoaded', function() {
        // Check for session messages and show toast notifications
        <?php if (isset($_SESSION['success_message'])): ?>
            showToast('success', '<?php echo addslashes($_SESSION['success_message']); ?>');
            <?php unset($_SESSION['success_message']); ?>
        <?php endif; ?>

        <?php if (isset($_SESSION['error_message'])): ?>
            showToast('error', '<?php echo addslashes($_SESSION['error_message']); ?>');
            <?php unset($_SESSION['error_message']); ?>
        <?php endif; ?>
    });
</script>
</body>

</html>

<?php
function getCategoryIcon($category)
{
    $icons = [
        'site' => 'globe',
        'author' => 'user',
        'contact' => 'envelope',
        'social' => 'share-alt',
        'about' => 'info-circle',
        'team' => 'users',
        'blog' => 'blog',
        'footer' => 'footer',
        'purchase' => 'credit-card',
        'seo' => 'search',
        'technical' => 'tools'
    ];
    return $icons[$category] ?? 'cog';
}

function formatConfigKey($key)
{
    return ucwords(str_replace('_', ' ', $key));
}

function truncateValue($value, $length = 50)
{
    if (strlen($value) <= $length) {
        return htmlspecialchars($value);
    }
    return htmlspecialchars(substr($value, 0, $length)) . '...';
}
?>