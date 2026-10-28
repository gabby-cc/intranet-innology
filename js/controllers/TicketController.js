import { TicketModel } from '../models/TicketModel.js';
import { TicketView } from '../views/TicketView.js';

export class TicketController {
    constructor(model) {
        this.model = model || new TicketModel();
        this.view = new TicketView();
        this.archivosTemporales = [];
        this.currentTicketId = null;
        this.init();
    }

    init() {
        this.view.renderTickets(this.model.getAllTickets());

        document.getElementById('tickets-tbody').addEventListener('click', (e) => {
            const row = e.target.closest('.ticket-row');
            if (row) {
                this.currentTicketId = row.dataset.id;
                const ticket = this.model.getTicketById(this.currentTicketId);
                const history = this.model.getHistoryByTicketId(this.currentTicketId);
                this.view.openDrawer(ticket, history);
            }
        });

        document.getElementById('drawer-overlay').addEventListener('click', () => this.view.closeDrawer());
        document.getElementById('btn-cerrar-drawer').addEventListener('click', () => this.view.closeDrawer());

        const applyFilters = () => {
            const text = document.getElementById('filter-text').value;
            const status = document.getElementById('filter-status').value;
            const priority = document.getElementById('filter-priority').value;
            this.view.renderTickets(this.model.filterTickets(text, status, priority));
        };
        document.getElementById('filter-text').addEventListener('input', applyFilters);
        document.getElementById('filter-status').addEventListener('change', applyFilters);
        document.getElementById('filter-priority').addEventListener('change', applyFilters);

        document.getElementById('btn-nuevo-ticket').addEventListener('click', () => {
            this.archivosTemporales = [];
            this.view.openModal();
        });
        document.getElementById('btn-cerrar-modal').addEventListener('click', () => this.view.closeModal());
        document.getElementById('btn-cancelar-modal').addEventListener('click', () => this.view.closeModal());

        document.getElementById('new-ticket-files').addEventListener('change', (e) => {
            const files = e.target.files;
            for (let i = 0; i < files.length; i++) {
                if (!this.archivosTemporales.find(f => f.name === files[i].name)) {
                    this.archivosTemporales.push({ file: files[i], name: files[i].name });
                }
            }
            this.actualizarVistaPreviaArchivos();
            e.target.value = '';
        });

        document.getElementById('btn-submit-ticket').addEventListener('click', () => {
            const title = document.getElementById('new-ticket-title').value.trim();
            const category = document.getElementById('new-ticket-category').value;
            const priority = document.getElementById('new-ticket-priority').value;
            const description = document.getElementById('new-ticket-description').value.trim();

            if (title === '' || description === '') {
                alert('Llena el asunto y la descripción');
                return;
            }
            this.model.createTicket(title, category, priority, description, this.archivosTemporales);
            this.view.renderTickets(this.model.getAllTickets());
            this.view.closeModal();
        });

        document.getElementById('btn-enviar-comentario').addEventListener('click', () => {
            const input = document.getElementById('comment-input');
            if (input.value.trim() === '') return;
            this.model.addComment(this.currentTicketId, input.value.trim());
            this.view.renderHistory(this.model.getHistoryByTicketId(this.currentTicketId));
            input.value = '';
        });

        window.simularCambioConsultor = (ticketId, nuevoEstado) => {
            const ticket = this.model.getTicketById(ticketId);
            if(ticket) {
                ticket.status = nuevoEstado;
                this.model.addComment(ticketId, `Estado cambiado a: ${nuevoEstado}`);
                this.view.renderTickets(this.model.getAllTickets());
                if(this.currentTicketId === ticketId) {
                    this.view.openDrawer(ticket, this.model.getHistoryByTicketId(ticketId));
                }
            }
        };
    }

    actualizarVistaPreviaArchivos() {
        this.view.renderFilePreview(this.archivosTemporales, (index) => {
            this.archivosTemporales.splice(index, 1);
            this.actualizarVistaPreviaArchivos();
        });
    }
}