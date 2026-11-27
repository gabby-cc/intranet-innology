import { formatearFecha } from './TraineeView.js';


const $ = (id) => document.getElementById(id);

function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => (
        { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]
    ));
}

const ICONO = {
    descargar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>',
    editar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>',
    activar: '<svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>',
};

function claseIcono(formato) {
    if (formato === 'pdf') return 'pdf';
    if (formato === 'docx' || formato === 'doc') return 'word';
    if (formato === 'xlsx') return 'excel';
    if (formato === 'pptx') return 'ppt';
    return 'txt';
}

function mostrar(modal) {
    modal.classList.add('active');
    Object.assign(modal.style, { display: 'flex', opacity: '1', visibility: 'visible' });
}
function ocultar(modal) {
    modal.classList.remove('active');
    Object.assign(modal.style, { display: '', opacity: '', visibility: '' });
}

export class DocumentoView {
    constructor() {
        this.tbody = $('docs-tbody');
        // ✅ CAMBIO: IDs actualizados para evitar choque
        this.modal = $('rh-doc-modal');
        this.titulo = $('rh-doc-modal-title');
        this.btnGuardar = $('btn-guardar-rh-doc');
        this.inputArchivo = $('rh-doc-file-input');
        this.nombreArchivo = $('rh-doc-file-name');

        this.filtros = {
            texto: $('filter-doc-text'),
            formato: $('filter-doc-formato'),
            estado: $('filter-doc-estado'),
        };

        this.campos = {
            nombre: $('rh-doc-nombre'),
            descripcion: $('rh-doc-descripcion'),
            estado: $('rh-doc-estado'),
        };

        this.paneles = {
            Trainee: $('exp-panel-documentos'),
            JCF: $('exp-jcf-panel-documentos'),
        };

        this.inputArchivo?.addEventListener('change', () => {
            const archivo = this.inputArchivo.files[0];
            if (archivo) this.mostrarNombre(`Archivo seleccionado: ${archivo.name}`);
        });
    }

    mostrarNombre(texto) {
        this.nombreArchivo.textContent = texto;
        this.nombreArchivo.style.display = 'block';
    }

    /* ---------- Eventos ---------- */
    alClicNueva(cb) { $('btn-subir-plantilla')?.addEventListener('click', cb); }
    alCambiarFiltros(cb) {
        Object.values(this.filtros).forEach((el) => {
            if (!el) return;
            el.addEventListener('input', cb);
            el.addEventListener('change', cb);
        });
    }
    alClicTabla(cb) {
        this.tbody?.addEventListener('click', (e) => {
            const btn = e.target.closest('button[data-action]');
            if (btn) cb(btn.dataset.action, Number(btn.dataset.id));
        });
    }
    alCerrarModal(cb) {
        ['btn-cerrar-modal-rh-doc', 'btn-cancelar-modal-rh-doc'].forEach((id) => $(id)?.addEventListener('click', cb));
    }
    alGuardar(cb) { this.btnGuardar?.addEventListener('click', cb); }

        alClicPaneles(cb) {
        Object.entries(this.paneles).forEach(([tipo, panel]) => {
            panel?.addEventListener('click', (e) => {
                const btn = e.target.closest('button[data-action]');
                if (!btn) return;
                if (btn.dataset.action === 'descargar-doc') {
                    cb('descargar-doc', { id: Number(btn.dataset.id) });
                } else if (btn.dataset.action === 'subir-doc') {
                    cb('subir-doc', {
                        tipo,
                        candidatoId: Number(btn.dataset.candidato),
                        nombre: panel.querySelector('[data-doc-nombre]').value.trim(),
                        descripcion: panel.querySelector('[data-doc-descripcion]').value.trim(),
                        archivo: panel.querySelector('[data-doc-archivo]').files[0] || null,
                    });
                }
            });
        });
    }

    obtenerFiltros() {
        const f = this.filtros;
        return {
            texto: f.texto?.value || '',
            formato: f.formato?.value || 'todos',
            estado: f.estado?.value || 'todos',
        };
    }

    /* ---------- Plantillas ---------- */
    renderContadores({ total, activas, inactivas }) {
        $('count-docs-total').textContent = total;
        $('count-docs-activas').textContent = activas;
        $('count-docs-inactivas').textContent = inactivas;
    }

    renderTabla(plantillas) {
        if (!this.tbody) return;
        if (plantillas.length === 0) {
            this.tbody.innerHTML = '<tr><td colspan="5" style="text-align:center;padding:40px;color:#9CA3AF;">No se encontraron plantillas.</td></tr>';
            return;
        }
        this.tbody.innerHTML = plantillas.map((p) => `
            <tr class="ticket-row">
                <td class="doc-name-cell">
                    <div class="file-icon-box ${claseIcono(p.formato)}">${esc(p.formato.toUpperCase())}</div>
                    <div>
                        <strong>${esc(p.nombre)}</strong>
                        <span>${esc(p.descripcion) || 'Sin descripción'}</span>
                    </div>
                </td>
                <td><span style="font-size:0.85rem; color:var(--text-light);">${esc(p.archivo)}</span></td>
                <td>${formatearFecha(p.fecha)}</td>
                <td><span class="${p.activo ? 'status-badge-active' : 'status-badge-inactive'}">${p.activo ? 'Activo' : 'Inactivo'}</span></td>
                <td>
                    <div style="display:flex; gap:5px;">
                        <button class="btn-action" data-action="descargar" data-id="${p.id}" title="Descargar">${ICONO.descargar}</button>
                        <button class="btn-action" data-action="editar" data-id="${p.id}" title="Editar / reemplazar archivo">${ICONO.editar}</button>
                        <button class="btn-action" data-action="activar" data-id="${p.id}" title="Activar / desactivar">${ICONO.activar}</button>
                    </div>
                </td>
            </tr>`).join('');
    }

    mostrarError(mensaje) {
        if (this.tbody) {
            this.tbody.innerHTML = `<tr><td colspan="5" style="text-align:center;padding:40px;color:#C8102E;">No se pudieron cargar las plantillas: ${esc(mensaje)}</td></tr>`;
        }
    }

    /* ---------- Modal de plantilla ---------- */
    abrirModal(plantilla = null) {
        const c = this.campos;
        this.titulo.textContent = plantilla ? 'Editar Plantilla' : 'Subir Plantilla';
        this.inputArchivo.value = '';

        c.nombre.value = plantilla ? plantilla.nombre : '';
        c.descripcion.value = plantilla ? (plantilla.descripcion || '') : '';
        c.estado.value = plantilla && !plantilla.activo ? 'Inactivo' : 'Activo';

        if (plantilla) {
            this.mostrarNombre(`Archivo actual: ${plantilla.archivo}. Elige otro solo si quieres reemplazarlo.`);
        } else {
            this.nombreArchivo.style.display = 'none';
        }
        mostrar(this.modal);
    }

    cerrarModal() { if (this.modal) ocultar(this.modal); }

    leerFormulario() {
        const c = this.campos;
        return {
            nombre: c.nombre.value.trim(),
            descripcion: c.descripcion.value.trim(),
            activo: c.estado.value === 'Activo',
        };
    }

    archivoSeleccionado() { return this.inputArchivo.files[0] || null; }

    bloquearGuardar(bloqueado) {
        if (!this.btnGuardar) return;
        this.btnGuardar.disabled = bloqueado;
        this.btnGuardar.textContent = bloqueado ? 'Guardando…' : 'Guardar Plantilla';
    }

        /* ---------- Pestaña de documentos en los expedientes ---------- */
    renderPanel(tipo, candidatoId, documentos) {
        const panel = this.paneles[tipo];
        if (!panel) return;

        const lista = documentos.length === 0
            ? '<p style="color: var(--text-light); text-align:center; padding: 30px 0;">Aún no hay documentos cargados en este expediente.</p>'
            : `<div class="table-container"><table class="tickets-table">
                    <thead><tr><th>Documento</th><th>Archivo</th><th>Fecha de carga</th><th>Acciones</th></tr></thead>
                    <tbody>${documentos.map((d) => `
                        <tr>
                            <td>
                                <strong>${esc(d.nombre || d.archivo)}</strong>
                                <div style="font-size:0.8rem; color:var(--text-light);">${esc(d.descripcion) || 'Sin descripción'}</div>
                            </td>
                            <td><span style="font-size:0.85rem; color:var(--text-light);">${esc(d.archivo)}</span></td>
                            <td>${formatearFecha(d.fecha)} <small style="color:var(--text-light);">${esc(d.fecha.slice(11))}</small></td>
                            <td><button class="btn-action" data-action="descargar-doc" data-id="${d.id}" title="Descargar">${ICONO.descargar}</button></td>
                        </tr>`).join('')}
                    </tbody></table></div>`;

        panel.innerHTML = `
            <div class="card" style="padding: 24px; margin-bottom: 20px;">
                <h3 style="margin-bottom: 4px;">Subir documento</h3>
                <p style="color: var(--text-light); margin-bottom: 16px; font-size:0.85rem;">PDF, DOC o DOCX · máximo 5 MB</p>
                <div class="form-group">
                    <label>Nombre del documento *</label>
                    <input type="text" class="form-control" data-doc-nombre maxlength="150" placeholder="Ej. CV actualizado, Carta de aceptación firmada">
                </div>
                <div class="form-group">
                    <label>Descripción</label>
                    <textarea class="form-control" data-doc-descripcion rows="2" maxlength="255" placeholder="Opcional"></textarea>
                </div>
                <div class="form-group">
                    <label>Archivo *</label>
                    <input type="file" class="form-control" data-doc-archivo accept=".pdf,.doc,.docx">
                </div>
                <button class="btn-primary" data-action="subir-doc" data-candidato="${candidatoId}" style="width:auto; padding:10px 20px;">Subir documento</button>
            </div>
            <div class="card" style="padding: 24px;">
                <h3 style="margin-bottom: 16px;">Documentos del expediente</h3>
                ${lista}
            </div>`;
    }
}