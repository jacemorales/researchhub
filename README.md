# Research Hub - Academic Marketplace

A comprehensive academic resource marketplace with dynamic content management through an admin panel.

## Features

### 🎯 Core Features

- **Dynamic Content Management**: All website content is now configurable through the admin panel
- **Google Drive Integration**: Seamless file management with automatic file type detection
- **Responsive Design**: Modern, mobile-friendly interface
- **Database-Driven Configuration**: Centralized content management system

### 🔧 Admin Panel Features

- **Website Configuration**: Edit all website content through intuitive modals
- **File Management**: Upload and manage academic resources from Google Drive
- **Real-time Updates**: Changes reflect immediately across the website
- **Category-based Organization**: Content organized by categories for easy management

## Installation

### Prerequisites

- PHP 7.4 or higher
- MySQL 5.7 or higher
- Composer
- Google Drive API credentials

### Setup Instructions

1. **Clone the repository**

   ```bash
   git clone <repository-url>
   cd research
   ```

2. **Install dependencies**

   ```bash
   composer install
   ```

3. **Database Setup**

   ```bash
   # Import the main database schema
   mysql -u root -p < admin/db/db.sql

   # Import the website configuration
   mysql -u root -p < admin/db/website_config.sql
   ```

4. **Configure Database**

   - Update database credentials in `config.php`
   - Ensure the database `research_hub` exists

5. **Google Drive API Setup**

   - Create a Google Cloud Project
   - Enable Google Drive API
   - Create OAuth 2.0 credentials
   - Download credentials and save as `admin/assets/js/credentials.json`

6. **File Permissions**
   ```bash
   chmod 755 admin/
   chmod 644 admin/assets/js/credentials.json
   ```

## Database Structure

### Main Tables

#### `academic_files`

Stores information about uploaded academic resources:

- `id`: Primary key
- `drive_file_id`: Google Drive file ID
- `file_name`: Display name
- `file_type`: File type (auto-detected)
- `file_size`: File size
- `category`: Resource category
- `level`: Academic level (undergraduate/postgraduate)
- `price`: Resource price

#### `website_config`

Stores all website configuration settings:

- `config_key`: Configuration key
- `config_value`: Configuration value
- `config_type`: Input type (text, textarea, image, number, boolean)
- `config_category`: Category grouping
- `config_description`: Description for admin interface

## Admin Panel Usage

### Accessing the Admin Panel

Navigate to `/admin/admin.php` to access the main admin panel.

### Website Configuration

1. Go to `/admin/website_config.php`
2. Browse configuration by category:
   - **Site Information**: Basic site settings
   - **Author Information**: Author/founder details
   - **Contact Information**: Contact details
   - **Social Media**: Social media links
   - **About Page**: About page content
   - **Team Information**: Team member details
   - **Blog Content**: Blog articles and categories
   - **Footer Information**: Footer content
   - **SEO Settings**: SEO meta information
   - **Technical Settings**: System configuration

### Editing Configuration

1. **Individual Settings**: Click "Edit" on any configuration item
2. **Category Editing**: Click "Edit All" to edit all settings in a category
3. **Real-time Preview**: See changes immediately
4. **Auto-save**: Changes are saved to database automatically

### File Management

1. **Google Drive Integration**: Connect your Google Drive account
2. **File Selection**: Browse and select files from Drive
3. **Auto-detection**: File types are automatically detected
4. **Metadata Management**: Add descriptions, categories, and pricing

## File Type Detection

The system now automatically detects file types based on:

1. **File Extension**: Primary method using file extension
2. **MIME Type**: Fallback using Google Drive MIME type
3. **Custom Mapping**: Extensive mapping for common file types
4. **Fallback**: Unknown extensions become "EXTENSION File"

### Supported File Types

- **Documents**: PDF, Word, Excel, PowerPoint, Text, RTF
- **Images**: JPEG, PNG, GIF, BMP, TIFF, SVG, WebP
- **Archives**: ZIP, RAR, 7Z, TAR, GZ
- **Media**: MP4, AVI, MOV, WMV, MP3, WAV, WMA
- **Code**: HTML, CSS, JS, PHP, Python, Java, C++, C, SQL, JSON, XML
- **Design**: PSD, AI, EPS
- **Other**: CSV, ICO, EXE, MSI, DMG, DEB, RPM

## Configuration Categories

### Site Information

- Website name and description
- Resource section titles and descriptions

### Author Information

- Author name, title, and biography
- Academic credentials and achievements
- Contact information

### Contact Information

- Contact form labels and text
- Email, phone, and address details

### Social Media

- Facebook, Twitter, LinkedIn, Instagram links

### About Page

- Story and mission content
- Team member information
- Company values

### Blog Content

- Blog articles and metadata
- Category descriptions
- Newsletter settings

### Footer Information

- Copyright text and descriptions
- Social media links

### SEO Settings

- Meta descriptions and keywords

### Technical Settings

- Maintenance mode
- File upload limits
- Allowed file types

## Customization

### Adding New Configuration

1. Add new entries to `admin/db/website_config.sql`
2. Use appropriate `config_type`:
   - `text`: Single line text
   - `textarea`: Multi-line text
   - `image`: Image URL or path
   - `number`: Numeric value
   - `boolean`: True/false toggle

### Styling

- Admin styles: `admin/assets/css/admin.css`
- Main site styles: `assets/css/style.css`
- Configuration styles included in admin CSS

### JavaScript

- Admin functionality: `admin/assets/js/website_config.js`
- Main site functionality: `assets/js/script.js`

## Security Features

- **Session Management**: Secure admin sessions
- **Input Validation**: All inputs are sanitized
- **Database Security**: Prepared statements prevent SQL injection
- **File Type Validation**: Only allowed file types accepted

## Troubleshooting

### Common Issues

1. **Database Connection Error**

   - Check database credentials in `config.php`
   - Ensure MySQL service is running
   - Verify database exists

2. **Google Drive Authentication Error**

   - Check credentials file path
   - Verify OAuth 2.0 setup
   - Ensure API is enabled

3. **Configuration Not Loading**
   - Check database connection
   - Verify `website_config` table exists
   - Check PHP error logs

### Error Logs

- PHP errors: Check server error logs
- Database errors: Logged to PHP error log
- Google API errors: Displayed in admin interface

## Support

For technical support or questions:

- Email: contact@researchhub.com
- Check the admin panel for configuration issues
- Review error logs for debugging

## License

This project is proprietary software. All rights reserved.

---

**Note**: This system provides a complete content management solution for academic resource marketplaces with dynamic configuration capabilities.
