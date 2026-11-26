<?php
declare(strict_types=1);

/* Utilidades compartidas para guardar y leer archivos (CV y plantillas).
   Los archivos viven en la carpeta /storage, que el navegador NO puede abrir directamente. */

const RAIZ_STORAGE = __DIR__ . '/../../storage';

const MIMES_PERMITIDOS = [
    'pdf'  => ['application/pdf'],
    'doc'  => ['application/msword', 'application/vnd.ms-office', 'application/CDFV2', 'application/x-ole-storage'],
    'docx' => ['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/zip'],
    'txt'  => ['text/plain'],
    'xlsx' => ['application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'application/zip'],
    'pptx' => ['application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/zip'],
];

/* Crea /storage/<subcarpeta> si no existe y se asegura de que el acceso directo esté bloqueado */
function carpetaStorage(string $subcarpeta): string
{
    if (!is_dir(RAIZ_STORAGE) && !mkdir(RAIZ_STORAGE, 0775, true) && !is_dir(RAIZ_STORAGE)) {
        throw new RuntimeException('No se pudo crear la carpeta de almacenamiento.');
    }
    $bloqueo = RAIZ_STORAGE . '/.htaccess';
    if (!is_file($bloqueo)) {
        file_put_contents($bloqueo, "<IfModule mod_authz_core.c>\n    Require all denied\n</IfModule>\n<IfModule !mod_authz_core.c>\n    Order deny,allow\n    Deny from all\n</IfModule>\n");
    }
    $dir = RAIZ_STORAGE . '/' . $subcarpeta;
    if (!is_dir($dir) && !mkdir($dir, 0775, true) && !is_dir($dir)) {
        throw new RuntimeException('No se pudo crear la carpeta ' . $subcarpeta . '.');
    }
    return $dir;
}

/* Devuelve la ruta real del archivo solo si está dentro de /storage; si no, null */
function rutaSegura(string $rutaRelativa): ?string
{
    $base = realpath(RAIZ_STORAGE);
    $completa = realpath(RAIZ_STORAGE . '/' . $rutaRelativa);
    if ($base === false || $completa === false || strpos($completa, $base . DIRECTORY_SEPARATOR) !== 0) {
        return null;
    }
    return $completa;
}

function borrarArchivo(string $rutaRelativa): void
{
    $ruta = rutaSegura($rutaRelativa);
    if ($ruta !== null && is_file($ruta)) {
        @unlink($ruta);
    }
}

/**
 * Valida y guarda un archivo subido. Devuelve ['ruta' => ..., 'nombre' => ..., 'ext' => ...].
 * Lanza InvalidArgumentException con un mensaje claro si algo no cumple.
 */
function guardarArchivo(?array $archivo, array $extensiones, int $maxBytes, string $subcarpeta): array
{
    if ($archivo === null || !isset($archivo['error']) || is_array($archivo['error'])) {
        throw new InvalidArgumentException('Selecciona un archivo.');
    }
    switch ($archivo['error']) {
        case UPLOAD_ERR_OK:
            break;
        case UPLOAD_ERR_NO_FILE:
            throw new InvalidArgumentException('Selecciona un archivo.');
        case UPLOAD_ERR_INI_SIZE:
        case UPLOAD_ERR_FORM_SIZE:
            throw new InvalidArgumentException('El archivo es más grande de lo que permite el servidor.');
        default:
            throw new InvalidArgumentException('No se pudo subir el archivo. Intenta de nuevo.');
    }
    if ($archivo['size'] <= 0) {
        throw new InvalidArgumentException('El archivo está vacío.');
    }
    if ($archivo['size'] > $maxBytes) {
        throw new InvalidArgumentException('El archivo pesa más de ' . intdiv($maxBytes, 1048576) . ' MB.');
    }

    $nombreOriginal = basename(str_replace('\\', '/', (string)$archivo['name']));
    $ext = strtolower(pathinfo($nombreOriginal, PATHINFO_EXTENSION));
    if (!in_array($ext, $extensiones, true)) {
        throw new InvalidArgumentException('Formato no permitido. Solo se aceptan: .' . implode(', .', $extensiones));
    }

    // Se revisa el tipo REAL del archivo, no solo su extensión
    if (class_exists('finfo')) {
        $mime = (new finfo(FILEINFO_MIME_TYPE))->file($archivo['tmp_name']);
        if (!in_array($mime, MIMES_PERMITIDOS[$ext] ?? [], true)) {
            throw new InvalidArgumentException('El contenido del archivo no corresponde a un .' . $ext . ' válido.');
        }
    }

    $dir = carpetaStorage($subcarpeta);
    $nuevoNombre = bin2hex(random_bytes(16)) . '.' . $ext;     // nombre aleatorio en el disco
    if (!move_uploaded_file($archivo['tmp_name'], $dir . '/' . $nuevoNombre)) {
        throw new RuntimeException('No se pudo guardar el archivo en el servidor.');
    }

    return [
        'ruta'   => $subcarpeta . '/' . $nuevoNombre,
        'nombre' => mb_substr($nombreOriginal, 0, 255),
        'ext'    => $ext,
    ];
}