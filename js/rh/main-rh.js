import { TraineeController } from './controllers/TraineeController.js';
import { JcfController } from './controllers/JcfController.js';
import { EntrevistaController } from './controllers/EntrevistaController.js';
import { HorasController } from './controllers/HorasController.js';
import { DocumentoController } from './controllers/DocumentoController.js';

/* =========================================
   MÓDULO RH - NAVEGACIÓN Y LÓGICA DE JCF, ENTREVISTAS, HORAS Y DOCUMENTOS
   ========================================= */

document.addEventListener('DOMContentLoaded', () => {

    console.log('✅ main-rh.js cargado correctamente');

    /* =========================================
       1. NAVEGACIÓN DEL MENÚ LATERAL
       ========================================= */
    const menuItems = document.querySelectorAll('.menu-item');
    const views = document.querySelectorAll('.view-section');

    function showView(targetId) {
        views.forEach(view => view.classList.remove('active'));
        const targetView = document.getElementById(targetId);
        if (targetView) {
            targetView.classList.add('active');
            const mainContent = document.querySelector('.main-content');
            if (mainContent) mainContent.scrollTop = 0;
        }
    }

    menuItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            menuItems.forEach(i => i.classList.remove('active'));
            item.classList.add('active');
            const targetId = item.getAttribute('data-target');
            if (targetId) showView(targetId);
            const sidebar = document.getElementById('sidebar');
            const overlay = document.getElementById('overlay');
            if (sidebar) sidebar.classList.remove('open');
            if (overlay) overlay.classList.remove('active');
        });
    });

    // Menú móvil
    const mobileMenuBtn = document.getElementById('mobile-menu-btn');
    const sidebar = document.getElementById('sidebar');
    const overlay = document.getElementById('overlay');

    if (mobileMenuBtn && sidebar && overlay) {
        mobileMenuBtn.addEventListener('click', () => {
            sidebar.classList.toggle('open');
            overlay.classList.toggle('active');
        });
        overlay.addEventListener('click', () => {
            sidebar.classList.remove('open');
            overlay.classList.remove('active');
        });
    }

    /* =========================================
       2. TRAINEES (ahora con MVC)
       La lógica vive en js/rh/controllers/TraineeController.js
       ========================================= */

    // Utilidades que todavía usan JCF, Entrevistas, Horas y Documentos
    function formatearFecha(iso) {
        if (!iso) return '-';
        const [y, m, d] = String(iso).slice(0, 10).split('-');
        const meses = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
        return `${d} ${meses[parseInt(m, 10) - 1]} ${y}`;
    }

    function badgeEstado(estado) {
        if (estado === 'Aprobado') return 'badge-status resuelto';
        if (estado === 'Rechazado') return 'badge-status atencion';
        return 'badge-status espera';
    }

    function marcarMenuActivo(targetId) {
        menuItems.forEach(i => i.classList.remove('active'));
        const item = document.querySelector(`.menu-item[data-target="${targetId}"]`);
        if (item) item.classList.add('active');
    }

    // PUENTE TEMPORAL: Entrevistas, Horas y Documentos todavía leen esta lista.
    // Desaparecerá cuando esos apartados también se conecten a MySQL.
    const trainees = [];

    new TraineeController({
        navegar: (vista, menu) => { showView(vista); marcarMenuActivo(menu); },
        
            alAbrirExpediente: (id) => {
            entrevistas.mostrarEnExpediente('Trainee', id);
            horas.mostrarEnExpediente(id);
            documentos.mostrarEnExpediente('Trainee', id);
        },
        alCambiar: (lista) => {
            trainees.splice(0, trainees.length, ...lista.map(t => ({
                ...t,
                id: String(t.id),
                estado: t.estatus,
                fechaNacimiento: t.fecha_nacimiento,
                fechaRegistro: t.fecha_registro,
            })));
        },
    });

    /* =========================================
       5. JÓVENES CONSTRUYENDO EL FUTURO (ahora con MVC)
       La lógica vive en js/rh/controllers/JcfController.js
       ========================================= */

    // PUENTE TEMPORAL: Entrevistas y Documentos todavía leen esta lista.
    const jcfData = [];

    new JcfController({
        navegar: (vista, menu) => { showView(vista); marcarMenuActivo(menu); },
            alAbrirExpediente: (id) => {
            entrevistas.mostrarEnExpediente('JCF', id);
            documentos.mostrarEnExpediente('JCF', id);
        },
        alCambiar: (lista) => {
            jcfData.splice(0, jcfData.length, ...lista.map(j => ({
                ...j,
                id: String(j.id),
                estado: j.estatus,
                fechaRegistro: j.fecha_registro,
            })));
        },
    });

    /* =========================================
       6. ENTREVISTAS Y CALENDARIO (ahora con MVC)
       La lógica vive en js/rh/controllers/EntrevistaController.js
       ========================================= */
    const entrevistas = new EntrevistaController({
        obtenerCandidatos: (tipo) => (tipo === 'Trainee' ? trainees : jcfData)
            .map(c => ({ id: Number(c.id), nombre: `${c.nombre} ${c.apellidos}` })),
    });
     

        /* =========================================
       7. REGISTRO DE HORAS (ahora con MVC)
       La lógica vive en js/rh/controllers/HorasController.js
       ========================================= */
    const horas = new HorasController({
        obtenerTrainees: () => trainees.map(t => ({ id: Number(t.id), nombre: `${t.nombre} ${t.apellidos}` })),
    });


        /* =========================================
       8. DOCUMENTOS Y PLANTILLAS (ahora con MVC)
       La lógica vive en js/rh/controllers/DocumentoController.js
       ========================================= */
    const documentos = new DocumentoController();
    

});