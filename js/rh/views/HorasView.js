import { formatearFecha } from './TraineeView.js';
import { fmtDur, minutosDe, estadoDe, esRetardo } from '../models/HorasModel.js';

const $ = (id) => document.getElementById(id);

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const ICONO_EDITAR = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';

function mostrar(modal) {
    modal.classList.add('active');
    Object.assign(modal.style, { display: 'flex', opacity: '1', visibility: 'visible' });
}
function ocultar(modal) {
    modal.classList.remove('active');
    Object.assign(modal.style, { display: '', opacity: '', visibility: '' });
}

// Celdas comunes de un registro (la usan la tabla principal y el expediente)
function celdaSalida(h) {
    return h.salida ? esc(h.salida) : '<span style="color:#F59E0B; font-weight:600;">Sin salida</span>';
}
function celdaTotal(h) {
    const m = minutosDe(h);
    return `<strong style="color: var(--primary-red);">${m ? fmtDur(m) : '-'}</strong>`;
}
const ROJO = '#DC2626';

// Hora de entrada: en rojo y con los minutos de retraso si llegó tarde
function celdaEntrada(h) {
    if (!h.entrada) return '-';
    if (!esRetardo(h)) return esc(h.entrada);
    return `<span style="color:${ROJO}; font-weight:700;"
                  title="Retardo de ${h.retardo_min} min · Hora del turno: ${esc(h.hora_programada)} (tolerancia ${h.tolerancia} min)">${esc(h.entrada)}</span>`;
}

// Un ligero fondo rojo en toda la fila de un retardo
const estiloFila = (h) => (esRetardo(h) ? 'background:#FEF2F2;' : '');

function celdaEstado(h) {
    const retardo = esRetardo(h)
        ? ` <span style="background:#FEE2E2; color:#B91C1C; padding:4px 12px; border-radius:20px; font-size:0.75rem; font-weight:600; display:inline-block;">Retardo</span>`
        : '';
    const badge = estadoDe(h) === 'Autorizado' ? 'status-badge-active' : 'status-badge-warning';
    const corregido = h.corregido
        ? `<span title="Marca original del checador: ${esc(h.entrada_original || '—')} / ${esc(h.salida_original || '—')}" style="font-size:0.7rem; color:#6B7280; margin-left:6px;">(corregido)</span>`
        : '';
        return `<span class="${badge}">${estadoDe(h)}</span>${retardo}${corregido}`;
}
const botonEditar = (h) =>
    `<button class="btn-action" data-action="editar" data-id="${h.id}" title="Editar / corregir">${ICONO_EDITAR}</button>`;

export class HorasView {
    constructor() {
        this.tbody = $('horas-tbody');
        this.modal = $('horas-modal');
        this.titulo = $('horas-modal-title');
        this.btnGuardar = $('btn-guardar-horas');

        this.filtros = {
            texto: $('filter-horas-text'),
            desde: $('filter-horas-desde'),
            hasta: $('filter-horas-hasta'),
            estado: $('filter-horas-estado'),
        };

        this.campos = {
            trainee: $('horas-trainee'),
            fecha: $('horas-fecha'),
            entrada: $('horas-entrada'),
            salida: $('horas-salida'),
            observaciones: $('horas-observaciones'),
        };

        this.importModal = $('import-modal');
        this.paso1 = $('import-paso-1');
        this.paso2 = $('import-paso-2');
        this.btnConfirmar = $('btn-confirmar-import');
        this.inputArchivo = $('import-file-input');
        this.dropzone = $('import-dropzone');

        this.panel = $('exp-panel-horas');   // pestaña "Registro de horas" del expediente del Trainee
    }

    /* ---------- Eventos ---------- */
    alClicNuevo(cb) { $('btn-nuevo-registro-horas')?.addEventListener('click', cb); }
    alClicImportar(cb) { $('btn-importar-excel')?.addEventListener('click', cb); }
    alCambiarFiltros(cb) {
        Object.values(this.filtros).forEach((el) => {
            if (!el) return;
            el.addEventListener('input', cb);
            el.addEventListener('change', cb);
        });
    }
    alClicTabla(cb) {
        this.tbody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action="editar"]');
            if (btn) cb('editar', { id: Number(btn.dataset.id) });
        });
    }
    alClicPanel(cb) {
        this.panel?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (!btn) return;
            cb(btn.dataset.action, { id: Number(btn.dataset.id), traineeId: Number(btn.dataset.trainee) });
        });
    }

        alFiltrarPanel(cb) {
        this.panel?.addEventListener('change', (e) => {
            if (e.target.closest('[data-filtro]')) cb();
        });
    }

    obtenerFiltrosPanel() {
        const valor = (k) => this.panel?.querySelector(`[data-filtro="${k}"]`)?.value || '';
        return { desde: valor('desde'), hasta: valor('hasta'), estado: valor('estado') || 'todos' };
    }

    limpiarFiltrosPanel() {
        this.panel?.querySelectorAll('[data-filtro]').forEach((el) => {
            el.value = el.dataset.filtro === 'estado' ? 'todos' : '';
        });
    }

    alCerrarModal(cb) {
        ['btn-cerrar-modal-horas', 'btn-cancelar-modal-horas'].forEach((id) => $(id)?.addEventListener('click', cb));
    }
    alGuardar(cb) { this.btnGuardar?.addEventListener('click', cb); }

    alCerrarImportacion(cb) {
        ['btn-cerrar-modal-import', 'btn-cancelar-modal-import'].forEach((id) => $(id)?.addEventListener('click', cb));
    }
    alConfirmarImportacion(cb) { this.btnConfirmar?.addEventListener('click', cb); }
    alElegirArchivo(cb) {
        $('btn-elegir-archivo')?.addEventListener('click', () => this.inputArchivo.click());
        this.inputArchivo?.addEventListener('change', (e) => {
            const archivo = e.target.files[0];
            if (archivo) cb(archivo);
        });
        if (!this.dropzone) return;
        ['dragenter', 'dragover'].forEach((ev) => this.dropzone.addEventListener(ev, (e) => {
            e.preventDefault();
            this.dropzone.classList.add('dragover');
        }));
        ['dragleave', 'drop'].forEach((ev) => this.dropzone.addEventListener(ev, (e) => {
            e.preventDefault();
            this.dropzone.classList.remove('dragover');
        }));
        this.dropzone.addEventListener('drop', (e) => {
            const archivo = e.dataTransfer.files[0];
            if (archivo) cb(archivo);
        });
    }
    alCambiarAsignacion(cb) {
        $('import-empleados-tbody')?.addEventListener('change', (e) => {
            const sel = e.target.closest('select[data-emp]');
            if (sel) cb(sel.dataset.emp, Number(sel.value) || 0);
        });
    }

    obtenerFiltros() {
        const f = this.filtros;
        return {
            texto: f.texto?.value || '',
            desde: f.desde?.value || '',
            hasta: f.hasta?.value || '',
            estado: f.estado?.value || 'todos',
        };
    }

    /* ---------- Tarjetas y tabla ---------- */
    renderTarjetas({ totalMin, registros, incompletos, retardos }, ultima) {
        $('horas-total-periodo').textContent = fmtDur(totalMin);
        $('horas-total-registros').textContent = registros;
        $('horas-incompletos').textContent = incompletos;
        $('horas-retardos').textContent = retardos;
        $('horas-ultima-importacion').textContent = ultima?.fecha
            ? `${formatearFecha(ultima.fecha)} (datos hasta el ${formatearFecha(ultima.hasta)})`
            : 'Sin importar';
    }

    renderTabla(registros) {
        if (!this.tbody) return;
        if (registros.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9CA3AF;">No hay registros que coincidan.</td></tr>';
            return;
        }
        this.tbody.innerHTML = registros.map((h) => `
            <tr class="ticket-row" style="${estiloFila(h)}">
                <td><strong>${esc(h.trainee_nombre)}</strong></td>
                <td>${formatearFecha(h.fecha)}</td>
                <td>${celdaEntrada(h)}</td>
                <td>${celdaSalida(h)}</td>
                <td>${celdaTotal(h)}</td>
                <td>${esc(h.observaciones) || '-'}</td>
                <td>${celdaEstado(h)}</td>
                <td>${botonEditar(h)}</td>
            </tr>`).join('');
    }

    mostrarError(mensaje) {
        if (this.tbody) {
            this.tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#C8102E;">No se pudieron cargar las horas: ${esc(mensaje)}</td></tr>`;
        }
    }

    /* ---------- Pestaña "Registro de horas" del expediente ---------- */
         // Arma la pestaña (filtros incluidos) una sola vez al abrir el expediente
    renderPanel(traineeId) {
        if (!this.panel) return;

        this.panel.innerHTML = `
            <div data-horas-tarjetas></div>
            <div class="card" style="padding: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap;">
                    <h3 style="margin:0;">Registro de horas</h3>
                    <button class="btn-primary" data-action="registrar" data-trainee="${traineeId}" style="width:auto; padding:10px 18px;">+ Registrar horas</button>
                </div>
                <div class="table-filters" style="flex-wrap: wrap; align-items: flex-end; margin-bottom: 16px; gap: 12px;">
                    <div>
                        <small style="display:block; color:var(--text-light); margin-bottom:4px;">Desde</small>
                        <input type="date" class="filter-select" style="width: 160px;" data-filtro="desde">
                    </div>
                    <div>
                        <small style="display:block; color:var(--text-light); margin-bottom:4px;">Hasta</small>
                        <input type="date" class="filter-select" style="width: 160px;" data-filtro="hasta">
                    </div>
                    <div>
                        <small style="display:block; color:var(--text-light); margin-bottom:4px;">Estado</small>
                        <select class="filter-select" style="width: 180px;" data-filtro="estado">
                            <option value="todos">Todos los estados</option>
                            <option value="Autorizado">Autorizado</option>
                            <option value="Incompleto">Incompleto</option>
                            <option value="Retardo">Con retardo</option>
                        </select>
                    </div>
                    <button class="btn-secondary" data-action="limpiar" style="width:auto; padding:8px 16px;">Limpiar filtros</button>
                </div>
                <div data-horas-tabla></div>
            </div>`;
    }

    // Actualiza solo las tarjetas y la tabla (así los filtros no se pierden)
    actualizarPanel(registros, resumen, hayRegistros) {
        const tarjetas = this.panel?.querySelector('[data-horas-tarjetas]');
        const tabla = this.panel?.querySelector('[data-horas-tabla]');
        if (!tarjetas || !tabla) return;

        tarjetas.innerHTML = `
            <div class="tickets-summary-grid" style="grid-template-columns: repeat(auto-fit, minmax(170px, 1fr));">
                <div class="summary-card" style="border-top-color: var(--primary-red);">
                    <h2>${fmtDur(resumen.totalMin)}</h2>
                    <p>Total autorizado</p>
                </div>
                <div class="summary-card" style="border-top-color: var(--text-dark);">
                    <h2>${resumen.registros}</h2>
                    <p>Registros</p>
                </div>
                <div class="summary-card" style="border-top-color: #F59E0B;">
                    <h2>${resumen.incompletos}</h2>
                    <p>Incompletos</p>
                </div>
                <div class="summary-card" style="border-top-color: ${ROJO};">
                    <h2 style="color: ${ROJO};">${resumen.retardos}</h2>
                    <p>Retardos</p>
                </div>
            </div>`;

        if (registros.length === 0) {
            tabla.innerHTML = `<p style="color: var(--text-light); text-align:center; padding: 30px 0;">${
                hayRegistros ? 'No hay registros que coincidan con los filtros.' : 'Aún no hay horas registradas para este Trainee.'}</p>`;
            return;
        }

        tabla.innerHTML = `<div class="table-container"><table class="tickets-table">
                <thead><tr><th>Fecha</th><th>Entrada</th><th>Salida</th><th>Total</th><th>Observaciones</th><th>Estado</th><th>Acciones</th></tr></thead>
                <tbody>${registros.map((h) => `
                    <tr style="${estiloFila(h)}">
                        <td>${formatearFecha(h.fecha)}</td>
                        <td>${celdaEntrada(h)}</td>
                        <td>${celdaSalida(h)}</td>
                        <td>${celdaTotal(h)}</td>
                        <td>${esc(h.observaciones) || '-'}</td>
                        <td>${celdaEstado(h)}</td>
                        <td>${botonEditar(h)}</td>
                    </tr>`).join('')}
                </tbody></table></div>`;
    }

    /* ---------- Modal de registro manual ---------- */
    abrirModal({ trainees, registro = null, traineeId = null }) {
        const c = this.campos;
        this.titulo.textContent = registro ? 'Editar / corregir registro' : 'Registrar horas';

        c.trainee.innerHTML = '<option value="">Selecciona un Trainee</option>' +
            trainees.map((t) => `<option value="${t.id}">${esc(t.nombre)}</option>`).join('');
        c.trainee.value = registro ? String(registro.trainee_id) : (traineeId ? String(traineeId) : '');
        c.fecha.value = registro ? registro.fecha : new Date().toLocaleDateString('en-CA');
        c.entrada.value = registro ? (registro.entrada || '') : '09:00';
        c.salida.value = registro ? (registro.salida || '') : '';
        c.observaciones.value = registro ? (registro.observaciones || '') : '';
        mostrar(this.modal);
    }

    cerrarModal() { if (this.modal) ocultar(this.modal); }

    leerFormulario() {
        const c = this.campos;
        return {
            trainee_id: Number(c.trainee.value) || 0,
            fecha: c.fecha.value,
            entrada: c.entrada.value,
            salida: c.salida.value,
            observaciones: c.observaciones.value.trim(),
        };
    }

    bloquearGuardar(bloqueado) {
        if (!this.btnGuardar) return;
        this.btnGuardar.disabled = bloqueado;
        this.btnGuardar.textContent = bloqueado ? 'Guardando…' : 'Guardar';
    }

    /* ---------- Importación del Excel del checador ---------- */
    abrirImportacion() {
        this.inputArchivo.value = '';
        this.paso1.style.display = 'block';
        this.paso2.style.display = 'none';
        this.btnConfirmar.style.display = 'none';
        mostrar(this.importModal);
    }

    cerrarImportacion() { if (this.importModal) ocultar(this.importModal); }

    mostrarPaso2({ archivo, inicio, fin, totalEmpleados, totalRegistros }, empleados, opciones, mapa) {
        $('import-resumen').innerHTML =
            `<strong>${esc(archivo)}</strong><br>
             Periodo: ${formatearFecha(inicio)} al ${formatearFecha(fin)} ·
             ${totalEmpleados} empleados detectados · ${totalRegistros} días con marcas`;

        $('import-empleados-tbody').innerHTML = empleados.map((emp) => `
            <tr>
                <td>${esc(emp.id)}</td>
                <td>${esc(emp.nombre) || '<em style="color:#9CA3AF;">sin nombre</em>'}</td>
                <td>${emp.registros.length}</td>
                <td>
                    <select class="form-control" data-emp="${esc(emp.id)}">
                        <option value="">— No importar —</option>
                        ${opciones.map((o) => `<option value="${o.id}" ${mapa[emp.id] === o.id ? 'selected' : ''}>${esc(o.nombre)}</option>`).join('')}
                    </select>
                </td>
            </tr>`).join('');

        this.paso1.style.display = 'none';
        this.paso2.style.display = 'block';
        this.btnConfirmar.style.display = 'inline-block';
    }

    renderVistaPrevia(lista, { nuevos, incompletos, duplicados, sinAsignar }) {
        $('import-conteos').textContent =
            `${nuevos} registros nuevos (${incompletos} incompletos) · ${duplicados} duplicados que se omitirán · ${sinAsignar} empleados sin asignar`;

        $('import-preview-tbody').innerHTML = lista.length === 0
            ? '<tr><td colspan="5" style="text-align:center;padding:30px;color:#9CA3AF;">Asigna al menos un empleado a un Trainee para ver la vista previa.</td></tr>'
            : lista.map((r) => {
                let resultado = '<span class="status-badge-active">Correcto</span>';
                if (r.duplicado) resultado = '<span class="status-badge-inactive">Ya existe (se omite)</span>';
                else if (!r.salida) resultado = '<span class="status-badge-warning">Incompleto</span>';
                return `<tr>
                    <td>${esc(r.trainee_nombre)}</td>
                    <td>${formatearFecha(r.fecha)}</td>
                    <td>${esc(r.entrada)}</td>
                    <td>${r.salida ? esc(r.salida) : '<span style="color:#F59E0B;">Falta</span>'}</td>
                    <td>${resultado}</td>
                </tr>`;
            }).join('');

        this.btnConfirmar.disabled = nuevos === 0;
        this.btnConfirmar.style.opacity = nuevos === 0 ? '0.5' : '1';
    }

    bloquearConfirmar(bloqueado) {
        this.btnConfirmar.disabled = bloqueado;
        this.btnConfirmar.textContent = bloqueado ? 'Importando…' : 'Confirmar importación';
    }
}