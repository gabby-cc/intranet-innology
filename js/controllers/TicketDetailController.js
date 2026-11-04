import { TicketModel } from '../models/TicketModel.js';

export class TicketDetailController {
    constructor(model) {
        this.model = model || new TicketModel();
        this.currentTicketId = null;
        this.currentUser = 'Laura Méndez'; // 👈 Simulamos que Laura está logueada
        this.init();
    }

    escapeHTML(text) {
        return String(text ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
    }

    setText(id, value) {
        const el = document.getElementById(id);
        if (el) el.textContent = value;
    }

    goTo(viewId) {
        if (typeof window.switchView === 'function') {
            window.switchView(viewId);
        } else {
            document.querySelectorAll('.view-section').forEach(v => v.classList.remove('active'));
            const target = document.getElementById(viewId);
            if (target) target.classList.add('active');
        }
    }

    notifyChange() {
        document.dispatchEvent(new CustomEvent('ticketUpdated', { detail: { id: this.currentTicketId } }));
    }

    init() {
        const btnVolver = document.getElementById('btn-volver-tickets');
        if (btnVolver) btnVolver.addEventListener('click', () => this.goTo('view-tickets'));

        const btnEnviar = document.getElementById('dt-btn-enviar');
        if (btnEnviar) btnEnviar.addEventListener('click', () => this.enviarComentario());

        const btnGuardarSolucion = document.getElementById('btn-guardar-solucion');
        if (btnGuardarSolucion) btnGuardarSolucion.onclick = () => this.guardarSolucion();

        const btnCerrar = document.getElementById('btn-cerrar-ticket');
        if (btnCerrar) btnCerrar.addEventListener('click', () => this.cerrarTicket());

        // Botón Asignar
        const btnAsignar = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Asignar') || b.textContent.includes('Reasignar'));
        if (btnAsignar) {
            btnAsignar.id = 'btn-asignar-consultor';
            btnAsignar.addEventListener('click', () => this.abrirModalAsignacion());
        }

        // Botones del Modal de Asignación
        const btnCerrarModalAssign = document.getElementById('btn-cerrar-modal-assign');
        const btnCancelarAssign = document.getElementById('btn-cancelar-assign');
        const btnConfirmarAssign = document.getElementById('btn-confirmar-assign');
        
        if (btnCerrarModalAssign) btnCerrarModalAssign.addEventListener('click', () => this.cerrarModalAsignacion());
        if (btnCancelarAssign) btnCancelarAssign.addEventListener('click', () => this.cerrarModalAsignacion());
        if (btnConfirmarAssign) btnConfirmarAssign.addEventListener('click', () => this.confirmarAsignacion());

        // ✅ NUEVO: Escuchar botón Registrar Horas
        const btnRegistrarHoras = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Registrar Horas'));
        if (btnRegistrarHoras) {
            btnRegistrarHoras.addEventListener('click', () => this.abrirModalHoras());
        }

        // ✅ NUEVO: Botones del Modal de Horas
        const btnCerrarModalHours = document.getElementById('btn-cerrar-modal-hours');
        const btnCancelarHours = document.getElementById('btn-cancelar-hours');
        const btnConfirmarHours = document.getElementById('btn-confirmar-hours');
        
        if (btnCerrarModalHours) btnCerrarModalHours.addEventListener('click', () => this.cerrarModalHoras());
        if (btnCancelarHours) btnCancelarHours.addEventListener('click', () => this.cerrarModalHoras());
        if (btnConfirmarHours) btnConfirmarHours.addEventListener('click', () => this.confirmarHoras());
    }

    openTicket(ticketId) {
        this.loadTicket(ticketId);
        this.goTo('view-detalle-ticket');
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const menuItem = document.querySelector('.menu-item[data-target="view-tickets"]');
        if (menuItem) menuItem.classList.add('active');
    }

    loadTicket(ticketId) {
        const ticket = this.model.getTicketById(ticketId);
        if (!ticket) return;
        this.currentTicketId = ticketId;

        this.setText('dt-folio', ticket.id);
        this.setText('dt-title', ticket.title);
        
        const statusClass = ticket.status === 'En atención' ? 'atencion' : ticket.status === 'En espera' ? 'espera' : ticket.status === 'Resuelto' ? 'resuelto' : 'abierto';
        const priorityClass = ticket.priority === 'Alta' ? 'alta' : ticket.priority === 'Media' ? 'media' : 'baja';
        
        const statusEl = document.getElementById('dt-status');
        if (statusEl) { statusEl.textContent = ticket.status; statusEl.className = 'badge-status ' + statusClass; }
        const priorityEl = document.getElementById('dt-priority');
        if (priorityEl) { priorityEl.textContent = ticket.priority; priorityEl.className = 'badge-priority ' + priorityClass; }

        this.setText('dt-description', ticket.description || '-');
        this.setText('dt-solicitante', ticket.solicitante || '-');
        this.setText('dt-medio', ticket.medioRecepcion || 'Portal');
        this.setText('dt-tipo', ticket.tipoTicket || '-');
        this.setText('dt-pais', ticket.pais || '-');

        const esFuncional = ticket.tipoTicket === 'Funcional';
        const show = (id, visible) => { const el = document.getElementById(id); if (el) el.style.display = visible ? 'block' : 'none'; };
        show('dt-row-modulo', esFuncional);
        show('dt-row-sistema', !esFuncional);
        show('dt-row-ambiente', !esFuncional);
        
        this.setText('dt-modulo', ticket.modulo || '-');
        this.setText('dt-sistema', ticket.sistema || '-');
        this.setText('dt-ambiente', ticket.ambiente || '-');
        
        const responsableNombre = ticket.responsable || 'Sin asignar';
        this.setText('dt-responsable', responsableNombre);
        this.setText('dt-perfil', ticket.perfil || '-');
        this.setText('dt-fecha-creacion', ticket.date || '-');
        this.setText('dt-fecha-compromiso', ticket.fechaCompromiso || '-');
        this.setText('dt-plazo', '1 día hábil');
        this.setText('dt-total-horas', ticket.horas || '0h 0m');

        this.renderSoluciones(ticket);

        // ==========================================
        // ✅ LÓGICA DE BLOQUEO Y EDICIÓN
        // ==========================================
        const btnAsignar = document.getElementById('btn-asignar-consultor');
        const btnCerrar = document.getElementById('btn-cerrar-ticket');
        const chatInput = document.getElementById('dt-comment-input');
        const btnEnviar = document.getElementById('dt-btn-enviar');
        const inputSolucion = document.getElementById('dt-solucion-input');
        const btnGuardarSolucion = document.getElementById('btn-guardar-solucion');
        const btnRegistrarHoras = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Registrar Horas'));

        const estaCerrado = ticket.status === 'Resuelto';
        
        if (estaCerrado) {
            if (btnCerrar) { btnCerrar.disabled = true; btnCerrar.style.opacity = '0.5'; btnCerrar.style.cursor = 'not-allowed'; }
            if (chatInput) { chatInput.disabled = true; chatInput.placeholder = 'Ticket cerrado.'; chatInput.style.background = '#F3F4F6'; chatInput.style.cursor = 'not-allowed'; }
            if (btnEnviar) { btnEnviar.disabled = true; btnEnviar.style.opacity = '0.5'; btnEnviar.style.cursor = 'not-allowed'; }
            if (inputSolucion) { inputSolucion.disabled = true; inputSolucion.style.background = '#F3F4F6'; inputSolucion.style.cursor = 'not-allowed'; }
            if (btnGuardarSolucion) { btnGuardarSolucion.disabled = true; btnGuardarSolucion.style.opacity = '0.5'; btnGuardarSolucion.style.cursor = 'not-allowed'; }
            if (btnAsignar) { btnAsignar.disabled = true; btnAsignar.style.opacity = '0.5'; btnAsignar.style.cursor = 'not-allowed'; }
            if (btnRegistrarHoras) { btnRegistrarHoras.disabled = true; btnRegistrarHoras.style.opacity = '0.5'; btnRegistrarHoras.style.cursor = 'not-allowed'; }
        } else {
            if (btnCerrar) { btnCerrar.disabled = false; btnCerrar.style.opacity = '1'; btnCerrar.style.cursor = 'pointer'; }
            if (chatInput) { chatInput.disabled = false; chatInput.placeholder = 'Escribe un comentario...'; chatInput.style.background = '#fff'; chatInput.style.cursor = 'text'; }
            if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.style.opacity = '1'; btnEnviar.style.cursor = 'pointer'; }
            if (inputSolucion) { inputSolucion.disabled = false; inputSolucion.style.background = '#fff'; inputSolucion.style.cursor = 'text'; }
            if (btnGuardarSolucion) { btnGuardarSolucion.disabled = false; btnGuardarSolucion.style.opacity = '1'; btnGuardarSolucion.style.cursor = 'pointer'; }
            
            if (btnAsignar) { 
                btnAsignar.disabled = false; 
                btnAsignar.style.opacity = '1'; 
                btnAsignar.style.cursor = 'pointer';
                btnAsignar.textContent = (ticket.responsable && ticket.responsable !== 'Sin asignar') ? 'Reasignar' : 'Asignar / Reasignar';
            }
            if (btnRegistrarHoras) { btnRegistrarHoras.disabled = false; btnRegistrarHoras.style.opacity = '1'; btnRegistrarHoras.style.cursor = 'pointer'; }
        }

        this.renderHistorial();
    }

    abrirModalAsignacion() {
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') return;

        const modal = document.getElementById('assign-modal');
        const select = document.getElementById('select-consultor');
        
        if (ticket.responsable && ticket.responsable !== 'Sin asignar') {
            select.value = ticket.responsable;
        } else {
            select.selectedIndex = 0;
        }
        if (modal) modal.classList.add('active');
    }

    cerrarModalAsignacion() {
        const modal = document.getElementById('assign-modal');
        if (modal) modal.classList.remove('active');
    }

    confirmarAsignacion() {
        const select = document.getElementById('select-consultor');
        const consultor = select ? select.value : '';
        
        if (this.currentTicketId && consultor) {
            this.model.asignarResponsable(this.currentTicketId, consultor);
            this.cerrarModalAsignacion();
            this.loadTicket(this.currentTicketId); 
            this.notifyChange();
        }
    }

    // ✅ NUEVO: Métodos para el Modal de Horas
    abrirModalHoras() {
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') return;

        const inputH = document.getElementById('input-horas');
        const inputM = document.getElementById('input-minutos');
        const inputN = document.getElementById('input-nota-horas');

        if (inputH) inputH.value = '0';
        if (inputM) inputM.value = '0';
        if (inputN) inputN.value = '';
        
        const modal = document.getElementById('hours-modal');
        if (modal) modal.classList.add('active');
    }

    cerrarModalHoras() {
        const modal = document.getElementById('hours-modal');
        if (modal) modal.classList.remove('active');
    }

    confirmarHoras() {
        const h = document.getElementById('input-horas').value;
        const m = document.getElementById('input-minutos').value;
        const nota = document.getElementById('input-nota-horas').value.trim();

        if (h === '0' && m === '0') {
            alert('Por favor, ingresa al menos 1 hora o 1 minuto.');
            return;
        }

        if (this.currentTicketId) {
            this.model.registrarHoras(this.currentTicketId, h, m, nota);
            this.cerrarModalHoras();
            this.loadTicket(this.currentTicketId); // Recargar para ver el total actualizado
            this.notifyChange(); 
        }
    }

    renderSoluciones(ticket) {
        const lista = document.getElementById('lista-soluciones');
        if (!lista) return;
        if (!ticket.soluciones || ticket.soluciones.length === 0) {
            lista.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:10px;">Aún no hay soluciones documentadas.</p>';
        } else {
            lista.style.textAlign = 'left';
            lista.innerHTML = ticket.soluciones.map(sol => `
                <div style="margin-bottom: 12px; text-align: left;">
                    <div style="font-size: 0.75rem; color: #6B7280; margin-bottom: 4px; text-align: left;"><strong>${this.escapeHTML(sol.autor)}</strong> · ${this.escapeHTML(sol.fecha)}</div>
                    <div style="display: inline-block; background: #fff; border: 1px solid #E5E7EB; border-radius: 8px; padding: 10px; font-size: 0.9rem; color: #374151; white-space: pre-wrap; text-align: left; max-width: 100%;">${this.escapeHTML(sol.texto)}</div>
                </div>
            `).join('');
        }
    }

    renderHistorial() {
        const historial = this.model.getHistoryByTicketId(this.currentTicketId);
        const chat = document.getElementById('dt-chat');
        if (chat) {
            const comentarios = historial.filter(h => h.tipo === 'comentario');
            if (comentarios.length === 0) { chat.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:20px;">Aún no hay comentarios.</p>'; } 
            else {
                chat.innerHTML = comentarios.map(c => `
                    <div style="margin-bottom:12px;">
                        <div style="font-size:.75rem;color:#6B7280;margin-bottom:4px;"><strong>${this.escapeHTML(c.autor)}</strong> · ${this.escapeHTML(c.fecha)}</div>
                        <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:10px;font-size:.9rem;color:#374151;">${this.escapeHTML(c.accion)}</div>
                    </div>
                `).join('');
            }
            chat.scrollTop = chat.scrollHeight;
        }
        const lista = document.getElementById('dt-history-list');
        if (lista) {
            const eventos = historial.filter(h => h.tipo !== 'comentario');
            if (eventos.length === 0) { lista.innerHTML = '<li style="color:#9CA3AF;font-size:.85rem;">Sin eventos registrados.</li>'; } 
            else {
                lista.innerHTML = eventos.map(h => `
                    <li style="margin-bottom:10px; padding-bottom:10px; border-bottom:1px solid #F3F4F6;">
                        <strong style="color:#374151;">${this.escapeHTML(h.accion)}</strong><br>
                        <span style="color:#9CA3AF;font-size:.8rem;">${this.escapeHTML(h.autor)}, ${this.escapeHTML(h.fecha)}</span>
                    </li>
                `).join('');
            }
        }
    }

    enviarComentario() {
        if (!this.currentTicketId) return;
        const input = document.getElementById('dt-comment-input');
        const text = input ? input.value.trim() : '';
        if (!text) return;
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') { alert('El ticket está cerrado.'); return; }
        this.model.addComment(this.currentTicketId, text);
        input.value = '';
        this.renderHistorial();
        this.notifyChange();
    }

    guardarSolucion() {
        if (!this.currentTicketId) return;
        const inputSolucion = document.getElementById('dt-solucion-input');
        if (!inputSolucion) return;
        const text = inputSolucion.value.trim();
        if (!text) { alert('Escribe una solución.'); return; }
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') { alert('El ticket está cerrado.'); return; }
        this.model.guardarSolucion(this.currentTicketId, text);
        inputSolucion.value = '';
        this.loadTicket(this.currentTicketId);
        this.notifyChange();
    }

    cerrarTicket() {
        if (!this.currentTicketId) return;
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') return;
        if (!confirm('¿Cerrar este ticket? Todo pasará a solo lectura.')) return;
        this.model.updateStatus(this.currentTicketId, 'Resuelto');
        this.loadTicket(this.currentTicketId); 
        this.notifyChange();
    }
}