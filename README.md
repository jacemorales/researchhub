# Academic Marketplace - Google Drive Integration

A modern, responsive web application that integrates with Google Drive API to manage academic documents and resources. Built with PHP, modern CSS, and JavaScript.

## 🚀 Features

### Core Functionality

- **Google Drive Integration**: Seamless authentication and file access
- **File Selection**: Browse and select files from your Google Drive
- **Auto-fill Forms**: Automatically populate file details when selecting documents
- **Modern UI**: Glassmorphism design with smooth animations
- **Responsive Design**: Works perfectly on desktop, tablet, and mobile devices

### Advanced Features

- **Real-time Search**: Search through your Drive files instantly
- **File Type Detection**: Automatic file type recognition and icons
- **Form Validation**: Comprehensive form validation and error handling
- **Keyboard Shortcuts**: Ctrl+F for search, Escape to clear form
- **Notifications**: Toast notifications for user feedback
- **Loading States**: Smooth loading animations and states

## 🛠️ Technology Stack

- **Backend**: PHP 7.4+
- **Frontend**: HTML5, CSS3, JavaScript (ES6+)
- **Google APIs**: Google Drive API v3
- **Styling**: Modern CSS with CSS Variables and Flexbox/Grid
- **Icons**: Font Awesome 6.4.0
- **Fonts**: Inter (Google Fonts)

## 📋 Prerequisites

- PHP 7.4 or higher
- Composer
- Web server (Apache/Nginx)
- Google Cloud Console account
- Google Drive API enabled

## 🔧 Installation

### 1. Clone the Repository

```bash
git clone <repository-url>
cd admin
```

### 2. Install Dependencies

```bash
composer install
```

### 3. Google Cloud Console Setup

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable Google Drive API
4. Create OAuth 2.0 credentials:
   - Application type: Web application
   - Authorized redirect URIs: `https://yourdomain.com/includes/auth_callback.php`
5. Download the credentials JSON file

### 4. Configuration

1. Rename your credentials file to `credentials.json`
2. Place it in `assets/js/` directory
3. Update `includes/config.php` with your Google API credentials:

```php
define('GOOGLE_CLIENT_ID', 'your-client-id');
define('GOOGLE_CLIENT_SECRET', 'your-client-secret');
define('GOOGLE_REDIRECT_URI', 'https://yourdomain.com/includes/auth_callback.php');
```

### 5. Database Setup

1. Create a MySQL database
2. Update database credentials in `includes/config.php`:

```php
define('DB_HOST', 'localhost');
define('DB_USER', 'your-username');
define('DB_PASS', 'your-password');
define('DB_NAME', 'your-database-name');
```

3. Import the database schema from `db/db.sql`

### 6. Web Server Configuration

#### Apache (.htaccess)

```apache
RewriteEngine On
RewriteCond %{REQUEST_FILENAME} !-f
RewriteCond %{REQUEST_FILENAME} !-d
RewriteRule ^(.*)$ index.php [QSA,L]
```

#### Nginx

```nginx
location / {
    try_files $uri $uri/ /index.php?$query_string;
}
```

## 🎯 Usage

### 1. Access the Application

Navigate to `admin.php` in your web browser.

### 2. Google Drive Authentication

- Click "Sign in with Google"
- Grant necessary permissions
- You'll be redirected back to the application

### 3. File Management

- **Browse Files**: View all your Google Drive files
- **Search**: Use the search bar to find specific files
- **Select Files**: Click "Select" on any file to auto-fill the form
- **View in Drive**: Click the external link icon to open files in Google Drive

### 4. Form Management

- **Auto-fill**: File details are automatically populated when selecting files
- **Manual Entry**: Fill in additional details like description, category, price
- **Save**: Submit the form to save file details
- **Clear**: Use the "Clear Form" button to reset all fields

### 5. Sign Out

Click the "Sign Out" button in the top navigation to log out of your Google account.

## 🎨 Design Features

### Modern UI Elements

- **Glassmorphism**: Translucent backgrounds with blur effects
- **Gradients**: Beautiful gradient backgrounds and buttons
- **Animations**: Smooth transitions and hover effects
- **Typography**: Clean, readable Inter font
- **Icons**: Comprehensive Font Awesome icon set

### Responsive Design

- **Mobile-first**: Optimized for mobile devices
- **Flexible Grid**: CSS Grid and Flexbox layouts
- **Touch-friendly**: Large touch targets for mobile users
- **Adaptive**: Different layouts for different screen sizes

### Accessibility

- **Keyboard Navigation**: Full keyboard support
- **Screen Reader**: Proper ARIA labels and semantic HTML
- **Focus Management**: Clear focus indicators
- **Color Contrast**: High contrast ratios for readability

## 🔒 Security Features

- **OAuth 2.0**: Secure Google authentication
- **Session Management**: Proper session handling
- **Input Validation**: Server-side validation
- **XSS Protection**: Output escaping
- **CSRF Protection**: Form token validation

## 📱 Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+

## 🚀 Performance Optimizations

- **Lazy Loading**: Images and content loaded on demand
- **Minified Assets**: Optimized CSS and JavaScript
- **Caching**: Browser caching for static assets
- **CDN**: Font Awesome and Google Fonts from CDN

## 🐛 Troubleshooting

### Common Issues

1. **Authentication Errors**

   - Verify Google API credentials
   - Check redirect URI configuration
   - Ensure Google Drive API is enabled

2. **File Loading Issues**

   - Check file permissions
   - Verify Google Drive access
   - Clear browser cache

3. **Styling Issues**
   - Ensure CSS files are loading
   - Check for JavaScript errors
   - Verify Font Awesome CDN access

### Debug Mode

Enable debug mode by setting:

```php
error_reporting(E_ALL);
ini_set('display_errors', 1);
```

## 📄 File Structure

```
admin/
├── admin.php                 # Main application file
├── composer.json            # PHP dependencies
├── README.md               # This file
├── assets/
│   ├── css/
│   │   ├── config.css      # CSS variables and base styles
│   │   └── admin.css       # Main application styles
│   └── js/
│       ├── admin.js        # JavaScript functionality
│       └── credentials.json # Google API credentials (create this file)
├── includes/
│   ├── config.php          # Configuration settings
│   ├── drive_api.php       # Google Drive API functions
│   ├── functions.php       # Utility functions
│   ├── auth_callback.php   # OAuth callback handler
│   └── alerts.php          # Alert/notification system
├── db/
│   └── db.sql             # Database schema
└── vendor/                # Composer dependencies
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🆘 Support

For support and questions:

- Create an issue in the repository
- Check the troubleshooting section
- Review the Google Drive API documentation

## 🔄 Updates

### Version 2.0.0

- Complete UI redesign with glassmorphism
- Enhanced file selection functionality
- Improved form validation
- Better mobile responsiveness
- Added keyboard shortcuts
- Enhanced notification system

---

**Note**: This application requires proper Google API credentials and web server configuration to function correctly. Make sure to follow the installation steps carefully.
