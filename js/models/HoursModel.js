import { TicketModel } from './TicketModel.js';

export class HoursModel {
    constructor() {
        this.ticketModel = new TicketModel();
    }

    // ✅ Leer directamente del sessionStorage (donde TicketModel guarda los datos)
    obtenerTodosLosRegistros(filtros = {}) {
        const ticketsGuardados = sessionStorage.getItem('innology_tickets');
        if (!ticketsGuardados) return [];
        
        const tickets = JSON.parse(ticketsGuardados);
        let todosLosRegistros = [];

        tickets.forEach(ticket => {
            if (ticket.registrosHoras && ticket.registrosHoras.length > 0) {
                ticket.registrosHoras.forEach(registro => {
                    // Filtro por consultor
                    if (filtros.consultor && registro.autor !== filtros.consultor) return;
                    // Filtro por país
                    if (filtros.pais && ticket.pais !== filtros.pais) return;
                    
                    // Si no tiene fechaISO, le asignamos la fecha de hoy
                    const fechaISO = registro.fechaISO || new Date().toISOString().split('T')[0];
                    
                    // Filtro por año y trimestre
                    if (filtros.anio || filtros.trimestre) {
                        const fecha = new Date(fechaISO);
                        
                        if (filtros.anio && fecha.getFullYear().toString() !== filtros.anio) return;
                        
                        if (filtros.trimestre) {
                            const mes = fecha.getMonth();
                            const trimestreRegistro = `Q${Math.floor(mes / 3) + 1}`;
                            if (trimestreRegistro !== filtros.trimestre) return;
                        }
                    }

                    todosLosRegistros.push({
                        ...registro,
                        fechaISO: fechaISO,
                        ticketId: ticket.id,
                        pais: ticket.pais || 'Global',
                        tipoTicket: ticket.tipoTicket || 'Otro'
                    });
                });
            }
        });

        return todosLosRegistros;
    }

    calcularTotalHoras(registros) {
        let totalMinutos = 0;
        registros.forEach(r => {
            totalMinutos += (r.horas * 60) + r.minutos;
        });
        return {
            minutos: totalMinutos,
            formateado: this.formatearMinutos(totalMinutos)
        };
    }

    obtenerTotalHorasGlobal(filtros = {}) {
        const registros = this.obtenerTodosLosRegistros(filtros);
        return this.calcularTotalHoras(registros).formateado;
    }

    obtenerTotalHorasTrimestre(filtros = {}) {
        const anioActual = new Date().getFullYear().toString();
        const mesActual = new Date().getMonth();
        const trimestreActual = `Q${Math.floor(mesActual / 3) + 1}`;
        
        const filtrosConTrimestre = {
            ...filtros,
            anio: filtros.anio || anioActual,
            trimestre: filtros.trimestre || trimestreActual
        };
        
        const registros = this.obtenerTodosLosRegistros(filtrosConTrimestre);
        return this.calcularTotalHoras(registros).formateado;
    }

    obtenerHorasPorConsultor(filtros = {}) {
        const registros = this.obtenerTodosLosRegistros(filtros);
        const agrupado = {};

        registros.forEach(r => {
            if (!agrupado[r.autor]) {
                agrupado[r.autor] = { minutos: 0, tickets: new Set(), paises: new Set() };
            }
            agrupado[r.autor].minutos += (r.horas * 60) + r.minutos;
            agrupado[r.autor].tickets.add(r.ticketId);
            agrupado[r.autor].paises.add(r.pais);
        });

        return Object.keys(agrupado).map(autor => ({
            consultor: autor,
            totalHoras: this.formatearMinutos(agrupado[autor].minutos),
            ticketsAtendidos: agrupado[autor].tickets.size,
            minutos: agrupado[autor].minutos,
            paises: Array.from(agrupado[autor].paises).join(', ')
        })).sort((a, b) => b.minutos - a.minutos);
    }

    obtenerResumenTickets() {
        const tickets = this.ticketModel.getAllTickets();
        const abiertos = tickets.filter(t => t.status !== 'Resuelto').length;
        const cerrados = tickets.filter(t => t.status === 'Resuelto').length;
        return { abiertos, cerrados };
    }

    obtenerHorasPorPaisGrafica(filtros = {}) {
        const registros = this.obtenerTodosLosRegistros(filtros);
        const agrupado = {};

        registros.forEach(r => {
            if (!agrupado[r.pais]) agrupado[r.pais] = 0;
            agrupado[r.pais] += (r.horas * 60) + r.minutos;
        });

        const labels = Object.keys(agrupado);
        const data = labels.map(pais => agrupado[pais]);
        const colores = ['#C8102E', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'];

        return {
            labels: labels,
            data: data,
            colores: colores.slice(0, labels.length)
        };
    }

    obtenerTendenciaMensual(filtros = {}) {
        const registros = this.obtenerTodosLosRegistros(filtros);
        const meses = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
        
        const anioAMostrar = filtros.anio || new Date().getFullYear();
        const mesActual = new Date().getMonth();

        const mesesAMostrar = [];
        for (let i = 5; i >= 0; i--) {
            let mesIndex = mesActual - i;
            let anio = anioAMostrar;
            
            if (mesIndex < 0) {
                mesIndex += 12;
                anio -= 1;
            }
            
            mesesAMostrar.push({
                mesIndex: mesIndex,
                anio: anio,
                nombre: meses[mesIndex]
            });
        }

        const datosMes = {};
        mesesAMostrar.forEach(m => {
            datosMes[m.nombre] = 0;
        });

        registros.forEach(r => {
            if (!r.fechaISO) return;
            const fecha = new Date(r.fechaISO);
            
            const encontrado = mesesAMostrar.find(m => 
                m.mesIndex === fecha.getMonth() && m.anio === fecha.getFullYear()
            );

            if (encontrado) {
                datosMes[encontrado.nombre] += (r.horas * 60) + r.minutos;
            }
        });

        const resultado = mesesAMostrar.map(m => ({
            mes: m.nombre,
            minutos: datosMes[m.nombre],
            total: this.formatearMinutos(datosMes[m.nombre])
        }));

        const maxMinutos = Math.max(...resultado.map(r => r.minutos), 1);

        return resultado.map(r => ({
            ...r,
            porcentaje: Math.round((r.minutos / maxMinutos) * 100)
        }));
    }

    obtenerAniosDisponibles() {
        const registros = this.obtenerTodosLosRegistros();
        const anios = new Set();
        registros.forEach(r => {
            if (r.fechaISO) anios.add(new Date(r.fechaISO).getFullYear());
        });
        return Array.from(anios).sort();
    }

    obtenerPaisesDisponibles() {
        const registros = this.obtenerTodosLosRegistros();
        const paises = new Set();
        registros.forEach(r => paises.add(r.pais));
        return Array.from(paises).sort();
    }

    obtenerConsultoresDisponibles() {
        const registros = this.obtenerTodosLosRegistros();
        const consultores = new Set();
        registros.forEach(r => consultores.add(r.autor));
        return Array.from(consultores).sort();
    }

    formatearMinutos(totalMinutos) {
        const h = Math.floor(totalMinutos / 60);
        const m = totalMinutos % 60;
        return `${h}h ${m}m`;
    }

    // ✅ MÉTODO PARA EL EXCEL: Obtener registros detallados
    obtenerRegistrosHorasDetallados(filtros = {}) {
        const tickets = this.ticketModel.getAllTickets();
        let registros = [];

        tickets.forEach(t => {
            if (t.registrosHoras && t.registrosHoras.length > 0) {
                t.registrosHoras.forEach(r => {
                    const fechaR = new Date(r.fechaISO || new Date());
                    const anioR = fechaR.getFullYear().toString();
                    let matchAnio = !filtros.anio || filtros.anio === anioR;
                    
                    let matchTrimestre = true;
                    if (filtros.trimestre) {
                        const mesR = fechaR.getMonth();
                        const trimestreR = `Q${Math.floor(mesR / 3) + 1}`;
                        matchTrimestre = filtros.trimestre === trimestreR;
                    }

                    let matchPais = !filtros.pais || t.pais === filtros.pais;
                    let matchConsultor = !filtros.consultor || r.autor === filtros.consultor;

                    if (matchAnio && matchTrimestre && matchPais && matchConsultor) {
                        registros.push({
                            folio: t.id,
                            titulo: t.title,
                            tipo: t.tipoTicket,
                            pais: t.pais,
                            prioridad: t.priority,
                            estado: t.status,
                            solicitante: t.solicitante,
                            consultor: r.autor,
                            fechaTrabajo: r.fechaISO,
                            actividad: r.nota || 'Sin descripción',
                            horas: (r.horas || 0) + ((r.minutos || 0) / 60),
                            mes: r.fechaISO ? r.fechaISO.substring(0, 7) + '-01' : new Date().toISOString().split('T')[0]
                        });
                    }
                });
            }
        });

        return registros;
    }
}