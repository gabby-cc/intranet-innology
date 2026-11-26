import { HoursModel } from '../models/HoursModel.js';
import { HoursView } from '../views/HoursView.js';

export class HoursController {
    constructor() {
        this.model = new HoursModel();
        this.view = new HoursView();
        this.filtrosActuales = {
            anio: '',
            trimestre: '',
            pais: '',
            consultor: ''
        };
        this.periodoExportacion = 'mes'; // ✅ Período de exportación por defecto
        this.init();
    }

    init() {
        if (!document.getElementById('view-dashboard')) return;
        
        this.configurarFiltros();
        this.cargarDashboard();
        
        document.addEventListener('ticketUpdated', () => {
            console.log('🔄 Ticket actualizado, recargando dashboard...');
            this.model = new HoursModel();
            this.cargarDashboard();
        });
        
        document.addEventListener('documentAdded', () => {
            console.log('🔄 Documento agregado, recargando dashboard...');
            this.model = new HoursModel();
            this.cargarDashboard();
        });
    }

    configurarFiltros() {
        const selectAnio = document.getElementById('dash-filter-anio');
        const selectPais = document.getElementById('dash-filter-pais');
        const selectConsultor = document.getElementById('dash-filter-consultor');

        if (selectAnio) {
            const anios = this.model.obtenerAniosDisponibles();
            selectAnio.innerHTML = '<option value="">Todos los años</option>' + 
                anios.map(a => `<option value="${a}">${a}</option>`).join('');
        }

        if (selectPais) {
            const paises = this.model.obtenerPaisesDisponibles();
            selectPais.innerHTML = '<option value="">Todos los países</option>' + 
                paises.map(p => `<option value="${p}">${p}</option>`).join('');
        }

        if (selectConsultor) {
            const consultores = this.model.obtenerConsultoresDisponibles();
            selectConsultor.innerHTML = '<option value="">Todos los consultores</option>' + 
                consultores.map(c => `<option value="${c}">${c}</option>`).join('');
        }

        ['dash-filter-anio', 'dash-filter-trimestre', 'dash-filter-pais', 'dash-filter-consultor'].forEach(id => {
            const el = document.getElementById(id);
            if (el) {
                el.addEventListener('change', () => this.aplicarFiltros());
            }
        });

        const btnLimpiar = document.getElementById('btn-limpiar-filtros');
        if (btnLimpiar) {
            btnLimpiar.addEventListener('click', () => {
                document.getElementById('dash-filter-anio').value = '';
                document.getElementById('dash-filter-trimestre').value = '';
                document.getElementById('dash-filter-pais').value = '';
                document.getElementById('dash-filter-consultor').value = '';
                this.aplicarFiltros();
            });
        }

        document.querySelectorAll('.btn-export-periodo').forEach(btn => {
            btn.addEventListener('click', (e) => {
                // Quitar la clase active de todos
                document.querySelectorAll('.btn-export-periodo').forEach(b => {
                    b.style.background = 'transparent';
                    b.style.color = '#6B7280';
                });

                // Poner active al seleccionado
                const target = e.target;
                target.style.background = 'var(--primary-red)';
                target.style.color = 'white';

                // Guardar el período seleccionado
                this.periodoExportacion = target.getAttribute('data-periodo');
                console.log('📅 Período de exportación:', this.periodoExportacion);
            });
        });

        const btnDescargarExcel = document.getElementById('btn-descargar-excel');
        if (btnDescargarExcel) {
            btnDescargarExcel.addEventListener('click', () => this.exportarExcel());
        }
    }

    aplicarFiltros() {
        this.filtrosActuales = {
            anio: document.getElementById('dash-filter-anio')?.value || '',
            trimestre: document.getElementById('dash-filter-trimestre')?.value || '',
            pais: document.getElementById('dash-filter-pais')?.value || '',
            consultor: document.getElementById('dash-filter-consultor')?.value || ''
        };
        this.cargarDashboard();
    }

    cargarDashboard() {
        const filtros = this.filtrosActuales;

        // 1. KPIs
        const kpis = {
            totalHorasAnio: this.model.obtenerTotalHorasGlobal(filtros),
            totalHorasTrimestre: this.model.obtenerTotalHorasTrimestre(filtros),
            ticketsAbiertos: this.model.obtenerResumenTickets().abiertos,
            ticketsCerrados: this.model.obtenerResumenTickets().cerrados
        };

        // 2. Gráficas
        const horasConsultor = this.model.obtenerHorasPorConsultor(filtros);
        const tendencia = this.model.obtenerTendenciaMensual(filtros);
        const horasPorPais = this.model.obtenerHorasPorPaisGrafica(filtros);
        const resumenTickets = this.model.obtenerResumenTickets();

        const maxHoras = Math.max(...horasConsultor.map(h => h.minutos), 1);

        const graficas = {
            tendenciaMensual: tendencia,
            horasPorConsultor: horasConsultor.map(h => ({
                ...h,
                porcentaje: Math.round((h.minutos / maxHoras) * 100)
            })),
            horasPorPais: horasPorPais,
            ticketsEstado: resumenTickets
        };

        // 3. Tabla
        const tabla = horasConsultor.map(h => ({
            consultor: h.consultor,
            pais: h.paises || 'Global',
            totalHoras: h.totalHoras,
            trimestre: filtros.trimestre || 'Todos',
            ticketsAtendidos: h.ticketsAtendidos
        }));

        this.view.renderDashboard({ kpis, graficas, tabla });
    }

    async exportarExcel() {
        const periodo = this.periodoExportacion || 'mes';
        const hoy = new Date();

        let filtrosParaExportar = { ...this.filtrosActuales };
        if (periodo === 'mes') {
            filtrosParaExportar.anio = hoy.getFullYear().toString();
            filtrosParaExportar.trimestre = `Q${Math.floor(hoy.getMonth() / 3) + 1}`;
        } else if (periodo === 'trimestre') {
            filtrosParaExportar.anio = hoy.getFullYear().toString();
            filtrosParaExportar.trimestre = `Q${Math.floor(hoy.getMonth() / 3) + 1}`;
        } else {
            filtrosParaExportar.anio = hoy.getFullYear().toString();
            filtrosParaExportar.trimestre = '';
        }

        const registros = this.model.obtenerRegistrosHorasDetallados(filtrosParaExportar);
        
        if (registros.length === 0) {
            alert('No hay horas registradas para exportar en este período.');
            return;
        }

        try {
            
            const response = await fetch('Plantilla_reporte_excel_tickets.xlsx'); 
            if (!response.ok) throw new Error("No se encontró la plantilla.");
            
            const arrayBuffer = await response.arrayBuffer();
            const workbook = new ExcelJS.Workbook();
            await workbook.xlsx.load(arrayBuffer);

            const totalHoras = registros.reduce((sum, r) => sum + (r.horas || 0), 0);
            const ticketsUnicos = new Set(registros.map(r => r.folio)).size;
            const abiertos = registros.filter(r => r.estado !== 'Cerrado' && r.estado !== 'Resuelto').length;
            const cerrados = registros.filter(r => r.estado === 'Cerrado' || r.estado === 'Resuelto').length;

            const fuenteNormal = {
                name: 'Calibri',
                size: 11,
                bold: false,
                italic: false,
                underline: false,
                color: { argb: 'FF000000' }
            };

            const fuenteNegrita = {
                name: 'Calibri',
                size: 11,
                bold: true,
                italic: false,
                underline: false,
                color: { argb: 'FF000000' }
            };

            // ==========================================
            // HOJA 1: PORTADA
            // ==========================================
            const wsPortada = workbook.getWorksheet('Portada');
            if (wsPortada) {
                // 1. Escribir los datos de la información general
                let textoPeriodo = periodo === 'mes' 
                    ? `Mes actual (${hoy.toLocaleString('es-ES', { month: 'long' })})` 
                    : periodo === 'trimestre' 
                        ? `Trimestre actual (Q${Math.floor(hoy.getMonth() / 3) + 1})` 
                        : `Año ${hoy.getFullYear()}`;

                wsPortada.getCell('B16').value = textoPeriodo; 
                wsPortada.getCell('B17').value = '09:00 – 18:00'; 
                wsPortada.getCell('B18').value = window.currentUser?.nombre || 'Sistema'; 
                wsPortada.getCell('B19').value = new Date().toISOString().split('T')[0]; 

                const bordeBlanco = { style: 'thin', color: { argb: 'FFFFFFFF' } };
                const bordeNegro = { style: 'thin', color: { argb: 'FF000000' } };
                const sinBorde = { style: 'none' };

                for (let r = 16; r <= 19; r++) {
                    for (let c = 1; c <= 6; c++) { 
                        const cell = wsPortada.getCell(r, c);
                        
                        cell.border = {
                            top: r === 16 ? undefined : bordeBlanco,
                            bottom: bordeBlanco,
                            left: c === 1 ? undefined : sinBorde,
                            right: c === 6 ? undefined : sinBorde
                        };

                        if (c === 2) {
                            cell.alignment = { vertical: 'middle', indent: 1 };
                        }
                    }
                }

                // 3. TABLA DE CONSULTORES
                const porConsultor = {};
                registros.forEach(r => {
                    if (!porConsultor[r.consultor]) porConsultor[r.consultor] = 0;
                    porConsultor[r.consultor] += (r.horas || 0);
                });

                for (let c = 1; c <= 2; c++) {
                    const cell = wsPortada.getCell(23, c);
                    cell.border = {
                        top: bordeNegro,
                        bottom: bordeNegro,
                        left: bordeNegro,
                        right: bordeNegro
                    };
                }

                let filaConsultor = 24;
                Object.keys(porConsultor).forEach(consultor => {
                    const fila = wsPortada.getRow(filaConsultor);
                    
                    fila.getCell(1).value = consultor; 
                    fila.getCell(2).value = porConsultor[consultor]; 
                    
                    for (let c = 1; c <= 2; c++) {
                        const cell = fila.getCell(c);
                        cell.font = fuenteNormal;
                        cell.border = {
                            top: bordeNegro,
                            bottom: bordeNegro,
                            left: bordeNegro,
                            right: bordeNegro
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                    
                    fila.commit();
                    filaConsultor++;
                });

                if (Object.keys(porConsultor).length > 0) {
                    const filaTotal = wsPortada.getRow(filaConsultor);
                    filaTotal.getCell(1).value = 'Total';
                    filaTotal.getCell(2).value = totalHoras;

                    for (let c = 1; c <= 2; c++) {
                        const cell = filaTotal.getCell(c);
                        cell.font = fuenteNegrita;
                        cell.border = { 
                            top: bordeNegro, 
                            bottom: bordeNegro,
                            left: bordeNegro,
                            right: bordeNegro
                        };
                        cell.alignment = { vertical: 'middle', horizontal: 'center' };
                    }
                    
                    filaTotal.commit();
                }
            }

            // ==========================================
            // HOJA 2: DETALLE / TICKETS
            // ==========================================
            const wsDetalle = workbook.getWorksheet('Tickets') || workbook.getWorksheet('Detalle');
            if (wsDetalle) {
                // ✅ Ajustar anchos de columnas
                wsDetalle.getColumn(1).width = 3;  // Margen A
                wsDetalle.getColumn(2).width = 18; // B: Fecha de inicio / Total de tickets
                wsDetalle.getColumn(3).width = 18; // C: Fecha de finalización / Valor tickets
                wsDetalle.getColumn(4).width = 12; // D: Ticket
                wsDetalle.getColumn(5).width = 20; // E: Usuario
                wsDetalle.getColumn(6).width = 16; // F: Medio / Total de horas
                wsDetalle.getColumn(7).width = 40; // G: Clasificación / Valor horas
                wsDetalle.getColumn(8).width = 12; // H: Prioridad
                wsDetalle.getColumn(9).width = 12; // I: Estatus
                wsDetalle.getColumn(10).width = 10; // J: Horas
                wsDetalle.getColumn(11).width = 25; // K: Nombre del consultor
                wsDetalle.getColumn(12).width = 18; // L: Técnico / Funcional
                wsDetalle.getColumn(13).width = 15; // M: País

                // ✅ Encabezados y números a un costado en la Fila 4
                const lblTickets = wsDetalle.getCell('B4');
                lblTickets.value = 'Total de tickets';
                lblTickets.font = fuenteNegrita;
                lblTickets.alignment = { horizontal: 'left', vertical: 'middle' };

                const celdaTotalTickets = wsDetalle.getCell('C4');
                celdaTotalTickets.value = ticketsUnicos;
                celdaTotalTickets.font = fuenteNegrita;
                celdaTotalTickets.alignment = { horizontal: 'center', vertical: 'middle' };

                const lblHoras = wsDetalle.getCell('F4');
                lblHoras.value = 'Total de horas';
                lblHoras.font = fuenteNegrita;
                lblHoras.alignment = { horizontal: 'left', vertical: 'middle' };

                const celdaTotalHoras = wsDetalle.getCell('G4');
                celdaTotalHoras.value = totalHoras;
                celdaTotalHoras.font = fuenteNegrita;
                celdaTotalHoras.alignment = { horizontal: 'center', vertical: 'middle' };

                // ✅ Asegurar encabezados visibles en la Fila 6 (B6:M6)
                const encabezadosTickets = [
                    'Fecha de inicio',
                    'Fecha de finalización',
                    'Ticket',
                    'Usuario',
                    'Medio',
                    'Clasificación',
                    'Prioridad',
                    'Estatus',
                    'Horas',
                    'Nombre del consultor',
                    'Técnico / Funcional',
                    'País'
                ];

                const filaEncabezado = wsDetalle.getRow(6);
                encabezadosTickets.forEach((titulo, index) => {
                    const cell = filaEncabezado.getCell(index + 2);
                    cell.value = titulo;
                    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF2B2B2B' } };
                    cell.font = { name: 'Arial', size: 10, bold: true, color: { argb: 'FFFFFFFF' } };
                    cell.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
                    cell.border = {
                        top: { style: 'thin', color: { argb: 'FF1F1F1F' } },
                        bottom: { style: 'thin', color: { argb: 'FF1F1F1F' } },
                        left: { style: 'thin', color: { argb: 'FF4A4A4A' } },
                        right: { style: 'thin', color: { argb: 'FF4A4A4A' } }
                    };
                });
                filaEncabezado.height = 24;
                filaEncabezado.commit();

                // Limpiar filas de datos viejos (desde la fila 7)
                for (let i = 7; i <= 100; i++) {
                    wsDetalle.getRow(i).values = [];
                }

                // ✅ INYECCIÓN: Empezamos en la Fila 7
                let currentRow = 7;
                registros.forEach(r => {
                    const fila = wsDetalle.getRow(currentRow);
                    
                    // ✅ Inyectar datos en las columnas correctas
                    fila.getCell(2).value = r.fechaTrabajo;       // B: Fecha inicio
                    fila.getCell(3).value = r.fechaTrabajo;       // C: Fecha finalización
                    fila.getCell(4).value = r.folio;              // D: Ticket
                    fila.getCell(5).value = r.solicitante;        // E: Usuario
                    fila.getCell(6).value = 'Portal';             // F: Medio
                    
                    // ✅ AQUÍ ESTÁ EL TRUCO: La descripción va en la G
                    fila.getCell(7).value = r.titulo;             
                    
                    // Las demás se recorren una columna a la derecha
                    fila.getCell(8).value = r.prioridad;          // H: Prioridad
                    fila.getCell(9).value = r.estado;             // I: Estatus
                    fila.getCell(10).value = r.horas;             // J: Horas
                    fila.getCell(11).value = r.consultor;         // K: Consultor
                    fila.getCell(12).value = r.tipo;              // L: Técnico/Funcional
                    fila.getCell(13).value = r.pais;              // M: País

                    // ✅ Aplicar bordes y estilo
                    for (let col = 2; col <= 13; col++) {
                        const cell = fila.getCell(col);
                        
                        cell.border = {
                            top: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            left: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            bottom: { style: 'thin', color: { argb: 'FFD3D3D3' } },
                            right: { style: 'thin', color: { argb: 'FFD3D3D3' } }
                        };
                        
                        cell.alignment = { 
                            vertical: 'middle', 
                            horizontal: 'left',
                            indent: 1 
                        };

                        // Centrar textos cortos
                        if (col === 4 || col === 6 || col === 8 || col === 9 || col === 10 || col === 12 || col === 13) {
                            cell.alignment = { vertical: 'middle', horizontal: 'center' };
                        }
                    }
                    fila.commit();
                    currentRow++;
                });
            }

            // ==========================================
            // HOJA 3: RESUMEN (RESPETANDO DISEÑO Y DINÁMICO)
            // ==========================================
            const wsResumen = workbook.getWorksheet('Resumen');
            if (wsResumen) {
                // 1. Ajustar anchos de columnas
                wsResumen.getColumn(2).width = 20;
                wsResumen.getColumn(3).width = 15;
                wsResumen.getColumn(4).width = 15; 

                // 2. Inyectar KPIs (Usando las celdas de tu plantilla original)
                wsResumen.getCell('B6').value = totalHoras;
                wsResumen.getCell('D6').value = totalHoras;
                wsResumen.getCell('G6').value = abiertos;
                wsResumen.getCell('I6').value = cerrados;
                wsResumen.getCell('K6').value = ticketsUnicos > 0 ? (totalHoras / ticketsUnicos).toFixed(1) : 0;

                // 3. LIMPIEZA PROFUNDA: Borramos datos y estilos SOLO de la zona de tablas
                for (let r = 9; r <= 60; r++) {
                    for (let c = 2; c <= 4; c++) {
                        const cell = wsResumen.getCell(r, c);
                        cell.value = null;
                        cell.style = {}; // Borra fondos, letras y bordes viejos
                    }
                }

                const bordeTabla = { style: 'thin', color: { argb: 'FFD3D3D3' } };

                // 4. Función auxiliar para dibujar encabezados rojos
                const dibujarEncabezado = (fila, col1, col2, col3) => {
                    const headers = [col1, col2, col3];
                    const totalCols = (col3 === '') ? 2 : 3;

                    for (let i = 0; i < totalCols; i++) {
                        const cell = wsResumen.getCell(fila, i + 2);
                        cell.value = headers[i];
                        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FFC00000' } };
                        cell.font = { name: 'Calibri', size: 11, color: { argb: 'FFFFFFFF' }, bold: true };
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = {
                            top: bordeTabla,
                            bottom: bordeTabla,
                            left: bordeTabla,
                            right: bordeTabla
                        };
                    }
                };

                const formatearFilaDatos = (fila, numCols = 3) => {
                    for (let i = 0; i < numCols; i++) {
                        const cell = wsResumen.getCell(fila, i + 2);
                        cell.font = fuenteNormal;
                        cell.alignment = { horizontal: 'center', vertical: 'middle' };
                        cell.border = {
                            top: bordeTabla,
                            bottom: bordeTabla,
                            left: bordeTabla,
                            right: bordeTabla
                        };
                    }
                };

                let filaActual = 9;

                // ==========================================
                // TABLA 1: HORAS POR PAÍS
                // ==========================================
                wsResumen.getCell(`B${filaActual}`).value = 'Horas por país';
                wsResumen.getCell(`B${filaActual}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFC00000' } };
                filaActual++;
                
                dibujarEncabezado(filaActual, 'País', 'Horas', '% del total');
                filaActual++;

                const porPais = {};
                registros.forEach(r => {
                    if (!porPais[r.pais]) porPais[r.pais] = 0;
                    porPais[r.pais] += (r.horas || 0);
                });
                
                Object.keys(porPais).forEach(pais => {
                    wsResumen.getCell(`B${filaActual}`).value = pais;
                    wsResumen.getCell(`C${filaActual}`).value = porPais[pais];
                    wsResumen.getCell(`D${filaActual}`).value = totalHoras > 0 ? (porPais[pais] / totalHoras) : 0;
                    wsResumen.getCell(`D${filaActual}`).numFmt = '0.0%';
                    formatearFilaDatos(filaActual, 3);
                    filaActual++;
                });

                filaActual += 2; // 2 filas de espacio

                // ==========================================
                // TABLA 2: HORAS POR CONSULTOR
                // ==========================================
                wsResumen.getCell(`B${filaActual}`).value = 'Horas por consultor';
                wsResumen.getCell(`B${filaActual}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFC00000' } };
                filaActual++;
                
                dibujarEncabezado(filaActual, 'Consultor', 'Horas', '% del total');
                filaActual++;

                const porConsultorResumen = {};
                registros.forEach(r => {
                    if (!porConsultorResumen[r.consultor]) porConsultorResumen[r.consultor] = 0;
                    porConsultorResumen[r.consultor] += (r.horas || 0);
                });
                
                Object.keys(porConsultorResumen).forEach(consultor => {
                    wsResumen.getCell(`B${filaActual}`).value = consultor;
                    wsResumen.getCell(`C${filaActual}`).value = porConsultorResumen[consultor];
                    wsResumen.getCell(`D${filaActual}`).value = totalHoras > 0 ? (porConsultorResumen[consultor] / totalHoras) : 0;
                    wsResumen.getCell(`D${filaActual}`).numFmt = '0.0%';
                    formatearFilaDatos(filaActual, 3);
                    filaActual++;
                });

                filaActual += 2; // 2 filas de espacio

                // ==========================================
                // TABLA 3: TENDENCIA MENSUAL
                // ==========================================
                wsResumen.getCell(`B${filaActual}`).value = 'Tendencia mensual';
                wsResumen.getCell(`B${filaActual}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFC00000' } };
                filaActual++;
                
                // ✅ Solo pinta B ('Mes') y C ('Horas'), sin tocar D
                dibujarEncabezado(filaActual, 'Mes', 'Horas', '');
                filaActual++;

                const mesActual = hoy.getMonth();
                for (let i = 2; i >= 0; i--) {
                    let m = mesActual - i;
                    let anioM = hoy.getFullYear();
                    if (m < 0) { m += 12; anioM -= 1; }
                    
                    const horasMes = registros.filter(r => {
                        const f = new Date(r.fechaTrabajo);
                        return f.getMonth() === m && f.getFullYear() === anioM;
                    }).reduce((sum, r) => sum + (r.horas || 0), 0);

                    wsResumen.getCell(`B${filaActual}`).value = `${anioM}-${String(m + 1).padStart(2, '0')}-01`;
                    wsResumen.getCell(`C${filaActual}`).value = horasMes;
                    formatearFilaDatos(filaActual, 2);
                    filaActual++;
                }

                filaActual += 2; // 2 filas de espacio

                // ==========================================
                // TABLA 4: TICKETS POR ESTADO
                // ==========================================
                wsResumen.getCell(`B${filaActual}`).value = 'Tickets por estado';
                wsResumen.getCell(`B${filaActual}`).font = { name: 'Calibri', size: 11, bold: true, color: { argb: 'FFC00000' } };
                filaActual++;
                
                dibujarEncabezado(filaActual, 'Estado', 'Tickets', '% del total');
                filaActual++;

                const estadosUnicos = ['Abierto', 'Asignado', 'En validación', 'Cerrado'];
                estadosUnicos.forEach(estado => {
                    const cant = registros.filter(r => r.estado === estado).length;
                    
                    wsResumen.getCell(`B${filaActual}`).value = estado;
                    wsResumen.getCell(`C${filaActual}`).value = cant;
                    wsResumen.getCell(`D${filaActual}`).value = ticketsUnicos > 0 ? (cant / ticketsUnicos) : 0;
                    wsResumen.getCell(`D${filaActual}`).numFmt = '0.0%';
                    formatearFilaDatos(filaActual, 3);
                    filaActual++;
                });
            }

            workbook.views = [{
                x: 0, y: 0, width: 10000, height: 20000,
                firstSheet: 0,
                activeTab: 0,
                visibility: 'visible'
            }];

            const nombreArchivo = `Reporte_Horas_${periodo}_${hoy.toISOString().split('T')[0]}.xlsx`;
            
            const buffer = await workbook.xlsx.writeBuffer();
            const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = nombreArchivo;
            a.click();
            window.URL.revokeObjectURL(url);

            alert(`✅ Reporte generado: ${nombreArchivo}`);

        } catch (error) {
            console.error("Error al generar el Excel:", error);
            alert("Error al generar el reporte. Revisa la consola.");
        }
    }
}