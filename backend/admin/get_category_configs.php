<?php
require_once __DIR__ . '/config.php';
require_once __DIR__ . '/database.php';

header('Content-Type: application/json');

if (!isset($_GET['category'])) {
    http_response_code(400);
    echo json_encode(['error' => 'Category parameter is required']);
    exit;
}

$category = $_GET['category'];
$configs = $db->getConfigByCategory($category);

echo json_encode($configs);
?>