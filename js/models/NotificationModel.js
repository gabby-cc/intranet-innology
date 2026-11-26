export class NotificationModel {
    constructor() {
        const guardadas = localStorage.getItem('innology_notificaciones');
        this.notifications = guardadas ? JSON.parse(guardadas) : [];
    }

    guardar() {
        localStorage.setItem('innology_notificaciones', JSON.stringify(this.notifications));
    }

    create(data) {
        const newNotif = {
            id: Date.now() + Math.random().toString(36).substring(2, 9),
            titulo: data.titulo,
            mensaje: data.mensaje,
            destinatario: data.destinatario,
            tipo: data.tipo || 'sistema',
            targetView: data.targetView || '',
            targetId: data.targetId || '',
            fecha: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' + 
                   new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
        };

        this.notifications.push(newNotif);
        this.guardar();
        document.dispatchEvent(new CustomEvent('notificacionCreada', { detail: newNotif }));
        return newNotif;
    }

    // ✅ CORREGIDO: El admin recibe las notificaciones dirigidas a "Administrador"
    getByUser(nombreUsuario, rolUsuario) {
        return this.notifications.filter(n => {
            // Si es administrador y la notificación es para "Administrador"
            if (rolUsuario === 'Administrador' && n.destinatario === 'Administrador') return true;
            // Si es para el nombre exacto del usuario
            if (n.destinatario && n.destinatario.trim().toLowerCase() === nombreUsuario.trim().toLowerCase()) return true;
            return false;
        });
    }

    deleteById(id) {
        this.notifications = this.notifications.filter(n => n.id !== id);
        this.guardar();
        document.dispatchEvent(new CustomEvent('notificacionBorrada'));
    }
}