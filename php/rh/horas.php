<?php
declare(strict_types=1);

header('Content-Type: application/json; charset=utf-8');

// TEMPORAL: mientras no exista el inicio de sesión, el responsable es el administrador (ID 1).
const USUARIO_TEMPORAL = 1;
const MAX_REGISTROS_IMPORTACION = 5000;

function responder(int $codigo, array $payload): never
{
    http_response_code($codigo);
    echo json_encode($payload, JSON_UNESCAPED_UNICODE);
    exit;
}

/* ---------- Utilidades de validación ---------- */
function fechaValida(string $valor): bool
{
    $f = DateTime::createFromFormat('Y-m-d', $valor);
    return $f && $f->format('Y-m-d') === $valor;
}

function horaValida(string $valor): bool
{
    $h = DateTime::createFromFormat('H:i', $valor);
    return $h && $h->format('H:i') === $valor;
}

function aMinutos(string $hora): int
{
    [$h, $m] = array_map('intval', explode(':', $hora));
    return $h * 60 + $m;
}

/* Valida los datos del registro manual / edición */
function limpiarDatos(array $in): array
{
    $v = static fn(string $k): string => trim((string)($in[$k] ?? ''));

    $d = [
        'trainee_id'    => (int)($in['trainee_id'] ?? 0),
        'fecha'         => $v('fecha'),
        'entrada'       => $v('entrada'),
        'salida'        => $v('salida'),
        'observaciones' => $v('observaciones'),
    ];

    if ($d['trainee_id'] <= 0) {
        throw new InvalidArgumentException('Selecciona un Trainee.');
    }
    if (!fechaValida($d['fecha'])) {
        throw new InvalidArgumentException('La fecha no es válida.');
    }
    if (!horaValida($d['entrada'])) {
        throw new InvalidArgumentException('La hora de entrada es obligatoria y debe ser válida.');
    }
    if ($d['salida'] !== '') {
        if (!horaValida($d['salida'])) {
            throw new InvalidArgumentException('La hora de salida no es válida.');
        }
        if (aMinutos($d['salida']) <= aMinutos($d['entrada'])) {
            throw new InvalidArgumentException('La hora de salida debe ser posterior a la de entrada.');
        }
    } else {
        $d['salida'] = null;
    }
    if ($d['observaciones'] === '') {
        $d['observaciones'] = null;
    }
    return $d;
}

function existeTrainee(mysqli $c, int $id): bool
{
    $st = $c->prepare('SELECT 1 FROM trainees WHERE id_trainee = ?');
    $st->bind_param('i', $id);
    $st->execute();
    return $st->get_result()->num_rows > 0;
}

function bitacora(mysqli $c, string $accion, int $id, string $descripcion): void
{
    try {
        $st = $c->prepare("INSERT INTO bitacora (tabla_afectada, id_registro, accion, descripcion, id_usuario)
                           VALUES ('registro_horas_trainee', ?, ?, ?, NULL)");
        $st->bind_param('iss', $id, $accion, $descripcion);
        $st->execute();
    } catch (Throwable $e) {
        error_log('[Innology] Bitácora: ' . $e->getMessage());
    }
}

try {
    require_once __DIR__ . '/../conexion.php';   // define $conexion

    $metodo = $_SERVER['REQUEST_METHOD'];

    /* ---------- LISTAR: registros + mapa del checador + última importación ---------- */
    if ($metodo === 'GET') {
        $res = $conexion->query(
            "SELECT h.id_registro_horas AS id,
                    h.id_trainee AS trainee_id,
                    CONCAT(t.nombre, ' ', t.apellidos) AS trainee_nombre,
                    h.fecha_horas AS fecha,
                    TIME_FORMAT(h.hora_entrada, '%H:%i') AS entrada,
                    TIME_FORMAT(h.hora_salida, '%H:%i') AS salida,
                    TIME_FORMAT(h.hora_entrada_original, '%H:%i') AS entrada_original,
                    TIME_FORMAT(h.hora_salida_original, '%H:%i') AS salida_original,
                    h.origen,
                    h.observaciones,
                    (h.hora_entrada_original IS NOT NULL
                       AND (h.hora_entrada <> h.hora_entrada_original
                             OR NOT (h.hora_salida <=> h.hora_salida_original))) AS corregido,
                    TIME_FORMAT(ht.hora_entrada, '%H:%i') AS hora_programada,
                    ht.tolerancia_min AS tolerancia,
                    CASE WHEN ht.hora_entrada IS NULL THEN NULL
                         WHEN TIME_TO_SEC(h.hora_entrada) > TIME_TO_SEC(ht.hora_entrada) + ht.tolerancia_min * 60
                         THEN CEIL((TIME_TO_SEC(h.hora_entrada) - TIME_TO_SEC(ht.hora_entrada)) / 60)
                         ELSE 0 END AS retardo_min
             FROM registro_horas_trainee h
             INNER JOIN trainees t ON t.id_trainee = h.id_trainee
             LEFT JOIN horarios_turno ht ON ht.turno = t.turno
             ORDER BY h.fecha_horas DESC, t.nombre"
        );
        $registros = array_map(static function (array $f): array {
            $f['id'] = (int)$f['id'];
            $f['trainee_id'] = (int)$f['trainee_id'];
            $f['corregido'] = (bool)$f['corregido'];
            // Minutos de retraso respecto a la hora del turno (0 = puntual, null = el turno no tiene horario)
            $f['retardo_min'] = $f['retardo_min'] === null ? null : (int)$f['retardo_min'];
            $f['tolerancia'] = $f['tolerancia'] === null ? null : (int)$f['tolerancia'];
            return $f;
        }, $res->fetch_all(MYSQLI_ASSOC));

        $mapa = [];
        $resMapa = $conexion->query('SELECT id_checador, id_trainee FROM trainees WHERE id_checador IS NOT NULL');
        foreach ($resMapa->fetch_all(MYSQLI_ASSOC) as $fila) {
            $mapa[(string)$fila['id_checador']] = (int)$fila['id_trainee'];
        }

        $ultima = $conexion->query(
            "SELECT MAX(DATE(fecha_registro)) AS fecha, MAX(fecha_horas) AS hasta
             FROM registro_horas_trainee WHERE origen = 'Checador'"
        )->fetch_assoc();

        responder(200, ['ok' => true, 'data' => [
            'registros' => $registros,
            'mapa' => (object)$mapa,
            'ultima_importacion' => ['fecha' => $ultima['fecha'], 'hasta' => $ultima['hasta']],
        ]]);
    }

    if ($metodo !== 'POST') {
        responder(405, ['ok' => false, 'error' => 'Método no permitido.']);
    }

    $in = json_decode(file_get_contents('php://input') ?: '[]', true);
    if (!is_array($in)) {
        responder(400, ['ok' => false, 'error' => 'Datos inválidos.']);
    }

    switch ($in['accion'] ?? '') {

        /* ---------- REGISTRO MANUAL ---------- */
        case 'crear':
            $d = limpiarDatos($in);
            if (!existeTrainee($conexion, $d['trainee_id'])) {
                throw new InvalidArgumentException('El Trainee seleccionado no existe.');
            }
            $usuario = USUARIO_TEMPORAL;
            $st = $conexion->prepare(
                "INSERT INTO registro_horas_trainee
                    (id_trainee, fecha_horas, hora_entrada, hora_salida, origen, observaciones, id_usuario_registro)
                 VALUES (?, ?, ?, ?, 'Manual', ?, ?)"
            );
            $st->bind_param('issssi', $d['trainee_id'], $d['fecha'], $d['entrada'], $d['salida'], $d['observaciones'], $usuario);
            $st->execute();
            $nuevoId = (int)$conexion->insert_id;
            bitacora($conexion, 'INSERT', $nuevoId, "Horas registradas manualmente (Trainee #{$d['trainee_id']}) el {$d['fecha']}");
            responder(201, ['ok' => true, 'data' => ['id' => $nuevoId]]);

        /* ---------- EDITAR / CORREGIR ---------- */
        case 'actualizar':
            $id = (int)($in['id'] ?? 0);
            $st = $conexion->prepare(
                "SELECT TIME_FORMAT(hora_entrada, '%H:%i') AS entrada, TIME_FORMAT(hora_salida, '%H:%i') AS salida,
                        TIME_FORMAT(hora_entrada_original, '%H:%i') AS entrada_original,
                        TIME_FORMAT(hora_salida_original, '%H:%i') AS salida_original
                 FROM registro_horas_trainee WHERE id_registro_horas = ?"
            );
            $st->bind_param('i', $id);
            $st->execute();
            $actual = $st->get_result()->fetch_assoc();
            if (!$actual) {
                responder(404, ['ok' => false, 'error' => 'El registro no existe.']);
            }

            $d = limpiarDatos($in);
            if (!existeTrainee($conexion, $d['trainee_id'])) {
                throw new InvalidArgumentException('El Trainee seleccionado no existe.');
            }

            // La primera vez que se corrige una hora, se conserva la marca original
            $entradaOriginal = $actual['entrada_original'];
            $salidaOriginal  = $actual['salida_original'];
            $cambioHoras = $actual['entrada'] !== $d['entrada'] || $actual['salida'] !== $d['salida'];
            if ($cambioHoras && $entradaOriginal === null) {
                $entradaOriginal = $actual['entrada'];
                $salidaOriginal  = $actual['salida'];
            }

            $st = $conexion->prepare(
                'UPDATE registro_horas_trainee
                 SET id_trainee = ?, fecha_horas = ?, hora_entrada = ?, hora_salida = ?,
                     hora_entrada_original = ?, hora_salida_original = ?, observaciones = ?
                 WHERE id_registro_horas = ?'
            );
            $st->bind_param(
                'issssssi',
                $d['trainee_id'], $d['fecha'], $d['entrada'], $d['salida'],
                $entradaOriginal, $salidaOriginal, $d['observaciones'], $id
            );
            $st->execute();
            bitacora($conexion, 'UPDATE', $id, "Registro de horas modificado ({$d['fecha']} {$d['entrada']} - " . ($d['salida'] ?? 'sin salida') . ')');
            responder(200, ['ok' => true, 'data' => ['id' => $id]]);

        /* ---------- IMPORTAR EL EXCEL DEL CHECADOR (todo o nada) ---------- */
        case 'importar':
            $registros = $in['registros'] ?? [];
            $mapa = $in['mapa'] ?? [];
            if (!is_array($registros) || !is_array($mapa) || count($registros) === 0) {
                throw new InvalidArgumentException('No hay registros para importar.');
            }
            if (count($registros) > MAX_REGISTROS_IMPORTACION) {
                throw new InvalidArgumentException('El archivo trae demasiados registros (máximo ' . MAX_REGISTROS_IMPORTACION . ').');
            }

            $validos = array_column($conexion->query('SELECT id_trainee FROM trainees')->fetch_all(MYSQLI_ASSOC), 'id_trainee');
            $validos = array_map('intval', $validos);
            $usuario = USUARIO_TEMPORAL;

            $conexion->begin_transaction();
            try {
                // 1) Recordar qué ID del checador es cada Trainee
                $libera = $conexion->prepare('UPDATE trainees SET id_checador = NULL WHERE id_checador = ? AND id_trainee <> ?');
                $asigna = $conexion->prepare('UPDATE trainees SET id_checador = ? WHERE id_trainee = ?');
                foreach ($mapa as $item) {
                    $idChecador = trim((string)($item['id_checador'] ?? ''));
                    $traineeId = (int)($item['trainee_id'] ?? 0);
                    if ($idChecador === '' || strlen($idChecador) > 30 || !in_array($traineeId, $validos, true)) {
                        continue;
                    }
                    $libera->bind_param('si', $idChecador, $traineeId);
                    $libera->execute();
                    $asigna->bind_param('si', $idChecador, $traineeId);
                    $asigna->execute();
                }

                // 2) Insertar las marcas; los días que ya existen se omiten
                $st = $conexion->prepare(
                    "INSERT INTO registro_horas_trainee
                        (id_trainee, fecha_horas, hora_entrada, hora_salida,
                         hora_entrada_original, hora_salida_original, origen, observaciones, id_usuario_registro)
                     VALUES (?, ?, ?, ?, ?, ?, 'Checador', ?, ?)
                     ON DUPLICATE KEY UPDATE id_registro_horas = id_registro_horas"
                );
                $insertados = 0;
                foreach ($registros as $i => $r) {
                    $traineeId = (int)($r['trainee_id'] ?? 0);
                    $fecha = trim((string)($r['fecha'] ?? ''));
                    $entrada = trim((string)($r['entrada'] ?? ''));
                    $salida = trim((string)($r['salida'] ?? ''));
                    $obs = trim((string)($r['observaciones'] ?? ''));

                    if (!in_array($traineeId, $validos, true) || !fechaValida($fecha) || !horaValida($entrada)
                        || ($salida !== '' && !horaValida($salida))) {
                        throw new InvalidArgumentException('El registro #' . ($i + 1) . ' del archivo no es válido.');
                    }
                    $salida = $salida === '' ? null : $salida;
                    $obs = $obs === '' ? null : $obs;

                    $st->bind_param('issssssi', $traineeId, $fecha, $entrada, $salida, $entrada, $salida, $obs, $usuario);
                    $st->execute();
                    if ($st->affected_rows === 1) {
                        $insertados++;
                    }
                }
                $conexion->commit();
            } catch (Throwable $e) {
                $conexion->rollback();
                throw $e;
            }

            $omitidos = count($registros) - $insertados;
            bitacora($conexion, 'INSERT', 0, "Importación del checador: {$insertados} registros nuevos, {$omitidos} omitidos");
            responder(200, ['ok' => true, 'data' => ['insertados' => $insertados, 'omitidos' => $omitidos]]);

        default:
            responder(400, ['ok' => false, 'error' => 'Acción no reconocida.']);
    }

} catch (InvalidArgumentException $e) {
    responder(400, ['ok' => false, 'error' => $e->getMessage()]);
} catch (mysqli_sql_exception $e) {
    if ($e->getCode() === 1062) {
        responder(409, ['ok' => false, 'error' => 'Ya existe un registro de ese Trainee en esa fecha. Edita el existente.']);
    }
    error_log('[Innology] horas.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
} catch (Throwable $e) {
    error_log('[Innology] horas.php: ' . $e->getMessage());
    responder(500, ['ok' => false, 'error' => 'Error interno del servidor.']);
}