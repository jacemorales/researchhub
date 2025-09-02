// Modern Admin JavaScript
document.addEventListener('DOMContentLoaded', function() {
    // Initialize components
    initializeFileSearch();
    initializeRefreshButton();
    initializeFormHandling();
    initializeAnimations();
});

// File Search Functionality
function initializeFileSearch() {
    const searchInput = document.getElementById('fileSearch');
    if (!searchInput) return;

    searchInput.addEventListener('input', function(e) {
        const searchTerm = e.target.value.toLowerCase();
        const fileList = document.getElementById('fileList');
        const files = fileList.querySelectorAll('.drive-file');

        files.forEach(file => {
            const fileName = file.getAttribute('data-file-name').toLowerCase();
            if (fileName.includes(searchTerm)) {
                file.style.display = 'flex';
                file.style.animation = 'fadeInUp 0.3s ease forwards';
            } else {
                file.style.display = 'none';
            }
        });

        // Show/hide empty state
        const visibleFiles = Array.from(files).filter(file => file.style.display !== 'none');
        showEmptyState(visibleFiles.length === 0);
    });
}

// Refresh Button Functionality
function initializeRefreshButton() {
    const refreshBtn = document.getElementById('refreshDrive');
    if (!refreshBtn) return;

    refreshBtn.addEventListener('click', function() {
        this.classList.add('loading');
        this.innerHTML = '<i class="fas fa-spinner fa-spin"></i>';
        
        // Simulate refresh (replace with actual AJAX call)
        setTimeout(() => {
            location.reload();
        }, 1000);
    });
}

// Form Handling
function initializeFormHandling() {
    const form = document.getElementById('fileDetailsForm');
    if (!form) return;

    form.addEventListener('submit', function(e) {
        e.preventDefault();
        
        // Validate required fields
        const fileDriveId = document.getElementById('fileDriveId').value;
        const category = document.getElementById('fileCategory').value;
        const level = document.getElementById('fileLevel').value;
        
        if (!fileDriveId) {
            showNotification('Please select a file first', 'error');
            return;
        }
        
        if (!category || !level) {
            showNotification('Please fill in all required fields', 'error');
            return;
        }
        
        // Show loading state
        const submitBtn = form.querySelector('button[type="submit"]');
        const originalText = submitBtn.innerHTML;
        submitBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
        submitBtn.disabled = true;

        // Submit form data
        const formData = new FormData(form);
        
        fetch('includes/save_file_details.php', {
            method: 'POST',
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showNotification('File details saved successfully!', 'success');
                // Clear form after successful save
                setTimeout(() => {
                    clearForm();
                }, 2000);
            } else {
                showNotification(data.error || 'Failed to save file details', 'error');
            }
        })
        .catch(error => {
            console.error('Error:', error);
            showNotification('An error occurred while saving', 'error');
        })
        .finally(() => {
            submitBtn.innerHTML = originalText;
            submitBtn.disabled = false;
        });
    });
}

// File Selection Functionality
function selectFile(fileId, fileName, mimeType, fileSize, modifiedTime) {
    // Update selected file info
    const selectedFileInfo = document.getElementById('selectedFileInfo');
    const selectedFileName = document.getElementById('selectedFileName');
    
    if (selectedFileInfo && selectedFileName) {
        selectedFileName.textContent = fileName;
        selectedFileInfo.style.display = 'block';
    }

    // Update form fields
    document.getElementById('fileDriveId').value = fileId;
    document.getElementById('fileName').value = fileName;
    document.getElementById('fileType').value = getFileTypeDisplay(mimeType, fileName);
    document.getElementById('fileSize').value = formatFileSize(fileSize);
    document.getElementById('fileDate').value = formatDate(modifiedTime);

    // Update visual selection
    const allFiles = document.querySelectorAll('.drive-file');
    allFiles.forEach(file => file.classList.remove('selected'));
    
    const selectedFile = document.querySelector(`[data-file-id="${fileId}"]`);
    if (selectedFile) {
        selectedFile.classList.add('selected');
        selectedFile.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    // Show success notification
    showNotification(`Selected: ${fileName}`, 'success');
}

// Clear Form Functionality
function clearForm() {
    const form = document.getElementById('fileDetailsForm');
    if (!form) return;

    // Reset form
    form.reset();
    
    // Clear hidden fields
    document.getElementById('fileId').value = '';
    document.getElementById('fileDriveId').value = '';
    
    // Clear selected file info
    const selectedFileInfo = document.getElementById('selectedFileInfo');
    if (selectedFileInfo) {
        selectedFileInfo.style.display = 'none';
    }

    // Remove file selection
    const allFiles = document.querySelectorAll('.drive-file');
    allFiles.forEach(file => file.classList.remove('selected'));

    showNotification('Form cleared', 'info');
}

// Utility Functions
function getFileTypeDisplay(mimeType, fileName = '') {
    // Get file extension from the last dot in filename
    if (fileName) {
        const lastDotPos = fileName.lastIndexOf('.');
        if (lastDotPos !== -1) {
            const extension = fileName.substring(lastDotPos);
            if (extension) {
                return extension.toLowerCase() + ' File';
            }
        }
    }
    
    // Fallback to MIME type mapping for Google Drive files
    const mimeTypes = {
        'application/pdf': 'PDF',
        'application/vnd.google-apps.document': 'Google Doc',
        'application/vnd.google-apps.spreadsheet': 'Google Sheet',
        'application/vnd.google-apps.presentation': 'Google Slides',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'Word Document',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': 'Excel Spreadsheet',
        'application/vnd.openxmlformats-officedocument.presentationml.presentation': 'PowerPoint Presentation',
        'text/plain': 'Text File',
        'image/jpeg': 'JPEG Image',
        'image/png': 'PNG Image',
        'image/gif': 'GIF Image',
        'application/zip': 'ZIP Archive',
        'application/x-rar-compressed': 'RAR Archive',
        'application/vnd.rar': 'RAR Archive'
    };
    
    if (mimeTypes[mimeType]) {
        return mimeTypes[mimeType];
    }
    
    // Final fallback
    return 'Unknown File Type';
}

function formatFileSize(bytes) {
    if (bytes === null || bytes === undefined) return 'N/A';
    
    const units = ['B', 'KB', 'MB', 'GB'];
    bytes = Math.max(bytes, 0);
    const pow = Math.floor((bytes ? Math.log(bytes) : 0) / Math.log(1024));
    const powIndex = Math.min(pow, units.length - 1);
    bytes /= Math.pow(1024, powIndex);
    
    return Math.round(bytes * 100) / 100 + ' ' + units[powIndex];
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
    });
}

function showEmptyState(show) {
    let emptyState = document.querySelector('.empty-state');
    
    if (show && !emptyState) {
        emptyState = document.createElement('div');
        emptyState.className = 'empty-state';
        emptyState.innerHTML = `
            <i class="fas fa-search"></i>
            <h3>No files found</h3>
            <p>Try adjusting your search terms</p>
        `;
        document.getElementById('fileList').appendChild(emptyState);
    } else if (!show && emptyState) {
        emptyState.remove();
    }
}

// Notification System
function showNotification(message, type = 'info') {
    // Remove existing notifications
    const existingNotifications = document.querySelectorAll('.notification');
    existingNotifications.forEach(notification => notification.remove());

    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <div class="notification-content">
            <i class="fas ${getNotificationIcon(type)}"></i>
            <span>${message}</span>
            <button class="notification-close" onclick="this.parentElement.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        </div>
    `;

    // Add to page
    document.body.appendChild(notification);

    // Animate in
    setTimeout(() => {
        notification.classList.add('show');
    }, 100);

    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.remove('show');
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 300);
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        'success': 'fa-check-circle',
        'error': 'fa-exclamation-circle',
        'warning': 'fa-exclamation-triangle',
        'info': 'fa-info-circle'
    };
    return icons[type] || icons.info;
}

// Animation System
function initializeAnimations() {
    // Intersection Observer for scroll animations
    const observerOptions = {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px'
    };

    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                entry.target.classList.add('animate-in');
            }
        });
    }, observerOptions);

    // Observe elements for animation
    document.querySelectorAll('.drive-file, .form-group, .btn').forEach(el => {
        observer.observe(el);
    });
}

// Keyboard Shortcuts
document.addEventListener('keydown', function(e) {
    // Ctrl/Cmd + F to focus search
    if ((e.ctrlKey || e.metaKey) && e.key === 'f') {
        e.preventDefault();
        const searchInput = document.getElementById('fileSearch');
        if (searchInput) {
            searchInput.focus();
        }
    }

    // Escape to clear form
    if (e.key === 'Escape') {
        clearForm();
    }
});

// Add notification styles dynamically
const notificationStyles = `
    .notification {
        position: fixed;
        top: 20px;
        right: 20px;
        background: rgba(255, 255, 255, 0.95);
        backdrop-filter: blur(20px);
        border-radius: 15px;
        padding: 1rem 1.5rem;
        box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
        border: 1px solid rgba(255, 255, 255, 0.2);
        z-index: 1000;
        transform: translateX(100%);
        transition: transform 0.3s ease;
        max-width: 400px;
    }

    .notification.show {
        transform: translateX(0);
    }

    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.75rem;
    }

    .notification-success {
        border-left: 4px solid #4ade80;
    }

    .notification-error {
        border-left: 4px solid #f87171;
    }

    .notification-warning {
        border-left: 4px solid #fbbf24;
    }

    .notification-info {
        border-left: 4px solid #4361ee;
    }

    .notification-close {
        background: none;
        border: none;
        color: #64748b;
        cursor: pointer;
        padding: 0.25rem;
        border-radius: 50%;
        transition: all 0.2s ease;
        margin-left: auto;
    }

    .notification-close:hover {
        background: rgba(0, 0, 0, 0.1);
        color: #1e293b;
    }

    .animate-in {
        animation: fadeInUp 0.6s ease forwards;
    }

    .empty-state {
        text-align: center;
        padding: 3rem 2rem;
        color: #64748b;
    }

    .empty-state i {
        font-size: 3rem;
        margin-bottom: 1rem;
        color: #e2e8f0;
    }

    .empty-state h3 {
        margin-bottom: 0.5rem;
        color: #1e293b;
    }
`;

// Inject styles
const styleSheet = document.createElement('style');
styleSheet.textContent = notificationStyles;
document.head.appendChild(styleSheet);