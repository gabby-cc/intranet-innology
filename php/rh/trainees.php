<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

function responder(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- Validación y limpieza de los datos que llegan del formulario ---------- */
function limpiarDatos(array $in): array
{
    $v = static fn(string $k): string => trim((string)($in[$k] ?? ''));

    $d = [
        'nombre'           => $v('nombre'),
        'apellidos'        => $v('apellidos'),
        'telefono'         => $v('telefono'),
        'fecha_nacimiento' => $v('fecha_nacimiento'),
        'direccion'        => $v('direccion'),
        'turno'            => $v('turno'),
        'universidad'      => $v('universidad'),
        'carrera'          => $v('carrera'),
        'estatus'          => $v('estatus') ?: 'Pendiente',
        'observaciones'    => $v('observaciones'),
    ];

    if ($d['nombre'] === '' || $d['apellidos'] === '') {
        throw new InvalidArgumentException('Nombre y apellidos son obligatorios.');
    }
    if (!preg_match('/^[0-9+\-\s()]{7,20}$/', $d['telefono'])) {
        throw new InvalidArgumentException('El teléfono no tiene un formato válido.');
    }
    if ($d['universidad'] === '' || $d['carrera'] === '' || $d['turno'] === '') {
        throw new InvalidArgumentException('Universidad, carrera y turno son obligatorios.');
    }
    if (!in_array($d['estatus'], ['Pendiente', 'Aprobado', 'Rechazado'], true)) {
        throw new InvalidArgumentException('El estado no es válido.');
    }
    if ($d['fecha_nacimiento'] !== '') {
        $f = DateTime::createFromFormat('Y-m-d', $d['fecha_nacimiento']);
        if (!$f || $f->format('Y-m-d') !== $d['fecha_nacimiento']) {
            throw new InvalidArgumentException('La fecha de nacimiento no es válida.');
        }
    }

    // Los campos opcionales vacíos se guardan como NULL
    foreach (['fecha_nacimiento', 'direccion', 'observaciones'] as $opcional) {
        if ($d[$opcional] === '') {
            $d[$opcional] = null;
        }
    }
    return $d;
}

function existe(mysqli $c, int $id): bool
{
    $st = $c->prepare('SELECT 1 FROM trainees WHERE id_trainee = ?');
    $st->bind_param('i', $id);
    $st->execute();
    return $st->get_result()->num_rows > 0;
}

/* Guarda un registro en la bitácora. Si falla, no detiene la operación principal. */
function bitacora(mysqli $c, string $accion, int $id, string $descripcion): void
{
    try {
        $st = $c->prepare("INSERT INTO bitacora (tabla_afectada, id_registro, accion, descripcion, id_usuario)
                           VALUES ('trainees', ?, ?, ?, NULL)");
        $st->bind_param('iss', $id, $accion, $descripcion);
        $st->execute();
    } catch (Throwable $e) {
        error_log('[Innology] Bitácora: ' . $e->getMessage());
    }
}

try {
    require_once __DIR__ . '/../conexion.php';   // define $conexion

    $metodo = $_SERVER['REQUEST_METHOD'];

    /* ---------- LISTAR ---------- */
    if ($metodo === 'GET') {
        $res = $conexion->query(
            'SELECT id_trainee AS id, nombre, apellidos, telefono, fecha_nacimiento, direccion,
                    turno, universidad, carrera, estatus, observaciones,
                    DATE(fecha_registro) AS fecha_registro
             FROM trainees
             ORDER BY id_trainee DESC'
        );
        $filas = array_map(static function (array $f): array {
            $f['id'] = (int)$f['id'];
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
            $d = limpiarDatos($in);
            $st = $conexion->prepare(
                'INSERT INTO trainees (nombre, apellidos, telefono, fecha_nacimiento, direccion,
                                       turno, universidad, carrera, estatus, observaciones)
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
            );
            $st->bind_param(
                'ssssssssss',
                $d['nombre'], $d['apellidos'], $d['telefono'], $d['fecha_nacimiento'], $d['direccion'],
                $d['turno'], $d['universidad'], $d['carrera'], $d['estatus'], $d['observaciones']
            );
            $st->execute();
            $nuevoId = (int)$conexion->insert_id;
            bitacora($conexion, 'INSERT', $nuevoId, "Se registró al trainee {$d['nombre']} {$d['apellidos']}");
            responder(201, ['ok' => true, 'data' => ['id' => $nuevoId]]);

        /* ---------- ACTUALIZAR ---------- */
        case 'actualizar':
            $id = (int)($in['id'] ?? 0);
            if (!existe($conexion, $id)) {
                responder(404, ['ok' => false, 'error' => 'El trainee no existe.']);
            }
            $d = limpiarDatos($in);
            $st = $conexion->prepare(
                'UPDATE trainees
                 SET nombre = ?, apellidos = ?, telefono = ?, fecha_nacimiento = ?, direccion = ?,
                     turno = ?, universidad = ?, carrera = ?, estatus = ?, observaciones = ?
                 WHERE id_trainee = ?'
            );
            $st->bind_param(
                'ssssssssssi',
                $d['nombre'], $d['apellidos'], $d['telefono'], $d['fecha_nacimiento'], $d['direccion'],
                $d['turno'], $d['universidad'], $d['carrera'], $d['estatus'], $d['observaciones'], $id
            );
            $st->execute();
            bitacora($conexion, 'UPDATE', $id, "Se actualizaron los datos de {$d['nombre']} {$d['apellidos']}");
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        /* ---------- CAMBIAR SOLO EL ESTADO ---------- */
        case 'cambiar_estatus':
            $id = (int)($in['id'] ?? 0);
            $estatus = (string)($in['estatus'] ?? '');
            if (!in_array($estatus, ['Pendiente', 'Aprobado', 'Rechazado'], true)) {
                responder(400, ['ok' => false, 'error' => 'El estado no es válido.']);
            }
            if (!existe($conexion, $id)) {
                responder(404, ['ok' => false, 'error' => 'El trainee no existe.']);
            }
            $st = $conexion->prepare('UPDATE trainees SET estatus = ? WHERE id_trainee = ?');
            $st->bind_param('si', $estatus, $id);
            $st->execute();
            bitacora($conexion, 'UPDATE', $id, "Cambio de estado a {$estatus}");
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        default:
            responder(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
    }

} catch (InvalidArgumentException $e) {
    responder(400, ['ok' => false, 'error' => $e->getMessage()]);
} catch (Throwable $e) {
    error_log('[Innology] trainees.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
}