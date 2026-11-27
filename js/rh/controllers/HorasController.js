import { HorasModel, norm } from '../models/HorasModel.js';
import { HorasView } from '../views/HorasView.js';
import { leerExcelChecador } from '../checadorParser.js';

export class HorasController {
    constructor({ obtenerTrainees }) {
        this.model = new HorasModel();
        this.view = new HorasView();
        this.obtenerTrainees = obtenerTrainees;

        this.editandoId = null;
        this.importacion = null;
        this.expedienteTraineeId = null;

        this.conectarEventos();
        this.cargar();
    }

    conectarEventos() {
        const v = this.view;

        v.alClicNuevo(() => this.nuevo());
        v.alCambiarFiltros(() => this.refrescar());
        v.alClicTabla((accion, datos) => { if (accion === 'editar') this.editar(datos.id); });
        v.alClicPanel((accion, datos) => {
            if (accion === 'registrar') this.nuevo(datos.traineeId);
            else if (accion === 'editar') this.editar(datos.id);
            else if (accion === 'limpiar') { v.limpiarFiltrosPanel(); this.pintarExpediente(); }
        });
        v.alFiltrarPanel(() => this.pintarExpediente());
        v.alCerrarModal(() => this.cerrarModal());
        v.alGuardar(() => this.guardar());

        v.alClicImportar(() => { this.importacion = null; v.abrirImportacion(); });
        v.alCerrarImportacion(() => this.cerrarImportacion());
        v.alElegirArchivo((archivo) => this.abrirArchivo(archivo));
        v.alCambiarAsignacion((idChecador, traineeId) => {
            if (!this.importacion) return;
            this.importacion.mapa[idChecador] = traineeId;
            this.pintarVistaPrevia();
        });
        v.alConfirmarImportacion(() => this.confirmarImportacion());
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
        const filtradas = this.model.filtrar(this.view.obtenerFiltros());
        this.view.renderTarjetas(this.model.resumen(filtradas), this.model.ultima);
        this.view.renderTabla(filtradas);
        this.pintarExpediente();
    }

    mostrarEnExpediente(traineeId) {
        this.expedienteTraineeId = Number(traineeId);
        this.view.renderPanel(this.expedienteTraineeId);
        this.pintarExpediente();
    }

    pintarExpediente() {
        if (!this.expedienteTraineeId) return;
        const id = this.expedienteTraineeId;
        const filtrados = this.model.deTraineeFiltrados(id, this.view.obtenerFiltrosPanel());
        this.view.actualizarPanel(filtrados, this.model.resumen(filtrados), this.model.deTrainee(id).length > 0);
    }

    nuevo(traineeId = null) {
        this.editandoId = null;
        this.view.abrirModal({ trainees: this.obtenerTrainees(), traineeId });
    }

    editar(id) {
        const registro = this.model.obtener(id);
        if (!registro) return;
        this.editandoId = registro.id;
        this.view.abrirModal({ trainees: this.obtenerTrainees(), registro });
    }

    cerrarModal() {
        this.view.cerrarModal();
        this.editandoId = null;
    }

    validar(d) {
        const aMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
        if (!d.trainee_id) return 'Selecciona un Trainee.';
        if (!d.fecha) return 'La fecha es obligatoria.';
        if (!d.entrada) return 'La hora de entrada es obligatoria.';
        if (d.salida && aMin(d.salida) <= aMin(d.entrada)) return 'La hora de salida debe ser posterior a la de entrada.';

        const duplicado = this.model.lista.some((h) =>
            h.trainee_id === d.trainee_id && h.fecha === d.fecha && h.id !== this.editandoId);
        if (duplicado) return 'Ya existe un registro de este Trainee en esa fecha. Edítalo en lugar de crear otro.';
        return null;
    }

    async guardar() {
        const datos = this.view.leerFormulario();
        const error = this.validar(datos);
        if (error) { alert(error); return; }

        this.view.bloquearGuardar(true);
        try {
            const esEdicion = !!this.editandoId;
            if (esEdicion) await this.model.actualizar(this.editandoId, datos);
            else await this.model.crear(datos);
            this.cerrarModal();
            this.refrescar();

            window.dispatchEvent(new CustomEvent('rhAccion', {
                detail: { mensaje: `Se ha ${esEdicion ? 'actualizado' : 'registrado'} un registro de horas.`, tipo: 'horas' }
            }));
        } catch (e) {
            alert('No se pudo guardar: ' + e.message);
        } finally {
            this.view.bloquearGuardar(false);
        }
    }

    buscarTraineePorNombre(nombre, trainees) {
        const n = norm(nombre);
        if (n.length < 3) return 0;
        const coincidencias = trainees.filter((t) => {
            const f = norm(t.nombre);
            return f === n || f.includes(n) || n.includes(f);
        });
        return coincidencias.length === 1 ? coincidencias[0].id : 0;
    }

    async abrirArchivo(archivo) {
        try {
            const resultado = await leerExcelChecador(archivo);
            const trainees = this.obtenerTrainees();

            this.importacion = { archivo: archivo.name, ...resultado, mapa: {} };
            resultado.empleados.forEach((emp) => {
                const guardado = this.model.mapa[emp.id];
                this.importacion.mapa[emp.id] = (guardado && trainees.some((t) => t.id === guardado))
                    ? guardado
                    : this.buscarTraineePorNombre(emp.nombre, trainees);
            });

            this.view.mostrarPaso2(
                {
                    archivo: archivo.name,
                    inicio: resultado.inicio,
                    fin: resultado.fin,
                    totalEmpleados: resultado.empleados.length,
                    totalRegistros: resultado.empleados.reduce((a, e) => a + e.registros.length, 0),
                },
                resultado.empleados,
                trainees,
                this.importacion.mapa
            );
            this.pintarVistaPrevia();
        } catch (e) {
            alert(e.message);
        }
    }

    construirRegistrosImportados() {
        const trainees = this.obtenerTrainees();
        const lista = [];

        this.importacion.empleados.forEach((emp) => {
            const traineeId = this.importacion.mapa[emp.id];
            const trainee = trainees.find((t) => t.id === traineeId);
            if (!trainee) return;

            emp.registros.forEach((r) => {
                const entrada = r.marcas[0];
                const salida = r.marcas.length > 1 ? r.marcas[r.marcas.length - 1] : '';
                let observaciones = '';
                if (r.marcas.length === 1) observaciones = 'Solo hay una marca en el checador';
                else if (r.marcas.length > 2) observaciones = `El checador tiene ${r.marcas.length} marcas ese día`;

                lista.push({
                    trainee_id: traineeId,
                    trainee_nombre: trainee.nombre,
                    fecha: r.fecha,
                    entrada,
                    salida,
                    observaciones,
                    duplicado: this.model.existe(traineeId, r.fecha),
                });
            });
        });
        return lista.sort((a, b) => a.trainee_nombre.localeCompare(b.trainee_nombre) || a.fecha.localeCompare(b.fecha));
    }

    pintarVistaPrevia() {
        const lista = this.construirRegistrosImportados();
        const nuevos = lista.filter((r) => !r.duplicado);
        this.view.renderVistaPrevia(lista, {
            nuevos: nuevos.length,
            incompletos: nuevos.filter((r) => !r.salida).length,
            duplicados: lista.length - nuevos.length,
            sinAsignar: this.importacion.empleados.filter((e) => !this.importacion.mapa[e.id]).length,
        });
    }

    cerrarImportacion() {
        this.view.cerrarImportacion();
        this.importacion = null;
    }

    async confirmarImportacion() {
        if (!this.importacion) return;
        const nuevos = this.construirRegistrosImportados().filter((r) => !r.duplicado);
        if (nuevos.length === 0) { alert('No hay registros nuevos para guardar.'); return; }

        const registros = nuevos.map(({ trainee_id, fecha, entrada, salida, observaciones }) =>
            ({ trainee_id, fecha, entrada, salida, observaciones }));
        const mapa = Object.entries(this.importacion.mapa)
            .filter(([, traineeId]) => traineeId)
            .map(([idChecador, traineeId]) => ({ id_checador: idChecador, trainee_id: traineeId }));

        this.view.bloquearConfirmar(true);
        try {
            const r = await this.model.importar(registros, mapa);
            const incompletos = nuevos.filter((x) => !x.salida).length;
            this.cerrarImportacion();
            this.refrescar();

            window.dispatchEvent(new CustomEvent('rhAccion', {
                detail: { mensaje: `Se importaron ${r.insertados} registros de horas del checador (${incompletos} incompletos).`, tipo: 'horas' }
            }));

            alert(`Importación lista: ${r.insertados} registros guardados (${incompletos} incompletos por revisar)` +
                (r.omitidos ? `, ${r.omitidos} omitidos por ya existir.` : '.'));
        } catch (e) {
            alert('No se pudo importar: ' + e.message);
        } finally {
            this.view.bloquearConfirmar(false);
        }
    }
}