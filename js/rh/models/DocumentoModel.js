import { api, apiForm } from '../api.js';



export const EXT_PLANTILLA = ['pdf', 'docx', 'txt', 'xlsx', 'pptx'];
export const EXT_CV = ['pdf', 'doc', 'docx'];
export const MAX_PLANTILLA_MB = 10;
export const MAX_CV_MB = 5;

// Devuelve un mensaje de error, o null si el archivo es válido
export function validarArchivo(archivo, extensiones, maxMB) {
    const ext = archivo.name.split('.').pop().toLowerCase();
    if (!extensiones.includes(ext)) return `Formato no permitido. Solo se aceptan: ${extensiones.map((e) => '.' + e).join(', ')}`;
    if (archivo.size === 0) return 'El archivo está vacío.';
    if (archivo.size > maxMB * 1024 * 1024) return `El archivo pesa más de ${maxMB} MB.`;
    return null;
}

export class DocumentoModel {
    constructor() {
        this.plantillas = [];
        this.cvs = [];
    }

    async cargar() {
        const datos = await api('documentos.php');
        this.plantillas = datos.plantillas;
        this.cvs = datos.cvs;
    }

    obtenerPlantilla(id) {
        return this.plantillas.find((p) => p.id === Number(id));
    }

    filtrarPlantillas({ texto = '', formato = 'todos', estado = 'todos' } = {}) {
        const buscar = texto.toLowerCase().trim();
        return this.plantillas.filter((p) => {
            if (buscar && !p.nombre.toLowerCase().includes(buscar)) return false;
            if (formato !== 'todos' && p.formato !== formato) return false;
            if (estado === 'Activo' && !p.activo) return false;
            if (estado === 'Inactivo' && p.activo) return false;
            return true;
        });
    }

    contarPlantillas() {
        const activas = this.plantillas.filter((p) => p.activo).length;
        return { total: this.plantillas.length, activas, inactivas: this.plantillas.length - activas };
    }

    // CV de un candidato, el más reciente primero
    cvsDe(tipo, candidatoId) {
        return this.cvs.filter((c) => c.tipo === tipo && c.candidato_id === Number(candidatoId));
    }

        async guardarPlantilla(id, { nombre, descripcion, activo }, archivo) {
        const f = new FormData();
        f.append('accion', id ? 'actualizar_plantilla' : 'subir_plantilla');
        if (id) f.append('id', id);
        f.append('nombre', nombre);
        f.append('descripcion', descripcion);
        f.append('activo', activo ? '1' : '0');
        if (archivo) f.append('archivo', archivo);
        await apiForm('documentos.php', f);
        await this.cargar();
    }

    async cambiarActivo(id, activo) {
        const f = new FormData();
        f.append('accion', 'cambiar_activo');
        f.append('id', id);
        f.append('activo', activo ? '1' : '0');
        await apiForm('documentos.php', f);
        await this.cargar();
    }

        async subirDocumento(tipo, candidatoId, { nombre, descripcion }, archivo) {
        const f = new FormData();
        f.append('accion', 'subir_cv');
        f.append('tipo', tipo);
        f.append('candidato_id', candidatoId);
        f.append('nombre', nombre);
        f.append('descripcion', descripcion);
        f.append('archivo', archivo);
        await apiForm('documentos.php', f);
        await this.cargar();
    }
}