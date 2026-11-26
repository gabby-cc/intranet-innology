import { NotificationModel } from '../models/NotificationModel.js';
import { TicketModel } from '../models/TicketModel.js';

export class NotificationController {
    constructor() {
        this.model = new NotificationModel();
        const user = JSON.parse(sessionStorage.getItem('innology_user'));
        this.currentUser = user ? user.nombre : 'Laura Méndez'; 
        this.currentRole = user ? user.rol : 'Cliente';
        
        this.container = document.getElementById('notifications-dropdown');
        this.list = this.container ? this.container.querySelector('.notif-list') : null;
        
        this.init();
    }

    // ✅ NUEVO: ¿existe todavía el ticket al que apunta una notificación?
    // Solo se usa cuando los tickets ya viven en localStorage (así todas las pestañas ven los mismos).
    ticketExiste(ticketId) {
        try {
            return !!new TicketModel().getTicketById(ticketId);
        } catch (error) {
            return true; // ante la duda, no borramos nada
        }
    }

    // ✅ NUEVO: ¿esta notificación apunta a un ticket que ya no existe?
    esNotificacionHuerfana(notif) {
        if (!localStorage.getItem('innology_tickets')) return false;   // protección: si no hay tickets guardados, no limpiar
        if (!notif || notif.targetView !== 'view-tickets') return false;
        if (!notif.targetId || !String(notif.targetId).startsWith('TK-')) return false;
        return !this.ticketExiste(notif.targetId);
    }

    // ✅ NUEVO: borra las notificaciones de tickets que ya no existen (las "viejas" que quedaban trabadas)
    limpiarNotificacionesHuerfanas() {
        try {
            const mias = this.model.getByUser(this.currentUser, this.currentRole) || [];
            mias.forEach(n => {
                if (this.esNotificacionHuerfana(n)) {
                    this.model.deleteById(String(n.id));
                }
            });
            this.model = new NotificationModel();
        } catch (error) {
            console.warn('⚠️ No se pudieron limpiar las notificaciones antiguas:', error);
        }
    }

    init() {
        if (!this.list) return;
        
        this.limpiarNotificacionesHuerfanas();
        this.render();
        
        window.notify = (data) => {
            this.model.create(data);
            this.render();
        };

        window.addEventListener('storage', (e) => {
            if (e.key === 'innology_notificaciones') {
                this.model = new NotificationModel();
                this.render();
            }
        });

        document.addEventListener('notificacionCreada', () => {
            this.model = new NotificationModel();
            this.render();
        });

        document.addEventListener('notificacionBorrada', () => {
            this.model = new NotificationModel();
            this.render();
        });

        // ✅ MANEJO DEL CLIC EN LA NOTIFICACIÓN
        this.list.addEventListener('click', (e) => {
            const item = e.target.closest('.notif-item');
            if (item) {
                const targetView = item.getAttribute('data-target');
                const targetTicketId = item.getAttribute('data-ticket');
                const notifId = item.getAttribute('data-id');

                // 1. Ocultamos el menú y borramos el modelo
                this.container.classList.remove('active');

                // ✅ CAMBIO: protegido. Si el borrado fallara, igual seguimos con lo demás.
                try {
                    this.model.deleteById(notifId);
                } catch (error) {
                    console.error('⚠️ No se pudo borrar la notificación:', error);
                }
                
                // 2. Actualizamos la lista en pantalla (esto borra el nodo visual)
                this.render();

                // 3. Si la lista quedó vacía, apagamos el punto rojo
                if (this.list.children.length === 0) {
                    const dot = document.querySelector('.notification-dot');
                    if (dot) dot.style.display = 'none';
                }

                // ✅ CAMBIO: si apunta a un ticket que ya no existe, avisamos con claridad y no intentamos abrirlo
                if (targetView === 'view-tickets' && targetTicketId && this.esNotificacionHuerfana({ targetView, targetId: targetTicketId })) {
                    alert(`El ticket ${targetTicketId} ya no existe. La notificación se eliminó.`);
                    return;
                }

                // 4. Redirección: esperamos un poquito más para que el borrado se procese
                if (targetView && targetView.trim() !== '') {
                    setTimeout(() => {
                        if (typeof window.switchView === 'function') {
                            window.switchView(targetView);
                            
                            if (targetView === 'view-tickets' && targetTicketId && window.ticketDetailController) {
                                setTimeout(() => {
                                    window.ticketDetailController.openTicket(targetTicketId);
                                }, 150);
                            }
                        }
                    }, 200); // Aumentado a 200ms para dar tiempo al DOM
                }
            }
        });
    }

    render() {
        if (!this.list) return;
        
        this.list.innerHTML = '';
        
        const userNotifs = this.model.getByUser(this.currentUser, this.currentRole);
        const dot = document.querySelector('.notification-dot');

        if (userNotifs.length === 0) {
            this.list.innerHTML = '<div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 0.9rem;">No tienes notificaciones nuevas.</div>';
            if (dot) dot.style.display = 'none';
            return;
        }

        if (dot) dot.style.display = 'block';

        userNotifs.forEach(notif => {
            const div = document.createElement('div');
            div.className = 'notif-item';
            div.setAttribute('data-id', notif.id); 
            div.setAttribute('data-target', notif.targetView || '');
            div.setAttribute('data-ticket', notif.targetId || '');
            
            let iconClass = 'system';
            let iconText = 'SYS';
            if (notif.tipo === 'ticket') { iconClass = 'ticket'; iconText = 'TK'; }
            if (notif.tipo === 'usuario') { iconClass = 'doc'; iconText = 'USR'; }
            if (notif.tipo === 'documento') { iconClass = 'doc'; iconText = 'DOC'; }
            if (notif.tipo === 'reunion') { iconClass = 'system'; iconText = 'CAL'; }

            div.innerHTML = `
                <div class="notif-icon ${iconClass}">${iconText}</div>
                <div class="notif-text">
                    <strong>${notif.titulo}</strong>
                    <span>${notif.mensaje}</span>
                    <span style="font-size: 0.7rem; color: #9CA3AF; margin-top: 2px;">${notif.fecha}</span>
                </div>
            `;
            this.list.appendChild(div);
        });
    }

}