import { NotificationModel } from '../models/NotificationModel.js';

export class NotificationController {
    constructor() {
        this.model = new NotificationModel();
        // ✅ Leemos el usuario de sessionStorage
        const user = JSON.parse(sessionStorage.getItem('innology_user'));
        this.currentUser = user ? user.nombre : 'Laura Méndez'; 
        this.currentRole = user ? user.rol : 'Cliente';
        
        this.container = document.getElementById('notifications-dropdown');
        this.list = this.container.querySelector('.notif-list');
        this.dot = document.querySelector('.notification-dot');
        
        this.init();
    }

    init() {
        this.render();
        
        // Función global para crear notificaciones
        window.notify = (data) => {
            this.model.create(data);
            this.render();
            if (this.dot) this.dot.style.display = 'block';
        };

        // ✅ Escuchar clics en la lista de notificaciones
        this.list.addEventListener('click', (e) => {
            const item = e.target.closest('.notif-item');
            if (item) {
                const notifId = item.getAttribute('data-id');
                const targetView = item.getAttribute('data-target');
                const targetTicketId = item.getAttribute('data-ticket');

                // 1. Marcar como leída en el modelo
                this.model.markAsRead(notifId);
                
                // 2. Actualizar la vista (forzando limpieza)
                this.render();
                this.container.classList.remove('active');

                // 3. Redirigir
                if (targetView) {
                    window.switchView(targetView);
                }

                // 4. Si es un ticket, abrir el detalle
                if (targetView === 'view-tickets' && targetTicketId && window.ticketDetailController) {
                    setTimeout(() => {
                        window.ticketDetailController.openTicket(targetTicketId);
                    }, 100);
                }
            }
        });
    }

    render() {
        if (!this.list) return;
        
        // ✅ LIMPIEZA TOTAL: Borra todo el HTML antes de dibujar
        this.list.innerHTML = '';
        
        const userNotifs = this.model.getByUser(this.currentUser, this.currentRole);
        
        if (userNotifs.length === 0) {
            this.list.innerHTML = '<div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 0.9rem;">No tienes notificaciones nuevas.</div>';
            if (this.dot) this.dot.style.display = 'none';
            return;
        }

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