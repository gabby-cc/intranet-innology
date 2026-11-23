import { DashboardController } from './controllers/DashboardController.js';
import { DocumentController } from './controllers/DocumentController.js';
import { GlobalSearchController } from './controllers/GlobalSearchController.js';
import { TicketDetailController } from './controllers/TicketDetailController.js';
import { NotificationController } from './controllers/NotificationController.js';

import { TicketModel } from './models/TicketModel.js';
import { DocumentModel } from './models/DocumentModel.js';

document.addEventListener('DOMContentLoaded', () => {
    
// =============================================
// ✅ 0. SISTEMA DE ROLES Y PERMISOS
// =============================================
let currentUser = JSON.parse(sessionStorage.getItem('innology_user'));

// 🔒 NUEVO: Si no hay usuario O el usuario está inactivo, lo sacamos
if (!currentUser || currentUser.estado === 'Inactivo') {
    sessionStorage.removeItem('innology_user');
    sessionStorage.removeItem('innology_auth');
    alert('⛔ Tu cuenta ha sido desactivada o la sesión expiró.');
    window.location.href = 'index.html';
    return;
}

window.currentUser = currentUser;
console.log(`👤 Sesión iniciada como: ${currentUser.nombre} (${currentUser.rol})`);

    // Ocultar menú de Usuarios si no es Administrador
    const menuUsuarios = document.querySelector('.menu-item[data-target="view-usuarios"]');
    if (menuUsuarios) {
        menuUsuarios.style.display = (currentUser.rol === 'Administrador') ? 'flex' : 'none';
    }

    // Mostrar datos del usuario en la barra superior
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
        menuItems.forEach(i => i.classList.remove('active'));
        views.forEach(v => v.classList.remove('active'));
        const target = document.getElementById(targetId);
        if (target) target.classList.add('active');
        const activeMenu = document.querySelector(`.menu-item[data-target="${targetId}"]`);
        if (activeMenu) activeMenu.classList.add('active');
        window.location.hash = targetId.replace('view-', '');
    }

    window.switchView = switchView;

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchView(item.getAttribute('data-target'));
            if (window.innerWidth <= 768) window.closeMobileMenu();
        });
    });

    const hash = window.location.hash.replace('#', '');
    if (hash && document.getElementById('view-' + hash)) {
        switchView('view-' + hash);
    }

    // 2. Inicializar Modelos
    const ticketModel = new TicketModel();
    const documentModel = new DocumentModel();

    // 3. Inicializar Controladores
    if (document.getElementById('view-inicio')) new DashboardController();
    if (document.getElementById('view-documentos')) new DocumentController(documentModel);
    new GlobalSearchController(ticketModel, documentModel, null);

    // ✅ CORREGIDO: Pasamos el rol y el nombre reales del usuario logueado
    // Mapeo: "Administrador" → "admin", "Consultor" → "consultor", "Solicitante" → "cliente"
    const rolMap = {
        'Administrador': 'admin',
        'Consultor': 'consultor',
        'Solicitante': 'cliente'
    };
    const userRoleNormalized = rolMap[currentUser.rol] || 'cliente';
    window.ticketDetailController = new TicketDetailController(ticketModel, userRoleNormalized, currentUser.nombre);
    console.log(`🔧 TicketDetailController inicializado con rol: ${userRoleNormalized} | usuario: ${currentUser.nombre}`);
    
    // ✅ INICIALIZAMOS NOTIFICACIONES
    new NotificationController();

    if (document.getElementById('view-usuarios')) {
        import('./controllers/UserController.js')
            .then(module => new module.UserController())
            .catch(error => console.warn("⚠️ Módulo de usuarios no cargado:", error));
    }


    // =============================================
    // ✅ NUEVO: Lógica de los Accesos Rápidos del Inicio
    // =============================================
    
    const btnQuickTicket = document.getElementById('btn-quick-ticket');
    if (btnQuickTicket) {
        btnQuickTicket.addEventListener('click', () => {
            switchView('view-tickets'); 
            const modal = document.getElementById('ticket-modal');
            if (modal) {
                document.getElementById('new-ticket-title').value = '';
                document.getElementById('new-ticket-description').value = '';
                document.getElementById('new-ticket-type').value = 'Funcional';
                document.getElementById('conditional-fields').style.display = 'block';
                document.getElementById('group-funcional').style.display = 'block';
                document.getElementById('group-tecnico').style.display = 'none';
                modal.classList.add('active');
            }
        });
    }

    const btnQuickDocs = document.getElementById('btn-quick-docs');
    if (btnQuickDocs) {
        btnQuickDocs.addEventListener('click', () => switchView('view-documentos'));
    }

    const btnQuickCalendar = document.getElementById('btn-quick-calendar');
    if (btnQuickCalendar) {
        btnQuickCalendar.addEventListener('click', () => switchView('view-calendario'));
    }

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

    // =============================================
    // 5. LÓGICA DE TICKETS (CON FILTRO POR ROL)
    // =============================================
    function renderTickets() {
        const tbody = document.getElementById('tickets-tbody');
        if (!tbody) return;
        tbody.innerHTML = '';
        
        // ✅ FILTRO POR ROL
        let ticketsAMostrar = ticketModel.getAllTickets();
        
        if (currentUser.rol === 'Solicitante') {
            ticketsAMostrar = ticketsAMostrar.filter(t => t.solicitante === currentUser.nombre);
        } else if (currentUser.rol === 'Consultor') {
            ticketsAMostrar = ticketsAMostrar.filter(t => t.responsable === currentUser.nombre);
        }
        // El Administrador ve todos (no filtramos)

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

                    // ✅ CÓDIGO CORREGIDO: Filtra las horas si no es admin
                    const timeline = document.getElementById('drawer-timeline');
                    if (timeline) {
                        timeline.innerHTML = '';
                        
                        // Obtenemos el historial y lo filtramos
                        const historialTicket = ticketModel.getHistoryByTicketId(ticket.id) || [];
                        const esAdmin = currentUser.rol === 'Administrador';
                        
                        const historialFiltrado = historialTicket.filter(item => {
                            // Si es registro de horas y NO es admin, lo ocultamos
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

    function updateBadge() {
        // ✅ El badge se filtra según el rol también
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
        if (countAbiertos) {
            countAbiertos.textContent = abiertos;
        }

        const enEspera = allTickets.filter(t => t.status === 'En espera').length;
        const cardEnEspera = document.querySelectorAll('.summary-card p')[2];
        if (cardEnEspera && cardEnEspera.previousElementSibling) {
            cardEnEspera.previousElementSibling.textContent = enEspera;
        }

        const resueltos = allTickets.filter(t => t.status === 'Resuelto').length;
        const cardResueltos = document.querySelectorAll('.summary-card p')[3];
        if (cardResueltos && cardResueltos.previousElementSibling) {
            cardResueltos.previousElementSibling.textContent = resueltos;
        }
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
                solicitante: currentUser.nombre, // ✅ AQUÍ SE GUARDA EL NOMBRE DEL QUE CREA
                empresa: currentUser.empresa || 'Grupo Atlas' // ✅ Y SU EMPRESA
            };

            
            const newTicket = ticketModel.createTicket(title, category, priority, description, archivosTemporales, extraData);
            
            archivosTemporales.forEach(fileObj => {
                documentModel.addDocumentFromTicket(
                    fileObj.name, 
                    'Tickets', 
                    fileObj.file, 
                    newTicket.id
                );
            });
            
            renderTickets();
            updateBadge();
            
            document.dispatchEvent(new CustomEvent('documentAdded'));
            
            // ✅ NOTIFICACIÓN AL CLIENTE Y AL ADMIN
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
            
            document.getElementById('new-ticket-title').value = '';
            document.getElementById('new-ticket-description').value = '';
            archivosTemporales = [];
            renderFilePreview();
            
            document.getElementById('new-ticket-type').value = 'Funcional';
            document.getElementById('conditional-fields').style.display = 'none';
            document.getElementById('group-funcional').style.display = 'none';
            document.getElementById('group-tecnico').style.display = 'none';

            closeModal();
        });
    }

    // 6. Menú móvil, notificaciones, calendario
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

    // 7. NOTIFICACIONES (La campanita y el toggle)
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

    // 8. Lógica del Calendario
    const btnVerCalendario = document.querySelector('.card a.link-red[href="#"]');
    if (btnVerCalendario) {
        btnVerCalendario.addEventListener('click', (e) => {
            e.preventDefault();
            switchView('view-calendario');
        });
    }

    const today = new Date();
    let currentMonth = today.getMonth(); 
    let currentYear = today.getFullYear(); 

    const events = [
        { date: "2026-10-19", time: "09:00", title: "Capacitación a usuarios clave" },
        { date: "2026-10-21", time: "10:00", title: "Reunión de seguimiento semanal" },
        { date: "2026-10-29", time: "10:30", title: "Revisión de pruebas de cuentas por pagar" },
        { date: "2026-11-05", time: "11:00", title: "Prueba de noviembre" }
    ];

    function renderCalendar() {
        const calendarDays = document.getElementById('calendar-days');
        const monthYearLabel = document.getElementById('calendar-month-year');
        const eventsList = document.getElementById('calendar-events-list');
        if (!calendarDays) return;

        calendarDays.innerHTML = '';
        if (eventsList) eventsList.innerHTML = '';

        const monthNames = ["Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio", "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"];
        if (monthYearLabel) monthYearLabel.textContent = `${monthNames[currentMonth]} de ${currentYear}`;

        const firstDayOfMonth = new Date(currentYear, currentMonth, 1).getDay();
        const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
        let startDay = firstDayOfMonth === 0 ? 6 : firstDayOfMonth - 1; 

        for (let i = 0; i < startDay; i++) {
            const emptyDiv = document.createElement('div');
            emptyDiv.className = 'calendar-day empty';
            calendarDays.appendChild(emptyDiv);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const dateStr = `${currentYear}-${(currentMonth + 1).toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
            const dayEvents = events.filter(e => e.date === dateStr);
            
            const dayDiv = document.createElement('div');
            dayDiv.className = 'calendar-day';
            
            const todayDate = new Date();
            if (currentMonth === todayDate.getMonth() && currentYear === todayDate.getFullYear() && day === todayDate.getDate()) {
                dayDiv.classList.add('today');
            }

            let dayHTML = `<div class="calendar-day-number">${day}</div>`;
            
            if (dayEvents.length > 0) {
                dayHTML += `<div style="display: flex; flex-direction: column; gap: 3px; margin-top: 5px; overflow: hidden;">`;
                dayEvents.forEach(event => {
                    dayHTML += `
                        <div class="calendar-event-block" style="background-color: #E11D48; color: #FFFFFF; padding: 4px 6px; border-radius: 4px; font-size: 0.72rem; font-weight: 500; cursor: pointer; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; transition: background-color 0.2s;" onmouseover="this.style.backgroundColor='#9F1239'" onmouseout="this.style.backgroundColor='#E11D48'" title="${event.title} - ${event.time}">
                            ${event.title}
                        </div>
                    `;
                });
                dayHTML += `</div>`;
            }

            dayDiv.innerHTML = dayHTML;
            calendarDays.appendChild(dayDiv);

            dayEvents.forEach(event => {
                if (!eventsList) return;
                const item = document.createElement('div');
                item.className = 'event-item';
                item.innerHTML = `
                    <div class="event-date">
                        <strong>${day}</strong>
                        <span>${monthNames[currentMonth].substring(0, 3).toLowerCase()}</span>
                    </div>
                    <div class="event-info">
                        <h4>${event.title}</h4>
                        <p>${event.time}, Reunión</p>
                    </div>
                `;
                eventsList.appendChild(item);
            });
        }
    }

    const btnPrev = document.getElementById('btn-prev-month');
    const btnNext = document.getElementById('btn-next-month');

    if (btnPrev) {
        btnPrev.addEventListener('click', () => {
            currentMonth--;
            if (currentMonth < 0) { currentMonth = 11; currentYear--; }
            renderCalendar();
        });
    }

    if (btnNext) {
        btnNext.addEventListener('click', () => {
            currentMonth++;
            if (currentMonth > 11) { currentMonth = 0; currentYear++; }
            renderCalendar();
        });
    }
    renderCalendar();

    // 9. LÓGICA PARA AGENDAR REUNIÓN
    const btnAgendar = document.getElementById('btn-agendar-reunion');
    const meetingModal = document.getElementById('meeting-modal');
    const btnCerrarMeeting = document.getElementById('btn-cerrar-modal-meeting');
    const btnCancelarMeeting = document.getElementById('btn-cancelar-modal-meeting');
    const btnSubmitMeeting = document.getElementById('btn-submit-meeting');

    if (btnAgendar) {
        btnAgendar.addEventListener('click', () => {
            document.getElementById('meeting-title').value = '';
            document.getElementById('meeting-time').value = '10:00';
            
            const tomorrow = new Date();
            tomorrow.setDate(tomorrow.getDate() + 1); 
            const minDate = tomorrow.toISOString().split('T')[0];
            const dateInput = document.getElementById('meeting-date');
            dateInput.min = minDate; 
            dateInput.value = minDate; 
            
            meetingModal.classList.add('active');
        });
    }

    const closeMeetingModal = () => { if (meetingModal) meetingModal.classList.remove('active'); };
    if (btnCerrarMeeting) btnCerrarMeeting.addEventListener('click', closeMeetingModal);
    if (btnCancelarMeeting) btnCancelarMeeting.addEventListener('click', closeMeetingModal);
    if (btnSubmitMeeting) {
        btnSubmitMeeting.addEventListener('click', () => {
            const title = document.getElementById('meeting-title').value.trim();
            const date = document.getElementById('meeting-date').value;
            const time = document.getElementById('meeting-time').value;
            if (title === '' || date === '') {
                alert('Por favor, llena el título y la fecha.');
                return;
            }

            const selectedDate = new Date(date + 'T00:00:00');
            const todayCheck = new Date();
            todayCheck.setHours(0, 0, 0, 0); 

            if (selectedDate <= todayCheck) {
                alert('No puedes agendar una reunión para hoy ni para días pasados. Debe ser con al menos 1 día de anticipación.');
                return;
            }
            events.push({
                id: Date.now(),
                date: date,
                time: time,
                title: title
            });

            currentMonth = selectedDate.getMonth();
            currentYear = selectedDate.getFullYear();
            renderCalendar();
            closeMeetingModal();

            // ✅ NOTIFICACIÓN DE REUNIÓN
            if (window.notify) {
                window.notify({
                    titulo: 'Nueva Reunión',
                    mensaje: `${title} agendada para el ${date} a las ${time}`,
                    destinatario: currentUser.nombre,
                    tipo: 'reunion',
                    targetView: 'view-calendario'
                });
                window.notify({
                    titulo: 'Nueva Reunión',
                    mensaje: `${title} agendada por el cliente.`,
                    destinatario: 'Administrador',
                    tipo: 'reunion',
                    targetView: 'view-calendario'
                });
            }
        });
    }
});