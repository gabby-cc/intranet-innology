export class HoursView {
    constructor() {
        this.container = document.getElementById('view-dashboard');
        this.charts = {};
    }

    renderDashboard(data) {
        if (!this.container) return;
        this.renderKPIs(data.kpis);
        this.renderGraficas(data.graficas);
        this.renderTabla(data.tabla);
    }

    renderKPIs(kpis) {
        document.getElementById('dash-total-horas-anio').textContent = kpis.totalHorasAnio;
        document.getElementById('dash-total-horas-trimestre').textContent = kpis.totalHorasTrimestre;
        document.getElementById('dash-tickets-abiertos').textContent = kpis.ticketsAbiertos;
        document.getElementById('dash-tickets-cerrados').textContent = kpis.ticketsCerrados;
    }

    destruirGraficas() {
        Object.keys(this.charts).forEach(key => {
            if (this.charts[key]) {
                this.charts[key].destroy();
            }
        });
        this.charts = {};
    }

    renderGraficas(graficas) {
        this.destruirGraficas();

        // 1. Gráfica de Tendencia Mensual (Línea)
        const ctxTendencia = document.getElementById('chart-tendencia');
        if (ctxTendencia) {
            // Ya no forzamos los 12 meses, usamos los que vienen del modelo (6 meses)
            const labels = graficas.tendenciaMensual.map(t => t.mes);
            const data = graficas.tendenciaMensual.map(t => (t.minutos / 60).toFixed(1));

            this.charts.tendencia = new Chart(ctxTendencia, {
                type: 'line',
                data: {
                    labels: labels,
                    datasets: [{
                        label: 'Horas Trabajadas',
                        data: data,
                        borderColor: '#C8102E',
                        backgroundColor: 'rgba(200, 16, 46, 0.1)',
                        borderWidth: 4, // 👈 Línea más gruesa para que se vea clara
                        fill: true,
                        tension: 0.4,
                        pointBackgroundColor: '#C8102E',
                        pointBorderColor: '#FFF',
                        pointBorderWidth: 2,
                        pointRadius: 6 // 👈 Puntos más grandes
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1, // ✅ Para que se vea nítido
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.parsed.y}h`
                            }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            title: { display: true, text: 'Horas' },
                            grid: { color: '#F3F4F6' }
                        },
                        x: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // 2. Gráfica de Horas por País (Dona)
        const ctxPaises = document.getElementById('chart-paises');
        if (ctxPaises && graficas.horasPorPais.labels.length > 0) {
            this.charts.paises = new Chart(ctxPaises, {
                type: 'doughnut',
                data: {
                    labels: graficas.horasPorPais.labels,
                    datasets: [{
                        data: graficas.horasPorPais.data.map(min => (min / 60).toFixed(1)),
                        backgroundColor: graficas.horasPorPais.colores,
                        borderWidth: 2,
                        borderColor: '#FFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1, // ✅ Nítido
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 }, padding: 10 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed}h`
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        } else if (ctxPaises) {
            const parent = ctxPaises.parentElement;
            parent.innerHTML = '<p style="text-align:center; color:#9CA3AF; padding:20px;">No hay horas registradas por país.</p>';
        }

        // 3. Gráfica de Horas por Consultor (Barras Horizontales)
        const ctxConsultores = document.getElementById('chart-consultores');
        if (ctxConsultores) {
            this.charts.consultores = new Chart(ctxConsultores, {
                type: 'bar',
                data: {
                    labels: graficas.horasPorConsultor.map(h => h.consultor),
                    datasets: [{
                        label: 'Horas',
                        data: graficas.horasPorConsultor.map(h => (h.minutos / 60).toFixed(1)),
                        backgroundColor: '#C8102E',
                        borderRadius: 6,
                        barThickness: 15
                    }]
                },
                options: {
                    indexAxis: 'y',
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1, // ✅ Nítido
                    plugins: {
                        legend: { display: false },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.parsed.x}h`
                            }
                        }
                    },
                    scales: {
                        x: {
                            beginAtZero: true,
                            title: { display: true, text: 'Horas' },
                            grid: { color: '#F3F4F6' }
                        },
                        y: {
                            grid: { display: false }
                        }
                    }
                }
            });
        }

        // 4. Gráfica de Tickets Abiertos vs Cerrados (Dona)
        const ctxTickets = document.getElementById('chart-tickets');
        if (ctxTickets && graficas.ticketsEstado) {
            this.charts.tickets = new Chart(ctxTickets, {
                type: 'doughnut',
                data: {
                    labels: ['Abiertos', 'Cerrados'],
                    datasets: [{
                        data: [graficas.ticketsEstado.abiertos, graficas.ticketsEstado.cerrados],
                        backgroundColor: ['#F59E0B', '#10B981'],
                        borderWidth: 2,
                        borderColor: '#FFF'
                    }]
                },
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    devicePixelRatio: window.devicePixelRatio || 1, // ✅ Nítido
                    plugins: {
                        legend: {
                            position: 'bottom',
                            labels: { font: { size: 10 }, padding: 10 }
                        },
                        tooltip: {
                            callbacks: {
                                label: (context) => `${context.label}: ${context.parsed}`
                            }
                        }
                    },
                    cutout: '60%'
                }
            });
        }
    }

    renderTabla(consultores) {
        const tbody = this.container.querySelector('table tbody');
        if (!tbody) return;

        tbody.innerHTML = consultores.map(c => `
            <tr class="ticket-row">
                <td><strong>${c.consultor}</strong></td>
                <td>${c.pais}</td>
                <td>${c.totalHoras}</td>
                <td>${c.trimestre || '-'}</td>
                <td>${c.ticketsAtendidos}</td>
            </tr>
        `).join('');
    }
}