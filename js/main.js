import { DashboardController } from './controllers/DashboardController.js';
import { DocumentController } from './controllers/DocumentController.js';
import { TicketController } from './controllers/TicketController.js';
import { GlobalSearchController } from './controllers/GlobalSearchController.js';

import { TicketModel } from './models/TicketModel.js';
import { DocumentModel } from './models/DocumentModel.js';

document.addEventListener('DOMContentLoaded', () => {
    
    // 1. Lógica de Pestañas con Hash
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

    // 2. Inicializar Modelos y Controladores
    try {
        const ticketModel = new TicketModel();
        const documentModel = new DocumentModel();

        if (document.getElementById('view-inicio')) new DashboardController();
        
        let ticketController;
        if (document.getElementById('view-tickets')) {
            ticketController = new TicketController(ticketModel);
        }
        
        if (document.getElementById('view-documentos')) {
            new DocumentController(documentModel);
        }

        new GlobalSearchController(ticketModel, documentModel, ticketController);

               // 3. LÓGICA DE LOS BOTONES DE ACCESOS RÁPIDOS
        // Botón "Crear un ticket"
        const btnCrearTicket = document.querySelector('.quick-access .quick-btn:nth-child(2)');
        if (btnCrearTicket) {
            btnCrearTicket.removeAttribute('onclick');
            btnCrearTicket.addEventListener('click', () => {
                // 1. Ir a la vista de tickets
                switchView('view-tickets');
                
                // 2. Abrir el modal y LIMPIAR LOS CAMPOS
                setTimeout(() => {
                    const modal = document.getElementById('ticket-modal');
                    if (modal) {
                        // Limpiamos el formulario
                        document.getElementById('new-ticket-title').value = '';
                        document.getElementById('new-ticket-description').value = '';
                        document.getElementById('file-preview').innerHTML = '';
                        // Abrimos el modal
                        modal.classList.add('active');
                    }
                }, 100);
            });
        }

        // Botón "Ver mis documentos" (ya funciona con el onclick del HTML, pero lo forzamos por si acaso)
        const btnVerDocs = document.querySelector('.quick-access .quick-btn:nth-child(3)');
        if (btnVerDocs) {
            btnVerDocs.removeAttribute('onclick');
            btnVerDocs.addEventListener('click', () => {
                switchView('view-documentos');
            });
        }

        // Botón "Ver reuniones"
        const btnVerReuniones = document.querySelector('.quick-access .quick-btn:nth-child(4)');
        if (btnVerReuniones) {
            btnVerReuniones.removeAttribute('onclick');
            btnVerReuniones.addEventListener('click', () => {
                switchView('view-calendario');
            });
        }

    } catch (error) {
        console.error("Error al inicializar los módulos:", error);
    }

    // 4. Lógica Móvil y Cerrar Sesión
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
            window.location.href = 'index.html';
        });
    }

           // 6. LÓGICA DE NOTIFICACIONES
    const notifContainer = document.getElementById('notifications-container');
    const notifDropdown = document.getElementById('notifications-dropdown');
    const bellIcon = document.getElementById('bell-icon');

    if (bellIcon) {
        bellIcon.addEventListener('click', (e) => {
            e.stopPropagation();
            notifDropdown.classList.toggle('active');
        });
    }

    // Lógica para redirigir al hacer clic en una notificación
    const notifItems = document.querySelectorAll('.notif-item');
    notifItems.forEach(item => {
        item.addEventListener('click', () => {
            const targetView = item.getAttribute('data-target');
            const ticketId = item.getAttribute('data-ticket');

            // 1. Cerrar el menú de notificaciones
            notifDropdown.classList.remove('active');

            // 2. Animación de desaparición (opcional)
            item.style.opacity = '0';
            item.style.transform = 'translateX(20px)';
            item.style.transition = 'all 0.3s ease';

            // 3. Redirigir a la vista correspondiente
            if (targetView) {
                switchView(targetView);
            }

            // 4. Si es un ticket, abrir su Drawer automáticamente
            if (targetView === 'view-tickets' && ticketId) {
                setTimeout(() => {
                    const row = document.querySelector(`#tickets-tbody tr[data-id="${ticketId}"]`);
                    if (row) row.click();
                }, 100);
            }

            // 5. Eliminar la notificación del DOM después de la animación
            setTimeout(() => {
                item.remove();
                
                // Si ya no quedan notificaciones, ocultar el puntito rojo y mostrar mensaje
                const remainingNotifs = document.querySelectorAll('.notif-item');
                if (remainingNotifs.length === 0) {
                    const dot = document.querySelector('.notification-dot');
                    if (dot) dot.style.display = 'none';
                    
                    const notifList = document.querySelector('.notif-list');
                    if (notifList) {
                        notifList.innerHTML = '<div style="padding: 20px; text-align: center; color: #9CA3AF; font-size: 0.9rem;">No hay notificaciones nuevas.</div>';
                    }
                }
            }, 300); // Esperamos a que termine la animación
        });
    });

    // Cerrar el menú si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (notifContainer && !notifContainer.contains(e.target)) {
            notifDropdown.classList.remove('active');
        }
    });

    // Cerrar el menú si se hace clic fuera
    document.addEventListener('click', (e) => {
        if (notifContainer && !notifContainer.contains(e.target)) {
            notifDropdown.classList.remove('active');
        }
    });
});