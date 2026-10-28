export class DocumentView {
    constructor() {
        this.tableBody = document.getElementById('docs-tbody');
    }

    renderDocuments(documents) {
        if(!this.tableBody) return;
        this.tableBody.innerHTML = '';
        
        // Recorremos TODOS los documentos que nos pase el controlador
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            const iconClass = doc.type === 'excel' ? 'excel' : 'pdf';
            const iconText = doc.type === 'excel' ? 'XLSX' : 'PDF';
            
            let downloadBtnHTML = '';
            if (doc.file) {
                const url = URL.createObjectURL(doc.file);
                downloadBtnHTML = `<a href="${url}" download="${doc.name}" class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px; text-decoration: none;">Descargar</a>`;
            } else {
                downloadBtnHTML = `<button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="alert('Simulando descarga de: ${doc.name}')">Descargar</button>`;
            }

            tr.innerHTML = `
                <td style="display: flex; align-items: center; gap: 15px;">
                    <div class="doc-icon ${iconClass}">${iconText}</div>
                    <div>
                        <strong style="display: block; font-weight: 500;">${doc.name}</strong>
                        <span style="font-size: 0.75rem; color: var(--text-light);">${doc.size}</span>
                    </div>
                </td>
                <td>${doc.folder}</td>
                <td>${doc.author}</td>
                <td>${doc.date.split(' ').slice(0,2).join('<br>')}</td>
                <td>${doc.origin}</td>
                <td>${downloadBtnHTML}</td>
            `;
            this.tableBody.appendChild(tr);
        });
    }
}