export class CalendarView {
    constructor() {
        this.upcomingEventsContainer = document.querySelector('.card .event-item')?.parentElement;
        this.calendarViewContainer = document.getElementById('view-calendario');
    }

    renderUpcomingEvents(events) {
        if (!this.upcomingEventsContainer) return;
        
        const header = this.upcomingEventsContainer.querySelector('div');
        this.upcomingEventsContainer.innerHTML = '';
        if (header) this.upcomingEventsContainer.appendChild(header);

        events.slice(0, 2).forEach(event => {
            const eventDate = new Date(event.date + 'T00:00:00');
            const day = eventDate.getDate();
            const month = eventDate.toLocaleString('es-ES', { month: 'short' });

            const item = document.createElement('div');
            item.className = 'event-item';
            item.innerHTML = `
                <div class="event-date">
                    <strong>${day}</strong>
                    <span>${month}</span>
                </div>
                <div class="event-info">
                    <h4>${event.title}</h4>
                    <p>${event.time}, ${event.type}</p>
                </div>
            `;
            this.upcomingEventsContainer.appendChild(item);
        });
    }

    renderCalendar(events) {
        if(!this.calendarViewContainer) return;
        
        if (this.calendarViewContainer.innerHTML.includes('Módulo en construcción') || this.calendarViewContainer.innerHTML.trim() === '') {
            this.calendarViewContainer.innerHTML = `
                <h1 class="page-title">Calendario</h1>
                <div class="title-underline"></div>
                <p style="color: var(--text-light); margin-bottom: 25px;">Reuniones agendadas con tu equipo de Innology.</p>
                
                <div class="table-container" style="padding: 30px;">
                    <h2 style="font-family: var(--font-serif); font-size: 1.5rem; margin-bottom: 20px;">Octubre 2026</h2>
                    <div id="calendar-grid" style="display: grid; grid-template-columns: repeat(7, 1fr); gap: 10px; text-align: center;">
                        <div style="font-weight: bold; color: #999;">Lun</div><div style="font-weight: bold; color: #999;">Mar</div><div style="font-weight: bold; color: #999;">Mié</div><div style="font-weight: bold; color: #999;">Jue</div><div style="font-weight: bold; color: #999;">Vie</div><div style="font-weight: bold; color: #999;">Sáb</div><div style="font-weight: bold; color: #999;">Dom</div>
                        <div style="padding: 10px; border: 1px solid #EEE;">1</div><div style="padding: 10px; border: 1px solid #EEE;">2</div><div style="padding: 10px; border: 1px solid #EEE;">3</div><div style="padding: 10px; border: 1px solid #EEE;">4</div><div style="padding: 10px; border: 1px solid #EEE;">5</div><div style="padding: 10px; border: 1px solid #EEE;">6</div><div style="padding: 10px; border: 1px solid #EEE;">7</div>
                        <div style="padding: 10px; border: 1px solid #EEE;">8</div><div style="padding: 10px; border: 1px solid #EEE;">9</div><div style="padding: 10px; border: 1px solid #EEE;">10</div><div style="padding: 10px; border: 1px solid #EEE;">11</div><div style="padding: 10px; border: 1px solid #EEE;">12</div><div style="padding: 10px; border: 1px solid #EEE;">13</div><div style="padding: 10px; border: 1px solid #EEE;">14</div>
                        <div style="padding: 10px; border: 1px solid #EEE;">15</div><div style="padding: 10px; border: 1px solid #EEE;">16</div><div style="padding: 10px; border: 1px solid #EEE;">17</div><div style="padding: 10px; border: 1px solid #EEE;">18</div><div style="padding: 10px; border: 1px solid #EEE; background: #FFF0F2; color: var(--primary-red); font-weight: bold;">19</div><div style="padding: 10px; border: 1px solid #EEE;">20</div><div style="padding: 10px; border: 1px solid #EEE; background: #FFF0F2; color: var(--primary-red); font-weight: bold;">21</div>
                        <div style="padding: 10px; border: 1px solid #EEE;">22</div><div style="padding: 10px; border: 1px solid #EEE;">23</div><div style="padding: 10px; border: 1px solid #EEE;">24</div><div style="padding: 10px; border: 1px solid #EEE;">25</div><div style="padding: 10px; border: 1px solid #EEE;">26</div><div style="padding: 10px; border: 1px solid #EEE;">27</div><div style="padding: 10px; border: 1px solid #EEE;">28</div>
                        <div style="padding: 10px; border: 1px solid #EEE; background: #FFF0F2; color: var(--primary-red); font-weight: bold;">29</div><div style="padding: 10px; border: 1px solid #EEE;">30</div><div style="padding: 10px; border: 1px solid #EEE;">31</div>
                    </div>
                    <div style="margin-top: 30px;">
                        <h3 style="font-size: 1.1rem; margin-bottom: 15px;">Eventos del mes</h3>
                        ${events.map(e => `<div style="padding: 10px; border-bottom: 1px solid #EEE;"><strong>${e.date}</strong> - ${e.title} (${e.time})</div>`).join('')}
                    </div>
                </div>
            `;
        }
    }
}