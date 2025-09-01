<div class="modal" id="contactModal">
    <div class="modal-content">
        <span class="close-modal" data-modal="contactModal">&times;</span>
        
        <div class="modal-header">
            <h2 class="modal-title"><?php echo getConfig('CONTACT_TITLE', 'Contact Us'); ?></h2>
            <p class="modal-subtitle"><?php echo getConfig('CONTACT_SUBTITLE', 'Get in touch with our support team'); ?></p>
        </div>
        
        <div class="modal-body">
            <div class="contact-info">
                <div class="contact-item">
                    <i class="fas fa-envelope"></i>
                    <div>
                        <strong>Email:</strong>
                        <a href="mailto:<?php echo getConfig('CONTACT_EMAIL'); ?>"><?php echo getConfig('CONTACT_EMAIL'); ?></a>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-phone"></i>
                    <div>
                        <strong>Phone:</strong>
                        <a href="tel:<?php echo getConfig('CONTACT_PHONE'); ?>"><?php echo getConfig('CONTACT_PHONE'); ?></a>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-map-marker-alt"></i>
                    <div>
                        <strong>Address:</strong>
                        <span><?php echo getConfig('CONTACT_ADDRESS'); ?></span>
                    </div>
                </div>
                <div class="contact-item">
                    <i class="fas fa-location-dot"></i>
                    <div>
                        <strong>Your Location:</strong>
                        <span id="userLocation"></span>
                    </div>
                </div>
            </div>
            
            <form id="contactForm">
                <div class="form-row">
                    <div class="form-group">
                        <label for="contactName"><?php echo getConfig('CONTACT_NAME_LABEL', 'Full Name'); ?></label>
                        <input type="text" id="contactName" name="contact_name" required>
                    </div>
                    
                    <div class="form-group">
                        <label for="contactEmail"><?php echo getConfig('CONTACT_EMAIL_LABEL', 'Email Address'); ?></label>
                        <input type="email" id="contactEmail" name="contact_email" required>
                    </div>
                </div>
                
                <div class="form-group">
                    <label for="contactSubject"><?php echo getConfig('CONTACT_SUBJECT_LABEL', 'Subject'); ?></label>
                    <input type="text" id="contactSubject" name="contact_subject" required>
                </div>
                
                <div class="form-group">
                    <label for="contactMessage"><?php echo getConfig('CONTACT_MESSAGE_LABEL', 'Message'); ?></label>
                    <textarea id="contactMessage" name="contact_message" rows="5" required></textarea>
                </div>
                
                <div class="form-actions">
                    <button type="submit" class="btn btn-primary">
                        <i class="fas fa-paper-plane"></i> <?php echo getConfig('CONTACT_SUBMIT_BUTTON', 'Send Message'); ?>
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closeModal('contactModal')">
                        <?php echo getConfig('CONTACT_CANCEL', 'Cancel'); ?>
                    </button>
                </div>
            </form>
            
            <div id="contactStatus" style="display: none;">
                <div class="contact-status">
                    <div class="status-icon">
                        <i class="fas fa-spinner fa-spin"></i>
                    </div>
                    <h3 id="contactStatusTitle">Sending Message...</h3>
                    <p id="contactStatusMessage">Please wait while we send your message.</p>
                </div>
            </div>
        </div>
    </div>
</div>

<script>
// Geolocation API function with timeout
function getUserLocation() {
    const locationElement = document.getElementById('userLocation');
    
    // Clear any existing error or retry button
    const existingError = locationElement.parentElement.querySelector('.location-error');
    const existingRetry = locationElement.parentElement.querySelector('.location-retry');
    if (existingError) existingError.remove();
    if (existingRetry) existingRetry.remove();
    
    locationElement.textContent = 'Getting location...';
    
    // Set timeout for location fetch
    const timeout = setTimeout(() => {
        locationElement.textContent = 'Couldn\'t get location';
        
        // Add error message
        const errorDiv = document.createElement('div');
        errorDiv.className = 'location-error';
        errorDiv.textContent = 'Location request timed out. Please try again.';
        locationElement.parentElement.appendChild(errorDiv);
        
        // Add retry button
        const retryBtn = document.createElement('button');
        retryBtn.className = 'location-retry';
        retryBtn.textContent = 'Retry Location';
        retryBtn.onclick = getUserLocation;
        locationElement.parentElement.appendChild(retryBtn);
    }, 30000); // 30 seconds timeout
    
    // Use IP-based geolocation API to get country and state only
    fetch('https://api.ipgeolocation.io/v2/ipgeo?apiKey=<?php 
        // Load env from admin folder
        $envFile = __DIR__ . '/../admin/.env';
        $apiKey = 'free'; // default fallback
        if (file_exists($envFile)) {
            $envContent = file_get_contents($envFile);
            $envLines = explode("\n", $envContent);
            foreach ($envLines as $line) {
                $line = trim($line);
                if (!empty($line) && strpos($line, '#') !== 0 && strpos($line, 'LOCATION_API_KEY=') === 0) {
                    $apiKey = substr($line, strlen('LOCATION_API_KEY='));
                    break;
                }
            }
        }
        echo $apiKey;
    ?>')
        .then(response => {
            clearTimeout(timeout);
            if (!response.ok) {
                throw new Error('Network response was not ok');
            }
            return response.json();
        })
        .then(data => {
            clearTimeout(timeout);
            const country = data.location.country_name || 'Unknown';
            const state = data.location.city|| 'Unknown';
            const location = `${state}, ${country}`;
            locationElement.textContent = location;
        })
        .catch(error => {
            clearTimeout(timeout);
            console.error('Error fetching location:', error);
            locationElement.textContent = 'Couldn\'t get location';
            
            // Add error message
            const errorDiv = document.createElement('div');
            errorDiv.className = 'location-error';
            errorDiv.textContent = 'Failed to fetch location. Please try again.';
            locationElement.parentElement.appendChild(errorDiv);
            
            // Add retry button
            const retryBtn = document.createElement('button');
            retryBtn.className = 'location-retry';
            retryBtn.textContent = 'Retry Location';
            retryBtn.onclick = getUserLocation;
            locationElement.parentElement.appendChild(retryBtn);
        });
}

// Contact form functionality
document.getElementById('contactForm').addEventListener('submit', function(e) {
    e.preventDefault();
    
    const formData = new FormData(this);
    
    // Show processing status
    document.getElementById('contactForm').style.display = 'none';
    document.getElementById('contactStatus').style.display = 'block';
    document.getElementById('contactStatusTitle').textContent = 'Sending Message...';
    document.getElementById('contactStatusMessage').textContent = 'Please wait while we send your message.';
    
    // Add action parameter
    formData.append('action', 'process_contact');
    
    // Submit contact form
    fetch('../processes.php', {
        method: 'POST',
        body: formData
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            document.getElementById('contactStatusTitle').textContent = 'Message Sent!';
            document.getElementById('contactStatusMessage').textContent = data.message;
            document.querySelector('.status-icon i').className = 'fas fa-check-circle';
            document.querySelector('.status-icon i').style.color = '#4ade80';
            
            // Close modal after 5 seconds
            setTimeout(() => {
                closeModal('contactModal');
                // Reset form
                document.getElementById('contactForm').reset();
                document.getElementById('contactForm').style.display = 'block';
                document.getElementById('contactStatus').style.display = 'none';
            }, 5000);
        } else {
            throw new Error(data.error || 'Failed to send message');
        }
    })
    .catch(error => {
        document.getElementById('contactStatusTitle').textContent = 'Message Failed';
        document.getElementById('contactStatusMessage').textContent = error.message;
        document.querySelector('.status-icon i').className = 'fas fa-times-circle';
        document.querySelector('.status-icon i').style.color = '#f87171';
        
        // Show retry button
        setTimeout(() => {
            document.getElementById('contactForm').style.display = 'block';
            document.getElementById('contactStatus').style.display = 'none';
        }, 3000);
    });
});
getUserLocation();
</script>