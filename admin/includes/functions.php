<?php
// Prevent duplicate function declarations
if (!function_exists('formatFileSize')) {
    function formatFileSize($bytes) {
        if ($bytes === null) return 'N/A';
        
        $units = ['B', 'KB', 'MB', 'GB'];
        $bytes = max($bytes, 0);
        $pow = floor(($bytes ? log($bytes) : 0) / log(1024));
        $pow = min($pow, count($units) - 1);
        $bytes /= (1 << (10 * $pow));
        
        return round($bytes, 2) . ' ' . $units[$pow];
    }
}

if (!function_exists('getFileIconClass')) {
    function getFileIconClass($mimeType) {
        $icons = [
            'pdf' => 'fa-file-pdf',
            'word' => 'fa-file-word',
            'excel' => 'fa-file-excel',
            'powerpoint' => 'fa-file-powerpoint',
            'image' => 'fa-file-image',
            'text' => 'fa-file-alt',
            'zip' => 'fa-file-archive'
        ];
        
        if (strpos($mimeType, 'pdf') !== false) return $icons['pdf'];
        if (strpos($mimeType, 'word') !== false) return $icons['word'];
        if (strpos($mimeType, 'spreadsheet') !== false) return $icons['excel'];
        if (strpos($mimeType, 'presentation') !== false) return $icons['powerpoint'];
        if (strpos($mimeType, 'image') !== false) return $icons['image'];
        if (strpos($mimeType, 'text') !== false) return $icons['text'];
        if (strpos($mimeType, 'zip') !== false) return $icons['zip'];
        
        return 'fa-file';
    }
}

if (!function_exists('getFileType')) {
    function getFileType($mimeType, $fileName = '') {
        // Get file extension from the last dot in filename
        if (!empty($fileName)) {
            $lastDotPos = strrpos($fileName, '.');
            if ($lastDotPos !== false) {
                $extension = substr($fileName, $lastDotPos);
                if (!empty($extension)) {
                    return strtolower($extension) . ' File';
                }
            }
        }
        
        // Fallback to MIME type mapping for Google Drive files
        $mimeTypes = [
            'application/pdf' => 'PDF',
            'application/vnd.google-apps.document' => 'Google Doc',
            'application/vnd.google-apps.spreadsheet' => 'Google Sheet',
            'application/vnd.google-apps.presentation' => 'Google Slides',
            'application/vnd.openxmlformats-officedocument.wordprocessingml.document' => 'Word Document',
            'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' => 'Excel Spreadsheet',
            'application/vnd.openxmlformats-officedocument.presentationml.presentation' => 'PowerPoint Presentation',
            'text/plain' => 'Text File',
            'image/jpeg' => 'JPEG Image',
            'image/png' => 'PNG Image',
            'image/gif' => 'GIF Image',
            'application/zip' => 'ZIP Archive',
            'application/x-rar-compressed' => 'RAR Archive',
            'application/vnd.rar' => 'RAR Archive'
        ];
        
        if (isset($mimeTypes[$mimeType])) {
            return $mimeTypes[$mimeType];
        }
        
        return 'Unknown File Type';
    }
}

if (!function_exists('getFileDetails')) {
    function getFileDetails($fileId) {
        try {
            $client = getGoogleClient();
            
            if (!$client->getAccessToken()) {
                return false;
            }
            
            $drive = new Google\Service\Drive($client);
            $file = $drive->files->get($fileId, [
                'fields' => 'id, name, mimeType, webViewLink, createdTime, modifiedTime, size, description'
            ]);
            
            return [
                'id' => $file->id,
                'name' => $file->name,
                'mimeType' => $file->mimeType,
                'size' => $file->size,
                'modifiedTime' => $file->modifiedTime,
                'createdTime' => $file->createdTime,
                'webViewLink' => $file->webViewLink,
                'description' => $file->description ?? ''
            ];
        } catch (Exception $e) {
            error_log('Error getting file details: ' . $e->getMessage());
            return false;
        }
    }
}

if (!function_exists('redirect')) {
    function redirect($url, $statusCode = 303) {
        if (!headers_sent()) {
            header('Location: ' . $url, true, $statusCode);
            exit;
        }
        // Fallback with JavaScript if headers already sent
        echo '<script>window.location.href="'.htmlspecialchars($url).'";</script>';
        exit;
    }
}

// Additional useful functions (safe to add)
if (!function_exists('sanitizeInput')) {
    function sanitizeInput($data) {
        return htmlspecialchars(strip_tags(trim($data)));
    }
}

function googleDriveLogout() {
    // Clear all Google-related session data
    unset($_SESSION['google_token_data']);
    unset($_SESSION['google_access_token']);
    unset($_SESSION['oauth_error']);
    
    // Destroy the complete session
    session_destroy();
    
    // Force immediate re-authentication
    header('Location: admin.php?reauth=1');
    exit;
}

?>