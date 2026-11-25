import { DocumentoModel, validarArchivo, EXT_PLANTILLA, EXT_CV, MAX_PLANTILLA_MB, MAX_CV_MB } from '../models/DocumentoModel.js';
import { DocumentoView } from '../views/DocumentoView.js';
import { urlDescarga } from '../api.js';

export class DocumentoController {
    constructor() {
        this.model = new DocumentoModel();
        this.view = new DocumentoView();

        this.editandoId = null;
        this.expedienteActual = null;   // { tipo, id } del expediente abierto

        this.conectarEventos();
        this.cargar();
    }

    conectarEventos() {
        const v = this.view;

        v.alClicNueva(() => { this.editandoId = null; v.abrirModal(); });
        v.alCambiarFiltros(() => this.refrescar());
        v.alClicTabla((accion, id) => {
            if (accion === 'descargar') this.descargar('plantilla', id);
            else if (accion === 'editar') this.editar(id);
            else if (accion === 'activar') this.alternarActivo(id);
        });
        v.alCerrarModal(() => this.cerrarModal());
        v.alGuardar(() => this.guardar());
        v.alClicPaneles((accion, datos) => {
            if (accion === 'descargar-doc') this.descargar('cv', datos.id);
            else if (accion === 'subir-doc') this.subirDocumento(datos);
        });
    }

    async cargar() {
        try {
            await this.model.cargar();
            this.refrescar();
        } catch (error) {
            this.view.mostrarError(error.message);
        }
    }

    refrescar() {
        this.view.renderContadores(this.model.contarPlantillas());
        this.view.renderTabla(this.model.filtrarPlantillas(this.view.obtenerFiltros()));
        this.pintarExpediente();
    }

    descargar(tipo, id) {
        window.open(urlDescarga(tipo, id), '_blank');
    }

    /* ---------- Plantillas ---------- */
    editar(id) {
        const plantilla = this.model.obtenerPlantilla(id);
        if (!plantilla) return;
        this.editandoId = plantilla.id;
        this.view.abrirModal(plantilla);
    }

    cerrarModal() {
        this.view.cerrarModal();
        this.editandoId = null;
    }

    async guardar() {
        const datos = this.view.leerFormulario();
        const archivo = this.view.archivoSeleccionado();

        if (!datos.nombre) { alert('El nombre de la plantilla es obligatorio.'); return; }
        if (!this.editandoId && !archivo) { alert('Por favor selecciona un archivo.'); return; }
        if (archivo) {
            const error = validarArchivo(archivo, EXT_PLANTILLA, MAX_PLANTILLA_MB);
            if (error) { alert(error); return; }
        }

        this.view.bloquearGuardar(true);
        try {
            await this.model.guardarPlantilla(this.editandoId, datos, archivo);
            this.cerrarModal();
            this.refrescar();
        } catch (e) {
            alert('No se pudo guardar: ' + e.message);
        } finally {
            this.view.bloquearGuardar(false);
        }
    }

    async alternarActivo(id) {
        const plantilla = this.model.obtenerPlantilla(id);
        if (!plantilla) return;
        try {
            await this.model.cambiarActivo(id, !plantilla.activo);
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
        this.refrescar();
    }

    /* ---------- Expedientes (los llaman TraineeController y JcfController) ---------- */
    mostrarEnExpediente(tipo, id) {
        this.expedienteActual = { tipo, id: Number(id) };
        this.pintarExpediente();
    }

    pintarExpediente() {
        if (!this.expedienteActual) return;
        const { tipo, id } = this.expedienteActual;
        this.view.renderPanel(tipo, id, this.model.cvsDe(tipo, id));
    }

        async subirDocumento({ tipo, candidatoId, nombre, descripcion, archivo }) {
        if (!nombre) { alert('El nombre del documento es obligatorio.'); return; }
        if (!archivo) { alert('Selecciona el archivo que quieres subir.'); return; }
        const error = validarArchivo(archivo, EXT_CV, MAX_CV_MB);
        if (error) { alert(error); return; }
        try {
            await this.model.subirDocumento(tipo, candidatoId, { nombre, descripcion }, archivo);
            this.refrescar();
        } catch (e) {
            alert('No se pudo subir el documento: ' + e.message);
        }
    }
}