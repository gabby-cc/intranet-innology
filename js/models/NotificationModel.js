export class NotificationModel {
    constructor() {
        this.notifications = [
            // Ejemplo inicial
            {
                id: 1,
                titulo: "Ticket TK-2048 actualizado",
                mensaje: "El estado cambió a En espera",
                destinatario: "Laura Méndez",
                tipo: "ticket",
                fecha: "Hace 5 min",
                targetView: "view-tickets",
                targetId: "TK-2048",
                leida: false // ✅ Nueva propiedad
            }
        ];
    }

    getAll() {
        return this.notifications;
    }

    // Solo devuelve las NO leídas del usuario
    getByUser(userName, userRole) {
        if (userRole === 'Administrador') {
            return this.notifications.filter(n => !n.leida);
        }
        return this.notifications.filter(n => n.destinatario === userName && !n.leida);
    }

    create(notificationData) {
        const newNotif = {
            id: Date.now(),
            ...notificationData,
            fecha: 'Hace un momento',
            leida: false // ✅ Nueva notificación no leída
        };
        this.notifications.push(newNotif);
        return newNotif;
    }

    // ✅ Nuevo método para marcar como leída
    markAsRead(id) {
        const notif = this.notifications.find(n => n.id === parseInt(id));
        if (notif) {
            notif.leida = true;
            return true;
        }
        return false;
    }
}