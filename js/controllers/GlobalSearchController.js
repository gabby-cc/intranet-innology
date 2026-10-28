export class GlobalSearchController {
    constructor(ticketModel, documentModel, ticketController) {
        this.ticketModel = ticketModel;
        this.documentModel = documentModel;
        this.ticketController = ticketController;
        this.searchInput = document.getElementById('global-search');
        this.resultsContainer = document.getElementById('global-search-results');
        this.init();
    }

    init() {
        if (!this.searchInput) return;

        this.searchInput.addEventListener('input', (e) => {
            const term = e.target.value.trim().toLowerCase();
            if (term.length < 2) {
                this.resultsContainer.classList.remove('active');
                this.resultsContainer.innerHTML = '';
                return;
            }
            this.performSearch(term);
        });

        document.addEventListener('click', (e) => {
            if (!this.searchInput.contains(e.target) && !this.resultsContainer.contains(e.target)) {
                this.resultsContainer.classList.remove('active');
            }
        });
    }

    performSearch(term) {
        this.resultsContainer.innerHTML = '';
        let hasResults = false;

        const tickets = this.ticketModel.getAllTickets().filter(t => 
            t.id.toLowerCase().includes(term) || t.title.toLowerCase().includes(term)
        );

        if (tickets.length > 0) {
            hasResults = true;
            const header = document.createElement('div');
            header.className = 'search-header';
            header.textContent = 'Tickets';
            this.resultsContainer.appendChild(header);

            tickets.forEach(ticket => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="search-result-icon ticket-icon">TK</div>
                    <div class="search-result-info">
                        <strong>${ticket.id} ${ticket.title}</strong>
                        <span>${ticket.status}, ${ticket.empresa}</span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.resultsContainer.classList.remove('active');
                    document.querySelector('.menu-item[data-target="view-tickets"]').click();
                    setTimeout(() => {
                        const row = document.querySelector(`#tickets-tbody tr[data-id="${ticket.id}"]`);
                        if (row) row.click();
                    }, 100);
                });
                this.resultsContainer.appendChild(item);
            });
        }

        const docs = this.documentModel.searchDocuments(term);

        if (docs.length > 0) {
            hasResults = true;
            const header = document.createElement('div');
            header.className = 'search-header';
            header.textContent = 'Documentos';
            this.resultsContainer.appendChild(header);

            docs.forEach(doc => {
                const item = document.createElement('div');
                item.className = 'search-result-item';
                item.innerHTML = `
                    <div class="search-result-icon doc-icon">${doc.type === 'excel' ? 'XL' : 'PDF'}</div>
                    <div class="search-result-info">
                        <strong>${doc.name}</strong>
                        <span>${doc.folder}, ${doc.author}</span>
                    </div>
                `;
                item.addEventListener('click', () => {
                    this.searchInput.value = '';
                    this.resultsContainer.classList.remove('active');
                    document.querySelector('.menu-item[data-target="view-documentos"]').click();
                });
                this.resultsContainer.appendChild(item);
            });
        }

        if (hasResults) {
            this.resultsContainer.classList.add('active');
        } else {
            this.resultsContainer.innerHTML = '<div class="search-no-results">No se encontraron resultados.</div>';
            this.resultsContainer.classList.add('active');
        }
    }
}