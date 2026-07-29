<?php
/**
 * AniApp - Animation Tool API
 * Backend PHP com SQLite
 */

header('Content-Type: application/json');
header('Access-Control-Allow-Origin: *');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type');

if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit;
}

define('DB_PATH', __DIR__ . '/data/aniapp.db');
define('UPLOADS_PATH', __DIR__ . '/uploads/');

// Garantir diretórios existem
if (!is_dir(__DIR__ . '/data')) mkdir(__DIR__ . '/data', 0777, true);
if (!is_dir(UPLOADS_PATH)) mkdir(UPLOADS_PATH, 0777, true);

function getDB(): PDO {
    static $db = null;
    if ($db === null) {
        $db = new PDO('sqlite:' . DB_PATH);
        $db->setAttribute(PDO::ATTR_ERRMODE, PDO::ERRMODE_EXCEPTION);
        $db->setAttribute(PDO::ATTR_DEFAULT_FETCH_MODE, PDO::FETCH_ASSOC);
    }
    return $db;
}

function initDB(): void {
    $db = getDB();
    $db->exec("CREATE TABLE IF NOT EXISTS projects (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        width INTEGER NOT NULL,
        height INTEGER NOT NULL,
        fps INTEGER DEFAULT 24,
        background_color TEXT DEFAULT '#ffffff',
        data TEXT NOT NULL,
        created_at INTEGER,
        updated_at INTEGER
    )");
    
    $db->exec("CREATE TABLE IF NOT EXISTS exports (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        format TEXT NOT NULL,
        file_path TEXT,
        status TEXT DEFAULT 'pending',
        created_at INTEGER,
        FOREIGN KEY (project_id) REFERENCES projects(id)
    )");
    
    $db->exec("CREATE INDEX IF NOT EXISTS idx_projects_updated ON projects(updated_at DESC)");
}

initDB();

function jsonResponse($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data, JSON_PRETTY_PRINT);
    exit;
}

function errorResponse($message, $code = 400) {
    jsonResponse(['error' => $message], $code);
}

// Router simples
$path = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
$method = $_SERVER['REQUEST_METHOD'];
$input = json_decode(file_get_contents('php://input'), true) ?? [];

// Projects API
if (preg_match('#^/api/projects/?$#', $path)) {
    $db = getDB();
    
    switch ($method) {
        case 'GET':
            $stmt = $db->query("SELECT id, name, width, height, fps, background_color, created_at, updated_at FROM projects ORDER BY updated_at DESC");
            jsonResponse(['projects' => $stmt->fetchAll()]);
            
        case 'POST':
            if (empty($input['data'])) errorResponse('Project data required');
            $data = json_decode($input['data'], true);
            $id = $data['id'] ?? bin2hex(random_bytes(8));
            $now = time();
            
            $stmt = $db->prepare("INSERT OR REPLACE INTO projects (id, name, width, height, fps, background_color, data, created_at, updated_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)");
            $stmt->execute([
                $id,
                $data['name'] ?? 'Untitled',
                $data['width'] ?? 1920,
                $data['height'] ?? 1080,
                $data['fps'] ?? 24,
                $data['backgroundColor'] ?? '#ffffff',
                $input['data'],
                $data['createdAt'] ?? $now,
                $now
            ]);
            jsonResponse(['id' => $id, 'message' => 'Project saved']);
            
        default:
            errorResponse('Method not allowed', 405);
    }
}

if (preg_match('#^/api/projects/([^/]+)$#', $path, $matches)) {
    $db = getDB();
    $id = $matches[1];
    
    switch ($method) {
        case 'GET':
            $stmt = $db->prepare("SELECT * FROM projects WHERE id = ?");
            $stmt->execute([$id]);
            $project = $stmt->fetch();
            if (!$project) errorResponse('Project not found', 404);
            jsonResponse([
                'project' => json_decode($project['data'], true),
                'meta' => [
                    'id' => $project['id'],
                    'name' => $project['name'],
                    'created_at' => $project['created_at'],
                    'updated_at' => $project['updated_at'],
                ]
            ]);
            
        case 'DELETE':
            $stmt = $db->prepare("DELETE FROM projects WHERE id = ?");
            $stmt->execute([$id]);
            jsonResponse(['message' => 'Project deleted']);
            
        case 'PUT':
            if (empty($input['data'])) errorResponse('Project data required');
            $data = json_decode($input['data'], true);
            $now = time();
            
            $stmt = $db->prepare("UPDATE projects SET name=?, width=?, height=?, fps=?, background_color=?, data=?, updated_at=? WHERE id=?");
            $stmt->execute([
                $data['name'] ?? 'Untitled',
                $data['width'] ?? 1920,
                $data['height'] ?? 1080,
                $data['fps'] ?? 24,
                $data['backgroundColor'] ?? '#ffffff',
                $input['data'],
                $now,
                $id
            ]);
            jsonResponse(['message' => 'Project updated']);
            
        default:
            errorResponse('Method not allowed', 405);
    }
}

// Export API - recebe frames como base64 e gera GIF (requer extensão GD ou ImageMagick)
if (preg_match('#^/api/export/?$#', $path)) {
    $db = getDB();
    
    switch ($method) {
        case 'POST':
            if (empty($input['project_id'])) errorResponse('Project ID required');
            if (empty($input['frames'])) errorResponse('Frames required');
            
            $format = $input['format'] ?? 'png-sequence';
            $exportId = bin2hex(random_bytes(8));
            $projectId = $input['project_id'];
            $now = time();
            
            // Salvar frames como imagens
            $exportDir = UPLOADS_PATH . $exportId . '/';
            mkdir($exportDir, 0777, true);
            
            $framePaths = [];
            foreach ($input['frames'] as $i => $frameData) {
                $imgData = base64_decode(preg_replace('#^data:image/\w+;base64,#', '', $frameData));
                $path = $exportDir . sprintf('frame_%04d.png', $i);
                file_put_contents($path, $imgData);
                $framePaths[] = $path;
            }
            
            // Se for GIF e tiver GD
            $outputFile = $exportDir . 'animation.' . ($format === 'gif' ? 'gif' : 'zip');
            
            if ($format === 'gif' && extension_loaded('gd')) {
                // Criar GIF animado simples
                $gif = null;
                foreach ($framePaths as $path) {
                    $src = imagecreatefrompng($path);
                    if ($src === false) continue;
                    
                    if ($gif === null) {
                        $gif = imagecreatetruecolor(imagesx($src), imagesy($src));
                    }
                    
                    imagecopy($gif, $src, 0, 0, 0, 0, imagesx($src), imagesy($src));
                    imagedestroy($src);
                }
                
                if ($gif) {
                    imagepng($gif, $outputFile);
                    imagedestroy($gif);
                }
            } else {
                // Criar ZIP com sequência de PNGs
                $zip = new ZipArchive();
                $zip->open($outputFile, ZipArchive::CREATE);
                foreach ($framePaths as $path) {
                    $zip->addFile($path, basename($path));
                }
                $zip->close();
            }
            
            $stmt = $db->prepare("INSERT INTO exports (id, project_id, format, file_path, status, created_at) VALUES (?, ?, ?, ?, 'completed', ?)");
            $stmt->execute([$exportId, $projectId, $format, $outputFile, $now]);
            
            jsonResponse([
                'id' => $exportId,
                'download_url' => '/api/export/' . $exportId,
                'format' => $format,
            ]);
            
        default:
            errorResponse('Method not allowed', 405);
    }
}

if (preg_match('#^/api/export/([^/]+)$#', $path, $matches)) {
    $db = getDB();
    $id = $matches[1];
    
    $stmt = $db->prepare("SELECT * FROM exports WHERE id = ?");
    $stmt->execute([$id]);
    $export = $stmt->fetch();
    
    if (!$export) errorResponse('Export not found', 404);
    
    $filePath = $export['file_path'];
    if (!file_exists($filePath)) errorResponse('File not found', 404);
    
    header('Content-Type: application/octet-stream');
    header('Content-Disposition: attachment; filename="' . basename($filePath) . '"');
    header('Content-Length: ' . filesize($filePath));
    readfile($filePath);
    exit;
}

// Health check
if ($path === '/api/health') {
    jsonResponse([
        'status' => 'ok',
        'php_version' => PHP_VERSION,
        'gd' => extension_loaded('gd'),
        'sqlite' => extension_loaded('pdo_sqlite'),
        'upload_max_filesize' => ini_get('upload_max_filesize'),
    ]);
}

// 404 para rotas desconhecidas
errorResponse('Not found', 404);
