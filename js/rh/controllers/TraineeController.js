import { TraineeModel } from '../models/TraineeModel.js';
import { TraineeView } from '../views/TraineeView.js';

const POR_PAGINA = 5;

export class TraineeController {
    /**
     * @param navegar   función (vista, menu) que cambia de pantalla (viene de main-rh.js)
     * @param alCambiar función que se llama cada vez que cambia la lista (para los módulos que aún la usan)
     */
    constructor({ navegar, alCambiar = () => {}, alAbrirExpediente = () => {} }) {
        this.model = new TraineeModel();
        this.view = new TraineeView();
        this.navegar = navegar;
        this.alCambiar = alCambiar;
        this.alAbrirExpediente = alAbrirExpediente;

        this.pagina = 1;
        this.editandoId = null;
        this.expedienteId = null;

        this.conectarEventos();
        this.cargar();
    }

    conectarEventos() {
        const v = this.view;

        v.alCambiarFiltros(() => { this.pagina = 1; this.refrescar(); });
        v.alClicNuevo(() => { this.editandoId = null; v.abrirModal(); });
        v.alCerrarModal(() => this.cerrarModal());
        v.alGuardar(() => this.guardar());
        v.alClicTabla((accion, id) => { if (accion === 'ver') this.mostrarExpediente(id); });
        v.alVolver(() => this.volver());
        v.alEditarExpediente(() => this.editarDesdeExpediente());
        v.alCambiarEstatusExpediente((estatus) => this.cambiarEstatus(estatus));
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
        const filtrados = this.model.filtrar(this.view.obtenerFiltros());
        const totalPaginas = Math.max(1, Math.ceil(filtrados.length / POR_PAGINA));
        if (this.pagina > totalPaginas) this.pagina = totalPaginas;

        const inicio = (this.pagina - 1) * POR_PAGINA;
        const fin = inicio + POR_PAGINA;

        this.view.renderContadores(this.model.contarPorEstatus());
        this.view.renderTabla(filtrados.slice(inicio, fin));
        this.view.renderPaginacion(
            {
                pagina: this.pagina,
                totalPaginas,
                desde: filtrados.length === 0 ? 0 : inicio + 1,
                hasta: Math.min(fin, filtrados.length),
                total: filtrados.length,
            },
            (nuevaPagina) => { this.pagina = nuevaPagina; this.refrescar(); }
        );
        this.alCambiar(this.model.lista);
    }

    /* ---------- Guardar (nuevo o editar) ---------- */
    validar(d) {
        if (!d.nombre || !d.apellidos) return 'Nombre y apellidos son obligatorios.';
        if (!d.telefono) return 'El teléfono es obligatorio.';
        if (!/^[0-9+\-\s()]{7,20}$/.test(d.telefono)) return 'El teléfono no tiene un formato válido.';
        if (!d.universidad) return 'La universidad es obligatoria.';
        if (!d.carrera) return 'La carrera es obligatoria.';
        if (!d.turno) return 'El turno es obligatorio.';
        return null;
    }

    async guardar() {
        const datos = this.view.leerFormulario();
        const error = this.validar(datos);
        if (error) { alert(error); return; }

        this.view.bloquearGuardar(true);
        try {
            if (this.editandoId) await this.model.actualizar(this.editandoId, datos);
            else await this.model.crear(datos);

            this.cerrarModal();
            this.pagina = 1;
            this.refrescar();

            // Si estaba abierto el expediente, se actualiza con los datos nuevos
            const abierto = this.expedienteId && this.model.obtener(this.expedienteId);
            if (abierto) this.view.renderExpediente(abierto);
        } catch (e) {
            alert('No se pudo guardar: ' + e.message);
        } finally {
            this.view.bloquearGuardar(false);
        }
    }

    cerrarModal() {
        this.view.cerrarModal();
        this.editandoId = null;
    }

    /* ---------- Expediente ---------- */
    mostrarExpediente(id) {
        const trainee = this.model.obtener(id);
        if (!trainee) return;
        this.expedienteId = id;
        this.view.renderExpediente(trainee);
        this.view.activarPestana('general');
        this.navegar('view-rh-expediente', 'view-rh-trainees');
        this.alAbrirExpediente(id);
    }

    volver() {
        this.expedienteId = null;
        this.navegar('view-rh-trainees', 'view-rh-trainees');
    }

    editarDesdeExpediente() {
        const trainee = this.model.obtener(this.expedienteId);
        if (!trainee) { alert('No se encontró el trainee.'); return; }
        this.editandoId = trainee.id;
        this.view.abrirModal(trainee);
    }

    async cambiarEstatus(estatus) {
        if (!this.expedienteId) return;
        try {
            await this.model.cambiarEstatus(this.expedienteId, estatus);
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
        // En ambos casos se redibuja con el valor real que está en la BD
        const t = this.model.obtener(this.expedienteId);
        if (t) this.view.renderExpediente(t);
        this.refrescar();
    }
}