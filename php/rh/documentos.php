<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

require_once __DIR__ . '/_storage.php';

// TEMPORAL: mientras no exista el inicio de sesión, el responsable es el administrador (ID 1).
const USUARIO_TEMPORAL = 1;

const TIPOS_PLANTILLA = ['Presentacion', 'Aceptacion', 'Liberacion', 'Otro'];
const EXT_PLANTILLA = ['pdf', 'docx', 'txt', 'xlsx', 'pptx'];
const EXT_CV = ['pdf', 'doc', 'docx'];
const MAX_PLANTILLA = 10 * 1024 * 1024;   // 10 MB
const MAX_CV = 5 * 1024 * 1024;           // 5 MB

function responder(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

function bitacora(mysqli $c, string $tabla, string $accion, int $id, string $descripcion): void
{
    try {
        $st = $c->prepare('INSERT INTO bitacora (tabla_afectada, id_registro, accion, descripcion, id_usuario)
                           VALUES (?, ?, ?, ?, NULL)');
        $st->bind_param('siss', $tabla, $id, $accion, $descripcion);
        $st->execute();
    } catch (Throwable $e) {
        error_log('[Innology] Bitácora: ' . $e->getMessage());
    }
}

function datosPlantilla(array $in): array
{
    $nombre = trim((string)($in['nombre'] ?? ''));
    $descripcion = trim((string)($in['descripcion'] ?? ''));
    $tipo = trim((string)($in['tipo_documento'] ?? 'Otro'));
    $activo = (int)($in['activo'] ?? 1) === 1 ? 1 : 0;

    if ($nombre === '' || mb_strlen($nombre) > 150) {
        throw new InvalidArgumentException('El nombre de la plantilla es obligatorio (máximo 150 caracteres).');
    }
    if (mb_strlen($descripcion) > 255) {
        throw new InvalidArgumentException('La descripción no puede pasar de 255 caracteres.');
    }
    if (!in_array($tipo, TIPOS_PLANTILLA, true)) {
        throw new InvalidArgumentException('El tipo de documento no es válido.');
    }
    return ['nombre' => $nombre, 'descripcion' => $descripcion === '' ? null : $descripcion, 'tipo' => $tipo, 'activo' => $activo];
}

function hayArchivoNuevo(): bool
{
    return isset($_FILES['archivo']) && !is_array($_FILES['archivo']['error']) && $_FILES['archivo']['error'] !== UPLOAD_ERR_NO_FILE;
}

try {
    require_once __DIR__ . '/../conexion.php';   // define $conexion

    $metodo = $_SERVER['REQUEST_METHOD'];

    /* ---------- LISTAR: plantillas + CV de todos los candidatos ---------- */
    if ($metodo === 'GET') {
        $res = $conexion->query(
            'SELECT id_plantilla AS id, nombre_plantilla AS nombre, descripcion, tipo_documento AS tipo,
                    nombre_archivo AS archivo, DATE(fecha_carga) AS fecha, activo
             FROM plantillas_documento
             ORDER BY fecha_carga DESC, id_plantilla DESC'
        );
        $plantillas = array_map(static function (array $f): array {
            $f['id'] = (int)$f['id'];
            $f['activo'] = (bool)$f['activo'];
            $f['formato'] = strtolower(pathinfo($f['archivo'], PATHINFO_EXTENSION));
            return $f;
        }, $res->fetch_all(MYSQLI_ASSOC));

        $res = $conexion->query(
            "SELECT c.id_documento_cv AS id,
                    CASE WHEN c.id_trainee IS NOT NULL THEN 'Trainee' ELSE 'JCF' END AS tipo,
                    COALESCE(c.id_trainee, c.id_pjcf) AS candidato_id,
                    CASE WHEN c.id_trainee IS NOT NULL
                         THEN CONCAT(t.nombre, ' ', t.apellidos)
                         ELSE CONCAT(j.nombre, ' ', j.apellidos) END AS candidato_nombre,
                                        c.nombre_documento AS nombre,
                    c.descripcion,
                    c.nombre_archivo AS archivo,
                    DATE_FORMAT(c.fecha_carga, '%Y-%m-%d %H:%i') AS fecha
             FROM documentos_cv c
             LEFT JOIN trainees t ON t.id_trainee = c.id_trainee
             LEFT JOIN pjcf j ON j.id_pjcf = c.id_pjcf
             ORDER BY c.fecha_carga DESC, c.id_documento_cv DESC"
        );
        $cvs = array_map(static function (array $f): array {
            $f['id'] = (int)$f['id'];
            $f['candidato_id'] = (int)$f['candidato_id'];
            return $f;
        }, $res->fetch_all(MYSQLI_ASSOC));

        responder(200, ['ok' => true, 'data' => ['plantillas' => $plantillas, 'cvs' => $cvs]]);
    }

    if ($metodo !== 'POST') {
        responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
    }

    // Si el archivo es más grande que post_max_size, PHP descarta todo y llega vacío
    if (empty($_POST) && empty($_FILES) && (int)($_SERVER['CONTENT_LENGTH'] ?? 0) > 0) {
        throw new InvalidArgumentException('El archivo es más grande de lo que permite el servidor.');
    }
    $in = $_POST;

    switch ($in['accion'] ?? '') {

        /* ---------- SUBIR PLANTILLA ---------- */
        case 'subir_plantilla':
            $d = datosPlantilla($in);
            $arch = guardarArchivo($_FILES['archivo'] ?? null, EXT_PLANTILLA, MAX_PLANTILLA, 'plantillas');
            $usuario = USUARIO_TEMPORAL;
            try {
                $st = $conexion->prepare(
                    'INSERT INTO plantillas_documento
                        (nombre_plantilla, descripcion, tipo_documento, nombre_archivo, ruta_archivo, id_usuario_carga, activo)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                $st->bind_param('sssssii', $d['nombre'], $d['descripcion'], $d['tipo'], $arch['nombre'], $arch['ruta'], $usuario, $d['activo']);
                $st->execute();
            } catch (Throwable $e) {
                borrarArchivo($arch['ruta']);   // no dejar archivos huérfanos
                throw $e;
            }
            $nuevoId = (int)$conexion->insert_id;
            bitacora($conexion, 'plantillas_documento', 'INSERT', $nuevoId, "Plantilla subida: {$d['nombre']}");
            responder(201, ['ok' => true, 'data' => ['id' => $nuevoId]]);

        /* ---------- EDITAR PLANTILLA (y reemplazar el archivo si se envía uno nuevo) ---------- */
        case 'actualizar_plantilla':
            $id = (int)($in['id'] ?? 0);
            $st = $conexion->prepare('SELECT ruta_archivo FROM plantillas_documento WHERE id_plantilla = ?');
            $st->bind_param('i', $id);
            $st->execute();
            $actual = $st->get_result()->fetch_assoc();
            if (!$actual) {
                responder(404, ['ok' => false, 'error' => 'La plantilla no existe.']);
            }
            $d = datosPlantilla($in);

            if (hayArchivoNuevo()) {
                $arch = guardarArchivo($_FILES['archivo'], EXT_PLANTILLA, MAX_PLANTILLA, 'plantillas');
                $usuario = USUARIO_TEMPORAL;
                try {
                    $st = $conexion->prepare(
                        'UPDATE plantillas_documento
                         SET nombre_plantilla = ?, descripcion = ?, tipo_documento = ?, activo = ?,
                             nombre_archivo = ?, ruta_archivo = ?, fecha_carga = NOW(), id_usuario_carga = ?
                         WHERE id_plantilla = ?'
                    );
                    $st->bind_param('sssissii', $d['nombre'], $d['descripcion'], $d['tipo'], $d['activo'], $arch['nombre'], $arch['ruta'], $usuario, $id);
                    $st->execute();
                } catch (Throwable $e) {
                    borrarArchivo($arch['ruta']);
                    throw $e;
                }
                borrarArchivo($actual['ruta_archivo']);   // se elimina la versión anterior
            } else {
                $st = $conexion->prepare(
                    'UPDATE plantillas_documento
                     SET nombre_plantilla = ?, descripcion = ?, tipo_documento = ?, activo = ?
                     WHERE id_plantilla = ?'
                );
                $st->bind_param('sssii', $d['nombre'], $d['descripcion'], $d['tipo'], $d['activo'], $id);
                $st->execute();
            }
            bitacora($conexion, 'plantillas_documento', 'UPDATE', $id, "Plantilla modificada: {$d['nombre']}");
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        /* ---------- ACTIVAR / DESACTIVAR ---------- */
        case 'cambiar_activo':
            $id = (int)($in['id'] ?? 0);
            $activo = (int)($in['activo'] ?? 0) === 1 ? 1 : 0;
            $st = $conexion->prepare('SELECT 1 FROM plantillas_documento WHERE id_plantilla = ?');
            $st->bind_param('i', $id);
            $st->execute();
            if ($st->get_result()->num_rows === 0) {
                responder(404, ['ok' => false, 'error' => 'La plantilla no existe.']);
            }
            $st = $conexion->prepare('UPDATE plantillas_documento SET activo = ? WHERE id_plantilla = ?');
            $st->bind_param('ii', $activo, $id);
            $st->execute();
            bitacora($conexion, 'plantillas_documento', 'UPDATE', $id, $activo ? 'Plantilla activada' : 'Plantilla desactivada');
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        /* ---------- SUBIR CV (cada subida es una versión nueva) ---------- */
        case 'subir_cv':
            $tipo = (string)($in['tipo'] ?? '');
            $candidatoId = (int)($in['candidato_id'] ?? 0);
            if (!in_array($tipo, ['Trainee', 'JCF'], true) || $candidatoId <= 0) {
                throw new InvalidArgumentException('Candidato no válido.');
            }
            $st = $conexion->prepare($tipo === 'Trainee'
                ? 'SELECT 1 FROM trainees WHERE id_trainee = ?'
                : 'SELECT 1 FROM pjcf WHERE id_pjcf = ?');
            $st->bind_param('i', $candidatoId);
            $st->execute();
            if ($st->get_result()->num_rows === 0) {
                throw new InvalidArgumentException('El candidato no existe.');
            }

                        $nombreDoc = trim((string)($in['nombre'] ?? ''));
            $descripcion = trim((string)($in['descripcion'] ?? ''));
            if ($nombreDoc === '' || mb_strlen($nombreDoc) > 150) {
                throw new InvalidArgumentException('El nombre del documento es obligatorio (máximo 150 caracteres).');
            }
            if (mb_strlen($descripcion) > 255) {
                throw new InvalidArgumentException('La descripción no puede pasar de 255 caracteres.');
            }
            $descripcion = $descripcion === '' ? null : $descripcion;

            $arch = guardarArchivo($_FILES['archivo'] ?? null, EXT_CV, MAX_CV, 'cv');
            $idTrainee = $tipo === 'Trainee' ? $candidatoId : null;
            $idPjcf = $tipo === 'JCF' ? $candidatoId : null;
            $usuario = USUARIO_TEMPORAL;
            try {
                $st = $conexion->prepare(
                                        'INSERT INTO documentos_cv (id_trainee, id_pjcf, nombre_documento, descripcion, nombre_archivo, ruta_archivo, id_usuario_carga)
                     VALUES (?, ?, ?, ?, ?, ?, ?)'
                );
                $st->bind_param('iissssi', $idTrainee, $idPjcf, $nombreDoc, $descripcion, $arch['nombre'], $arch['ruta'], $usuario);
                $st->execute();
            } catch (Throwable $e) {
                borrarArchivo($arch['ruta']);
                throw $e;
            }
            $nuevoId = (int)$conexion->insert_id;
            bitacora($conexion, 'documentos_cv', 'INSERT', $nuevoId, "Documento subido ({$tipo} #{$candidatoId}): {$nombreDoc}");
            responder(201, ['ok' => true, 'data' => ['id' => $nuevoId]]);

        default:
            responder(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
    }

} catch (InvalidArgumentException $e) {
    responder(400, ['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('[Innology] documentos.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
}