import { UserModel } from '../models/UserModel.js';
import { DashboardView } from '../views/DashboardView.js';

export class DashboardController {
    constructor() {
        this.model = new UserModel();
        this.view = new DashboardView();
        this.init();
    }
    init() {
        this.view.renderUser(this.model.getUser());
        this.view.renderStats(this.model.getStats());
    }
}