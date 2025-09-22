<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/../config.php';

// Handle preflight OPTIONS request
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    http_response_code(200);
    exit;
}

// Set content type to JSON for all responses
header('Content-Type: application/json');

try {
    $action = $_REQUEST['action'] ?? '';
    $uploader = new CloudflareR2Uploader();

    switch ($action) {
        case 'local_file_upload':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method for local upload.');
            }
            if (!isset($_FILES['file']) || !isset($_POST['file_name'])) {
                throw new Exception('Missing file or file_name for local upload.');
            }
            $result = $uploader->uploadLocalFile($_FILES['file'], $_POST['file_name']);
            echo json_encode($result);
            break;

        case 'drive_file_upload':
            if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
                throw new Exception('Invalid request method for Drive upload.');
            }
            $input = json_decode(file_get_contents('php://input'), true);
            if (!$input || !isset($input['drive_file_id']) || !isset($input['file_name'])) {
                throw new Exception('Missing drive_file_id or file_name for Drive upload.');
            }
            
            // ⚠️ Google Drive upload not implemented yet — stubbed for now
            throw new Exception('Google Drive upload not implemented yet. Use local upload for now.');

            /*
            $result = $uploader->uploadFromGoogleDrive(
                $input['drive_file_id'],
                $input['file_name'],
                $input['file_id'] ?? uniqid()
            );
            echo json_encode($result);
            */
            break;

        default:
            throw new Exception('Invalid or missing action parameter. Use ?action=local_file_upload or ?action=drive_file_upload');
    }

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}

class CloudflareR2Uploader {
    private $endpoint;
    private $accessKey;
    private $secretKey;
    private $bucket;
    private $publicUrl;
    private $client;

    public function __construct() {
        // Load R2 credentials from config constants
        $this->endpoint = 'https://' . R2_ACCOUNT_ID . '.r2.cloudflarestorage.com';
        $this->accessKey = R2_ACCESS_KEY_ID;
        $this->secretKey = R2_SECRET_ACCESS_KEY;
        $this->bucket = R2_BUCKET_NAME;
        $this->publicUrl = R2_PUBLIC_URL;

        if (empty($this->accessKey) || empty($this->secretKey) || empty($this->bucket)) {
            throw new Exception('R2 credentials not properly configured in .env');
        }

        // Initialize AWS S3 client for R2 (S3-compatible API)
        $this->client = new \Aws\S3\S3Client([
            'version' => 'latest',
            'region' => 'auto',
            'endpoint' => $this->endpoint,
            'credentials' => [
                'key' => $this->accessKey,
                'secret' => $this->secretKey,
            ],
            'use_path_style_endpoint' => true,
        ]);
    }

    /**
     * Upload local file to R2
     */
    public function uploadLocalFile($file, $fileName) {
        try {
            if ($file['error'] !== UPLOAD_ERR_OK) {
                throw new Exception('File upload error: ' . $this->getUploadError($file['error']));
            }

            $fileContent = file_get_contents($file['tmp_name']);
            if ($fileContent === false) {
                throw new Exception('Failed to read uploaded file');
            }

            // Generate unique R2 key (path)
            $fileId = uniqid();
            $r2Key = $this->generateR2Key($fileName, $fileId);

            // Upload to R2 with public-read ACL
            $this->client->putObject([
                'Bucket' => $this->bucket,
                'Key' => $r2Key,
                'Body' => $fileContent,
                'ContentType' => mime_content_type($file['tmp_name']) ?: 'application/octet-stream',
                'ContentDisposition' => 'attachment; filename="' . addslashes($fileName) . '"',
                'ACL' => 'public-read', // 👈 Makes file accessible via pub-*.r2.dev
                'Metadata' => [
                    'original-filename' => $fileName,
                    'upload-timestamp' => date('Y-m-d H:i:s'),
                    'source' => 'local-upload'
                ]
            ]);

            return [
                'success' => true,
                'r2_key' => $r2Key,
                'public_url' => $this->getPublicUrl($r2Key),
                'size' => strlen($fileContent)
            ];

        } catch (Exception $e) {
            error_log('Local Upload Error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Generate R2 key (path) for file
     */
    private function generateR2Key($fileName, $fileId) {
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($fileName, PATHINFO_FILENAME));
        $timestamp = date('Y/m/d');
        
        return "uploads/{$timestamp}/{$fileId}_{$safeName}.{$extension}";
    }

    /**
     * Get public URL for R2 object
     */
    public function getPublicUrl($key) {
        if (!empty($this->publicUrl)) {
            return rtrim($this->publicUrl, '/') . '/' . rawurlencode($key);
        }
        
        // Fallback (not recommended for public access)
        return rtrim($this->endpoint, '/') . '/' . $this->bucket . '/' . rawurlencode($key);
    }

    /**
     * Convert PHP upload error code to message
     */
    private function getUploadError($code) {
        $errors = [
            UPLOAD_ERR_INI_SIZE => 'The uploaded file exceeds the upload_max_filesize directive.',
            UPLOAD_ERR_FORM_SIZE => 'The uploaded file exceeds the MAX_FILE_SIZE directive.',
            UPLOAD_ERR_PARTIAL => 'The uploaded file was only partially uploaded.',
            UPLOAD_ERR_NO_FILE => 'No file was uploaded.',
            UPLOAD_ERR_NO_TMP_DIR => 'Missing a temporary folder.',
            UPLOAD_ERR_CANT_WRITE => 'Failed to write file to disk.',
            UPLOAD_ERR_EXTENSION => 'A PHP extension stopped the file upload.',
        ];
        return $errors[$code] ?? 'Unknown upload error';
    }
}