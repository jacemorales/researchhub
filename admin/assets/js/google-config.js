// Google API Configuration
// This file loads Google API credentials from environment variables
// Generated dynamically by PHP

// Initialize config with static values
let GOOGLE_CONFIG = {
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    project_id: '',
    client_id: '',
    client_secret: '',
    javascript_origins: [],
    redirect_uris: []
};

// Load configuration from PHP endpoint
async function loadGoogleConfig() {
    try {
        const response = await fetch('../admin/includes/get_google_config.php');
        const config = await response.json();
        return config;
    } catch (error) {
        console.error('Failed to load Google config:', error);
        return {};
    }
}

// Load config when document is ready
document.addEventListener('DOMContentLoaded', async function() {
    const envConfig = await loadGoogleConfig();
    GOOGLE_CONFIG = { ...GOOGLE_CONFIG, ...envConfig };
});

// Export for use in other scripts
if (typeof module !== 'undefined' && module.exports) {
    module.exports = GOOGLE_CONFIG;
}
