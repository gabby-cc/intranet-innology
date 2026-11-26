export class DocumentModel {
    constructor() {
        // ✅ Cargamos desde localStorage (persistente entre pestañas/usuarios del mismo navegador)
        // ⚠️ Cuando conecten BD: reemplazar esta lectura por un fetch a la API
        const guardados = localStorage.getItem('innology_documents');
        if (guardados) {
            try {
                this.documents = JSON.parse(guardados);
            } catch (e) {
                console.warn('⚠️ Error parseando documentos, se reinicia:', e);
                this.documents = this._seed();
            }
        } else {
            this.documents = this._seed();
            this._persistir();
        }
    }

    // Datos iniciales (solo si no hay nada guardado)
    _seed() {
        return [
            { id: 1, name: "Layout de carga de proveedores", folder: "Proyectos", author: "Laura Méndez", subidoPor: "Laura Méndez", date: "18 oct 2026", fechaISO: "2026-10-18", size: "180 KB", origin: "Subido por ti", type: "excel", ticketId: null },
            { id: 2, name: "Matriz de pruebas fase 1", folder: "Proyectos", author: "Sofia Navarro", subidoPor: "Sofia Navarro", date: "17 oct 2026", fechaISO: "2026-10-17", size: "420 KB", origin: "Compartido contigo", type: "excel", ticketId: null },
            { id: 3, name: "Manual de usuario cuentas por pagar", folder: "Manuales", author: "Daniel Rojas", subidoPor: "Daniel Rojas", date: "16 oct 2026", fechaISO: "2026-10-16", size: "3.8 MB", origin: "Compartido contigo", type: "pdf", ticketId: null },
            { id: 4, name: "Acta de arranque Rollout Oracle Cloud", folder: "Proyectos", author: "Daniel Rojas", subidoPor: "Daniel Rojas", date: "14 oct 2026", fechaISO: "2026-10-14", size: "1.2 MB", origin: "Compartido contigo", type: "pdf", ticketId: null }
        ];
    }

    // ✅ Persistencia: metadatos serializables (sin File). Listo para mapear a BD.
    _persistir() {
        // Eliminamos cualquier referencia al File antes de guardar (no es serializable)
        const serializables = this.documents.map(d => {
            const { file, ...meta } = d;
            return meta;
        });
        localStorage.setItem('innology_documents', JSON.stringify(serializables));
    }

    getAllDocuments() { return this.documents; }

    // ✅ NUEVO: documentos que puede ver cada usuario según su rol.
    //    rol llega normalizado desde main.js: 'admin' | 'consultor' | 'cliente'
    //
    //    - Admin: ve todo.
    //    - Consultor: ve todo lo subido desde el módulo Documentos (ticketId null),
    //      pero los documentos de un ticket (adjuntos del cliente y documentación
    //      de solución) solo si es el responsable asignado a ese ticket.
    //    - Cliente: solo lo que subió él y lo que pertenece a tickets que él creó.
    //
    //    ⚠️ Cuando conecten BD: este mismo filtro debe aplicarse en el backend.
    getVisibleDocuments(nombre, rol, ticketModel) {
        if (rol === 'admin') return this.documents;

        // Mapa id -> ticket, para consultar responsable y solicitante
        const tickets = new Map(
            (ticketModel ? ticketModel.getAllTickets() : []).map(t => [t.id, t])
        );

        return this.documents.filter(d => {
            // Documento de un ticket (adjunto del cliente o solución del consultor)
            if (d.ticketId) {
                const t = tickets.get(d.ticketId);
                if (!t) return false; // ticket inexistente: solo lo ve el admin
                if (rol === 'consultor') return t.responsable === nombre;
                return t.solicitante === nombre; // cliente
            }

            // Documento subido desde el módulo Documentos
            if (rol === 'consultor') return true;
            return d.subidoPor === nombre; // cliente: solo lo suyo
        });
    }

    // ✅ `base` es opcional: si no se pasa, busca en todos (comportamiento anterior).
    //    Para respetar permisos, pasar la lista de getVisibleDocuments().
    searchDocuments(query, base = this.documents) {
        const term = query.toLowerCase();
        return base.filter(doc =>
            doc.name.toLowerCase().includes(term) ||
            doc.folder.toLowerCase().includes(term) ||
            doc.author.toLowerCase().includes(term)
        );
    }

    // ✅ `base` es opcional: si no se pasa, filtra sobre todos (comportamiento anterior).
    filterDocuments(text, folder, base = this.documents) {
        const term = text.toLowerCase();
        return base.filter(doc => {
            const matchText = doc.name.toLowerCase().includes(term) || doc.author.toLowerCase().includes(term);
            const matchFolder = (folder === 'todas' || doc.folder === folder);
            return matchText && matchFolder;
        });
    }

    _buildMeta(name, folder, file, subidoPor, ticketId) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        const fechaISO = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
        const sizeStr = file ? (file.size / 1024).toFixed(0) + " KB" : "—";
        const fileName = (file?.name || name || '').toLowerCase();
        let type = 'default';
        if (fileName.endsWith('.pdf')) type = 'pdf';
        else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls') || fileName.endsWith('.csv')) type = 'excel';
        else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) type = 'word';

        return {
            id: this.documents.length > 0 ? Math.max(...this.documents.map(d => d.id)) + 1 : 1,
            name: name || file?.name || 'Sin nombre',
            folder,
            author: subidoPor || 'Usuario',
            subidoPor: subidoPor || 'Usuario',
            date: dateStr,
            fechaISO,
            size: sizeStr,
            type,
            ticketId: ticketId || null
        };
    }

    // ✅ Ahora recibe subidoPor. `file` sigue siendo opcional para descarga inmediata.
    addDocument(name, folder, file, subidoPor = 'Laura Méndez') {
        const meta = this._buildMeta(name, folder, file, subidoPor, null);
        meta.origin = `Subido por ${subidoPor === 'Laura Méndez' ? 'ti' : subidoPor}`;
        const newDoc = { ...meta, file };
        this.documents.unshift(newDoc);
        this._persistir();
        return newDoc;
    }

    // ✅ Ahora recibe subidoPor además de ticketId
    addDocumentFromTicket(name, folder, file, ticketId, subidoPor = 'Laura Méndez') {
        const meta = this._buildMeta(name, folder || 'Tickets', file, subidoPor, ticketId);
        meta.origin = `Adjunto en ticket ${ticketId}`;
        const newDoc = { ...meta, file };
        this.documents.unshift(newDoc);
        this._persistir();
        return newDoc;
    }
}