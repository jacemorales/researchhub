<?php
require_once __DIR__ . '/../vendor/autoload.php';
require_once __DIR__ . '/config.php';

class CloudflareR2Uploader {
    private $endpoint;
    private $accessKey;
    private $secretKey;
    private $bucket;
    private $publicUrl;
    private $client;

    public function __construct() {
        // Load R2 credentials from environment
        $this->endpoint = $_ENV['R2_ENDPOINT'] ?? '';
        $this->accessKey = $_ENV['R2_ACCESS_KEY'] ?? '';
        $this->secretKey = $_ENV['R2_SECRET_KEY'] ?? '';
        $this->bucket = $_ENV['R2_BUCKET'] ?? '';
        $this->publicUrl = $_ENV['R2_PUBLIC_URL'] ?? '';

        if (empty($this->endpoint) || empty($this->accessKey) || empty($this->secretKey) || empty($this->bucket)) {
            throw new Exception('R2 credentials not properly configured in .env');
        }

        // Initialize AWS S3 client for R2 (compatible API)
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
     * Download file from Google Drive and upload to R2
     */
    public function uploadFromGoogleDrive($driveFileId, $fileName, $fileId) {
        try {
            // Get Google Drive client
            $client = getGoogleClient();
            if (!$client->getAccessToken()) {
                throw new Exception('Google Drive authentication required');
            }

            $drive = new Google\Service\Drive($client);
            
            // Download file content from Google Drive
            $fileContent = $this->downloadFromGoogleDrive($drive, $driveFileId);
            
            // Generate R2 key
            $r2Key = $this->generateR2Key($fileName, $fileId);
            
            // Upload to R2
            $result = $this->uploadToR2($r2Key, $fileContent, $fileName);
            
            return [
                'success' => true,
                'r2_key' => $r2Key,
                'public_url' => $this->getPublicUrl($r2Key),
                'size' => strlen($fileContent)
            ];

        } catch (Exception $e) {
            error_log('R2 Upload Error: ' . $e->getMessage());
            return [
                'success' => false,
                'error' => $e->getMessage()
            ];
        }
    }

    /**
     * Download file content from Google Drive
     */
    private function downloadFromGoogleDrive($drive, $fileId) {
        try {
            // Get file metadata first
            $file = $drive->files->get($fileId);
            $mimeType = $file->getMimeType();

            // Handle Google Workspace files (need export)
            if (strpos($mimeType, 'application/vnd.google-apps.') === 0) {
                return $this->exportGoogleWorkspaceFile($drive, $fileId, $mimeType);
            } else {
                // Regular file download
                $response = $drive->files->get($fileId, ['alt' => 'media']);
                return $response->getBody()->getContents();
            }
        } catch (Exception $e) {
            throw new Exception('Failed to download from Google Drive: ' . $e->getMessage());
        }
    }

    /**
     * Export Google Workspace files (Docs, Sheets, Slides)
     */
    private function exportGoogleWorkspaceFile($drive, $fileId, $mimeType) {
        $exportMimeTypes = [
            'application/vnd.google-apps.document' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
            'application/vnd.google-apps.spreadsheet' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
            'application/vnd.google-apps.presentation' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
        ];

        $exportMimeType = $exportMimeTypes[$mimeType] ?? 'application/pdf';
        
        $response = $drive->files->export($fileId, $exportMimeType, ['alt' => 'media']);
        return $response->getBody()->getContents();
    }

    /**
     * Upload content to R2
     */
    private function uploadToR2($key, $content, $fileName) {
        try {
            $result = $this->client->putObject([
                'Bucket' => $this->bucket,
                'Key' => $key,
                'Body' => $content,
                'ContentDisposition' => 'attachment; filename="' . addslashes($fileName) . '"',
                'Metadata' => [
                    'original-filename' => $fileName,
                    'upload-timestamp' => time(),
                    'source' => 'google-drive'
                ]
            ]);

            return $result;
        } catch (Exception $e) {
            throw new Exception('Failed to upload to R2: ' . $e->getMessage());
        }
    }

    /**
     * Generate R2 key (path) for file
     */
    private function generateR2Key($fileName, $fileId) {
        $extension = pathinfo($fileName, PATHINFO_EXTENSION);
        $safeName = preg_replace('/[^a-zA-Z0-9_.-]/', '_', pathinfo($fileName, PATHINFO_FILENAME));
        $timestamp = date('Y/m/d');
        
        return "files/{$timestamp}/{$fileId}_{$safeName}.{$extension}";
    }

    /**
     * Get public URL for R2 object
     */
    public function getPublicUrl($key) {
        if (!empty($this->publicUrl)) {
            return rtrim($this->publicUrl, '/') . '/' . $key;
        }
        
        // Fallback to R2 endpoint
        return rtrim($this->endpoint, '/') . '/' . $this->bucket . '/' . $key;
    }

    /**
     * Delete file from R2
     */
    public function deleteFile($key) {
        try {
            $this->client->deleteObject([
                'Bucket' => $this->bucket,
                'Key' => $key
            ]);
            return true;
        } catch (Exception $e) {
            error_log('R2 Delete Error: ' . $e->getMessage());
            return false;
        }
    }
}