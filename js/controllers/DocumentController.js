import { DocumentModel } from '../models/DocumentModel.js';
import { DocumentView } from '../views/DocumentView.js';
import { UserModel } from '../models/UserModel.js';
import { TicketModel } from '../models/TicketModel.js';

export class DocumentController {
    // ✅ CAMBIO: ahora recibe el ticketModel compartido (el mismo de main.js).
    // Antes se creaba un `new TicketModel()` propio al arrancar, y esa copia no se
    // enteraba de los tickets creados ni de las reasignaciones posteriores.
    constructor(model, userRole = 'cliente', currentUser = 'Laura Méndez', ticketModel = null) {
        this.model = model || new DocumentModel();
        this.view = new DocumentView();
        this.userRole = userRole;        // 'admin' | 'consultor' | 'cliente'
        this.currentUser = currentUser;  // nombre del usuario logueado
        this.ticketModel = ticketModel || new TicketModel();
        this.init();
    }

    // ✅ CAMBIO: la regla de visibilidad vive en un solo lugar (DocumentModel.getVisibleDocuments)
    // y la usan tanto esta pantalla como el buscador global.
    getDocumentosVisibles() {
        return this.model.getVisibleDocuments(this.currentUser, this.userRole, this.ticketModel);
    }

    init() {
        this.view.renderDocuments(this.getDocumentosVisibles());

        const filterText = document.getElementById('filter-docs');
        const filterFolder = document.getElementById('filter-doc-folder');

        const applyFilters = () => {
            const textValue = filterText ? filterText.value : '';
            const folderValue = filterFolder ? filterFolder.value : 'todas';
            // ✅ Primero filtramos por rol, luego por texto/carpeta
            const visibles = this.getDocumentosVisibles();
            const results = visibles.filter(doc => {
                const term = textValue.toLowerCase();
                const matchText = !term || doc.name.toLowerCase().includes(term) || doc.author.toLowerCase().includes(term);
                const matchFolder = folderValue === 'todas' || doc.folder === folderValue;
                return matchText && matchFolder;
            });
            this.view.renderDocuments(results);
        };

        if (filterText) filterText.addEventListener('input', applyFilters);
        if (filterFolder) filterFolder.addEventListener('change', applyFilters);

        const modal = document.getElementById('doc-modal');
        const btnAbrir = document.getElementById('btn-abrir-modal-doc');
        const btnCerrar = document.getElementById('btn-cerrar-modal-doc');
        const btnCancelar = document.getElementById('btn-cancelar-modal-doc');

        if (btnAbrir) {
            btnAbrir.addEventListener('click', () => {
                document.getElementById('doc-file-input').value = '';
                document.getElementById('doc-name-input').value = '';
                modal.classList.add('active');
            });
        }

        const closeModal = () => modal.classList.remove('active');
        if (btnCerrar) btnCerrar.addEventListener('click', closeModal);
        if (btnCancelar) btnCancelar.addEventListener('click', closeModal);

        const btnSubmit = document.getElementById('btn-submit-doc');
        if (btnSubmit) {
            btnSubmit.addEventListener('click', () => {
                const fileInput = document.getElementById('doc-file-input');
                const nameInput = document.getElementById('doc-name-input').value.trim();
                const folderSelect = document.getElementById('doc-folder-select').value;

                if (fileInput.files.length === 0) {
                    alert('Por favor, selecciona un archivo.');
                    return;
                }

                const file = fileInput.files[0];
                const nombreParaNotificar = nameInput || file.name;

                // ✅ Pasamos el usuario actual como autor
                this.model.addDocument(nameInput, folderSelect, file, this.currentUser);

                applyFilters();

                // ✅ Notificación lógica (sin cambios)
                const currentUser = JSON.parse(sessionStorage.getItem('innology_user'));
                if (window.notify && currentUser) {
                    const userModel = new UserModel();
                    const usuariosActivos = userModel.getAllUsers().filter(u => u.estado === 'Activo');

                    usuariosActivos.forEach(u => {
                        if ((u.rol === 'Administrador' || u.rol === 'Consultor') && u.nombre !== currentUser.nombre) {
                            window.notify({
                                titulo: 'Nuevo Documento Subido',
                                mensaje: `${currentUser.nombre} ha subido el documento: ${nombreParaNotificar} en la carpeta ${folderSelect}.`,
                                destinatario: u.nombre,
                                tipo: 'documento',
                                targetView: 'view-documentos'
                            });
                        }
                    });

                    if (currentUser.rol === 'Solicitante') {
                        window.notify({
                            titulo: 'Nuevo Documento de Cliente',
                            mensaje: `${currentUser.nombre} ha subido el documento: ${nombreParaNotificar}.`,
                            destinatario: 'Administrador',
                            tipo: 'documento',
                            targetView: 'view-documentos'
                        });
                    }
                }

                closeModal();
            });
        }

        // ✅ Al añadirse un documento, re-renderizamos con el filtro de rol aplicado
        document.addEventListener('documentAdded', () => {
            this.view.renderDocuments(this.getDocumentosVisibles());
        });
    }
}
