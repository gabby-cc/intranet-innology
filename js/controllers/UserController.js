import { UserModel } from '../models/UserModel.js';
import { UserView } from '../views/UserView.js';

export class UserController {
    constructor() {
        this.model = new UserModel();
        this.view = new UserView();
        
        this.init();
    }

    init() {
        this.renderTable();

        // Escuchar el botón "Nuevo Usuario"
        const btnNew = document.getElementById('btn-nuevo-usuario');
        if (btnNew) {
            btnNew.addEventListener('click', () => this.openModal());
        }

        // Escuchar cambio de rol para mostrar/ocultar campos de consultor
        const selectRol = document.getElementById('user-rol');
        if (selectRol) {
            selectRol.addEventListener('change', (e) => this.view.toggleConsultantFields(e.target.value));
        }

        // Escuchar el formulario
        const form = document.getElementById('user-form');
        if (form) {
            form.addEventListener('submit', (e) => {
                e.preventDefault();
                this.saveUser();
            });
        }

        // Escuchar clics en la tabla (Editar / Activar-Desactivar)
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

        // Botones del modal
        const btnClose = document.getElementById('btn-cerrar-modal-user');
        const btnCancel = document.getElementById('btn-cancelar-modal-user');
        if (btnClose) btnClose.addEventListener('click', () => this.closeModal());
        if (btnCancel) btnCancel.addEventListener('click', () => this.closeModal());
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
            title.textContent = 'Editar Usuario';
            const user = this.model.getUserById(userId);
            if (user) this.view.fillUserForm(user);
        } else {
            title.textContent = 'Nuevo Usuario';
        }

        if (modal) modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('user-modal');
        if (modal) modal.classList.remove('active');
    }

    saveUser() {
        const id = document.getElementById('user-id').value;
        const nombre = document.getElementById('user-name').value.trim();
        const correo = document.getElementById('user-email').value.trim();
        const rol = document.getElementById('user-rol').value;
        
        let perfil = '-';
        let modulos = [];
        let paises = [];

        if (rol === 'Consultor') {
            perfil = document.getElementById('user-perfil').value;
            // Aquí podrías capturar los módulos y países si tuvieras los inputs
        }

        if (!nombre || !correo || !rol) {
            alert('Por favor, llena los campos obligatorios.');
            return;
        }

        const userData = { nombre, correo, rol, perfil, modulos, paises };

        if (id) {
            // Editar
            this.model.updateUser(id, userData);
        } else {
            // Crear
            this.model.createUser(userData);
        }

        this.renderTable();
        this.closeModal();
        alert('Usuario guardado exitosamente.');
    }

    toggleStatus(id) {
        if (confirm('¿Estás seguro de cambiar el estado de este usuario?')) {
            this.model.toggleStatus(id);
            this.renderTable();
        }
    }
}