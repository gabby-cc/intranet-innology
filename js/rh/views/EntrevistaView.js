import { formatearFecha } from './TraineeView.js';
import { ESTATUS } from '../models/EntrevistaModel.js';

const $ = (id) => document.getElementById(id);

const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

function claseBadge(estatus) {
    if (estatus === 'Realizada') return 'badge-status resuelto';
    if (estatus === 'Cancelada' || estatus === 'No asistio') return 'badge-status atencion';
    return 'badge-status espera';
}

const hoyISO = () => new Date().toLocaleDateString('en-CA');

const ICONO_EDITAR = '<svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>';
const ESTILO_BTN_EDITAR = 'padding: 6px 12px; background: var(--primary-red); color: white; border-radius: 6px; font-size: 0.8rem; font-weight: 600; display: inline-flex; align-items: center; gap: 6px;';

export class EntrevistaView {
    constructor() {
        this.grid = $('calendar-grid');
        this.mesAnio = $('calendar-month-year');
        this.tbody = $('interviews-tbody');
        this.modal = $('interview-modal');
        this.titulo = $('interview-modal-title');
        this.btnGuardar = $('btn-guardar-interview');
        this.grupoEnlace = $('group-enlace');

        this.filtros = {
            texto: $('filter-entrevista-nombre'),
            tipo: $('filter-entrevista-tipo'),
            estatus: $('filter-entrevista-estado'),
            fecha: $('filter-entrevista-fecha'),
        };

        this.campos = {
            tipo: $('interview-tipo'),
            candidato: $('interview-candidato'),
            fecha: $('interview-fecha'),
            hora: $('interview-hora'),
            modalidad: $('interview-modalidad'),
            enlace: $('interview-enlace'),
            estatus: $('interview-estado'),
            observaciones: $('interview-observaciones'),
        };

        // Paneles "Entrevistas" de los expedientes
        this.paneles = {
            Trainee: $('exp-panel-entrevistas'),
            JCF: $('exp-jcf-panel-entrevistas'),
        };

        // El enlace solo se muestra si la entrevista es online
        this.campos.modalidad?.addEventListener('change', () => this.actualizarEnlace());
    }

    actualizarEnlace() {
        if (this.grupoEnlace) {
            this.grupoEnlace.style.display = this.campos.modalidad.value === 'Online' ? 'block' : 'none';
        }
    }

    /* ---------- Eventos ---------- */
    alClicNueva(cb) { $('btn-nueva-entrevista')?.addEventListener('click', cb); }
    alCambiarMes(cb) {
        $('btn-prev-month')?.addEventListener('click', () => cb(-1));
        $('btn-next-month')?.addEventListener('click', () => cb(1));
    }
    alClicCalendario(cb) {
        this.grid?.addEventListener('click', (e) => {
            const chip = e.target.closest('.calendar-event-chip');
            if (chip) { cb('editar', { id: Number(chip.dataset.id) }); return; }
            const dia = e.target.closest('.calendar-day[data-fecha]');
            if (dia) cb('nueva', { fecha: dia.dataset.fecha });
        });
    }
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
        this.tbody?.addEventListener('change', (e) => {
            const sel = e.target.closest('select[data-action="estatus"]');
            if (sel) cb('estatus', { id: Number(sel.dataset.id), estatus: sel.value });
        });
    }
    alClicPaneles(cb) {
        Object.values(this.paneles).forEach((panel) => {
            panel?.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                cb(btn.dataset.action, {
                    id: Number(btn.dataset.id),
                    tipo: btn.dataset.tipo,
                    candidatoId: Number(btn.dataset.candidato),
                });
            });
        });
    }
    alCerrarModal(cb) {
        ['btn-cerrar-modal-interview', 'btn-cancelar-modal-interview'].forEach((id) => $(id)?.addEventListener('click', cb));
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) cb(); });
    }
    alGuardar(cb) { this.btnGuardar?.addEventListener('click', cb); }
    alCambiarTipo(cb) { this.campos.tipo?.addEventListener('change', (e) => cb(e.target.value)); }

    obtenerFiltros() {
        const f = this.filtros;
        return {
            texto: f.texto?.value || '',
            tipo: f.tipo?.value || 'todos',
            estatus: f.estatus?.value || 'todos',
            fecha: f.fecha?.value || '',
        };
    }

    /* ---------- Calendario ---------- */
    renderCalendario(fechaMes, entrevistasDelDia) {
        if (!this.grid) return;

        const year = fechaMes.getFullYear();
        const month = fechaMes.getMonth();
        if (this.mesAnio) this.mesAnio.textContent = `${MESES[month]} ${year}`;

        let html = DIAS.map((d) => `<div class="calendar-day-header">${d}</div>`).join('');

        const primerDia = new Date(year, month, 1).getDay();
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        const offset = primerDia === 0 ? 6 : primerDia - 1;
        html += '<div class="calendar-day empty"></div>'.repeat(offset);

        const hoy = new Date();
        for (let d = 1; d <= diasEnMes; d++) {
            const fecha = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            const esHoy = hoy.getDate() === d && hoy.getMonth() === month && hoy.getFullYear() === year;

            const chips = entrevistasDelDia(fecha).map((e) => {
                const apagada = e.estatus === 'Cancelada' || e.estatus === 'No asistio';
                const estilo = apagada ? ' style="opacity:.55;text-decoration:line-through;"' : '';
                return `<div class="calendar-event-chip ${e.tipo === 'JCF' ? 'jcf' : ''}" data-id="${e.id}"${estilo}
                            title="${esc(e.hora)} - ${esc(e.candidato_nombre)} (${esc(ESTATUS[e.estatus])})">${esc(e.hora)} ${esc(e.candidato_nombre.split(' ')[0])}</div>`;
            }).join('');

            html += `<div class="calendar-day ${esHoy ? 'today' : ''}" data-fecha="${fecha}">
                        <span class="calendar-day-number">${d}</span>${chips}
                     </div>`;
        }
        this.grid.innerHTML = html;
    }

    /* ---------- Tabla ---------- */
    renderTabla(entrevistas) {
        if (!this.tbody) return;
        if (entrevistas.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:30px;color:#9CA3AF;">No hay entrevistas que coincidan.</td></tr>';
            return;
        }
        this.tbody.innerHTML = entrevistas.map((e) => {
            const opciones = Object.entries(ESTATUS).map(([valor, etiqueta]) =>
                `<option value="${valor}" ${e.estatus === valor ? 'selected' : ''}>${etiqueta}</option>`).join('');
            const enlace = e.enlace
                ? `<a href="${esc(e.enlace)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary-red); font-size:0.8rem; margin-left:5px;">(Link)</a>`
                : '';
            return `
                <tr>
                    <td><strong>${esc(e.candidato_nombre)}</strong> <small style="color:var(--text-light);">· Filtro ${e.filtro}</small></td>
                    <td><span class="badge-type ${e.tipo === 'JCF' ? 'jcf' : 'trainee'}">${esc(e.tipo)}</span></td>
                    <td>${formatearFecha(e.fecha)}</td>
                    <td>${esc(e.hora)}</td>
                    <td>${esc(e.modalidad)} ${enlace}</td>
                    <td><select class="status-select" data-action="estatus" data-id="${e.id}">${opciones}</select></td>
                    <td><button class="btn-action" data-action="editar" data-id="${e.id}" title="Editar detalles" style="${ESTILO_BTN_EDITAR}">${ICONO_EDITAR} Editar</button></td>
                </tr>`;
        }).join('');
    }

    mostrarError(mensaje) {
        if (this.tbody) {
            this.tbody.innerHTML = `<tr><td colspan="7" style="text-align:center;padding:30px;color:#C8102E;">No se pudieron cargar las entrevistas: ${esc(mensaje)}</td></tr>`;
        }
    }

    /* ---------- Pestaña "Entrevistas" de los expedientes ---------- */
    renderPanel(tipo, candidatoId, entrevistas) {
        const panel = this.paneles[tipo];
        if (!panel) return;

        const tabla = entrevistas.length === 0
            ? '<p style="color: var(--text-light); text-align:center; padding: 30px 0;">Aún no hay entrevistas programadas para este candidato.</p>'
            : `<div class="table-container"><table class="tickets-table">
                    <thead><tr><th>Filtro</th><th>Fecha</th><th>Hora</th><th>Modalidad</th><th>Estado</th><th>Acciones</th></tr></thead>
                    <tbody>${entrevistas.map((e) => `
                        <tr>
                            <td>Filtro ${e.filtro}</td>
                            <td>${formatearFecha(e.fecha)}</td>
                            <td>${esc(e.hora)}</td>
                            <td>${esc(e.modalidad)} ${e.enlace ? `<a href="${esc(e.enlace)}" target="_blank" rel="noopener noreferrer" style="color:var(--primary-red); font-size:0.8rem;">(Link)</a>` : ''}</td>
                            <td><span class="${claseBadge(e.estatus)}">${esc(ESTATUS[e.estatus])}</span></td>
                            <td><button class="btn-action" data-action="editar" data-id="${e.id}" style="${ESTILO_BTN_EDITAR}">${ICONO_EDITAR} Editar</button></td>
                        </tr>`).join('')}
                    </tbody></table></div>`;

        panel.innerHTML = `
            <div class="card" style="padding: 24px;">
                <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:16px; gap:12px; flex-wrap:wrap;">
                    <h3 style="margin:0;">Historial de entrevistas</h3>
                    <button class="btn-primary" data-action="programar" data-tipo="${tipo}" data-candidato="${candidatoId}" style="width:auto; padding:10px 18px;">+ Programar entrevista</button>
                </div>
                ${tabla}
            </div>`;
    }

    /* ---------- Modal ---------- */
    llenarCandidatos(candidatos, seleccionadoId = null) {
        const select = this.campos.candidato;
        select.innerHTML = '<option value="">Selecciona un candidato</option>' +
            candidatos.map((c) => `<option value="${c.id}">${esc(c.nombre)}</option>`).join('');
        select.value = seleccionadoId ? String(seleccionadoId) : '';
    }

    abrirModalNueva({ fecha, tipo, candidatos, candidatoId }) {
        const c = this.campos;
        this.titulo.textContent = 'Nueva Entrevista';
        c.tipo.disabled = false;
        c.candidato.disabled = false;
        c.tipo.value = tipo;
        this.llenarCandidatos(candidatos, candidatoId);
        c.fecha.value = fecha || hoyISO();
        c.hora.value = '10:00';
        c.modalidad.value = 'Online';
        c.enlace.value = '';
        c.estatus.value = 'Programada';
        c.observaciones.value = '';
        this.mostrarModal();
    }

    abrirModalEditar(e) {
        const c = this.campos;
        this.titulo.textContent = 'Editar Entrevista';
        c.tipo.value = e.tipo;
        c.candidato.innerHTML = `<option value="${e.candidato_id}">${esc(e.candidato_nombre)}</option>`;
        c.candidato.value = String(e.candidato_id);
        c.tipo.disabled = true;        // el candidato no se puede cambiar al editar
        c.candidato.disabled = true;
        c.fecha.value = e.fecha;
        c.hora.value = e.hora;
        c.modalidad.value = e.modalidad;
        c.enlace.value = e.enlace || '';
        c.estatus.value = e.estatus;
        c.observaciones.value = e.observaciones || '';
        this.mostrarModal();
    }

    mostrarModal() {
        this.actualizarEnlace();
        this.modal.classList.add('active');
        Object.assign(this.modal.style, { display: 'flex', opacity: '1', visibility: 'visible' });
    }

    cerrarModal() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        Object.assign(this.modal.style, { display: '', opacity: '', visibility: '' });
    }

    leerFormulario() {
        const c = this.campos;
        return {
            tipo: c.tipo.value,
            candidato_id: Number(c.candidato.value) || 0,
            fecha: c.fecha.value,
            hora: c.hora.value,
            modalidad: c.modalidad.value,
            enlace: c.enlace.value.trim(),
            estatus: c.estatus.value,
            observaciones: c.observaciones.value.trim(),
        };
    }

    bloquearGuardar(bloqueado) {
        if (!this.btnGuardar) return;
        this.btnGuardar.disabled = bloqueado;
        this.btnGuardar.textContent = bloqueado ? 'Guardando…' : 'Guardar';
    }
}