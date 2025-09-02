<?php
require_once __DIR__.'/includes/config.php';
require_once __DIR__.'/includes/drive_api.php';

// Handle logout
if (isset($_GET['action']) && $_GET['action'] === 'logout') {
    googleDriveLogout();
    header('Location: index.php');
    exit;
}

// Handle file selection
if (isset($_POST['select_file']) && isset($_POST['file_id'])) {
    $selectedFile = getFileDetails($_POST['file_id']);
    if ($selectedFile) {
        $_SESSION['selected_file'] = $selectedFile;
    }
}

// Get drive files
$driveResult = fetchDriveFiles();
?>
<?php include __DIR__.'/includes/admin_header.php'; ?>

        <div class="drive-content">
            <?php if (!isset($_SESSION['google_access_token'])): ?>
                <div class="auth-prompt">
                    <div class="auth-card">
                        <div class="auth-icon">
                            <i class="fab fa-google-drive"></i>
                        </div>
                        <h2>Connect to Google Drive</h2>
                        <p>Sign in to access your documents and automatically fill file details</p>
                        <a href="<?= getGoogleClient()->createAuthUrl() ?>" class="btn-auth">
                            <i class="fab fa-google"></i> Sign in with Google
                        </a>
                    </div>
                </div>
            <?php elseif (isset($driveResult['error'])): ?>
                <div class="alert error">
                    <i class="fas fa-exclamation-circle"></i>
                    <?= $driveResult['error'] ?>
                    <?php if (isset($driveResult['auth_url'])): ?>
                        
                    <?php endif; ?>
                </div>
                <a href="<?= $driveResult['auth_url'] ?>" class="btn-auth">
                            <i class="fab fa-google"></i> Re-authenticate
                        </a>
            <?php else: ?>
                <div class="content-grid">
                    <!-- File Selection Section -->
                    <div class="file-selection-section">
                        <div class="section-header">
                            <h2><i class="fab fa-google-drive"></i> Your Drive Files</h2>
                            <div class="header-actions">
                                <div class="search-box">
                                    <i class="fas fa-search"></i>
                                    <input type="text" id="fileSearch" placeholder="Search files...">
                                </div>
                                <button id="refreshDrive" class="btn-icon" title="Refresh files">
                                    <i class="fas fa-sync-alt"></i>
                                </button>
                            </div>
                        </div>
                        
                        <div class="drive-file-list" id="fileList">
                            <?php foreach ($driveResult as $file): ?>
                            <div class="drive-file" data-file-id="<?= $file['id'] ?>" data-file-name="<?= htmlspecialchars($file['name']) ?>">
                                <div class="file-icon">
                                    <i class="fas <?= getFileIconClass($file['mimeType']) ?>"></i>
                                </div>
                                <div class="file-details">
                                    <h3><?= htmlspecialchars($file['name']) ?></h3>
                                    <div class="file-meta">
                                        <span><i class="fas fa-calendar"></i> <?= date('M d, Y', strtotime($file['modifiedTime'])) ?></span>
                                        <span><i class="fas fa-weight-hanging"></i> <?= formatFileSize($file['size']) ?></span>
                                        <span><i class="fas fa-file"></i> <?= getFileType($file['mimeType'], $file['name']) ?></span>
                                    </div>
                                </div>
                                <div class="file-actions">
                                    <button class="btn-select-file" onclick="selectFile('<?= $file['id'] ?>', '<?= htmlspecialchars($file['name']) ?>', '<?= $file['mimeType'] ?>', '<?= $file['size'] ?>', '<?= $file['modifiedTime'] ?>')">
                                        <i class="fas fa-check"></i> Select
                                    </button>
                                    <a href="<?= $file['webViewLink'] ?>" target="_blank" class="btn-view" title="View in Drive">
                                        <i class="fas fa-external-link-alt"></i>
                                    </a>
                                </div>
                            </div>
                            <?php endforeach; ?>
                        </div>
                    </div>

                    <!-- File Details Form Section -->
                    <div class="file-details-section">
                        <div class="section-header">
                            <h2><i class="fas fa-edit"></i> File Details</h2>
                            <div class="selected-file-info" id="selectedFileInfo" style="display: none;">
                                <span class="selected-label">Selected:</span>
                                <span class="selected-name" id="selectedFileName"></span>
                            </div>
                        </div>
                        
                        <form class="file-details-form" id="fileDetailsForm">
                            <input type="hidden" id="fileId" name="fileId" value="">
                            <input type="hidden" id="fileDriveId" name="fileDriveId" value="">
                            <div class="form-grid">
                                <div class="form-group">
                                    <label for="fileName">
                                        <i class="fas fa-file"></i> File Name
                                    </label>
                                    <input type="text" id="fileName" name="fileName" placeholder="Enter file name" required readonly>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fileType">
                                        <i class="fas fa-tag"></i> File Type
                                    </label>
                                    <input type="text" id="fileType" name="fileType" placeholder="File type" readonly>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fileSize">
                                        <i class="fas fa-weight-hanging"></i> File Size
                                    </label>
                                    <input type="text" id="fileSize" name="fileSize" placeholder="File size" readonly>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fileDate">
                                        <i class="fas fa-calendar"></i> Modified Date
                                    </label>
                                    <input type="text" id="fileDate" name="fileDate" placeholder="Modified date" readonly>
                                </div>
                                
                                <div class="form-group full-width">
                                    <label for="fileDescription">
                                        <i class="fas fa-align-left"></i> Description
                                    </label>
                                    <textarea id="fileDescription" name="fileDescription" placeholder="Enter file description" rows="3"></textarea>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fileCategory">
                                        <i class="fas fa-folder"></i> Category
                                    </label>
                                    <select id="fileCategory" name="fileCategory" required>
                                        <option value="">Select category</option>
                                        <option value="research">Research Paper</option>
                                        <option value="thesis">Thesis</option>
                                        <option value="dissertation">Dissertation</option>
                                        <option value="assignment">Assignment</option>
                                        <option value="project">Project</option>
                                        <option value="presentation">Presentation</option>
                                        <option value="other">Other</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="fileLevel">
                                        <i class="fas fa-graduation-cap"></i> Level
                                    </label>
                                    <select id="fileLevel" name="fileLevel" required>
                                        <option value="">Select level</option>
                                        <option value="undergraduate">Undergraduate</option>
                                        <option value="postgraduate">Postgraduate</option>
                                    </select>
                                </div>
                                
                                <div class="form-group">
                                    <label for="filePrice">
                                        <i class="fas fa-dollar-sign"></i> Price (USD)
                                    </label>
                                    <div class="price-input">
                                        <span>$</span>
                                        <input type="number" id="filePrice" name="filePrice" placeholder="0.00" step="0.01" min="0">
                                    </div>
                                </div>
                                
                                <div class="form-group">
                                    <label for="filePriceNGN">
                                        <i class="fas fa-naira-sign"></i> Price (NGN)
                                    </label>
                                    <div class="price-input">
                                        <span>₦</span>
                                        <input type="number" id="filePriceNGN" name="filePriceNGN" placeholder="0.00" step="0.01" min="0">
                                    </div>
                                </div>
                            </div>
                            
                            <div class="form-actions">
                                <button type="submit" class="btn btn-primary">
                                    <i class="fas fa-save"></i> Save Details
                                </button>
                                <button type="button" class="btn btn-secondary" onclick="clearForm()">
                                    <i class="fas fa-eraser"></i> Clear Form
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            <?php endif; ?>
        </div>
    </div>

    <script src="assets/js/admin.js"></script>
</body>
</html>