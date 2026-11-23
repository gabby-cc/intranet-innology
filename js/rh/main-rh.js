import { TraineeController } from './controllers/TraineeController.js';
import { JcfController } from './controllers/JcfController.js';
import { EntrevistaController } from './controllers/EntrevistaController.js';

/* =========================================
   MÓDULO RH - NAVEGACIÓN Y LÓGICA DE JCF, ENTREVISTAS, HORAS Y DOCUMENTOS
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    console.log('✅ main-rh.js cargado correctamente');

    /* =========================================
       1. NAVEGACIÓN DEL MENÚ LATERAL
       ========================================= */
    const menuItems = document.querySelectorAll('.menu-item');
    const views = document.querySelectorAll('.view-section');

    function showView(targetId) {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active');
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            if (targetId) showView(targetId);
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    });

    // Menú móvil
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    /* =========================================
       2. TRAINEES (ahora con MVC)
       La lógica vive en js/rh/controllers/TraineeController.js
       ========================================= */

    // Utilidades que todavía usan JCF, Entrevistas, Horas y Documentos
    function formatearFecha(iso) {
        if (!iso) return '-';
        const [y, m, d] = String(iso).slice(0, 10).split('-');
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
    }

    function badgeEstado(estado) {
        if (estado === 'Aprobado') return 'badge-status resuelto';
        if (estado === 'Rechazado') return 'badge-status atencion';
        return 'badge-status espera';
    }

    function marcarMenuActivo(targetId) {
        menuItems.forEach(i => i.classList.remove('active'));
        const item = document.querySelector(`.menu-item[data-target="${targetId}"]`);
        if (item) item.classList.add('active');
    }

    // PUENTE TEMPORAL: Entrevistas, Horas y Documentos todavía leen esta lista.
    // Desaparecerá cuando esos apartados también se conecten a MySQL.
    const trainees = [];

    new TraineeController({
        navegar: (vista, menu) => { showView(vista); marcarMenuActivo(menu); },
        alAbrirExpediente: (id) => entrevistas.mostrarEnExpediente('Trainee', id),
        alCambiar: (lista) => {
            trainees.splice(0, trainees.length, ...lista.map(t => ({
                ...t,
                id: String(t.id),
                estado: t.estatus,
                fechaNacimiento: t.fecha_nacimiento,
                fechaRegistro: t.fecha_registro,
            })));
        },
    });

    /* =========================================
       5. JÓVENES CONSTRUYENDO EL FUTURO (ahora con MVC)
       La lógica vive en js/rh/controllers/JcfController.js
       ========================================= */

    // PUENTE TEMPORAL: Entrevistas y Documentos todavía leen esta lista.
    const jcfData = [];

    new JcfController({
        navegar: (vista, menu) => { showView(vista); marcarMenuActivo(menu); },
        alAbrirExpediente: (id) => entrevistas.mostrarEnExpediente('JCF', id),
        alCambiar: (lista) => {
            jcfData.splice(0, jcfData.length, ...lista.map(j => ({
                ...j,
                id: String(j.id),
                estado: j.estatus,
                fechaRegistro: j.fecha_registro,
            })));
        },
    });

    /* =========================================
       6. ENTREVISTAS Y CALENDARIO (ahora con MVC)
       La lógica vive en js/rh/controllers/EntrevistaController.js
       ========================================= */
    const entrevistas = new EntrevistaController({
        obtenerCandidatos: (tipo) => (tipo === 'Trainee' ? trainees : jcfData)
            .map(c => ({ id: Number(c.id), nombre: `${c.nombre} ${c.apellidos}` })),
    });
     
        /* =========================================
       7. MÓDULO DE REGISTRO DE HORAS (IMPORTA EL EXCEL DEL CHECADOR)
       ========================================= */

    const HORAS_STORAGE_KEY = 'innology_horas';
    const CHECADOR_MAP_KEY = 'innology_checador_map';
    const HORAS_IMPORT_KEY = 'innology_horas_ultima_importacion';

    const HORAS_DEMO = [
        { id: 'HRS-001', traineeId: 'TR-001', traineeNombre: 'Ana García López', fecha: '2026-11-05', entrada: '09:00', salida: '14:00', observaciones: 'Registro normal', estado: 'Autorizado' },
        { id: 'HRS-002', traineeId: 'TR-002', traineeNombre: 'Carlos Pérez Ramírez', fecha: '2026-11-05', entrada: '10:00', salida: '15:30', observaciones: 'Llegó tarde', estado: 'Autorizado' }
    ];

    let horasData = JSON.parse(localStorage.getItem(HORAS_STORAGE_KEY)) || [...HORAS_DEMO];
    // Normalizar registros viejos: solo existen "Autorizado" e "Incompleto"
    horasData.forEach(h => {
        if (h.estado !== 'Autorizado' && h.estado !== 'Incompleto') {
            h.estado = (h.entrada && h.salida) ? 'Autorizado' : 'Incompleto';
        }
    });
    let checadorMap = JSON.parse(localStorage.getItem(CHECADOR_MAP_KEY)) || {}; // { idChecador: 'TR-001' }
    let horasEditingId = null;
    let importacion = null; // datos del Excel mientras se revisan

    // Referencias al DOM
    const horasTbody = document.getElementById('horas-tbody');
    const horasModal = document.getElementById('horas-modal');
    const selectHorasTrainee = document.getElementById('horas-trainee');
    const importModal = document.getElementById('import-modal');
    const importFileInput = document.getElementById('import-file-input');
    const importDropzone = document.getElementById('import-dropzone');
    const importPaso1 = document.getElementById('import-paso-1');
    const importPaso2 = document.getElementById('import-paso-2');
    const btnConfirmarImport = document.getElementById('btn-confirmar-import');

    // ---------- Utilidades ----------
    function esc(s) {
        return String(s ?? '').replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
    }
    function norm(s) {
        return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
    }
    function aMin(t) {
        if (!t) return null;
        const [h, m] = t.split(':').map(Number);
        return h * 60 + m;
    }
    function fmtDur(min) {
        return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
    }
    function minutosDe(h) {
        const e = aMin(h.entrada), s = aMin(h.salida);
        if (e === null || s === null || s <= e) return null;
        return s - e;
    }
    function isoLocal(d) {
        return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    function hrsMostrar(m) {
        m.classList.add('active');
        m.style.display = 'flex';
        m.style.opacity = '1';
        m.style.visibility = 'visible';
    }
    function hrsOcultar(m) {
        m.classList.remove('active');
        m.style.display = '';
        m.style.opacity = '';
        m.style.visibility = '';
    }
    function guardarHoras() {
        localStorage.setItem(HORAS_STORAGE_KEY, JSON.stringify(horasData));
    }
    function generarIdHoras() {
        const nums = horasData.map(t => parseInt(t.id.replace('HRS-', ''), 10)).filter(n => !isNaN(n));
        return 'HRS-' + String(Math.max(0, ...nums) + 1).padStart(3, '0');
    }

    // ---------- Tabla principal ----------
    function renderHoras() {
        if (!horasTbody) return;

        const texto = norm(document.getElementById('filter-horas-text')?.value);
        const desde = document.getElementById('filter-horas-desde')?.value || '';
        const hasta = document.getElementById('filter-horas-hasta')?.value || '';
        const estadoF = document.getElementById('filter-horas-estado')?.value || 'todos';

        const filtradas = horasData.filter(h => {
            if (texto && !norm(h.traineeNombre).includes(texto)) return false;
            if (desde && h.fecha < desde) return false;
            if (hasta && h.fecha > hasta) return false;
            if (estadoF !== 'todos' && h.estado !== estadoF) return false;
            return true;
        }).sort((a, b) => b.fecha.localeCompare(a.fecha) || a.traineeNombre.localeCompare(b.traineeNombre));

        // Tarjetas
        let totalMin = 0;
        filtradas.forEach(h => {
            if (h.estado === 'Autorizado') {
                const m = minutosDe(h);
                if (m) totalMin += m;
            }
        });
        document.getElementById('horas-total-periodo').textContent = fmtDur(totalMin);
        document.getElementById('horas-total-registros').textContent = filtradas.length;
        document.getElementById('horas-incompletos').textContent = filtradas.filter(h => h.estado === 'Incompleto').length;

        const ult = JSON.parse(localStorage.getItem(HORAS_IMPORT_KEY) || 'null');
        document.getElementById('horas-ultima-importacion').textContent = ult
            ? `${formatearFecha(ult.fecha)} (${formatearFecha(ult.inicio)} al ${formatearFecha(ult.fin)})`
            : 'Sin importar';

        // Filas
        if (filtradas.length === 0) {
            horasTbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9CA3AF;">No hay registros que coincidan.</td></tr>`;
            return;
        }

        horasTbody.innerHTML = filtradas.map(h => {
            const m = minutosDe(h);
            const badge = h.estado === 'Autorizado' ? 'status-badge-active' : 'status-badge-warning';
            const corregido = h.corregido
                ? `<span title="Marca original del checador: ${esc(h.entradaOriginal || '—')} / ${esc(h.salidaOriginal || '—')}" style="font-size:0.7rem; color:#6B7280; margin-left:6px;">(corregido)</span>`
                : '';
            return `
                <tr class="ticket-row">
                    <td><strong>${esc(h.traineeNombre)}</strong></td>
                    <td>${formatearFecha(h.fecha)}</td>
                    <td>${esc(h.entrada) || '-'}</td>
                    <td>${h.salida ? esc(h.salida) : '<span style="color:#F59E0B; font-weight:600;">Sin salida</span>'}</td>
                    <td><strong style="color: var(--primary-red);">${m ? fmtDur(m) : '-'}</strong></td>
                    <td>${esc(h.observaciones) || '-'}</td>
                    <td><span class="${badge}">${h.estado}</span>${corregido}</td>
                    <td>
                        <button class="btn-action" title="Editar / corregir" onclick="window.editarRegistroHoras('${esc(h.id)}')">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                    </td>
                </tr>`;
        }).join('');
    }

    // ---------- Registro manual ----------
    function cargarTraineesSelect() {
        if (!selectHorasTrainee) return;
        selectHorasTrainee.innerHTML = '<option value="">Selecciona un Trainee</option>' +
            trainees.map(t => `<option value="${esc(t.id)}">${esc(t.nombre)} ${esc(t.apellidos)} (${esc(t.id)})</option>`).join('');
    }

    function abrirModalHoras(id = null) {
        if (!horasModal) return;
        horasEditingId = id;
        document.getElementById('horas-modal-title').textContent = id ? 'Editar / corregir registro' : 'Registrar horas';

        cargarTraineesSelect();
        document.getElementById('horas-trainee').value = '';
        document.getElementById('horas-fecha').value = new Date().toISOString().split('T')[0];
        document.getElementById('horas-entrada').value = '09:00';
        document.getElementById('horas-salida').value = '';
        document.getElementById('horas-observaciones').value = '';

        if (id) {
            const h = horasData.find(x => x.id === id);
            if (h) {
                document.getElementById('horas-trainee').value = h.traineeId;
                document.getElementById('horas-fecha').value = h.fecha;
                document.getElementById('horas-entrada').value = h.entrada || '';
                document.getElementById('horas-salida').value = h.salida || '';
                document.getElementById('horas-observaciones').value = h.observaciones || '';
            }
        }
        hrsMostrar(horasModal);
    }

    function cerrarModalHoras() {
        if (horasModal) hrsOcultar(horasModal);
        horasEditingId = null;
    }

    window.editarRegistroHoras = function (id) { abrirModalHoras(id); };

    function guardarRegistroManual() {
        const traineeId = document.getElementById('horas-trainee').value;
        const fecha = document.getElementById('horas-fecha').value;
        const entrada = document.getElementById('horas-entrada').value;
        const salida = document.getElementById('horas-salida').value;
        const observaciones = document.getElementById('horas-observaciones').value.trim();

        if (!traineeId) return alert('Selecciona un Trainee.');
        if (!fecha) return alert('La fecha es obligatoria.');
        if (!entrada) return alert('La hora de entrada es obligatoria.');
        if (salida && aMin(salida) <= aMin(entrada)) return alert('La hora de salida debe ser posterior a la de entrada.');

        if (horasData.some(h => h.traineeId === traineeId && h.fecha === fecha && h.id !== horasEditingId)) {
            return alert('Ya existe un registro de este Trainee en esa fecha. Edítalo en lugar de crear otro.');
        }

        const t = trainees.find(x => x.id === traineeId);
        const datos = {
            traineeId,
            traineeNombre: t ? `${t.nombre} ${t.apellidos}` : traineeId,
            fecha, entrada, salida, observaciones,
            estado: (entrada && salida) ? 'Autorizado' : 'Incompleto'
        };

        if (horasEditingId) {
            const idx = horasData.findIndex(x => x.id === horasEditingId);
            if (idx !== -1) {
                const old = horasData[idx];
                // Conservar la marca original del checador la primera vez que se corrige
                if (old.entrada !== entrada || old.salida !== salida) {
                    datos.entradaOriginal = old.entradaOriginal ?? old.entrada;
                    datos.salidaOriginal = old.salidaOriginal ?? old.salida;
                    datos.corregido = true;
                }
                horasData[idx] = { ...old, ...datos };
            }
        } else {
            datos.id = generarIdHoras();
            horasData.push(datos);
        }

        guardarHoras();
        cerrarModalHoras();
        renderHoras();
    }

    // ---------- Lectura del Excel del checador ----------
    function extraerFechas(texto) {
        const res = [];
        const re = /(\d{4})[-\/](\d{1,2})[-\/](\d{1,2})|(\d{1,2})[-\/](\d{1,2})[-\/](\d{4})/g;
        let m;
        while ((m = re.exec(texto))) {
            const [y, mo, d] = m[1] ? [m[1], m[2], m[3]] : [m[6], m[5], m[4]];
            res.push(`${y}-${String(mo).padStart(2, '0')}-${String(d).padStart(2, '0')}`);
        }
        return res;
    }

    function siguienteNoVacia(cells, i) {
        for (let j = i + 1; j < cells.length; j++) if (cells[j]) return cells[j];
        return '';
    }

    function parsearChecador(rows) {
        // 1) Periodo del reporte (viene en las primeras filas)
        const cabecera = rows.slice(0, 8).map(r => r.join(' ')).join(' ');
        const fechas = extraerFechas(cabecera);
        let inicio = fechas[0] || null;
        let fin = fechas[1] || null;
        if (inicio && !fin) {
            const m = cabecera.match(/~\s*(\d{1,2})[-\/](\d{1,2})/);
            if (m) {
                let y = Number(inicio.split('-')[0]);
                const mesIni = Number(inicio.split('-')[1]);
                if (Number(m[1]) < mesIni) y++;
                fin = `${y}-${String(m[1]).padStart(2, '0')}-${String(m[2]).padStart(2, '0')}`;
            }
        }
        if (!inicio || !fin) throw new Error('No pude detectar el periodo del reporte.');

        // Número de día -> fecha completa
        const dias = {};
        const [yi, mi, di] = inicio.split('-').map(Number);
        const [yf, mf, df] = fin.split('-').map(Number);
        const cur = new Date(yi, mi - 1, di);
        const ultimo = new Date(yf, mf - 1, df);
        for (let g = 0; cur <= ultimo && g < 400; g++) {
            dias[cur.getDate()] = isoLocal(cur);
            cur.setDate(cur.getDate() + 1);
        }

        // 2) Recorrer filas: encabezado de empleado -> fila de días -> filas con marcas
        const empleados = [];
        let emp = null;
        let dayCols = null;

        rows.forEach(row => {
            const cells = row.map(c => String(c ?? '').trim());

            // Encabezado de empleado: "ID: 7", "Nombre: Gabriela"
            let idVal = null, nomVal = null;
                cells.forEach((c, i) => {
                let m = c.match(/^ID\s*[.:]\s*(.*)$/i);
                if (m) idVal = m[1] || siguienteNoVacia(cells, i);
                else if (/^ID$/i.test(c)) idVal = siguienteNoVacia(cells, i);

                m = c.match(/^(Nombre|Name)\s*[.:]\s*(.*)$/i);
                if (m) nomVal = m[2] || siguienteNoVacia(cells, i);
                else if (/^(Nombre|Name)$/i.test(c)) nomVal = siguienteNoVacia(cells, i);
            });
            if (idVal) {
                emp = { id: String(idVal), nombre: nomVal || '', registros: [] };
                empleados.push(emp);
                return;
            }

            // Fila con los números de día (1, 2, 3 ... 31)
            const numeros = cells.map((c, i) => ({ c, i })).filter(x => /^\d{1,2}$/.test(x.c) && +x.c >= 1 && +x.c <= 31);
            if (numeros.length >= 5 && !cells.some(c => /\d{1,2}:\d{2}/.test(c))) {
                dayCols = {};
                numeros.forEach(x => { dayCols[x.i] = +x.c; });
                return;
            }

            // Fila con marcas de asistencia
            if (emp && dayCols) {
                Object.entries(dayCols).forEach(([col, dia]) => {
                    const marcas = (cells[col] || '').match(/\d{1,2}:\d{2}/g);
                    if (marcas && dias[dia]) {
                        const lista = marcas.map(m => m.padStart(5, '0'));
                        const existente = emp.registros.find(r => r.fecha === dias[dia]);
                        if (existente) existente.marcas = [...existente.marcas, ...lista].sort();
                        else emp.registros.push({ fecha: dias[dia], marcas: lista.sort() });
                    }
                });
            }
        });

        return { inicio, fin, empleados };
    }

    function buscarTraineePorNombre(nombre) {
        const n = norm(nombre);
        if (n.length < 3) return '';
        const coincidencias = trainees.filter(t => {
            const f = norm(`${t.nombre} ${t.apellidos}`);
            return f === n || f.includes(n) || n.includes(f);
        });
        return coincidencias.length === 1 ? coincidencias[0].id : '';
    }

    function leerExcelChecador(file) {
        if (typeof XLSX === 'undefined') {
            return alert('No se cargó la librería para leer Excel. Revisa el Paso 1 (la etiqueta <script> de SheetJS) y tu conexión a internet.');
        }
        if (!/\.(xls|xlsx)$/i.test(file.name)) {
            return alert('Formato no permitido. Selecciona un archivo .xls o .xlsx.');
        }

        const reader = new FileReader();
        reader.onload = ev => {
            try {
                const wb = XLSX.read(new Uint8Array(ev.target.result), { type: 'array' });
                const nombreHoja = wb.SheetNames.find(n => /registro/i.test(n));
                if (!nombreHoja) {
                    console.log('Hojas encontradas:', wb.SheetNames);
                    return alert('No encontré la hoja "Registros de asistencia" en este archivo.');
                }

                const rows = XLSX.utils.sheet_to_json(wb.Sheets[nombreHoja], { header: 1, raw: false, defval: '' });
                const resultado = parsearChecador(rows);

                if (resultado.empleados.length === 0) {
                    console.log('HOJA USADA: ' + nombreHoja + '\nTODAS LAS HOJAS: ' + wb.SheetNames.join(' | '));
                    console.log('FILAS:\n' + rows.slice(0, 30).map((r, i) => i + ': ' + JSON.stringify(r)).join('\n'));
                    return alert('Pude abrir el archivo, pero no reconocí empleados. Abre la consola (F12) y mándame lo que aparece en "Primeras filas de la hoja".');
                }

                importacion = { archivo: file.name, ...resultado, mapa: {} };
                resultado.empleados.forEach(emp => {
                    const guardado = checadorMap[emp.id];
                    importacion.mapa[emp.id] = (guardado && trainees.some(t => t.id === guardado))
                        ? guardado
                        : buscarTraineePorNombre(emp.nombre);
                });

                mostrarPasoRevision();
            } catch (err) {
                console.error(err);
                alert('No pude leer el archivo: ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
    }

    // ---------- Paso 2 de la importación: revisar ----------
    function mostrarPasoRevision() {
        const totalRegs = importacion.empleados.reduce((a, e) => a + e.registros.length, 0);
        document.getElementById('import-resumen').innerHTML =
            `<strong>${esc(importacion.archivo)}</strong><br>
             Periodo: ${formatearFecha(importacion.inicio)} al ${formatearFecha(importacion.fin)} ·
             ${importacion.empleados.length} empleados detectados · ${totalRegs} días con marcas`;

        const opciones = trainees.map(t => ({ id: t.id, nombre: `${t.nombre} ${t.apellidos}` }));
        document.getElementById('import-empleados-tbody').innerHTML = importacion.empleados.map(emp => `
            <tr>
                <td>${esc(emp.id)}</td>
                <td>${esc(emp.nombre) || '<em style="color:#9CA3AF;">sin nombre</em>'}</td>
                <td>${emp.registros.length}</td>
                <td>
                    <select class="form-control" data-emp="${esc(emp.id)}">
                        <option value="">— No importar —</option>
                        ${opciones.map(o => `<option value="${esc(o.id)}" ${importacion.mapa[emp.id] === o.id ? 'selected' : ''}>${esc(o.nombre)} (${esc(o.id)})</option>`).join('')}
                    </select>
                </td>
            </tr>`).join('');

        importPaso1.style.display = 'none';
        importPaso2.style.display = 'block';
        btnConfirmarImport.style.display = 'inline-block';
        renderVistaPrevia();
    }

    function construirRegistrosImportados() {
        const lista = [];
        importacion.empleados.forEach(emp => {
            const tid = importacion.mapa[emp.id];
            if (!tid) return;
            const t = trainees.find(x => x.id === tid);
            if (!t) return;

            emp.registros.forEach(r => {
                const entrada = r.marcas[0];
                const salida = r.marcas.length > 1 ? r.marcas[r.marcas.length - 1] : '';
                let obs = '';
                if (r.marcas.length === 1) obs = 'Solo hay una marca en el checador';
                else if (r.marcas.length > 2) obs = `El checador tiene ${r.marcas.length} marcas ese día`;

                lista.push({
                    traineeId: tid,
                    traineeNombre: `${t.nombre} ${t.apellidos}`,
                    fecha: r.fecha,
                    entrada, salida,
                    observaciones: obs,
                    estado: salida ? 'Autorizado' : 'Incompleto',
                    entradaOriginal: entrada,
                    salidaOriginal: salida,
                    duplicado: horasData.some(h => h.traineeId === tid && h.fecha === r.fecha)
                });
            });
        });
        return lista.sort((a, b) => a.traineeNombre.localeCompare(b.traineeNombre) || a.fecha.localeCompare(b.fecha));
    }

    function renderVistaPrevia() {
        const lista = construirRegistrosImportados();
        const nuevos = lista.filter(r => !r.duplicado);
        const incompletos = nuevos.filter(r => r.estado === 'Incompleto').length;
        const duplicados = lista.length - nuevos.length;
        const sinAsignar = importacion.empleados.filter(e => !importacion.mapa[e.id]).length;

        document.getElementById('import-conteos').textContent =
            `${nuevos.length} registros nuevos (${incompletos} incompletos) · ${duplicados} duplicados que se omitirán · ${sinAsignar} empleados sin asignar`;

        document.getElementById('import-preview-tbody').innerHTML = lista.length === 0
            ? `<tr><td colspan="5" style="text-align:center;padding:30px;color:#9CA3AF;">Asigna al menos un empleado a un Trainee para ver la vista previa.</td></tr>`
            : lista.map(r => {
                let resultado = '<span class="status-badge-active">Correcto</span>';
                if (r.duplicado) resultado = '<span class="status-badge-inactive">Ya existe (se omite)</span>';
                else if (r.estado === 'Incompleto') resultado = '<span class="status-badge-warning">Incompleto</span>';
                return `<tr>
                    <td>${esc(r.traineeNombre)}</td>
                    <td>${formatearFecha(r.fecha)}</td>
                    <td>${esc(r.entrada)}</td>
                    <td>${r.salida ? esc(r.salida) : '<span style="color:#F59E0B;">Falta</span>'}</td>
                    <td>${resultado}</td>
                </tr>`;
            }).join('');

        btnConfirmarImport.disabled = nuevos.length === 0;
        btnConfirmarImport.style.opacity = nuevos.length === 0 ? '0.5' : '1';
    }

    function abrirImportacion() {
        importacion = null;
        importFileInput.value = '';
        importPaso1.style.display = 'block';
        importPaso2.style.display = 'none';
        btnConfirmarImport.style.display = 'none';
        hrsMostrar(importModal);
    }

    function cerrarImportacion() {
        hrsOcultar(importModal);
        importacion = null;
    }

    function confirmarImportacion() {
        if (!importacion) return;
        const nuevos = construirRegistrosImportados().filter(r => !r.duplicado);
        if (nuevos.length === 0) return alert('No hay registros nuevos para guardar.');

        nuevos.forEach(r => {
            delete r.duplicado;
            r.id = generarIdHoras();
            horasData.push(r);
        });
        guardarHoras();

        // Recordar la relación ID checador -> Trainee para la próxima vez
        Object.entries(importacion.mapa).forEach(([idChecador, tid]) => {
            if (tid) checadorMap[idChecador] = tid;
        });
        localStorage.setItem(CHECADOR_MAP_KEY, JSON.stringify(checadorMap));

        localStorage.setItem(HORAS_IMPORT_KEY, JSON.stringify({
            fecha: new Date().toISOString().split('T')[0],
            inicio: importacion.inicio,
            fin: importacion.fin
        }));

        const incompletos = nuevos.filter(r => r.estado === 'Incompleto').length;
        cerrarImportacion();
        renderHoras();
        alert(`Importación lista: ${nuevos.length} registros guardados (${incompletos} incompletos por revisar).`);
    }

    // ---------- Eventos ----------
    document.getElementById('btn-importar-excel')?.addEventListener('click', abrirImportacion);
    document.getElementById('btn-cerrar-modal-import')?.addEventListener('click', cerrarImportacion);
    document.getElementById('btn-cancelar-modal-import')?.addEventListener('click', cerrarImportacion);
    btnConfirmarImport?.addEventListener('click', confirmarImportacion);

    document.getElementById('btn-elegir-archivo')?.addEventListener('click', () => importFileInput.click());
    importFileInput?.addEventListener('change', e => {
        const file = e.target.files[0];
        if (file) leerExcelChecador(file);
    });

    if (importDropzone) {
        ['dragenter', 'dragover'].forEach(ev => importDropzone.addEventListener(ev, e => {
            e.preventDefault();
            importDropzone.classList.add('dragover');
        }));
        ['dragleave', 'drop'].forEach(ev => importDropzone.addEventListener(ev, e => {
            e.preventDefault();
            importDropzone.classList.remove('dragover');
        }));
        importDropzone.addEventListener('drop', e => {
            const file = e.dataTransfer.files[0];
            if (file) leerExcelChecador(file);
        });
    }

    document.getElementById('import-empleados-tbody')?.addEventListener('change', e => {
        const sel = e.target.closest('select[data-emp]');
        if (!sel || !importacion) return;
        importacion.mapa[sel.getAttribute('data-emp')] = sel.value;
        renderVistaPrevia();
    });

    document.getElementById('btn-nuevo-registro-horas')?.addEventListener('click', () => abrirModalHoras());
    document.getElementById('btn-cerrar-modal-horas')?.addEventListener('click', cerrarModalHoras);
    document.getElementById('btn-cancelar-modal-horas')?.addEventListener('click', cerrarModalHoras);
    document.getElementById('btn-guardar-horas')?.addEventListener('click', guardarRegistroManual);

    ['filter-horas-text', 'filter-horas-desde', 'filter-horas-hasta', 'filter-horas-estado'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', renderHoras);
            el.addEventListener('change', renderHoras);
        }
    });

    renderHoras();

        /* =========================================
       8. MÓDULO DE DOCUMENTOS Y PLANTILLAS
       ========================================= */

    const DOCS_DEMO = [
        { id: 'DOC-001', nombre: 'Carta de Presentación', descripcion: 'Formato oficial', archivoNombre: 'carta_presentacion.pdf', formato: 'pdf', fechaCarga: '2026-11-01', estado: 'Activo' },
        { id: 'DOC-002', nombre: 'Carta de Aceptación', descripcion: 'Para prácticas', archivoNombre: 'carta_aceptacion.docx', formato: 'docx', fechaCarga: '2026-11-02', estado: 'Activo' },
        { id: 'DOC-003', nombre: 'Control de Horas', descripcion: 'Hoja de cálculo', archivoNombre: 'control_horas.xlsx', formato: 'xlsx', fechaCarga: '2026-10-15', estado: 'Inactivo' }
    ];

    const DOCS_STORAGE_KEY = 'innology_docs';
    let docsData = JSON.parse(localStorage.getItem(DOCS_STORAGE_KEY)) || [...DOCS_DEMO];
    if (!localStorage.getItem(DOCS_STORAGE_KEY)) {
        localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docsData));
    }

    let docEditingId = null;
    let archivoTemporal = null; // Para guardar el archivo seleccionado antes de guardar

    const docsTbody = document.getElementById('docs-tbody');
    const docModal = document.getElementById('doc-modal');
    const docFileInput = document.getElementById('doc-file-input');

    function guardarDocsStorage() {
        localStorage.setItem(DOCS_STORAGE_KEY, JSON.stringify(docsData));
    }

    function generarIdDoc() {
        const nums = docsData.map(t => parseInt(t.id.replace('DOC-', ''), 10)).filter(n => !isNaN(n));
        return 'DOC-' + String(Math.max(...(nums.length ? nums : [0])) + 1).padStart(3, '0');
    }

    // Función para determinar la clase del icono según la extensión
    function getFileIconClass(formato) {
        if (formato === 'pdf') return 'pdf';
        if (formato === 'docx') return 'word';
        if (formato === 'xlsx') return 'excel';
        if (formato === 'pptx') return 'ppt';
        return 'txt';
    }

    function renderDocumentos() {
        if (!docsTbody) return;

        const texto = (document.getElementById('filter-doc-text')?.value || '').toLowerCase();
        const formatoFiltro = document.getElementById('filter-doc-formato')?.value || 'todos';
        const estadoFiltro = document.getElementById('filter-doc-estado')?.value || 'todos';

        const filtrados = docsData.filter(d => {
            if (texto && !d.nombre.toLowerCase().includes(texto)) return false;
            if (formatoFiltro !== 'todos' && d.formato !== formatoFiltro) return false;
            if (estadoFiltro !== 'todos' && d.estado !== estadoFiltro) return false;
            return true;
        });

        // Contadores
        document.getElementById('count-docs-total').textContent = docsData.length;
        document.getElementById('count-docs-activas').textContent = docsData.filter(d => d.estado === 'Activo').length;
        document.getElementById('count-docs-inactivas').textContent = docsData.filter(d => d.estado === 'Inactivo').length;

        // Render
        docsTbody.innerHTML = filtrados.length === 0 
            ? `<tr><td colspan="5" style="text-align:center;padding:40px;color:#9CA3AF;">No se encontraron plantillas.</td></tr>`
            : filtrados.map(d => {
                const iconClass = getFileIconClass(d.formato);
                const ext = d.formato.toUpperCase();
                const estadoClass = d.estado === 'Activo' ? 'status-badge-active' : 'status-badge-inactive';

                return `
                    <tr class="ticket-row">
                        <td class="doc-name-cell">
                            <div class="file-icon-box ${iconClass}">${ext}</div>
                            <div>
                                <strong>${d.nombre}</strong>
                                <span>${d.descripcion || 'Sin descripción'}</span>
                            </div>
                        </td>
                        <td><span style="font-size:0.85rem; color:var(--text-light);">${d.archivoNombre}</span></td>
                        <td>${formatearFecha(d.fechaCarga)}</td>
                        <td><span class="${estadoClass}">${d.estado}</span></td>
                        <td>
                            <div style="display:flex; gap:5px;">
                                <button class="btn-action" title="Descargar" onclick="window.descargarPlantilla('${d.id}')">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                </button>
                                <button class="btn-action" title="Editar" onclick="window.editarPlantilla('${d.id}')">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                                </button>
                                <button class="btn-action" title="Activar/Desactivar" onclick="window.toggleEstadoPlantilla('${d.id}')">
                                    <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>
                                </button>
                            </div>
                        </td>
                    </tr>
                `;
            }).join('');
    }

    function abrirModalDoc(id = null) {
        if (!docModal) return;
        docEditingId = id;
        archivoTemporal = null;
        document.getElementById('doc-modal-title').textContent = id ? 'Editar Plantilla' : 'Subir Plantilla';
        
        document.getElementById('doc-nombre').value = '';
        document.getElementById('doc-descripcion').value = '';
        document.getElementById('doc-estado').value = 'Activo';
        docFileInput.value = ''; // Limpiar input file
        document.getElementById('doc-file-name').style.display = 'none';
        
        // Si es edición, bloquear la subida de archivo nuevo (solo se edita nombre/estado)
        if (id) {
            const d = docsData.find(x => x.id === id);
            if (d) {
                document.getElementById('doc-nombre').value = d.nombre;
                document.getElementById('doc-descripcion').value = d.descripcion;
                document.getElementById('doc-estado').value = d.estado;
                docFileInput.disabled = true; // No se puede reemplazar el archivo en esta versión
            }
        } else {
            docFileInput.disabled = false;
        }

        docModal.classList.add('active');
        docModal.style.display = 'flex';
        docModal.style.opacity = '1';
        docModal.style.visibility = 'visible';
    }

    function cerrarModalDoc() {
        if (docModal) {
            docModal.classList.remove('active');
            docModal.style.display = '';
            docModal.style.opacity = '';
            docModal.style.visibility = '';
        }
        docEditingId = null;
        archivoTemporal = null;
    }

    // Descargar (Simulado)
    window.descargarPlantilla = function(id) {
        const d = docsData.find(x => x.id === id);
        if (!d) return;
        alert(`Simulando descarga del archivo:\n\n${d.archivoNombre}\n\n(En un servidor real, esto descargaría el archivo real).`);
    };

    window.editarPlantilla = function(id) { abrirModalDoc(id); };
    
    window.toggleEstadoPlantilla = function(id) {
        const d = docsData.find(x => x.id === id);
        if (!d) return;
        d.estado = d.estado === 'Activo' ? 'Inactivo' : 'Activo';
        guardarDocsStorage();
        renderDocumentos();
    };

    // Eventos
    if (document.getElementById('btn-subir-plantilla')) document.getElementById('btn-subir-plantilla').onclick = () => abrirModalDoc();
    if (document.getElementById('btn-cerrar-modal-doc')) document.getElementById('btn-cerrar-modal-doc').onclick = cerrarModalDoc;
    if (document.getElementById('btn-cancelar-modal-doc')) document.getElementById('btn-cancelar-modal-doc').onclick = cerrarModalDoc;

    // Al seleccionar archivo, validar extensión
    if (docFileInput) {
        docFileInput.onchange = (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const ext = file.name.split('.').pop().toLowerCase();
            const permitidos = ['pdf', 'docx', 'txt', 'xlsx', 'pptx'];
            
            if (!permitidos.includes(ext)) {
                alert('Formato no permitido. Solo se aceptan: .pdf, .docx, .txt, .xlsx, .pptx');
                docFileInput.value = '';
                return;
            }

            archivoTemporal = { nombre: file.name, formato: ext };
            const fileNameDisplay = document.getElementById('doc-file-name');
            fileNameDisplay.textContent = `Archivo seleccionado: ${file.name}`;
            fileNameDisplay.style.display = 'block';
        };
    }

    if (document.getElementById('btn-guardar-doc')) {
        document.getElementById('btn-guardar-doc').onclick = () => {
            const nombre = document.getElementById('doc-nombre').value.trim();
            const descripcion = document.getElementById('doc-descripcion').value.trim();
            const estado = document.getElementById('doc-estado').value;

            if (!nombre) return alert('El nombre de la plantilla es obligatorio.');

            if (docEditingId) {
                // Editar
                const idx = docsData.findIndex(x => x.id === docEditingId);
                if (idx !== -1) {
                    docsData[idx].nombre = nombre;
                    docsData[idx].descripcion = descripcion;
                    docsData[idx].estado = estado;
                }
            } else {
                // Nuevo
                if (!archivoTemporal) return alert('Por favor selecciona un archivo.');
                
                docsData.push({
                    id: generarIdDoc(),
                    nombre: nombre,
                    descripcion: descripcion,
                    archivoNombre: archivoTemporal.nombre,
                    formato: archivoTemporal.formato,
                    fechaCarga: new Date().toISOString().split('T')[0],
                    estado: estado
                });
            }

            guardarDocsStorage();
            cerrarModalDoc();
            renderDocumentos();
        };
    }

    ['filter-doc-text', 'filter-doc-formato', 'filter-doc-estado'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', renderDocumentos);
            el.addEventListener('change', renderDocumentos);
        }
    });

    renderDocumentos();
    

});