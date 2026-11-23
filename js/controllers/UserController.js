import { UserModel } from '../models/UserModel.js';
import { UserView } from '../views/UserView.js';

export class UserController {
    constructor() {
        this.model = new UserModel();
        this.view = new UserView();
        this.editingId = null;
        
        this.init();
    }

    init() {
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

        // ✅ NUEVO: Configurar los desplegables de checkboxes
        this.setupDropdown('dropdown-modulos');
        this.setupDropdown('dropdown-paises');

        // Cerrar desplegables al hacer clic fuera
        document.addEventListener('click', () => {
            document.querySelectorAll('.dropdown-check-list .items').forEach(list => {
                list.classList.remove('visible');
            });
        });
    }

    // ✅ Función auxiliar para manejar los desplegables de checkboxes
    setupDropdown(containerId) {
        const container = document.getElementById(containerId);
        if (!container) return;
        
        const anchor = container.querySelector('.anchor');
        const items = container.querySelector('.items');
        if (!anchor || !items) return;
        
        // Abrir/cerrar al hacer clic en el anchor
        anchor.addEventListener('click', (e) => {
            e.stopPropagation();
            // Cerrar otros desplegables
            document.querySelectorAll('.dropdown-check-list .items').forEach(list => {
                if (list !== items) list.classList.remove('visible');
            });
            items.classList.toggle('visible');
        });

        // Actualizar el texto del anchor cuando se seleccionan checkboxes
        const checkboxes = items.querySelectorAll('input[type="checkbox"]');
        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.value);
                anchor.textContent = selected.length > 0 ? selected.join(', ') : 'Seleccionar...';
            });
        });
    }

    renderTable() {
        const users = this.model.getAllUsers();
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
            
            // ✅ Capturar los checkboxes marcados de módulos
            const modulosCheckboxes = document.querySelectorAll('#dropdown-modulos .items input[type="checkbox"]:checked');
            modulos = Array.from(modulosCheckboxes).map(cb => cb.value);
            
            // ✅ Capturar los checkboxes marcados de países
            const paisesCheckboxes = document.querySelectorAll('#dropdown-paises .items input[type="checkbox"]:checked');
            paises = Array.from(paisesCheckboxes).map(cb => cb.value);

        } else if (rol === 'Solicitante') {
            empresa = document.getElementById('user-empresa').value.trim();
            paisSolicitante = document.getElementById('user-pais-solicitante').value;
        }

        const userData = { 
            nombre, correo, password, rol, perfil, modulos, paises, empresa, paisSolicitante, estado 
        };

        if (this.editingId) {
            // ✅ NUEVO: Validar si están intentando desactivar al último admin (o a sí mismos) desde el modal
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
        // ✅ NUEVO: Protecciones para no quedarnos sin administradores
        const userToToggle = this.model.getUserById(id);
        const currentUser = JSON.parse(sessionStorage.getItem('innology_user'));

        if (!userToToggle) return;

        // 1. Evitar que un admin se desactive a sí mismo
        if (currentUser && userToToggle.id === currentUser.id && userToToggle.rol === 'Administrador') {
            alert('⛔ No puedes desactivar tu propia cuenta de administrador.');
            return;
        }

        // 2. Evitar desactivar al último administrador activo del sistema
        if (userToToggle.rol === 'Administrador' && userToToggle.estado === 'Activo') {
            const adminsActivos = this.model.getAllUsers().filter(u => u.rol === 'Administrador' && u.estado === 'Activo');
            if (adminsActivos.length <= 1) {
                alert('⛔ No puedes desactivar al último administrador activo del sistema. Debe haber al menos uno.');
                return;
            }
        }

        // Si pasa las validaciones, procedemos
        if (confirm('¿Estás seguro de cambiar el estado de este usuario?')) {
            this.model.toggleStatus(id);
            this.renderTable();
        }
    }
}