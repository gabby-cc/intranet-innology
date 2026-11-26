import { DashboardController } from './controllers/DashboardController.js';
import { DocumentController } from './controllers/DocumentController.js';
import { GlobalSearchController } from './controllers/GlobalSearchController.js';
import { TicketDetailController } from './controllers/TicketDetailController.js';
import { NotificationController } from './controllers/NotificationController.js';
import { TicketModel } from './models/TicketModel.js';
import { DocumentModel } from './models/DocumentModel.js';
import { UserModel } from './models/UserModel.js'; 
import { HoursController } from './controllers/HoursController.js';
import { ReportController } from './controllers/ReportController.js';

document.addEventListener('DOMContentLoaded', () => {
    
let currentUser = JSON.parse(sessionStorage.getItem('innology_user'));

if (!currentUser || currentUser.estado === 'Inactivo') {
    sessionStorage.removeItem('innology_user');
    sessionStorage.removeItem('innology_auth');
    alert('⛔ Tu cuenta ha sido desactivada o la sesión expiró.');
    window.location.href = 'index.html';
    return;
}

window.currentUser = currentUser;
console.log(`👤 Sesión iniciada como: ${currentUser.nombre} (${currentUser.rol})`);

    const menuUsuarios = document.querySelector('.menu-item[data-target="view-usuarios"]');
    if (menuUsuarios) {
        menuUsuarios.style.display = (currentUser.rol === 'Administrador') ? 'flex' : 'none';
    }

    const menuHoras = document.querySelector('.menu-item[data-target="view-dashboard"]');
    if (menuHoras) {
        menuHoras.style.display = (currentUser.rol === 'Administrador') ? 'flex' : 'none';
    }

    const menuReportes = document.querySelector('.menu-item[data-target="view-reportes"]');
    if (menuReportes) {
        menuReportes.style.display = (currentUser.rol === 'Administrador') ? 'flex' : 'none';
    }

    const userNameEl = document.querySelector('.user-text strong');
    const userRoleEl = document.querySelector('.user-text span');
    const avatarEl = document.querySelector('.avatar');
    
    if (userNameEl) userNameEl.textContent = currentUser.nombre;
    if (userRoleEl) userRoleEl.textContent = currentUser.rol;
    if (avatarEl) {
        const initials = currentUser.nombre.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase();
        avatarEl.textContent = initials;
    }

    // 1. Lógica de Pestañas
    const menuItems = document.querySelectorAll('.menu-item');
    const views = document.querySelectorAll('.view-section');

    function switchView(targetId) {
        if (targetId === 'view-dashboard' && currentUser.rol !== 'Administrador') {
            return;
        }
        if (targetId === 'view-reportes' && currentUser.rol !== 'Administrador') {
            return;
        }

        menuItems.forEach(i => i.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');

        const activeMenu = document.querySelector(`.menu-item[data-target="${targetId}"]`);
        if (activeMenu) {
            activeMenu.classList.add('active');
            // Si el módulo está dentro del submenú, lo dejamos desplegado
            const sub = activeMenu.closest('.submenu-list');
            if (sub) {
                sub.style.display = 'block';
                const chev = sub.parentElement.querySelector('.chevron-icon');
                if (chev) chev.style.transform = 'rotate(180deg)';
            }
        }
        
        window.location.hash = targetId.replace('view-', '');
    }
    window.switchView = switchView;

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            if (item.classList.contains('toggle-submenu')) {
                return; 
            }

            e.preventDefault();
            
            const target = item.getAttribute('data-target');
            if (target) {
                switchView(target);
            }
            
            if (window.innerWidth <= 768) window.closeMobileMenu();
        });
    });

    // Submenú "Gestión de Soporte" (abrir / cerrar)
    document.querySelectorAll('.toggle-submenu').forEach(toggle => {
        const submenu = toggle.parentElement.querySelector('.submenu-list');
        const chevron = toggle.querySelector('.chevron-icon');
        if (!submenu) return;

        toggle.addEventListener('click', (e) => {
            e.stopPropagation();
            e.stopImmediatePropagation(); // evita que otro listener lo vuelva a alternar
            const abierto = submenu.style.display !== 'none';
            submenu.style.display = abierto ? 'none' : 'block';
            if (chevron) chevron.style.transform = abierto ? '' : 'rotate(180deg)';
        });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && hash !== 'detalle-ticket' && document.getElementById('view-' + hash)) {
        switchView('view-' + hash);
    }

    // 2. Inicializar Modelos
    const ticketModel = new TicketModel();
    const documentModel = new DocumentModel();

    const rolMap = {
        'Administrador': 'admin',
        'Consultor': 'consultor',
        'Solicitante': 'cliente'
    };
    const userRoleNormalized = rolMap[currentUser.rol] || 'cliente';

    // 3. Inicializar Controladores
    if (document.getElementById('view-inicio')) new DashboardController();
    if (document.getElementById('view-documentos')) new DocumentController(documentModel, userRoleNormalized, currentUser.nombre);
    new GlobalSearchController(ticketModel, documentModel, null);

    window.ticketDetailController = new TicketDetailController(ticketModel, userRoleNormalized, currentUser.nombre);
    
    if (document.getElementById('view-dashboard') && currentUser.rol === 'Administrador') {
        new HoursController();
    }

    if (document.getElementById('view-reportes')) {
        new ReportController();
    }

    new NotificationController();

    if (document.getElementById('view-usuarios')) {
        import('./controllers/UserController.js')
            .then(module => new module.UserController())
            .catch(error => console.warn("⚠️ Módulo de usuarios no cargado:", error));
    }

    // ✅ Lógica de los Accesos Rápidos del Inicio
    const btnQuickTicket = document.getElementById('btn-quick-ticket');
    if (btnQuickTicket) {
        btnQuickTicket.addEventListener('click', () => {
            switchView('view-tickets'); 
            const modal = document.getElementById('ticket-modal');
            if (modal) {
                document.getElementById('new-ticket-title').value = '';
                document.getElementById('new-ticket-description').value = '';
                document.getElementById('new-ticket-type').value = 'Funcional';
                
                const inputEmpresa = document.getElementById('new-ticket-empresa');
                if(inputEmpresa) inputEmpresa.value = currentUser.empresa || '';

                document.getElementById('conditional-fields').style.display = 'block';
                document.getElementById('group-funcional').style.display = 'block';
                document.getElementById('group-tecnico').style.display = 'none';
                modal.classList.add('active');
            }
        });
    }

    const btnQuickDocs = document.getElementById('btn-quick-docs');
    if (btnQuickDocs) btnQuickDocs.addEventListener('click', () => switchView('view-documentos'));

    const btnQuickCalendar = document.getElementById('btn-quick-calendar');
    if (btnQuickCalendar) btnQuickCalendar.addEventListener('click', () => switchView('view-calendario'));

    const linkVerCalendario = document.getElementById('link-ver-calendario');
    if (linkVerCalendario) {
        linkVerCalendario.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-calendario');
        });
    }
    
    // =============================================
    // 4. ARCHIVOS TEMPORALES
    // =============================================
    let archivosTemporales = [];

    function renderFilePreview() {
        const preview = document.getElementById('file-preview');
        if (!preview) return;
        
        preview.innerHTML = '';
        archivosTemporales.forEach((file, index) => {
            const tag = document.createElement('div');
            tag.className = 'file-tag';
            tag.style.cssText = 'display: inline-flex; align-items: center; background: #F3F4F6; border: 1px solid #D1D5DB; border-radius: 4px; padding: 4px 8px; font-size: 0.8rem; color: #333; margin: 0 8px 8px 0;';
            tag.innerHTML = `
                <span style="max-width: 150px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; margin-right: 8px;" title="${file.name}">${file.name}</span>
                <button type="button" onclick="window.removeTempFile(${index})" style="background: none; border: none; color: #9CA3AF; cursor: pointer; font-weight: bold; font-size: 1rem; padding: 0; line-height: 1;">✕</button>
            `;
            preview.appendChild(tag);
        });
    }

    window.removeTempFile = function(index) {
        archivosTemporales.splice(index, 1);
        renderFilePreview();
    };

    const fileInput = document.getElementById('new-ticket-files');
    if (fileInput) {
        fileInput.addEventListener('change', (e) => {
            const files = e.target.files;
            for (let i = 0; i < files.length; i++) {
                if (!archivosTemporales.find(f => f.name === files[i].name)) {
                    archivosTemporales.push({ file: files[i], name: files[i].name });
                }
            }
            renderFilePreview();
            fileInput.value = '';
        });
    }

    function formatearFechaAmigable(fechaString) {
        if (!fechaString) return '-';
        if (fechaString.includes('Hoy')) return fechaString;
        const hoy = new Date();
        const fechaTicket = new Date(fechaString);
        if (isNaN(fechaTicket.getTime())) return fechaString; 
        if (fechaTicket.getDate() === hoy.getDate() && fechaTicket.getMonth() === hoy.getMonth() && fechaTicket.getFullYear() === hoy.getFullYear()) {
            const hora = fechaString.includes(',') ? fechaString.split(',')[1].trim() : '';
            return `Hoy${hora ? ', ' + hora : ''}`;
        }
        return fechaString;
    }

    // =============================================
    // 5. LÓGICA DE TICKETS (CON FILTRO POR ROL)
    // =============================================
    function renderTickets() {
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        let ticketsAMostrar = ticketModel.getAllTickets();
        
        if (currentUser.rol === 'Solicitante') {
            ticketsAMostrar = ticketsAMostrar.filter(t => t.solicitante === currentUser.nombre);
        } else if (currentUser.rol === 'Consultor') {
            ticketsAMostrar = ticketsAMostrar.filter(t => t.responsable === currentUser.nombre);
        }

        const filtroTexto = document.getElementById('filter-text')?.value.toLowerCase().trim() || '';
        const filtroEstado = document.getElementById('filter-status')?.value || 'todos';
        const filtroPrioridad = document.getElementById('filter-priority')?.value || 'todas';

        ticketsAMostrar = ticketsAMostrar.filter(ticket => {
            const coincideTexto = filtroTexto === '' || 
                ticket.id.toLowerCase().includes(filtroTexto) || 
                ticket.title.toLowerCase().includes(filtroTexto);

            const estadoParaFiltro = (!ticket.responsable || ticket.responsable === 'Sin asignar') 
                ? 'En espera' 
                : ticket.status;

            const coincideEstado = filtroEstado === 'todos' || estadoParaFiltro === filtroEstado;
            const coincidePrioridad = filtroPrioridad === 'todas' || ticket.priority === filtroPrioridad;

            return coincideTexto && coincideEstado && coincidePrioridad;
        });

        ticketsAMostrar.forEach(ticket => {
            const tr = document.createElement('tr');
            tr.className = 'ticket-row';
            tr.dataset.id = ticket.id;
            tr.style.cursor = 'pointer';
            
            const priorityClass = ticket.priority === 'Alta' ? 'alta' : ticket.priority === 'Media' ? 'media' : 'baja';
            const statusClass = ticket.status === 'En atención' ? 'atencion' : ticket.status === 'En espera' ? 'espera' : ticket.status === 'Resuelto' ? 'resuelto' : 'abierto';
            
            tr.innerHTML = `
                <td class="ticket-id">${ticket.id}</td>
                <td>${ticket.title}</td>
                <td>${ticket.category}</td>
                <td><span class="badge-priority ${priorityClass}">${ticket.priority}</span></td>
                <td><span class="badge-status ${statusClass}">${ticket.status}</span></td>
                <td>${ticket.responsable || 'Sin asignar'}</td>
                <td>${ticket.date}</td>
            `;
            
            tr.addEventListener('click', () => {
                const drawer = document.getElementById('ticket-drawer');
                const overlay = document.getElementById('drawer-overlay');
                if (drawer && overlay) {
                    document.getElementById('drawer-id').textContent = ticket.id;
                    document.getElementById('drawer-title').textContent = ticket.title;
                    document.getElementById('drawer-category').textContent = ticket.category;
                    document.getElementById('drawer-solicitante').textContent = ticket.solicitante;
                    document.getElementById('drawer-empresa').textContent = ticket.empresa;
                    document.getElementById('drawer-date').textContent = ticket.date;
                    document.getElementById('drawer-description').textContent = ticket.description;
                    
                    const statusBadge = document.getElementById('drawer-status');
                    statusBadge.textContent = ticket.status;
                    statusBadge.className = 'badge-status ' + statusClass;
                    
                    const priorityBadge = document.getElementById('drawer-priority');
                    priorityBadge.textContent = ticket.priority;
                    priorityBadge.className = 'badge-priority ' + priorityClass;

                    const timeline = document.getElementById('drawer-timeline');
                    if (timeline) {
                        timeline.innerHTML = '';
                        const historialTicket = ticketModel.getHistoryByTicketId(ticket.id) || [];
                        const esAdmin = currentUser.rol === 'Administrador';
                        
                        const historialFiltrado = historialTicket.filter(item => {
                            if (item.tipo === 'horas' && !esAdmin) return false;
                            return true;
                        });

                        historialFiltrado.forEach(item => {
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

                    const filesList = document.getElementById('drawer-files-list');
                    const filesSection = document.getElementById('drawer-files-section');
                    if (filesList && filesSection) {
                        filesList.innerHTML = '';
                        if (ticket.archivos && ticket.archivos.length > 0) {
                            filesSection.style.display = 'block';
                            ticket.archivos.forEach((fileObj) => {
                                const url = (fileObj.file instanceof Blob) ? URL.createObjectURL(fileObj.file) : '';
                                const li = document.createElement('li');
                                li.innerHTML = `
                                    <div class="attachment-item">
                                        <div class="attachment-info">
                                            <svg viewBox="0 0 24 24"><path d="M14 2H6c-1.1 0-1.99.9-1.99 2L4 20c0 1.1.89 2 1.99 2H18c1.1 0 2-.9 2-2V8l-6-6zm2 16H8v-2h8v2zm0-4H8v-2h8v2zm-3-5V3.5L18.5 9H13z"/></svg>
                                            <span class="attachment-name" title="${fileObj.name}">${fileObj.name}</span>
                                        </div>
                                        <div class="attachment-actions" ${url ? '' : 'style="display:none;"'}>
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

                    drawer.classList.add('open');
                    overlay.classList.add('active');

                    const btnDetalle = document.getElementById('btn-ver-detalle-completo');
                    if (btnDetalle) {
                        btnDetalle.onclick = () => {
                            drawer.classList.remove('open');
                            overlay.classList.remove('active');
                            if (window.ticketDetailController) {
                                window.ticketDetailController.openTicket(ticket.id);
                            }
                        };
                    }
                }
            });
            tbody.appendChild(tr);
        });

        document.removeEventListener('ticketUpdated', window.handleTicketUpdated);
        window.handleTicketUpdated = () => {
            renderTickets();
            updateBadge();
        };
        document.addEventListener('ticketUpdated', window.handleTicketUpdated);
    }

    // ✅ Lógica de los filtros de tickets
    const filterText = document.getElementById('filter-text');
    const filterStatus = document.getElementById('filter-status');
    const filterPriority = document.getElementById('filter-priority');

    if (filterText) filterText.addEventListener('input', () => renderTickets());
    if (filterStatus) filterStatus.addEventListener('change', () => renderTickets());
    if (filterPriority) filterPriority.addEventListener('change', () => renderTickets());

    function updateBadge() {
        let allTickets = ticketModel.getAllTickets();
        
        if (currentUser.rol === 'Solicitante') {
            allTickets = allTickets.filter(t => t.solicitante === currentUser.nombre);
        } else if (currentUser.rol === 'Consultor') {
            allTickets = allTickets.filter(t => t.responsable === currentUser.nombre);
        }

        const abiertos = allTickets.filter(t => t.status !== 'Resuelto').length;
        
        const badgeMenu = document.querySelector('.menu-item[data-target="view-tickets"] .badge');
        if (badgeMenu) {
            badgeMenu.textContent = abiertos;
            badgeMenu.style.display = abiertos > 0 ? 'inline-block' : 'none';
        }

        const countAbiertos = document.getElementById('count-abiertos');
        if (countAbiertos) countAbiertos.textContent = abiertos;

        const sinAsignar = allTickets.filter(t => !t.responsable || t.responsable === 'Sin asignar').length;
        const countEspera = document.getElementById('count-espera');
        if (countEspera) countEspera.textContent = sinAsignar;

        const resueltos = allTickets.filter(t => t.status === 'Resuelto').length;
        const countResueltos = document.getElementById('count-resueltos');
        if (countResueltos) countResueltos.textContent = resueltos;
    }

    renderTickets();
    updateBadge();

    // CERRAR DRAWER
    const drawerOverlay = document.getElementById('drawer-overlay');
    const btnCerrarDrawer = document.getElementById('btn-cerrar-drawer');
    
    if (drawerOverlay) {
        drawerOverlay.addEventListener('click', () => {
            document.getElementById('ticket-drawer').classList.remove('open');
            drawerOverlay.classList.remove('active');
        });
    }
    
    if (btnCerrarDrawer) {
        btnCerrarDrawer.addEventListener('click', () => {
            document.getElementById('ticket-drawer').classList.remove('open');
            if (drawerOverlay) drawerOverlay.classList.remove('active');
        });
    }

    // ABRIR MODAL TICKET
    const btnNuevoTicket = document.getElementById('btn-nuevo-ticket');
    if (btnNuevoTicket) {
        btnNuevoTicket.addEventListener('click', (e) => {
            e.preventDefault();
            const modal = document.getElementById('ticket-modal');
            if (modal) {
                document.getElementById('new-ticket-title').value = '';
                document.getElementById('new-ticket-description').value = '';
                archivosTemporales = [];
                renderFilePreview();
                
                const inputEmpresa = document.getElementById('new-ticket-empresa');
                if(inputEmpresa) inputEmpresa.value = currentUser.empresa || '';

                document.getElementById('new-ticket-type').value = 'Funcional';
                document.getElementById('conditional-fields').style.display = 'block';
                document.getElementById('group-funcional').style.display = 'block';
                document.getElementById('group-tecnico').style.display = 'none';
                modal.classList.add('active');
            }
        });
    }

    // CERRAR MODAL TICKET
    const closeModal = () => document.getElementById('ticket-modal').classList.remove('active');
    const btnCerrarModal = document.getElementById('btn-cerrar-modal');
    const btnCancelarModal = document.getElementById('btn-cancelar-modal');
    if (btnCerrarModal) btnCerrarModal.addEventListener('click', closeModal);
    if (btnCancelarModal) btnCancelarModal.addEventListener('click', closeModal);

    // CAMPOS CONDICIONALES TICKET
    const typeSelect = document.getElementById('new-ticket-type');
    if (typeSelect) {
        typeSelect.addEventListener('change', (e) => {
            const groupFuncional = document.getElementById('group-funcional');
            const groupTecnico = document.getElementById('group-tecnico');
            const conditionalFields = document.getElementById('conditional-fields');
            
            conditionalFields.style.display = 'block';
            
            if (e.target.value === 'Funcional') {
                groupFuncional.style.display = 'block';
                groupTecnico.style.display = 'none';
            } else {
                groupFuncional.style.display = 'none';
                groupTecnico.style.display = 'block';
            }
        });
    }

    // CREAR TICKET
    const btnSubmitTicket = document.getElementById('btn-submit-ticket');
    if (btnSubmitTicket) {
        btnSubmitTicket.addEventListener('click', () => {
            const title = document.getElementById('new-ticket-title').value.trim();
            const priority = document.getElementById('new-ticket-priority').value;
            const description = document.getElementById('new-ticket-description').value.trim();
            const typeValue = document.getElementById('new-ticket-type').value;
            
            const empresaTicket = document.getElementById('new-ticket-empresa').value.trim();

            if (title === '' || description === '') {
                alert('Llena el asunto y la descripción');
                return;
            }

            let category = '';
            let sistema = '';
            let ambiente = '';
            let modulo = '';

            if (typeValue === 'Funcional') {
                modulo = document.getElementById('new-ticket-modulo').value;
                category = modulo;
            } else {
                sistema = document.getElementById('new-ticket-sistema').value;
                ambiente = document.getElementById('new-ticket-ambiente').value;
                category = sistema;
            }

            const extraData = {
                tipoTicket: typeValue,
                pais: document.getElementById('new-ticket-country').value,
                modulo: modulo,
                sistema: sistema,
                ambiente: ambiente,
                contexto: '',
                medioRecepcion: 'Portal',
                enlaceExterno: '',
                solicitante: currentUser.nombre, 
                empresa: empresaTicket || currentUser.empresa || 'Innology Services',
                fechaExacta: new Date().toISOString().split('T')[0]
            };

            
            const newTicket = ticketModel.createTicket(title, category, priority, description, archivosTemporales, extraData);

            if (!newTicket || !newTicket.id) {
                alert('No se pudo crear el ticket. Revisa la consola (F12).');
                return;
            }

            try {
                archivosTemporales.forEach(fileObj => {
                    documentModel.addDocumentFromTicket(fileObj.name, 'Tickets', fileObj.file, newTicket.id, currentUser.nombre);
                });
            } catch (error) {
                console.error('⚠️ Error al guardar los documentos del ticket:', error);
            }
            
            renderTickets();
            updateBadge();
            
            document.dispatchEvent(new CustomEvent('documentAdded'));
            
            try {
                if (window.notify) {
                    window.notify({
                        titulo: 'Ticket Creado',
                        mensaje: `Tu ticket ${newTicket.id} ha sido registrado.`,
                        destinatario: currentUser.nombre,
                        tipo: 'ticket',
                        targetView: 'view-tickets',
                        targetId: newTicket.id
                    });
                    window.notify({
                        titulo: 'Nuevo Ticket',
                        mensaje: `El cliente creó el ticket ${newTicket.id}`,
                        destinatario: 'Administrador',
                        tipo: 'ticket',
                        targetView: 'view-tickets',
                        targetId: newTicket.id
                    });
                }
            } catch (error) {
                console.error('⚠️ Error al enviar las notificaciones:', error);
            }
            
            document.getElementById('new-ticket-title').value = '';
            document.getElementById('new-ticket-description').value = '';
            archivosTemporales = [];
            renderFilePreview();
            
            document.getElementById('new-ticket-type').value = 'Funcional';
            document.getElementById('conditional-fields').style.display = 'none';
            document.getElementById('group-funcional').style.display = 'none';
            document.getElementById('group-tecnico').style.display = 'none';

            closeModal();

            if (window.ticketDetailController) {
                window.ticketDetailController.openTicket(newTicket.id);
            }
        });
    }

    // 6. Menú móvil, notificaciones
    const sidebar = document.getElementById('sidebar');
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const overlay = document.getElementById('overlay');
    
    window.closeMobileMenu = function() {
        if(sidebar) sidebar.classList.remove('open');
        if(overlay) overlay.classList.remove('active');
    }

    if (mobileMenuBtn) mobileMenuBtn.addEventListener('click', () => {
        sidebar.classList.add('open');
        overlay.classList.add('active');
    });
    if (overlay) overlay.addEventListener('click', closeMobileMenu);

    const logoutBtn = document.querySelector('.btn-logout');
    if (logoutBtn) {
        logoutBtn.addEventListener('click', (e) => {
            e.preventDefault();
            sessionStorage.removeItem('innology_auth');
            sessionStorage.removeItem('innology_user');
            window.location.href = 'index.html';
        });
    }

    const notifContainer = document.getElementById('notifications-container');
    const notifDropdown = document.getElementById('notifications-dropdown');
    const bellIcon = document.getElementById('bell-icon');

    if (bellIcon) {
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('active');
        });
    }

    document.addEventListener('click', (e) => {
        if (notifContainer && !notifContainer.contains(e.target)) {
            notifDropdown.classList.remove('active');
        }
    });

    
    let fechaActual = new Date();
    
    let events = [
        { id: 1, date: "2026-11-05", time: "11:00", title: "Prueba de noviembre", type: "jcf", estado: "Pendiente", creador: "Laura Méndez", modalidad: "Online", enlace: "" },
        { id: 2, date: "2026-11-09", time: "10:00", title: "Revisión de avances", type: "trainee", estado: "Programada", creador: "Laura Méndez", modalidad: "Presencial", enlace: "" }
    ];

    const eventosGuardados = localStorage.getItem('innology_reuniones');
    if (eventosGuardados) {
        try {
            events = JSON.parse(eventosGuardados);
        } catch (e) {
            console.warn('⚠️ innology_reuniones tenía datos inválidos, se usan los de ejemplo.', e);
        }
    }

    function obtenerEventosVisibles() {
        const esAdmin = currentUser.rol === 'Administrador';
        
        if (esAdmin) {
            return events;
        }

        return events.filter(ev => {
            const esCreador = ev.creadorCorreo === currentUser.correo || ev.creador === currentUser.nombre;
            const estaInvitado = ev.participantes && ev.participantes.some(p => 
                p.correo === currentUser.correo || p.nombre === currentUser.nombre
            );
            return esCreador || estaInvitado;
        });
    }

    function getMonthName(m) {
        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];
        return meses[m];
    }

    function formatoHora(hora) {
        if (!hora) return '';
        const [h, m] = hora.split(':');
        const ampm = parseInt(h) >= 12 ? 'PM' : 'AM';
        const h12 = parseInt(h) % 12 || 12;
        return `${h12}:${m} ${ampm}`;
    }

    function renderCalendario() {
        const mesAnioTexto = document.getElementById('calendar-month-year');
        if (mesAnioTexto) {
            try {
                const year = fechaActual.getFullYear();
                const month = fechaActual.getMonth();

                mesAnioTexto.textContent = `${getMonthName(month)} ${year}`;
                document.getElementById('view-cal-month').style.display = 'block';
                document.getElementById('view-cal-list').style.display = 'none';
                dibujarMes(year, month);
                renderTablaInferior();
            } catch (e) {
                console.error('Error al dibujar el calendario:', e);
            }
        }

        // Tarjeta del Inicio (protegida para que nunca rompa la página)
        try { renderProximosEventos(); } catch (e) { console.error('Error en Próximos eventos:', e); }
    }


    function dibujarMes(year, month) {
        const contenedor = document.getElementById('calendar-days');
        if (!contenedor) return;
        contenedor.innerHTML = '';

        const eventosVisibles = obtenerEventosVisibles();

        const primerDia = new Date(year, month, 1).getDay(); 
        const diasEnMes = new Date(year, month + 1, 0).getDate();
        let offset = primerDia === 0 ? 6 : primerDia - 1;

        for (let i = 0; i < offset; i++) {
            contenedor.innerHTML += `<div class="calendar-cell empty"></div>`;
        }

        const hoy = new Date();
        const esHoyMes = hoy.getMonth() === month && hoy.getFullYear() === year;

        for (let d = 1; d <= diasEnMes; d++) {
            const esHoy = esHoyMes && hoy.getDate() === d;
            const fechaStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
            
            const eventosDelDia = eventosVisibles.filter(e => e.date === fechaStr);

            let htmlEventos = '';
            eventosDelDia.forEach(ev => {
                const tipo = ev.type || 'jcf'; 
                htmlEventos += `<div class="event-pill ${tipo}" title="${ev.title} - ${ev.time}">${ev.time} - ${ev.title}</div>`;
            });

            contenedor.innerHTML += `
                <div class="calendar-cell ${esHoy ? 'today' : ''}">
                    <span class="calendar-date-num">${d}</span>
                    ${htmlEventos}
                </div>
            `;
        }
    }

    function renderTablaInferior() {
        const tbody = document.getElementById('entrevistas-tbody');
        if (!tbody) return;

        const eventosVisibles = obtenerEventosVisibles();
        const year = fechaActual.getFullYear();
        const month = fechaActual.getMonth();

        const eventosDelMes = eventosVisibles.filter(e => {
            if (!e.date) return false;
            const d = new Date(e.date + 'T00:00:00');
            return d.getMonth() === month && d.getFullYear() === year;
        }).sort((a, b) => {
            if (a.date !== b.date) return a.date.localeCompare(b.date);
            return (a.time || '').localeCompare(b.time || '');
        });

        if (eventosDelMes.length === 0) {
            tbody.innerHTML = `<tr><td colspan="8" style="text-align:center;padding:40px;color:#9CA3AF;">No hay eventos programados para este mes.</td></tr>`;
            return;
        }

        const puedeEditar = currentUser.rol === 'Administrador' || currentUser.rol === 'Consultor';

        tbody.innerHTML = eventosDelMes.map(ev => {
            const d = new Date(ev.date + 'T00:00:00');
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = getMonthName(d.getMonth()).substring(0, 3).toLowerCase();
            const anio = d.getFullYear();
            const fechaFormateada = `${dia} ${mes} ${anio}`;

            const tipoClass = 'jcf'; 
            const tipoText = 'Reunión';
            
            const estado = ev.estado || 'Programada';
            let badgeEstado = 'espera'; // Amarillo
            if (estado === 'En proceso') badgeEstado = 'atencion'; // Morado
            if (estado === 'Completada') badgeEstado = 'resuelto'; // Verde
            if (estado === 'Cancelada') badgeEstado = 'cancelada'; // Rojo
            
            const enlaceHTML = ev.enlace 
                ? `<a href="${ev.enlace}" target="_blank" style="color:var(--primary-red); font-weight:600; font-size:0.8rem;">Link</a>` 
                : '-';

            const accionesHTML = puedeEditar 
                ? `
                    <div style="display:flex; gap:5px;">
                        <button class="btn-action" title="Editar" onclick="window.editarReunion('${ev.id}')">
                            <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor"><path d="M3 17.25V21h3.75L17.81 9.94l-3.75-3.75L3 17.25zM20.71 7.04c.39-.39.39-1.02 0-1.41l-2.34-2.34c-.39-.39-1.02-.39-1.41 0l-1.83 1.83 3.75 3.75 1.83-1.83z"/></svg>
                        </button>
                    </div>
                  `
                : `<span style="color:#9CA3AF; font-size:0.8rem;">-</span>`;

            return `
                <tr class="ticket-row">
                    <td><strong>${ev.title}</strong></td>
                    <td><span class="event-pill ${tipoClass}" style="display:inline-block; border:none; background:transparent; padding:0; font-size: 0.75rem; font-weight: 600;">${tipoText}</span></td>
                    <td>${fechaFormateada}</td>
                    <td>${formatoHora(ev.time)}</td>
                    <td>${ev.modalidad || 'Online'}</td>
                    <td>${enlaceHTML}</td>
                    <td><span class="badge-status ${badgeEstado}">${estado}</span></td>
                    <td>${accionesHTML}</td>
                </tr>
            `;
        }).join('');
    }


    // =============================================
    // PRÓXIMOS EVENTOS (tarjeta del Inicio)
    // =============================================
    function renderProximosEventos() {
        const cont = document.getElementById('proximos-eventos-list');
        if (!cont) return;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const proximos = obtenerEventosVisibles()
            .filter(ev => {
                if (!ev.date) return false;
                const f = new Date(ev.date + 'T00:00:00');
                return f >= hoy && ev.estado !== 'Cancelada' && ev.estado !== 'Completada';
            })
            .sort((a, b) => a.date !== b.date
                ? a.date.localeCompare(b.date)
                : (a.time || '').localeCompare(b.time || ''))
            .slice(0, 4);

        if (proximos.length === 0) {
            cont.innerHTML = `<p style="color:#9CA3AF; font-size:0.85rem; margin:0;">No hay eventos próximos.</p>`;
            return;
        }

        cont.innerHTML = proximos.map(ev => {
            const d = new Date(ev.date + 'T00:00:00');
            const dia = String(d.getDate()).padStart(2, '0');
            const mes = getMonthName(d.getMonth()).substring(0, 3);
            return `
                <div style="display:flex; align-items:center; gap:12px; padding:8px 0; border-bottom:1px solid #F3F4F6;">
                    <div style="min-width:44px; text-align:center; background:#FEE2E2; color:#b3001b; border-radius:6px; padding:4px 0;">
                        <div style="font-size:1rem; font-weight:700; line-height:1;">${dia}</div>
                        <div style="font-size:0.65rem; text-transform:uppercase;">${mes}</div>
                    </div>
                    <div>
                        <div style="font-size:0.85rem; font-weight:600;">${ev.title}</div>
                        <div style="font-size:0.75rem; color:#6B7280;">${formatoHora(ev.time)} · ${ev.modalidad || 'Online'}</div>
                    </div>
                </div>`;
        }).join('');
    }

    // =============================================
    // CUMPLEAÑOS (tarjeta del Inicio) - próximos 30 días
    // =============================================
    function renderCumpleanos() {
        const cont = document.getElementById('cumpleanos-list');
        if (!cont) return;

        const hoy = new Date();
        hoy.setHours(0, 0, 0, 0);

        const usuarios = new UserModel().getAllUsers().filter(u => u.estado === 'Activo');

        const cumples = usuarios.map(u => {
            const fecha = u.fechaNacimiento || u.birthdate || u.fecha_nacimiento || u.fechaNac;
            if (!fecha || typeof fecha !== 'string') return null;
            const [, m, d] = fecha.substring(0, 10).split('-').map(Number);
            if (!m || !d) return null;

            let proximo = new Date(hoy.getFullYear(), m - 1, d);
            if (proximo < hoy) proximo = new Date(hoy.getFullYear() + 1, m - 1, d);
            const dias = Math.round((proximo - hoy) / 86400000);

            return { nombre: u.nombre, dia: d, mes: m - 1, dias };
        })
        .filter(c => c && c.dias <= 30)
        .sort((a, b) => a.dias - b.dias)
        .slice(0, 4);

        if (cumples.length === 0) {
            cont.innerHTML = `<p style="color:#9CA3AF; font-size:0.85rem; margin:0;">No hay cumpleaños próximos.</p>`;
            return;
        }

        cont.innerHTML = cumples.map(c => `
            <div style="display:flex; justify-content:space-between; align-items:center; padding:8px 0; border-bottom:1px solid #F3F4F6;">
                <span style="font-size:0.85rem; font-weight:600;">${c.nombre}</span>
                <span style="font-size:0.75rem; color:#6B7280;">
                    ${c.dias === 0 ? '🎉 ¡Hoy!' : `${c.dia} ${getMonthName(c.mes).substring(0, 3).toLowerCase()}`}
                </span>
            </div>`).join('');
    }    
     
    function poblarParticipantes(participantesActuales = []) {
        const userModel = new UserModel();
        const usuariosActivos = userModel.getAllUsers().filter(u => u.estado === 'Activo');
        const listaParticipantes = document.querySelector('#dropdown-participantes .items');
        const anchorParticipantes = document.querySelector('#dropdown-participantes .anchor');

        if (!listaParticipantes || !anchorParticipantes) return;

        listaParticipantes.innerHTML = '';
        anchorParticipantes.textContent = 'Seleccionar participantes...';

        usuariosActivos.forEach(u => {
            if (u.id !== currentUser.id) {
                const li = document.createElement('li');
                const estaInvitado = participantesActuales.some(p => p.correo === u.correo || p.nombre === u.nombre);
                const checked = estaInvitado ? 'checked' : '';
                
                li.innerHTML = `<label><input type="checkbox" value="${u.correo}" data-nombre="${u.nombre}" ${checked}> ${u.nombre} (${u.rol})</label>`;
                listaParticipantes.appendChild(li);
            }
        });

        if (listaParticipantes.children.length === 0) {
            listaParticipantes.innerHTML = '<li style="color:#9CA3AF; padding:8px 12px; font-size:0.85rem;">No hay otros usuarios activos</li>';
        }

        const checkboxes = listaParticipantes.querySelectorAll('input[type="checkbox"]');

        const selectedIniciales = Array.from(checkboxes).filter(c => c.checked).map(c => c.getAttribute('data-nombre'));
        if (selectedIniciales.length > 0) {
            anchorParticipantes.textContent = selectedIniciales.join(', ');
        }

        checkboxes.forEach(cb => {
            cb.addEventListener('change', () => {
                const selected = Array.from(checkboxes).filter(c => c.checked).map(c => c.getAttribute('data-nombre'));
                anchorParticipantes.textContent = selected.length > 0 ? selected.join(', ') : 'Seleccionar participantes...';
            });
        });
    }

    window.editarReunion = function(id) {
        const ev = events.find(e => e.id == id);
        if (!ev) return;

        document.getElementById('modal-meeting-title').textContent = 'Editar reunión';
        document.getElementById('meeting-id').value = ev.id;
        document.getElementById('meeting-title').value = ev.title;
        document.getElementById('meeting-date').value = ev.date;
        document.getElementById('meeting-time').value = ev.time;
        document.getElementById('meeting-estado').value = ev.estado || 'Programada';
        document.getElementById('meeting-modalidad').value = ev.modalidad || 'Online';
        document.getElementById('meeting-enlace').value = ev.enlace || '';
        document.getElementById('meeting-date').removeAttribute('min');

        document.getElementById('meeting-modalidad').dispatchEvent(new Event('change'));

        poblarParticipantes(ev.participantes || []);

        meetingModal.classList.add('active');
    };

    const selectModalidad = document.getElementById('meeting-modalidad');
    if (selectModalidad) {
        selectModalidad.addEventListener('change', (e) => {
            const groupEnlace = document.getElementById('group-meeting-enlace');
            if (groupEnlace) {
                groupEnlace.style.display = e.target.value === 'Online' ? 'block' : 'none';
            }
        });
    }

    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');
    const btnToday = document.getElementById('btn-today');

    if (btnPrev) {
        btnPrev.onclick = () => {
            fechaActual.setMonth(fechaActual.getMonth() - 1);
            renderCalendario();
        };
    }
    if (btnNext) {
        btnNext.onclick = () => {
            fechaActual.setMonth(fechaActual.getMonth() + 1);
            renderCalendario();
        };
    }
    if (btnToday) {
        btnToday.onclick = () => {
            fechaActual = new Date();
            renderCalendario();
        };
    }


    const btnAgendar = document.getElementById('btn-agendar-reunion');
    const meetingModal = document.getElementById('meeting-modal');
    const btnCerrarMeeting = document.getElementById('btn-cerrar-modal-meeting');
    const btnCancelarMeeting = document.getElementById('btn-cancelar-modal-meeting');
    const btnSubmitMeeting = document.getElementById('btn-submit-meeting');

    const dropdownParticipantes = document.getElementById('dropdown-participantes');
    if (dropdownParticipantes) {
        const anchor = dropdownParticipantes.querySelector('.anchor');
        const items = dropdownParticipantes.querySelector('.items');
        if (anchor && items) {
            anchor.addEventListener('click', (e) => {
                e.stopPropagation();
                items.classList.toggle('visible');
            });

            items.addEventListener('click', (e) => e.stopPropagation());
            document.addEventListener('click', () => items.classList.remove('visible'));
        }
    }

    if (btnAgendar) {
        btnAgendar.addEventListener('click', () => {
            document.getElementById('meeting-id').value = '';
            document.getElementById('modal-meeting-title').textContent = 'Agendar reunión';
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-time').value = '10:00';
            document.getElementById('meeting-estado').value = 'Programada';
            document.getElementById('meeting-modalidad').value = 'Online';
            document.getElementById('meeting-enlace').value = '';
            document.getElementById('meeting-enlace').parentElement.style.display = 'block';
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1); 
            const minDate = tomorrow.toISOString().split('T')[0];
            const dateInput = document.getElementById('meeting-date');
            dateInput.min = minDate; 
            dateInput.value = minDate; 

            poblarParticipantes([]);
            
            meetingModal.classList.add('active');
        });
    }

    const closeMeetingModal = () => { if (meetingModal) meetingModal.classList.remove('active'); };
    if (btnCerrarMeeting) btnCerrarMeeting.addEventListener('click', closeMeetingModal);
    if (btnCancelarMeeting) btnCancelarMeeting.addEventListener('click', closeMeetingModal);
    
    if (btnSubmitMeeting) {
        btnSubmitMeeting.addEventListener('click', () => {
            const idEditandoRaw = document.getElementById('meeting-id').value;
            const idEditando = idEditandoRaw ? Number(idEditandoRaw) : null;

            const title = document.getElementById('meeting-title').value.trim();
            const date = document.getElementById('meeting-date').value;
            const time = document.getElementById('meeting-time').value;
            const estadoSeleccionado = document.getElementById('meeting-estado').value;
            const modalidadSeleccionada = document.getElementById('meeting-modalidad').value;
            const enlaceIngresado = document.getElementById('meeting-enlace').value.trim();
            
            const checkboxesParticipantes = document.querySelectorAll('#dropdown-participantes .items input[type="checkbox"]:checked');
            const participantes = Array.from(checkboxesParticipantes).map(cb => ({
                correo: cb.value,
                nombre: cb.getAttribute('data-nombre')
            }));

            if (title === '' || date === '') {
                alert('Por favor, llena el título y la fecha.');
                return;
            }

            const selectedDate = new Date(date + 'T00:00:00');
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0); 

            if (!idEditando && selectedDate <= todayCheck) {
                alert('No puedes agendar una reunión para hoy ni para días pasados. Debe ser con al menos 1 día de anticipación.');
                return;
            }
            
            if (idEditando) {
                const index = events.findIndex(e => Number(e.id) === idEditando);
                if (index !== -1) {
                    events[index] = {
                        ...events[index],
                        title: title,
                        date: date,
                        time: time,
                        estado: estadoSeleccionado,
                        modalidad: modalidadSeleccionada,
                        enlace: enlaceIngresado,
                        participantes: participantes
                    };
                }
            } else {
                events.push({
                    id: Date.now(),
                    date: date,
                    time: time,
                    title: title,
                    type: 'reunion', 
                    estado: estadoSeleccionado,
                    modalidad: modalidadSeleccionada,
                    enlace: enlaceIngresado,
                    participantes: participantes,
                    creador: currentUser.nombre,
                    creadorCorreo: currentUser.correo
                });
            }

            localStorage.setItem('innology_reuniones', JSON.stringify(events));

            fechaActual = selectedDate;
            renderCalendario();
            closeMeetingModal();

            document.getElementById('meeting-id').value = '';

            if (window.notify && !idEditando) {
                window.notify({
                    titulo: 'Nueva Reunión',
                    mensaje: `${title} agendada para el ${date} a las ${time}`,
                    destinatario: currentUser.nombre,
                    tipo: 'reunion',
                    targetView: 'view-calendario'
                });
                
                participantes.forEach(p => {
                    window.notify({
                        titulo: 'Invitación a Reunión',
                        mensaje: `${currentUser.nombre} te invitó a: ${title} el ${date} a las ${time}`,
                        destinatario: p.nombre,
                        tipo: 'reunion',
                        targetView: 'view-calendario'
                    });
                });
            }
        });
    }

    renderCalendario();
    try { renderCumpleanos(); } catch (e) { console.error('Error en Cumpleaños:', e); }
}); // Fin del DOMContentLoaded