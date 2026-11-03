export class TicketView {
    renderTickets(tickets) {
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) {
            console.error("❌ ERROR: No existe el elemento con id 'tickets-tbody' en el HTML.");
            return;
        }
        tbody.innerHTML = '';

        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.className = 'ticket-row';
            tr.dataset.id = ticket.id;
            tr.style.cursor = 'pointer'; 

            const priorityClass = ticket.priority === 'Alta' ? 'alta'
                                : ticket.priority === 'Media' ? 'media' : 'baja';
            const statusClass   = ticket.status === 'En atención' ? 'atencion'
                                : ticket.status === 'En espera' ? 'espera'
                                : ticket.status === 'Resuelto' ? 'resuelto'
                                : 'abierto';

            tr.innerHTML = `
                <td class="ticket-id">${ticket.id}</td>
                <td>${ticket.title}</td>
                <td>${ticket.category}</td>
                <td><span class="badge-priority ${priorityClass}">${ticket.priority}</span></td>
                <td><span class="badge-status ${statusClass}">${ticket.status}</span></td>
                <td>Daniel Rojas</td>
                <td>${ticket.date}</td>
            `;
            tbody.appendChild(tr);
        });
    }

    updateMenuBadge(count) {
        const badgeMenu = document.querySelector('.menu-item[data-target="view-tickets"] .badge');
        if (badgeMenu) {
            badgeMenu.textContent = count;
            badgeMenu.style.display = count > 0 ? 'inline-block' : 'none';
        }
    }

    openDrawer(ticket, onVerDetalle, historial = []) {
        const drawer = document.getElementById('ticket-drawer');
        const overlay = document.getElementById('drawer-overlay');
        
        if (!drawer || !overlay) {
            console.error("❌ ERROR: Faltan los elementos 'ticket-drawer' o 'drawer-overlay' en el HTML.");
            return;
        }

        // Helper para evitar errores si falta un ID
        const setElText = (id, text) => {
            const el = document.getElementById(id);
            if (el) el.textContent = text;
        };

        const priorityClass = ticket.priority === 'Alta' ? 'alta'
                            : ticket.priority === 'Media' ? 'media' : 'baja';
        const statusClass   = ticket.status === 'En atención' ? 'atencion'
                            : ticket.status === 'En espera' ? 'espera'
                            : ticket.status === 'Resuelto' ? 'resuelto'
                            : 'abierto';

        setElText('drawer-id', ticket.id);
        setElText('drawer-title', ticket.title);
        setElText('drawer-category', ticket.category);
        setElText('drawer-solicitante', ticket.solicitante);
        setElText('drawer-empresa', ticket.empresa);
        setElText('drawer-date', ticket.date);
        setElText('drawer-description', ticket.description);

        const statusBadge = document.getElementById('drawer-status');
        if (statusBadge) {
            statusBadge.textContent = ticket.status;
            statusBadge.className = 'badge-status ' + statusClass;
        }

        const priorityBadge = document.getElementById('drawer-priority');
        if (priorityBadge) {
            priorityBadge.textContent = ticket.priority;
            priorityBadge.className = 'badge-priority ' + priorityClass;
        }

        // --- AQUÍ ESTABA EL ERROR ---
        const timeline = document.getElementById('drawer-timeline');
        if (timeline) {
            // Verificamos que realmente sea un elemento que acepte HTML
            if (typeof timeline.innerHTML !== 'undefined') {
                timeline.innerHTML = '';
                (historial || []).forEach(item => {
                    const newItem = document.createElement('div');
                    newItem.className = 'timeline-item';
                    const textContent = item.tipo === 'comentario'
                        ? `<p style="margin-top:5px;font-size:.85rem;color:#333;background:#F3F4F6;padding:8px;border-radius:4px;">${item.accion}</p>`
                        : `<strong>${item.accion}</strong>`;
                    newItem.innerHTML = `
                        <div class="timeline-dot ${item.tipo === 'comentario' ? 'active' : ''}"></div>
                        <div class="timeline-content">${textContent}<span>${item.autor}, ${item.fecha}</span></div>
                    `;
                    timeline.appendChild(newItem);
                });
            } else {
                console.warn("⚠️ El elemento 'drawer-timeline' no es un contenedor válido (¿es un input o img?).");
            }
        } else {
            console.warn("⚠️ No se encontró el elemento con id 'drawer-timeline' en el HTML.");
        }

        const filesList = document.getElementById('drawer-files-list');
        const filesSection = document.getElementById('drawer-files-section');
        if (filesList && filesSection) {
            filesList.innerHTML = '';
            if (ticket.archivos && ticket.archivos.length > 0) {
                filesSection.style.display = 'block';
                ticket.archivos.forEach(fileObj => {
                    const url = URL.createObjectURL(fileObj.file);
                    const li = document.createElement('li');
                    li.innerHTML = `
                        <div class="attachment-item">
                            <div class="attachment-info">
                                <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                <span class="attachment-name" title="${fileObj.name}">${fileObj.name}</span>
                            </div>
                            <div class="attachment-actions">
                                <button class="btn-action" title="Previsualizar" onclick="window.open('${url}', '_blank')">
                                    <svg viewBox="0 0 24 24"><path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/></svg>
                                </button>
                                <a href="${url}" download="${fileObj.name}" class="btn-action" title="Descargar" style="text-decoration:none;">
                                    <svg viewBox="0 0 24 24"><path d="M19 9h-4V3H9v6H5l7 7 7-7zM5 18v2h14v-2H5z"/></svg>
                                </a>
                            </div>
                        </div>
                    `;
                    filesList.appendChild(li);
                });
            } else {
                filesSection.style.display = 'none';
            }
        }

        let btnDetalle = document.getElementById('btn-ver-detalle-completo');
        if (!btnDetalle) {
            btnDetalle = document.createElement('button');
            btnDetalle.id = 'btn-ver-detalle-completo';
            btnDetalle.className = 'btn-primary';
            btnDetalle.style.cssText = 'width:100%;margin-top:20px; padding: 10px; background-color: #b3001b; color: white; border: none; border-radius: 4px; cursor: pointer; font-weight: bold;';
            btnDetalle.textContent = 'Ver detalle completo / Gestionar';
            const drawerBody = drawer.querySelector('.drawer-body');
            if (drawerBody) drawerBody.appendChild(btnDetalle);
        }

        btnDetalle.onclick = () => {
            this.closeDrawer();
            if (typeof onVerDetalle === 'function') {
                onVerDetalle(ticket.id);
            } else {
                console.warn('No se pasó la función onVerDetalle al drawer.');
            }
        };

        drawer.classList.add('open');
        overlay.classList.add('active');
    }

    closeDrawer() {
        const drawer = document.getElementById('ticket-drawer');
        const overlay = document.getElementById('drawer-overlay');
        if (drawer) drawer.classList.remove('open');
        if (overlay) overlay.classList.remove('active');
    }

    openModal() {
        const modal = document.getElementById('ticket-modal');
        if (!modal) return;
        const setVal = (id, val) => { const el = document.getElementById(id); if(el) el.value = val; };
        const setHTML = (id, val) => { const el = document.getElementById(id); if(el) el.innerHTML = val; };
        const setStyle = (id, prop, val) => { const el = document.getElementById(id); if(el) el.style[prop] = val; };

        setVal('new-ticket-title', '');
        setVal('new-ticket-description', '');
        setHTML('file-preview', '');
        setStyle('conditional-fields', 'display', 'block');
        setStyle('group-funcional', 'display', 'block');
        setStyle('group-tecnico', 'display', 'none');
        modal.classList.add('active');
    }

    closeModal() {
        const modal = document.getElementById('ticket-modal');
        if (modal) modal.classList.remove('active');
    }

    renderFilePreview(archivos, onRemove) {
        const preview = document.getElementById('file-preview');
        if (!preview) return;
        preview.innerHTML = '';
        archivos.forEach((file, index) => {
            const tag = document.createElement('div');
            tag.className = 'file-tag';
            tag.style.cssText = 'display:inline-flex;align-items:center;background:#F3F4F6;border:1px solid #D1D5DB;border-radius:4px;padding:4px 8px;font-size:.8rem;color:#333;margin:0 8px 8px 0;';
            tag.innerHTML = `
                <span style="max-width:150px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;margin-right:8px;" title="${file.name}">${file.name}</span>
                <button type="button" style="background:none;border:none;color:#9CA3AF;cursor:pointer;font-weight:bold;font-size:1rem;padding:0;line-height:1;">✕</button>
            `;
            tag.querySelector('button').addEventListener('click', () => onRemove(index));
            preview.appendChild(tag);
        });
    }
}