export class TicketModel {
    constructor() {
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
                fechaCompromiso: "2026-10-23"
            }
        ];
        this.historial = {
            "TK-2048": [{ autor: "Laura Méndez", accion: "Ticket creado", fecha: "Ayer, 17:05", tipo: "sistema" }]
        };
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

    // Un día hábil después
    date.setDate(date.getDate() + 1);

    const dayOfWeek = date.getDay();

    // Si cae sábado, pasar al lunes
    if (dayOfWeek === 6) {
        date.setDate(date.getDate() + 2);
    }
    // Si cae domingo, pasar al lunes
    else if (dayOfWeek === 0) {
        date.setDate(date.getDate() + 1);
    }

    // Formato local YYYY-MM-DD sin conversión UTC
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
}

    createTicket(title, category, priority, description, archivos, extraData) {
        const lastTicket = this.tickets[0];
        const lastId = lastTicket ? parseInt(lastTicket.id.split('-')[1]) : 2048;
        const newId = "TK-" + (lastId + 1);

        const now = new Date();
        const formattedDate = "Hoy, " + now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const fechaCompromiso = this.calcularFechaCompromiso();

        const newTicket = {
            id: newId,
            title,
            status: "Abierto",
            priority,
            category,
            solicitante: "Laura Méndez",
            empresa: "Grupo Atlas",
            date: formattedDate,
            description,
            archivos: archivos || [],
            tipoTicket: extraData.tipoTicket,
            pais: extraData.pais,
            modulo: extraData.modulo,
            sistema: extraData.sistema,
            ambiente: extraData.ambiente,
            contexto: extraData.contexto,
            medioRecepcion: extraData.medioRecepcion,
            enlaceExterno: extraData.enlaceExterno,
            fechaCompromiso
        };

        this.tickets.unshift(newTicket);
        this.historial[newId] = [{
            autor: "Laura Méndez",
            accion: "Ticket creado",
            fecha: formattedDate,
            tipo: "sistema"
        }];
        return newTicket;
    }

    addComment(ticketId, commentText) {
        const formattedDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
            new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        this.historial[ticketId].push({
            autor: "Laura Méndez",
            accion: commentText,
            fecha: formattedDate,
            tipo: "comentario"
        });
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
        autor: "Laura Méndez",
        accion: `Estado cambiado: ${oldStatus} → ${newStatus}`,
        fecha: formattedDate,
        tipo: "sistema"
    });
    return ticket;
}

    // ✅ NUEVO MÉTODO: Para guardar la documentación de la solución
    addSolution(ticketId, solutionText) {
        const formattedDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
            new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        
        this.historial[ticketId].push({
            autor: "Laura Méndez", // Aquí podrías usar el usuario logueado
            accion: solutionText,
            fecha: formattedDate,
            tipo: "solucion" // ✅ Tipo especial para diferenciarlo de los comentarios de chat
        });
        
        return this.historial[ticketId];
    }

    // ✅ NUEVO MÉTODO: Para obtener solo las soluciones
    getSolutionsByTicketId(ticketId) {
        const historial = this.getHistoryByTicketId(ticketId);
        return historial.filter(h => h.tipo === 'solucion');
    }


        // ✅ NUEVO: Guardar una solución documentada
    addSolution(ticketId, solutionText) {
        const now = new Date();
        const formattedDate = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' +
            now.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        
        this.historial[ticketId].push({
            autor: "Laura Méndez",
            accion: solutionText,
            fecha: formattedDate,
            tipo: "solucion"
        });
        
        return this.historial[ticketId];
    }

    // ✅ NUEVO: Obtener solo las soluciones de un ticket
    getSolutionsByTicketId(ticketId) {
        const historial = this.getHistoryByTicketId(ticketId);
        return historial.filter(h => h.tipo === 'solucion');
    }
}