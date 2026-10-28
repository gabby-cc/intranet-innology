export class UserModel {
    constructor() {
        this.user = { name: "Laura", role: "Cliente", date: "Jueves, 22 de octubre de 2026" };
        this.stats = [
            { count: 3, label: "Tickets abiertos" },
            { count: 6, label: "Documentos compartidos" },
            { count: 3, label: "Reuniones agendadas" }
        ];
    }
    getUser() { return this.user; }
    getStats() { return this.stats; }
}