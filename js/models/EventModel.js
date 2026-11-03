export class EventModel {
    constructor() {
        this.events = [
            { id: 1, title: "Capacitación a usuarios clave", date: "2026-10-19", time: "09:00", type: "Reunión" },
            { id: 2, title: "Reunión de seguimiento semanal", date: "2026-10-21", time: "10:00", type: "Reunión" },
            { id: 3, title: "Revisión de pruebas de cuentas por pagar", date: "2026-10-29", time: "10:30", type: "Reunión" }
        ];
    }
    getAllEvents() { return this.events; }
}