export class TicketView {
    constructor() {
        this.tbody = document.getElementById('tickets-tbody');
        this.drawer = document.getElementById('ticket-drawer');
        this.drawerOverlay = document.getElementById('drawer-overlay');
        this.modal = document.getElementById('ticket-modal');
    }

    renderTickets(tickets) {
        if(!this.tbody) return;
        this.tbody.innerHTML = '';
        tickets.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.className = 'ticket-row';
            tr.dataset.id = ticket.id;
            const priorityClass = ticket.priority === 'Alta' ? 'alta' : ticket.priority === 'Media' ? 'media' : 'baja';
            const statusClass = ticket.status === 'En atención' ? 'atencion' : ticket.status === 'En espera' ? 'espera' : 'resuelto';
            tr.innerHTML = `
                <td class="ticket-id">${ticket.id}</td>
                <td>${ticket.title}</td>
                <td>${ticket.category}</td>
                <td><span class="badge-priority ${priorityClass}">${ticket.priority}</span></td>
                <td><span class="badge-status ${statusClass}">${ticket.status}</span></td>
                <td>Daniel Rojas</td>
                <td>${ticket.date}</td>
            `;
            this.tbody.appendChild(tr);
        });
    }

    openDrawer(ticket, history) {
        document.getElementById('drawer-id').textContent = ticket.id;
        document.getElementById('drawer-title').textContent = ticket.title;
        document.getElementById('drawer-category').textContent = ticket.category;
        document.getElementById('drawer-solicitante').textContent = ticket.solicitante;
        document.getElementById('drawer-empresa').textContent = ticket.empresa;
        document.getElementById('drawer-date').textContent = ticket.date;
        document.getElementById('drawer-description').textContent = ticket.description;
        
        const statusBadge = document.getElementById('drawer-status');
        statusBadge.textContent = ticket.status;
        statusBadge.className = 'badge-status ' + (ticket.status === 'En atención' ? 'atencion' : 'espera');
        
        const priorityBadge = document.getElementById('drawer-priority');
        priorityBadge.textContent = ticket.priority;
        priorityBadge.className = 'badge-priority ' + (ticket.priority === 'Alta' ? 'alta' : 'media');

        this.renderHistory(history);
        this.renderFiles(ticket.archivos); // <-- Llamamos a la función de archivos

        this.drawer.classList.add('open');
        this.drawerOverlay.classList.add('active');
    }

    closeDrawer() {
        this.drawer.classList.remove('open');
        this.drawerOverlay.classList.remove('active');
    }

    renderHistory(history) {
        const timeline = document.getElementById('drawer-timeline');
        if(!timeline) return;
        timeline.innerHTML = ''; 
        history.forEach(item => {
            const newItem = document.createElement('div');
            newItem.className = 'timeline-item';
            const textContent = item.tipo === 'comentario' ? `<p style="margin-top: 5px; font-size: 0.85rem; color: #333; background: #F3F4F6; padding: 8px; border-radius: 4px;">${item.accion}</p>` : `<strong>${item.accion}</strong>`;
            newItem.innerHTML = `
                <div class="timeline-dot ${item.tipo === 'comentario' ? 'active' : ''}"></div>
                <div class="timeline-content">${textContent}<span>${item.autor}, ${item.fecha}</span></div>
            `;
            timeline.appendChild(newItem);
        });
    }

    // --- FUNCIÓN PARA MOSTRAR LOS ARCHIVOS ADJUNTOS ---
    renderFiles(archivos) {
        const filesList = document.getElementById('drawer-files-list');
        const filesSection = document.getElementById('drawer-files-section');
        
        // Limpiamos la lista antes de renderizar
        filesList.innerHTML = '';
        
        if (archivos && archivos.length > 0) {
            filesSection.style.display = 'block'; // Mostramos la sección
            archivos.forEach((fileObj) => {
                // Creamos una URL temporal para el archivo
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
            filesSection.style.display = 'none'; // Ocultamos si no hay archivos
        }
    }

    openModal() {
        this.modal.classList.add('active');
        document.getElementById('new-ticket-title').value = '';
        document.getElementById('new-ticket-description').value = '';
        document.getElementById('file-preview').innerHTML = '';
    }

    closeModal() {
        this.modal.classList.remove('active');
    }

    renderFilePreview(archivosTemporales, removeCallback) {
        const preview = document.getElementById('file-preview');
        preview.innerHTML = '';
        archivosTemporales.forEach((file, index) => {
            const tag = document.createElement('div');
            tag.className = 'file-tag';
            tag.innerHTML = `<span>${file.name}</span><button type="button">✕</button>`;
            tag.querySelector('button').addEventListener('click', () => removeCallback(index));
            preview.appendChild(tag);
        });
    }
}