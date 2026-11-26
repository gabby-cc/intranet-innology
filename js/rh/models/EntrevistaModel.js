import { api } from '../api.js';

export const ESTATUS = {
    Programada: 'Programada',
    Realizada: 'Realizada',
    Cancelada: 'Cancelada',
    'No asistio': 'No asistió',
};

export class EntrevistaModel {
    constructor() {
        this.lista = [];
    }

    async cargar() {
        this.lista = await api('entrevistas.php');
        return this.lista;
    }

    obtener(id) {
        return this.lista.find((e) => e.id === Number(id));
    }

    // Entrevistas de un día (formato AAAA-MM-DD) para el calendario
    delDia(fecha) {
        return this.lista.filter((e) => e.fecha === fecha);
    }

    // Historial de un candidato para su expediente (la más reciente primero)
    deCandidato(tipo, candidatoId) {
        return this.lista
            .filter((e) => e.tipo === tipo && e.candidato_id === Number(candidatoId))
            .sort((a, b) => b.filtro - a.filtro);
    }

    filtrar({ texto = '', tipo = 'todos', estatus = 'todos', fecha = '' } = {}) {
        const buscar = texto.toLowerCase().trim();
        return this.lista.filter((e) => {
            if (buscar && !e.candidato_nombre.toLowerCase().includes(buscar)) return false;
            if (tipo !== 'todos' && e.tipo !== tipo) return false;
            if (estatus !== 'todos' && e.estatus !== estatus) return false;
            if (fecha && e.fecha !== fecha) return false;
            return true;
        });
    }

    async crear(datos) {
        await api('entrevistas.php', { method: 'POST', body: { accion: 'crear', ...datos } });
        await this.cargar();
    }

    async actualizar(id, datos) {
        await api('entrevistas.php', { method: 'POST', body: { accion: 'actualizar', id, ...datos } });
        await this.cargar();
    }

    async cambiarEstatus(id, estatus) {
        await api('entrevistas.php', { method: 'POST', body: { accion: 'cambiar_estatus', id, estatus } });
        await this.cargar();
    }
}