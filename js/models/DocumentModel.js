export class DocumentModel {
    constructor() {
        this.documents = [
            { id: 1, name: "Layout de carga de proveedores", folder: "Proyectos", author: "Laura Méndez", date: "18 oct 2026", size: "180 KB", origin: "Subido por ti", type: "excel" },
            { id: 2, name: "Matriz de pruebas fase 1", folder: "Proyectos", author: "Sofia Navarro", date: "17 oct 2026", size: "420 KB", origin: "Compartido contigo", type: "excel" },
            { id: 3, name: "Manual de usuario cuentas por pagar", folder: "Manuales", author: "Daniel Rojas", date: "16 oct 2026", size: "3.8 MB", origin: "Compartido contigo", type: "pdf" },
            { id: 4, name: "Acta de arranque Rollout Oracle Cloud", folder: "Proyectos", author: "Daniel Rojas", date: "14 oct 2026", size: "1.2 MB", origin: "Compartido contigo", type: "pdf" }
        ];
    }

    getAllDocuments() { return this.documents; }

    searchDocuments(query) {
        const term = query.toLowerCase();
        return this.documents.filter(doc => 
            doc.name.toLowerCase().includes(term) || 
            doc.folder.toLowerCase().includes(term) || 
            doc.author.toLowerCase().includes(term)
        );
    }

    filterDocuments(text, folder) {
        const term = text.toLowerCase();
        return this.documents.filter(doc => {
            const matchText = doc.name.toLowerCase().includes(term) || doc.author.toLowerCase().includes(term);
            const matchFolder = (folder === 'todas' || doc.folder === folder);
            return matchText && matchFolder;
        });
    }

    addDocument(name, folder, file) {
        const now = new Date();
        const dateStr = now.toLocaleDateString('es-ES', { day: 'numeric', month: 'short', year: 'numeric' });
        const sizeStr = (file.size / 1024).toFixed(0) + " KB";
        const type = file.name.endsWith('.pdf') ? 'pdf' : 'excel';

        const newDoc = {
            id: this.documents.length + 1,
            name: name || file.name,
            folder: folder,
            author: "Laura Méndez",
            date: dateStr,
            size: sizeStr,
            origin: "Subido por ti",
            type: type,
            file: file
        };

        this.documents.unshift(newDoc);
        return newDoc;
    }
}