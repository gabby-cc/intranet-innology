<?php
declare(strict_types=1);

require_once __DIR__ . '/_storage.php';

function fallo(int $codigo, string $mensaje): never
{
    http_response_code($codigo);
    header('Content-Type: application/json; charset=utf-8');
    echo json_encode(['ok' => false, 'error' => $mensaje], JSON_UNESCAPED_UNICODE);
    exit;
}

const CONTENT_TYPES = [
    'pdf'  => 'application/pdf',
    'doc'  => 'application/msword',
    'docx' => 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'txt'  => 'text/plain; charset=utf-8',
    'xlsx' => 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'pptx' => 'application/vnd.openxmlformats-officedocument.presentationml.presentation',
];

try {
    require_once __DIR__ . '/../conexion.php';   // define $conexion

    $tipo = (string)($_GET['tipo'] ?? '');
    $id = (int)($_GET['id'] ?? 0);

    if ($tipo === 'cv') {
        $st = $conexion->prepare('SELECT nombre_archivo, ruta_archivo FROM documentos_cv WHERE id_documento_cv = ?');
    } elseif ($tipo === 'plantilla') {
        $st = $conexion->prepare('SELECT nombre_archivo, ruta_archivo FROM plantillas_documento WHERE id_plantilla = ?');
    } else {
        fallo(400, 'Tipo de documento no válido.');
    }
    $st->bind_param('i', $id);
    $st->execute();
    $doc = $st->get_result()->fetch_assoc();
    if (!$doc) {
        fallo(404, 'El documento no existe.');
    }

    $ruta = rutaSegura($doc['ruta_archivo']);
    if ($ruta === null || !is_file($ruta)) {
        fallo(404, 'El archivo ya no está disponible en el servidor.');
    }

    $nombre = $doc['nombre_archivo'];
    $ext = strtolower(pathinfo($nombre, PATHINFO_EXTENSION));
    $ascii = preg_replace('/[^A-Za-z0-9._-]+/', '_', (string)@iconv('UTF-8', 'ASCII//TRANSLIT//IGNORE', $nombre));
    if ($ascii === '' || $ascii === null) {
        $ascii = 'documento.' . $ext;
    }

    header('Content-Type: ' . (CONTENT_TYPES[$ext] ?? 'application/octet-stream'));
    header('Content-Length: ' . filesize($ruta));
    header('Content-Disposition: attachment; filename="' . $ascii . '"; filename*=UTF-8\'\'' . rawurlencode($nombre));
    header('X-Content-Type-Options: nosniff');
    readfile($ruta);
    exit;

} catch (Throwable $e) {
    error_log('[Innology] descargar.php: ' . $e->getMessage());
    fallo(500, 'Error interno del servidor.');
}