export class UserView {
    constructor() {
        this.tableBody = document.getElementById('users-tbody');
    }

    renderUsers(users) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            
            // Clases para el badge del rol
            let rolClass = user.rol === 'Administrador' ? 'bg-red' : user.rol === 'Consultor' ? 'bg-blue' : 'bg-gray';
            
            // Estado
            let estadoClass = user.estado === 'Activo' ? 'badge-status resuelto' : 'badge-status espera';

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-dark);">${user.nombre}</div>
                    <div style="font-size: 0.75rem; color: var(--text-light);">${user.correo}</div>
                </td>
                <td><span class="badge ${rolClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; color: white;">${user.rol}</span></td>
                <td>${user.rol === 'Consultor' ? user.perfil : '-'}</td>
                <td><span class="${estadoClass}">${user.estado}</span></td>
                <td>
                    <button class="btn-action edit-user" data-id="${user.id}" title="Editar">✏️</button>
                    <button class="btn-action toggle-user" data-id="${user.id}" title="${user.estado === 'Activo' ? 'Desactivar' : 'Activar'}">
                        ${user.estado === 'Activo' ? '🚫' : '✅'}
                    </button>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    toggleConsultantFields(rol) {
        const consultantFields = document.getElementById('consultant-fields');
        if (consultantFields) {
            consultantFields.style.display = rol === 'Consultor' ? 'block' : 'none';
        }
    }

    fillUserForm(user) {
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-name').value = user.nombre;
        document.getElementById('user-email').value = user.correo;
        document.getElementById('user-rol').value = user.rol;
        
        this.toggleConsultantFields(user.rol);

        if (user.rol === 'Consultor') {
            document.getElementById('user-perfil').value = user.perfil || 'Técnico';
            // Aquí podrías seleccionar los módulos y países si usas checkboxes o select multiple
            // Por simplicidad, lo dejamos en los inputs básicos
        }
    }

    clearForm() {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        this.toggleConsultantFields('Solicitante');
    }
}