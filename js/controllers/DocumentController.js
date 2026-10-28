import { DocumentModel } from '../models/DocumentModel.js';
import { DocumentView } from '../views/DocumentView.js';

export class DocumentController {
    constructor(model) {
        this.model = model || new DocumentModel();
        this.view = new DocumentView();
        this.init();
    }

    init() {
        // 1. Cargar todos los documentos al inicio
        this.view.renderDocuments(this.model.getAllDocuments());

        // 2. Capturar los inputs
        const filterText = document.getElementById('filter-docs');
        const filterFolder = document.getElementById('filter-doc-folder');

        // 3. Función que aplica los filtros
        const applyFilters = () => {
            const textValue = filterText ? filterText.value : '';
            const folderValue = filterFolder ? filterFolder.value : 'todas';
            
            // Llamamos al modelo para que filtre
            const results = this.model.filterDocuments(textValue, folderValue);
            
            // Le pasamos los resultados a la vista
            this.view.renderDocuments(results);
        };

        // 4. Escuchar los eventos (escribir y cambiar select)
        if(filterText) filterText.addEventListener('input', applyFilters);
        if(filterFolder) filterFolder.addEventListener('change', applyFilters);

        // 5. Modal de Subir Documento
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
                this.model.addDocument(nameInput, folderSelect, file);
                
                // Volver a aplicar los filtros para que aparezca el nuevo
                applyFilters();
                
                closeModal();
            });
        }
    }
}