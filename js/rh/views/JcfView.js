import { formatearFecha } from './TraineeView.js';

const $ = (id) => document.getElementById(id);

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const idVisible = (id) => 'JCF-' + String(id).padStart(3, '0');

function claseBadge(estatus) {
    if (estatus === 'Aprobado') return 'badge-status resuelto';
    if (estatus === 'Rechazado') return 'badge-status atencion';
    return 'badge-status espera';
}

const ICONO_OJO = '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>';

export class JcfView {
    constructor() {
        this.tbody = $('jcf-tbody');
        this.info = $('jcf-pagination-info');
        this.paginacion = $('jcf-pagination');
        this.modal = $('jcf-modal');
        this.tituloModal = this.modal?.querySelector('.modal-header h2');
        this.btnGuardar = $('btn-guardar-jcf');

        this.filtros = {
            texto: $('filter-jcf-text'),
            profesion: $('filter-jcf-profesion'),
            experiencia: $('filter-jcf-experiencia'),
            estatus: $('filter-jcf-estado'),
        };

        this.campos = {
            nombre: $('jcf-nombre'),
            apellidos: $('jcf-apellidos'),
            telefono: $('jcf-telefono'),
            fecha_nacimiento: $('jcf-fecha-nacimiento'),
            direccion: $('jcf-direccion'),
            experiencia: $('jcf-experiencia'),
            profesion: $('jcf-profesion'),
            estatus: $('jcf-estado'),
            observaciones: $('jcf-observaciones'),
            fecha_registro: $('jcf-fecha-registro'),
        };

        this.tabs = document.querySelectorAll('.exp-tab-jcf');
        this.tabs.forEach((tab) => tab.addEventListener('click', () => this.activarPestana(tab.dataset.expTab)));
    }

    /* ---------- Eventos ---------- */
    alCambiarFiltros(cb) {
        Object.values(this.filtros).forEach((el) => {
            if (!el) return;
            el.addEventListener('input', cb);
            el.addEventListener('change', cb);
        });
    }
    alClicNuevo(cb) { $('btn-nuevo-jcf')?.addEventListener('click', cb); }
    alGuardar(cb) { this.btnGuardar?.addEventListener('click', cb); }
    alCerrarModal(cb) {
        ['btn-cerrar-modal-jcf', 'btn-cancelar-modal-jcf'].forEach((id) => $(id)?.addEventListener('click', cb));
        this.modal?.addEventListener('click', (e) => { if (e.target === this.modal) cb(); });
    }
    alClicTabla(cb) {
        this.tbody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (btn) cb(btn.dataset.action, Number(btn.dataset.id));
        });
    }
    alVolver(cb) { $('btn-volver-jcf')?.addEventListener('click', cb); }
    alEditarExpediente(cb) { $('btn-editar-jcf')?.addEventListener('click', cb); }
    alCambiarEstatusExpediente(cb) {
        $('exp-jcf-select-estado')?.addEventListener('change', (e) => cb(e.target.value));
    }

    /* ---------- Filtros ---------- */
    obtenerFiltros() {
        const f = this.filtros;
        return {
            texto: f.texto?.value || '',
            profesion: f.profesion?.value || '',
            experiencia: f.experiencia?.value || '',
            estatus: f.estatus?.value || 'todos',
        };
    }

    /* ---------- Tabla ---------- */
    renderContadores({ total, pendientes, aprobados, rechazados }) {
        $('count-jcf-total').textContent = total;
        $('count-jcf-pendientes').textContent = pendientes;
        $('count-jcf-aprobados').textContent = aprobados;
        $('count-jcf-rechazados').textContent = rechazados;
    }

    renderTabla(registros) {
        if (!this.tbody) return;
        if (registros.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#9CA3AF;">No se encontraron jóvenes.</td></tr>';
            return;
        }
        this.tbody.innerHTML = registros.map((j) => `
            <tr class="ticket-row">
                <td class="ticket-id">${idVisible(j.id)}</td>
                <td><strong>${esc(j.nombre)} ${esc(j.apellidos)}</strong></td>
                <td>${esc(j.telefono) || '-'}</td>
                <td>${esc(j.experiencia) || '-'}</td>
                <td>${esc(j.profesion)}</td>
                <td>${formatearFecha(j.fecha_registro)}</td>
                <td><span class="${claseBadge(j.estatus)}">${esc(j.estatus)}</span></td>
                <td>
                    <button class="btn-action" data-action="ver" data-id="${j.id}" title="Consultar expediente"
                        style="padding: 8px 14px; background: var(--primary-red); color: white; border-radius: 6px; font-weight: 600; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 6px;">
                        ${ICONO_OJO} Consultar
                    </button>
                </td>
            </tr>`).join('');
    }

    mostrarError(mensaje) {
        if (this.tbody) {
            this.tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#C8102E;">No se pudieron cargar los registros: ${esc(mensaje)}</td></tr>`;
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

    /* ---------- Modal ---------- */
    abrirModal(joven = null) {
        if (!this.modal) return;
        const c = this.campos;

        Object.values(c).forEach((el) => { if (el) el.value = ''; });
        c.estatus.value = 'Pendiente';
        c.fecha_registro.value = new Date().toLocaleDateString('en-CA');
        c.fecha_registro.readOnly = true;

        if (joven) {
            Object.keys(c).forEach((k) => { if (c[k]) c[k].value = joven[k] ?? ''; });
            c.fecha_registro.value = String(joven.fecha_registro).slice(0, 10);
        }
        if (this.tituloModal) this.tituloModal.textContent = joven ? 'Editar Joven' : 'Nuevo Joven';

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
    renderExpediente(j) {
        const poner = (id, texto) => { $(id).textContent = texto; };
        const nombreCompleto = `${j.nombre} ${j.apellidos}`;

        poner('exp-jcf-id', idVisible(j.id));
        poner('exp-jcf-nombre', nombreCompleto);
        poner('exp-jcf-nombre-completo', nombreCompleto);
        poner('exp-jcf-telefono', j.telefono || '-');
        poner('exp-jcf-fecha-nacimiento', formatearFecha(j.fecha_nacimiento));
        poner('exp-jcf-direccion', j.direccion || '-');
        poner('exp-jcf-experiencia', j.experiencia || '-');
        poner('exp-jcf-profesion', j.profesion || '-');
        poner('exp-jcf-fecha-registro', formatearFecha(j.fecha_registro));
        poner('exp-jcf-observaciones', j.observaciones || 'Sin observaciones.');

        const badge = $('exp-jcf-estado');
        badge.textContent = j.estatus;
        badge.className = claseBadge(j.estatus);

        const select = $('exp-jcf-select-estado');
        if (select) select.value = j.estatus;
    }

    activarPestana(nombre) {
        this.tabs.forEach((tab) => {
            const activa = tab.dataset.expTab === nombre;
            tab.classList.toggle('active', activa);
            tab.style.color = activa ? 'var(--primary-red)' : 'var(--text-light)';
            tab.style.borderBottomColor = activa ? 'var(--primary-red)' : 'transparent';
        });
        ['general', 'entrevistas', 'documentos'].forEach((n) => {
            const panel = $('exp-jcf-panel-' + n);
            if (panel) panel.style.display = n === nombre ? 'block' : 'none';
        });
    }
}
