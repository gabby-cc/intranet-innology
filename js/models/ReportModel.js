import { TicketModel } from './TicketModel.js';

export class ReportModel {
    constructor() {
        this.ticketModel = new TicketModel();
        this.storageKey = 'innology_reportes_generados';
    }

    obtenerDatosReporte(filtros = {}) {
        let ticketsActuales = this.ticketModel.getAllTickets();
        
        // 1. Filtrar por empresa
        if (filtros.empresa && filtros.empresa !== '') {
            ticketsActuales = ticketsActuales.filter(t => 
                t.empresa && t.empresa.toLowerCase() === filtros.empresa.toLowerCase()
            );
        }

        // 2. Filtrar por fechas
        if (filtros.fechaInicio && filtros.fechaFin) {
            const start = new Date(filtros.fechaInicio + 'T00:00:00');
            const end = new Date(filtros.fechaFin + 'T23:59:59');

            ticketsActuales = ticketsActuales.filter(t => {
                const fechaStr = t.fechaExacta || t.date; 
                if (!fechaStr) return false;

                if (fechaStr.toLowerCase().includes('hoy')) {
                    const hoy = new Date();
                    return hoy >= start && hoy <= end;
                }

                const fechaTicket = new Date(fechaStr);
                
                if (!isNaN(fechaTicket.getTime())) {
                    return fechaTicket >= start && fechaTicket <= end;
                }
                return false;
            });
        }

        return ticketsActuales.map(ticket => {
            const eventos = this.ticketModel.getHistoryByTicketId(ticket.id) || [];
            const ultimoEvento = eventos.length > 0 ? eventos[eventos.length - 1].fecha : 'N/A';

            // Convertir "2h 30m" a decimal si es necesario
            let horasDecimal = 0;
            if (ticket.horas && typeof ticket.horas === 'string') {
                const matchHoras = ticket.horas.match(/(\d+)h/);
                const matchMinutos = ticket.horas.match(/(\d+)m/);
                if (matchHoras) horasDecimal += parseInt(matchHoras[1]);
                if (matchMinutos) horasDecimal += (parseInt(matchMinutos[1]) / 60);
            } else if (typeof ticket.horas === 'number') {
                horasDecimal = ticket.horas;
            }

            return {
                fechaInicio: ticket.fechaExacta || ticket.date || 'N/A',
                fechaFin: ultimoEvento,
                ticket: ticket.id,
                usuario: ticket.solicitante,
                medio: ticket.medioRecepcion || 'Portal',
                clasificacion: ticket.title,
                prioridad: ticket.priority,
                estatus: ticket.status,
                horas: horasDecimal, // ✅ Enviamos el número decimal
                consultor: ticket.responsable || 'Sin asignar',
                tipo: ticket.tipoTicket,
                pais: ticket.pais,
                empresa: ticket.empresa || 'Sin Empresa'
            };
        });
    }

    guardarReporte(reporte) {
        const reportes = this.obtenerHistorialReportes();
        reportes.push(reporte);
        localStorage.setItem(this.storageKey, JSON.stringify(reportes));
    }

    obtenerHistorialReportes() {
        const guardados = localStorage.getItem(this.storageKey);
        return guardados ? JSON.parse(guardados) : [];
    }
}