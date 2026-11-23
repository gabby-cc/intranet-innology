export class DocumentView {
    constructor() {
        this.tableBody = document.getElementById('docs-tbody');
    }

    renderDocuments(documents) {
        if(!this.tableBody) return;
        this.tableBody.innerHTML = '';
        
        documents.forEach(doc => {
            const tr = document.createElement('tr');
            
            let iconClass = 'default';
            let iconText = 'FILE';
            
            // Lógica de detección (la que ya tenías, está perfecta)
            if (doc.type === 'pdf') {
                iconClass = 'pdf';
                iconText = 'PDF';
            } else if (doc.type === 'excel') {
                iconClass = 'excel';
                iconText = 'XLSX';
            } else if (doc.type === 'word') {
                iconClass = 'word';
                iconText = 'DOCX';
            } else {
                const fileName = doc.name.toLowerCase();
                if (fileName.endsWith('.pdf')) {
                    iconClass = 'pdf';
                    iconText = 'PDF';
                } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
                    iconClass = 'excel';
                    iconText = 'XLSX';
                } else if (fileName.endsWith('.doc') || fileName.endsWith('.docx')) {
                    iconClass = 'word';
                    iconText = 'DOCX';
                }
            }

            let downloadBtnHTML = '';
            if (doc.file) {
                const url = URL.createObjectURL(doc.file);
                downloadBtnHTML = `<a href="${url}" download="${doc.name}" class="btn-secondary" style="text-decoration: none; font-size: 0.8rem; padding: 6px 12px;">Descargar</a>`;
            } else {
                downloadBtnHTML = `<button class="btn-secondary" style="font-size: 0.8rem; padding: 6px 12px;" onclick="alert('Simulando descarga de: ${doc.name}')">Descargar</button>`;
            }

            // Aquí está el cambio visual
            tr.innerHTML = `
                <td>
                    <div style="display: flex; align-items: center; gap: 15px;">
                        <!-- Cambiamos a doc-icon-badge y agregamos estilos base por si acaso -->
                        <div class="doc-icon-badge ${iconClass}" style="width: 45px; height: 45px; display: flex; align-items: center; justify-content: center; border-radius: 8px; font-weight: 700; font-size: 0.75rem;">
                            ${iconText}
                        </div>
                        <div style="display: flex; flex-direction: column;">
                            <strong style="font-weight: 500; color: var(--text-dark);">${doc.name}</strong>
                            <span style="font-size: 0.75rem; color: var(--text-light);">${doc.size}</span>
                        </div>
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