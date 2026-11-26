import { ReportModel } from '../models/ReportModel.js';
import { UserModel } from '../models/UserModel.js';
import { TicketModel } from '../models/TicketModel.js';

export class ReportController {
    constructor() {
        this.model = new ReportModel();
        this.logoBase64 = null;
        this.init();
    }

    init() {
        if (!document.getElementById('view-reportes')) return;

        this.poblarSelectEmpresas();

        const selectMes = document.getElementById('rep-periodo');
        if (selectMes) {
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            selectMes.innerHTML = meses.map(m => `<option value="${m}">${m}</option>`).join('');
        }

        const hoy = new Date();
        const mesActualTexto = hoy.toLocaleString('es-ES', { month: 'long' });
        const mesActualCapitalizado = mesActualTexto.charAt(0).toUpperCase() + mesActualTexto.slice(1);
        
        if (selectMes) selectMes.value = mesActualCapitalizado;
        
        document.getElementById('rep-fecha-inicio').value = new Date(hoy.getFullYear(), hoy.getMonth(), 1).toISOString().split('T')[0];
        document.getElementById('rep-fecha-fin').value = new Date(hoy.getFullYear(), hoy.getMonth() + 1, 0).toISOString().split('T')[0];
        
        const selectAnio = document.getElementById('rep-anio');
        if (selectAnio) selectAnio.value = hoy.getFullYear();

        this.configurarFechasAutomaticas();

        const inputLogo = document.getElementById('rep-logo');
        if (inputLogo) {
            inputLogo.addEventListener('change', (e) => {
                const file = e.target.files[0];
                if (file) {
                    const reader = new FileReader();
                    reader.onload = (ev) => {
                        this.logoBase64 = ev.target.result;
                    };
                    reader.readAsDataURL(file);
                }
            });
        }

        const btnGenerar = document.getElementById('btn-generar-reporte');
        if (btnGenerar) {
            btnGenerar.addEventListener('click', () => this.generarReporte());
        }

        this.renderVistaPrevia();
        this.renderHistorial();
    }

    poblarSelectEmpresas() {
        const select = document.getElementById('rep-empresa');
        if (!select) return;

        const userModel = new UserModel();
        const ticketModel = new TicketModel();
        
        const usuarios = userModel.getAllUsers();
        const empresasUsuarios = usuarios.filter(u => u.rol === 'Solicitante' && u.empresa).map(u => u.empresa);
        
        const tickets = ticketModel.getAllTickets();
        const empresasTickets = tickets.map(t => t.empresa).filter(e => e);

        const todasLasEmpresas = [...new Set([...empresasUsuarios, ...empresasTickets])].filter(e => e !== '').sort();

        select.innerHTML = '<option value="" disabled selected>Selecciona una empresa...</option>';
        
        if (todasLasEmpresas.length === 0) {
            select.innerHTML += '<option value="" disabled>No hay empresas registradas</option>';
        } else {
            todasLasEmpresas.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp;
                option.textContent = emp;
                select.appendChild(option);
            });
        }
    }

    configurarFechasAutomaticas() {
        const selectMes = document.getElementById('rep-periodo');
        const selectAnio = document.getElementById('rep-anio');
        const inputInicio = document.getElementById('rep-fecha-inicio');
        const inputFin = document.getElementById('rep-fecha-fin');

        if (!selectMes || !selectAnio || !inputInicio || !inputFin) return;

        const actualizarFechas = () => {
            const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
            let mesIndex = meses.indexOf(selectMes.value);
            
            if (mesIndex === -1) {
                const mesCapitalizado = selectMes.value.charAt(0).toUpperCase() + selectMes.value.slice(1).toLowerCase();
                mesIndex = meses.indexOf(mesCapitalizado);
            }

            if (mesIndex === -1) mesIndex = selectMes.selectedIndex;

            const anio = parseInt(selectAnio.value);
            if (mesIndex === -1 || isNaN(anio)) return;

            const mesNumero = mesIndex + 1;
            const primerDia = new Date(anio, mesNumero - 1, 1);
            const ultimoDia = new Date(anio, mesNumero, 0);

            const formatearFecha = (fecha) => {
                const year = fecha.getFullYear();
                const month = String(fecha.getMonth() + 1).padStart(2, '0');
                const day = String(fecha.getDate()).padStart(2, '0');
                return `${year}-${month}-${day}`;
            };

            inputInicio.value = formatearFecha(primerDia);
            inputFin.value = formatearFecha(ultimoDia);
        };

        selectMes.addEventListener('change', actualizarFechas);
        selectAnio.addEventListener('change', actualizarFechas);
        actualizarFechas();
    }

    async generarReporte() {
        const empresa = document.getElementById('rep-empresa').value.trim() || 'Innology Services';
        const objetivo = document.getElementById('rep-objetivo').value.trim() || 'Registrar y dar seguimiento a los tickets y actividades atendidos por la mesa de ayuda durante el período indicado.';
        const fechaInicio = document.getElementById('rep-fecha-inicio').value;
        const fechaFin = document.getElementById('rep-fecha-fin').value;
        const periodo = document.getElementById('rep-periodo').value;
        const anio = document.getElementById('rep-anio').value;

        if (!fechaInicio || !fechaFin) {
            alert('Por favor, selecciona las fechas de inicio y fin.');
            return;
        }

        const datos = this.model.obtenerDatosReporte({ fechaInicio, fechaFin, empresa });
        
        if (datos.length === 0) {
            alert('No hay datos para generar el reporte de esta empresa en este período.');
            return;
        }

        try {
            const response = await fetch(`Plantilla_Exportacion_Bitacora_Soporte.xlsx?v=${Date.now()}`);
            if (!response.ok) throw new Error("No se encontró la plantilla.");
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const totalTickets = datos.length;
            const totalHoras = datos.reduce((sum, d) => sum + (parseFloat(d.horas) || 0), 0);

            // ==========================================
            // HOJA 1: PORTADA
            // ==========================================
            const wsPortada = workbook.getWorksheet('Portada');
            if (wsPortada) {
                wsPortada.getCell('D17').value = empresa.toUpperCase(); 
                wsPortada.getCell('D18').value = window.currentUser?.nombre || 'Sistema';
                wsPortada.getCell('J17').value = fechaInicio;
                wsPortada.getCell('J18').value = fechaFin;
                wsPortada.getCell('J19').value = new Date().toISOString().split('T')[0];
                wsPortada.getCell('D20').value = objetivo;

                if (this.logoBase64) {
                    const base64Data = this.logoBase64.split(',')[1];
                    const extension = this.logoBase64.includes('jpeg') ? 'jpeg' : 'png';
                    const imageId = workbook.addImage({ base64: base64Data, extension: extension });
                    
                    wsPortada.addImage(imageId, {
                        tl: { col: 10, row: 1.5 }, 
                        ext: { width: 140, height: 90 },
                        editAs: 'oneCell'
                    });
                }
            }

            // ==========================================
            // HOJA 2: TICKETS
            // ==========================================
            const wsTickets = workbook.getWorksheet('Tickets');
            if (wsTickets) {
                // ✅ 1. Totales exactos en D4 y G4
                wsTickets.getCell('D4').value = totalTickets; 
                wsTickets.getCell('G4').value = totalHoras;   

                // ✅ 2. Limpieza desde la columna B (2) hasta la M (13)
                for (let i = 7; i <= 50; i++) {
                    for (let col = 2; col <= 13; col++) {
                        wsTickets.getCell(i, col).value = null;
                    }
                }

                // ✅ 3. Inyección de datos (Fila 7 en adelante, empezando en la columna B)
                let currentRow = 7;
                datos.forEach(d => {
                    wsTickets.getCell(currentRow, 2).value  = d.fechaInicio;            // B
                    wsTickets.getCell(currentRow, 3).value  = d.fechaFin || 'N/A';      // C
                    wsTickets.getCell(currentRow, 4).value  = d.ticket;                 // D
                    wsTickets.getCell(currentRow, 5).value  = d.usuario;                // E
                    wsTickets.getCell(currentRow, 6).value  = d.medio;                  // F
                    wsTickets.getCell(currentRow, 7).value  = d.clasificacion;          // G
                    wsTickets.getCell(currentRow, 8).value  = d.prioridad;              // H
                    wsTickets.getCell(currentRow, 9).value  = d.estatus;                // I
                    wsTickets.getCell(currentRow, 10).value = parseFloat(d.horas) || 0; // J
                    wsTickets.getCell(currentRow, 11).value = d.consultor;              // K
                    wsTickets.getCell(currentRow, 12).value = d.tipo;                   // L
                    wsTickets.getCell(currentRow, 13).value = d.pais;                   // M

                    // Aplicar bordes a las celdas inyectadas
                    for (let col = 2; col <= 13; col++) {
                        const cell = wsTickets.getCell(currentRow, col);
                        
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                            left: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                            bottom: { style: 'thin', color: { argb: 'FFD1D5DB' } },
                            right: { style: 'thin', color: { argb: 'FFD1D5DB' } }
                        };

                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        if (col === 5 || col === 7 || col === 11) {
                            cell.alignment = { vertical: 'middle', horizontal: 'left' };
                        }
                    }
                    currentRow++;
                });
            }

            // Eliminar la hoja de Resumen si existe
            const wsResumen = workbook.getWorksheet('Resumen');
            if (wsResumen) {
                workbook.removeWorksheet(wsResumen.id);
            }

            workbook.views = [{
                x: 0, y: 0, width: 10000, height: 20000,
                firstSheet: 0,
                activeTab: 0,
                visibility: 'visible'
            }];

            const nombreArchivo = `Bitacora_${empresa.replace(/\s+/g, '_')}_${periodo}_${anio}.xlsx`;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            a.click();
            window.URL.revokeObjectURL(url);

            this.model.guardarReporte({
                empresa, objetivo, periodo, anio, fechaInicio, fechaFin,
                fechaCreacion: new Date().toISOString(), nombreArchivo
            });

            this.renderHistorial();
            alert(`✅ Reporte generado con éxito: ${nombreArchivo}`);

        } catch (error) {
            console.error("Error al generar el Excel:", error);
            alert("Hubo un error al generar el reporte. Revisa la consola para más detalles.");
        }
    }

    renderVistaPrevia() {
        const tbody = document.getElementById('tabla-reportes-preview');
        if (!tbody) return;

        const datos = this.model.obtenerDatosReporte();
        
        if (datos.length === 0) {
            tbody.innerHTML = '<tr><td colspan="12" style="text-align:center;padding:20px;color:#9CA3AF;">No hay tickets para mostrar.</td></tr>';
            return;
        }

        tbody.innerHTML = datos.map(d => `
            <tr class="ticket-row">
                <td>${d.fechaInicio}</td>
                <td>${d.fechaFin}</td>
                <td>${d.ticket}</td>
                <td>${d.usuario}</td>
                <td>${d.medio}</td>
                <td>${d.clasificacion}</td>
                <td>${d.prioridad}</td>
                <td>${d.estatus}</td>
                <td>${d.horas}</td>
                <td>${d.consultor}</td>
                <td>${d.tipo}</td>
                <td>${d.pais}</td>
            </tr>
        `).join('');
    }

    renderHistorial() {
        const tbody = document.getElementById('tabla-reportes-historial');
        if (!tbody) return;

        const reportes = this.model.obtenerHistorialReportes();
        
        if (reportes.length === 0) {
            tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;padding:10px;color:#9CA3AF;">No hay reportes generados.</td></tr>';
            return;
        }

        tbody.innerHTML = reportes.map((r, index) => `
            <tr>
                <td>${r.periodo} ${r.anio}</td>
                <td>${new Date(r.fechaCreacion).toLocaleDateString('es-ES')}</td>
                <td>
                    <button class="btn-action" title="Descargar" onclick="window.descargarReporteHistorial(${index})">📥</button>
                </td>
            </tr>
        `).join('');
    }
}