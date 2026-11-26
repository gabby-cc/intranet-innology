import { UserModel } from '../models/UserModel.js';
import { UserView } from '../views/UserView.js';

export class UserController {
    constructor() {
        this.model = new UserModel();
        this.view = new UserView();
        this.editingId = null;
        
        this.init();
    }

    async init() {
        // ✅ 1. Cargamos los catálogos de forma asíncrona
        await this.cargarCatalogos();

        this.renderTable();

        const btnNew = document.getElementById('btn-nuevo-usuario');
        if (btnNew) btnNew.addEventListener('click', () => this.openModal());

        // ✅ Escuchar cambio de rol para mostrar/ocultar secciones
        const selectRol = document.getElementById('user-rol');
        if (selectRol) {
            selectRol.addEventListener('change', (e) => this.view.toggleRoleFields(e.target.value));
        }

        const form = document.getElementById('user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
        }

        const btnClose = document.getElementById('btn-cerrar-modal-user');
        const btnCancel = document.getElementById('btn-cancelar-modal-user');
        if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
        if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());

        const tableBody = document.getElementById('users-tbody');
        if (tableBody) {
            tableBody.addEventListener('click', (e) => {
                const btnEdit = e.target.closest('.edit-user');
                const btnToggle = e.target.closest('.toggle-user');

                if (btnEdit) {
                    const id = btnEdit.getAttribute('data-id');
                    this.openModal(id);
                }

                if (btnToggle) {
                    const id = btnToggle.getAttribute('data-id');
                    this.toggleStatus(id);
                }
            });
        }

        // ✅ NUEVO: Escuchadores para los filtros de búsqueda y rol
        const inputBuscar = document.getElementById('filter-user-text');
        const selectFiltroRol = document.getElementById('filter-user-role');

        if (inputBuscar) {
            inputBuscar.addEventListener('input', () => this.renderTable());
        }
        if (selectFiltroRol) {
            selectFiltroRol.addEventListener('change', () => this.renderTable());
        }

        // ✅ Cerrar desplegables SOLO si el clic es fuera de un desplegable
        document.addEventListener('click', (e) => {
            if (!e.target.closest('.dropdown-check-list')) {
                document.querySelectorAll('.dropdown-check-list .items').forEach(list => {
                    list.classList.remove('visible');
                });
            }
        });
    }

    // ✅ NUEVA FUNCIÓN: Pide los catálogos al modelo y los dibuja
    async cargarCatalogos() {
        try {
            const catalogos = await this.model.obtenerCatalogos();
            
            this.renderizarCheckboxes('dropdown-modulos', catalogos.modulos);
            this.renderizarCheckboxes('dropdown-paises', catalogos.paises);
            
        } catch (error) {
            console.error("Error al cargar catálogos:", error);
        }
    }

    // ✅ NUEVA FUNCIÓN: Genera el HTML de los checkboxes
    renderizarCheckboxes(containerId, opciones) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const items = container.querySelector('.items');
        if (!items) return;

        items.innerHTML = ''; // Limpiamos

        // 1. Opción "Todos"
        const liTodos = document.createElement('li');
        liTodos.innerHTML = `<label><input type="checkbox" value="Todos" class="check-todos"> <strong>Todos</strong></label>`;
        items.appendChild(liTodos);

        // 2. Opciones
        opciones.forEach(opcion => {
            const li = document.createElement('li');
            li.innerHTML = `<label><input type="checkbox" value="${opcion}"> ${opcion}</label>`;
            items.appendChild(li);
        });

        // 3. Inicializamos la lógica del dropdown
        this.setupDropdown(containerId);
    }

    // ✅ Función auxiliar para manejar los desplegables de checkboxes
    setupDropdown(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const anchor = container.querySelector('.anchor');
        const items = container.querySelector('.items');
        if (!anchor || !items) return;

        // 1. Abrir/cerrar el menú
        anchor.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cerrar otros menús
            document.querySelectorAll('.dropdown-check-list .items').forEach(list => {
                if (list !== items) list.classList.remove('visible');
            });
            items.classList.toggle('visible');
        });

        // 2. Evitar que al hacer clic dentro del menú se cierre (incluyendo checkboxes)
        items.addEventListener('click', (e) => {
            e.stopPropagation(); 
        });

        // 3. Lógica de selección
        const checkboxes = items.querySelectorAll('input[type="checkbox"]');
        const checkboxTodos = items.querySelector('.check-todos');
        const checkboxesIndividuales = Array.from(checkboxes).filter(cb => !cb.classList.contains('check-todos'));

        // Función para actualizar el texto
        const updateAnchorText = () => {
            const seleccionados = checkboxesIndividuales.filter(c => c.checked);
            
            if (seleccionados.length === 0) {
                anchor.textContent = 'Seleccionar...';
            } else if (checkboxTodos && checkboxTodos.checked) {
                anchor.textContent = 'Todos';
            } else if (seleccionados.length > 2) { 
                anchor.textContent = `${seleccionados.length} seleccionados`;
            } else {
                anchor.textContent = seleccionados.map(c => c.value).join(', ');
            }
        };

        // Evento para el checkbox "Todos"
        if (checkboxTodos) {
            checkboxTodos.addEventListener('click', () => {
                setTimeout(() => {
                    checkboxesIndividuales.forEach(cb => cb.checked = checkboxTodos.checked);
                    updateAnchorText();
                }, 0);
            });
        }

        // Evento para checkboxes individuales
        checkboxesIndividuales.forEach(cb => {
            cb.addEventListener('click', () => {
                setTimeout(() => {
                    if (checkboxTodos) {
                        const todosMarcados = checkboxesIndividuales.every(c => c.checked);
                        checkboxTodos.checked = todosMarcados;
                    }
                    updateAnchorText();
                }, 0);
            });
        });

        // Inicializar el texto
        updateAnchorText();
    }

    // ✅ MODIFICADO: Ahora aplica los filtros antes de renderizar
    renderTable() {
        let users = this.model.getAllUsers();

        // Capturar los valores de los filtros
        const filtroTexto = document.getElementById('filter-user-text')?.value.toLowerCase().trim() || '';
        const filtroRol = document.getElementById('filter-user-role')?.value || 'Todos los roles';

        // Aplicar filtros
        users = users.filter(user => {
            // 1. Filtro por Nombre o Correo
            const coincideTexto = filtroTexto === '' || 
                user.nombre.toLowerCase().includes(filtroTexto) || 
                (user.correo && user.correo.toLowerCase().includes(filtroTexto));

            // 2. Filtro por Rol
            const coincideRol = filtroRol === 'Todos los roles' || user.rol === filtroRol;

            return coincideTexto && coincideRol;
        });

        this.view.renderUsers(users);
    }

    openModal(userId = null) {
        this.view.clearForm();
        const modal = document.getElementById('user-modal');
        const title = document.getElementById('modal-user-title');

        if (userId) {
            this.editingId = userId;
            title.textContent = 'Editar Usuario';
            const user = this.model.getUserById(userId);
            if (user) {
                this.view.fillUserForm(user);
            }
        } else {
            this.editingId = null;
            title.textContent = 'Nuevo Usuario';
            this.view.toggleRoleFields('');
        }

        if (modal) modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('user-modal');
        if (modal) modal.classList.remove('active');
        this.editingId = null;
    }

    saveUser() {
        const nombre = document.getElementById('user-name').value.trim();
        const correo = document.getElementById('user-email').value.trim();
        const password = document.getElementById('user-password').value;
        const confirmPassword = document.getElementById('user-password-confirm').value;
        const rol = document.getElementById('user-rol').value;
        const estado = document.getElementById('user-estado').value;
        
        // ✅ NUEVO: Capturar la fecha de nacimiento
        const fechaNacimiento = document.getElementById('user-birthdate').value;

        let perfil = '-';
        let modulos = [];
        let paises = [];
        let empresa = '';
        let paisSolicitante = '';

        // Validaciones
        if (!nombre || !correo || !rol || !estado) {
            alert('Por favor, llena todos los campos obligatorios (*).');
            return;
        }

        // ✅ Validación de la fecha (opcional pero recomendada)
        if (!fechaNacimiento) {
            alert('Por favor, ingresa la fecha de nacimiento.');
            return;
        }

        if ((password || confirmPassword) && password !== confirmPassword) {
            alert('❌ Las contraseñas no coinciden. Por favor, verifica.');
            return;
        }

        if (this.model.checkEmailExists(correo, this.editingId)) {
            alert('❌ Este correo electrónico ya está registrado. Usa otro.');
            return;
        }

        // Capturar datos según el rol
        if (rol === 'Consultor') {
            perfil = document.getElementById('user-perfil').value;
            
            const modulosCheckboxes = document.querySelectorAll('#dropdown-modulos .items input[type="checkbox"]:checked');
            modulos = Array.from(modulosCheckboxes).map(cb => cb.value).filter(v => v !== 'Todos');
            
            const paisesCheckboxes = document.querySelectorAll('#dropdown-paises .items input[type="checkbox"]:checked');
            paises = Array.from(paisesCheckboxes).map(cb => cb.value).filter(v => v !== 'Todos');

        } else if (rol === 'Solicitante') {
            empresa = document.getElementById('user-empresa').value.trim();
            paisSolicitante = document.getElementById('user-pais-solicitante').value;
        }

        // ✅ Incluir la fecha en el objeto
        const userData = { 
            nombre, correo, password, rol, perfil, modulos, paises, empresa, paisSolicitante, estado, fechaNacimiento 
        };

        if (this.editingId) {
            const currentUser = JSON.parse(sessionStorage.getItem('innology_user'));
            const userToEdit = this.model.getUserById(this.editingId);
            
            if (userToEdit.rol === 'Administrador' && userData.estado === 'Inactivo' && userToEdit.estado === 'Activo') {
                const adminsActivos = this.model.getAllUsers().filter(u => u.rol === 'Administrador' && u.estado === 'Activo');
                
                if (currentUser && userToEdit.id === currentUser.id) {
                    alert('⛔ No puedes desactivar tu propia cuenta de administrador.');
                    return;
                }
                if (adminsActivos.length <= 1) {
                    alert('⛔ No puedes desactivar al último administrador activo del sistema.');
                    return;
                }
            }

            this.model.updateUser(this.editingId, userData);
            alert('✅ Usuario actualizado exitosamente.');
        } else {
            if (!password) {
                alert('La contraseña es obligatoria para un nuevo usuario.');
                return;
            }
            this.model.createUser(userData);
            alert('✅ ¡Usuario creado exitosamente!');
        }

        this.renderTable();
        this.closeModal();
    }

    toggleStatus(id) {
        const userToToggle = this.model.getUserById(id);
        const currentUser = JSON.parse(sessionStorage.getItem('innology_user'));

        if (!userToToggle) return;

        if (currentUser && userToToggle.id === currentUser.id && userToToggle.rol === 'Administrador') {
            alert('⛔ No puedes desactivar tu propia cuenta de administrador.');
            return;
        }

        if (userToToggle.rol === 'Administrador' && userToToggle.estado === 'Activo') {
            const adminsActivos = this.model.getAllUsers().filter(u => u.rol === 'Administrador' && u.estado === 'Activo');
            if (adminsActivos.length <= 1) {
                alert('⛔ No puedes desactivar al último administrador activo del sistema. Debe haber al menos uno.');
                return;
            }
        }

        if (confirm('¿Estás seguro de cambiar el estado de este usuario?')) {
            this.model.toggleStatus(id);
            this.renderTable();
        }
    }
}