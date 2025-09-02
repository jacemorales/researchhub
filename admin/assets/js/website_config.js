// Website Configuration JavaScript

// Configuration data (will be populated from PHP)
let configData = {};

// Modal functions
function openModal(modalId) {
    document.getElementById(modalId).style.display = 'flex';
    document.body.style.overflow = 'hidden';
}

function closeModal(modalId) {
    document.getElementById(modalId).style.display = 'none';
    document.body.style.overflow = 'auto';
}

// Close modal when clicking outside
window.onclick = function(event) {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        if (event.target === modal) {
            closeModal(modal.id);
        }
    });
}

// Open edit configuration modal
function openEditModal(configKey, currentValue, configType, description) {
    document.getElementById('editConfigKey').value = configKey;
    document.getElementById('configDescription').textContent = description;
    
    const container = document.getElementById('editConfigInputContainer');
    container.innerHTML = '';
    
    // Generate appropriate input based on config type
    let inputHtml = '';
    switch(configType) {
        case 'textarea':
            inputHtml = `<textarea name="config_value" id="editConfigValue" rows="5" required>${currentValue}</textarea>`;
            break;
        case 'number':
            inputHtml = `<input type="number" name="config_value" id="editConfigValue" value="${currentValue}" required>`;
            break;
        case 'boolean':
            const checked = currentValue === '1' ? 'checked' : '';
            inputHtml = `
                <div class="boolean-input">
                    <label class="switch">
                        <input type="checkbox" name="config_value" id="editConfigValue" value="1" ${checked}>
                        <span class="slider"></span>
                    </label>
                    <span class="boolean-label">${checked ? 'Enabled' : 'Disabled'}</span>
                </div>
            `;
            break;
        case 'image':
            inputHtml = `
                <div class="image-input">
                    <input type="text" name="config_value" id="editConfigValue" value="${currentValue}" placeholder="Enter image URL or path" required>
                    <div class="image-preview">
                        <img src="${currentValue}" alt="Preview" onerror="this.style.display='none'">
                    </div>
                </div>
            `;
            break;
        default:
            inputHtml = `<input type="text" name="config_value" id="editConfigValue" value="${currentValue}" required>`;
    }
    
    container.innerHTML = inputHtml;
    
    // Add event listener for boolean toggle
    if (configType === 'boolean') {
        const checkbox = document.getElementById('editConfigValue');
        const label = document.querySelector('.boolean-label');
        checkbox.addEventListener('change', function() {
            label.textContent = this.checked ? 'Enabled' : 'Disabled';
        });
    }
    
    openModal('editConfigModal');
}

// Open category edit modal
function openCategoryModal(category) {
    document.getElementById('editCategory').value = category;
    document.getElementById('categoryModalTitle').textContent = `Edit ${getCategoryName(category)}`;
    
    // Fetch category configs via AJAX
    fetch(`includes/get_category_configs.php?category=${category}`)
        .then(response => response.json())
        .then(data => {
            const container = document.getElementById('categoryConfigContainer');
            container.innerHTML = '';
            
            data.forEach(config => {
                const configHtml = createConfigInput(config);
                container.innerHTML += configHtml;
            });
            
            openModal('categoryModal');
        })
        .catch(error => {
            console.error('Error fetching category configs:', error);
            alert('Error loading category configuration');
        });
}

// Create config input HTML
function createConfigInput(config) {
    let inputHtml = '';
    const configKey = config.config_key;
    const currentValue = config.config_value;
    const configType = config.config_type;
    const description = config.config_description;
    
    switch(configType) {
        case 'textarea':
            inputHtml = `
                <div class="form-group">
                    <label for="${configKey}">${formatConfigKey(configKey)}</label>
                    <p class="config-description">${description}</p>
                    <textarea name="config_updates[${configKey}]" id="${configKey}" rows="3" required>${currentValue}</textarea>
                </div>
            `;
            break;
        case 'number':
            inputHtml = `
                <div class="form-group">
                    <label for="${configKey}">${formatConfigKey(configKey)}</label>
                    <p class="config-description">${description}</p>
                    <input type="number" name="config_updates[${configKey}]" id="${configKey}" value="${currentValue}" required>
                </div>
            `;
            break;
        case 'boolean':
            const checked = currentValue === '1' ? 'checked' : '';
            inputHtml = `
                <div class="form-group">
                    <label for="${configKey}">${formatConfigKey(configKey)}</label>
                    <p class="config-description">${description}</p>
                    <div class="boolean-input">
                        <label class="switch">
                            <input type="checkbox" name="config_updates[${configKey}]" id="${configKey}" value="1" ${checked}>
                            <span class="slider"></span>
                        </label>
                        <span class="boolean-label">${checked ? 'Enabled' : 'Disabled'}</span>
                    </div>
                </div>
            `;
            break;
        case 'image':
            inputHtml = `
                <div class="form-group">
                    <label for="${configKey}">${formatConfigKey(configKey)}</label>
                    <p class="config-description">${description}</p>
                    <div class="image-input">
                        <input type="text" name="config_updates[${configKey}]" id="${configKey}" value="${currentValue}" placeholder="Enter image URL or path" required>
                        <div class="image-preview">
                            <img src="${currentValue}" alt="Preview" onerror="this.style.display='none'">
                        </div>
                    </div>
                </div>
            `;
            break;
        default:
            inputHtml = `
                <div class="form-group">
                    <label for="${configKey}">${formatConfigKey(configKey)}</label>
                    <p class="config-description">${description}</p>
                    <input type="text" name="config_updates[${configKey}]" id="${configKey}" value="${currentValue}" required>
                </div>
            `;
    }
    
    return inputHtml;
}

// Helper functions
function getCategoryName(category) {
    const categories = {
        'site': 'Site Information',
        'author': 'Author Information',
        'contact': 'Contact Information',
        'social': 'Social Media',
        'about': 'About Page',
        'team': 'Team Information',
        'blog': 'Blog Content',
        'footer': 'Footer Information',
        'purchase': 'Purchase Settings',
        'seo': 'SEO Settings',
        'technical': 'Technical Settings'
    };
    return categories[category] || category;
}

function formatConfigKey(key) {
    return key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Initialize page
document.addEventListener('DOMContentLoaded', function() {
    // Add event listeners for boolean inputs in category modal
    document.addEventListener('change', function(e) {
        if (e.target.type === 'checkbox' && e.target.closest('.category-form')) {
            const label = e.target.closest('.form-group').querySelector('.boolean-label');
            if (label) {
                label.textContent = e.target.checked ? 'Enabled' : 'Disabled';
            }
        }
    });
    
    // Add image preview functionality
    document.addEventListener('input', function(e) {
        if (e.target.type === 'text' && e.target.closest('.image-input')) {
            const preview = e.target.closest('.image-input').querySelector('.image-preview img');
            if (preview) {
                preview.src = e.target.value;
                preview.style.display = 'block';
                preview.onerror = function() {
                    this.style.display = 'none';
                };
            }
        }
    });
});

// Search functionality
function searchConfigs(query) {
    const configItems = document.querySelectorAll('.config-item');
    const searchTerm = query.toLowerCase();
    
    configItems.forEach(item => {
        const title = item.querySelector('h3').textContent.toLowerCase();
        const description = item.querySelector('.config-description').textContent.toLowerCase();
        const value = item.querySelector('.value-preview').textContent.toLowerCase();
        
        if (title.includes(searchTerm) || description.includes(searchTerm) || value.includes(searchTerm)) {
            item.style.display = 'block';
        } else {
            item.style.display = 'none';
        }
    });
}

// Handle form submissions with AJAX and toast notifications
document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.getElementById('configSearch');
    if (searchInput) {
        searchInput.addEventListener('input', function() {
            searchConfigs(this.value);
        });
    }
    
    // Handle individual config form submission
    const editForm = document.getElementById('editConfigForm');
    if (editForm) {
        editForm.addEventListener('submit', function(e) {
            // Show loading state
            const submitButton = this.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;
            submitButton.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Saving...';
            submitButton.disabled = true;
            
            // Let the form submit normally
            // The page will reload and show the notification
        });
    }
});