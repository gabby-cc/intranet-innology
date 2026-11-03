import { TicketModel } from '../models/TicketModel.js';

export class TicketDetailController {
    constructor(model) {
        this.model = model || new TicketModel();
        this.currentTicketId = null;
        this.init();
    }

    escapeHTML(text) {
        return String(text ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
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
        document.dispatchEvent(new CustomEvent('ticketUpdated', {
            detail: { id: this.currentTicketId }
        }));
    }

    init() {
        // Botón Volver
        const btnVolver = document.getElementById('btn-volver-tickets');
        if (btnVolver) {
            btnVolver.addEventListener('click', () => this.goTo('view-tickets'));
        }

        // ✅ Botón Enviar comentario
        const btnEnviar = document.getElementById('dt-btn-enviar');
        if (btnEnviar) {
            btnEnviar.addEventListener('click', () => this.enviarComentario());
        }

        // ✅ Enter + Ctrl/Cmd para enviar
        const input = document.getElementById('dt-comment-input');
        if (input) {
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter' && (e.ctrlKey || e.metaKey)) {
                    e.preventDefault();
                    this.enviarComentario();
                }
            });
        }

        // Botón Escalar
        const btnEscalar = document.getElementById('btn-escalar-ticket');
        if (btnEscalar) {
            btnEscalar.addEventListener('click', () => this.escalarTicket());
        }

        // Botón Cerrar Ticket
        const btnCerrar = document.getElementById('btn-cerrar-ticket');
        if (btnCerrar) {
            btnCerrar.addEventListener('click', () => this.cerrarTicket());
        }
    }

    /**
     * ✅ NUEVO: Método que se llama cuando quieres abrir el detalle de un ticket
     */
    openTicket(ticketId) {
        console.log('📄 Abriendo ticket:', ticketId);
        this.loadTicket(ticketId);
        this.goTo('view-detalle-ticket');
        
        // Actualizar el menú lateral
        document.querySelectorAll('.menu-item').forEach(m => m.classList.remove('active'));
        const menuItem = document.querySelector('.menu-item[data-target="view-tickets"]');
        if (menuItem) menuItem.classList.add('active');
    }

    loadTicket(ticketId) {
        const ticket = this.model.getTicketById(ticketId);
        if (!ticket) {
            console.warn('⚠️ Ticket no encontrado:', ticketId);
            return;
        }
        this.currentTicketId = ticketId;

        this.setText('dt-folio', ticket.id);
        this.setText('dt-title', ticket.title);

        const statusClass = ticket.status === 'En atención' ? 'atencion'
                          : ticket.status === 'En espera' ? 'espera'
                          : ticket.status === 'Resuelto' ? 'resuelto'
                          : 'abierto';
        const priorityClass = ticket.priority === 'Alta' ? 'alta'
                            : ticket.priority === 'Media' ? 'media' : 'baja';

        const statusEl = document.getElementById('dt-status');
        if (statusEl) {
            statusEl.textContent = ticket.status;
            statusEl.className = 'badge-status ' + statusClass;
            statusEl.removeAttribute('style');
        }
        const priorityEl = document.getElementById('dt-priority');
        if (priorityEl) {
            priorityEl.textContent = ticket.priority;
            priorityEl.className = 'badge-priority ' + priorityClass;
            priorityEl.removeAttribute('style');
        }

        this.setText('dt-description', ticket.description || '-');
        this.setText('dt-solicitante', ticket.solicitante || '-');
        this.setText('dt-medio', ticket.medioRecepcion || 'Portal');
        this.setText('dt-tipo', ticket.tipoTicket || '-');
        this.setText('dt-pais', ticket.pais || '-');

        const esFuncional = ticket.tipoTicket === 'Funcional';
        const show = (id, visible) => {
            const el = document.getElementById(id);
            if (el) el.style.display = visible ? 'block' : 'none';
        };
        show('dt-row-modulo', esFuncional);
        show('dt-row-sistema', !esFuncional);
        show('dt-row-ambiente', !esFuncional);
        this.setText('dt-modulo', ticket.modulo || '-');
        this.setText('dt-sistema', ticket.sistema || '-');
        this.setText('dt-ambiente', ticket.ambiente || '-');

        this.setText('dt-responsable', ticket.responsable || 'Sin asignar');
        this.setText('dt-perfil', ticket.perfil || '-');

        this.setText('dt-fecha-creacion', ticket.date || '-');
        this.setText('dt-fecha-compromiso', ticket.fechaCompromiso || '-');
        this.setText('dt-plazo', '1 día hábil');
        this.setText('dt-total-horas', ticket.horas || '0h 0m');

        // ✅ Deshabilitar botón de cerrar si ya está resuelto
        const btnCerrar = document.getElementById('btn-cerrar-ticket');
        if (btnCerrar) {
            const cerrado = ticket.status === 'Resuelto';
            btnCerrar.disabled = cerrado;
            btnCerrar.style.opacity = cerrado ? '0.5' : '1';
            btnCerrar.style.cursor = cerrado ? 'not-allowed' : 'pointer';
        }

        // ✅ Deshabilitar el chat si el ticket está cerrado
        const chatInput = document.getElementById('dt-comment-input');
        const btnEnviar = document.getElementById('dt-btn-enviar');
        if (ticket.status === 'Resuelto') {
            if (chatInput) {
                chatInput.disabled = true;
                chatInput.placeholder = 'Este ticket está cerrado. No se pueden enviar más mensajes.';
                chatInput.style.background = '#F3F4F6';
                chatInput.style.cursor = 'not-allowed';
            }
            if (btnEnviar) {
                btnEnviar.disabled = true;
                btnEnviar.style.opacity = '0.5';
                btnEnviar.style.cursor = 'not-allowed';
            }
        } else {
            if (chatInput) {
                chatInput.disabled = false;
                chatInput.placeholder = 'Escribe un comentario o actualización...';
                chatInput.style.background = '#fff';
                chatInput.style.cursor = 'text';
            }
            if (btnEnviar) {
                btnEnviar.disabled = false;
                btnEnviar.style.opacity = '1';
                btnEnviar.style.cursor = 'pointer';
            }
        }

        this.renderHistorial();
    }

    renderHistorial() {
        const historial = this.model.getHistoryByTicketId(this.currentTicketId);

        // ✅ Renderizar el CHAT (solo comentarios)
        const chat = document.getElementById('dt-chat');
        if (chat) {
            const comentarios = historial.filter(h => h.tipo === 'comentario');
            if (comentarios.length === 0) {
                chat.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:20px;">Aún no hay comentarios. Sé el primero en escribir.</p>';
            } else {
                chat.innerHTML = comentarios.map(c => `
                    <div style="margin-bottom:12px;">
                        <div style="font-size:.75rem;color:#6B7280;margin-bottom:4px;">
                            <strong>${this.escapeHTML(c.autor)}</strong> · ${this.escapeHTML(c.fecha)}
                        </div>
                        <div style="background:#fff;border:1px solid #E5E7EB;border-radius:8px;padding:10px;font-size:.9rem;color:#374151;">
                            ${this.escapeHTML(c.accion)}
                        </div>
                    </div>
                `).join('');
            }
            chat.scrollTop = chat.scrollHeight;
        }

        // ✅ Renderizar el HISTORIAL (eventos del sistema)
        const lista = document.getElementById('dt-history-list');
        if (lista) {
            const eventos = historial.filter(h => h.tipo !== 'comentario');
            if (eventos.length === 0) {
                lista.innerHTML = '<li style="color:#9CA3AF;font-size:.85rem;">Sin eventos registrados.</li>';
            } else {
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
        if (!this.currentTicketId) {
            alert('No hay un ticket seleccionado.');
            return;
        }
        
        const input = document.getElementById('dt-comment-input');
        const text = input ? input.value.trim() : '';
        if (!text) return;

        // ✅ Verificar que el ticket no esté cerrado
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') {
            alert('El ticket está cerrado; ya no se pueden agregar comentarios.');
            return;
        }

        // Guardar en el modelo
        this.model.addComment(this.currentTicketId, text);
        
        // Limpiar input
        input.value = '';
        
        // Re-renderizar el chat
        this.renderHistorial();
        
        // Notificar cambio (para que otras partes de la app se enteren)
        this.notifyChange();
    }

    escalarTicket() {
        if (!this.currentTicketId) return;
        if (!confirm('¿Escalar este ticket?')) return;

        if (!this.model.historial[this.currentTicketId]) {
            this.model.historial[this.currentTicketId] = [];
        }
        this.model.historial[this.currentTicketId].push({
            autor: 'Laura Méndez',
            accion: 'Ticket escalado',
            fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'sistema'
        });
        this.renderHistorial();
        this.notifyChange();
    }

    cerrarTicket() {
        if (!this.currentTicketId) return;
        if (!confirm('¿Cerrar este ticket? También se cerrará el chat asociado. Esta acción no se puede deshacer.')) return;

        this.model.updateStatus(this.currentTicketId, 'Resuelto');
        this.loadTicket(this.currentTicketId); // Recargar para deshabilitar el chat
        this.notifyChange();
    }
}