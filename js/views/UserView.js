export class UserView {
    constructor() {
        this.tableBody = document.getElementById('users-tbody');
    }

    renderUsers(users) {
        if (!this.tableBody) return;
        this.tableBody.innerHTML = '';

        users.forEach(user => {
            const tr = document.createElement('tr');
            
            let rolClass = user.rol === 'Administrador' ? 'bg-red' : user.rol === 'Consultor' ? 'bg-blue' : 'bg-gray';
            let estadoClass = user.estado === 'Activo' ? 'badge-status resuelto' : 'badge-status espera';

            const iconEditar = `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>`;
            
            const iconToggle = user.estado === 'Activo' 
                ? `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/></svg>`
                : `<svg viewBox="0 0 24 24" width="18" height="18"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM4 12c0-4.42 3.58-8 8-8 1.85 0 3.55.63 4.9 1.69L5.69 16.9C4.63 15.55 4 13.85 4 12zm8 8c-1.85 0-3.55-.63-4.9-1.69L18.31 7.1C19.37 8.45 20 10.15 20 12c0 4.42-3.58 8-8 8z"/></svg>`;

            tr.innerHTML = `
                <td>
                    <div style="font-weight: 600; color: var(--text-dark);">${user.nombre}</div>
                    <div style="font-size: 0.75rem; color: var(--text-light);">${user.correo}</div>
                </td>
                <td><span class="badge ${rolClass}" style="padding: 4px 10px; border-radius: 12px; font-size: 0.75rem; color: white;">${user.rol}</span></td>
                <td>${user.rol === 'Consultor' ? user.perfil : '-'}</td>
                <td><span class="${estadoClass}">${user.estado}</span></td>
                <td>
                    <div class="action-buttons-group">
                        <button class="btn-icon-action edit-user" data-id="${user.id}" title="Editar usuario">${iconEditar}</button>
                        <button class="btn-icon-action toggle-user ${user.estado === 'Activo' ? 'btn-danger-hover' : 'btn-success-hover'}" data-id="${user.id}" title="${user.estado === 'Activo' ? 'Desactivar acceso' : 'Activar acceso'}">${iconToggle}</button>
                    </div>
                </td>
            `;
            this.tableBody.appendChild(tr);
        });
    }

    toggleRoleFields(rol) {
        const consultantFields = document.getElementById('consultant-fields');
        const solicitanteFields = document.getElementById('solicitante-fields');

        if (consultantFields) consultantFields.style.display = 'none';
        if (solicitanteFields) solicitanteFields.style.display = 'none';

        if (rol === 'Consultor' && consultantFields) {
            consultantFields.style.display = 'block';
        } else if (rol === 'Solicitante' && solicitanteFields) {
            solicitanteFields.style.display = 'block';
        }
    }

    fillUserForm(user) {
        document.getElementById('user-id').value = user.id;
        document.getElementById('user-name').value = user.nombre;
        document.getElementById('user-email').value = user.correo;
        document.getElementById('user-rol').value = user.rol;
        document.getElementById('user-estado').value = user.estado;
        
        this.toggleRoleFields(user.rol);

        // ✅ Llenar campos de Consultor con checkboxes
        if (user.rol === 'Consultor') {
            document.getElementById('user-perfil').value = user.perfil || 'Técnico';
            
            // Marcar checkboxes de módulos
            const modulosCheckboxes = document.querySelectorAll('#dropdown-modulos .items input[type="checkbox"]');
            modulosCheckboxes.forEach(cb => {
                cb.checked = (user.modulos || []).includes(cb.value);
            });
            
            // Marcar checkboxes de países
            const paisesCheckboxes = document.querySelectorAll('#dropdown-paises .items input[type="checkbox"]');
            paisesCheckboxes.forEach(cb => {
                cb.checked = (user.paises || []).includes(cb.value);
            });

            // Actualizar el texto del anchor
            const anchorModulos = document.querySelector('#dropdown-modulos .anchor');
            if (anchorModulos) {
                anchorModulos.textContent = (user.modulos && user.modulos.length > 0) ? user.modulos.join(', ') : 'Seleccionar módulos...';
            }
            const anchorPaises = document.querySelector('#dropdown-paises .anchor');
            if (anchorPaises) {
                anchorPaises.textContent = (user.paises && user.paises.length > 0) ? user.paises.join(', ') : 'Seleccionar países...';
            }
        }

        // Llenar campos de Solicitante
        if (user.rol === 'Solicitante') {
            document.getElementById('user-empresa').value = user.empresa || '';
            document.getElementById('user-pais-solicitante').value = user.paisSolicitante || 'México';
        }

        // Al editar, las contraseñas no son obligatorias para cambiar
        document.getElementById('user-password').value = '';
        document.getElementById('user-password').removeAttribute('required');
        document.getElementById('user-password').placeholder = 'Dejar en blanco para no cambiar';
        
        document.getElementById('user-password-confirm').value = '';
        document.getElementById('user-password-confirm').removeAttribute('required');
        document.getElementById('user-password-confirm').placeholder = 'Dejar en blanco para no cambiar';
    }

    clearForm() {
        document.getElementById('user-form').reset();
        document.getElementById('user-id').value = '';
        this.toggleRoleFields('');
        
        // ✅ Reiniciar los desplegables de checkboxes
        document.querySelectorAll('.dropdown-check-list .items input[type="checkbox"]').forEach(cb => {
            cb.checked = false;
        });
        const anchorModulos = document.querySelector('#dropdown-modulos .anchor');
        if (anchorModulos) anchorModulos.textContent = 'Seleccionar módulos...';
        const anchorPaises = document.querySelector('#dropdown-paises .anchor');
        if (anchorPaises) anchorPaises.textContent = 'Seleccionar países...';
        
        // Al crear, las contraseñas son obligatorias
        document.getElementById('user-password').setAttribute('required', 'required');
        document.getElementById('user-password').placeholder = '';
        
        document.getElementById('user-password-confirm').setAttribute('required', 'required');
        document.getElementById('user-password-confirm').placeholder = '';
    }
}