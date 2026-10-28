export class TicketModel {
    constructor() {
        this.tickets = [
            { id: "TK-2048", title: "No puedo conectarme al portal desde mi equipo", status: "En atención", priority: "Alta", category: "Accesos", solicitante: "Laura Méndez", empresa: "Grupo Atlas", date: "Hoy, 10:42", description: "Desde ayer el portal marca error.", archivos: [] }
        ];
        this.historial = {
            "TK-2048": [{ autor: "Laura Méndez", accion: "Ticket creado", fecha: "Ayer, 17:05", tipo: "sistema" }]
        };
    }
    getAllTickets() { return this.tickets; }
    getTicketById(id) { return this.tickets.find(t => t.id === id); }
    getHistoryByTicketId(id) { return this.historial[id] || []; }
    filterTickets(text, status, priority) {
        const searchTerm = text.toLowerCase();
        return this.tickets.filter(ticket => {
            const matchText = ticket.title.toLowerCase().includes(searchTerm) || ticket.id.toLowerCase().includes(searchTerm);
            const matchStatus = (status === 'todos' || ticket.status === status);
            const matchPriority = (priority === 'todas' || ticket.priority === priority);
            return matchText && matchStatus && matchPriority;
        });
    }
    createTicket(title, category, priority, description, archivos) {
        const newId = "TK-" + (Math.floor(Math.random() * 9000) + 1000);
        const formattedDate = "Hoy, " + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        const newTicket = { id: newId, title, status: "En espera", priority, category, solicitante: "Laura Méndez", empresa: "Grupo Atlas", date: formattedDate, description, archivos };
        this.tickets.unshift(newTicket);
        this.historial[newId] = [{ autor: "Laura Méndez", accion: "Ticket creado", fecha: formattedDate, tipo: "sistema" }];
        return newTicket;
    }
    addComment(ticketId, commentText) {
        const formattedDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if(this.historial[ticketId]) this.historial[ticketId].push({ autor: "Laura Méndez", accion: commentText, fecha: formattedDate, tipo: "comentario" });
    }
}