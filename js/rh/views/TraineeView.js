const $ = (id) => document.getElementById(id);

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];

export function formatearFecha(iso) {
    if (!iso) return '-';
    const [y, m, d] = String(iso).slice(0, 10).split('-');
    return `${d} ${MESES[parseInt(m, 10) - 1]} ${y}`;
}

// Evita que un texto guardado en la BD se interprete como HTML
function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const idVisible = (id) => 'TR-' + String(id).padStart(3, '0');

function claseBadge(estatus) {
    if (estatus === 'Aprobado') return 'badge-status resuelto';
    if (estatus === 'Rechazado') return 'badge-status atencion';
    return 'badge-status espera';
}

const ICONO_OJO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';

export class TraineeView {
    constructor() {
        this.tbody = $('trainees-tbody');
        this.info = $('trainees-pagination-info');
        this.paginacion = $('trainees-pagination');
        this.modal = $('trainee-modal');
        this.tituloModal = this.modal?.querySelector('.modal-header h2');
        this.btnGuardar = $('btn-guardar-trainee');

        this.filtros = {
            texto: $('filter-trainee-text'),
            universidad: $('filter-trainee-universidad'),
            carrera: $('filter-trainee-carrera'),
            estatus: $('filter-trainee-estado'),
            turno: $('filter-trainee-turno'),
        };

        this.campos = {
            nombre: $('trainee-nombre'),
            apellidos: $('trainee-apellidos'),
            telefono: $('trainee-telefono'),
            fecha_nacimiento: $('trainee-fecha-nacimiento'),
            direccion: $('trainee-direccion'),
            universidad: $('trainee-universidad'),
            carrera: $('trainee-carrera'),
            turno: $('trainee-turno'),
            estatus: $('trainee-estado'),
            observaciones: $('trainee-observaciones'),
            fecha_registro: $('trainee-fecha-registro'),
        };

        this.tabs = document.querySelectorAll('.exp-tab');
        this.tabs.forEach((tab) => tab.addEventListener('click', () => this.activarPestana(tab.dataset.expTab)));
    }

    /* ---------- Eventos (el controlador decide qué hacer con ellos) ---------- */
    alCambiarFiltros(cb) {
        Object.values(this.filtros).forEach((el) => {
            if (!el) return;
            el.addEventListener('input', cb);
            el.addEventListener('change', cb);
        });
    }
    alClicNuevo(cb) { $('btn-nuevo-trainee')?.addEventListener('click', cb); }
    alGuardar(cb) { this.btnGuardar?.addEventListener('click', cb); }
    alCerrarModal(cb) {
        ['btn-cerrar-modal-trainee', 'btn-cancelar-modal-trainee'].forEach((id) => $(id)?.addEventListener('click', cb));
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) cb(); });
    }
    alClicTabla(cb) {
        this.tbody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (btn) cb(btn.dataset.action, Number(btn.dataset.id));
        });
    }
    alVolver(cb) { $('btn-volver-trainees')?.addEventListener('click', cb); }
    alEditarExpediente(cb) { $('btn-editar-desde-expediente')?.addEventListener('click', cb); }
    alCambiarEstatusExpediente(cb) {
        $('exp-select-estado')?.addEventListener('change', (e) => cb(e.target.value));
    }

    /* ---------- Filtros ---------- */
    obtenerFiltros() {
        const f = this.filtros;
        return {
            texto: f.texto?.value || '',
            universidad: f.universidad?.value || '',
            carrera: f.carrera?.value || '',
            estatus: f.estatus?.value || 'todos',
            turno: f.turno?.value || 'todos',
        };
    }

    /* ---------- Tabla, contadores y paginación ---------- */
    renderContadores({ total, pendientes, aprobados, rechazados }) {
        $('count-trainees-total').textContent = total;
        $('count-trainees-pendientes').textContent = pendientes;
        $('count-trainees-aprobados').textContent = aprobados;
        $('count-trainees-rechazados').textContent = rechazados;
    }

    renderTabla(registros) {
        if (!this.tbody) return;
        if (registros.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9CA3AF;">No se encontraron trainees.</td></tr>';
            return;
        }
        this.tbody.innerHTML = registros.map((t) => `
            <tr class="ticket-row">
                <td class="ticket-id">${idVisible(t.id)}</td>
                <td><strong>${esc(t.nombre)} ${esc(t.apellidos)}</strong></td>
                <td>${esc(t.universidad)}</td>
                <td>${esc(t.carrera)}</td>
                <td>${esc(t.turno)}</td>
                <td>${formatearFecha(t.fecha_registro)}</td>
                <td><span class="${claseBadge(t.estatus)}">${esc(t.estatus)}</span></td>
                <td>
                    <button class="btn-action" data-action="ver" data-id="${t.id}" title="Consultar expediente"
                        style="padding: 8px 14px; background: var(--primary-red); color: white; border-radius: 6px; font-weight: 600; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
                        ${ICONO_OJO} Consultar
                    </button>
                </td>
            </tr>`).join('');
    }

    mostrarError(mensaje) {
        if (this.tbody) {
            this.tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#C8102E;">No se pudieron cargar los trainees: ${esc(mensaje)}</td></tr>`;
        }
    }

    renderPaginacion({ pagina, totalPaginas, desde, hasta, total }, alCambiarPagina) {
        if (this.info) this.info.textContent = `Mostrando ${desde}–${hasta} de ${total} registros`;
        if (!this.paginacion) return;

        this.paginacion.innerHTML = '';
        const boton = (texto, clase, deshabilitado, destino) => {
            const b = document.createElement('button');
            b.className = clase;
            b.textContent = texto;
            b.disabled = deshabilitado;
            if (/^\d+$/.test(texto)) { b.style.width = '36px'; b.style.padding = '6px 0'; }
            b.addEventListener('click', () => alCambiarPagina(destino));
            this.paginacion.appendChild(b);
        };

        boton('‹', 'btn-secondary', pagina === 1, pagina - 1);
        for (let i = 1; i <= totalPaginas; i++) {
            boton(String(i), i === pagina ? 'btn-primary' : 'btn-secondary', false, i);
        }
        boton('›', 'btn-secondary', pagina === totalPaginas, pagina + 1);
    }

    /* ---------- Modal (nuevo / editar) ---------- */
    abrirModal(trainee = null) {
        if (!this.modal) return;
        const c = this.campos;

        Object.values(c).forEach((el) => { if (el) el.value = ''; });
        c.estatus.value = 'Pendiente';
        c.fecha_registro.value = new Date().toLocaleDateString('en-CA');
        c.fecha_registro.readOnly = true;

        if (trainee) {
            Object.keys(c).forEach((k) => { if (c[k]) c[k].value = trainee[k] ?? ''; });
            c.fecha_registro.value = String(trainee.fecha_registro).slice(0, 10);
        }
        if (this.tituloModal) this.tituloModal.textContent = trainee ? 'Editar Trainee' : 'Nuevo Trainee';

        this.modal.classList.add('active');
        Object.assign(this.modal.style, { display: 'flex', opacity: '1', visibility: 'visible', zIndex: '9999' });
    }

    cerrarModal() {
        if (!this.modal) return;
        this.modal.classList.remove('active');
        Object.assign(this.modal.style, { display: '', opacity: '', visibility: '', zIndex: '' });
    }

    leerFormulario() {
        const datos = {};
        Object.entries(this.campos).forEach(([k, el]) => {
            if (k !== 'fecha_registro') datos[k] = (el?.value || '').trim();
        });
        return datos;
    }

    bloquearGuardar(bloqueado) {
        if (!this.btnGuardar) return;
        this.btnGuardar.disabled = bloqueado;
        this.btnGuardar.textContent = bloqueado ? 'Guardando…' : 'Guardar';
    }

    /* ---------- Expediente ---------- */
    renderExpediente(t) {
        const nombreCompleto = `${t.nombre} ${t.apellidos}`;
        const poner = (id, texto) => { $(id).textContent = texto; };

        poner('exp-id', idVisible(t.id));
        poner('exp-nombre', nombreCompleto);
        poner('exp-nombre-completo', nombreCompleto);
        poner('exp-telefono', t.telefono || '-');
        poner('exp-fecha-nacimiento', formatearFecha(t.fecha_nacimiento));
        poner('exp-direccion', t.direccion || '-');
        poner('exp-universidad', t.universidad || '-');
        poner('exp-carrera', t.carrera || '-');
        poner('exp-turno', t.turno || '-');
        poner('exp-fecha-registro', formatearFecha(t.fecha_registro));
        poner('exp-observaciones', t.observaciones || 'Sin observaciones.');

        const badge = $('exp-estado');
        badge.textContent = t.estatus;
        badge.className = claseBadge(t.estatus);

        const select = $('exp-select-estado');
        if (select) select.value = t.estatus;
    }

    activarPestana(nombre) {
        this.tabs.forEach((tab) => {
            const activa = tab.dataset.expTab === nombre;
            tab.classList.toggle('active', activa);
            tab.style.color = activa ? 'var(--primary-red)' : 'var(--text-light)';
            tab.style.borderBottomColor = activa ? 'var(--primary-red)' : 'transparent';
        });
        ['general', 'entrevistas', 'documentos', 'horas'].forEach((n) => {
            const panel = $('exp-panel-' + n);
            if (!panel) return;
            const activo = n === nombre;
            panel.classList.toggle('active', activo);
            panel.style.display = activo ? 'block' : 'none';
        });
    }
}
