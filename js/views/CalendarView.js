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

    renderCalendar(events, currentMonth, currentYear) {
        const grid = document.getElementById('calendar-days');
        const list = document.getElementById('calendar-events-list');
        const title = document.getElementById('calendar-month-year');
        
        if (!grid || !list) return;

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        if (title) title.textContent = `${monthNames[currentMonth]} de ${currentYear}`;

        grid.innerHTML = '';
        list.innerHTML = '';

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1;

        for (let i = 0; i < startDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            grid.appendChild(emptyDiv);
        }

        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        const today = new Date();

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            if (currentMonth === today.getMonth() && currentYear === today.getFullYear() && day === today.getDate()) {
                dayDiv.classList.add('today');
            }

            let dayHTML = `<div class="calendar-day-number">${day}</div>`;
            
            if (dayEvents.length > 0) {
                dayHTML += `<div class="calendar-day-events">`;
                dayEvents.forEach(event => {
                    dayHTML += `
                        <div class="calendar-event-block" data-full-title="${event.title} (${event.time})" title="${event.title}">
                            • ${event.title}
                        </div>
                    `;
                });
                dayHTML += `</div>`;
            }

            dayDiv.innerHTML = dayHTML;
            grid.appendChild(dayDiv);

            dayEvents.forEach(event => {
                const item = document.createElement('div');
                item.className = 'event-item-list';
                item.innerHTML = `
                    <div class="event-date">
                        <strong>${day}</strong>
                        <span>${monthNames[currentMonth].substring(0, 3)}</span>
                    </div>
                    <div class="event-info">
                        <h4>${event.title}</h4>
                        <p>${event.time} · ${event.type || 'Reunión'}</p>
                    </div>
                `;
                list.appendChild(item);
            });
        }

        if (list.innerHTML === '') {
            list.innerHTML = '<p style="color:#9CA3AF;font-size:.85rem;text-align:center;padding:20px;">No hay eventos programados para este mes.</p>';
        }
    }
}