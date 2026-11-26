import { api } from '../api.js';

export class JcfModel {
    constructor() {
        this.lista = [];
    }

    async cargar() {
        this.lista = await api('jcf.php');
        return this.lista;
    }

    obtener(id) {
        return this.lista.find((j) => j.id === Number(id));
    }

    filtrar({ texto = '', estatus = 'todos', profesion = '', experiencia = '' } = {}) {
        const buscar = texto.toLowerCase().trim();
        const prof = profesion.toLowerCase().trim();
        const exp = experiencia.toLowerCase().trim();

        return this.lista.filter((j) => {
            if (buscar && !`${j.nombre} ${j.apellidos}`.toLowerCase().includes(buscar)) return false;
            if (prof && !(j.profesion || '').toLowerCase().includes(prof)) return false;
            if (exp && !(j.experiencia || '').toLowerCase().includes(exp)) return false;
            if (estatus !== 'todos' && j.estatus !== estatus) return false;
            return true;
        });
    }

    contarPorEstatus() {
        const cuenta = (e) => this.lista.filter((j) => j.estatus === e).length;
        return {
            total: this.lista.length,
            pendientes: cuenta('Pendiente'),
            aprobados: cuenta('Aprobado'),
            rechazados: cuenta('Rechazado'),
        };
    }

    async crear(datos) {
        await api('jcf.php', { method: 'POST', body: { accion: 'crear', ...datos } });
        await this.cargar();
    }

    async actualizar(id, datos) {
        await api('jcf.php', { method: 'POST', body: { accion: 'actualizar', id, ...datos } });
        await this.cargar();
    }

    async cambiarEstatus(id, estatus) {
        await api('jcf.php', { method: 'POST', body: { accion: 'cambiar_estatus', id, estatus } });
        await this.cargar();
    }
}
