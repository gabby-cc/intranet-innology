<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// TEMPORAL: mientras no exista el inicio de sesión, el responsable es el administrador (ID 1).
// Cuando haya login, aquí se pondrá el ID del usuario con sesión iniciada.
const USUARIO_TEMPORAL = 1;

const ESTATUS_VALIDOS = ['Programada', 'Realizada', 'Cancelada', 'No asistio'];

function responder(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- Validación y limpieza de los datos del formulario ---------- */
function limpiarDatos(array $in): array
{
    $v = static fn(string $k): string => trim((string)($in[$k] ?? ''));

    $d = [
        'fecha'         => $v('fecha'),
        'hora'          => $v('hora'),
        'modalidad'     => $v('modalidad') ?: 'Online',
        'enlace'        => $v('enlace'),
        'estatus'       => $v('estatus') ?: 'Programada',
        'observaciones' => $v('observaciones'),
    ];

    $f = DateTime::createFromFormat('Y-m-d', $d['fecha']);
    if (!$f || $f->format('Y-m-d') !== $d['fecha']) {
        throw new InvalidArgumentException('La fecha no es válida.');
    }
    $h = DateTime::createFromFormat('H:i', $d['hora']);
    if (!$h || $h->format('H:i') !== $d['hora']) {
        throw new InvalidArgumentException('La hora no es válida.');
    }
    if (!in_array($d['modalidad'], ['Online', 'Presencial'], true)) {
        throw new InvalidArgumentException('La modalidad no es válida.');
    }
    if (!in_array($d['estatus'], ESTATUS_VALIDOS, true)) {
        throw new InvalidArgumentException('El estado no es válido.');
    }

    // El enlace solo aplica a entrevistas online
    if ($d['modalidad'] === 'Presencial' || $d['enlace'] === '') {
        $d['enlace'] = null;
    } elseif (!preg_match('~^https?://~i', $d['enlace']) || !filter_var($d['enlace'], FILTER_VALIDATE_URL) || strlen($d['enlace']) > 1000) {
        throw new InvalidArgumentException('El enlace no es válido (debe empezar con https://).');
    }
    if ($d['observaciones'] === '') {
        $d['observaciones'] = null;
    }
    return $d;
}

function existeEntrevista(mysqli $c, int $id): bool
{
    $st = $c->prepare('SELECT 1 FROM agenda_entrevistas WHERE id_agenda = ?');
    $st->bind_param('i', $id);
    $st->execute();
    return $st->get_result()->num_rows > 0;
}

function bitacora(mysqli $c, string $accion, int $id, string $descripcion): void
{
    try {
        $st = $c->prepare("INSERT INTO bitacora (tabla_afectada, id_registro, accion, descripcion, id_usuario)
                           VALUES ('agenda_entrevistas', ?, ?, ?, NULL)");
        $st->bind_param('iss', $id, $accion, $descripcion);
        $st->execute();
    } catch (Throwable $e) {
        error_log('[Innology] Bitácora: ' . $e->getMessage());
    }
}

try {
    require_once __DIR__ . '/../conexion.php';   // define $conexion

    $metodo = $_SERVER['REQUEST_METHOD'];

    /* ---------- LISTAR (con el nombre del candidato) ---------- */
    if ($metodo === 'GET') {
        $res = $conexion->query(
            "SELECT a.id_agenda AS id,
                    CASE WHEN a.id_trainee IS NOT NULL THEN 'Trainee' ELSE 'JCF' END AS tipo,
                    COALESCE(a.id_trainee, a.id_pjcf) AS candidato_id,
                    CASE WHEN a.id_trainee IS NOT NULL
                         THEN CONCAT(t.nombre, ' ', t.apellidos)
                         ELSE CONCAT(j.nombre, ' ', j.apellidos) END AS candidato_nombre,
                    a.numero_filtro AS filtro,
                    a.fecha_entrevista AS fecha,
                    TIME_FORMAT(a.hora_entrevista, '%H:%i') AS hora,
                    a.modalidad,
                    a.liga_sesion AS enlace,
                    a.estatus,
                    a.observaciones
             FROM agenda_entrevistas a
             LEFT JOIN trainees t ON t.id_trainee = a.id_trainee
             LEFT JOIN pjcf j ON j.id_pjcf = a.id_pjcf
             ORDER BY a.fecha_entrevista, a.hora_entrevista"
        );
        $filas = array_map(static function (array $f): array {
            $f['id'] = (int)$f['id'];
            $f['candidato_id'] = (int)$f['candidato_id'];
            $f['filtro'] = (int)$f['filtro'];
            return $f;
        }, $res->fetch_all(MYSQLI_ASSOC));

        responder(200, ['ok' => true, 'data' => $filas]);
    }

    if ($metodo !== 'POST') {
        responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
    }

    $in = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($in)) {
        responder(400, ['ok' => false, 'error' => 'Datos inválidos.']);
    }

    switch ($in['accion'] ?? '') {

        /* ---------- CREAR ---------- */
        case 'crear':
            $tipo = (string)($in['tipo'] ?? '');
            $candidatoId = (int)($in['candidato_id'] ?? 0);
            if (!in_array($tipo, ['Trainee', 'JCF'], true) || $candidatoId <= 0) {
                throw new InvalidArgumentException('Selecciona un candidato registrado.');
            }

            // Verifica que el candidato exista y calcula el número de filtro (1er, 2do, ...)
            if ($tipo === 'Trainee') {
                $st = $conexion->prepare('SELECT 1 FROM trainees WHERE id_trainee = ?');
                $cuenta = $conexion->prepare('SELECT COALESCE(MAX(numero_filtro), 0) + 1 FROM agenda_entrevistas WHERE id_trainee = ?');
            } else {
                $st = $conexion->prepare('SELECT 1 FROM pjcf WHERE id_pjcf = ?');
                $cuenta = $conexion->prepare('SELECT COALESCE(MAX(numero_filtro), 0) + 1 FROM agenda_entrevistas WHERE id_pjcf = ?');
            }
            $st->bind_param('i', $candidatoId);
            $st->execute();
            if ($st->get_result()->num_rows === 0) {
                throw new InvalidArgumentException('El candidato seleccionado no existe.');
            }
            $cuenta->bind_param('i', $candidatoId);
            $cuenta->execute();
            $numeroFiltro = (int)$cuenta->get_result()->fetch_row()[0];

            $d = limpiarDatos($in);
            $idTrainee = $tipo === 'Trainee' ? $candidatoId : null;
            $idPjcf    = $tipo === 'JCF' ? $candidatoId : null;
            $usuario   = USUARIO_TEMPORAL;

            $st = $conexion->prepare(
                'INSERT INTO agenda_entrevistas
                    (id_trainee, id_pjcf, numero_filtro, fecha_entrevista, hora_entrevista,
                     modalidad, liga_sesion, estatus, observaciones, id_usuario_responsable)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $st->bind_param(
                'iiissssssi',
                $idTrainee, $idPjcf, $numeroFiltro, $d['fecha'], $d['hora'],
                $d['modalidad'], $d['enlace'], $d['estatus'], $d['observaciones'], $usuario
            );
            $st->execute();
            $nuevoId = (int)$conexion->insert_id;
            bitacora($conexion, 'INSERT', $nuevoId, "Entrevista programada ({$tipo} #{$candidatoId}, filtro {$numeroFiltro}) el {$d['fecha']} {$d['hora']}");
            responder(201, ['ok' => true, 'data' => ['id' => $nuevoId]]);

        /* ---------- ACTUALIZAR (el candidato no se puede cambiar) ---------- */
        case 'actualizar':
            $id = (int)($in['id'] ?? 0);
            if (!existeEntrevista($conexion, $id)) {
                responder(404, ['ok' => false, 'error' => 'La entrevista no existe.']);
            }
            $d = limpiarDatos($in);
            $st = $conexion->prepare(
                'UPDATE agenda_entrevistas
                 SET fecha_entrevista = ?, hora_entrevista = ?, modalidad = ?,
                     liga_sesion = ?, estatus = ?, observaciones = ?
                 WHERE id_agenda = ?'
            );
            $st->bind_param(
                'ssssssi',
                $d['fecha'], $d['hora'], $d['modalidad'], $d['enlace'], $d['estatus'], $d['observaciones'], $id
            );
            $st->execute();
            bitacora($conexion, 'UPDATE', $id, "Entrevista modificada: {$d['fecha']} {$d['hora']} ({$d['estatus']})");
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        /* ---------- CAMBIAR SOLO EL ESTADO ---------- */
        case 'cambiar_estatus':
            $id = (int)($in['id'] ?? 0);
            $estatus = (string)($in['estatus'] ?? '');
            if (!in_array($estatus, ESTATUS_VALIDOS, true)) {
                responder(400, ['ok' => false, 'error' => 'El estado no es válido.']);
            }
            if (!existeEntrevista($conexion, $id)) {
                responder(404, ['ok' => false, 'error' => 'La entrevista no existe.']);
            }
            $st = $conexion->prepare('UPDATE agenda_entrevistas SET estatus = ? WHERE id_agenda = ?');
            $st->bind_param('si', $estatus, $id);
            $st->execute();
            bitacora($conexion, 'UPDATE', $id, "Cambio de estado de la entrevista a {$estatus}");
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        default:
            responder(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
    }

} catch (InvalidArgumentException $e) {
    responder(400, ['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('[Innology] entrevistas.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
}