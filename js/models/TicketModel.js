export class TicketModel {
    constructor() {
        // ✅ Intentamos cargar los tickets de sessionStorage
        const ticketsGuardados = sessionStorage.getItem('innology_tickets');
        
        if (ticketsGuardados) {
            this.tickets = JSON.parse(ticketsGuardados);
            this.historial = JSON.parse(sessionStorage.getItem('innology_historial')) || {};
        } else {
            // Si no hay nada, usamos los datos por defecto
            this.tickets = [
                {
                    id: "TK-2048",
                    title: "No puedo conectarme al portal desde mi equipo",
                    status: "Abierto",
                    priority: "Alta",
                    category: "Accesos",
                    solicitante: "Laura Méndez",
                    empresa: "Grupo Atlas",
                    date: "Hoy, 10:42",
                    description: "Desde ayer el portal marca error.",
                    archivos: [],
                    tipoTicket: "Técnico",
                    pais: "México",
                    sistema: "Portal Web",
                    ambiente: "Producción",
                    contexto: "Error de autenticación",
                    medioRecepcion: "Correo",
                    enlaceExterno: "",
                    fechaCompromiso: "2026-10-23",
                    responsable: "Sin asignar"
                }
            ];
            this.historial = {
                "TK-2048": [{ autor: "Laura Méndez", accion: "Ticket creado", fecha: "Ayer, 17:05", tipo: "sistema" }]
            };
            this.guardarEnSessionStorage();
        }
    }

    // ✅ Método para guardar el estado actual en sessionStorage
    guardarEnSessionStorage() {
        sessionStorage.setItem('innology_tickets', JSON.stringify(this.tickets));
        sessionStorage.setItem('innology_historial', JSON.stringify(this.historial));
    }

    getAllTickets() { return this.tickets; }
    getTicketById(id) { return this.tickets.find(t => t.id === id); }
    getHistoryByTicketId(id) { return this.historial[id] || []; }

    filterTickets(text = '', status = 'todos', priority = 'todas') {
        const searchTerm = text.toLowerCase().trim();

        return this.tickets.filter(ticket => {
            const matchText =
                ticket.title.toLowerCase().includes(searchTerm) ||
                ticket.id.toLowerCase().includes(searchTerm);

            const matchStatus =
                !status || status === 'todos' || ticket.status === status;

            const matchPriority =
                !priority || priority === 'todas' || ticket.priority === priority;

            return matchText && matchStatus && matchPriority;
        });
    }

    countActiveTickets() {
        return this.tickets.filter(t => t.status !== 'Resuelto').length;
    }

    countCriticosSinResolver() {
        return this.tickets.filter(t => t.priority === 'Alta' && t.status !== 'Resuelto').length;
    }

    countByStatus(status) {
        return this.tickets.filter(t => t.status === status).length;
    }

    calcularFechaCompromiso() {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 6) date.setDate(date.getDate() + 2);
        else if (dayOfWeek === 0) date.setDate(date.getDate() + 1);
        const year = date.getFullYear();
        const month = String(date.getMonth() + 1).padStart(2, '0');
        const day = String(date.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    createTicket(title, category, priority, description, archivos, extraData) {
        const newTicket = {
            id: `TK-${Math.floor(Math.random() * 9000) + 1000}`,
            title: title,
            category: category,
            priority: priority,
            status: 'Abierto',
            description: description,
            archivos: archivos || [],
            date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }),
            solicitante: extraData.solicitante || 'Laura Méndez',
            empresa: extraData.empresa || 'Grupo Atlas',
            responsable: 'Sin asignar',
            ...extraData
        };

        this.tickets.push(newTicket);
        this.guardarEnSessionStorage(); // ✅ Guardamos
        return newTicket;
    }

    addComment(ticketId, commentText, autor = 'Laura Méndez') {
        const formattedDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
            new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        this.historial[ticketId].push({
            autor: autor,
            accion: commentText,
            fecha: formattedDate,
            tipo: "comentario"
        });
        this.guardarEnSessionStorage();
    }

    guardarSolucion(ticketId, solucionTexto, autor = 'Laura Méndez') {
        const ticket = this.getTicketById(ticketId);
        if (ticket) {
            if (!ticket.soluciones) ticket.soluciones = [];
            ticket.soluciones.push({
                texto: solucionTexto,
                autor: autor,
                fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
            });

            if (!this.historial[ticketId]) this.historial[ticketId] = [];
            this.historial[ticketId].push({
                autor: autor,
                accion: 'Solución documentada',
                fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                tipo: 'sistema'
            });
            this.guardarEnSessionStorage();
            return true;
        }
        return false;
    }

    asignarResponsable(ticketId, nuevoConsultor) {
        const ticket = this.getTicketById(ticketId);
        if (ticket) {
            const anterior = ticket.responsable && ticket.responsable !== 'Sin asignar' ? ticket.responsable : null;
            ticket.responsable = nuevoConsultor;

            if (!this.historial[ticketId]) this.historial[ticketId] = [];
            
            let accionHistorial = '';
            if (anterior && anterior !== nuevoConsultor) {
                accionHistorial = `Reasignado de ${anterior} a ${nuevoConsultor}`;
            } else if (!anterior) {
                accionHistorial = `Ticket asignado a ${nuevoConsultor}`;
            } else {
                this.guardarEnSessionStorage();
                return true; 
            }

            this.historial[ticketId].push({
                autor: 'Sistema',
                accion: accionHistorial,
                fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                tipo: 'sistema'
            });
            this.guardarEnSessionStorage();
            return true;
        }
        return false;
    }

    updateStatus(ticketId, newStatus) {
        const ticket = this.getTicketById(ticketId);
        if (!ticket) return null;
        const oldStatus = ticket.status;
        ticket.status = newStatus;
        const now = new Date();
        const formattedDate = "Hoy, " + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        this.historial[ticketId].push({
            autor: "Sistema",
            accion: `Estado cambiado: ${oldStatus} → ${newStatus}`,
            fecha: formattedDate,
            tipo: "sistema"
        });
        this.guardarEnSessionStorage();
        return ticket;
    }

// ✅ DESPUÉS: sin registro en el historial
registrarHoras(ticketId, horas, minutos, nota, autor = 'Consultor') {
    const ticket = this.getTicketById(ticketId);
    if (!ticket) return false;

    if (!ticket.registrosHoras) ticket.registrosHoras = [];

    ticket.registrosHoras.push({
        autor: autor,
        horas: parseInt(horas) || 0,
        minutos: parseInt(minutos) || 0,
        nota: nota || '',
        fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' })
    });

    // Recalcular total general
    let totalMinutos = 0;
    ticket.registrosHoras.forEach(r => {
        totalMinutos += (r.horas * 60) + r.minutos;
    });
    const h = Math.floor(totalMinutos / 60);
    const m = totalMinutos % 60;
    ticket.horasNum = { h: h, m: m };
    ticket.horas = `${h}h ${m}m`;

    // ✅ Guardar en historial con tipo 'horas'
    if (!this.historial[ticketId]) this.historial[ticketId] = [];
    const textoNota = nota ? ` - ${nota}` : '';
    this.historial[ticketId].push({
        autor: autor,
        accion: `Registró ${horas}h ${minutos}m${textoNota}`,
        fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
        tipo: 'horas'  // 👈 clave para el filtro
    });

    this.guardarEnSessionStorage();
    return true;
}

    // ✅ NUEVO: Desglose de horas por consultor (para colaboración)
    horasPorConsultor(ticketId) {
        const ticket = this.getTicketById(ticketId);
        if (!ticket || !ticket.registrosHoras) return {};

        const desglose = {};
        ticket.registrosHoras.forEach(r => {
            if (!desglose[r.autor]) desglose[r.autor] = { minutos: 0, registros: [] };
            desglose[r.autor].minutos += (r.horas * 60) + r.minutos;
            desglose[r.autor].registros.push(r);
        });

        // Formatear totales
        Object.keys(desglose).forEach(autor => {
            const totalMin = desglose[autor].minutos;
            desglose[autor].total = `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
        });

        return desglose;
    }
}