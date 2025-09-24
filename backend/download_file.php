<?php
// backend/download_file.php

require_once __DIR__ . '/config.php';

header('Content-Type: application/json');

try {
    // 1. Get the token from the URL
    $token = $_GET['token'] ?? null;
    if (!$token) {
        throw new Exception('Download token is missing.');
    }

    // 2. Connect to the database
    $pdo = getPDOConnection();

    // 3. Find the payment by download token
    $stmt = $pdo->prepare("SELECT * FROM payments WHERE download_token = ?");
    $stmt->execute([$token]);
    $payment = $stmt->fetch();

    if (!$payment) {
        throw new Exception('Invalid or expired download link.');
    }

    // 4. Check if the link has expired
    $expiresAt = new DateTime($payment['file_access_expires_at']);
    $now = new DateTime();
    if ($now > $expiresAt) {
        throw new Exception('This download link has expired.');
    }

    // 5. Check download limit
    $downloads = json_decode($payment['downloads'], true);
    $maxDownloads = (int)($downloads['max_downloads'] ?? 0);
    $downloadCount = (int)($downloads['download_count'] ?? 0);

    if ($downloadCount >= $maxDownloads) {
        throw new Exception('You have reached the maximum number of downloads for this file.');
    }

    // 6. Get the file info from academic_files
    $stmt = $pdo->prepare("SELECT * FROM academic_files WHERE drive_file_id = ?");
    $stmt->execute([$payment['drive_file_id']]);
    $fileInfo = $stmt->fetch();

    if (!$fileInfo || !$fileInfo['r2_url']) {
        throw new Exception('File not found or not available for download.');
    }

    // 7. Generate a presigned URL for the R2 file
    $s3Client = new \Aws\S3\S3Client([
        'version' => 'latest',
        'region' => 'auto',
        'endpoint' => 'https://' . R2_ACCOUNT_ID . '.r2.cloudflarestorage.com',
        'credentials' => [
            'key' => R2_ACCESS_KEY_ID,
            'secret' => R2_SECRET_ACCESS_KEY,
        ],
        'use_path_style_endpoint' => true,
    ]);

    // Extract the key from the R2 public URL
    $r2Key = str_replace(R2_PUBLIC_URL . '/', '', $fileInfo['r2_url']);

    $command = $s3Client->getCommand('GetObject', [
        'Bucket' => R2_BUCKET_NAME,
        'Key' => $r2Key,
    ]);

    // Create a presigned request for 5 minutes
    $request = $s3Client->createPresignedRequest($command, '+5 minutes');
    $presignedUrl = (string)$request->getUri();

    // 8. Increment the download count
    $newDownloadCount = $downloadCount + 1;
    $updatedDownloads = json_encode([
        'max_downloads' => $maxDownloads,
        'download_count' => $newDownloadCount,
    ]);

    $updateStmt = $pdo->prepare("UPDATE payments SET downloads = ? WHERE id = ?");
    $updateStmt->execute([$updatedDownloads, $payment['id']]);

    // 9. Return the presigned URL in a JSON response
    echo json_encode([
        'success' => true,
        'presigned_url' => $presignedUrl
    ]);
    exit;

} catch (Exception $e) {
    http_response_code(400);
    echo json_encode([
        'success' => false,
        'error' => $e->getMessage()
    ]);
}
?>
