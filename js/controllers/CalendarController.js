import { EventModel } from '../models/EventModel.js';
import { CalendarView } from '../views/CalendarView.js';

export class CalendarController {
    constructor() {
        this.model = new EventModel();
        this.view = new CalendarView();
        this.init();
    }

    init() {
        const events = this.model.getAllEvents();
        
        // 1. Pintar los próximos eventos en el inicio
        this.view.renderUpcomingEvents(events);
        
        // 2. Preparar la vista del calendario
        this.view.renderCalendar(events);

        // 3. Escuchar el clic en "Ver calendario" del inicio
        const btnVerCalendario = document.querySelector('.card a.link-red[href="#"]');
        if (btnVerCalendario) {
            btnVerCalendario.removeAttribute('onclick');
            btnVerCalendario.addEventListener('click', (e) => {
                e.preventDefault();
                // Simulamos el clic en el menú lateral para ir a calendario
                document.querySelector('.menu-item[data-target="view-calendario"]').click();
            });
        }
    }
}