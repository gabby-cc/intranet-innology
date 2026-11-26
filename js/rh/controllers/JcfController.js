import { JcfModel } from '../models/JcfModel.js';
import { JcfView } from '../views/JcfView.js';

const POR_PAGINA = 5;

export class JcfController {
    constructor({ navegar, alCambiar = () => {}, alAbrirExpediente = () => {} }) {
        this.model = new JcfModel();
        this.view = new JcfView();
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

    validar(d) {
        if (!d.nombre || !d.apellidos) return 'Nombre y apellidos son obligatorios.';
        if (d.telefono && !/^[0-9+\-\s()]{7,20}$/.test(d.telefono)) return 'El teléfono no tiene un formato válido.';
        if (!d.profesion) return 'La profesión o puesto es obligatoria.';
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

    mostrarExpediente(id) {
        const joven = this.model.obtener(id);
        if (!joven) return;
        this.expedienteId = id;
        this.view.renderExpediente(joven);
        this.view.activarPestana('general');
        this.navegar('view-rh-expediente-jcf', 'view-rh-jcf');
        this.alAbrirExpediente(id);
    }

    volver() {
        this.expedienteId = null;
        this.navegar('view-rh-jcf', 'view-rh-jcf');
    }

    editarDesdeExpediente() {
        const joven = this.model.obtener(this.expedienteId);
        if (!joven) { alert('No se encontró el registro.'); return; }
        this.editandoId = joven.id;
        this.view.abrirModal(joven);
    }

    async cambiarEstatus(estatus) {
        if (!this.expedienteId) return;
        try {
            await this.model.cambiarEstatus(this.expedienteId, estatus);
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
        const j = this.model.obtener(this.expedienteId);
        if (j) this.view.renderExpediente(j);
        this.refrescar();
    }
}
