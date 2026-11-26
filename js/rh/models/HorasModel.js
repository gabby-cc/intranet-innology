import { api } from '../api.js';

/* ---------- Utilidades de tiempo (se usan en el modelo, la vista y el controlador) ---------- */
export function aMin(t) {
    if (!t) return null;
    const [h, m] = t.split(':').map(Number);
    return h * 60 + m;
}

export function fmtDur(min) {
    return `${Math.floor(min / 60)}h ${String(min % 60).padStart(2, '0')}m`;
}

// Minutos trabajados; null si el registro está incompleto
export function minutosDe(h) {
    const e = aMin(h.entrada);
    const s = aMin(h.salida);
    if (e === null || s === null || s <= e) return null;
    return s - e;
}

// Sin hora de salida = Incompleto
export const estadoDe = (h) => (h.salida ? 'Autorizado' : 'Incompleto');

// Retardo: llegó después de la hora de su turno + la tolerancia
export const esRetardo = (h) => (h.retardo_min ?? 0) > 0;

// Quita acentos y mayúsculas para comparar nombres
export function norm(s) {
    return String(s ?? '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim();
}

export class HorasModel {
    constructor() {
        this.lista = [];
        this.mapa = {};                       // { idChecador: idTrainee }
        this.ultima = { fecha: null, hasta: null };
    }

    async cargar() {
        const datos = await api('horas.php');
        this.lista = datos.registros;
        this.mapa = datos.mapa;
        this.ultima = datos.ultima_importacion;
        return this.lista;
    }

    obtener(id) {
        return this.lista.find((h) => h.id === Number(id));
    }

    filtrar({ texto = '', desde = '', hasta = '', estado = 'todos' } = {}) {
        const buscar = norm(texto);
        return this.lista.filter((h) => {
            if (buscar && !norm(h.trainee_nombre).includes(buscar)) return false;
            if (desde && h.fecha < desde) return false;
            if (hasta && h.fecha > hasta) return false;
            if (estado === 'Retardo') {
                if (!esRetardo(h)) return false;
            } else if (estado !== 'todos' && estadoDe(h) !== estado) {
                return false;
            }
            return true;
        });
    }

    resumen(registros) {
        let minutos = 0;
        registros.forEach((h) => { minutos += minutosDe(h) || 0; });
        return {
            totalMin: minutos,
            registros: registros.length,
            incompletos: registros.filter((h) => !h.salida).length,
            retardos: registros.filter(esRetardo).length,
        };
    }

    deTrainee(traineeId) {
        return this.lista.filter((h) => h.trainee_id === Number(traineeId));
    }

        // Registros de un Trainee aplicando los filtros de su expediente (rango de fechas y estado)
    deTraineeFiltrados(traineeId, { desde = '', hasta = '', estado = 'todos' } = {}) {
        return this.filtrar({ desde, hasta, estado }).filter((h) => h.trainee_id === Number(traineeId));
    }

    existe(traineeId, fecha) {
        return this.lista.some((h) => h.trainee_id === Number(traineeId) && h.fecha === fecha);
    }

    async crear(datos) {
        await api('horas.php', { method: 'POST', body: { accion: 'crear', ...datos } });
        await this.cargar();
    }

    async actualizar(id, datos) {
        await api('horas.php', { method: 'POST', body: { accion: 'actualizar', id, ...datos } });
        await this.cargar();
    }

    async importar(registros, mapa) {
        const resultado = await api('horas.php', { method: 'POST', body: { accion: 'importar', registros, mapa } });
        await this.cargar();
        return resultado;
    }
}