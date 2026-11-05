export class UserModel {
    constructor() {
        // Simulamos una base de datos de usuarios
        this.users = [
            {
                id: 1,
                nombre: "Laura Méndez",
                correo: "laura@innology.com",
                rol: "Administrador",
                perfil: "-",
                modulos: [],
                paises: [],
                estado: "Activo"
            },
            {
                id: 2,
                nombre: "Daniel Rojas",
                correo: "daniel@innology.com",
                rol: "Consultor",
                perfil: "Técnico",
                modulos: ["Ventas", "Inventario"],
                paises: ["México", "Colombia"],
                estado: "Activo"
            }
        ];
    }

    getAllUsers() {
        return this.users;
    }

    getUserById(id) {
        return this.users.find(u => u.id === parseInt(id));
    }

    createUser(userData) {
        const newId = this.users.length > 0 ? Math.max(...this.users.map(u => u.id)) + 1 : 1;
        const newUser = {
            id: newId,
            ...userData,
            estado: 'Activo'
        };
        this.users.push(newUser);
        return newUser;
    }

    updateUser(id, updatedData) {
        const index = this.users.findIndex(u => u.id === parseInt(id));
        if (index !== -1) {
            this.users[index] = { ...this.users[index], ...updatedData };
            return true;
        }
        return false;
    }

    toggleStatus(id) {
        const user = this.getUserById(id);
        if (user) {
            user.estado = user.estado === 'Activo' ? 'Inactivo' : 'Activo';
            return true;
        }
        return false;
    }
}