import { api } from '../api.js';

export class TraineeModel {
    constructor() {
        this.lista = [];
    }

    async cargar() {
        this.lista = await api('trainees.php');
        return this.lista;
    }

    obtener(id) {
        return this.lista.find((t) => t.id === Number(id));
    }

    filtrar({ texto = '', estatus = 'todos', universidad = '', carrera = '', turno = 'todos' } = {}) {
        const buscar = texto.toLowerCase().trim();
        const uni = universidad.toLowerCase().trim();
        const car = carrera.toLowerCase().trim();

        return this.lista.filter((t) => {
            if (buscar && !`${t.nombre} ${t.apellidos}`.toLowerCase().includes(buscar)) return false;
            if (uni && !(t.universidad || '').toLowerCase().includes(uni)) return false;
            if (car && !(t.carrera || '').toLowerCase().includes(car)) return false;
            if (estatus !== 'todos' && t.estatus !== estatus) return false;
            if (turno !== 'todos' && t.turno !== turno) return false;
            return true;
        });
    }

    contarPorEstatus() {
        const cuenta = (e) => this.lista.filter((t) => t.estatus === e).length;
        return {
            total: this.lista.length,
            pendientes: cuenta('Pendiente'),
            aprobados: cuenta('Aprobado'),
            rechazados: cuenta('Rechazado'),
        };
    }

    async crear(datos) {
        await api('trainees.php', { method: 'POST', body: { accion: 'crear', ...datos } });
        await this.cargar();
    }

    async actualizar(id, datos) {
        await api('trainees.php', { method: 'POST', body: { accion: 'actualizar', id, ...datos } });
        await this.cargar();
    }

    async cambiarEstatus(id, estatus) {
        await api('trainees.php', { method: 'POST', body: { accion: 'cambiar_estatus', id, estatus } });
        await this.cargar();
    }
}