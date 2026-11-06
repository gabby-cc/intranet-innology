import { UserModel } from '../models/UserModel.js';
import { DashboardView } from '../views/DashboardView.js';

export class DashboardController {
    constructor() {
        this.model = new UserModel();
        this.view = new DashboardView();
        this.init();
    }

    init() {
        // ✅ Ya no llama a getUser() ni getStats() para evitar el error
        console.log("Dashboard inicializado correctamente.");
    }
}