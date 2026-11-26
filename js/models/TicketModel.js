export class TicketModel {
    constructor() {
        this.recargarTicketsDesdeStorage();
    }

    // ✅ NUEVO: Método para forzar la recarga desde el sessionStorage
    recargarTicketsDesdeStorage() {
        const ticketsGuardados = sessionStorage.getItem('innology_tickets');
        if (ticketsGuardados) {
            this.tickets = JSON.parse(ticketsGuardados);
            this.historial = JSON.parse(sessionStorage.getItem('innology_historial')) || {};
            
            let huboCambios = false;
            this.tickets.forEach(t => {
                if (!t.fechaExacta) {
                    let fechaRescatada = new Date();
                    if (t.date && !t.date.toLowerCase().includes('hoy')) {
                        const parseada = new Date(t.date);
                        if (!isNaN(parseada.getTime())) fechaRescatada = parseada;
                    }
                    t.fechaExacta = `${fechaRescatada.getFullYear()}-${String(fechaRescatada.getMonth() + 1).padStart(2, '0')}-${String(fechaRescatada.getDate()).padStart(2, '0')}`;
                    huboCambios = true;
                }
            });
            if (huboCambios) this.guardarEnSessionStorage();
        } else {
            this.tickets = [
                {
                    id: "TK-2048", title: "No puedo conectarme al portal desde mi equipo", status: "Abierto", priority: "Alta", category: "Accesos", solicitante: "Laura Méndez", empresa: "Grupo Atlas", date: "Hoy, 10:42", fechaExacta: "2026-11-18", description: "Desde ayer el portal marca error.", archivos: [], tipoTicket: "Técnico", pais: "México", sistema: "Portal Web", ambiente: "Producción", contexto: "Error de autenticación", medioRecepcion: "Correo", enlaceExterno: "", fechaCompromiso: "2026-10-23", responsable: "Sin asignar"
                }
            ];
            this.historial = { "TK-2048": [{ autor: "Laura Méndez", accion: "Ticket creado", fecha: "Ayer, 17:05", tipo: "sistema" }] };
            this.guardarEnSessionStorage();
        }
    }

    guardarEnSessionStorage() {
        sessionStorage.setItem('innology_tickets', JSON.stringify(this.tickets));
        sessionStorage.setItem('innology_historial', JSON.stringify(this.historial));
    }

    // ✅ MODIFICADO: Ahora fuerza la recarga antes de devolver la lista
    getAllTickets() { 
        this.recargarTicketsDesdeStorage();
        return this.tickets; 
    }
    
    // ✅ CAMBIO IMPORTANTE: antes leía una COPIA nueva del sessionStorage, y por eso los cambios
    // hechos al ticket (asignar, cambiar estado, registrar horas, guardar solución) se aplicaban a
    // esa copia y NUNCA se guardaban. Ahora recarga y devuelve el ticket real de this.tickets,
    // que es el que luego guardarEnSessionStorage() guarda.
    getTicketById(id) { 
        this.recargarTicketsDesdeStorage();
        return this.tickets.find(t => t.id === id); 
    }
    
    getHistoryByTicketId(id) { return this.historial[id] || []; }

    filterTickets(text = '', status = 'todos', priority = 'todas') {
        this.recargarTicketsDesdeStorage();
        const searchTerm = text.toLowerCase().trim();
        return this.tickets.filter(ticket => {
            const matchText = ticket.title.toLowerCase().includes(searchTerm) || ticket.id.toLowerCase().includes(searchTerm);
            const matchStatus = !status || status === 'todos' || ticket.status === status;
            const matchPriority = !priority || priority === 'todas' || ticket.priority === priority;
            return matchText && matchStatus && matchPriority;
        });
    }

    countActiveTickets() {
        this.recargarTicketsDesdeStorage();
        return this.tickets.filter(t => t.status !== 'Resuelto').length;
    }

    countCriticosSinResolver() {
        this.recargarTicketsDesdeStorage();
        return this.tickets.filter(t => t.priority === 'Alta' && t.status !== 'Resuelto').length;
    }

    countByStatus(status) {
        this.recargarTicketsDesdeStorage();
        return this.tickets.filter(t => t.status === status).length;
    }

    calcularFechaCompromiso() {
        const date = new Date();
        date.setDate(date.getDate() + 1);
        const dayOfWeek = date.getDay();
        if (dayOfWeek === 6) date.setDate(date.getDate() + 2);
        else if (dayOfWeek === 0) date.setDate(date.getDate() + 1);
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    }

    createTicket(title, category, priority, description, archivos, extraData) {
        this.recargarTicketsDesdeStorage();
        const hoy = new Date();
        const fechaExacta = `${hoy.getFullYear()}-${String(hoy.getMonth() + 1).padStart(2, '0')}-${String(hoy.getDate()).padStart(2, '0')}`;

        // ✅ CAMBIO: el folio ya no puede repetirse (antes era un número al azar y podía chocar con otro ticket)
        let nuevoId;
        do {
            nuevoId = `TK-${Math.floor(Math.random() * 9000) + 1000}`;
        } while (this.tickets.some(t => t.id === nuevoId));

        const newTicket = {
            id: nuevoId, title, category, priority, status: 'Abierto', description, archivos: archivos || [],
            date: new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' }), fechaExacta,
            solicitante: extraData.solicitante || 'Laura Méndez', empresa: extraData.empresa || 'Grupo Atlas', responsable: 'Sin asignar',
            ...extraData, pais: extraData.pais || 'Global'
        };

        this.tickets.push(newTicket);

        // ✅ CAMBIO: el ticket nuevo nace con su historial inicial
        if (!this.historial[newTicket.id]) {
            this.historial[newTicket.id] = [{
                autor: newTicket.solicitante,
                accion: 'Ticket creado',
                fecha: 'Hoy, ' + hoy.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }),
                tipo: 'sistema'
            }];
        }

        this.guardarEnSessionStorage();
        return newTicket;
    }

    addComment(ticketId, commentText, autor = 'Laura Méndez') {
        this.recargarTicketsDesdeStorage();
        const formattedDate = new Date().toLocaleDateString('es-ES', { day: 'numeric', month: 'short' }) + ', ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' });
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        this.historial[ticketId].push({ autor, accion: commentText, fecha: formattedDate, tipo: "comentario" });
        this.guardarEnSessionStorage();
    }

    guardarSolucion(ticketId, solucionTexto, autor = 'Laura Méndez') {
        this.recargarTicketsDesdeStorage();
        const ticket = this.getTicketById(ticketId);
        if (ticket) {
            if (!ticket.soluciones) ticket.soluciones = [];
            ticket.soluciones.push({ texto: solucionTexto, autor, fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }) });
            if (!this.historial[ticketId]) this.historial[ticketId] = [];
            this.historial[ticketId].push({ autor, accion: 'Solución documentada', fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), tipo: 'sistema' });
            this.guardarEnSessionStorage();
            return true;
        }
        return false;
    }

    asignarResponsable(ticketId, nuevoConsultor) {
        this.recargarTicketsDesdeStorage();
        const ticket = this.getTicketById(ticketId);
        if (ticket) {
            const anterior = ticket.responsable && ticket.responsable !== 'Sin asignar' ? ticket.responsable : null;
            ticket.responsable = nuevoConsultor;
            if (!this.historial[ticketId]) this.historial[ticketId] = [];
            
            let accionHistorial = anterior && anterior !== nuevoConsultor ? `Reasignado de ${anterior} a ${nuevoConsultor}` : (!anterior ? `Ticket asignado a ${nuevoConsultor}` : null);
            if (accionHistorial) {
                this.historial[ticketId].push({ autor: 'Sistema', accion: accionHistorial, fecha: 'Hoy, ' + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), tipo: 'sistema' });
            }
            this.guardarEnSessionStorage();
            return true;
        }
        return false;
    }

    updateStatus(ticketId, newStatus) {
        this.recargarTicketsDesdeStorage();
        const ticket = this.getTicketById(ticketId);
        if (!ticket) return null;
        const oldStatus = ticket.status;
        ticket.status = newStatus;
        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        this.historial[ticketId].push({ autor: "Sistema", accion: `Estado cambiado: ${oldStatus} → ${newStatus}`, fecha: "Hoy, " + new Date().toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), tipo: "sistema" });
        this.guardarEnSessionStorage();
        return ticket;
    }

    registrarHoras(ticketId, horas, minutos, nota, autor = 'Consultor') {
        this.recargarTicketsDesdeStorage();
        const ticket = this.getTicketById(ticketId);
        if (!ticket) return false;
        if (!ticket.registrosHoras) ticket.registrosHoras = [];
        const fechaActual = new Date();
        ticket.registrosHoras.push({ autor, horas: parseInt(horas) || 0, minutos: parseInt(minutos) || 0, nota: nota || '', fecha: 'Hoy, ' + fechaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), fechaISO: fechaActual.toISOString().split('T')[0] });

        let totalMinutos = 0;
        ticket.registrosHoras.forEach(r => { totalMinutos += (r.horas * 60) + r.minutos; });
        ticket.horasNum = { h: Math.floor(totalMinutos / 60), m: totalMinutos % 60 };
        ticket.horas = `${ticket.horasNum.h}h ${ticket.horasNum.m}m`;

        if (!this.historial[ticketId]) this.historial[ticketId] = [];
        const textoNota = nota ? ` - ${nota}` : '';
        this.historial[ticketId].push({ autor, accion: `Registró ${horas}h ${minutos}m${textoNota}`, fecha: 'Hoy, ' + fechaActual.toLocaleTimeString('es-ES', { hour: '2-digit', minute: '2-digit' }), tipo: 'horas' });
        this.guardarEnSessionStorage();
        return true;
    }

    horasPorConsultor(ticketId) {
        this.recargarTicketsDesdeStorage();
        const ticket = this.getTicketById(ticketId);
        if (!ticket || !ticket.registrosHoras) return {};
        const desglose = {};
        ticket.registrosHoras.forEach(r => {
            if (!desglose[r.autor]) desglose[r.autor] = { minutos: 0, registros: [] };
            desglose[r.autor].minutos += (r.horas * 60) + r.minutos;
            desglose[r.autor].registros.push(r);
        });
        Object.keys(desglose).forEach(autor => {
            const totalMin = desglose[autor].minutos;
            desglose[autor].total = `${Math.floor(totalMin / 60)}h ${totalMin % 60}m`;
        });
        return desglose;
    }
}