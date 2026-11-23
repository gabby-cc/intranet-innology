import { EntrevistaModel } from '../models/EntrevistaModel.js';
import { EntrevistaView } from '../views/EntrevistaView.js';

export class EntrevistaController {
    /**
     * @param obtenerCandidatos función (tipo) => [{ id, nombre }] con los Trainees o JCF registrados
     */
    constructor({ obtenerCandidatos }) {
        this.model = new EntrevistaModel();
        this.view = new EntrevistaView();
        this.obtenerCandidatos = obtenerCandidatos;

        this.mes = new Date();
        this.editandoId = null;
        this.expedienteActual = null;   // { tipo, id } del expediente que está abierto

        this.conectarEventos();
        this.cargar();
    }

    conectarEventos() {
        const v = this.view;

        v.alClicNueva(() => this.nueva());
        v.alCambiarMes((delta) => this.moverMes(delta));
        v.alClicCalendario((accion, datos) => {
            if (accion === 'editar') this.editar(datos.id);
            else this.nueva({ fecha: datos.fecha });
        });
        v.alCambiarFiltros(() => this.view.renderTabla(this.model.filtrar(this.view.obtenerFiltros())));
        v.alClicTabla((accion, datos) => {
            if (accion === 'editar') this.editar(datos.id);
            else this.cambiarEstatus(datos.id, datos.estatus);
        });
        v.alClicPaneles((accion, datos) => {
            if (accion === 'programar') this.nueva({ tipo: datos.tipo, candidatoId: datos.candidatoId });
            else if (accion === 'editar') this.editar(datos.id);
        });
        v.alCerrarModal(() => this.cerrarModal());
        v.alGuardar(() => this.guardar());
        v.alCambiarTipo((tipo) => v.llenarCandidatos(this.obtenerCandidatos(tipo)));
    }

    async cargar() {
        try {
            await this.model.cargar();
            this.refrescar();
        } catch (error) {
            this.view.mostrarError(error.message);
            this.view.renderCalendario(this.mes, () => []);
        }
    }

    refrescar() {
        this.view.renderCalendario(this.mes, (fecha) => this.model.delDia(fecha));
        this.view.renderTabla(this.model.filtrar(this.view.obtenerFiltros()));
        this.pintarExpediente();
    }

    moverMes(delta) {
        this.mes = new Date(this.mes.getFullYear(), this.mes.getMonth() + delta, 1);
        this.view.renderCalendario(this.mes, (fecha) => this.model.delDia(fecha));
    }

    /* ---------- Expedientes (los llaman TraineeController y JcfController) ---------- */
    mostrarEnExpediente(tipo, id) {
        this.expedienteActual = { tipo, id: Number(id) };
        this.pintarExpediente();
    }

    pintarExpediente() {
        if (!this.expedienteActual) return;
        const { tipo, id } = this.expedienteActual;
        this.view.renderPanel(tipo, id, this.model.deCandidato(tipo, id));
    }

    /* ---------- Modal ---------- */
    nueva({ fecha = null, tipo = 'Trainee', candidatoId = null } = {}) {
        this.editandoId = null;
        this.view.abrirModalNueva({ fecha, tipo, candidatos: this.obtenerCandidatos(tipo), candidatoId });
    }

    editar(id) {
        const entrevista = this.model.obtener(id);
        if (!entrevista) return;
        this.editandoId = entrevista.id;
        this.view.abrirModalEditar(entrevista);
    }

    cerrarModal() {
        this.view.cerrarModal();
        this.editandoId = null;
    }

    validar(d) {
        if (!this.editandoId && !d.candidato_id) return 'Por favor selecciona un candidato.';
        if (!d.fecha) return 'La fecha es obligatoria.';
        if (!d.hora) return 'La hora es obligatoria.';
        if (d.modalidad === 'Online' && d.enlace && !/^https?:\/\//i.test(d.enlace)) {
            return 'El enlace debe empezar con https://';
        }
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
            this.refrescar();
        } catch (e) {
            alert('No se pudo guardar: ' + e.message);
        } finally {
            this.view.bloquearGuardar(false);
        }
    }

    async cambiarEstatus(id, estatus) {
        try {
            await this.model.cambiarEstatus(id, estatus);
        } catch (e) {
            alert('No se pudo cambiar el estado: ' + e.message);
        }
        this.refrescar();   // si falló, regresa el select al valor real
    }
}