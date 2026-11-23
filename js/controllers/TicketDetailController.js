import { TicketModel } from '../models/TicketModel.js';

import { UserModel } from '../models/UserModel.js';

export class TicketDetailController {
    constructor(model, userRole = 'cliente', currentUser = 'Laura Méndez') {
        this.model = model || new TicketModel();
        this.currentTicketId = null;
        this.currentUser = currentUser;
        this.userRole = userRole;
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

    // ✅ Helper para saber si puede registrar horas
    puedeRegistrarHoras() {
        return this.userRole === 'admin' || this.userRole === 'consultor';
    }

    // ✅ Aplicar permisos según el rol
    aplicarPermisosPorRol() {
        const esAdmin = this.userRole === 'admin';
        const puedeHoras = this.puedeRegistrarHoras();

        // Botones de acción del encabezado (Escalar / Cerrar) → solo admin
        const adminActions = document.getElementById('dt-admin-actions');
        if (adminActions) {
            adminActions.style.display = esAdmin ? 'flex' : 'none';
        }

        // Botón de Reasignar → solo admin
        const btnAsignar = document.getElementById('btn-asignar-consultor');
        if (btnAsignar) {
            btnAsignar.style.display = esAdmin ? 'block' : 'none';
        }

        // Aviso de asignación → cliente y consultor
        const avisoAsignacion = document.getElementById('dt-asignacion-aviso');
        if (avisoAsignacion) {
            avisoAsignacion.style.display = esAdmin ? 'none' : 'block';
        }

        // ✅ Registrar Horas → consultor y admin (visible); cliente oculto
        const btnRegistrarHoras = document.getElementById('btn-registrar-horas');
        if (btnRegistrarHoras) {
            btnRegistrarHoras.style.display = puedeHoras ? 'inline-block' : 'none';
        }

        console.log(`🔐 Permisos aplicados. Rol: ${this.userRole} | Puede registrar horas: ${puedeHoras}`);
    }

    init() {
        // ✅ Aplicar permisos según el rol
        this.aplicarPermisosPorRol();

        const btnVolver = document.getElementById('btn-volver-tickets');
        if (btnVolver) btnVolver.addEventListener('click', () => this.goTo('view-tickets'));

        const btnEnviar = document.getElementById('dt-btn-enviar');
        if (btnEnviar) btnEnviar.addEventListener('click', () => this.enviarComentario());

        const btnGuardarSolucion = document.getElementById('btn-guardar-solucion');
        if (btnGuardarSolucion) btnGuardarSolucion.onclick = () => this.guardarSolucion();

        // ✅ Listeners de ADMIN
        if (this.userRole === 'admin') {
            const btnCerrar = document.getElementById('btn-cerrar-ticket');
            if (btnCerrar) btnCerrar.addEventListener('click', () => this.cerrarTicket());

            const btnEscalar = document.getElementById('btn-escalar-ticket');
            if (btnEscalar) btnEscalar.addEventListener('click', () => this.escalarTicket());

            const btnAsignar = document.getElementById('btn-asignar-consultor');
            if (btnAsignar) btnAsignar.addEventListener('click', () => this.abrirModalAsignacion());
        }

        // ✅ Listener de REGISTRAR HORAS → se engancha SIEMPRE
        // (el método abrirModalHoras valida el rol internamente)
        const btnRegistrarHoras = document.getElementById('btn-registrar-horas');
        if (btnRegistrarHoras) {
            btnRegistrarHoras.addEventListener('click', () => this.abrirModalHoras());
            console.log('✅ Listener de "Registrar Horas" enganchado');
        } else {
            console.warn('⚠️ No se encontró #btn-registrar-horas en el DOM');
        }

        // Botones del Modal de Asignación
        const btnCerrarModalAssign = document.getElementById('btn-cerrar-modal-assign');
        const btnCancelarAssign = document.getElementById('btn-cancelar-assign');
        const btnConfirmarAssign = document.getElementById('btn-confirmar-assign');
        
        if (btnCerrarModalAssign) btnCerrarModalAssign.addEventListener('click', () => this.cerrarModalAsignacion());
        if (btnCancelarAssign) btnCancelarAssign.addEventListener('click', () => this.cerrarModalAsignacion());
        if (btnConfirmarAssign) btnConfirmarAssign.addEventListener('click', () => this.confirmarAsignacion());

        // Botones del Modal de Horas
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

        const estaCerrado = ticket.status === 'Resuelto';
        const esCliente = this.userRole === 'cliente';
        const esAdmin = this.userRole === 'admin';
        const esConsultor = this.userRole === 'consultor';

        // ==========================================
        // ✅ VISIBILIDAD DE HORAS
        // ==========================================
        const puedeVerHoras = !esCliente || estaCerrado;
        const cardHoras = document.getElementById('dt-card-horas');
        if (cardHoras) {
            cardHoras.style.display = puedeVerHoras ? 'block' : 'none';
        }
        
        // ✅ Cámbiala a esto: SOLO el admin puede ver el desglose
        const puedeVerDesglose = (this.userRole === 'admin');
        this.renderDesgloseHoras(ticket, puedeVerDesglose);
            
        // ==========================================
        // ✅ LÓGICA DE BLOQUEO Y EDICIÓN
        // ==========================================
        const btnAsignar = document.getElementById('btn-asignar-consultor');
        const btnCerrar = document.getElementById('btn-cerrar-ticket');
        const btnEscalar = document.getElementById('btn-escalar-ticket');
        const chatInput = document.getElementById('dt-comment-input');
        const btnEnviar = document.getElementById('dt-btn-enviar');
        const inputSolucion = document.getElementById('dt-solucion-input');
        const btnGuardarSolucion = document.getElementById('btn-guardar-solucion');
        const btnRegistrarHoras = document.getElementById('btn-registrar-horas');

        // Chat y Solución: bloqueados si cerrado
        if (estaCerrado) {
            if (chatInput) { chatInput.disabled = true; chatInput.placeholder = 'Ticket cerrado.'; chatInput.style.background = '#F3F4F6'; chatInput.style.cursor = 'not-allowed'; }
            if (btnEnviar) { btnEnviar.disabled = true; btnEnviar.style.opacity = '0.5'; btnEnviar.style.cursor = 'not-allowed'; }
            if (inputSolucion) { inputSolucion.disabled = true; inputSolucion.style.background = '#F3F4F6'; inputSolucion.style.cursor = 'not-allowed'; }
            if (btnGuardarSolucion) { btnGuardarSolucion.disabled = true; btnGuardarSolucion.style.opacity = '0.5'; btnGuardarSolucion.style.cursor = 'not-allowed'; }
        } else {
            if (chatInput) { chatInput.disabled = false; chatInput.placeholder = 'Escribe un comentario...'; chatInput.style.background = '#fff'; chatInput.style.cursor = 'text'; }
            if (btnEnviar) { btnEnviar.disabled = false; btnEnviar.style.opacity = '1'; btnEnviar.style.cursor = 'pointer'; }
            if (inputSolucion) { inputSolucion.disabled = false; inputSolucion.style.background = '#fff'; inputSolucion.style.cursor = 'text'; }
            if (btnGuardarSolucion) { btnGuardarSolucion.disabled = false; btnGuardarSolucion.style.opacity = '1'; btnGuardarSolucion.style.cursor = 'pointer'; }
        }

        // Botones de ADMIN: bloqueados si cerrado
        if (esAdmin) {
            if (btnCerrar) { btnCerrar.disabled = estaCerrado; btnCerrar.style.opacity = estaCerrado ? '0.5' : '1'; btnCerrar.style.cursor = estaCerrado ? 'not-allowed' : 'pointer'; }
            if (btnEscalar) { btnEscalar.disabled = estaCerrado; btnEscalar.style.opacity = estaCerrado ? '0.5' : '1'; btnEscalar.style.cursor = estaCerrado ? 'not-allowed' : 'pointer'; }
            if (btnAsignar) {
                btnAsignar.disabled = estaCerrado;
                btnAsignar.style.opacity = estaCerrado ? '0.5' : '1';
                btnAsignar.style.cursor = estaCerrado ? 'not-allowed' : 'pointer';
                btnAsignar.textContent = (ticket.responsable && ticket.responsable !== 'Sin asignar') ? 'Reasignar' : 'Asignar / Reasignar';
            }
        }

        // ✅ Registrar Horas: consultor y admin (bloqueado si cerrado)
        if (btnRegistrarHoras) {
            if (this.puedeRegistrarHoras()) {
                btnRegistrarHoras.style.display = 'inline-block';
                btnRegistrarHoras.disabled = estaCerrado;
                btnRegistrarHoras.style.opacity = estaCerrado ? '0.5' : '1';
                btnRegistrarHoras.style.cursor = estaCerrado ? 'not-allowed' : 'pointer';
            } else {
                btnRegistrarHoras.style.display = 'none';
            }
        }

        this.renderHistorial();
    }

    renderDesgloseHoras(ticket, visible) {
        const contenedor = document.getElementById('dt-desglose-horas');
        if (!contenedor) return;

        if (!visible) {
            contenedor.style.display = 'none';
            return;
        }
        contenedor.style.display = 'block';

        const desglose = this.model.horasPorConsultor(this.currentTicketId);
        const autores = Object.keys(desglose);

        if (autores.length === 0) {
            contenedor.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:10px;">Sin horas registradas aún.</p>';
            return;
        }

        contenedor.innerHTML = autores.map(autor => {
            const data = desglose[autor];
            // ✅ Solo mostramos el nombre y su total, sin las fechas ni las notas
            return `
                <div style="display:flex;justify-content:space-between;align-items:center; padding: 8px 0; border-bottom: 1px solid #E5E7EB;">
                    <strong style="font-size:.9rem;color:#374151;">${this.escapeHTML(autor)}</strong>
                    <span style="font-size:.85rem;color:#DC2626;font-weight:600;">${data.total}</span>
                </div>
            `;
        }).join('');
    }

abrirModalAsignacion() {
    if (this.userRole !== 'admin') {
        alert('⛔ Solo el administrador puede reasignar tickets.');
        return;
    }
    const ticket = this.model.getTicketById(this.currentTicketId);
    if (ticket && ticket.status === 'Resuelto') return;

    const modal = document.getElementById('assign-modal');
    const select = document.getElementById('select-consultor');
    
    // ✅ NUEVO: Llenar el select solo con consultores activos
    if (select) {
        const userModel = new UserModel();
        const consultoresActivos = userModel.getAllUsers().filter(u => 
            u.rol === 'Consultor' && u.estado === 'Activo'
        );

        select.innerHTML = '<option value="" disabled selected>Selecciona un consultor...</option>';
        
        consultoresActivos.forEach(c => {
            const option = document.createElement('option');
            option.value = c.nombre;
            option.textContent = c.nombre;
            select.appendChild(option);
        });

        // Seleccionar al responsable actual si existe
        if (ticket.responsable && ticket.responsable !== 'Sin asignar') {
            select.value = ticket.responsable;
        }
    }

    if (modal) modal.classList.add('active');
}

    cerrarModalAsignacion() {
        const modal = document.getElementById('assign-modal');
        if (modal) modal.classList.remove('active');
    }

    confirmarAsignacion() {
        if (this.userRole !== 'admin') {
            alert('⛔ Solo el administrador puede reasignar tickets.');
            return;
        }
        const select = document.getElementById('select-consultor');
        const consultor = select ? select.value : '';
        
        if (this.currentTicketId && consultor) {
            this.model.asignarResponsable(this.currentTicketId, consultor);
            this.cerrarModalAsignacion();
            this.loadTicket(this.currentTicketId); 
            this.notifyChange();

            if (window.notify) {
                window.notify({
                    titulo: 'Nuevo Ticket Asignado',
                    mensaje: `Se te ha asignado el ticket ${this.currentTicketId}.`,
                    destinatario: consultor,
                    tipo: 'ticket',
                    targetView: 'view-tickets',
                    targetId: this.currentTicketId
                });
            }
        }
    }

    // ✅ Abrir modal de horas: valida rol (consultor y admin)
    abrirModalHoras() {
        console.log(`🕒 abrirModalHoras() — Rol: ${this.userRole}`);
        if (!this.puedeRegistrarHoras()) {
            alert('⛔ Solo consultores y administradores pueden registrar horas.');
            return;
        }
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') {
            alert('El ticket está cerrado. No se pueden registrar horas.');
            return;
        }

        const inputH = document.getElementById('input-horas');
        const inputM = document.getElementById('input-minutos');
        const inputN = document.getElementById('input-nota-horas');

        if (inputH) inputH.value = '0';
        if (inputM) inputM.value = '0';
        if (inputN) inputN.value = '';
        
        const modal = document.getElementById('hours-modal');
        if (modal) {
            modal.classList.add('active');
            console.log('✅ Modal de horas abierto');
        } else {
            console.warn('⚠️ No se encontró #hours-modal');
        }
    }

    cerrarModalHoras() {
        const modal = document.getElementById('hours-modal');
        if (modal) modal.classList.remove('active');
    }

    confirmarHoras() {
        console.log(`✅ confirmarHoras() — Rol: ${this.userRole}`);
        if (!this.puedeRegistrarHoras()) {
            alert('⛔ Solo consultores y administradores pueden registrar horas.');
            return;
        }
        const h = document.getElementById('input-horas').value;
        const m = document.getElementById('input-minutos').value;
        const nota = document.getElementById('input-nota-horas').value.trim();

        if (h === '0' && m === '0') {
            alert('Por favor, ingresa al menos 1 hora o 1 minuto.');
            return;
        }

        if (this.currentTicketId) {
            const autor = this.currentUser;
            console.log(`📝 Registrando ${h}h ${m}m por ${autor}`);
            this.model.registrarHoras(this.currentTicketId, h, m, nota, autor);
            this.cerrarModalHoras();
            this.loadTicket(this.currentTicketId);
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
        const esAdmin = this.userRole === 'admin';
        // ✅ Admin ve TODO. Consultor y cliente NO ven tipo 'horas'
        const eventos = historial.filter(h => {
            if (h.tipo === 'comentario') return false;
            if (h.tipo === 'horas' && !esAdmin) return false;
            return true;
        });

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
        this.model.addComment(this.currentTicketId, text, this.currentUser);
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
        this.model.guardarSolucion(this.currentTicketId, text, this.currentUser);
        inputSolucion.value = '';
        this.loadTicket(this.currentTicketId);
        this.notifyChange();
    }

    escalarTicket() {
        if (this.userRole !== 'admin') {
            alert('⛔ Solo el administrador puede escalar tickets.');
            return;
        }
        if (!this.currentTicketId) return;
        if (!confirm('¿Escalar este ticket? Las horas del consultor actual se conservarán por separado.')) return;

        const ticket = this.model.getTicketById(this.currentTicketId);
        const responsableAnterior = ticket ? (ticket.responsable || 'Sin asignar') : 'Sin asignar';

        if (!this.model.historial[this.currentTicketId]) {
            this.model.historial[this.currentTicketId] = [];
        }
        this.model.historial[this.currentTicketId].push({
            autor: this.currentUser,
            accion: `Ticket escalado (responsable anterior: ${responsableAnterior}). Horas conservadas.`,
            fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
            tipo: 'sistema'
        });
        this.model.guardarEnSessionStorage();
        this.renderHistorial();
        this.notifyChange();
    }

    cerrarTicket() {
        if (this.userRole !== 'admin') {
            alert('⛔ Solo el administrador puede cerrar tickets.');
            return;
        }
        if (!this.currentTicketId) return;
        const ticket = this.model.getTicketById(this.currentTicketId);
        if (ticket && ticket.status === 'Resuelto') return;
        if (!confirm('¿Cerrar este ticket? Todo pasará a solo lectura.')) return;
        
        this.model.updateStatus(this.currentTicketId, 'Resuelto');
        this.loadTicket(this.currentTicketId); 
        this.notifyChange();

        if (window.notify) {
            window.notify({
                titulo: 'Ticket Cerrado',
                mensaje: `El ticket ${this.currentTicketId} ha sido cerrado.`,
                destinatario: 'Laura Méndez',
                tipo: 'ticket',
                targetView: 'view-tickets',
                targetId: this.currentTicketId
            });
        }
    }
}