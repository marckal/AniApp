<?php
/**
 * AniApp - Entry Point
 * 
 * Em produção, este arquivo serve o frontend estático (dist/)
 * e redireciona chamadas de API para api/index.php
 */

// Se for uma chamada de API, redirecione
if (strpos($_SERVER['REQUEST_URI'], '/api/') === 0) {
    require __DIR__ . '/api/index.php';
    exit;
}

// Se for health check
if ($_SERVER['REQUEST_URI'] === '/health') {
    header('Content-Type: application/json');
    echo json_encode(['status' => 'ok', 'app' => 'AniApp']);
    exit;
}

// Serve o frontend estático
$distPath = __DIR__ . '/dist';
$requestUri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$filePath = $distPath . $requestUri;

// Se for um arquivo existente, serve diretamente
if (file_exists($filePath) && is_file($filePath)) {
    $ext = pathinfo($filePath, PATHINFO_EXTENSION);
    $mimeTypes = [
        'html' => 'text/html',
        'js' => 'application/javascript',
        'css' => 'text/css',
        'json' => 'application/json',
        'png' => 'image/png',
        'jpg' => 'image/jpeg',
        'jpeg' => 'image/jpeg',
        'gif' => 'image/gif',
        'svg' => 'image/svg+xml',
        'ico' => 'image/x-icon',
        'woff' => 'font/woff',
        'woff2' => 'font/woff2',
        'ttf' => 'font/ttf',
    ];
    if (isset($mimeTypes[$ext])) {
        header('Content-Type: ' . $mimeTypes[$ext]);
    }
    readfile($filePath);
    exit;
}

// Caso contrário, serve o index.html (SPA)
if (file_exists($distPath . '/index.html')) {
    header('Content-Type: text/html');
    readfile($distPath . '/index.html');
} else {
    http_response_code(500);
    echo "Erro: Build do frontend não encontrado. Execute 'npm run build' primeiro.";
}
